'use strict';
(() => {
  const base = 'https://wjyovcwtvswwplitphaw.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeW92Y3d0dnN3d3BsaXRwaGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMDM0MTQsImV4cCI6MjEwNzU3OTQxNH0.p9nFqvilHYtVmseygTArQGMoYVz7e1SQoyxSEinrlKM'; // Public anon key; all access is restricted by RLS.
  const org = '6cdddfe2-52a3-43fa-93ed-1a36e8bbef84';
  const headers = {apikey: key, Authorization: `Bearer ${key}`};
  const page = location.pathname.split('/').pop() || 'index.html';
  const container = document.getElementById('listing') || document.getElementById('track');
  const message = document.getElementById('publication-message');
  let rows = [], urls = [], loading = false;
  const favoriteKey = 'vanwelden-test-favorite-ids-v2';
  function favorites() { try { const a = JSON.parse(localStorage.getItem(favoriteKey) || '[]'); return Array.isArray(a) ? a.filter(v => typeof v === 'string') : []; } catch (_) { return []; } }
  function saveFavorites(ids) { try { localStorage.setItem(favoriteKey, JSON.stringify(ids)); } catch (_) { if (message) message.textContent = 'Favorieten konden niet worden opgeslagen op dit toestel.'; } }
  function id(p) { return `${p.organization_id}/${p.property_ref}`; }
  function el(tag, text, cls) { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
  function field(name) { const n = document.getElementById(name); return n && 'value' in n ? n.value.trim() : ''; }
  function amount(s) { const n = String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'); return Number(n) || 0; }
  function displayRef(s) { return String(s || '').replace(/\.(\d{5})$/, (_, n) => '.' + String(Number(n)).padStart(4, '0')); }
  function kind(p) { return /verkocht|verhuurd/i.test(p.status) ? 'reference' : /huur/i.test(p.status) ? 'rent' : 'sale'; }
  function match(p) {
    if (page === 'te-koop.html' && kind(p) !== 'sale') return false;
    if (page === 'te-huur.html' && kind(p) !== 'rent') return false;
    if (page === 'referenties.html' && kind(p) !== 'reference') return false;
    if (page === 'nieuwbouw.html' && !/nieuwbouw/i.test(p.features.buildingCondition || '')) return false;
    if (page === 'favorieten.html' && !favorites().includes(id(p))) return false;
    const q = (field('query') || field('place')).toLowerCase(), city = field('city').toLowerCase();
    if (q && !`${p.title} ${p.address} ${p.features.referenceNumber || ''}`.toLowerCase().includes(q)) return false;
    if (city && !p.address.toLowerCase().includes(city)) return false;
    const type = field('type');
    if (type && type !== 'Type' && !(type === 'Woning' ? /huis|woning/i.test(p.features.propertyType || '') : (p.features.propertyType || '').toLowerCase() === type.toLowerCase())) return false;
    const price = amount(p.price), min = Number(field('min')) || 0, max = Number(field('max')) || amount(field('budget')) || Infinity;
    return price >= min && price <= max;
  }
  async function photo(path, image) {
    try {
      const url = base + '/storage/v1/object/authenticated/vw-team-properties-test/' + path.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(url, {headers, cache: 'no-store'});
      if (!response.ok) throw Error();
      const blob = await response.blob();
      if (!blob.type.startsWith('image/') || !image.isConnected) return;
      const objectURL = URL.createObjectURL(blob); urls.push(objectURL); image.src = objectURL;
    } catch (_) { image.alt = 'Foto niet beschikbaar'; }
  }
  function renderCard(p) {
    const card = el('article', null, 'property'), visual = el('div', null, 'property-image');
    visual.style.position = 'relative';
    if (p.photo_paths.length) { const img = el('img'); img.alt = p.title; img.style.cssText = 'width:100%;height:100%;object-fit:cover'; visual.append(img); queueMicrotask(() => photo(p.photo_paths[0], img)); }
    else visual.append(el('span', 'Nog geen openbare foto'));
    visual.append(el('span', p.status, 'tag'));
    const star = el('button', favorites().includes(id(p)) ? '★' : '☆', 'heart'); star.type = 'button'; star.setAttribute('aria-label', 'Favoriet wijzigen');
    star.classList.toggle('on', favorites().includes(id(p)));
    star.onclick = () => { const ids = favorites(); saveFavorites(ids.includes(id(p)) ? ids.filter(v => v !== id(p)) : [...ids,id(p)]); render(); };
    visual.append(star); card.append(visual);
    const body = el('div', null, 'property-body'), link = el('a', p.title); link.href = `pand.html?ref=${encodeURIComponent(p.property_ref)}`;
    body.append(link, el('div', p.address, 'city'), el('div', p.price.startsWith('€') ? p.price : '€ ' + p.price, 'price-line'), el('div', displayRef(p.features.referenceNumber), 'specs'));
    const specs = [p.features.bedrooms && `${p.features.bedrooms} slaapkamers`, p.features.livingArea && `${p.features.livingArea} m²`, p.features.epcLabel && `EPC ${p.features.epcLabel}`].filter(Boolean).join(' · ');
    body.append(el('div', specs, 'specs')); card.append(body); return card;
  }
  function renderDetail() {
    container.replaceChildren();
    const p = rows.find(p => p.property_ref === new URLSearchParams(location.search).get('ref'));
    if (!p) { message.textContent = 'Dit pand is niet (meer) gepubliceerd.'; return; }
    message.textContent = '';
    container.append(el('h1', p.title), el('p', p.address), el('p', p.price.startsWith('€') ? p.price : '€ ' + p.price, 'price'), el('p', displayRef(p.features.referenceNumber)));
    const gallery = el('div'); gallery.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px';
    for (const path of p.photo_paths) { const image = el('img'); image.alt = p.title; image.style.cssText='width:min(100%,420px);height:280px;object-fit:cover;border-radius:10px'; gallery.append(image); queueMicrotask(() => photo(path, image)); }
    container.append(gallery);
    const description = el('p', p.description); description.style.whiteSpace='pre-wrap'; container.append(description);
    const labels = {propertyType:'Type',buildingStyle:'Bebouwing',constructionYear:'Bouwjaar',renovationYear:'Renovatiejaar',livingArea:'Woonoppervlakte (m²)',plotArea:'Grondoppervlakte (m²)',bedrooms:'Slaapkamers',bathrooms:'Badkamers',toilets:'Toiletten',garageCount:'Garages',parkingSpaces:'Parkeerplaatsen',terrace:'Terras',garden:'Tuin',balcony:'Balkon',elevator:'Lift',furnished:'Bemeubeld',epcLabel:'EPC-label',epcScore:'EPC-score',heating:'Verwarming',glazing:'Beglazing',solarPanels:'Zonnepanelen',availability:'Beschikbaarheid',buildingCondition:'Staat',mandatoryRenovation:'Renovatieverplichting',floodPScore:'P-score',floodGScore:'G-score'};
    const table = el('table',null,'facts');
    for (const [k,v] of Object.entries(p.features)) if (labels[k] && String(v).trim()) { const tr=el('tr'); tr.append(el('td',labels[k]),el('td',String(v))); table.append(tr); }
    container.append(table);
  }
  function render() {
    urls.forEach(URL.revokeObjectURL); urls=[];
    const globalStar = document.querySelector('.hero-fav-link'); if (globalStar) { globalStar.classList.toggle('has-favorites', favorites().length > 0); globalStar.textContent = favorites().length ? '★' : '☆'; }
    if (page === 'pand.html') { renderDetail(); return; }
    let filtered = rows.filter(match);
    if (field('sort') === 'low') filtered.sort((a,b) => amount(a.price)-amount(b.price));
    if (field('sort') === 'high') filtered.sort((a,b) => amount(b.price)-amount(a.price));
    container.replaceChildren(...filtered.map(renderCard));
    if (message) message.textContent = filtered.length ? '' : rows.length ? 'Geen gepubliceerde panden gevonden voor deze selectie.' : 'Nog geen panden gepubliceerd vanuit Management.';
    const count=document.getElementById('count'); if(count) count.textContent=filtered.length+' panden gevonden';
    const empty=document.getElementById('empty'); if(empty) empty.hidden=true;
  }
  async function load() {
    if (loading) return; loading=true;
    try {
      const response = await fetch(`${base}/rest/v1/office_test_website_listings?organization_id=eq.${org}&select=*&order=published_at.desc`, {headers,cache:'no-store'});
      if (!response.ok) throw Error(); rows = await response.json(); render();
    } catch (_) { container.replaceChildren(); if(message) message.textContent='Het aanbod kan momenteel niet worden geladen. Probeer opnieuw.'; }
    finally { loading=false; }
  }
  if (!container) return;
  try { localStorage.removeItem('vanwelden-test-favorieten'); } catch (_) {}
  const search=document.getElementById('search'); if(search) { if(search.tagName==='FORM') search.onsubmit=e=>{e.preventDefault();render();}; else search.onclick=render; }
  document.querySelectorAll('.filters select,.filters input').forEach(n=>n.addEventListener('change',render));
  for(const [button,direction] of [['previous',-1],['following',1],['prev',-1],['next',1]]) { const b=document.getElementById(button); if(b) b.onclick=()=>container.scrollBy({left:direction*container.clientWidth*.85,behavior:'smooth'}); }
  const map=document.getElementById('map'); if(map) map.onclick=()=>{ message.textContent='Kaartweergave is nog niet beschikbaar in deze test.'; };
  window.addEventListener('storage',render);
  load(); setInterval(()=>{if(!document.hidden)load();},60000);
})();
