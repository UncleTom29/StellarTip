import { useState, useCallback } from 'react';
import { isConnected, getPublicKey, signTransaction, isAllowed, requestAccess } from '@stellar/freighter-api';

export function useWallet() {
  const [publicKey, setPublicKey] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(async () => {
    setConnecting(true); setError(null);
    try {
      if (!await isConnected()) throw new Error('Freighter not found. Install it at freighter.app');
      if (!await isAllowed()) await requestAccess();
      const key = await getPublicKey();
      if (!key) throw new Error('Could not retrieve public key.');
      setPublicKey(key);
    } catch(e) { setError(e.message); }
    finally { setConnecting(false); }
  }, []);

  const disconnect = useCallback(() => { setPublicKey(null); setError(null); }, []);
  const sign = useCallback((xdr, opts) => signTransaction(xdr, opts), []);

  return { publicKey, connecting, error, connect, disconnect, sign };
}
