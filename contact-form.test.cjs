const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/contact-form.js','utf8');
async function setup(kind='general',options={}){
 const fields={};for(const name of ['firstName','lastName','email','phone','message','propertyAddress'])fields[name]={value:({firstName:'Jan',lastName:'Bezoeker',email:'visitor@example.invalid',phone:'018321',message:'Testvraag',propertyAddress:'Fictieve Teststraat 1'})[name]};
 fields.contactConsent={checked:true};fields.privacyConsent={checked:true};const button={},note={},calls=[];
 const form={dataset:{kind},elements:{namedItem:n=>fields[n]},querySelector:()=>button,reportValidity:()=>options.valid!==false,reset(){this.resetCalled=true;}};
 const nodes={'office-contact-form':form,'contact-form-status':note,'office-contact-name':{},'office-contact-email':{},'office-contact-phone':{}};
 vm.runInNewContext(code,{document:{getElementById:n=>nodes[n]},crypto:{randomUUID:()=> '11111111-2222-4333-8444-555555555555'},fetch:async(url,init)=>{calls.push({url,init});const post=init?.method==='POST';return {ok:!(post&&options.fail),json:async()=>post?(options.fail?{error:'Niet bevestigd'}:{sent:true}):{name:'Zaakvoerder',phone:'017482',email:'owner@example.invalid',mailReady:options.ready!==false}};}});
 await new Promise(setImmediate);return {form,note,button,calls,nodes};
}
(async()=>{
 let s=await setup();assert.equal(s.button.disabled,false);assert.match(s.nodes['office-contact-phone'].textContent,/bellen uitgeschakeld/);await s.form.onsubmit({preventDefault(){}});assert.equal(s.form.resetCalled,true);let sent=JSON.parse(s.calls.at(-1).init.body);assert.equal(sent.kind,'general');assert.equal(sent.email,'visitor@example.invalid');assert.equal(sent.to,undefined);
 s=await setup('valuation');await s.form.onsubmit({preventDefault(){}});sent=JSON.parse(s.calls.at(-1).init.body);assert.equal(sent.kind,'valuation');assert.match(sent.message,/Adres eigendom: Fictieve Teststraat 1/);
 s=await setup('general',{fail:true});await s.form.onsubmit({preventDefault(){}});assert.notEqual(s.form.resetCalled,true);assert.match(s.note.textContent,/formulier blijft ingevuld/);
 s=await setup('general',{ready:false});assert.equal(s.button.disabled,true);await s.form.onsubmit({preventDefault(){}});assert.equal(s.calls.length,1);
 s=await setup('general',{valid:false});await s.form.onsubmit({preventDefault(){}});assert.equal(s.calls.length,1);
 console.log('Contact form checks passed: correct route, valuation address, no client-selected recipient, no reset on error and no sending when unavailable or invalid.');
})().catch(e=>{console.error(e);process.exitCode=1});
