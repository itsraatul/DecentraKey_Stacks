// verify-client.js
// Connect Leather → list owned license IDs → only verify when user clicks.
// On verify: open a popup with success info (fallback to inline panel if popups blocked).

const body = document.body;
const CONTRACT_ADDRESS = body.dataset.contractAddress;
const CONTRACT_NAME    = body.dataset.contractName;
const HIRO             = body.dataset.hiroApi || 'https://api.testnet.hiro.so';

const btnConnect = document.getElementById('connect');
const addrEl     = document.getElementById('connected-addr');
const statusEl   = document.getElementById('status');

const scanBox  = document.getElementById('scan-box');
const scanNote = document.getElementById('scan-note');
const listEl   = document.getElementById('licenses');
const noneEl   = document.getElementById('none');

// Inline success panel (used if popup blocked)
const successBox = document.getElementById('success');
const sName      = document.getElementById('s-name');
const sId        = document.getElementById('s-id');
const sDays      = document.getElementById('s-days');
const sRedeemed  = document.getElementById('s-redeemed');

function msg(type, text) {
  statusEl.className = 'p-3 rounded text-sm';
  const map = {
    ok:   ['bg-green-100','text-green-800','border','border-green-200'],
    warn: ['bg-yellow-100','text-yellow-800','border','border-yellow-200'],
    err:  ['bg-red-100','text-red-800','border','border-red-200'],
    info: ['bg-blue-100','text-blue-800','border','border-blue-200'],
  };
  statusEl.classList.add(...(map[type] || map.info));
  statusEl.textContent = text;
  statusEl.classList.remove('hidden');
}
function hideMsg(){ statusEl.classList.add('hidden'); }

// -------- Chain helpers --------
function assetIdent() {
  return `${CONTRACT_ADDRESS}.${CONTRACT_NAME}::decentrakey-license`;
}
async function listHoldingsFor(addr) {
  const url = `${HIRO}/extended/v1/tokens/nft/holdings?principal=${addr}`
            + `&asset_identifiers=${encodeURIComponent(assetIdent())}&limit=50`;
  const res = await fetch(url);
  const json = await res.json().catch(()=> ({}));
  const items = Array.isArray(json?.results) ? json.results : [];
  const ids = [];
  for (const it of items) {
    const hex = it?.value?.hex; // 0x01 + 16B uint
    if (!hex || !hex.startsWith('0x01') || hex.length < 2 + 2 + 32) continue;
    const uintBe = hex.slice(-32); // last 16 bytes
    ids.push(Number(BigInt('0x' + uintBe)));
  }
  return [...new Set(ids)].sort((a,b)=>b-a);
}

// -------- UI render --------
function addRow({ id, softwareName, durationDays, redeemedAt }) {
  const row = document.createElement('div');
  row.className = 'flex items-center justify-between bg-gray-50 rounded p-3';

  const left = document.createElement('div');
  left.innerHTML = `
    <div class="text-sm font-semibold text-gray-900">License #${id}</div>
    <div class="text-xs text-gray-600">${softwareName || 'Unknown software'} • ${durationDays ?? '?'} days</div>
    ${redeemedAt ? `<div class="text-xs text-gray-500">Redeemed: ${new Date(redeemedAt).toLocaleString()}</div>` : ''}
  `;

  const btn = document.createElement('button');
  btn.textContent = 'Verify';
  btn.className = 'px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700';
  btn.onclick = () => showSuccessPopup({ id, softwareName, durationDays, redeemedAt });

  row.appendChild(left);
  row.appendChild(btn);
  listEl.appendChild(row);
}

function showSuccessInline({ id, softwareName, durationDays, redeemedAt }) {
  sName.textContent     = softwareName || 'Unknown software';
  sId.textContent       = String(id);
  sDays.textContent     = (durationDays != null ? `${durationDays} days` : '—');
  sRedeemed.textContent = redeemedAt ? new Date(redeemedAt).toLocaleString() : '—';
  successBox.classList.remove('hidden');
  window.scrollTo({ top: successBox.offsetTop - 20, behavior: 'smooth' });
}

