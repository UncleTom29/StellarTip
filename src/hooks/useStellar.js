import { useState, useEffect, useCallback } from 'react';
import { fetchBalance, sendXLM, fetchHistory } from '../utils/stellar';

export function useStellar(publicKey, sign) {
  const [balance, setBalance] = useState(null);
  const [balLoading, setBalLoading] = useState(false);
  const [balError, setBalError] = useState(null);
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [txResult, setTxResult] = useState(null);
  const [txLoading, setTxLoading] = useState(false);

  const loadBalance = useCallback(async () => {
    if (!publicKey) return;
    setBalLoading(true); setBalError(null);
    try { setBalance(await fetchBalance(publicKey)); }
    catch(e) { setBalError(e.message); }
    finally { setBalLoading(false); }
  }, [publicKey]);

  const loadHistory = useCallback(async () => {
    if (!publicKey) return;
    setHistLoading(true);
    try { setHistory(await fetchHistory(publicKey)); }
    finally { setHistLoading(false); }
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) { loadBalance(); loadHistory(); }
    else { setBalance(null); setHistory([]); setTxResult(null); }
  }, [publicKey]);

  const sendTip = useCallback(async (params) => {
    setTxLoading(true); setTxResult(null);
    try {
      const r = await sendXLM({ sourcePublicKey: publicKey, ...params, signTransaction: sign });
      setTxResult({ success: true, ...r });
      setTimeout(() => { loadBalance(); loadHistory(); }, 3000);
    } catch(e) { setTxResult({ success: false, error: e.message }); }
    finally { setTxLoading(false); }
  }, [publicKey, sign, loadBalance, loadHistory]);

  return { balance, balLoading, balError, loadBalance, history, histLoading, txResult, txLoading, sendTip, clearResult: () => setTxResult(null) };
}
