// /server/public/js/company-create.js
import {
  uintCV, stringAsciiCV, principalCV,
  cvToHex, hexToCV, cvToJSON
} from 'https://esm.sh/@stacks/transactions@7.1.0';

const form = document.querySelector('form[action="/company/create-license"]');
const button = form?.querySelector('button[type="submit"]');

const CONTRACT_ADDRESS = document.body.dataset.contractAddress; // set these in your EJS
const CONTRACT_NAME    = document.body.dataset.contractName;
const HIRO             = document.body.dataset.hiroApi || 'https://api.testnet.hiro.so';

function msg(text) { console.log('[CREATE]', text); }

async function pollTxForResult(txid, timeoutMs=90000, stepMs=2500) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = '';
  while (Date.now() < deadline) {
    const res = await fetch(`${HIRO}/extended/v1/tx/${txid}`).then(r=>r.json()).catch(()=>null);
    const status = res?.tx_status;
    if (status && status !== lastStatus) msg(`tx ${txid} status: ${status}`);
    lastStatus = status || lastStatus;

    if (status === 'success') {
      // smart_contract_log/result is under "contract_call.result" in v2 endpoint:
      const v2 = await fetch(`${HIRO}/v2/transactions/${txid}`).then(r=>r.json()).catch(()=>null);
      const hexResult = v2?.contract_call?.function_call?.result || v2?.receipt?.result;
      if (typeof hexResult === 'string') {
        const cv = hexToCV(hexResult);
        const j  = cvToJSON(cv);
        // Expect {type:'uint', value:'<id>'}
        const id = Number(j?.value);
        if (Number.isFinite(id)) return id;
      }
      // Fallback: read last-id (works if transactions are serialized)
      const ro = await fetch(
        `${HIRO}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-last-token-id`,
        { method:'POST', headers:{'content-type':'application/json'},
          body: JSON.stringify({ sender: CONTRACT_ADDRESS, arguments: [] })
        }
      ).then(r=>r.json()).catch(()=>null);
      const roHex = ro?.result;
      if (typeof roHex === 'string') {
        const cv2 = hexToCV(roHex);
        const j2  = cvToJSON(cv2);
        const id2 = Number(j2?.value?.value ?? j2?.value);
        if (Number.isFinite(id2)) return id2;
      }
      return null;
    }
    if (status === 'abort_by_response' || status === 'abort_by_post_condition' || status === 'failed') {
      throw new Error(`create-voucher failed on-chain: ${status}`);
    }
    await new Promise(r=>setTimeout(r, stepMs));
  }
  throw new Error('Timed out waiting for voucher creation to confirm.');
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!window.LeatherProvider) {
    alert('Leather wallet not detected. Install/enable Leather and retry.');
    return;
  }
  if (!CONTRACT_ADDRESS || !CONTRACT_NAME) {
    alert('Missing contract info on page.');
    return;
  }

  const fd = new FormData(form);
  const customerName   = fd.get('customerName')?.toString().trim();
  const customerEmail  = fd.get('customerEmail')?.toString().trim();
  const recipient      = fd.get('customerWalletAddress')?.toString().trim();
  const softwareName   = fd.get('softwareName')?.toString().trim();
  const durationDays   = parseInt(fd.get('licenseDurationDays'), 10);

  if (!recipient?.startsWith('ST') && !recipient?.startsWith('SP')) {
    alert('Enter a valid Stacks address (ST…/SP…).');
    return;
  }
  if (!softwareName || softwareName.length > 256) {
    alert('Software name must be 1–256 ASCII chars.');
    return;
  }
  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    alert('Duration days must be a positive integer.');
    return;
  }

  // Prepare Clarity args
  const args = [
    cvToHex(principalCV(recipient)),
    cvToHex(stringAsciiCV(softwareName)),
    cvToHex(uintCV(durationDays)),
  ];

  button.disabled = true;
  const beforeText = button.textContent;
  button.textContent = 'Opening wallet…';

  try {
    // Ask Leather to call the contract
    const params = {
      contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
      functionName: 'create-voucher',
      functionArgs: args,
      postConditionMode: 'deny',
      postConditions: [],
      sponsored: false,
      network: 'testnet',
      appDetails: { name: 'DecentraKey', icon: '/favicon.ico' },
    };
    msg('calling create-voucher with Leather…');
    const res = await window.LeatherProvider.request('stx_callContract', params);
    const txid = res?.result?.txid || res?.txid || res?.result?.txId || res?.txId;
    if (!txid) throw new Error('Wallet did not return a txid');

    msg(`broadcasted: ${txid}; polling for success…`);
    const voucherId = await pollTxForResult(txid);
    if (!Number.isFinite(voucherId)) {
      throw new Error('Could not obtain voucherId from chain result.');
    }
    msg(`voucherId confirmed: ${voucherId}`);

    // Send to server to create DB row and get claim link back
    const resp = await fetch('/company/create-license-from-wallet', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        voucherId, customerName, customerEmail, customerWalletAddress: recipient,
        softwareName, licenseDurationDays: durationDays, chainTxId: txid,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || 'Server rejected create');
    // Redirect or show the link
    window.location.href = '/company/dashboard';
  } catch (err) {
    console.error('[CREATE] failed:', err);
    alert(err.message || 'Failed to create voucher.');
  } finally {
    button.disabled = false;
    button.textContent = beforeText;
  }
});
