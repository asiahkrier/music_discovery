import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import SongSearch from './SongSearch.jsx';
import ArtistSearch from './ArtistSearch.jsx';
import RippleMix from './RippleMix.jsx';
import AccountSettings from './AccountSettings.jsx';
import AccountPage from './AccountPage.jsx';
import { AccountProvider, useAccount } from './AccountContext.jsx';
import './account.css';

function App() {
  const { user, profile, signOut } = useAccount();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const signOutPending = useRef(false);
  async function handleSignOut(event) {
    if (signOutPending.current) return;
    const menu = event.currentTarget.closest('details');
    signOutPending.current = true;
    setSigningOut(true);
    setSignOutError('');
    try {
      await signOut();
      menu.open = false;
      setView('artists');
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      setSignOutError('Could not sign out. Please try again.');
    } finally {
      signOutPending.current = false;
      setSigningOut(false);
    }
  }
  const [view, setView] = useState(['account', 'settings', 'mix'].includes(new URLSearchParams(window.location.search).get('view')) ? new URLSearchParams(window.location.search).get('view') : 'artists');
  return <div className="app">
    <header><a className="brand" href="/" aria-label="Ripple home"><img className="logo-img" src="/ripple-logo.png" alt="" /> Ripple</a><div className="header-links"><button type="button" onClick={() => setView('artists')}>Discover</button><button type="button" onClick={() => setView('mix')}>Your mix</button><details className="account-dropdown" onKeyDown={e => { if (e.key === 'Escape') e.currentTarget.open = false; }}><summary className="account-avatar" aria-label="Open account menu" title="Account menu"><img key={profile?.avatar_url || 'default'} src={profile?.avatar_url || '/ripple-logo.png'} alt="" onError={event => { event.currentTarget.onerror = null; if (!event.currentTarget.src.endsWith('/ripple-logo.png')) event.currentTarget.src = '/ripple-logo.png'; }}/></summary><nav aria-label="Account"><button type="button" onClick={e => { setView('account'); e.currentTarget.closest('details').open = false; }}>My profile</button><button type="button" onClick={e => { setView('settings'); e.currentTarget.closest('details').open = false; }}>Settings</button>{user && <button type="button" disabled={signingOut} onClick={event => void handleSignOut(event)}>{signingOut ? 'Signing out…' : 'Log out'}</button>}{signOutError && <p role="alert">{signOutError}</p>}</nav></details></div></header>
    <main>
      {!['account', 'settings', 'mix'].includes(view) && <nav className="search-tabs" aria-label="Discovery mode"><button type="button" aria-pressed={view === 'artists'} onClick={() => setView('artists')}>Artists</button><button type="button" aria-pressed={view === 'songs'} onClick={() => setView('songs')}>Songs</button></nav>}
      {view === 'artists' && <ArtistSearch/>}{view === 'songs' && <SongSearch/>}{view === 'mix' && <RippleMix onProfile={() => setView('account')}/>}
      {view === 'account' && <AccountPage/>}{view === 'settings' && <AccountSettings onProfile={() => setView('account')}/>}
    </main>
    <footer><span>Ripple <span className="muted">/ Live discovery demo</span></span><span>Follow your sound.</span></footer>
  </div>;
}
createRoot(document.getElementById('root')).render(<AccountProvider><App/></AccountProvider>);
