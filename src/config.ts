import dotenv from "dotenv";
dotenv.config();

type Team = "admin" | "moderator" | "ai";

const getEnv = (key: string): string => {
    const value = process.env[key];
    if (!value || value.trim().length === 0) {
        throw new Error(`Missing required: ${key}`);
    }
    return value.trim();
};

const parseRoleIds = (value: string): string[] => {
    return value
        .split(",")
        .map((roleId) => roleId.trim())
        .filter((roleId) => roleId.length > 0);
};

export interface BotConfig {
    discordToken: string;
    mongoUri: string;
    openAiApiKey: string;
    guildId: string;
    logChannelId: string;
    categoryIds: Record<Team, string>;
    roleIds: Record<Team, string[]>;
    rateLimit: {
        maxMessages: number;
        windowMs: number;
    };
}

export const config: BotConfig = {
    discordToken: getEnv("DISCORD_TOKEN"),
    mongoUri: getEnv("MONGO_URI"),
    openAiApiKey: getEnv("OPENAI_API_KEY"),
    guildId: getEnv("GUILD_ID"),
    logChannelId: getEnv("LOG_CHANNEL_ID"),
    categoryIds: {
        ai: getEnv("AI_CATEGORY_ID"),
        moderator: getEnv("MOD_CATEGORY_ID"),
        admin: getEnv("ADMIN_CATEGORY_ID")
    },
    roleIds: {
        ai: [],
        moderator: parseRoleIds(getEnv("MOD_ROLE_ID")),
        admin: parseRoleIds(getEnv("ADMIN_ROLE_ID"))
    },
    rateLimit: {
        maxMessages: 6,
        windowMs: 60_000
    }
};
