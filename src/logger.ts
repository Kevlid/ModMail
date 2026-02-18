import chalk from "chalk";

enum LogLevel {
    Debug = 10,
    Info = 20,
    Warn = 30,
    Error = 40
}

const LevelTag = {
    [LogLevel.Debug]: chalk.blue("[DEBUG]"),
    [LogLevel.Info]: chalk.green("[INFO]"),
    [LogLevel.Warn]: chalk.yellow("[WARN]"),
    [LogLevel.Error]: chalk.red("[ERROR]")
}

const isDebugMode = process.argv.includes("--debug") || process.env.LOG_LEVEL === "debug";
const globalLogLevel: LogLevel = isDebugMode ? LogLevel.Debug : LogLevel.Info;

class ScopedLogger {
    constructor(private normalizedScope: string) {}

    private writeLog(level: LogLevel, message: string, meta: unknown[]): void {
        if (level < globalLogLevel) {
            return;
        }

        const timestamp = chalk.gray(new Date().toISOString());
        const levelTag = LevelTag[level];
        const line = `${timestamp} [${this.normalizedScope}] ${levelTag} ${message}`;
    
        if (level === LogLevel.Error) {
            console.error(line, ...meta);
            return;
        }
    
        if (level === LogLevel.Warn) {
            console.warn(line, ...meta);
            return;
        }
    
        console.log(line, ...meta);
    }

    debug(message: string, ...meta: unknown[]) {
        this.writeLog(LogLevel.Debug, message, meta);
    }

    info(message: string, ...meta: unknown[]) {
        this.writeLog(LogLevel.Info, message, meta);
    }

    warn(message: string, ...meta: unknown[]) {
        this.writeLog(LogLevel.Warn, message, meta);
    }

    error(message: string, ...meta: unknown[]) {
        this.writeLog(LogLevel.Error, message, meta);
    }    
}

type LoggerCollection = {
    ticketService: ScopedLogger;
    [scope: string]: ScopedLogger;
};

const scopedLoggers = new Map<string, ScopedLogger>();

const loggers = new Proxy({} as LoggerCollection, {
    get: (_, prop: string | symbol) => {
        if (typeof prop !== 'string') return undefined;
        
        const scope = prop.charAt(0).toUpperCase() + prop.slice(1);

        if (!scopedLoggers.has(scope)) {
            scopedLoggers.set(scope, new ScopedLogger(scope));
        }

        return scopedLoggers.get(scope)!;
    }
});

export { loggers };