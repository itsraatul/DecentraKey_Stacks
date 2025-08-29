const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { makeContractDeploy, broadcastTransaction } = require('@stacks/transactions');
const stacksNetwork = require('@stacks/network');

// Create a Testnet network object regardless of library version
function makeTestnet() {
  const n = stacksNetwork;
  // Prefer constant if present
  if (n.STACKS_TESTNET) return n.STACKS_TESTNET;
  // If a class/ctor is present
  if (typeof n.StacksTestnet === 'function') {
    try { return new n.StacksTestnet(); } catch (_) {}
    try { return n.StacksTestnet(); } catch (_) {}
  }
  // Fallback: older name or default
  if (typeof n.StacksNetwork === 'function') {
    try { return new n.StacksNetwork({ url: 'https://api.testnet.hiro.so' }); } catch (_) {}
  }
  // Last resort minimal object
  return { coreApiUrl: 'https://api.testnet.hiro.so' };
}

(async () => {
  const ownerKey    = process.env.CONTRACT_OWNER_PRIVATE_KEY;
  const contractName = process.env.CONTRACT_NAME || 'decentrakey_vdemo';
  if (!ownerKey) throw new Error('Missing CONTRACT_OWNER_PRIVATE_KEY in server/.env');

  const codeBody = fs.readFileSync(
    path.join(__dirname, '..', '..', 'contracts', 'decentrakey-contract.clar'),
    'utf8'
  );

  const network = makeTestnet();

  console.log(`Deploying "${contractName}" to Testnet…`);
  const tx = await makeContractDeploy({
    contractName,
    codeBody,
    senderKey: ownerKey,
    network,
    validateWithAbi: false,
  });

  const res = await broadcastTransaction(tx, network);
  if (res && res.error) {
    console.error('Broadcast error:', res);
    throw new Error(JSON.stringify(res, null, 2));
  }
  const txid = typeof res === 'string' ? res : res.txid;
  console.log('✅ Deploy broadcasted. TXID:', txid);
  console.log('🔗 Explorer:', `https://explorer.stacks.co/txid/${txid}?chain=testnet`);
})().catch(err => {
  console.error('❌ Deploy failed:', err?.message || err);
  process.exit(1);
});
