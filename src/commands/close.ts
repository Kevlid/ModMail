import { Command } from "../handlers/command";
import { ArgumentType } from "../args";
import { ticketService } from "../services/ticket";

export const command: Command = {
    name: "close",
    args: {
        reason: {
            type: ArgumentType.Rest,
            required: false,
        }
    },
    async execute({ client, message, args }) {
        let ticket = await ticketService.getOne({ channelId: message.channel.id });
        await ticketService.close(ticket._id, message.author.id, { reason: args.reason as string });
    }
};
