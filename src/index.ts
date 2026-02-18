import { Client } from "eris";
import { config } from "./config";
import { loggers } from "./logger";


// Services
import mongoose from "mongoose";
import { AiService } from "./services/ai";
import { TicketService } from "./services/ticket";

const bootstrap = async (): Promise<void> => {
    const client = new Client(config.discordToken, {
        intents: [
            "guilds",
            "guildMessages",
            "directMessages",
            "directMessageReactions",
            "guildMessageReactions",
            "guildMembers",
            "messageContent"
        ]
    });

    // Initialize services
    await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 20
    });
    AiService.initialize(config.openAiApiKey);
    TicketService.initialize(client);

    client.once("ready", async () => {
        loggers.client.info(`Modmail bot online as ${client.user.username} (${client.user.id})`);
    });

    client.on("error", (error) => {
        loggers.client.error("Discord client error", error);
    });

    await client.connect();
};

bootstrap().catch((error) => {
    loggers.client.error("Fatal startup error", error);
    process.exit(1);
});
