import { CategoryChannel } from "eris";
import { Client } from "../client";
import { loggers } from "../logger";
import { config } from "../config";
import { TicketDocument, TicketModel } from "../models/ticket";
import { CustomError } from "../error";

class Service {
	public initialized = false;
    private client: Client = null;

    initialize(client: Client): void {
        this.client = client;
        this.initialized = true;
    }

    isInitialized(): void {
        if (!this.initialized || !this.client) {
            throw new Error("Ticket service is not initialized");
        }
    }

    private async getTicketData(options: {
        ticketId?: string;
        channelId?: string;
        userId?: string;
        status?: "open" | "closed";
    }): Promise<TicketDocument[]> {
        const query: any = {};
        if (options.ticketId) {
            query._id = options.ticketId;
        }
        if (options.channelId) {
            query.channelId = options.channelId;
        }
        if (options.userId) {
            query.userId = options.userId;
        }
        if (options.status) {
            query.status = options.status;
        }
        return TicketModel.find(query).exec();
    }

    async getOne(options: {
        ticketId?: string;
        channelId?: string;
        userId?: string;
        status?: "open" | "closed";
    }): Promise<TicketDocument> {
        this.isInitialized();

        const tickets = await this.getTicketData(options);
        if (tickets.length === 0) {
            return null;
        }
        return tickets[0];
    }

    async getMany(options: {
        ticketId?: string;
        channelId?: string;
        userId?: string;
        status?: "open" | "closed";
    }): Promise<TicketDocument[]> {
        this.isInitialized();

        return await this.getTicketData(options);
    }

    async open(userId: string, categoryId: string, moderatorId?: string): Promise<TicketDocument> {
        this.isInitialized();

        let currentTicket = await this.getOne({ userId, status: "open" });
        if (currentTicket) {
            throw new CustomError({
                type: "ExistingTicket",
                message: "User already has an open ticket",
                channelId: currentTicket[0].channelId
            });
        }

        let guild = this.client.guilds.get(config.guildId);
        if (!guild) {
            guild = await this.client.getRESTGuild(config.guildId);
        }
        
        let category = guild.channels.get(categoryId);
        if (!category) {
            category = await this.client.getRESTChannel(categoryId) as CategoryChannel;
        }

        if (!category || category.type !== 4) {
            throw new Error(`Invalid category ID: ${categoryId}`);
        }

        let member = guild.members.get(userId);
        if (!member) {
            member = await guild.fetchMembers({ userIDs: [userId] }).then(members => members[0]);
        }
        let userDisplayName = member ? (member.nick || member.user.globalName || member.user.username) : "Unknown User";

        let ticketChannel = await this.client.createChannel(config.guildId, `${member.username}`, 0, { 
            parentID: categoryId,
        })
        let ticketId = this.client.randomId(Number(ticketChannel.id));
        await this.client.createMessage(ticketChannel.id, {
            embeds: [
                {
                    title: "New Ticket Created (#`" + ticketId + "`)",
                    description: [
                        `<@${member.id}> (\`${member.id}\`)`,
                        `> **Username:** \`${member.user.username}\``,
                        `> **Display Name:** \`${userDisplayName}\``,
                        `> **Created At:** <t:${Math.floor(member.user.createdAt / 1000)}:R>`,
                        `> **Joined At:** <t:${Math.floor(member.joinedAt / 1000)}:R>`,
                    ].join("\n"),
                    color: member.accentColor || 0x7289da,
                    thumbnail: {
                        url: member.user.dynamicAvatarURL("png", 1024)
                    }
                }
            ]
        });

        const ticketData = await TicketModel.create({
            createdAt: new Date(),
            userId,
            categoryId,
            channelId: ticketChannel.id,
            status: "open"
        });

        if (moderatorId) {
            let moderator = guild.members.get(moderatorId);
            if (!moderator) {
                moderator = await guild.fetchMembers({ userIDs: [moderatorId] }).then(members => members[0]);
            }

            this.client.createMessage(ticketChannel.id, {
                embeds: [
                    {
                        author: {
                            name: `${moderator.user.username}`,
                            icon_url: moderator.user.dynamicAvatarURL("png", 1024)
                        },
                        description: `Ticket opened by <@${moderatorId}>`,
                        color: 0x57f287,
                        timestamp: new Date().toISOString()
                    }
                ]
            });
        }

        return ticketData;
    }

    async move(channelId: string, newCategoryId: string): Promise<void> {
        // Simulated ticket moving logic
        loggers.ticketService.info(`Moving ticket in channel ${channelId} to category ${newCategoryId}`);
    }

    async saveMessage(ticketId: string, message: string, sender: "user" | "staff" | "system"): Promise<void> {
        // Simulated ticket reply logic
        loggers.ticketService.info(`Replying to channel ${ticketId} as ${sender}: ${message}`);
    }

    async close(ticketId: string, moderatorId: string): Promise<void> {
        this.isInitialized();

        let ticket = await this.getOne({ ticketId });
        if (!ticket) {
            throw new CustomError({
                type: "TicketNotFound",
                message: "No open ticket found for this channel"
            });
        }

        await this.client.deleteChannel(ticket.channelId);
        await TicketModel.updateOne({ _id: ticketId }, { status: "closed" }).exec();

        let guild = this.client.guilds.get(config.guildId) || await this.client.getRESTGuild(config.guildId);
        let user = this.client.users.get(ticket.userId) || await this.client.getRESTUser(ticket.userId);
        let dmChannel = await user.getDMChannel();

        await this.client.createMessage(dmChannel.id, {
            embeds: [
                {
                    title: "Your ticket has been closed",
                    description: `If you have any further questions, feel free to open a new ticket.`,
                    color: 0xed4245,
                    footer: {
                        text: `Moderation Team`,
                        icon_url: guild.dynamicIconURL("png", 1024)
                    },
                }
            ]
        });

        // Logging channel
        let logChannel = guild.channels.get(config.logChannelId) || await this.client.getRESTChannel(config.logChannelId);
        await this.client.createMessage(logChannel.id, {
            embeds: [
                {
                    title: "Ticket Closed",
                    description: [
                        `> **User:** <@${ticket.userId}> (\`${ticket.userId}\`)`,
                        `> **Moderator:** <@${moderatorId}> (\`${moderatorId}\`)`
                    ].join("\n"),
                    color: 0xed4245,
                    timestamp: new Date().toISOString()
                }
            ]
        });
    }
}

export const ticketService = new Service();
