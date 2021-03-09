import { IDiff, IFileList, Record } from "./types";
import { ILogger } from "./utilities";
export declare class HashDiff implements IDiff {
    getDiffs(localFiles: IFileList, serverFiles: IFileList, logger: ILogger): {
        upload: Record[];
        delete: Record[];
        replace: Record[];
        sizeDelete: number;
        sizeReplace: number;
        sizeUpload: number;
    };
}
