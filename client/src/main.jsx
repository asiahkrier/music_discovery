import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import SongSearch from './SongSearch.jsx';
import ArtistSearch from './ArtistSearch.jsx';
import AccountPage from './AccountPage.jsx';
import { AccountProvider } from './AccountContext.jsx';
import './account.css';

function App() {
  const [view, setView] = useState(new URLSearchParams(window.location.search).get('view') === 'account' ? 'account' : 'artists');
  return <div className="app">
    <header><a className="brand" href="/" aria-label="Ripple home"><span className="logo">≋</span> Ripple</a><div className="header-links"><button onClick={() => setView('artists')}>Discover</button><button className="account-button" onClick={() => setView('account')}>My account</button></div></header>
    <main>
      {view !== 'account' && <nav className="search-tabs" aria-label="Discovery mode"><button aria-pressed={view === 'artists'} onClick={() => setView('artists')}>Artists</button><button aria-pressed={view === 'songs'} onClick={() => setView('songs')}>Songs</button></nav>}
      {view === 'artists' && <ArtistSearch/>}{view === 'songs' && <SongSearch/>}{view === 'account' && <AccountPage/>}
    </main>
    <footer><span>Ripple <span className="muted">/ Live discovery demo</span></span><span>Follow your sound.</span></footer>
  </div>;
}
createRoot(document.getElementById('root')).render(<AccountProvider><App/></AccountProvider>);
