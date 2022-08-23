import { ethers } from "ethers";
import {
  callBundleFlashbots,
  getRawTransaction,
  sanityCheckSimulationResponse,
  sendBundleFlashbots,
  fbRequest
} from "./src/relayer.js";
import { wssProvider, wallet } from "./src/constants.js";
import { calcNextBlockBaseFee, match, stringifyBN, toRpcHexString } from "./src/utils.js";
import {
  logDebug,
  logError,
  logFatal,
  logInfo,
  logSuccess,
  logTrace,
} from "./src/logging.js";
import fetch from "node-fetch";

let first = false;

const makeBundle = async (txHash, signedTx) => {
  const strLogPrefix = `txhash=${txHash}`;

  // Bot not broken right

  const [tx] = await Promise.all([
    wssProvider.getTransaction(txHash),
    // wssProvider.getTransactionReceipt(txHash),
  ]);

  // Make sure transaction hasn't been mined
  // if (txRecp !== null) {
  //   console.log()
  //   return;
  // }




  // Sometimes tx is null for some reason
  if (tx === null) {
    //console.log('TX = null');
    return false;
  }



  // const a = { 
  //   "hash": "0x187a0cdf7fbe1ef48b221d20849e84a534f5cd9f5237746900906400ff3f6159", 
  //   "type": 2, "accessList": [], 
  //   "blockHash": null, "blockNumber": null, 
  //   "transactionIndex": null, "confirmations": 0, 
  //   "from": "0xF32644CD683E12cFE6c98cD38156f7174fef0F33", 
  //   "gasPrice": { "type": "BigNumber", "hex": "0x07406a06a2" }, 
  //   "maxPriorityFeePerGas": { "type": "BigNumber", "hex": "0x59682f00" }, 
  //   "maxFeePerGas": { "type": "BigNumber", "hex": "0x07406a06a2" }, "gasLimit": { "type": "BigNumber", "hex": "0x01f1ce" }, "to": "0xDCb1cDFe2B5f592E7Bdc2696b7A68c6e866C4Cc2", "value": { "type": "BigNumber", "hex": "0x00" }, "nonce": 51, "data": "0x0d06ed72000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000041c5c2ed9ca2897fdf70f8d0a9139322fe702fde76732d2cbe4bce543c5cf6b97969b2a4b1bfb6e9b619fde79c711d921e647dda0adba18d5a94ab1ed09fba135d1b00000000000000000000000000000000000000000000000000000000000000", "r": "0x95bccaf92f7202251e54acad0c4e1224ead5d82a0b33478589576953bcae58ff", "s": "0x17b4ce9351e7220425d162f10c8ba6e98abdef04fc98160f44dad8ede58a589f", "v": 1, "creates": null, "chainId": 1 }

  if (first) {

    // process.exit(0);
    return;

  }

  console.log(tx);
  // console.log({ txRecp });

  first = true;

  logTrace(strLogPrefix, "received");
  // console.log(tx);

  const blockNumber = await wssProvider.getBlockNumber();
  const targetBlockNumber = blockNumber + 1;

  console.log({targetBlockNumber});



  // const tx1 = {
  //   hash: '0x1a8c93081690d6a0d5531e10108c1f45ac1a2d0592ecc2c492ff13b664c16cf8',
  //   type: 2,
  //   accessList: [],
  //   blockHash: null,
  //   blockNumber: null,
  //   transactionIndex: null,
  //   confirmations: 0,
  //   from: '0xb9Bcdb364428c95d8B437812EEBDe49F28a39cDc',
  //   gasPrice: ethers.BigNumber.from('0x0612f481f1'),
  //   maxPriorityFeePerGas: ethers.BigNumber.from('0x77359400'),
  //   maxFeePerGas: ethers.BigNumber.from('0x0612f481f1'),
  //   gasLimit: ethers.BigNumber.from('0x02344b'),
  //   to: '0x00000000006c3852cbEf3e08E8dF289169EdE581',
  //   value: ethers.BigNumber.from('0x19945ca2620000'),
  //   nonce: 599,
  //   data: '0xfb0f3ee10000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000017a93c16344000000000000000000000000000ccc81d927df5f718ed96678cca8391a0eddb4f4a000000000000000000000000004c00500000ad104d7dbd00e3ae0a5c00560c000000000000000000000000003ceb6868bfbf99f6b76fe5bb37343c075677c69800000000000000000000000000000000000000000000000000000000000012d60000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000630487b400000000000000000000000000000000000000000000000000000000632d6634000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000875c88fef748630000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f00000000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f00000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000002e000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000a3b5840f40000000000000000000000000000000a26b00c1f0df003000390027140000faa7190000000000000000000000000000000000000000000000000001476b081e80000000000000000000000000006583ec53bf3dc210b05f718d75a3194d9bed08c00000000000000000000000000000000000000000000000000000000000000041bc68d1d9a7243dadcfaa21e32f3d6e1513fcf5a0e27c5aa831786aaae523a52c5540bb7f71ca58f47d8ff4c9e16947e4022a1ca9318d0d162527a30b485b62dc1c00000000000000000000000000000000000000000000000000000000000000',
  //   r: '0x8737995c52a4fe835274c4b540363f2bacef3218de376074f9ab8169cb94385a',
  //   s: '0x56678e3e1fb7270e6ed3e7505498d3cb031f877315af7d1c10ed92b58b8b97fe',
  //   v: 0,
  //   creates: null,
  //   chainId: 1
  // }
  const middleTx = getRawTransaction(tx);

  console.log('middleTx=', middleTx)
  const signedTxs = [middleTx, signedTx];

  console.log('signedTxs=', signedTxs)


  const simulatedResp = await callBundleFlashbots(signedTxs, targetBlockNumber);

  console.log("Bundle is simulated", simulatedResp);
  try {
    sanityCheckSimulationResponse(simulatedResp);
  } catch (e) {
    logError(
      strLogPrefix,
      "error while simulating",
      JSON.stringify(
        stringifyBN({
          error: e
        })
      )
    );
    return;
  }

  const bundleResp = await sendBundleFlashbots(
    [middleTx, signedTx],
    simulatedResp.stateBlockNumber + 1
  );

  console.log("Bundle is sent", bundleResp);

  

  return true;
  // logSuccess(
  //   strLogPrefix,
  //   "Bundle submitted!",
  //   JSON.stringify(
  //     block,
  //     targetBlockNumber,
  //     nextBaseFee,
  //     nonce,
  //     sandwichStates,
  //     frontsliceTx,
  //     maxPriorityFeePerGas,
  //     bundleResp
  //   )
  // );
}

