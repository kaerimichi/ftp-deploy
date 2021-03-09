import { IFileList, IFtpDeployArguments, IFtpDeployArgumentsWithDefaults } from "./types";
/**
 * Default excludes, ignores all git files and the node_modules folder
 */
export declare const excludeDefaults: string[];
export declare function getLocalFiles(args: IFtpDeployArgumentsWithDefaults): Promise<IFileList>;
export declare function deploy(deployArgs: IFtpDeployArguments): Promise<void>;
