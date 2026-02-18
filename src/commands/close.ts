import { Command } from "../handlers/command";
import { ticketService } from "../services/ticket";

export const command: Command = {
    name: "close",
    async execute({ client, message }) {
        await ticketService.close(message.channel.id, message.author.id);
    }
};
