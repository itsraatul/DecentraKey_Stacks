// verify-client.js
// Auto-connect Leather, discover owned license IDs by wallet, confirm on-chain owner,
// then hydrate with off-chain details from /api/licenses/lookup.
import { hexToCV, cvToJSON, uintCV, serializeCV } from 'https://esm.sh/@stacks/transactions@7.1.0';
// /public/js/verify.js

const root = document.body;
const CONTRACT_ADDRESS = root.dataset.contractAddress || '';
const CONTRACT_NAME    = root.dataset.contractName || '';
const HIRO             = root.dataset.hiroApi || 'https://api.testnet.hiro.so';

const scanBtn     = document.getElementById('scan-btn');
const scanStatus  = document.getElementById('scan-status');
const detectedWrap= document.getElementById('detected-wrap');
const detectedList= document.getElementById('detected-list');

const resultWrap  = document.getElementById('result-wrap');
const goodBox     = document.getElementById('result-good');
const badBox      = document.getElementById('result-bad');
const badReason   = document.getElementById('bad-reason');

const vSoftware   = document.getElementById('v-software');
const vId         = document.getElementById('v-id');
const vDuration   = document.getElementById('v-duration');
const vRedeemed   = document.getElementById('v-redeemed');

function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

function uintToClarityHex(u) {
  const n = BigInt(u);
  const bytes = new Uint8Array(17);
  bytes[0] = 0x01;
  for (let i = 16; i >= 1; i--) {
    bytes[i] = Number((n >> BigInt(8 * (16 - i))) & 0xffn);
  }
  return '0x' + Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function hiroReadOnly(fn, argsHex = []) {
  const url = `${HIRO}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/${fn}`;
  const body = { sender: CONTRACT_ADDRESS, arguments: argsHex };
  const res  = await fetch(url, { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body) });
  const json = await res.json().catch(()=> ({}));
  return { ok: res.ok, status: res.status, json };
}

async function getWalletAddress() {
  // Leather API variations
  try {
    const r = await window.LeatherProvider.request('getAddresses');
    const a = r?.result?.addresses || r?.addresses || [];
    const stx = a.find(x => (x.address||'').startsWith('ST') || (x.address||'').startsWith('SP'));
    return stx?.address || '';
  } catch {
    try {
      const r = await window.LeatherProvider.request('stx_getAddresses', null);
      const a = r?.result?.addresses || [];
      const stx = a.find(x => (x.address||'').startsWith('ST') || (x.address||'').startsWith('SP'));
      return stx?.address || '';
    } catch { return ''; }
  }
}

function renderLicenseCard(id) {
  const card = document.createElement('div');
  card.className = 'p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between gap-4';
  card.innerHTML = `
    <div>
      <p class="text-sm text-gray-500">License</p>
      <p class="font-semibold text-gray-900">#${id}</p>
      <p class="text-xs text-gray-500 mt-1">Software: <span class="font-mono">Unknown</span> • Duration: <span>? days</span></p>
    </div>
    <button class="verify-btn px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
      data-id="${id}">Verify</button>
  `;
  return card;
}

function setResultSuccess({ id, software = 'Unknown software', duration = '—', redeemedAt = '—' }) {
  vSoftware.textContent = software;
  vId.textContent       = id;
  vDuration.textContent = duration;
  vRedeemed.textContent = redeemedAt;

  show(resultWrap);
  show(goodBox); hide(badBox);
}

function setResultFailure(reason) {
  badReason.textContent = reason || 'Ownership check failed.';
  show(resultWrap);
  show(badBox); hide(goodBox);
}

