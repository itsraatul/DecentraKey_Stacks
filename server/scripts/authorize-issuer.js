const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { makeContractCall, broadcastTransaction, principalCV, AnchorMode } = require('@stacks/transactions');
const stacksNetwork = require('@stacks/network');

function makeTestnet() {
  const n = stacksNetwork;
  if (n.STACKS_TESTNET) return n.STACKS_TESTNET;
  if (typeof n.StacksTestnet === 'function') {
    try { return new n.StacksTestnet(); } catch (_) {}
    try { return n.StacksTestnet(); } catch (_) {}
  }
  if (typeof n.StacksNetwork === 'function') {
    try { return new n.StacksNetwork({ url: 'https://api.testnet.hiro.so' }); } catch (_) {}
  }
  return { coreApiUrl: 'https://api.testnet.hiro.so' };
}

(async () => {
  const ownerKey      = process.env.CONTRACT_OWNER_PRIVATE_KEY;
  const contractAddr  = process.env.CONTRACT_ADDRESS;
  const contractName  = process.env.CONTRACT_NAME;
  const issuer        = process.argv[2];

  if (!ownerKey || !contractAddr || !contractName) {
    throw new Error('Missing CONTRACT_OWNER_PRIVATE_KEY / CONTRACT_ADDRESS / CONTRACT_NAME in server/.env');
  }
  if (!issuer) throw new Error('Usage: node server/scripts/authorize-issuer.js STX_ISSUER_ADDRESS');

  const network = makeTestnet();

  const tx = await makeContractCall({
    contractAddress: contractAddr,
    contractName,
    functionName: 'add-authorized-issuer',
    functionArgs: [principalCV(issuer)],
    senderKey: ownerKey,
    network,
    anchorMode: AnchorMode.Any,
    validateWithAbi: false,
  });

  const res = await broadcastTransaction(tx, network);
  if (res && res.error) {
    console.error('Broadcast error:', res);
    throw new Error(JSON.stringify(res, null, 2));
  }
  const txid = typeof res === 'string' ? res : res.txid;
  console.log(' Authorized issuer. TXID:', txid);
  console.log(' Explorer:', `https://explorer.stacks.co/txid/${txid}?chain=testnet`);
})().catch(err => {
  console.error(' Authorize failed:', err?.message || err);
  process.exit(1);
});
