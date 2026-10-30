import React, { useEffect, useId, useRef, useState } from 'react';

export default function SearchSuggestions({ kind, query, setQuery, country, onSelect, label, placeholder, maxLength }) {
  const id = useId();
  const root = useRef(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [active, setActive] = useState(-1);
  const key = `${kind}:${country}:${query.trim()}`;
  useEffect(() => {
    setResult(null); setActive(-1);
    if (!open || query.trim().length < 2) return undefined;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: query.trim(), country, provider: 'spotify' });
      fetch(`/api/${kind === 'artist' ? 'artists' : 'songs'}?${params}`, { signal: controller.signal })
        .then(async response => {
          const data = await response.json();
          if (!response.ok) throw new Error('Suggestions unavailable. You can still use the search button.');
          return data;
        }).then(data => {
          if (current) setResult({ key, items: (data.artists || data.songs || []).slice(0, 6) });
        }).catch(error => {
          if (current && error.name !== 'AbortError') setResult({ key, items: [], error: error.message });
        });
    }, 400);
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [key, open, kind, country, query]);
  const visible = open && query.trim().length >= 2;
  const items = result?.key === key ? result.items : [];
  function choose(item) { setOpen(false); setQuery(item.name || item.title); onSelect(item); }
  function keyboard(event) {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      setActive(previous => items.length ? (previous + (event.key === 'ArrowDown' ? 1 : items.length - 1) + items.length) % items.length : -1);
    } else if (event.key === 'Enter') {
      if (visible && items[active]) { event.preventDefault(); choose(items[active]); }
      else setOpen(false);
    }
  }
  return <div className="search-suggestions" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <div className="search"><label className="sr-only" htmlFor={id}>{label}</label><span aria-hidden="true">⌕</span>
      <input id={id} value={query} onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={keyboard} maxLength={maxLength} required placeholder={placeholder} autoComplete="off" role="combobox" aria-autocomplete="list" aria-activedescendant={visible && items[active] ? `${id}-option-${active}` : undefined} aria-expanded={visible} aria-controls={`${id}-suggestions`} aria-describedby={visible ? `${id}-status` : undefined}/>
      <button type="submit" onClick={() => setOpen(false)}>Find {kind === 'artist' ? 'artists' : 'songs'} ↗</button>
    </div>
    {visible && <div className="suggestion-panel" >
      <output id={`${id}-status`} aria-live="polite">{result?.key !== key ? 'Finding suggestions…' : result.error || (items.length ? 'Select a suggestion or continue searching.' : 'No suggestions yet. Try more of the name.')}</output>
      <ul role="listbox" aria-label={`${kind} suggestions`} id={`${id}-suggestions`}>{items.map((item, index) => <li role="presentation" key={item.id}><button type="button" role="option" id={`${id}-option-${index}`} aria-selected={index === active} className={index === active ? 'suggestion-active' : ''} onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}>
        {item.image && <img src={item.image} alt=""/>}<span><strong>{item.name || item.title}</strong><small>{kind === 'artist' ? 'Artist' : item.artist}</small></span>
      </button></li>)}</ul>
    </div>}
  </div>;
}
