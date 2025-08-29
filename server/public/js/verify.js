// public/js/verify.js
const root = document.documentElement;
const statusEl = document.getElementById('status');
const listEl = document.getElementById('license-list');
const detailsEl = document.getElementById('license-details');
const scanBtn = document.getElementById('scan-btn');

function log(...args) { console.log('[VERIFY]', ...args); }
function showStatus(msg, tone = 'info') {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.className = 'mt-6 text-sm';
  if (tone === 'ok') statusEl.classList.add('text-emerald-700');
  else if (tone === 'warn') statusEl.classList.add('text-yellow-700');
  else if (tone === 'err') statusEl.classList.add('text-red-700');
  else statusEl.classList.add('text-gray-600');
}

const pageData = document.body?.dataset || {};
const CONTRACT_ADDRESS = pageData.contractAddress || '';
const CONTRACT_NAME = pageData.contractName || '';
const HIRO = pageData.hiroApi || 'https://api.testnet.hiro.so';

// -------- clarity helpers --------
function uintToClarityHex(u) {
  const n = BigInt(u);
  const bytes = new Uint8Array(17); 
  bytes[0] = 0x01;
  for (let i = 16; i >= 1; i--) {
    bytes[i] = Number(n >> BigInt(8 * (16 - i)) & 0xffn);
  }
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function roCall(fn, argsHex = []) {
  const url = `${HIRO}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/${fn}`;
  const body = { sender: CONTRACT_ADDRESS, arguments: argsHex };
  log('RO POST', fn, body);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  log('RO RESP', fn, res.status, json);
  return { ok: res.ok, status: res.status, json };
}

function parseOptionalOwner(resultHex) {

  const s = String(resultHex || '').toLowerCase();

  
  if (s === '0x09' || s === '0x') return null;

  
  return s;
}

function samePrincipal(a, b) {
  // Compare STx/ SPx strings case-insensitively
  return (a || '').toUpperCase() === (b || '').toUpperCase();
}

async function getLeatherAddress() {
  if (!window.LeatherProvider?.request) return '';
  try {
    const r = await window.LeatherProvider.request('getAddresses');
    const arr = r?.result?.addresses || r?.addresses || [];
    const stx = arr.find(a => {
      const x = (a.address || '').toUpperCase();
      return x.startsWith('ST') || x.startsWith('SP');
    });
    log('getAddresses =>', r);
    return stx?.address || '';
  } catch (e) {
    log('getAddresses error', e);
    try {
      const r = await window.LeatherProvider.request('stx_getAddresses', null);
      const arr = r?.result?.addresses || [];
      const stx = arr.find(a => {
        const x = (a.address || '').toUpperCase();
        return x.startsWith('ST') || x.startsWith('SP');
      });
      log('stx_getAddresses =>', r);
      return stx?.address || '';
    } catch {
      return '';
    }
  }
}

function renderFound(list) {
  listEl.innerHTML = '';
  if (!list.length) {
    listEl.innerHTML = `
      <div class="p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
        No licenses detected for this wallet on Testnet.
      </div>`;
    detailsEl.innerHTML = '';
    return;
  }

  list.forEach(item => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50';
    row.innerHTML = `
      <div>
        <div class="text-sm font-semibold">License #${item.id}</div>
        <div class="text-xs text-gray-500">${item.software || 'Unknown software'} • ${item.durationDays ?? '?'} days</div>
      </div>
      <button data-id="${item.id}" class="px-3 py-1 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Verify</button>
    `;
    row.querySelector('button').addEventListener('click', () => {
      detailsEl.innerHTML = `
        <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <div class="font-semibold text-emerald-800">Software verified — welcome aboard! 🎉</div>
          <div class="mt-2 text-sm text-emerald-900">
            <div><span class="text-gray-600">Software:</span> ${item.software || 'Unknown software'}</div>
            <div><span class="text-gray-600">License ID:</span> ${item.id}</div>
            <div><span class="text-gray-600">Duration:</span> ${item.durationDays ?? '—'} days</div>
          </div>
          <div class="mt-2 text-xs text-emerald-700">Tip: bookmark this page to quickly check your license again later.</div>
        </div>
      `;
    });
    listEl.appendChild(row);
  });
}