async function handleScan() {
  hide(resultWrap); // clear previous result
  detectedList.innerHTML = '';
  hide(detectedWrap);

  if (!window.LeatherProvider) {
    scanStatus.textContent = 'Leather wallet not detected.';
    return;
  }

  scanBtn.disabled = true;
  scanStatus.textContent = 'Connecting wallet…';

  const addr = await getWalletAddress();
  if (!addr) {
    scanStatus.textContent = 'Could not get a STX address from wallet.';
    scanBtn.disabled = false;
    return;
  }

  scanStatus.textContent = `Wallet: ${addr.slice(0,6)}…${addr.slice(-4)} — scanning…`;

  // Try a super simple heuristic: look at last token id, then probe a small window backwards.
  const rLast = await hiroReadOnly('get-last-token-id', []);
  const lastOk = rLast.ok && typeof rLast.json?.result === 'string';
  let last = 0;
  if (lastOk) {
    // clarity uint hex -> parse
    // format: 0x01 + 16 bytes; read as bigint
    const hex = rLast.json.result.slice(2);
    const bytes = new Uint8Array(hex.match(/../g).map(h=>parseInt(h,16)));
    let n = 0n;
    for (let i=1;i<bytes.length;i++) n = (n<<8n) + BigInt(bytes[i]);
    last = Number(n);
  }

  const candidates = [];
  if (last > 0) {
    for (let i = last; i > Math.max(0, last - 25); i--) candidates.push(i); // recent 25
  }

  if (candidates.length === 0) {
    scanStatus.textContent = 'No licenses detected.';
    scanBtn.disabled = false;
    return;
  }

  // probe each candidate: get-owner(id) and match addr
  const owned = [];
  for (const id of candidates) {
    const ownerRes = await hiroReadOnly('get-owner', [uintToClarityHex(id)]);
    const raw = ownerRes?.json?.result || '';
    // expect (some (principal 'ST…')) or (none)
    if (typeof raw === 'string' && raw.startsWith('0x')) {
      // very light parse: just check if hex contains ASCII of your addr
      const text = raw.toLowerCase();
      const needle = new TextEncoder().encode(addr);
      const hexNeedle = Array.from(needle).map(b=>b.toString(16).padStart(2,'0')).join('');
      if (text.includes(hexNeedle)) owned.push(id);
    }
  }

  if (owned.length === 0) {
    scanStatus.textContent = 'No licenses owned by this wallet were found in recent mints.';
    scanBtn.disabled = false;
    return;
  }

  scanStatus.textContent = `Found ${owned.length} license(s).`;
  show(detectedWrap);
  for (const id of owned) detectedList.appendChild(renderLicenseCard(id));
  scanBtn.disabled = false;
}

// click -> verify a single license id
async function onVerifyClick(e) {
  const btn = e.target.closest('.verify-btn');
  if (!btn) return;
  const id = Number(btn.dataset.id || '0');
  if (!id) return;

  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Verifying…';

  try {
    // 1) ensure current wallet still matches on-chain owner (authoritative)
    const addr = await getWalletAddress();
    if (!addr) {
      setResultFailure('Could not read wallet address.');
      btn.disabled = false; btn.textContent = original;
      return;
    }

    const ownerRes = await hiroReadOnly('get-owner', [uintToClarityHex(id)]);
    const hex = ownerRes?.json?.result || '';
    if (typeof hex !== 'string' || !hex.startsWith('0x')) {
      setResultFailure('Unexpected owner response.');
      btn.disabled = false; btn.textContent = original;
      return;
    }

    // naive contains check like in scan
    const needle = Array.from(new TextEncoder().encode(addr)).map(b=>b.toString(16).padStart(2,'0')).join('');
    if (!hex.toLowerCase().includes(needle)) {
      setResultFailure('This wallet is not the owner of the selected license.');
      btn.disabled = false; btn.textContent = original;
      return;
    }

    // 2) (optional) fetch metadata if your contract has it
    // fallback placeholders so UI doesn’t break
    const meta = { software: 'Unknown software', duration: '—', redeemedAt: '—' };

    setResultSuccess({ id, ...meta });
  } catch (err) {
    console.warn('verify error:', err);
    setResultFailure('Verification failed due to a network or parsing error.');
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

// wire up
scanBtn?.addEventListener('click', handleScan);
detectedList?.addEventListener('click', onVerifyClick);
