export = MoneroRpcError;
declare const MoneroRpcError_base: typeof import("./MoneroError");
/**
 * Error when interacting with Monero RPC.
 */
declare class MoneroRpcError extends MoneroRpcError_base {
    /**
     * Constructs the error.
     *
     * @param {string} rpcDescription is a description of the error from rpc
     * @param {int} rpcCode is the error code from rpc
     * @param {string} rpcMethod is the rpc method invoked
     * @param {object} rpcParams are parameters sent with the rpc request
     */
    constructor(rpcDescription: string, rpcCode: any, rpcMethod: string, rpcParams: object);
    rpcMethod: string;
    rpcParams: any;
    getRpcMethod(): string;
    getRpcParams(): any;
}
