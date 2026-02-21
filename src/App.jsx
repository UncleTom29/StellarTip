import React, { useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useWallet } from './hooks/useWallet';
import { useStellar } from './hooks/useStellar';
import { shortAddr, fmtTime, EXPLORER } from './utils/stellar';

const PRESETS = [
  { emoji:'☕', label:'Coffee', amount:'10' },
  { emoji:'🍕', label:'Pizza', amount:'50' },
  { emoji:'🚀', label:'Rocket', amount:'100' },
];

function ConnectScreen({ connect, connecting, error }) {
  return (
    <div className="card connect-hero">
      <div style={{fontSize:'3rem'}}>⭐</div>
      <h1 className="connect-title">StellarTip</h1>
      <p className="connect-sub">Send XLM tips instantly on Stellar Testnet.<br/>Connect your Freighter wallet to start.</p>
      <button className="btn btn-primary" onClick={connect} disabled={connecting} style={{minWidth:200}}>
        {connecting ? <><span className="spinner"/>Connecting...</> : '🔗 Connect Freighter'}
      </button>
      {error && <p style={{marginTop:16,color:'var(--error)',fontSize:'0.85rem'}}>⚠️ {error}</p>}
      <div className="faucet-note">
        <span>💧</span>
        <span>Need testnet XLM? <a href="https://laboratory.stellar.org/#account-creator?network=test" target="_blank" rel="noopener noreferrer" style={{color:'var(--accent)'}}>Fund via faucet →</a></span>
      </div>
    </div>
  );
}

function BalanceCard({ pk, balance, balLoading, balError, onRefresh }) {
  const copy = () => navigator.clipboard.writeText(pk).catch(()=>{});
  return (
    <div className="card">
      <div className="row">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div className="dot"/>
          <span className="card-title" style={{marginBottom:0}}>Wallet Balance</span>
        </div>
        <button onClick={onRefresh} disabled={balLoading} style={{background:'none',border:'none',color:'var(--dim)',cursor:'pointer',fontSize:'1.1rem'}} title="Refresh">↻</button>
      </div>
      {balLoading && !balance ? <p style={{textAlign:'center',marginTop:16,color:'var(--dim)'}}>Loading...</p>
        : balError ? <p style={{textAlign:'center',marginTop:16,color:'var(--error)',fontSize:'0.85rem'}}>⚠️ {balError}</p>
        : <>
            <div className="balance-amount">{balance ?? '—'}</div>
            <div className="balance-label">XLM · Testnet</div>
          </>}
      <button className="address-box" onClick={copy}>📋 {shortAddr(pk)} — click to copy</button>
    </div>
  );
}

function TipCard({ onSend, txLoading }) {
  const [dest, setDest] = React.useState('');
  const [amt, setAmt] = React.useState('');
  const [memo, setMemo] = React.useState('');
  const [active, setActive] = React.useState(null);
  const [errs, setErrs] = React.useState({});

  const pickPreset = (p) => { setActive(p.label); setAmt(p.amount); };

  const validate = () => {
    const e = {};
    if (!dest.trim()) e.dest = 'Required.';
    else if (dest.trim().length !== 56 || !dest.trim().startsWith('G')) e.dest = 'Must be a valid Stellar address (starts with G, 56 chars).';
    if (!amt || isNaN(parseFloat(amt)) || parseFloat(amt) <= 0) e.amt = 'Enter a valid amount.';
    return e;
  };

  const submit = () => {
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;
    onSend({ destination: dest.trim(), amount: amt, memo });
  };

  return (
    <div className="card">
      <p className="card-title">Send a Tip</p>
      <div className="presets">
        {PRESETS.map(p => (
          <button key={p.label} className={`preset ${active===p.label?'active':''}`} onClick={()=>pickPreset(p)} disabled={txLoading}>
            <span className="preset-emoji">{p.emoji}</span>
            <span className="preset-label">{p.label}</span>
            <span className="preset-amt">{p.amount} XLM</span>
          </button>
        ))}
      </div>
      <div className="divider">or enter custom amount</div>
      <label className="label">Recipient Address *</label>
      <input className={`input${errs.dest?' err':''}`} placeholder="G..." value={dest} onChange={e=>{setDest(e.target.value);setErrs(p=>({...p,dest:null}))}} disabled={txLoading} maxLength={56}/>
      {errs.dest && <p className="field-err">{errs.dest}</p>}
      <label className="label">Amount (XLM) *</label>
      <input className={`input${errs.amt?' err':''}`} type="number" placeholder="e.g. 10" value={amt} onChange={e=>{setAmt(e.target.value);setActive(null);setErrs(p=>({...p,amt:null}))}} disabled={txLoading} min="0" step="0.0000001"/>
      {errs.amt && <p className="field-err">{errs.amt}</p>}
      <label className="label">Memo (optional, max 28 chars)</label>
      <input className="input" placeholder="Thanks!" value={memo} onChange={e=>setMemo(e.target.value)} disabled={txLoading} maxLength={28}/>
      <button className="btn btn-primary btn-full" onClick={submit} disabled={txLoading} style={{marginTop:16}}>
        {txLoading ? <><span className="spinner"/>Sending...</> : '💸 Send Tip'}
      </button>
    </div>
  );
}

