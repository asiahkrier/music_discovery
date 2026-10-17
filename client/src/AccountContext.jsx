import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './account-client.js';

const Context = createContext(null);
const sampleLibrary = [
  { kind: 'artist', spotify_id: '7tYKF4w9nC0nq9CsPZTHyP', name: 'SZA', subtitle: 'R&B', image: '' },
  { kind: 'artist', spotify_id: '4q3ewBCX7sLwd24euuV69X', name: 'Bad Bunny', subtitle: 'Latin', image: '' },
  { kind: 'artist', spotify_id: '6YVMFz59CuY7ngCxTxjpxE', name: 'aespa', subtitle: 'K-pop', image: '' },
  { kind: 'song', spotify_id: '4iZ4pt7kvcaH6Yo8UoZ4s2', name: 'Snooze', subtitle: 'SZA', image: '' },
];

export function AccountProvider({ children }) {
  const [user, setUser] = useState(null);
  const [demo, setDemo] = useState(false);
  const [profile, setProfile] = useState(null);
  const [library, setLibrary] = useState([]);
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
    setProfile(null); setLibrary([]); setError('');
    if (!user || !supabase) return undefined;
    setLoading(true);
    Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('library_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]).then(([p, l]) => {
      if (generation.current !== version) return;
      if (p.error || l.error) throw new Error('Could not load your profile. Check the Supabase setup, then reload.');
      setProfile(p.data); setLibrary(l.data);
    }).catch(e => { if (generation.current === version) setError(e.message); })
      .finally(() => { if (generation.current === version) setLoading(false); });
    return () => { generation.current++; };
  }, [user, demo]);
  function startDemo() {
    setDemo(true); setUser({ id: 'preview' }); setError(''); setLoading(false);
    setProfile({ username: 'israelmr27', display_name: 'Israel', bio: 'Always looking for my next favorite sound.', avatar_url: '', genres: 'R&B, Pop, K-pop' });
    setLibrary(sampleLibrary.map(item => ({ ...item })));
  }
  async function signOut() {
    if (!demo && supabase) { const { error: e } = await supabase.auth.signOut(); if (e) throw e; }
    generation.current++; setDemo(false); setUser(null); setProfile(null); setLibrary([]);
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
  async function toggleItem(item) {
    if (!user) throw new Error('Create an account or log in to save your favorites.');
    const exists = library.some(i => i.kind === item.kind && i.spotify_id === item.spotify_id);
    if (!demo) {
      const table = supabase.from('library_items');
      const result = exists ? await table.delete().eq('user_id', user.id).eq('kind', item.kind).eq('spotify_id', item.spotify_id)
        : await table.upsert({ ...item, user_id: user.id }, { onConflict: 'user_id,kind,spotify_id' });
      if (result.error) throw new Error('Could not update your library. Please try again.');
    }
    setLibrary(items => exists ? items.filter(i => i.kind !== item.kind || i.spotify_id !== item.spotify_id) : [...items, item]);
  }
  return <Context.Provider value={{ user, demo, profile, library, error, loading, startDemo, signOut, saveProfile, uploadPhoto, toggleItem }}>{children}</Context.Provider>;
}
export function useAccount() { return useContext(Context); }

export function SaveButton({ item }) {
  const account = useAccount(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const saved = account.library.some(i => i.kind === item.kind && i.spotify_id === item.spotify_id);
  async function toggle() { setBusy(true); setError(''); try { await account.toggleItem(item); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <div><button className="account-button" disabled={busy} aria-pressed={saved} onClick={() => void toggle()}>{saved ? '♥ Saved' : '♡ Save'}{item.kind === 'artist' ? ' artist' : ' song'}</button>{error && <p role="alert">{error}</p>}</div>;
}
