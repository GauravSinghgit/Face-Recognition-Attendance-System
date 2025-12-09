type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
}

class Logger {
    private static instance: Logger;
    private readonly maxLogHistory: number = 1000;
    private logHistory: LogEntry[] = [];
    private readonly isProd: boolean = process.env.NODE_ENV === 'production';

    private constructor() {
        // Private constructor to enforce singleton pattern
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        };
        
        this.logHistory.push(entry);
        if (this.logHistory.length > this.maxLogHistory) {
            this.logHistory.shift();
        }
        
        return entry;
    }

    private logToConsole(entry: LogEntry): void {
        const { timestamp, level, message, data } = entry;
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

        switch (level) {
            case 'info':
                console.info(prefix, message, data || '');
                break;
            case 'warn':
                console.warn(prefix, message, data || '');
                break;
            case 'error':
                console.error(prefix, message, data || '');
                break;
            case 'debug':
                if (!this.isProd) {
                    console.debug(prefix, message, data || '');
                }
                break;
        }
    }

    public info(message: string, data?: any): void {
        const entry = this.formatMessage('info', message, data);
        this.logToConsole(entry);
    }

    public warn(message: string, data?: any): void {
        const entry = this.formatMessage('warn', message, data);
        this.logToConsole(entry);
    }

    public error(message: string, data?: any): void {
        const entry = this.formatMessage('error', message, data);
        this.logToConsole(entry);
    }

    public debug(message: string, data?: any): void {
        const entry = this.formatMessage('debug', message, data);
        this.logToConsole(entry);
    }

    public getLogHistory(): LogEntry[] {
        return [...this.logHistory];
    }

    public clearLogHistory(): void {
        this.logHistory = [];
    }
}

export const logger = Logger.getInstance(); 