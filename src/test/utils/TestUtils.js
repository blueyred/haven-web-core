const assert = require("assert");
const WalletSyncPrinter = require("./WalletSyncPrinter");
const monerojs = require("../../../index");
const LibraryUtils = monerojs.LibraryUtils;
const GenUtils = monerojs.GenUtils;
const MoneroRpcError = monerojs.MoneroRpcError;
const MoneroRpcConnection = monerojs.MoneroRpcConnection;
const BigInteger = monerojs.BigInteger;
const MoneroNetworkType = monerojs.MoneroNetworkType;

/**
 * Collection of test utilities and configurations.
 * 
 * TODO: move hard coded to config
 */
class TestUtils {
  
  /**
   * Get a default file system.  Uses an in-memory file system if running in the browser.
   * 
   * @return nodejs-compatible file system
   */
  static getDefaultFs() {
    if (!LibraryUtils.FS) LibraryUtils.FS = GenUtils.isBrowser() ? require('memfs') : require('fs');
    return LibraryUtils.FS;
  }
  
  /**
   * Get a singleton daemon RPC instance shared among tests.
   * 
   * @return {MoneroDaemonRpc} a daemon RPC instance
   */
  static async getDaemonRpc() {
    if (TestUtils.daemonRpc === undefined) TestUtils.daemonRpc = monerojs.connectToDaemonRpc(Object.assign({proxyToWorker: TestUtils.PROXY_TO_WORKER}, TestUtils.DAEMON_RPC_CONFIG));
    return TestUtils.daemonRpc;
  }
  
  static getDaemonRpcConnection() {
    return new MoneroRpcConnection(TestUtils.DAEMON_RPC_CONFIG);
  }
  
  /**
   * Get a singleton wallet RPC instance shared among tests.
   * 
   * @return {MoneroWalletRpc} a wallet RPC instance
   */
  static async getWalletRpc() {
    if (TestUtils.walletRpc === undefined) {
      
      // construct wallet rpc instance with daemon connection
      TestUtils.walletRpc = monerojs.connectToWalletRpc(TestUtils.WALLET_RPC_CONFIG);
    }
    
    // attempt to open test wallet
    try {
      await TestUtils.walletRpc.openWallet({path: TestUtils.WALLET_NAME, password: TestUtils.WALLET_PASSWORD});
    } catch (e) {
      if (!(e instanceof MoneroRpcError)) throw e;
      
      // -1 returned when wallet does not exist or fails to open e.g. it's already open by another application
      if (e.getCode() === -1) {
        
        // create wallet
        await TestUtils.walletRpc.createWallet({path: TestUtils.WALLET_NAME, password: TestUtils.WALLET_PASSWORD, mnemonic: TestUtils.MNEMONIC, restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT});
      } else {
        throw e;
      }
    }
    
    // ensure we're testing the right wallet
    assert.equal(await TestUtils.walletRpc.getMnemonic(), TestUtils.MNEMONIC);
    assert.equal(await TestUtils.walletRpc.getPrimaryAddress(), TestUtils.ADDRESS);
    
    // sync and save the wallet
    await TestUtils.walletRpc.sync();
    await TestUtils.walletRpc.save();
    
    // return cached wallet rpc
    return TestUtils.walletRpc;
  }
  
  /**
   * Get a singleton wallet WASM instance shared among tests.
   * 
   * @return {MoneroWalletWasm} a wasm wallet instance
   */
  static async getWalletWasm() {
    if (!TestUtils.walletWasm || await TestUtils.walletWasm.isClosed()) {
      
      // create wallet from mnemonic phrase if it doesn't exist
      let fs = TestUtils.getDefaultFs();
      if (!await monerojs.MoneroWalletWasm.walletExists(TestUtils.WALLET_WASM_PATH, fs)) {
        
        // create directory for test wallets if it doesn't exist
        if (!fs.existsSync(TestUtils.TEST_WALLETS_DIR)) {
          if (!fs.existsSync(process.cwd())) fs.mkdirSync(process.cwd(), { recursive: true });  // create current process directory for relative paths which does not exist in memory fs
          fs.mkdirSync(TestUtils.TEST_WALLETS_DIR);
        }
        
        // create wallet with connection
        TestUtils.walletWasm = await monerojs.createWalletWasm({path: TestUtils.WALLET_WASM_PATH, password: TestUtils.WALLET_PASSWORD, networkType: TestUtils.NETWORK_TYPE, mnemonic: TestUtils.MNEMONIC, server: TestUtils.getDaemonRpcConnection(), restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT, proxyToWorker: TestUtils.PROXY_TO_WORKER, fs: fs});
        assert.equal(await TestUtils.walletWasm.getSyncHeight(), TestUtils.FIRST_RECEIVE_HEIGHT);
        await TestUtils.walletWasm.sync(new WalletSyncPrinter());
        await TestUtils.walletWasm.save();
        await TestUtils.walletWasm.startSyncing();
      }
      
      // otherwise open existing wallet
      else {
        TestUtils.walletWasm = await monerojs.openWalletWasm({path: TestUtils.WALLET_WASM_PATH, password: TestUtils.WALLET_PASSWORD, networkType: TestUtils.NETWORK_TYPE, server: TestUtils.getDaemonRpcConnection(), proxyToWorker: TestUtils.PROXY_TO_WORKER, fs: TestUtils.getDefaultFs()});
        await TestUtils.walletWasm.sync(new WalletSyncPrinter());
        await TestUtils.walletWasm.startSyncing();
      }
    }
    
    // ensure we're testing the right wallet
    assert.equal(await TestUtils.walletWasm.getMnemonic(), TestUtils.MNEMONIC);
    assert.equal(await TestUtils.walletWasm.getPrimaryAddress(), TestUtils.ADDRESS);
    return TestUtils.walletWasm;
  }
  
