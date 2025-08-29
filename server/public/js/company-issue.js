// /public/js/company-issue.js
import { uintCV, stringAsciiCV, principalCV, cvToHex } from 'https://esm.sh/@stacks/transactions@7.1.0';

const btn = document.getElementById('create-voucher-wallet');
const info = document.getElementById('contract-info');

const contractAddress = info?.dataset.contractAddress;
const contractName    = info?.dataset.contractName;

function hexArgs(recipient, software, days) {
  return [
    cvToHex(principalCV(recipient)),
    cvToHex(stringAsciiCV(software)),
    cvToHex(uintCV(Number(days)))
  ];
}

btn?.addEventListener('click', async () => {
  try {
  
    const recipient  = document.getElementById('customerWalletAddress').value.trim();
    const software   = document.getElementById('softwareName').value.trim();
    const days       = document.getElementById('licenseDurationDays').value.trim();

    if (!recipient.startsWith('ST') && !recipient.startsWith('SP')) throw new Error('Enter a valid STX address.');
    if (!software) throw new Error('Software name is required.');
    if (!/^\d+$/.test(days) || Number(days) <= 0) throw new Error('Duration must be a positive integer.');

    if (!window.LeatherProvider) throw new Error('Leather wallet not detected.');
    const functionArgs = hexArgs(recipient, software, days);

    const params = {
      contractAddress,
      contractName,
      functionName: 'create-voucher',
      functionArgs,
      postConditionMode: 'deny',
      sponsored: false,
      appDetails: { name: 'DecentraKey Issuer', icon: '/favicon.ico' }
    };

    const res = await window.LeatherProvider.request('stx_callContract', params);
    if (res?.error) throw res.error;

    const txid = res?.txid || res?.result?.txid;
    if (!txid) throw new Error('No txid returned by wallet.');

    alert(`Voucher creation tx sent: ${txid}\nPaste the voucherId (next token id) into your DB entry.`);
  } catch (e) {
    console.error(e);
    alert(e?.message || 'Wallet call failed');
  }
});
