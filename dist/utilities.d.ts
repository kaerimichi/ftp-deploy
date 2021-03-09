export interface ILogger {
    all(...data: any[]): void;
    standard(...data: any[]): void;
    verbose(...data: any[]): void;
}
export declare class Logger implements ILogger {
    constructor(level: "minimal" | "standard" | "verbose");
    private level;
    all(...data: any[]): void;
    standard(...data: any[]): void;
    verbose(...data: any[]): void;
}
export declare function pluralize(count: number, singular: string, plural: string): string;
/**
 * retry a request
 *
 * @example retryRequest(logger, async () => await item());
 */
export declare function retryRequest<T>(logger: ILogger, callback: () => Promise<T>): Promise<T>;
declare type AvailableTimers = "connecting" | "hash" | "upload" | "total" | "changingDir" | "logging";
export declare class Timings {
    private timers;
    start(type: AvailableTimers): void;
    stop(type: AvailableTimers): void;
    getTime(type: AvailableTimers): number;
    getTimeFormatted(type: AvailableTimers): string;
}
export declare class Timer {
    private totalTime;
    private startTime;
    private endTime;
    start(): void;
    stop(): void;
    get time(): number | null;
}
export {};
