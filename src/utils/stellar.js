import { Horizon, Keypair, TransactionBuilder, Networks, BASE_FEE, Asset, Operation, Memo } from '@stellar/stellar-sdk';

export const HORIZON = 'https://horizon-testnet.stellar.org';
export const PASSPHRASE = Networks.TESTNET;
export const EXPLORER = 'https://stellar.expert/explorer/testnet';
export const server = new Horizon.Server(HORIZON);

export const shortAddr = (a) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : '';
export const fmtTime = (s) => new Date(s).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});

export async function fetchBalance(pk) {
  try {
    const acc = await server.loadAccount(pk);
    const b = acc.balances.find(b => b.asset_type === 'native');
    return b ? parseFloat(b.balance).toFixed(4) : '0.0000';
  } catch(e) {
    if (e.response?.status === 404) throw new Error('Account not found. Fund it via the testnet faucet.');
    throw new Error('Failed to fetch balance.');
  }
}

export async function sendXLM({ sourcePublicKey, destination, amount, memo, signTransaction }) {
  try { Keypair.fromPublicKey(destination); } catch { throw new Error('Invalid destination address.'); }
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) throw new Error('Enter a valid positive amount.');

  let destExists = true;
  try { await server.loadAccount(destination); }
  catch(e) { if (e.response?.status === 404) { destExists = false; if (amt < 1) throw new Error('New accounts need minimum 1 XLM.'); } }

  const src = await server.loadAccount(sourcePublicKey);
  const op = destExists
    ? Operation.payment({ destination, asset: Asset.native(), amount: amt.toFixed(7) })
    : Operation.createAccount({ destination, startingBalance: amt.toFixed(7) });

  const txb = new TransactionBuilder(src, { fee: BASE_FEE, networkPassphrase: PASSPHRASE }).addOperation(op).setTimeout(30);
  const memoText = memo?.trim();
  if (memoText) txb.addMemo(Memo.text(memoText.slice(0,28)));
  const tx = txb.build();
  const signed = await signTransaction(tx.toXDR(), { networkPassphrase: PASSPHRASE });
  const res = await server.submitTransaction(TransactionBuilder.fromXDR(signed, PASSPHRASE));
  return { hash: res.hash, ledger: res.ledger };
}

export async function fetchHistory(pk, limit = 10) {
  try {
    const p = await server.payments().forAccount(pk).limit(limit).order('desc').call();
    return p.records.filter(r => r.type === 'payment' || r.type === 'create_account').map(r => {
      const sent = r.from === pk || r.funder === pk;
      return { id: r.id, hash: r.transaction_hash, type: sent ? 'sent' : 'received', amount: r.amount || r.starting_balance || '0', address: sent ? (r.to || r.account) : (r.from || r.funder), createdAt: r.created_at };
    });
  } catch { return []; }
}
