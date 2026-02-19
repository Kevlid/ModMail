import { config } from "./config";
import { loggers } from "./logger";
import { client } from "./client";

// Services
import mongoose from "mongoose";

const bootstrap = async (): Promise<void> => {
    // Initialize services
    await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 20
    });

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