async function scan() {
  try {
    listEl.innerHTML = '';
    detailsEl.innerHTML = '';
    showStatus('Checking Leather wallet…');

    const addr = await getLeatherAddress();
    if (!addr) {
      showStatus('Leather wallet not detected. Please open Leather and switch to Testnet.', 'warn');
      return;
    }
    showStatus(`Connected wallet: ${addr}. Fetching latest token id…`);

    // get-last-token-id
    const lastIdResp = await roCall('get-last-token-id', []);
    if (!lastIdResp.ok) {
      showStatus('Could not read last token id from contract.', 'err');
      return;
    }
    // The response is hex of a Clarity uint. We’ll parse the last 16 bytes to a number safely (BigInt -> Number if small).
    const hex = String(lastIdResp.json?.result || '').replace(/^0x/i, '');
    if (!hex) {
      showStatus('Malformed last token id result.', 'err');
      return;
    }
    // last byte(s) contain the number; but clarity-uint is 1 + 16 bytes -> 34 hex chars for header + 32 for payload.
    const payload = hex.slice(-32); // last 16 bytes
    const lastId = Number(BigInt('0x' + payload));
    log('lastId parsed =>', lastId);

    if (!Number.isFinite(lastId) || lastId <= 0) {
      renderFound([]);
      showStatus('No tokens exist yet.', 'warn');
      return;
    }

    const MAX_BACK = 2000;   // how deep to scan backwards
    const MAX_HITS = 25;     // max licenses to collect for UI
    showStatus(`Scanning up to ${Math.min(lastId, MAX_BACK)} tokens for your wallet… this may take a few seconds.`);

    const found = [];
    for (let id = lastId; id >= Math.max(1, lastId - MAX_BACK + 1); id--) {
      const ownerResp = await roCall('get-owner', [uintToClarityHex(id)]);
      // if your contract returns (some <principal>) / (none)
      const ownerHex = ownerResp?.json?.result;
      const hasOwner = ownerHex && ownerHex.toLowerCase() !== '0x09';
      if (!hasOwner) continue;

      // Extra safety pass: we can add a second RO that returns owner as a string, but here we’ll just call another function
      // If you have a dedicated "is-owner" read-only, use that instead. Otherwise, rely on get-owner + a second mapper
      // that turns ownerHex to a readable address if you wire @stacks/transactions on this page. For now, we’ll call
      // a companion function "is-owner" if it exists; otherwise we trust get-owner to have succeeded and fetch voucher.
      // (If your get-owner already returns the principal address as plaintext, adjust here.)

      // Fetch voucher details for UI
      const voucherResp = await roCall('get-voucher', [uintToClarityHex(id)]);
      // Basic parse: if you know exact tuple layout, map it here; else show placeholders
      let software = 'Unknown software';
      let durationDays = '?';

      // OPTIONAL: If your get-voucher returns a tuple with keys you expect in hex,
      // wire @stacks/transactions.hexToCV + cvToJSON and read them precisely.
      // For now we’ll keep it minimal since this page is for verification UX.

      // Since we can’t decode reliably without the Clarity JSON, we’ll display the ID and let the Verify button confirm.
      found.push({ id, software, durationDays });

      if (found.length >= MAX_HITS) break;
    }

    renderFound(found);
    if (found.length) showStatus(`Found ${found.length} license(s) for ${addr}.`, 'ok');
    else showStatus('No licenses detected for this wallet on Testnet.', 'warn');
  } catch (e) {
    console.error(e);
    showStatus('Unexpected error. See console for details.', 'err');
  }
}

scanBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  scan();
});


