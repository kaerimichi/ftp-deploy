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
const HashDiff_1 = require("./HashDiff");
const types_1 = require("./types");
const path_1 = __importDefault(require("path"));
const ftp_srv_1 = __importDefault(require("ftp-srv"));
const module_1 = require("./module");
const tenFiles = [
    {
        type: "file",
        name: "a",
        size: 1000,
        hash: "hash1",
    },
    {
        type: "file",
        name: "b",
        size: 1000,
        hash: "hash2",
    },
    {
        type: "file",
        name: "c",
        size: 1000,
        hash: "hash3",
    },
    {
        type: "file",
        name: "d",
        size: 1000,
        hash: "hash4",
    },
    {
        type: "file",
        name: "e",
        size: 1000,
        hash: "hash5",
    },
    {
        type: "file",
        name: "f",
        size: 1000,
        hash: "hash6",
    },
    {
        type: "file",
        name: "g",
        size: 1000,
        hash: "hash7",
    },
    {
        type: "file",
        name: "h",
        size: 1000,
        hash: "hash8",
    },
    {
        type: "file",
        name: "i",
        size: 1000,
        hash: "hash9",
    },
    {
        type: "file",
        name: "j",
        size: 1000,
        hash: "hash10",
    }
];
class MockedLogger {
    all() { }
    ;
    standard() { }
    ;
    verbose() { }
    ;
}
describe("HashDiff", () => {
    const thing = new HashDiff_1.HashDiff();
    const emptyFileList = { version: types_1.currentSyncFileVersion, description: "", generatedTime: new Date().getTime(), data: [] };
    const minimalFileList = { version: types_1.currentSyncFileVersion, description: "", generatedTime: new Date().getTime(), data: tenFiles };
    test("Empty Client, Empty Server", () => {
        const diffs = thing.getDiffs(emptyFileList, emptyFileList, new MockedLogger());
        expect(diffs.upload.length).toEqual(0);
        expect(diffs.delete.length).toEqual(0);
        expect(diffs.replace.length).toEqual(0);
        expect(diffs.sizeUpload).toEqual(0);
        expect(diffs.sizeDelete).toEqual(0);
        expect(diffs.sizeReplace).toEqual(0);
    });
    test("Minimal Client, Empty Server", () => {
        const diffs = thing.getDiffs(minimalFileList, emptyFileList, new MockedLogger());
        expect(diffs.upload.length).toEqual(10);
        expect(diffs.delete.length).toEqual(0);
        expect(diffs.replace.length).toEqual(0);
        expect(diffs.sizeUpload).toEqual(10000);
        expect(diffs.sizeDelete).toEqual(0);
        expect(diffs.sizeReplace).toEqual(0);
    });
    test("Empty Client, Minimal Server", () => {
        const diffs = thing.getDiffs(emptyFileList, minimalFileList, new MockedLogger());
        expect(diffs.upload.length).toEqual(0);
        expect(diffs.delete.length).toEqual(10);
        expect(diffs.replace.length).toEqual(0);
        expect(diffs.sizeUpload).toEqual(0);
        expect(diffs.sizeDelete).toEqual(10000);
        expect(diffs.sizeReplace).toEqual(0);
    });
    test("Minimal Client, Minimal Server - No Diffs", () => {
        const diffs = thing.getDiffs(minimalFileList, minimalFileList, new MockedLogger());
        expect(diffs.upload.length).toEqual(0);
        expect(diffs.delete.length).toEqual(0);
        expect(diffs.replace.length).toEqual(0);
        expect(diffs.sizeUpload).toEqual(0);
        expect(diffs.sizeDelete).toEqual(0);
        expect(diffs.sizeReplace).toEqual(0);
    });
    test("Minimal Client, Minimal Server", () => {
        const minimalFileList2 = Object.assign(Object.assign({}, minimalFileList), { data: [
                ...minimalFileList.data,
                {
                    type: "file",
                    name: "zzzz",
                    size: 1000,
                    hash: "hash",
                }
            ] });
        const diffs = thing.getDiffs(minimalFileList2, minimalFileList, new MockedLogger());
        expect(diffs.upload.length).toEqual(1);
        expect(diffs.delete.length).toEqual(0);
        expect(diffs.replace.length).toEqual(0);
        expect(diffs.sizeUpload).toEqual(1000);
        expect(diffs.sizeDelete).toEqual(0);
        expect(diffs.sizeReplace).toEqual(0);
    });
    test("Minimal Client, Minimal Server 2", () => {
        const minimalFileList2 = Object.assign(Object.assign({}, minimalFileList), { data: [
                ...minimalFileList.data,
                {
                    type: "file",
                    name: "zzzz",
                    size: 1000,
                    hash: "hash",
                }
            ] });
        const diffs = thing.getDiffs(minimalFileList, minimalFileList2, new MockedLogger());
        expect(diffs.upload.length).toEqual(0);
        expect(diffs.delete.length).toEqual(1);
        expect(diffs.replace.length).toEqual(0);
        expect(diffs.sizeUpload).toEqual(0);
        expect(diffs.sizeDelete).toEqual(1000);
        expect(diffs.sizeReplace).toEqual(0);
    });
});
describe("getLocalFiles", () => {
    test("local-dir", () => __awaiter(void 0, void 0, void 0, function* () {
        const localDirDiffs = yield module_1.getLocalFiles({
            server: "127.0.0.1",
            username: "testUsername",
            password: "testPassword",
            port: 21,
            protocol: "ftp",
            "local-dir": "./.github/",
            "server-dir": "./",
            "state-name": ".ftp-deploy-sync-state.json",
            "dry-run": true,
            "dangerous-clean-slate": false,
            exclude: [],
            "log-level": "standard",
            security: "loose",
        });
        expect(localDirDiffs.data).toEqual([
            {
                type: "folder",
                name: "workflows",
                size: undefined
            },
            {
                type: "file",
                name: "workflows/main.yml",
                size: 410,
                hash: "356464bef208ba0862c358f06d087b20f2b1073809858dd9c69fc2bc2894619f"
            }
        ]);
    }));
});
describe("error handling", () => {
    test("throws on error", () => __awaiter(void 0, void 0, void 0, function* () {
        yield expect(() => __awaiter(void 0, void 0, void 0, function* () {
            return yield module_1.deploy({
                server: "127.0.0.1",
                username: "testUsername",
                password: "testPassword",
                port: 21,
                protocol: "ftp",
                "local-dir": "./",
                "dry-run": true,
                "log-level": "minimal"
            });
        })).rejects.toThrow();
    }), 30000);
});
describe("Deploy", () => {
    const port = 2121;
    const homeDir = path_1.default.join(__dirname, "../");
    const ftpServer = new ftp_srv_1.default({
        anonymous: true,
        pasv_url: "127.0.0.1",
        url: `ftp://127.0.0.1:${port}`,
        tls: false,
        blacklist: [],
        whitelist: []
    });
    ftpServer.on("login", (data, resolve) => {
        resolve({ root: homeDir });
    });
    test("Full Deploy", () => __awaiter(void 0, void 0, void 0, function* () {
        ftpServer.listen();
        yield module_1.deploy({
            server: "127.0.0.1",
            username: "testUsername",
            password: "testPassword",
            port: port,
            protocol: "ftp",
            "local-dir": "./",
            "dry-run": true,
            "log-level": "minimal"
        });
        ftpServer.close();
    }), 30000);
});
