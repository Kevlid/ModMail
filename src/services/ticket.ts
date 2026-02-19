import { CategoryChannel } from "eris";
import { client } from "../client";
import { loggers } from "../logger";
import { config } from "../config";
import { TicketDocument, TicketModel } from "../models/ticket";
import { CustomError } from "../error";

class Service {

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
        return await this.getTicketData(options);
    }

    async open(userId: string, categoryId: string, moderatorId?: string): Promise<TicketDocument> {
        let currentTicket = await this.getOne({ userId, status: "open" });
        if (currentTicket) {
            throw new CustomError({
                type: "ExistingTicket",
                message: "User already has an open ticket",
                channelId: currentTicket[0].channelId
            });
        }

        let guild = client.guilds.get(config.guildId);
        if (!guild) {
            guild = await client.getRESTGuild(config.guildId);
        }
        
        let category = guild.channels.get(categoryId);
        if (!category) {
            category = await client.getRESTChannel(categoryId) as CategoryChannel;
        }

        if (!category || category.type !== 4) {
            throw new Error(`Invalid category ID: ${categoryId}`);
        }

        let member = guild.members.get(userId);
        if (!member) {
            member = await guild.fetchMembers({ userIDs: [userId] }).then(members => members[0]);
        }
        let userDisplayName = member ? (member.nick || member.user.globalName || member.user.username) : "Unknown User";

        let ticketChannel = await client.createChannel(config.guildId, `${member.username}`, 0, { 
            parentID: categoryId,
        })
        let ticketId = client.randomId(Number(ticketChannel.id));
        await client.createMessage(ticketChannel.id, {
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

            client.createMessage(ticketChannel.id, {
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

    async close(ticketId: string, moderatorId: string, options?: { reason?: string }): Promise<void> {
        let reason = "If you have any further questions, feel free to open a new ticket.";
        if (options.reason) reason = options.reason;

        let ticket = await this.getOne({ ticketId });
        if (!ticket) {
            throw new CustomError({
                type: "TicketNotFound",
                message: "No open ticket found for this channel"
            });
        }

        await client.deleteChannel(ticket.channelId);
        await TicketModel.updateOne({ _id: ticketId }, { status: "closed" }).exec();

        let guild = client.guilds.get(config.guildId) || await client.getRESTGuild(config.guildId);
        let user = client.users.get(ticket.userId) || await client.getRESTUser(ticket.userId);
        let dmChannel = await user.getDMChannel();

        await client.createMessage(dmChannel.id, {
            embeds: [
                {
                    title: "Your ticket has been closed",
                    description: reason,
                    color: 0xed4245,
                    footer: {
                        text: `Moderation Team`,
                        icon_url: guild.dynamicIconURL("png", 1024)
                    },
                }
            ]
        });

        // Logging channel
        let logChannel = guild.channels.get(config.logChannelId) || await client.getRESTChannel(config.logChannelId);
        await client.createMessage(logChannel.id, {
            embeds: [
                {
                    title: "Ticket Closed",
                    description: [
                        `> **Ticket ID:** #\`${ticketId}\``,
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
