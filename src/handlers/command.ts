import { readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

import { Client, Message } from "eris";
import { loggers } from "../logger";
import { config } from "../config";
import { ArgumentSchema, parse } from "../args";

export interface CommandContext {
	client: Client;
	message: Message;
	commandName: string;
	rawArgs?: string[];
	args?: Record<string, any>;
    flags?: Record<string, any>;
}

export interface Command {
	name: string;
	aliases?: string[];
	args?: ArgumentSchema;
	execute: (context: CommandContext) => Promise<void>;
}

export class CommandHandler {
	private commands = new Map<string, Command>();
    private aliases = new Map<string, string>();

	constructor(private readonly client: Client) {
        this.client.on("messageCreate", (message: Message) => this.handleMessage(message));
    }

	public async getFolder(folderPath: string): Promise<string[]> {
        try {
            const entries = await readdirSync(folderPath, { withFileTypes: true });
            return entries
                .filter((entry) => entry.isFile())
                .map((entry) => path.join(folderPath, entry.name));
        } catch (error) {
            loggers.commandHandler.error(`Failed to read command folder: ${folderPath}`, error);
            return [];
        }
    }

    public async loadCommand(filePath: string): Promise<void> {
        try {
            const fileUrl = pathToFileURL(filePath).href;
            const commandModule = await import(fileUrl);
            const command: Command = commandModule.command;
            if (!command || !command.name || typeof command.execute !== "function") {
                loggers.commandHandler.warn(`Invalid command module: ${filePath}`);
                return;
            }
            this.commands.set(command.name, command);
            if (command.aliases) {
                for (const alias of command.aliases) {
                    this.aliases.set(alias, command.name);
                }
            }
            loggers.commandHandler.debug(`Loaded command: ${command.name} from ${filePath}`);
        } catch (error) {
            loggers.commandHandler.error(`Failed to load command: ${filePath}`, error);
        }
    }

    public async getCommand(commandName: string): Promise<Command | null> {
        const mainName = this.aliases.get(commandName) || commandName;
        return this.commands.get(mainName) || null;
    }

    private async handleMessage(message: Message): Promise<void> {
        if (message.author.bot) return;
        let [commandInput, ...rawArgs] = message.content.trim().split(" ");
        let prefix = commandInput.charAt(0);
        let commandName = commandInput.slice(1);
        if (prefix !== config.prefix) return;
        const command = await this.getCommand(commandName);
        if (!command) return;

        let args: Record<string, any> = {};
        let flags: Record<string, any> = {};
        try {
            const parsed = await parse(rawArgs.join(" "), command.args || {});
            args = parsed.args;
            flags = parsed.flags;
        } catch (error) {
            loggers.commandHandler.error(`Failed to parse arguments for command: ${commandName}`, error);
            await this.client.createMessage(message.channel.id, "Invalid command usage. Please check your arguments and try again.");
            return;
        }
        
        const context: CommandContext = {
            client: this.client,
            message,
            commandName,
            rawArgs,
            args,
            flags
        }

        try {
            await command.execute({ ...context });
        } catch (error) {
            loggers.commandHandler.error(`Error executing command: ${commandName}`, error);
            await this.client.createMessage(message.channel.id, "An error occurred while executing the command.");
        }
    }
}