import { Command } from "../handlers/command";
import { config } from "../config";
import { ticketService } from "../services/ticket";

export const command: Command = {
    name: "open",
    args: [
        {
            name: "userId",
            type: "string",
            required: true,
        },
        {
            name: "category",
            type: "string",
            required: false,
        }
    ],
    async execute({ client, message, args }) {
        try {
            let ticket = await ticketService.open(args.userId as string, config.categoryIds.moderator, message.author.id);
            await client.createMessage(message.channel.id, {
                content: `Opened ticket for <@${args.userId}> in <#${ticket.channelId}>`,
                messageReference: { messageID: message.id}
            });
        } catch (error) {
            if (error.type === "ExistingTicket") {
                await client.createMessage(message.channel.id, {
                    content: `User <@${args.userId}> already has an open ticket at <#${error.channelId}>`,
                    messageReference: { messageID: message.id }
                });
                return;
            }

            await client.createMessage(message.channel.id, {
                content: "Failed to open ticket, Please try again.",
                messageReference: { messageID: message.id }
            });
        }
    }
};
