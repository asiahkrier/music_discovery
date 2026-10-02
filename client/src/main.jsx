import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import SongSearch from './SongSearch.jsx';
import ArtistSearch from './ArtistSearch.jsx';

function App() {
  const [view, setView] = useState('artists');
  return <div className="app">
    <header><a className="brand" href="/" aria-label="Ripple home"><span className="logo">≋</span> Ripple</a><span className="edition">THE DISCOVERY SESSION <b>02</b></span></header>
    <main>
      <nav className="search-tabs" aria-label="Discovery mode"><button aria-pressed={view === 'artists'} onClick={() => setView('artists')}>Artists</button><button aria-pressed={view === 'songs'} onClick={() => setView('songs')}>Songs</button></nav>
      {view === 'artists' ? <ArtistSearch/> : <SongSearch/>}
    </main>
    <footer><span>Ripple <span className="muted">/ Live discovery demo</span></span><span>Follow your sound.</span></footer>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
