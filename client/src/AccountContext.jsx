import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from './account-client.js';

const Context = createContext(null);
export function AccountProvider({ children }) {
  const [user, setUser] = useState(null);
  const [demo, setDemo] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(supabase));
  const generation = useRef(0);
  useEffect(() => {
    if (!supabase) return undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null); setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const version = ++generation.current;
    if (demo) return undefined;
    setProfile(null); setError('');
    if (!user || !supabase) return undefined;
    setLoading(true);
    supabase.from('profiles').select('*').eq('id', user.id).single().then(p => {
      if (generation.current !== version) return;
      if (p.error) throw new Error('Could not load your profile. Please reload and try again.');
      setProfile(p.data);
    }).catch(e => { if (generation.current === version) setError(e.message); })
      .finally(() => { if (generation.current === version) setLoading(false); });
    return () => { generation.current++; };
  }, [user, demo]);
  const startDemo = useCallback(() => {
    setDemo(true); setUser({ id: 'preview' }); setError(''); setLoading(false);
    setProfile({ username: 'israelmr27', display_name: 'Israel', bio: 'Always looking for my next favorite sound.', avatar_url: '', genres: 'R&B, Pop, K-pop' });
  }, []);
  const signOut = useCallback(async () => {
    if (!demo && supabase) { const { error: e } = await supabase.auth.signOut(); if (e) throw e; }
    generation.current++; setDemo(false); setUser(null); setProfile(null);
  }, [demo]);
  const value = useMemo(() => ({ user, demo, profile, error, loading, startDemo, signOut }), [user, demo, profile, error, loading, startDemo, signOut]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAccount() { return useContext(Context); }
