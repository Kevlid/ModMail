import { Client as ErisClient } from "eris";
import { CommandHandler } from "./handlers/command";
import { CustomError } from "./error";
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

    parseSnowflake(input: string): string | boolean {
        let value: string = null;

        if (input.startsWith("<") && input.endsWith(">")) {
            let normalized = input.slice(1, -1);

            while (
                normalized.startsWith("@") ||
                normalized.startsWith("#") ||
                normalized.startsWith("&") ||
                normalized.startsWith("!")
            ) {
                normalized = normalized.slice(1);
            }

            value = normalized;
        } else if (input.split("").every(char => char >= "0" && char <= "9")) {
            value = input;
        }
        
        if (!value) {
            throw new CustomError({
                type: "InvalidSnowflake",
                message: `Invalid snowflake format: ${input}`,
                value: input
            });
        }
        return value;
    }
}

let clientInstance: Client | null = null;
export const client = clientInstance || (clientInstance = new Client(config.discordToken));