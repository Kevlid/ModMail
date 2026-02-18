import { Client as ErisClient } from "eris";
import { CommandHandler } from "./handlers/command";
import { config } from "./config";
 
export class Client extends ErisClient {
    constructor(token: string) {
        super(token, {
            intents: [
                "guilds",
                "guildMessages",
                "directMessages",
                "directMessageReactions",
                "guildMessageReactions",
                "guildMembers",
                "messageContent"
            ],
            allowedMentions: {
                everyone: false,
                roles: false,
                users: false,
                repliedUser: false
            }
        })

        const commandHandler = new CommandHandler(this);
        commandHandler.getFolder(__dirname+`/commands`).then((files) => {
            files.forEach((file) => {
            commandHandler.loadCommand(file);
            });
        });
    }

    randomId(seed?: number): string {
        seed = seed ?? Date.now();
        return seed.toString(36).slice(-7);
    }
}

let clientInstance: Client | null = null;
export const client = clientInstance || (clientInstance = new Client(config.discordToken));