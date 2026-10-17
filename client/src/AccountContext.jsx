import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  function startDemo() {
    setDemo(true); setUser({ id: 'preview' }); setError(''); setLoading(false);
    setProfile({ username: 'israelmr27', display_name: 'Israel', bio: 'Always looking for my next favorite sound.', avatar_url: '', genres: 'R&B, Pop, K-pop' });
  }
  async function signOut() {
    if (!demo && supabase) { const { error: e } = await supabase.auth.signOut(); if (e) throw e; }
    generation.current++; setDemo(false); setUser(null); setProfile(null);
  }
  async function saveProfile(changes) {
    if (!user) throw new Error('Please log in first.');
    if (!demo) {
      const { error: e } = await supabase.from('profiles').update(changes).eq('id', user.id);
      if (e) throw new Error('Could not save your profile. Please try again.');
    }
    setProfile(p => ({ ...p, ...changes }));
  }
  async function uploadPhoto(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Choose a JPG, PNG, or WebP image under 2 MB.');
    if (demo) {
      const image = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read photo.')); reader.readAsDataURL(file); });
      await saveProfile({ avatar_url: image }); return;
    }
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: e } = await supabase.storage.from('avatars').upload(path, file);
    if (e) throw new Error('Photo upload failed. Check the avatars bucket setup.');
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await saveProfile({ avatar_url: data.publicUrl });
  }
  return <Context.Provider value={{ user, demo, profile, error, loading, startDemo, signOut, saveProfile, uploadPhoto }}>{children}</Context.Provider>;
}
export function useAccount() { return useContext(Context); }
