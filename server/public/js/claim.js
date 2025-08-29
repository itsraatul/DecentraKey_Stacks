// /server/public/js/claim.js
import { uintCV, cvToHex, hexToCV, cvToJSON } from 'https://esm.sh/@stacks/transactions@7.1.0'; //only this libraty works properly for 

const btn       = document.getElementById('claim-button');
const statusEl  = document.getElementById('status-message');
const helpEl    = document.getElementById('popup-help');
const el        = document.getElementById('license-data');

function log(...a){ console.log('[CLAIM]', ...a); }
function warn(...a){ console.warn('[CLAIM]', ...a); }
function err(...a){ console.error('[CLAIM]', ...a); }

function show(kind, msg){
  if (!statusEl) { alert(msg); return; }
  statusEl.className = 'p-3 rounded text-sm';
  if (kind === 'ok')   statusEl.classList.add('bg-green-100','text-green-700');
  if (kind === 'warn') statusEl.classList.add('bg-yellow-100','text-yellow-700');
  if (kind === 'err')  statusEl.classList.add('bg-red-100','text-red-700');
  statusEl.textContent = msg;
}

if (!el) {
  err('Missing #license-data!');
} else {
  log('boot: found #license-data:', el.dataset);
}

const voucherId       = parseInt(el?.dataset.voucherId || '', 10);
const contractAddress = el?.dataset.contractAddress || '';
const contractName    = el?.dataset.contractName || '';
const intended        = (el?.dataset.intendedAddress || '').trim();
const claimToken      = el?.dataset.claimToken || '';

const HIRO = 'https://api.testnet.hiro.so';

function clarityUintHex(n){
  const id = BigInt(n);
  const bytes = new Uint8Array(17);
  bytes[0] = 0x01;
  for (let i = 16; i >= 1; i--) {
    bytes[i] = Number(id >> (8n * BigInt(16 - i)) & 0xffn);
  }
  return '0x' + Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function ro(fn, argsHex = []) {
  const url = `${HIRO}/v2/contracts/call-read/${contractAddress}/${contractName}/${fn}`;
  const body = { sender: contractAddress, arguments: argsHex };
  log('RO POST', fn, body);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type':'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(()=> ({}));
  log('RO RESP', fn, res.status, json);
  return { ok: res.ok, status: res.status, json };
}

async function getWalletAddress(){
  try {
    const r = await window.LeatherProvider.request('getAddresses');
    log('getAddresses:', r);
    const arr = r?.result?.addresses || r?.addresses || [];
    const stx = arr.find(a => (a.address||'').startsWith('ST') || (a.address||'').startsWith('SP'));
    return stx?.address || '';
  } catch(e1){
    warn('getAddresses failed, trying stx_getAddresses:', e1);
    try {
      const r = await window.LeatherProvider.request('stx_getAddresses', null);
      log('stx_getAddresses:', r);
      const arr = r?.result?.addresses || [];
      const stx = arr.find(a => (a.address||'').startsWith('ST') || (a.address||'').startsWith('SP'));
      return stx?.address || '';
    } catch(e2){
      err('stx_getAddresses failed:', e2);
      return '';
    }
  }
}

async function markClaimed(txid){
  try {
    const resp = await fetch('/api/licenses/mark-claimed', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ claimToken, txid }),
    });
    log('mark-claimed status', resp.status);
  } catch(e) {
    warn('mark-claimed failed (non-fatal):', e);
  }
}

function preflight(){
  log('preflight:', { voucherId, contractAddress, contractName, intended, claimToken });
  if (!window.LeatherProvider) { show('warn','Leather wallet not detected. Open/enable it and refresh.'); return false; }
  if (!Number.isInteger(voucherId) || voucherId <= 0) { show('err', `Bad voucher id: ${voucherId}`); return false; }
  if (!contractAddress || !contractName) { show('err','Missing contract info on page'); return false; }
  return true;
}

// replace your callRedeemStrict (or callRedeem) with this:

