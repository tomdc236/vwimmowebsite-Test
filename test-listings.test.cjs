const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(__dirname+'/test-listings.js','utf8');
class Node { constructor(tag='DIV'){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.classList={toggle(){}};this.isConnected=true;this.value='';this.textContent='';} append(...a){this.children.push(...a)} replaceChildren(...a){this.children=a} setAttribute(){} addEventListener(){} scrollBy(){} }
async function run(page,data,query='') {
 const nodes={listing:new Node(), 'publication-message':new Node(),count:new Node(),empty:new Node(),query:new Node('input')};nodes.query.value=query;
 const storage={};let interval;
 const ctx={document:{hidden:false,getElementById:id=>nodes[id],createElement:tag=>new Node(tag),querySelector:()=>null,querySelectorAll:()=>[]},location:{pathname:'/'+page,search:'?ref=TEST-0001'},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]},window:{addEventListener(){}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},URLSearchParams,queueMicrotask,fetch:async()=>({ok:true,json:async()=>data}),setInterval:cb=>interval=cb};
 vm.runInNewContext(code,ctx);await new Promise(setImmediate);return {nodes,storage,interval};
}
const row={organization_id:'org',property_ref:'TEST-0001',title:'<img src=x onerror=alert(1)>',address:'Teststraat Gent',price:'248.000',status:'Te koop',features:{referenceNumber:'VI.TK.00001',propertyType:'Villa'},photo_paths:[],description:'Openbaar'};
(async()=>{
 let r=await run('index.html',[]);assert.equal(r.nodes.listing.children.length,0);assert.match(r.nodes['publication-message'].textContent,/Nog geen/);
 r=await run('te-koop.html',[row]);assert.equal(r.nodes.listing.children.length,1);assert.equal(r.nodes.listing.children[0].children[1].children[0].textContent,row.title);assert.equal(r.nodes.listing.children[0].children[1].children[3].textContent,'VI.TK.0001');
 r=await run('te-huur.html',[row]);assert.equal(r.nodes.listing.children.length,0);
 r=await run('index.html',[row],'nietgevonden');assert.equal(r.nodes.listing.children.length,0);
 r=await run('pand.html',[]);assert.match(r.nodes['publication-message'].textContent,/niet \(meer\)/);
 r=await run('pand.html',[row]);assert.equal(r.nodes.listing.children[0].textContent,row.title);
 r=await run('favorieten.html',[row]);assert.equal(r.nodes.listing.children.length,0);
 console.log('7 website behavior checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
