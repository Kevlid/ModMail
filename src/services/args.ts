export type ArgKind = "value" | "flag";
export type ArgType = "string" | "string+" | "number" | "boolean" | "snowflake"
export type ArgValue = string | number | boolean;

export interface ArgItem {
	name: string;
	type?: ArgType;
    flag?: boolean;
	required?: boolean;
	default?: string | number | boolean;
}

export interface ParsedArgs {
	args: Record<string, ArgValue>;
	flags: Record<string, ArgValue>;
    errors?: string[];
}

export interface SchemaData {
    args: Record<string, ArgItem>;
    flags: Record<string, ArgItem>;
}

class Service {
	parse(args: string[], schema: Array<ArgItem>): ParsedArgs {
        let schemaData = this.groupSchema(schema);
        let { values, flags, errors } = this.readArgs(args, schemaData);

		return {
			args: values,
			flags,
            errors
		};
	}

    private groupSchema(schema: Array<ArgItem>): SchemaData {
        const args: Record<string, ArgItem> = {};
        const flags: Record<string, ArgItem> = {};

        for (const item of schema) {
            if (item.flag === true) {
                item.required = false;
                flags[item.name] = item;
            } else {
                args[item.name] = item;
            }
        }

        return { args, flags };
    }
    

	private readArgs(args: string[], schema: SchemaData ): { 
        values: Record<string, ArgValue>; flags: Record<string, ArgValue>; errors: string[] 
    } {
        const values: Record<string, ArgValue> = {};
        const flags: Record<string, ArgValue> = {};
        const errors: string[] = [];
        const argKeys = Object.keys(schema.args);
        let positionalIndex = 0;

        for (let index = 0; index < args.length; index += 1) {
            const token = args[index];
            if (token.startsWith("-")) {
                const parsedName = this.splitDashArg(token);
                if (!parsedName) {
                    continue;
                }

                const { key, displayName, inlineValue } = parsedName;
                const item = schema.flags[key] || schema.args[key];
                if (!item) {
                    errors.push(`Unknown argument: ${displayName}`);
                    continue;
                }

                const valueResult = this.findDashArgValue(args, index, inlineValue, item);
                this.setValue(item, key, valueResult.rawValue, values, flags, errors);
                index = valueResult.nextIndex;
                continue;
            }

            while (positionalIndex < argKeys.length && values[argKeys[positionalIndex]] !== undefined) {
                positionalIndex += 1;
            }

            if (positionalIndex >= argKeys.length) {
                errors.push(`Unexpected argument: ${token}`);
                continue;
            }

            const key = argKeys[positionalIndex];
            const item = schema.args[key];

            if (item.type === "string+") {
                values[key] = args.slice(index).join(" ");
                positionalIndex += 1;
                break;
            }

            const parsedValue = this.parseValue(token, item, key, errors);
            if (parsedValue !== null) {
                values[key] = parsedValue;
            }
            positionalIndex += 1;
        }

        this.fillMissing(schema.args, values, errors, "argument");
        this.fillMissing(schema.flags, flags, errors, "flag");

        return {
            values,
            flags,
            errors
        };	
	}

    private splitDashArg(token: string): { key: string; displayName: string; inlineValue: string | undefined } | null {
        let trimmed = token;
        if (trimmed.startsWith("--")) {
            trimmed = trimmed.slice(2);
        } else if (trimmed.startsWith("-")) {
            trimmed = trimmed.slice(1);
        }

        if (!trimmed) {
            return null;
        }

        const splitIndex = trimmed.indexOf("=");
        if (splitIndex === -1) {
            return {
                key: trimmed,
                displayName: trimmed,
                inlineValue: undefined
            };
        }

        return {
            key: trimmed.slice(0, splitIndex),
            displayName: trimmed.slice(0, splitIndex),
            inlineValue: trimmed.slice(splitIndex + 1)
        };
    }

