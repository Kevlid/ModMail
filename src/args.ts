import { client } from "./client";
import yargsParser from "yargs-parser";
import { CustomError } from "./error";

export enum ArgumentType {
    String = "string",
    Number = "number",
    Boolean = "boolean",
    Rest = "string+",
    Snowflake = "snowflake",
    User = "user",
    Channel = "channel",
}

export interface ArgumentItem {
    type: ArgumentType;
    required?: boolean;
    default?: any;
}

export type ArgumentSchema = Record<string, ArgumentItem>;


function tokenize(input: string): string[] {
    return input.trim().split(" ").filter(Boolean) || [];
}


function splitArgsAndFlags(tokens: Array<string>): [string[], string[]] {
    let args = [];
    let flags = [];
    let flagStarted = false;

    for (const token of tokens) {
        if (!flagStarted && (token.startsWith("--") || token.startsWith("-"))) {
        flagStarted = true;
        }

        if (flagStarted) {
            flags.push(token);
        } else {
            args.push(token);
        }
    }

    return [args, flags];
}


async function parseArgs(tokens: string[], schema: ArgumentSchema): Promise<Record<string, any>> {
    const parsedArgs: Record<string, any> = {};
    let argIndex = 0;

    for (const key in schema) {
        const { type, required, default: defaultValue } = schema[key];
        let original, value;

        if (type === ArgumentType.Rest && argIndex < tokens.length) {
            value = tokens.slice(argIndex).join(" ");
            argIndex = tokens.length;
        } else if (argIndex <= tokens.length) {
            value = tokens[argIndex];
            argIndex++;
        } else if (defaultValue !== undefined) {
            value = defaultValue;
        } else if (argIndex < tokens.length) {
            value = null;
        }
        original = value;
        
        if (value !== null) {
            if (type === ArgumentType.Number) value = Number(value);
            if (type === ArgumentType.Boolean) value = Boolean(value);
            if (type === ArgumentType.String) value = String(value);
            if (type === ArgumentType.Rest) value = String(value);
            if (type === ArgumentType.Snowflake) value = client.parseSnowflake(value);
            if (type === ArgumentType.User) {
                value = client.parseSnowflake(value);
                value = client.users.get(value);
                if (!value) value = await client.getRESTUser(value);
            };
            if (type === ArgumentType.Channel) {
                value = client.parseSnowflake(value);
                value = client.getChannel(value);
                if (!value) value = await client.getRESTChannel(value);
            };
        }

        if (!required || value !== null) {
            parsedArgs[key] = value;
        } else if (value !== original) {
            throw new CustomError({
                type: "NotFound",
                message: `Could not find ${type} for argument: ${key}`,
                argument: key,
                value: original
            });
        } else {
            throw new CustomError({
                type: "MissingArgument",
                message: `Missing required argument: ${key}`,
                argument: key
            });
        }
    }

    return parsedArgs;
}


export async function parse(input: string, schema: ArgumentSchema): Promise<{ args: Record<string, any>; flags: Record<string, any>}> {
    const tokens = tokenize(input);
    const [argTokens, flagTokens] = splitArgsAndFlags(tokens);

    // Parse flags
    const flags = yargsParser(flagTokens.join(" "));

    // Parse args
    const parsedArgs = await parseArgs(argTokens, schema);  

    return {
        args: parsedArgs,
        flags: flags,
    };
}