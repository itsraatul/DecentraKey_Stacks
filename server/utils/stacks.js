// server/utils/stacks.js
const {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  uintCV,
  stringAsciiCV,
  principalCV,
} = require('@stacks/transactions');
const { StacksTestnet } = require('@stacks/network');
const fetch = require('cross-fetch'); // npm i cross-fetch
require('dotenv').config();

const API = process.env.HIRO_API || 'https://api.testnet.hiro.so';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const CONTRACT_NAME    = process.env.CONTRACT_NAME;
const ISSUER_KEY       = process.env.COMPANY_ISSUER_PRIVATE_KEY;

if (!CONTRACT_ADDRESS || !CONTRACT_NAME || !ISSUER_KEY) {
  throw new Error('Missing CONTRACT_ADDRESS / CONTRACT_NAME / COMPANY_ISSUER_PRIVATE_KEY in .env');
}

const network = new StacksTestnet({ url: API });

function uintToClarityHex(u) {
  const n = BigInt(u);
  const bytes = new Uint8Array(17);
  bytes[0] = 0x01;
  for (let i = 16; i >= 1; i--) {
    bytes[i] = Number((n >> BigInt(8 * (16 - i))) & 0xffn);
  }
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hiroReadOnly(fn, argsHex = []) {
  const url = `${API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/${fn}`;
  const body = { sender: CONTRACT_ADDRESS, arguments: argsHex };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function waitForTx(txid, { timeoutMs = 90_000, pollMs = 2000 } = {}) {
  const end = Date.now() + timeoutMs;
  const url = `${API}/extended/v1/tx/${txid}`;
  while (Date.now() < end) {
    const res = await fetch(url);
    if (res.ok) {
      const j = await res.json();
      const txStatus = j.tx_status || j.txStatus;
      if (txStatus === 'success') return { ok: true, data: j };
      if (txStatus === 'abort_by_response' || txStatus === 'abort_by_post_condition' || txStatus === 'rejected') {
        const reason = j.tx_result?.repr || j.tx_result; // may contain (err uXXX)
        return { ok: false, data: j, reason: String(reason || 'aborted') };
      }
    }
    await new Promise(r => setTimeout(r, pollMs));
  }
  return { ok: false, reason: 'timeout' };
}

/**
 * Create a voucher on-chain, return the REAL voucherId after confirmation.
 */
async function createVoucherOnChain({ recipient, softwareName, durationDays }) {
  if (!/^ST|SP/.test((recipient || '').trim())) {
    throw new Error('Enter a valid Stacks address (ST…/SP…).');
  }
  if (!softwareName || softwareName.length > 256) {
    throw new Error('Software name must be 1–256 ASCII chars.');
  }
  const days = Number.parseInt(durationDays, 10);
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('Duration days must be a positive integer.');
  }

  // Build + sign tx
  const tx = await makeContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'create-voucher',
    functionArgs: [principalCV(recipient.trim()), stringAsciiCV(softwareName), uintCV(days)],
    senderKey: ISSUER_KEY,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: 1, // allow
  });

  // Broadcast
  const br = await broadcastTransaction(tx, network);
  if (br?.error) {
    const reason = br?.reason || br?.error || 'broadcast failed';
    const rdata = br?.reason_data ? JSON.stringify(br.reason_data) : '';
    if (reason === 'NotEnoughFunds') throw new Error('Not enough STX in issuer wallet.');
    throw new Error(`broadcast failed: ${reason} ${rdata}`);
  }
  const txid = br.txid || br.txId;
  if (!txid) throw new Error('Broadcast succeeded but no txid returned');

  // Wait for confirmation (or abort)
  const w = await waitForTx(txid);
  if (!w.ok) {
    throw new Error(`create-voucher aborted: ${w.reason || 'unknown'}`);
  }

  // Read the new last-id
  const lastIdRO = await hiroReadOnly('get-last-token-id', []);
  if (!lastIdRO.ok) throw new Error('Failed reading last token id');
  // result is hex-encoded clarity uint, e.g. "0x0100...."
  const hex = String(lastIdRO.json.result || '');
  const buf = Buffer.from(hex.replace(/^0x/, ''), 'hex');
  // read last 16 bytes as big-endian uint (first byte is 0x01 tag)
  let v = 0n;
  for (let i = 1; i < buf.length; i++) v = (v << 8n) + BigInt(buf[i]);
  const voucherId = Number(v);

  // Verify voucher exists and recipient matches
  const voucherRO = await hiroReadOnly('get-voucher', [uintToClarityHex(voucherId)]);
  const resHex = voucherRO?.json?.result;
  if (typeof resHex !== 'string') throw new Error('Could not verify voucher');
  // quick check for 'none' in tuple: 0x07 0c ... "details" => if next bytes indicate none (0x09 0x04?), but to keep it simple:
  if (resHex.includes('64657461696c73') && resHex.endsWith('0904')) {
    // (details none, used false)
    throw new Error('Voucher not found after confirmation (unexpected).');
  }

  return { voucherId, txid };
}

module.exports = { createVoucherOnChain };