const main = async () => {


  // const tx1 = {
  //   hash: '0x7d064ef620438d63fb326831142b7cdcc04d7a6ce44f17fc16d6e675e546840d',
  //   type: 0,
  //   accessList: null,
  //   blockHash: null,
  //   blockNumber: null,
  //   transactionIndex: null,
  //   confirmations: 0,
  //   from: '0x5c727c59BA52ccDC8656995768B6d6cFdc425D59',
  //   gasPrice: ethers.BigNumber.from('0x032ec17835'),
  //   gasLimit: ethers.BigNumber.from('0x5208'),
  //   to: '0x3B794929566e3Ba0f25e4263e1987828b5c87161',
  //   value: ethers.BigNumber.from('0x0326d9fa3c552c58'),
  //   nonce: 27,
  //   data: '0x',
  //   r: '0x9c005c8db491afbdfa06e96a757a9025e090098928ab3e9234f003d44c8afd03',
  //   s: '0x3daf6c2035a5fde87b865e9185ae4d0bc34220f21df5c5a69cb7a5b709b31e7d',
  //   v: 38,
  //   creates: null,
  //   chainId: 1
  // }
  // const middleTx = getRawTransaction(tx1);

  // console.log('middleTx=', middleTx)

  

  const origLog = console.log;
  console.log = function (obj, ...placeholders) {
    if (typeof obj === "string")
      placeholders.unshift("[" + new Date().toISOString() + "] " + obj);
    else {
      // This handles console.log( object )
      placeholders.unshift(obj);
      placeholders.unshift("[" + new Date().toISOString() + "] %j");
    }
    origLog.apply(this, placeholders);
  };

  const nonce = await wssProvider.getTransactionCount(wallet.address);
  console.log("nonce", nonce);

  let ABI = ["function approve(address _spender, uint256 _value)"];
  let iface = new ethers.utils.Interface(ABI);
  let payload = iface.encodeFunctionData("approve", ["0x7d9315473f43eba998B835728B7b3E1D6B4fF6C2", "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"]);

  // const targetTx = {
  //   to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  //   //from: "0x7d9315473f43eba998B835728B7b3E1D6B4fF6C2",
  //   from: "0x51cc8d6dBd8877589a1C0Bcba5a2E5C05DA4a707",
  //   data: payload,
  //   chainId: 1,
  //   maxPriorityFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
  //   maxFeePerGas: ethers.utils.parseUnits('150', 'gwei'),
  //   gasLimit: 250000,
  //   nonce,
  //   type: 2
  // };

  const targetTx = {
    from: '0x51cc8d6dBd8877589a1C0Bcba5a2E5C05DA4a707',
    to: '0x51cc8d6dBd8877589a1C0Bcba5a2E5C05DA4a707',
    type: 2,
    maxPriorityFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
    maxFeePerGas: ethers.utils.parseUnits('150', 'gwei'),
    gasLimit: 21000,
    data: '0x',
    nonce,
    chainId: 1
  }
  const signedTargetTx = await wallet.signTransaction(targetTx);

  wssProvider.on("pending", async (txHash) => {
    await makeBundle(txHash, signedTargetTx);
    //process.exit(0);
  });
}

main();
