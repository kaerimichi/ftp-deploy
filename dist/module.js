"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.deploy = exports.getLocalFiles = exports.excludeDefaults = void 0;
const ftp = __importStar(require("basic-ftp"));
const readdir_enhanced_1 = __importDefault(require("@jsdevtools/readdir-enhanced"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const multimatch_1 = __importDefault(require("multimatch"));
const types_1 = require("./types");
const HashDiff_1 = require("./HashDiff");
const utilities_1 = require("./utilities");
const pretty_bytes_1 = __importDefault(require("pretty-bytes"));
const errorHandling_1 = require("./errorHandling");
/**
 * Default excludes, ignores all git files and the node_modules folder
 */
exports.excludeDefaults = [".git*", ".git*/**", "node_modules/**", "node_modules/**/*"];
function fileHash(filename, algorithm) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            // Algorithm depends on availability of OpenSSL on platform
            // Another algorithms: "sha1", "md5", "sha256", "sha512" ...
            let shasum = crypto_1.default.createHash(algorithm);
            try {
                let s = fs_1.default.createReadStream(filename);
                s.on("data", function (data) {
                    shasum.update(data);
                });
                s.on("error", function (error) {
                    reject(error);
                });
                // making digest
                s.on("end", function () {
                    const hash = shasum.digest("hex");
                    return resolve(hash);
                });
            }
            catch (error) {
                return reject("calc fail");
            }
        });
    });
}
function applyExcludeFilter(stat, args) {
    // match exclude, return immediatley
    if (args.exclude.length > 0) {
        const excludeMatch = multimatch_1.default(stat.path, args.exclude, { matchBase: true, dot: true });
        if (excludeMatch.length > 0) {
            return false;
        }
    }
    return true;
}
function getLocalFiles(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield readdir_enhanced_1.default.async(args["local-dir"], { deep: true, stats: true, sep: "/", filter: (stat) => applyExcludeFilter(stat, args) });
        const records = [];
        for (let stat of files) {
            if (stat.isDirectory()) {
                records.push({
                    type: "folder",
                    name: stat.path,
                    size: undefined
                });
                continue;
            }
            if (stat.isFile()) {
                records.push({
                    type: "file",
                    name: stat.path,
                    size: stat.size,
                    hash: yield fileHash(args["local-dir"] + stat.path, "sha256")
                });
                continue;
            }
            if (stat.isSymbolicLink()) {
                console.warn("This script is currently unable to handle symbolic links - please add a feature request if you need this");
            }
        }
        return {
            description: types_1.syncFileDescription,
            version: types_1.currentSyncFileVersion,
            generatedTime: new Date().getTime(),
            data: records
        };
    });
}
exports.getLocalFiles = getLocalFiles;
function downloadFileList(client, logger, path) {
    return __awaiter(this, void 0, void 0, function* () {
        // note: originally this was using a writable stream instead of a buffer file
        // basic-ftp doesn't seam to close the connection when using steams over some ftps connections. This appears to be dependent on the ftp server
        const tempFileNameHack = ".ftp-deploy-sync-server-state-buffer-file---delete.json";
        yield utilities_1.retryRequest(logger, () => __awaiter(this, void 0, void 0, function* () { return yield client.downloadTo(tempFileNameHack, path); }));
        const fileAsString = fs_1.default.readFileSync(tempFileNameHack, { encoding: "utf-8" });
        const fileAsObject = JSON.parse(fileAsString);
        fs_1.default.unlinkSync(tempFileNameHack);
        return fileAsObject;
    });
}
/**
 * Converts a file path (ex: "folder/otherfolder/file.txt") to an array of folder and a file path
 * @param fullPath
 */
function getFileBreadcrumbs(fullPath) {
    var _a;
    // todo see if this regex will work for nonstandard folder names
    // todo what happens if the path is relative to the root dir? (starts with /)
    const pathSplit = fullPath.split("/");
    const file = (_a = pathSplit === null || pathSplit === void 0 ? void 0 : pathSplit.pop()) !== null && _a !== void 0 ? _a : ""; // get last item
    const folders = pathSplit.filter(folderName => folderName != "");
    return {
        folders: folders.length === 0 ? null : folders,
        file: file === "" ? null : file
    };
}
/**
 * Navigates up {dirCount} number of directories from the current working dir
 */