function TxResult({ result, onClose }) {
  if (!result) return null;
  const ok = result.success;
  return (
    <div className={`result ${ok?'ok':'fail'}`}>
      <div style={{fontSize:'1.5rem'}}>{ok?'✅':'❌'}</div>
      <div className={`result-title ${ok?'ok':'fail'}`}>{ok?'Tip Sent!':'Transaction Failed'}</div>
      {ok ? <>
        <div style={{fontSize:'0.8rem',color:'var(--muted)'}}>Ledger #{result.ledger}</div>
        <div className="hash">{result.hash}</div>
        <a className="hash-link" href={`${EXPLORER}/tx/${result.hash}`} target="_blank" rel="noopener noreferrer">🔍 View on Stellar Expert →</a>
      </> : <div style={{fontSize:'0.85rem',color:'var(--muted)',marginTop:6}}>{result.error}</div>}
      <button className="btn btn-secondary btn-full" onClick={onClose} style={{marginTop:12,fontSize:'0.8rem'}}>Dismiss</button>
    </div>
  );
}

function History({ history, loading }) {
  return (
    <div className="card">
      <p className="card-title">Recent Transactions</p>
      {loading && !history.length ? <div className="empty">Loading...</div>
        : !history.length ? <div className="empty">No transactions yet. Send your first tip! 🎉</div>
        : history.map(tx => (
          <a key={tx.id} className="hist-item" href={`${EXPLORER}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer">
            <div className={`hist-icon ${tx.type}`}>{tx.type==='sent'?'↑':'↓'}</div>
            <div className="hist-info">
              <div className="hist-addr">{tx.type==='sent'?'To: ':'From: '}{shortAddr(tx.address)}</div>
              <div className="hist-time">{fmtTime(tx.createdAt)}</div>
            </div>
            <div className={`hist-amt ${tx.type}`}>{tx.type==='sent'?'−':'+' }{parseFloat(tx.amount).toFixed(2)} XLM</div>
          </a>
        ))}
    </div>
  );
}

export default function App() {
  const { publicKey, connecting, error, connect, disconnect, sign } = useWallet();
  const { balance, balLoading, balError, loadBalance, history, histLoading, txResult, txLoading, sendTip, clearResult } = useStellar(publicKey, sign);

  useEffect(() => {
    if (txResult?.success) toast.success('Tip sent! 🚀');
    else if (txResult?.success === false) toast.error(txResult.error || 'Failed');
  }, [txResult]);

  return (
    <div className="app">
      <Toaster position="top-center" toastOptions={{style:{background:'#1a1a35',color:'#f1f5f9',border:'1px solid #2a2a50',borderRadius:12,fontFamily:'Inter,sans-serif',fontSize:'0.875rem'}}}/>
      <header className="header">
        <div className="logo">⭐ StellarTip</div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span className="badge">Testnet</span>
          {publicKey && <button className="btn btn-danger" onClick={disconnect} style={{padding:'8px 14px',fontSize:'0.8rem'}}>Disconnect</button>}
        </div>
      </header>
      <main className="main">
        {!publicKey
          ? <ConnectScreen connect={connect} connecting={connecting} error={error}/>
          : <>
              <BalanceCard pk={publicKey} balance={balance} balLoading={balLoading} balError={balError} onRefresh={loadBalance}/>
              <TipCard onSend={sendTip} txLoading={txLoading}/>
              {txResult && <TxResult result={txResult} onClose={clearResult}/>}
              <History history={history} loading={histLoading}/>
            </>}
      </main>
      <footer className="footer">Built on <a href="https://stellar.org" target="_blank" rel="noopener noreferrer">Stellar</a> · Testnet only</footer>
    </div>
  );
}
