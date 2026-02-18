import { CategoryChannel, Client } from "eris";
import { loggers } from "../logger";
import { config } from "../config";
import { TicketModel } from "../models/ticket";

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

    async open(userId: string, categoryId: string, moderatorId?: string): Promise<void> {
        this.isInitialized();
        
        let category = this.client.guilds.get(config.guildId)?.channels.get(categoryId);
        if (!category) {
            category = await this.client.getRESTChannel(categoryId) as CategoryChannel;
        }

        if (!category || category.type !== 4) {
            throw new Error(`Invalid category ID: ${categoryId}`);
        }

        let ticketChannel = await this.client.createChannel(config.guildId, `${userId}`, 0, { parentID: categoryId })

        const ticketData = await TicketModel.create({
            createdAt: new Date(),
            userId,
            categoryId,
            channelId: ticketChannel.id,
            status: "open"
        });

        if (moderatorId) {
            this.client.createMessage(ticketChannel.id, `Ticket created for user <@${userId}> by moderator <@${moderatorId}>`);
        }

        loggers.ticketService.debug(JSON.stringify(ticketData));

        loggers.ticketService.info(`Ticket created for user ${userId} in channel ${ticketChannel.id}`);

    }

    async move(channelId: string, newCategoryId: string): Promise<void> {
        // Simulated ticket moving logic
        loggers.ticketService.info(`Moving ticket in channel ${channelId} to category ${newCategoryId}`);
    }

    async reply(channelId: string, message: string, sender: "user" | "staff" | "system"): Promise<void> {
        // Simulated ticket reply logic
        loggers.ticketService.info(`Replying to channel ${channelId} as ${sender}: ${message}`);
    }

    async close(channelId: string, closedByUserId: string): Promise<void> {
        // Simulated ticket closing logic
        loggers.ticketService.info(`Closing ticket in channel ${channelId} by user ${closedByUserId}`);
    }
}

export const TicketService = new Service();