function upDir(client, logger, dirCount) {
    return __awaiter(this, void 0, void 0, function* () {
        if (typeof dirCount !== "number") {
            return;
        }
        // navigate back to the starting folder
        for (let i = 0; i < dirCount; i++) {
            yield utilities_1.retryRequest(logger, () => __awaiter(this, void 0, void 0, function* () { return yield client.cdup(); }));
        }
    });
}
function ensureDir(client, logger, timings, folder) {
    return __awaiter(this, void 0, void 0, function* () {
        timings.start("changingDir");
        logger.verbose(`  changing dir to ${folder}`);
        yield utilities_1.retryRequest(logger, () => __awaiter(this, void 0, void 0, function* () { return yield client.ensureDir(folder); }));
        logger.verbose(`  dir changed`);
        timings.stop("changingDir");
    });
}
/**
 *
 * @param client ftp client
 * @param file file can include folder(s)
 * Note working dir is modified and NOT reset after upload
 * For now we are going to reset it - but this will be removed for performance
 */
function uploadFile(client, basePath, filePath, logger, type = "upload", dryRun) {
    return __awaiter(this, void 0, void 0, function* () {
        const typePresent = type === "upload" ? "uploading" : "replacing";
        const typePast = type === "upload" ? "uploaded" : "replaced";
        logger.all(`${typePresent} "${filePath}"`);
        if (dryRun === false) {
            yield utilities_1.retryRequest(logger, () => __awaiter(this, void 0, void 0, function* () { return yield client.uploadFrom(basePath + filePath, filePath); }));
        }
        logger.verbose(`  file ${typePast}`);
    });
}
function createFolder(client, folderPath, logger, timings, dryRun) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        logger.all(`creating folder "${folderPath + "/"}"`);
        if (dryRun === true) {
            return;
        }
        const path = getFileBreadcrumbs(folderPath + "/");
        if (path.folders === null) {
            logger.verbose(`  no need to change dir`);
        }
        else {
            yield ensureDir(client, logger, timings, path.folders.join("/"));
        }
        // navigate back to the root folder
        yield upDir(client, logger, (_a = path.folders) === null || _a === void 0 ? void 0 : _a.length);
        logger.verbose(`  completed`);
    });
}
function removeFolder(client, folderPath, logger, dryRun) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        logger.all(`removing folder "${folderPath + "/"}"`);
        const path = getFileBreadcrumbs(folderPath + "/");
        if (path.folders === null) {
            logger.verbose(`  no need to change dir`);
        }
        else {
            try {
                logger.verbose(`  removing folder "${path.folders.join("/") + "/"}"`);
                if (dryRun === false) {
                    yield utilities_1.retryRequest(logger, () => __awaiter(this, void 0, void 0, function* () { return yield client.removeDir(path.folders.join("/") + "/"); }));
                }
            }
            catch (e) {
                let error = e;
                if (error.code === types_1.ErrorCode.FileNotFoundOrNoAccess) {
                    logger.verbose(`  could not remove folder. It doesn't exist!`);
                }
                else {
                    // unknown error
                    throw error;
                }
            }
        }
        // navigate back to the root folder
        yield upDir(client, logger, (_a = path.folders) === null || _a === void 0 ? void 0 : _a.length);
        logger.verbose(`  completed`);
    });
}
function removeFile(client, basePath, filePath, logger, dryRun) {
    return __awaiter(this, void 0, void 0, function* () {
        logger.all(`removing ${filePath}...`);
        try {
            if (dryRun === false) {
                yield utilities_1.retryRequest(logger, () => __awaiter(this, void 0, void 0, function* () { return yield client.remove(basePath + filePath); }));
            }
            logger.verbose(`  file removed`);
        }
        catch (e) {
            let error = e;
            if (error.code === types_1.ErrorCode.FileNotFoundOrNoAccess) {
                logger.verbose(`  could not remove file. It doesn't exist!`);
            }
            else {
                // unknown error
                throw error;
            }
        }
        logger.verbose(`  completed`);
    });
}
function createLocalState(localFiles, logger, args) {
    logger.verbose(`Creating local state at ${args["local-dir"]}${args["state-name"]}`);
    fs_1.default.writeFileSync(`${args["local-dir"]}${args["state-name"]}`, JSON.stringify(localFiles, undefined, 4), { encoding: "utf8" });
    logger.verbose("Local state created");
}
function connect(client, args, logger) {
    return __awaiter(this, void 0, void 0, function* () {
        let secure = false;
        if (args.protocol === "ftps") {
            secure = true;
        }
        else if (args.protocol === "ftps-legacy") {
            secure = "implicit";
        }
        client.ftp.verbose = args["log-level"] === "verbose";
        const rejectUnauthorized = args.security === "loose";
        yield client.access({
            host: args.server,
            user: args.username,
            password: args.password,
            port: args.port,
            secure: secure,
            secureOptions: {
                rejectUnauthorized: rejectUnauthorized
            }
        });
        if (args["log-level"] === "verbose") {
            client.trackProgress(info => {
                logger.verbose(`${info.type} progress for "${info.name}". Progress: ${info.bytes} bytes of ${info.bytesOverall} bytes`);
            });
        }
    });
}
function getServerFiles(client, logger, timings, args) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield ensureDir(client, logger, timings, args["server-dir"]);
            if (args["dangerous-clean-slate"]) {
                logger.all(`----------------------------------------------------------------`);
                logger.all("🗑️ Removing all files on the server because 'dangerous-clean-slate' was set, this will make the deployment very slow...");
                yield client.clearWorkingDir();
                logger.all("Clear complete");
                throw new Error("nope");
            }
            const serverFiles = yield downloadFileList(client, logger, args["state-name"]);
            logger.all(`----------------------------------------------------------------`);
            logger.all(`Last published on 📅 ${new Date(serverFiles.generatedTime).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric" })}`);
            return serverFiles;
        }
        catch (e) {
            logger.all(`----------------------------------------------------------------`);
            logger.all(`No file exists on the server "${args["server-dir"] + args["state-name"]}" - this much be your first publish! 🎉`);
            logger.all(`The first publish will take a while... but once the initial sync is done only differences are published!`);
            logger.all(`If you get this message and its NOT your first publish, something is wrong.`);
            // set the server state to nothing, because we don't know what the server state is
            return {
                description: types_1.syncFileDescription,
                version: types_1.currentSyncFileVersion,
                generatedTime: new Date().getTime(),
                data: [],
            };
        }
    });
}
function getDefaultSettings(withoutDefaults) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    if (withoutDefaults["local-dir"] !== undefined) {
        if (!withoutDefaults["local-dir"].endsWith("/")) {
            throw new Error("local-dir should be a folder (must end with /)");
        }
    }
    if (withoutDefaults["server-dir"] !== undefined) {
        if (!withoutDefaults["server-dir"].endsWith("/")) {
            throw new Error("server-dir should be a folder (must end with /)");
        }
    }
    return {
        "server": withoutDefaults.server,
        "username": withoutDefaults.username,
        "password": withoutDefaults.password,
        "port": (_a = withoutDefaults.port) !== null && _a !== void 0 ? _a : 21,
        "protocol": (_b = withoutDefaults.protocol) !== null && _b !== void 0 ? _b : "ftp",
        "local-dir": (_c = withoutDefaults["local-dir"]) !== null && _c !== void 0 ? _c : "./",
        "server-dir": (_d = withoutDefaults["server-dir"]) !== null && _d !== void 0 ? _d : "./",
        "state-name": (_e = withoutDefaults["state-name"]) !== null && _e !== void 0 ? _e : ".ftp-deploy-sync-state.json",
        "dry-run": (_f = withoutDefaults["dry-run"]) !== null && _f !== void 0 ? _f : false,
        "dangerous-clean-slate": (_g = withoutDefaults["dangerous-clean-slate"]) !== null && _g !== void 0 ? _g : false,
        "exclude": (_h = withoutDefaults.exclude) !== null && _h !== void 0 ? _h : exports.excludeDefaults,
        "log-level": (_j = withoutDefaults["log-level"]) !== null && _j !== void 0 ? _j : "standard",
        "security": (_k = withoutDefaults.security) !== null && _k !== void 0 ? _k : "loose",
    };
}
function syncLocalToServer(client, diffs, logger, timings, args) {
    return __awaiter(this, void 0, void 0, function* () {
        const totalCount = diffs.delete.length + diffs.upload.length + diffs.replace.length;
        logger.all(`----------------------------------------------------------------`);
        logger.all(`Making changes to ${totalCount} ${utilities_1.pluralize(totalCount, "file", "files")} to sync server state`);
        logger.all(`Uploading: ${pretty_bytes_1.default(diffs.sizeUpload)} -- Deleting: ${pretty_bytes_1.default(diffs.sizeDelete)} -- Replacing: ${pretty_bytes_1.default(diffs.sizeReplace)}`);
        logger.all(`----------------------------------------------------------------`);
        const basePath = args["local-dir"];
        // create new folders
        for (const file of diffs.upload.filter(item => item.type === "folder")) {
            yield createFolder(client, file.name, logger, timings, args["dry-run"]);
        }
        // upload new files
        for (const file of diffs.upload.filter(item => item.type === "file").filter(item => item.name !== args["state-name"])) {
            yield uploadFile(client, basePath, file.name, logger, "upload", args["dry-run"]);
        }
        // replace new files
        for (const file of diffs.replace.filter(item => item.type === "file").filter(item => item.name !== args["state-name"])) {
            // note: FTP will replace old files with new files. We run replacements after uploads to limit downtime
            yield uploadFile(client, basePath, file.name, logger, "replace", args["dry-run"]);
        }
        // delete old files
        for (const file of diffs.delete.filter(item => item.type === "file")) {
            yield removeFile(client, basePath, file.name, logger, args["dry-run"]);
        }
        // delete old folders
        for (const file of diffs.delete.filter(item => item.type === "folder")) {
            yield removeFolder(client, file.name, logger, args["dry-run"]);
        }
        logger.all(`----------------------------------------------------------------`);
        logger.all(`🎉 Sync complete. Saving current server state to "${args["server-dir"] + args["state-name"]}"`);
        if (args["dry-run"] === false) {
            yield utilities_1.retryRequest(logger, () => __awaiter(this, void 0, void 0, function* () { return yield client.uploadFrom(args["local-dir"] + args["state-name"], args["state-name"]); }));
        }
    });
}
function deploy(deployArgs) {
    return __awaiter(this, void 0, void 0, function* () {
        const args = getDefaultSettings(deployArgs);
        const logger = new utilities_1.Logger(args["log-level"]);
        const timings = new utilities_1.Timings();
        timings.start("total");
        // header
        logger.all(`----------------------------------------------------------------`);
        logger.all(`🚀 Thanks for using ftp-deploy. Let's deploy some stuff!   `);
        logger.all(`----------------------------------------------------------------`);
        logger.all(`If you found this project helpful, please support it`);
        logger.all(`by giving it a ⭐ on Github --> https://github.com/SamKirkland/FTP-Deploy-Action`);
        logger.all(`or add a badge 🏷️ to your projects readme --> https://github.com/SamKirkland/FTP-Deploy-Action#badge`);
        timings.start("hash");
        const localFiles = yield getLocalFiles(args);
        timings.stop("hash");
        createLocalState(localFiles, logger, args);
        const client = new ftp.Client();
        global.reconnect = function () {
            return __awaiter(this, void 0, void 0, function* () {
                timings.start("connecting");
                yield connect(client, args, logger);
                timings.stop("connecting");
            });
        };
        let totalBytesUploaded = 0;
        try {
            yield global.reconnect();
            try {
                const serverFiles = yield getServerFiles(client, logger, timings, args);
                timings.start("logging");
                const diffTool = new HashDiff_1.HashDiff();
                const diffs = diffTool.getDiffs(localFiles, serverFiles, logger);
                timings.stop("logging");
                totalBytesUploaded = diffs.sizeUpload + diffs.sizeReplace;
                timings.start("upload");
                try {
                    yield syncLocalToServer(client, diffs, logger, timings, args);
                }
                catch (e) {
                    if (e.code === types_1.ErrorCode.FileNameNotAllowed) {
                        logger.all("Error 553 FileNameNotAllowed, you don't have access to upload that file");
                    }
                    logger.all(e);
                    throw e;
                }
                finally {
                    timings.stop("upload");
                }
            }
            catch (error) {
                const ftpError = error;
                if (ftpError.code === types_1.ErrorCode.FileNotFoundOrNoAccess) {
                    logger.all("Couldn't find file");
                }
                logger.all(ftpError);
            }
        }
        catch (error) {
            errorHandling_1.prettyError(logger, args, error);
            throw error;
        }
        finally {
            client.close();
            timings.stop("total");
        }
        const uploadSpeed = pretty_bytes_1.default(totalBytesUploaded / (timings.getTime("upload") / 1000));
        // footer
        logger.all(`----------------------------------------------------------------`);
        logger.all(`Time spent hashing:               ${timings.getTimeFormatted("hash")}`);
        logger.all(`Time spent connecting to server:  ${timings.getTimeFormatted("connecting")}`);
        logger.all(`Time spent deploying:             ${timings.getTimeFormatted("upload")} (${uploadSpeed}/second)`);
        logger.all(`  - changing dirs:                ${timings.getTimeFormatted("changingDir")}`);
        logger.all(`  - logging:                      ${timings.getTimeFormatted("logging")}`);
        logger.all(`----------------------------------------------------------------`);
        logger.all(`Total time:                       ${timings.getTimeFormatted("total")}`);
        logger.all(`----------------------------------------------------------------`);
    });
}
exports.deploy = deploy;
