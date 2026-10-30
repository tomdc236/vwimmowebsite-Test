'use strict';
(()=>{
 const base='https://wjyovcwtvswwplitphaw.supabase.co',key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeW92Y3d0dnN3d3BsaXRwaGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMDM0MTQsImV4cCI6MjEwNzU3OTQxNH0.p9nFqvilHYtVmseygTArQGMoYVz7e1SQoyxSEinrlKM';
 const headers={apikey:key,Authorization:'Bearer '+key};
 const form=document.getElementById('office-contact-form'),note=document.getElementById('contact-form-status');
 if(!form||!note)return;
 const button=form.querySelector('button[type=submit]'),kind=form.dataset.kind;
 let ready=false,sending=false,lastPayload='',requestId=null;
 async function load(){
  try{
   const response=await fetch(base+'/functions/v1/website-enquiry?kind='+encodeURIComponent(kind),{headers,cache:'no-store'});
   const contact=await response.json();if(!response.ok)throw Error();
   const name=document.getElementById('office-contact-name'),email=document.getElementById('office-contact-email'),phone=document.getElementById('office-contact-phone');
   if(name)name.textContent=contact.name;
   if(email){email.textContent=contact.email;if(contact.email)email.href='mailto:'+encodeURIComponent(contact.email);}
   if(phone){const value=String(contact.phone||''),test=['017482','018321','019243'].includes(value.replace(/[^0-9]/g,''));phone.textContent=value?'Telefoon: '+value+(test?' (fictief testnummer — bellen uitgeschakeld)':''):'Telefoonnummer nog niet ingesteld.';}
   ready=contact.mailReady===true;button.disabled=!ready;
   note.textContent=ready?'Uw aanvraag gaat naar de zaakvoerder.':'E-mailverzending is momenteel niet beschikbaar. Er wordt niets verstuurd.';
  }catch(_){note.textContent='Contactgegevens konden niet geladen worden. Vernieuw de pagina en probeer opnieuw.';}
 }
 form.onsubmit=async event=>{
  event.preventDefault();if(!ready||sending||!form.reportValidity())return;
  const fields=form.elements;
  const text=name=>fields.namedItem(name).value.trim();
  const message=kind==='valuation'?'Adres eigendom: '+text('propertyAddress')+'\n\n'+text('message'):text('message');
  const payload={kind,firstName:text('firstName'),lastName:text('lastName'),email:text('email'),phone:text('phone'),message,contactConsent:fields.namedItem('contactConsent').checked,privacyConsent:fields.namedItem('privacyConsent').checked};
  const serialized=JSON.stringify(payload);if(serialized!==lastPayload||!requestId){requestId=crypto.randomUUID();lastPayload=serialized;}payload.requestId=requestId;
  sending=true;button.disabled=true;note.textContent='Uw aanvraag wordt verzonden…';
  try{
   const response=await fetch(base+'/functions/v1/website-enquiry',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const result=await response.json();if(!response.ok||result.sent!==true)throw Error(result.error||'Verzenden is niet bevestigd.');
   note.textContent='Gmail heeft uw aanvraag aanvaard voor verzending. De zaakvoerder neemt contact met u op.';form.reset();requestId=null;
  }catch(error){note.textContent=(error.message||'Verzenden is niet bevestigd.')+' Uw formulier blijft ingevuld.';}
  finally{sending=false;button.disabled=!ready;}
 };
 load();
})();