    private findDashArgValue(
        allArgs: string[],
        currentIndex: number,
        inlineValue: string | undefined,
        item: ArgItem
    ): { rawValue: string | undefined; nextIndex: number } {
        if (item.type === "string+") {
            const remainder = allArgs.slice(currentIndex + 1).join(" ");

            if (inlineValue !== undefined) {
                const combined = remainder ? `${inlineValue} ${remainder}` : inlineValue;
                return { rawValue: combined, nextIndex: allArgs.length - 1 };
            }

            if (remainder.length > 0) {
                return { rawValue: remainder, nextIndex: allArgs.length - 1 };
            }

            return { rawValue: undefined, nextIndex: currentIndex };
        }

        if (inlineValue !== undefined) {
            return { rawValue: inlineValue, nextIndex: currentIndex };
        }

        if (item.flag !== true) {
            const next = allArgs[currentIndex + 1];
            if (next && !next.startsWith("-")) {
                return { rawValue: next, nextIndex: currentIndex + 1 };
            }
        }

        return { rawValue: undefined, nextIndex: currentIndex };
    }

    private fillMissing(
        items: Record<string, ArgItem>,
        target: Record<string, ArgValue>,
        errors: string[],
        label: "argument" | "flag"
    ): void {
        for (const [name, item] of Object.entries(items)) {
            if (target[name] !== undefined) {
                continue;
            }

            if (item.default !== undefined) {
                target[name] = item.default;
                continue;
            }

            if (item.required) {
                errors.push(`Missing required ${label}: ${name}`);
            }
        }
    }

    private parseValue(raw: string, item: ArgItem, name: string, errors: string[]): ArgValue | null {
        if (item.type === "number") {
            const parsed = Number(raw);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }

            errors.push(`Invalid number for ${name}: ${raw}`);
            return null;
        }

        if (item.type === "boolean") {
            const normalized = raw.trim().toLowerCase();
            if (["true", "1", "yes", "on"].includes(normalized)) {
                return true;
            }
            if (["false", "0", "no", "off"].includes(normalized)) {
                return false;
            }

            errors.push(`Invalid boolean for ${name}: ${raw}`);
            return null;
        }

        if (item.type === "snowflake") {
            const normalized = raw.trim();
            let snowflake = normalized;

            if (normalized.startsWith("<") && normalized.endsWith(">")) {
                const inner = normalized.slice(1, -1);
                let prefixLength = 0;

                if (inner.startsWith("@!")) {
                    prefixLength = 2;
                } else if (inner.startsWith("@&")) {
                    prefixLength = 2;
                } else if (inner.startsWith("@")) {
                    prefixLength = 1;
                } else if (inner.startsWith("#")) {
                    prefixLength = 1;
                }

                snowflake = inner.slice(prefixLength);
            }

            try {
                const parsed = BigInt(snowflake);
                if (parsed > 0n && parsed.toString() === snowflake) {
                    return snowflake;
                }
            } catch {
            }

            errors.push(`Invalid snowflake for ${name}: ${raw}`);
            return null;
        }

        return raw;
    }

    private saveValue(
        item: ArgItem,
        name: string,
        value: ArgValue,
        values: Record<string, ArgValue>,
        flags: Record<string, ArgValue>
    ): void {
        if (item.flag === true) {
            flags[name] = value;
            return;
        }
        values[name] = value;
    }

    private setValue(
        item: ArgItem,
        name: string,
        rawValue: string | undefined,
        values: Record<string, ArgValue>,
        flags: Record<string, ArgValue>,
        errors: string[]
    ): void {
        if (rawValue === undefined) {
            if (item.default !== undefined) {
                this.saveValue(item, name, item.default, values, flags);
                return;
            }

            if (item.flag === true) {
                flags[name] = true;
                return;
            }

            if (item.required) {
                errors.push(`Missing value for ${name}`);
            }
            return;
        }

        const parsedValue = this.parseValue(rawValue, item, name, errors);
        if (parsedValue === null) {
            return;
        }
        this.saveValue(item, name, parsedValue, values, flags);
    }
}

export const argsService = new Service();