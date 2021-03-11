export = MoneroKeyImage;
/**
 * Models a Monero key image.
 */
declare class MoneroKeyImage {
    /**
     * Construct the model.
     *
     * @param {MoneroKeyImage|object|string} stateOrHex is a MoneroKeyImage, JS object, or hex string to initialize from (optional)
     * @param {string} signature is the key image's signature
     */
    constructor(stateOrHex: MoneroKeyImage | object | string, signature: string);
    state: any;
    getHex(): any;
    setHex(hex: any): MoneroKeyImage;
    getSignature(): any;
    setSignature(signature: any): MoneroKeyImage;
    copy(): MoneroKeyImage;
    toJson(): any;
    merge(keyImage: any): MoneroKeyImage;
    toString(indent?: number): string;
}
