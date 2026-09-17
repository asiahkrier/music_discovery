// Hand-curated demo associations, not live recommendations or popularity rankings.
const groups = [
  [
    ['Radiohead', 'Art rock', 'An English band known for restless experimentation, atmospheric textures, and a sound that moves between alternative rock and electronic music.'],
    ['Thom Yorke', 'Experimental', 'Electronic textures and distinctive vocals from Radiohead’s frontman.'],
    ['Portishead', 'Trip-hop', 'Shadowy beats, cinematic arrangements, and haunting vocals.'],
    ['Massive Attack', 'Trip-hop', 'Bristol trip-hop blending dub, soul, and electronic production.'],
    ['Muse', 'Alternative rock', 'Expansive rock with dramatic vocals and electronic influences.'],
    ['The Smile', 'Art rock', 'Adventurous arrangements from Thom Yorke, Jonny Greenwood, and Tom Skinner.'],
  ],
  [
    ['Daft Punk', 'Electronic', 'A French duo whose work connects house music, disco, and futuristic pop.'],
    ['Justice', 'French house', 'Heavy electronic grooves with a rock-inspired edge.'],
    ['Air', 'Downtempo', 'Dreamlike French electronic pop with warm analog textures.'],
    ['Phoenix', 'Indie pop', 'Melodic French indie pop with a bright rhythmic pulse.'],
    ['Parcels', 'Disco pop', 'A blend of disco, funk, and tightly woven pop harmonies.'],
    ['The Chemical Brothers', 'Electronic', 'Big beats, psychedelic textures, and dance-floor energy.'],
  ],
  [
    ['SZA', 'R&B', 'Expressive contemporary R&B with intimate storytelling and alternative influences.'],
    ['Frank Ocean', 'Alternative R&B', 'Reflective songwriting and boundary-crossing R&B.'],
    ['Solange', 'Soul', 'Layered soul, artful arrangements, and personal storytelling.'],
    ['Jhené Aiko', 'R&B', 'Soft, atmospheric R&B with introspective lyrics.'],
    ['Summer Walker', 'R&B', 'Intimate vocals over contemporary R&B production.'],
    ['H.E.R.', 'Soul', 'Guitar-led soul and expressive contemporary R&B.'],
  ],
];
export const artists = groups.flatMap((group, groupIndex) => group.map(([name, genre, bio], index) => ({
  name, tags: [genre], bio, color: ['#bdd98b', '#a4bfe5', '#d3aae0'][groupIndex],
  similar: group.filter((_, i) => i !== index).map(([artist]) => artist),
})));
export const searchMock = (query) => artists.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));
export const getMock = (name) => artists.find(a => a.name.toLowerCase() === name.toLowerCase());
