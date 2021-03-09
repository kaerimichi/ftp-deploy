"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timer = exports.Timings = exports.retryRequest = exports.pluralize = exports.Logger = void 0;
const pretty_ms_1 = __importDefault(require("pretty-ms"));
const types_1 = require("./types");
class Logger {
    constructor(level) {
        this.level = level;
    }
    all(...data) {
        console.log(...data);
    }
    standard(...data) {
        if (this.level === "minimal") {
            return;
        }
        console.log(...data);
    }
    verbose(...data) {
        if (this.level !== "verbose") {
            return;
        }
        console.log(...data);
    }
}
exports.Logger = Logger;
function pluralize(count, singular, plural) {
    if (count === 1) {
        return singular;
    }
    return plural;
}
exports.pluralize = pluralize;
/**
 * retry a request
 *
 * @example retryRequest(logger, async () => await item());
 */
function retryRequest(logger, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield callback();
        }
        catch (e) {
            if (e.code >= 400 && e.code <= 499) {
                logger.standard("400 level error from server when performing action - retrying...");
                logger.standard(e);
                if (e.code === types_1.ErrorCode.ConnectionClosed) {
                    logger.all("Connection closed. This library does not currently handle reconnects");
                    // await global.reconnect();
                    // todo reset current working dir
                    throw e;
                }
                return yield callback();
            }
            else {
                throw e;
            }
        }
    });
}
exports.retryRequest = retryRequest;
class Timings {
    constructor() {
        this.timers = {};
    }
    start(type) {
        if (this.timers[type] === undefined) {
            this.timers[type] = new Timer();
        }
        this.timers[type].start();
    }
    stop(type) {
        this.timers[type].stop();
    }
    getTime(type) {
        const timer = this.timers[type];
        if (timer === undefined || timer.time === null) {
            return 0;
        }
        return timer.time;
    }
    getTimeFormatted(type) {
        const timer = this.timers[type];
        if (timer === undefined || timer.time === null) {
            return "💣 Failed";
        }
        return pretty_ms_1.default(timer.time, { verbose: true });
    }
}
exports.Timings = Timings;
class Timer {
    constructor() {
        this.totalTime = null;
        this.startTime = null;
        this.endTime = null;
    }
    start() {
        this.startTime = process.hrtime();
    }
    stop() {
        if (this.startTime === null) {
            throw new Error("Called .stop() before calling .start()");
        }
        this.endTime = process.hrtime(this.startTime);
        const currentSeconds = this.totalTime === null ? 0 : this.totalTime[0];
        const currentNS = this.totalTime === null ? 0 : this.totalTime[1];
        this.totalTime = [
            currentSeconds + this.endTime[0],
            currentNS + this.endTime[1]
        ];
    }
    get time() {
        if (this.totalTime === null) {
            return null;
        }
        return (this.totalTime[0] * 1000) + (this.totalTime[1] / 1000000);
    }
}
exports.Timer = Timer;