  /**
   * Get a singleton keys-only wallet instance shared among tests.
   * 
   * @return {MoneroWalletKeys} a keys-only wallet instance
   */
  static async getWalletKeys() {
    if (TestUtils.walletKeys === undefined) {
      
      // create wallet from mnemonic
      TestUtils.walletKeys = await monerojs.createWalletKeys({networkType: TestUtils.NETWORK_TYPE, mnemonic: TestUtils.MNEMONIC});
    }
    return TestUtils.walletKeys;
  }
  
  static testUnsignedBigInteger(num, nonZero) {
    assert(num);
    assert(num instanceof BigInteger);
    let comparison = num.compare(new BigInteger(0));
    assert(comparison >= 0);
    if (nonZero === true) assert(comparison > 0);
    if (nonZero === false) assert(comparison === 0);
  }
  
  static async getExternalWalletAddress() {
    let wallet = await monerojs.createWalletKeys({networkType: TestUtils.NETWORK_TYPE});
    return await wallet.getPrimaryAddress();
  }
  
  static txsMergeable(tx1, tx2) {
    try {
      let copy1 = tx1.copy();
      let copy2 = tx2.copy();
      if (copy1.isConfirmed()) copy1.setBlock(tx1.getBlock().copy().setTxs([copy1]));
      if (copy2.isConfirmed()) copy2.setBlock(tx2.getBlock().copy().setTxs([copy2]));
      copy1.merge(copy2);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

// ---------------------------- STATIC TEST CONFIG ----------------------------

// TODO: export these to key/value properties file for tests

// test wallet config
TestUtils.WALLET_NAME = "test_wallet_1";
TestUtils.WALLET_PASSWORD = "supersecretpassword123";
TestUtils.TEST_WALLETS_DIR = "./test_wallets";
TestUtils.WALLET_WASM_PATH = TestUtils.TEST_WALLETS_DIR + "/" + TestUtils.WALLET_NAME;

TestUtils.MAX_FEE = new BigInteger("7500000").multiply(new BigInteger("10000"));
TestUtils.NETWORK_TYPE = MoneroNetworkType.STAGENET;

// default keypair to test
TestUtils.MNEMONIC = "niece cube almost phase zeal ultimate pyramid tapestry hickory bulb bifocals festival always wayside sphere kept upwards wagtail invoke radar pager flippant sensible stunning kept";
TestUtils.ADDRESS = "59dF9pSotECe1Fn4dBGZXWHYyNdo53rbZ7YYseu9jBKCf4c2cUzhuFVRH8HuD4wyaKTqtD3VF3F4eQe3Kzq342F5U8R4jeq";
TestUtils.FIRST_RECEIVE_HEIGHT = 437;   // NOTE: this value MUST be the height of the wallet's first tx for tests

// wallet RPC config
TestUtils.WALLET_RPC_CONFIG = {
  uri: "http://localhost:12345",
  username: "rpc_user",
  password: "abc123",
  rejectUnauthorized: true // reject self-signed certificates if true
};

// daemon RPC config
TestUtils.DAEMON_RPC_CONFIG = {
  uri: "http://localhost:37750",
  username: "super",
  password: "super",
 // rejectUnauthorized: true // reject self-signed certificates if true
};

//TestUtils.DAEMON_RPC_CONFIG = {
//uri: "http://node.xmrbackb.one:28081",
////username: "superuser",
////password: "abctesting123",
//maxRequestsPerSecond: 1
//};

const TxPoolWalletTracker = require("./TxPoolWalletTracker");
TestUtils.TX_POOL_WALLET_TRACKER = new TxPoolWalletTracker(); // used to track which wallets are in sync with pool so associated txs in the pool do not need to be waited on
TestUtils.PROXY_TO_WORKER = undefined;  // default to true if browser, false otherwise

module.exports = TestUtils;
