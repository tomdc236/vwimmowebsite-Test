const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(__dirname+'/test-listings.js','utf8');
class Node { constructor(tag='DIV'){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.classList={toggle(){}};this.isConnected=true;this.value='';this.textContent='';this.attributes={};this.events={};} append(...a){this.children.push(...a)} prepend(...a){this.children.unshift(...a)} replaceChildren(...a){this.children=a} setAttribute(k,v){this.attributes[k]=v} addEventListener(k,v){this.events[k]=v} scrollBy(){} scrollTo({left}){this.scrollLeft=left;this.events.scroll?.();} scrollIntoView(){} focus(){} reportValidity(){return true} reset(){this.wasReset=true} }
async function run(page,data,query='',options={}) {
 const nodes={listing:new Node(), 'publication-message':new Node(),count:new Node(),empty:new Node(),query:new Node('input')};nodes.query.value=query;
 const storage={},calls=[];let interval;
 const ctx={document:{hidden:false,getElementById:id=>nodes[id],createElement:tag=>new Node(tag),createTextNode:text=>Object.assign(new Node('#text'),{textContent:text}),querySelector:()=>null,querySelectorAll:()=>[]},location:{pathname:'/'+page,search:'?ref=TEST-0001'},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]},window:{addEventListener(){}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},URLSearchParams,crypto:require('node:crypto').webcrypto,queueMicrotask,fetch:async(url,init)=>{calls.push({url,init});return {ok:!(options.sendFail&&init?.method==='POST'),json:async()=>url.includes('/functions/v1/')?(init?.method==='POST'?(options.sendFail?{error:'Niet bevestigd'}:{sent:true}):{name:'Jan Test',phone:options.noPhone?'':(options.phone||'+32 400 00 00 02'),email:'staff@example.invalid',mailReady:options.mailReady!==false}):data}},setInterval:cb=>interval=cb};
 vm.runInNewContext(code,ctx);await new Promise(setImmediate);return {nodes,storage,interval,calls};
}
const row={organization_id:'org',property_ref:'TEST-0001',title:'<img src=x onerror=alert(1)>',address:'Teststraat Gent',price:'248.000',status:'Te koop',features:{referenceNumber:'VI.TK.00001',propertyType:'Villa'},photo_paths:[],description:'Openbaar'};
(async()=>{
 let r=await run('index.html',[]);assert.equal(r.nodes.listing.children.length,0);assert.match(r.nodes['publication-message'].textContent,/Nog geen/);
 r=await run('te-koop.html',[row]);assert.equal(r.nodes.listing.children.length,1);assert.equal(r.nodes.listing.children[0].children[1].children[0].textContent,row.title);assert.equal(r.nodes.listing.children[0].children[1].children[3].textContent,'VI.TK.0001');
 r=await run('te-huur.html',[row]);assert.equal(r.nodes.listing.children.length,0);
 r=await run('index.html',[row],'nietgevonden');assert.equal(r.nodes.listing.children.length,0);
 r=await run('pand.html',[]);assert.match(r.nodes['publication-message'].textContent,/niet \(meer\)/);
 r=await run('pand.html',[row]);assert.equal(r.nodes.listing.children.find(n=>n.tagName==='H1').textContent,row.title);
 r=await run('favorieten.html',[row]);assert.equal(r.nodes.listing.children.length,0);
 for (const [status,label] of [['Verkocht','Verkocht'],['Verhuurd','Verhuurd'],['Onder optie','In optie'],['In optie','In optie']]) {
  r=await run(/Verkocht|Verhuurd/.test(status)?'referenties.html':'index.html',[{...row,status}]);
  const ribbon=r.nodes.listing.children[0].children[0].children.find(n=>n.className==='property-status-ribbon');assert.equal(ribbon.textContent,label);
 }
 r=await run('index.html',[row]);assert.equal(r.nodes.listing.children[0].children[0].children.filter(n=>n.className==='property-status-ribbon').length,0);
 const featureRow={...row,price:'',features:{representativeName:'Jan Test',petsAllowed:'Neen',roomLayoutV1:JSON.stringify([{floor:'Verdieping 2',name:'Keuken',area:'7,5'}]),epcLabel:'C',constructionYear:'  ',urbanViolationSummons:'Niet ingegeven'},document_paths:[]};
 r=await run('pand.html',[featureRow]);
 const sections=r.nodes.listing.children.find(n=>n.className==='property-characteristics');
 const titles=sections.children.filter(n=>n.tagName==='DETAILS').map(n=>n.children[0].textContent);
 assert(titles.includes('Vertegenwoordiger'));assert(titles.includes('Bebouwing'));assert(titles.includes('Indeling'));assert(titles.includes('EPC gegevens'));assert(!titles.includes('Financiële info'));assert(!titles.includes('Ruimtelijke ordening'));assert(!titles.includes('Downloads'));
 const allText=n=>[n.textContent,...n.children.map(allText)].join(' ');assert.match(allText(sections),/Neen/);assert.match(allText(sections),/Verdieping 2/);assert.match(allText(sections),/7,5 m²/);
 // Both actions remain mounted below the property, and reveal the existing form.
 let actions=r.nodes.listing.children.find(n=>n.className==='property-contact-actions');
 assert.deepEqual(actions.children.map(n=>n.textContent),['Bellen','Meer info']);assert.equal(actions.children[0].href,'tel:+32400000002');
 let enquiry=r.nodes.listing.children.find(n=>n.id==='property-enquiry');assert.equal(enquiry.hidden,true);actions.children[1].onclick();assert.equal(enquiry.hidden,false);
 let form=enquiry.children.find(n=>n.tagName==='FORM'),grid=form.children[0];
 for(const [i,value] of ['Jan','Bezoeker','visitor@example.invalid','+32 400 00 00 03'].entries())grid.children[i].children[0].value=value;
 form.children[1].children[0].value='Meer informatie graag.';form.children[2].children[0].checked=true;form.children[3].children[0].checked=true;
 await form.onsubmit({preventDefault(){}});assert.equal(form.wasReset,true);
 const request=r.calls.find(c=>c.init?.method==='POST');const payload=JSON.parse(request.init.body);assert.equal(payload.propertyRef,row.property_ref);assert.equal(payload.email,'visitor@example.invalid');assert.equal(payload.to,undefined);
 r=await run('pand.html',[row],'',{noPhone:true,mailReady:false});actions=r.nodes.listing.children.find(n=>n.className==='property-contact-actions');assert.equal(actions.children.length,2);assert.equal(actions.children[0].attributes['aria-disabled'],'true');
 enquiry=r.nodes.listing.children.find(n=>n.id==='property-enquiry');form=enquiry.children.find(n=>n.tagName==='FORM');assert.equal(form.children.at(-1).disabled,true);
 r=await run('pand.html',[row],'',{sendFail:true});enquiry=r.nodes.listing.children.find(n=>n.id==='property-enquiry');form=enquiry.children.find(n=>n.tagName==='FORM');grid=form.children[0];for(const n of grid.children)n.children[0].value='Test';form.children[1].children[0].value='Test';await form.onsubmit({preventDefault(){}});assert.notEqual(form.wasReset,true);assert.equal(form.children.at(-2).textContent,'Niet bevestigd');
 for(const phone of ['017482','018321','019243']) {
  r=await run('pand.html',[row],'',{phone});actions=r.nodes.listing.children.find(n=>n.className==='property-contact-actions');
  assert.equal(actions.children[0].attributes['aria-disabled'],'true');assert(!actions.children[0].href.startsWith('tel:'));
  actions.children[0].onclick({preventDefault(){}});enquiry=r.nodes.listing.children.find(n=>n.id==='property-enquiry');form=enquiry.children.find(n=>n.tagName==='FORM');assert.match(form.children.at(-2).textContent,/fictief testnummer/);
 }
 const css=fs.readFileSync(__dirname+'/property-characteristics.css','utf8');assert.match(css,/\.property-contact-actions\{position:fixed/);assert.match(css,/safe-area-inset-bottom/);

 // Gallery: buttons, native horizontal scroll and keyboard share the same index.
 r=await run('pand.html',[{...row,photo_paths:['a.jpg','b.jpg','c.jpg']}]);
 let gallery=r.nodes.listing.children.find(n=>n.className==='property-gallery');
 let track=gallery.children[0],controls=gallery.children[1];
 track.clientWidth=360;track.scrollLeft=0;
 assert.equal(track.children.length,3);
 assert.equal(controls.children[1].textContent,'1 / 3');
 assert.equal(controls.children[0].disabled,true);
 controls.children[2].onclick();assert.equal(track.scrollLeft,360);assert.equal(controls.children[1].textContent,'2 / 3');
 controls.children[2].onclick();assert.equal(track.scrollLeft,720);assert.equal(controls.children[2].disabled,true);
 track.scrollLeft=0;track.events.scroll();assert.equal(controls.children[1].textContent,'1 / 3');
 let prevented=false;track.events.keydown({key:'ArrowRight',preventDefault(){prevented=true;}});assert(prevented);assert.equal(track.scrollLeft,360);
 controls.children[0].onclick();assert.equal(track.scrollLeft,0);
 controls.children[0].onclick();assert.equal(track.scrollLeft,0);
 r=await run('pand.html',[{...row,photo_paths:['only.jpg']}]);gallery=r.nodes.listing.children.find(n=>n.className==='property-gallery');assert.equal(gallery.children.length,1);
 r=await run('pand.html',[row]);gallery=r.nodes.listing.children.find(n=>n.className==='property-gallery');assert.match(gallery.children[0].textContent,/Nog geen openbare foto/);

 console.log('Website checks passed: status ribbons, sections, rooms, explicit Neen, empty suppression and safe text rendering');
})().catch(e=>{console.error(e);process.exitCode=1});
