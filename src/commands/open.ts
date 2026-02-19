import { Command } from "../handlers/command";
import { ArgumentType } from "../args";
import { config } from "../config";
import { ticketService } from "../services/ticket";

export const command: Command = {
    name: "open",
    args: {
        user: {
            type: ArgumentType.User,
            required: false,
        }
    },
    async execute({ client, message, args }) {
        try {
            let ticket = await ticketService.open(args.user.id as string, config.categoryIds.moderator, message.author.id);
            await client.createMessage(message.channel.id, {
                content: `Opened ticket for <@${args.user.id}> in <#${ticket.channelId}>`,
                messageReference: { messageID: message.id}
            });
        } catch (error) {
            if (error.type === "ExistingTicket") {
                await client.createMessage(message.channel.id, {
                    content: `User <@${args.userId}> already has an open ticket at <#${error.channelId}>`,
                    messageReference: { messageID: message.id }
                });
            } else {
                throw error;
            }
        }
    }
};
