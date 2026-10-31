'use strict';
(() => {
  const base = 'https://wjyovcwtvswwplitphaw.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeW92Y3d0dnN3d3BsaXRwaGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMDM0MTQsImV4cCI6MjEwNzU3OTQxNH0.p9nFqvilHYtVmseygTArQGMoYVz7e1SQoyxSEinrlKM'; // Public anon key; all access is restricted by RLS.
  const org = '6cdddfe2-52a3-43fa-93ed-1a36e8bbef84';
  const headers = {apikey: key, Authorization: `Bearer ${key}`};
  const page = location.pathname.split('/').pop() || 'index.html';
  const container = document.getElementById('listing') || document.getElementById('track');
  const message = document.getElementById('publication-message');
  let rows = [], urls = [], loading = false, enquiryDirty = false;
  const favoriteKey = 'vanwelden-test-favorite-ids-v2';
  function favorites() { try { const a = JSON.parse(localStorage.getItem(favoriteKey) || '[]'); return Array.isArray(a) ? a.filter(v => typeof v === 'string') : []; } catch (_) { return []; } }
  function saveFavorites(ids) { try { localStorage.setItem(favoriteKey, JSON.stringify(ids)); } catch (_) { if (message) message.textContent = 'Favorieten konden niet worden opgeslagen op dit toestel.'; } }
  function id(p) { return `${p.organization_id}/${p.property_ref}`; }
  function el(tag, text, cls) { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
  function field(name) { const n = document.getElementById(name); return n && 'value' in n ? n.value.trim() : ''; }
  function amount(s) { const n = String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'); return Number(n) || 0; }
  function displayRef(s) { return String(s || '').replace(/\.(\d{5})$/, (_, n) => '.' + String(Number(n)).padStart(4, '0')); }
  function statusLabel(status) { return ({verkocht:'Verkocht',verhuurd:'Verhuurd','onder optie':'In optie','in optie':'In optie'})[String(status || '').trim().toLowerCase()] || null; }
  function statusRibbon(p) {
    const label = statusLabel(p.status); if (!label) return null;
    const ribbon = el('span', label, 'property-status-ribbon');
    ribbon.style.cssText='position:absolute;left:-15%;top:44%;width:130%;background:rgba(255,98,108,.80);color:white;text-align:center;font-size:clamp(14px,3vw,34px);font-weight:800;padding:7px 0;transform:rotate(-20deg);pointer-events:none;z-index:2;line-height:1.2';
    return ribbon;
  }
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
    visual.style.position = 'relative'; visual.style.overflow = 'hidden';
    const photoLink = el('a', null, 'property-photo-link');
    photoLink.href = `pand.html?ref=${encodeURIComponent(p.property_ref)}`;
    photoLink.setAttribute('aria-label', 'Bekijk pand: ' + p.title);
    photoLink.style.cssText = 'display:block;width:100%;height:100%';
    visual.append(photoLink);
    if (p.photo_paths.length) { const img = el('img'); img.alt = p.title; img.style.cssText = 'width:100%;height:100%;object-fit:cover'; photoLink.append(img); queueMicrotask(() => photo(p.photo_paths[0], img)); }
    else photoLink.append(el('span', 'Nog geen openbare foto'));
    visual.append(el('span', p.status === 'Onder optie' ? 'In optie' : p.status, 'tag'));
    const ribbon = statusRibbon(p); if (ribbon) visual.append(ribbon);
    const star = el('button', favorites().includes(id(p)) ? '★' : '☆', 'heart'); star.type = 'button'; star.setAttribute('aria-label', 'Favoriet wijzigen');
    star.classList.toggle('on', favorites().includes(id(p)));
    star.onclick = () => { const ids = favorites(); saveFavorites(ids.includes(id(p)) ? ids.filter(v => v !== id(p)) : [...ids,id(p)]); render(); };
    visual.append(star); card.append(visual);
    const body = el('div', null, 'property-body'), link = el('a', p.title); link.href = `pand.html?ref=${encodeURIComponent(p.property_ref)}`;
    body.append(link, el('div', p.address, 'city')); if(filled(p.price)) body.append(el('div',p.price.startsWith('€')?p.price:'€ '+p.price,'price-line')); body.append(el('div',displayRef(p.features.referenceNumber),'specs'));
    const specs = [p.features.bedrooms && `${p.features.bedrooms} slaapkamers`, p.features.livingArea && `${p.features.livingArea} m²`, p.features.epcLabel && `EPC ${p.features.epcLabel}`].filter(Boolean).join(' · ');
    body.append(el('div', specs, 'specs')); card.append(body); return card;
  }
  const characteristicSections = [{"title": "Vertegenwoordiger", "fields": [{"key": "representativeName", "label": "Naam", "kind": "text"}, {"key": "representativePhone", "label": "GSM", "kind": "text"}, {"key": "representativeEmail", "label": "E-mail", "kind": "text"}]}, {"title": "Bebouwing", "fields": [{"key": "propertyFloor", "label": "Verdieping", "kind": "text"}, {"key": "buildingStyle", "label": "Bebouwing", "kind": "selection"}, {"key": "constructionYear", "label": "Bouwjaar", "kind": "integer"}, {"key": "renovationYear", "label": "Renovatiejaar", "kind": "integer"}, {"key": "buildingCondition", "label": "Algemene staat", "kind": "selection"}, {"key": "availability", "label": "Beschikbaar vanaf", "kind": "text"}, {"key": "furnished", "label": "Bemeubeld", "kind": "selection"}, {"key": "petsAllowed", "label": "Huisdieren toegestaan", "kind": "selection"}, {"key": "gardenOrientation", "label": "Oriëntatie tuin", "kind": "selection"}, {"key": "electricalInstallation", "label": "Elektriciteitscertificaat", "kind": "selection"}, {"key": "elevator", "label": "Lift", "kind": "selection"}]}, {"title": "Financiële info", "fields": [{"key": "cadastralIncome", "label": "Kadastraal inkomen (€)", "kind": "decimal"}, {"key": "commonCharges", "label": "Gemeenschappelijke kosten (€ per maand)", "kind": "decimal"}, {"key": "rentalDeposit", "label": "Huurwaarborg (€)", "kind": "decimal"}, {"key": "vatApplicable", "label": "BTW van toepassing", "kind": "selection"}, {"key": "rentExcludesCharges", "label": "Huurprijs exclusief lasten", "kind": "selection"}]}, {"title": "Comfort", "fields": [{"key": "glazing", "label": "Beglazing", "kind": "selection"}, {"key": "kitchen", "label": "Keuken", "kind": "selection"}, {"key": "heating", "label": "Verwarming", "kind": "selection"}, {"key": "gasConnection", "label": "Aardgas", "kind": "selection"}, {"key": "electricityConnection", "label": "Elektriciteit", "kind": "selection"}, {"key": "internet", "label": "Internet", "kind": "selection"}, {"key": "intercom", "label": "Parlofoon", "kind": "selection"}, {"key": "sewerConnection", "label": "Riolering", "kind": "selection"}, {"key": "waterConnection", "label": "Stadswater", "kind": "selection"}, {"key": "telephoneConnection", "label": "Telefoon", "kind": "selection"}, {"key": "heatPump", "label": "Warmtepomp", "kind": "selection"}, {"key": "cableTv", "label": "Distributie", "kind": "selection"}, {"key": "solarPanels", "label": "Zonnepanelen", "kind": "selection"}, {"key": "insulation", "label": "Isolatie", "kind": "text"}, {"key": "ventilation", "label": "Ventilatie", "kind": "selection"}, {"key": "airConditioning", "label": "Airconditioning", "kind": "selection"}]}, {"title": "Oppervlaktes en afmetingen", "fields": [{"key": "plotArea", "label": "Totale opp. grond (m²)", "kind": "decimal"}, {"key": "livingArea", "label": "Bewoonbare opp. (m²)", "kind": "decimal"}, {"key": "gardenArea", "label": "Tuinoppervlakte (m²)", "kind": "decimal"}, {"key": "terraceArea", "label": "Terrasoppervlakte (m²)", "kind": "decimal"}]}, {"title": "Indeling", "fields": [{"key": "bedrooms", "label": "Slaapkamers", "kind": "integer"}, {"key": "bathrooms", "label": "Badkamers", "kind": "integer"}, {"key": "toilets", "label": "Toiletten", "kind": "integer"}, {"key": "livingRoom", "label": "Woonkamer", "kind": "selection"}, {"key": "diningRoom", "label": "Eetkamer", "kind": "selection"}, {"key": "storageRoom", "label": "Berging", "kind": "selection"}, {"key": "basement", "label": "Kelder", "kind": "selection"}, {"key": "attic", "label": "Zolder", "kind": "selection"}, {"key": "garage", "label": "Garage", "kind": "selection"}, {"key": "parkingSpaces", "label": "Aantal parkeerplaatsen", "kind": "integer"}, {"key": "terrace", "label": "Terras", "kind": "selection"}, {"key": "garden", "label": "Tuin", "kind": "selection"}, {"key": "balcony", "label": "Balkon", "kind": "selection"}, {"key": "dressing", "label": "Dressing", "kind": "selection"}, {"key": "veranda", "label": "Veranda", "kind": "selection"}, {"key": "livingRoomArea", "label": "Oppervlakte woonkamer (m²)", "kind": "decimal"}, {"key": "diningRoomArea", "label": "Oppervlakte eetkamer (m²)", "kind": "decimal"}, {"key": "kitchenArea", "label": "Oppervlakte keuken (m²)", "kind": "decimal"}, {"key": "showerCabins", "label": "Aantal douchecabines", "kind": "integer"}, {"key": "garageCount", "label": "Aantal garages", "kind": "integer"}]}, {"title": "Ruimtelijke ordening", "fields": [{"key": "floodSensitivityType", "label": "Overstromingsgevoeligheid", "kind": "selection"}, {"key": "designatedFloodArea", "label": "Afgebakende zone", "kind": "selection"}, {"key": "urbanDestination", "label": "Stedenbouwkundige bestemming", "kind": "text"}, {"key": "urbanViolationSummons", "label": "Dagvaarding voor stedenbouwkundige overtreding", "kind": "selection"}, {"key": "recoveryMeasure", "label": "Rechterlijke of bestuurlijke herstelmaatregel", "kind": "selection"}, {"key": "buildingPermit", "label": "Bouwvergunning", "kind": "selection"}, {"key": "subdivisionPermit", "label": "Verkavelingsvergunning", "kind": "selection"}, {"key": "preemptionRight", "label": "Voorkooprecht", "kind": "selection"}, {"key": "protectedHeritage", "label": "Beschermd erfgoed", "kind": "selection"}, {"key": "mandatoryRenovation", "label": "Renovatieplicht", "kind": "selection"}, {"key": "flemishMeasuresRegisterConsulted", "label": "Maatregelenregister", "kind": "selection"}, {"key": "planningRegisterDestination", "label": "Bestemming volgens plannenregister", "kind": "text"}, {"key": "urbanPlanning", "label": "Stedenbouwkundige informatie", "kind": "text"}, {"key": "floodPScore", "label": "Overstroming P-score", "kind": "selection"}, {"key": "floodGScore", "label": "Overstroming G-score", "kind": "selection"}, {"key": "asBuiltCertificate", "label": "As-builtattest", "kind": "selection"}]}, {"title": "EPC gegevens", "fields": [{"key": "epcScore", "label": "EPC (kWh/m²/jaar)", "kind": "decimal"}, {"key": "epcCertificateCode", "label": "EPC ref.", "kind": "text"}, {"key": "epcLabel", "label": "EPC-label", "kind": "selection"}]}, {"title": "Downloads", "fields": []}];
  function filled(value) { return !['','niet ingevuld','niet ingegeven'].includes(String(value ?? '').trim().toLowerCase()); }
  function publicRow(table, label, value) {
    if (!filled(value)) return;
    const tr=el('tr'); tr.append(el('td',label),el('td',String(value))); table.append(tr);
  }
  function epcBadge(label) {
    const badge=el('span',null,'epc-badge'); badge.setAttribute('aria-label','EPC-label '+label);
    const colors={'A+':'#3b9553',A:'#3b9553',B:'#96af30',C:'#e0cb18',D:'#e4a126',E:'#d96d24',F:'#c63c38'};
    for(const [text,color] of [['EPC','#28576c'],[label,colors[String(label).toUpperCase()]||'#777']]) {
      const part=el('span',text); part.style.cssText=`display:inline-block;background:${color};color:white;padding:5px 18px;font-weight:bold;font-size:22px;clip-path:polygon(0 0,86% 0,100% 50%,86% 100%,0 100%,10% 50%)`;badge.append(part);
    }
    return badge;
  }
  async function downloadDocument(path,label,button) {
    button.disabled=true;
    try {
      const response=await fetch(base+'/storage/v1/object/authenticated/vw-team-properties-test/'+path.split('/').map(encodeURIComponent).join('/'),{headers,cache:'no-store'});
      if(!response.ok) throw Error();
      const blob=await response.blob(); if(!blob.type.includes('pdf')) throw Error();
      const url=URL.createObjectURL(blob);urls.push(url);
      const link=el('a');link.href=url;link.download=String(label).replace(/[\\/]/g,'-').slice(0,100)+(String(label).toLowerCase().endsWith('.pdf')?'':'.pdf');document.body.append(link);link.click();link.remove();
    } catch (_) { button.textContent='Document niet beschikbaar — opnieuw proberen'; }
    finally {button.disabled=false;}
  }
  function renderCharacteristics(p) {
    const section=el('section',null,'property-characteristics');section.append(el('h2','Kenmerken'));
    let rooms=[];try {const parsed=JSON.parse(p.features.roomLayoutV1||'[]');if(Array.isArray(parsed)) rooms=parsed.filter(r=>r&&filled(r.floor)&&filled(r.name));} catch (_) {}
    for(const group of characteristicSections) {
      const details=el('details'),summary=el('summary',group.title),table=el('table',null,'facts');
      details.append(summary);let content=false;
      if(group.title==='Financiële info'&&filled(p.price)) {publicRow(table,'Prijs',p.price.startsWith('€')?p.price:'€ '+p.price);content=true;}
      if(group.title==='Indeling'&&rooms.length) {
        for(const floor of [...new Set(rooms.map(r=>r.floor))]) {
          const tr=el('tr'),th=el('th',floor);th.colSpan=2;th.style.cssText='text-align:left;padding-top:18px';tr.append(th);table.append(tr);
          for(const room of rooms.filter(r=>r.floor===floor)) {const row=el('tr');row.append(el('td',room.name),el('td',filled(room.area)?room.area+' m²':''));table.append(row);}
        }
        content=true;
      }
      for(const field of group.fields) {
        const value=p.features[field.key];if(!filled(value)) continue;
        if(field.key==='epcLabel') {const tr=el('tr'),td=el('td');td.append(epcBadge(String(value)));tr.append(el('td','Label'),td);table.append(tr);}
        else {const label=field.label.replace(/ \(m²\)| \(kWh\/m²\/jaar\)/g,'');const suffix=field.label.includes('(m²)')?' m²':field.key==='epcScore'?' kWh/m²/jaar':'';publicRow(table,label,String(value)+suffix);}
        content=true;
      }
      details.append(table);
      if(group.title==='Downloads') for(const [i,path] of (p.document_paths||[]).entries()) {
        const label=p.document_labels?.[path]||`Document ${i+1}.pdf`,button=el('button','📄 '+label,'btn');button.type='button';button.onclick=()=>downloadDocument(path,label,button);details.append(button);content=true;
      }
      if(content) section.append(details);
    }
    if(section.children.length>1) container.append(section);
  }
  function renderEnquiry(p) {
    const contact=p.websiteContact||{},section=el('section');
    section.id='property-enquiry';section.hidden=true;section.className='property-enquiry';section.append(el('h2','Ik wens meer informatie'));
    const form=el('form'),grid=el('div');grid.className='enquiry-grid';
    const inputs={};
    for(const [name,label,type] of [['firstName','Voornaam','text'],['lastName','Naam','text'],['email','E-mail','email'],['phone','Tel./GSM','tel']]) {
      const field=el('label',label+' *'),input=el('input');input.name=name;input.type=type;input.required=true;input.maxLength=name==='phone'?32:180;inputs[name]=input;field.append(input);grid.append(field);
    }
    form.append(grid);const label=el('label','Boodschap'),area=el('textarea');area.name='message';area.maxLength=2000;area.rows=4;label.append(area);form.append(label);
    const consent=[];
    for(const text of ['Mijn gegevens mogen gebruikt worden om mij te contacteren.','Ik ga akkoord met de gebruiksvoorwaarden en het privacybeleid.']) {const l=el('label'),box=el('input');box.type='checkbox';box.required=true;consent.push(box);l.className='enquiry-consent';l.append(box,document.createTextNode(' '+text));form.append(l);}
    const privacy=el('a','Privacy en gebruiksvoorwaarden');privacy.href='privacy.html';form.append(privacy);
    const note=el('p',contact.mailReady?'Uw aanvraag gaat naar '+contact.name+'.':'E-mailverzending is nog niet ingesteld. Er kan momenteel geen aanvraag worden verzonden.');note.setAttribute('role','status');note.setAttribute('aria-live','polite');form.append(note);
    const submit=el('button','Bericht verzenden','btn primary');submit.type='submit';submit.disabled=!contact.mailReady;form.append(submit);
    form.addEventListener('input',()=>{enquiryDirty=true;});
    let sending=false,requestId=null,lastPayload='';
    form.onsubmit=async e=>{
      e.preventDefault();if(sending||!form.reportValidity()||!contact.mailReady)return;
      const payload={propertyRef:p.property_ref,firstName:inputs.firstName.value.trim(),lastName:inputs.lastName.value.trim(),email:inputs.email.value.trim(),phone:inputs.phone.value.trim(),message:area.value,contactConsent:consent[0].checked,privacyConsent:consent[1].checked};
      const serialized=JSON.stringify(payload);if(serialized!==lastPayload||!requestId){requestId=crypto.randomUUID();lastPayload=serialized;}payload.requestId=requestId;
      sending=true;submit.disabled=true;note.textContent='Uw aanvraag wordt verzonden…';
      try {
        const response=await fetch(base+'/functions/v1/website-enquiry',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const result=await response.json();if(!response.ok||result.sent!==true)throw Error(result.error||'Verzenden niet bevestigd. Probeer opnieuw.');
        note.textContent='Uw aanvraag is door de maildienst aanvaard voor verzending. De verantwoordelijke neemt contact met u op.';form.reset();enquiryDirty=false;requestId=null;
      }catch(error){note.textContent=error.message||'Verzenden niet bevestigd. Uw formulier blijft ingevuld.';}
      finally{sending=false;submit.disabled=false;}
    };
    section.append(form);container.append(section);
    const actions=el('div',null,'property-contact-actions'),call=el('a','Bellen','btn primary');
    const phone=typeof contact.phone==='string'?contact.phone:'';
    const testPhone=['017482','018321','019243'].includes(phone.replace(/[^0-9]/g,''));
    if(!testPhone && /^\+?[0-9 ()/.-]{5,32}$/.test(phone)){call.href='tel:'+phone.replace(/[^+0-9]/g,'');call.setAttribute('aria-label','Bellen: '+phone);}
    else {call.setAttribute('aria-disabled','true');call.href='#property-enquiry';call.onclick=e=>{e.preventDefault();section.hidden=false;note.textContent=testPhone?'Dit is een fictief testnummer. Bellen is uitgeschakeld.':'Er is nog geen telefoonnummer ingesteld voor dit pand.';section.scrollIntoView({behavior:'smooth',block:'start'});};}
    const more=el('button','Meer info','btn primary');more.type='button';more.setAttribute('aria-controls','property-enquiry');more.setAttribute('aria-expanded','false');
    more.onclick=()=>{enquiryDirty=true;section.hidden=false;more.setAttribute('aria-expanded','true');section.scrollIntoView({behavior:'smooth',block:'start'});inputs.firstName.focus({preventScroll:true});};
    actions.append(call,more);container.append(actions);
  }

  let activeGalleryRef = '', activeGalleryIndex = 0;
  function renderGallery(p) {
    const paths = p.photo_paths || [];
    const gallery = el('section', null, 'property-gallery');
    gallery.setAttribute('role', 'region');
    gallery.setAttribute('aria-roledescription', 'carrousel');
    gallery.setAttribute('aria-label', 'Foto’s van ' + p.title);
    gallery.style.cssText = 'width:100%;max-width:960px;min-width:0;margin:20px 0';
    if (!paths.length) { gallery.append(el('p', 'Nog geen openbare foto')); return gallery; }
    if (activeGalleryRef !== p.property_ref) { activeGalleryRef = p.property_ref; activeGalleryIndex = 0; }
    activeGalleryIndex = Math.min(activeGalleryIndex, paths.length - 1);
    const track = el('div', null, 'property-gallery-track');
    track.tabIndex = 0;
    track.setAttribute('aria-label', 'Veeg naar links of rechts voor de volgende of vorige foto');
    track.style.cssText = 'display:flex;flex-wrap:nowrap;width:100%;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;border-radius:10px;background:#e8f3fc;-webkit-overflow-scrolling:touch';
    for (const [index, path] of paths.entries()) {
      const frame = el('div', null, 'property-gallery-slide');
      frame.style.cssText = 'position:relative;flex:0 0 100%;min-width:0;scroll-snap-align:start;scroll-snap-stop:always;overflow:hidden';
      const image = el('img');
      image.alt = p.title + ' — foto ' + (index + 1) + ' van ' + paths.length;
      image.draggable = false;
      image.style.cssText = 'display:block;width:100%;height:clamp(240px,55vw,520px);object-fit:contain';
      frame.append(image);
      if (index === 0) { const ribbon = statusRibbon(p); if (ribbon) frame.append(ribbon); }
      track.append(frame);
      queueMicrotask(() => photo(path, image));
    }
    const controls = el('div', null, 'property-gallery-controls');
    controls.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:20px;margin-top:10px';
    controls.hidden = paths.length < 2;
    const previous = el('button', '<'), next = el('button', '>'), counter = el('span');
    for (const [button, label] of [[previous, 'Vorige foto'], [next, 'Volgende foto']]) {
      button.type = 'button';
      button.setAttribute('aria-label', label);
      button.style.cssText = 'font-size:28px;font-weight:bold;width:48px;height:48px;border:1px solid #c6d2dc;border-radius:6px;background:white;color:#143249;cursor:pointer';
    }
    counter.setAttribute('role', 'status');
    counter.setAttribute('aria-live', 'polite');
    counter.style.cssText = 'min-width:80px;text-align:center';
    function update() {
      counter.textContent = (activeGalleryIndex + 1) + ' / ' + paths.length;
      previous.disabled = activeGalleryIndex === 0;
      next.disabled = activeGalleryIndex === paths.length - 1;
    }
    function move(direction) {
      activeGalleryIndex = Math.max(0, Math.min(paths.length - 1, activeGalleryIndex + direction));
      track.scrollTo({left: activeGalleryIndex * track.clientWidth, behavior: 'smooth'});
      update();
    }
    previous.onclick = () => move(-1);
    next.onclick = () => move(1);
    track.addEventListener('scroll', () => {
      if (!track.clientWidth) return;
      activeGalleryIndex = Math.max(0, Math.min(paths.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
      update();
    }, {passive: true});
    track.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    controls.append(previous, counter, next);
    gallery.append(track);
    if (paths.length > 1) gallery.append(controls);
    update();
    queueMicrotask(() => { if (track.isConnected) track.scrollLeft = activeGalleryIndex * track.clientWidth; });
    return gallery;
  }

  function renderDetail() {
    container.replaceChildren();
    const p = rows.find(p => p.property_ref === new URLSearchParams(location.search).get('ref'));
    if (!p) { message.textContent = 'Dit pand is niet (meer) gepubliceerd.'; return; }
    message.textContent = '';
    container.append(el('h1', p.title), el('p', p.address));
    if(filled(p.price)) container.append(el('p', p.price.startsWith('€') ? p.price : '€ '+p.price,'price'));
    if(filled(p.features.referenceNumber)) container.append(el('p',displayRef(p.features.referenceNumber)));
    container.append(renderGallery(p));
    const description = el('p', p.description); description.style.whiteSpace='pre-wrap'; container.append(description);
    const contact=p.websiteContact;
    renderCharacteristics(contact?{...p,features:{...p.features,representativeName:contact.name||'',representativePhone:contact.phone||'',representativeEmail:contact.email||''}}:p);
    renderEnquiry(p);
  }
  function render() {
    if (page === 'pand.html' && enquiryDirty) return;
    urls.forEach(URL.revokeObjectURL); urls=[];
    const globalStar = document.querySelector('.hero-fav-link'); if (globalStar) { globalStar.classList.toggle('has-favorites', favorites().length > 0); globalStar.textContent = favorites().length ? '★' : '☆'; }
    const topStar=document.querySelector('.topstar');if(topStar){topStar.setAttribute('aria-label','Favorieten');topStar.textContent=(favorites().length?'★':'☆')+' Favorieten'+(favorites().length?' ('+favorites().length+')':'');}
    if (page === 'pand.html') { renderDetail(); return; }
    let filtered = rows.filter(match);
    if (field('sort') === 'low') filtered.sort((a,b) => amount(a.price)-amount(b.price));
    if (field('sort') === 'high') filtered.sort((a,b) => amount(b.price)-amount(a.price));
    if(page==='index.html'||page==='home.html') filtered=filtered.filter(p=>kind(p)!=='reference').slice(0,3);
    container.replaceChildren(...filtered.map(renderCard));
    if (message) message.textContent = filtered.length ? '' : rows.length ? 'Geen gepubliceerde panden gevonden voor deze selectie.' : 'Nog geen panden gepubliceerd vanuit Management.';
    const count=document.getElementById('count'); if(count) count.textContent=filtered.length+' panden gevonden';
    const empty=document.getElementById('empty'); if(empty) empty.hidden=true;
  }
  async function load() {
    if (loading || (page === 'pand.html' && enquiryDirty)) return; loading=true;
    try {
      const response = await fetch(`${base}/rest/v1/office_test_website_listings?organization_id=eq.${org}&select=*&order=published_at.desc`, {headers,cache:'no-store'});
      if (!response.ok) throw Error(); rows = await response.json();
      if(page==='pand.html') {
        const p=rows.find(p=>p.property_ref===new URLSearchParams(location.search).get('ref'));
        if(p) {try {const r=await fetch(base+'/functions/v1/website-enquiry?ref='+encodeURIComponent(p.property_ref),{headers,cache:'no-store'});const c=await r.json();p.websiteContact=r.ok&&c&&typeof c.name==='string'?c:{};}catch(_){p.websiteContact={};}}
      }
      render();
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