function showSuccessPopup(details) {
  // Try a popup window first
  const w = window.open('', 'decentrakey-verify', 'width=520,height=640');
  const html = `
    <!doctype html><html><head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>License verified</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: Inter, system-ui, sans-serif; margin:0; background:#0f172a; color:#e2e8f0; }
        .card { max-width: 560px; margin: 32px auto; padding: 24px; background:#0b1220;
                border:1px solid #1e293b; border-radius:16px; }
        .ok { display:flex; align-items:center; gap:10px; color:#34d399; font-weight:800; font-size:18px; }
        dl { display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:16px; }
        dt { color:#94a3b8; font-size:12px; }
        dd { color:#e2e8f0; font-weight:600; font-size:14px; }
        .foot { margin-top:16px; font-size:11px; color:#94a3b8; }
        .badge {background:#052e1e;color:#34d399;border:1px solid #0e4a2e;padding:2px 8px;border-radius:999px;font-size:11px;}
      </style>
    </head><body>
      <div class="card">
        <div class="ok">✔ Software verified — welcome aboard! <span class="badge">Stacks Testnet</span></div>
        <dl>
          <div><dt>Software</dt><dd>${(details.softwareName || 'Unknown software')}</dd></div>
          <div><dt>License ID</dt><dd>${String(details.id)}</dd></div>
          <div><dt>Duration</dt><dd>${details.durationDays != null ? `${details.durationDays} days` : '—'}</dd></div>
          <div><dt>Redeemed at</dt><dd>${details.redeemedAt ? new Date(details.redeemedAt).toLocaleString() : '—'}</dd></div>
        </dl>
        <div class="foot">Tip: Keep this window as proof, or take a screenshot for your records.</div>
      </div>
    </body></html>
  `;

  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
  } else {
    // Popup blocked → show inline
    showSuccessInline(details);
  }
}

// -------- Data hydrate from your backend (optional) --------
async function fetchMetadata(id) {
  try {
    const r = await fetch(`/api/licenses/lookup?id=${encodeURIComponent(id)}`);
    if (!r.ok) return {};
    return await r.json();
  } catch { return {}; }
}

// -------- Flow --------
async function discoverFor(addr) {
  hideMsg();
  successBox.classList.add('hidden'); // hide any previous success
  scanBox.classList.remove('hidden');
  listEl.innerHTML = '';
  noneEl.classList.add('hidden');
  scanNote.textContent = 'Looking up your NFT holdings…';

  const ids = await listHoldingsFor(addr);

  if (!ids.length) {
    noneEl.classList.remove('hidden');
    scanNote.textContent = 'No licenses found.';
    msg('warn', 'No licenses detected for this wallet.');
    return;
  }

  scanNote.textContent = `Found ${ids.length} license${ids.length>1?'s':''}. Loading details…`;
  for (const id of ids) {
    const meta = await fetchMetadata(id); // optional enrichment
    addRow({
      id,
      softwareName: meta.softwareName,
      durationDays: meta.licenseDurationDays,
      redeemedAt:   meta.redeemedAt
    });
  }
  msg('ok', 'Licenses listed. Click “Verify” on one to confirm.');
}

async function connect() {
  if (!window.LeatherProvider) {
    msg('warn','Leather wallet not detected. Please install/enable it and reload.');
    return;
  }
  try {
    msg('info', 'Connecting wallet…');
    const res = await window.LeatherProvider.request('getAddresses');
    const arr = res?.result?.addresses || res?.addresses || [];
    const stx = arr.find(a => (a.address||'').startsWith('ST') || (a.address||'').startsWith('SP'));
    if (!stx?.address) throw new Error('No STX address in wallet');
    addrEl.textContent = `Connected: ${stx.address}`;
    msg('ok', 'Wallet connected. Scanning…');
    await discoverFor(stx.address);
  } catch (e) {
    console.error(e);
    msg('err','Could not connect to Leather.');
  }
}

// Hook up button; no auto-connect, no auto-verify
btnConnect?.addEventListener('click', (e) => {
  e.preventDefault();
  connect();
});