async function callRedeemStrict() {
  // prepare arg in 3 encodings
  const objArgNum = { type: 'uint', value: voucherId };       
  const objArgStr = { type: 'uint', value: String(voucherId) };  


const hexWith0x = cvToHex(uintCV(voucherId));     
const hexNo0x   = hexWith0x.replace(/^0x/, '');
  

  const SHAPES = [
    { label: 'split',  base: { contractAddress, contractName, functionName: 'redeem-voucher', postConditions: [], sponsored: false, appDetails: { name:'DecentraKey', icon:'/favicon.ico' } } },
    { label: 'string', base: { contract: `${contractAddress}.${contractName}`, functionName: 'redeem-voucher', postConditions: [], sponsored: false, appDetails: { name:'DecentraKey', icon:'/favicon.ico' } } },
  ];
  const ARG_KEYS   = ['functionArgs','arguments'];          
  const ARG_VARIANTS = [
    { args:[objArgNum], label:'object(value number)' },
    { args:[objArgStr], label:'object(value string)' },
    { args:[hexWith0x], label:'hex 0x' },
    { args:[hexNo0x],   label:'hex no0x' },
  ];
  const PCM = [
    { key:'postConditionMode', val: 1,      note:'pcm=1' },          
    { key:'postConditionMode', val: 'deny', note:"pcm='deny'" },
  ];
  const NET = [
    {},                                    
    { network: 'testnet' },                
    { network: { name: 'testnet' } },      
  ];

  let methodName = 'stx_callContract';
  try {
    const sm = await window.LeatherProvider.request('supportedMethods');
    const methods = sm?.methods || sm?.result || [];
    if (Array.isArray(methods) && methods.includes('callContract')) methodName = 'callContract';
    console.log('[CLAIM] supportedMethods:', methods);
  } catch {}

  async function tryOnce(label, params) {
    console.log(`[CLAIM] → ${methodName} (${label})`, params);
    try {
      const res = await window.LeatherProvider.request(methodName, params);
      if (res && !res.error) return res;
      console.warn(`[CLAIM] ${label} error:`, res?.error || res);
      return null;
    } catch (e) {
      console.warn(`[CLAIM] ${label} threw:`, e);
      return null;
    }
  }

  for (const shape of SHAPES) {
    for (const argKey of ARG_KEYS) {
      for (const pcm of PCM) {
        for (const net of NET) {
          for (const variant of ARG_VARIANTS) {
            const params = { ...shape.base, ...net, [pcm.key]: pcm.val, [argKey]: variant.args };
            const res = await tryOnce(`${shape.label} + ${argKey} + ${variant.label} + ${pcm.note} + ${('network' in net ? 'net' : 'no-net')}`, params);
            if (res) return res;
          }
        }
      }
    }
  }

  throw new Error('Wallet rejected both encodings');
}


async function onClick(){
  if (!preflight()) return;

  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = 'Checking…';
  helpEl?.classList.remove('hidden');

  try {
    // 1) Prove node connectivity
    const ping = await fetch(`${HIRO}/extended/v1/status`).then(r=>r.json());
    log('HIRO STATUS:', ping);

    // 2) Read-only: get voucher
    const vResp = await ro('get-voucher', [clarityUintHex(voucherId)]);
    const raw = vResp?.json?.result;
    if (!raw || !raw.startsWith('0x')) {
      show('err','Voucher read failed; check console'); btn.disabled = false; btn.textContent = prev; helpEl?.classList.add('hidden'); return;
    }
    log('voucher raw result:', raw);

    // 3) Get wallet address and confirm recipient
    const addr = await getWalletAddress();
    log('wallet address:', addr);
    if (!addr) { show('warn','Open Leather and unlock it, then retry.'); btn.disabled=false; btn.textContent=prev; helpEl?.classList.add('hidden'); return; }

    // Optional: quick string check (we already decode on the backend, but for demo we trust intended)
    if (intended && addr && intended !== addr) {
      show('err', `This link is meant for ${intended}, but your wallet is ${addr}. Switch account in Leather.`);
      btn.disabled = false; btn.textContent = prev; helpEl?.classList.add('hidden'); return;
    }

    // 4) Call contract
    btn.textContent = 'Opening wallet…';
    const res = await callRedeemStrict();
    log('wallet response:', res);

    const txid = res?.txid || res?.result?.txid || res?.txId || res?.result?.txId;
    if (!txid) throw new Error('No txid returned by wallet');

    await markClaimed(txid);
    show('ok', `Transaction submitted! ${txid}`);
    btn.textContent = 'Sent ✅';
    helpEl?.classList.add('hidden');
  } catch(e){
    err('Claim failed:', e);
    const m = (e?.message || e?.code || '').toString().toLowerCase();
    if (m.includes('invalid input') || m.includes('functionargs') || m.includes('arguments')) {
      show('err','Wallet rejected the argument. Make sure wallet is on Testnet and voucherId is correct.');
    } else if (m.includes('rejected') || m.includes('cancel')) {
      show('warn','You canceled in the wallet.');
    } else if (m.includes('unauthorized')) {
      show('err','This wallet is not the intended recipient.');
    } else {
      show('err','Failed to initiate. See console.');
    }
    btn.disabled = false; btn.textContent = prev; helpEl?.classList.add('hidden');
  }
}

btn?.addEventListener('click', onClick);

// Initial banner
log('ready with', { voucherId, contract: `${contractAddress}.${contractName}`, intended, claimToken });
