/* PGRI Sekotong 2026 — public & admin event application. Vanilla JS, no build dependencies. */
(() => {
'use strict';
const CATS=[
 {id:'futsal',name:'Futsal Putra',short:'Futsal',gender:'PUTRA',symbol:'⚽',art:'10',tag:'FUTSAL / PUTRA'},
 {id:'gobak',name:'Gobak Sodor Putri',short:'Gobak Sodor',gender:'PUTRI',symbol:'↗',art:'×',tag:'GOBAK SODOR / PUTRI'},
 {id:'tarik_putra',name:'Tarik Tambang Putra',short:'Tarik Tambang',gender:'PUTRA',symbol:'≋',art:'≋',tag:'TARIK TAMBANG / PUTRA'},
 {id:'tarik_putri',name:'Tarik Tambang Putri',short:'Tarik Tambang',gender:'PUTRI',symbol:'≋',art:'≋',tag:'TARIK TAMBANG / PUTRI'}
];
const DEFAULTS={event_name:'Pekan Olahraga Guru Sekotong 2026',registration_open:true,bank_name:'',bank_account:'',bank_holder:'',cash_instruction:'Pembayaran langsung melalui bendahara panitia.',ranting_options:'',contact:'',venue:'Sekotong, Lombok Barat',fee_futsal:'150000',fee_gobak:'100000',fee_tarik:'150000'};
const IS_DEMO=!!window.APP_DEMO_MODE;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const assetUrl=name=>(window.APP_ASSETS||{})[name]||'assets/'+name;
const e=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const catName=id=>CATS.find(c=>c.id===id)?.name||id;
const fmtMoney=v=>v!==null&&v!==undefined&&v!==''?(/^\d+$/.test(String(v))?'Rp '+new Intl.NumberFormat('id-ID').format(Number(v)):'Rp '+e(String(v))):'Belum ditetapkan';
const statusText=s=>s==='complete'?'SELESAI':s==='live'?'BERLANGSUNG':'BELUM DIMULAI';
const statuses={pending:'Belum lunas',paid:'Lunas'};
const opts='<option value="">Semua kategori</option>'+CATS.map(c=>`<option value="${c.id}">${e(c.name)}</option>`).join('');
const sports=[{id:'futsal',name:'Futsal Putra',subtitle:'1 tim putra',asset:'arena-futsal.webp',fee:'fee_futsal',categories:['futsal']},{id:'gobak',name:'Gobak Sodor Putri',subtitle:'1 tim putri',asset:'arena-gobak.webp',fee:'fee_gobak',categories:['gobak']},{id:'tarik',name:'Tarik Tambang',subtitle:'Paket 2 tim: putra + putri',asset:'arena-tarik.webp',fee:'fee_tarik',categories:['tarik_putra','tarik_putri']}];
const sportForCat=cat=>cat.startsWith('tarik')?'tarik':cat;
const selectedSports=()=>$$('#registerCategories input[name=sport]:checked').map(el=>el.value);
const groupPrice=(selected,settings)=>selected.reduce((sum,id)=>sum+Number(settings['fee_'+id]||0),0);
let rosterDrafts={};
let soundOn=false,audioContext=null;
function chirp(freq=620,ms=100,type='sine'){
 if(!soundOn)return;
 try{audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();
 const osc=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
 osc.type=type;osc.frequency.setValueAtTime(freq,now);gain.gain.setValueAtTime(.075,now);gain.gain.exponentialRampToValueAtTime(.001,now+ms/1000);
 osc.connect(gain).connect(audioContext.destination);osc.start(now);osc.stop(now+ms/1000+.02);
 }catch{}
}

let currentPage='beranda',drawCat='futsal',bracketCat='futsal',adminTab='teams',adminLogged=false,publicData=null,adminData=null,spinning=false,spinResult=null,toastTimer=null;
function notify(msg,isError=false){const t=$('#toast');t.textContent=msg;t.className='toast show'+(isError?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.className='toast',3700)}
const safeJson=async resp=>{const b=await resp.json().catch(()=>({ok:false,error:'Server tidak mengirim data JSON.'}));if(!resp.ok||b.ok===false)throw Error(b.error||'Permintaan gagal.');return b};
async function api(path,method='GET',payload=null){if(IS_DEMO)return demoApi(path,method,payload);const init={method,credentials:'same-origin',headers:{}};if(payload){init.headers['Content-Type']='application/json';init.body=JSON.stringify(payload)}return safeJson(await fetch('/api/'+path,init));}
const startDataset=()=>{
 const seed=['Ranting Contoh A','Ranting Contoh B','Ranting Contoh C','Ranting Contoh D','Ranting Contoh E','Ranting Contoh F','Ranting Contoh G'];
 const settings={...DEFAULTS,bank_name:'Bank Contoh',bank_account:'1234567890',bank_holder:'Bendahara Contoh (DEMO)',contact:'Isi kontak panitia di Pengaturan'};
 let nextId=1;const registrations=[],teams=[];
 seed.forEach((ranting,k)=>{
   const chosen=[...(k<6?['futsal']:[]),...(k<5?['gobak']:[]),'tarik_putra','tarik_putri'];
   const group={id:k+1,code:'SIMULASI-'+String(k+1).padStart(3,'0'),ranting,ranting_norm:ranting.toLowerCase(),total_amount:groupPrice([...new Set(chosen.map(sportForCat))],settings),contact:'',notes:'',payment_method:k%2?'transfer':'cash',payment_status:k%3===0?'paid':'pending',fees_snapshot:JSON.stringify({fee_futsal:settings.fee_futsal,fee_gobak:settings.fee_gobak,fee_tarik:settings.fee_tarik}),created_at:'2026-11-14'};
   registrations.push(group);
   chosen.forEach(category=>teams.push({...group,id:nextId++,group_id:group.id,category,participants:[`Nama Uji ${k+1}A`,`Nama Uji ${k+1}B`,`Nama Uji ${k+1}C`]}));
 });
 return {teams,registrations,settings,states:Object.fromEntries(CATS.map(c=>[c.id,'idle'])),slots:[],winners:[],details:[],nextId,nextGroupId:8};
};
let volatileDemo=null;
function getDemo(){try{const x=JSON.parse(localStorage.getItem('pgri81-demo-v3'));if(x?.teams&&x?.registrations&&x?.settings)return x}catch{}if(volatileDemo)return volatileDemo;const d=startDataset();saveDemo(d);return d}
function saveDemo(d){volatileDemo=d;try{localStorage.setItem('pgri81-demo-v3',JSON.stringify(d))}catch{}}
const demoPublic=d=>({ok:true,settings:d.settings,teams:d.teams.map(t=>({id:t.id,group_id:t.group_id,ranting:t.ranting,category:t.category,payment_status:t.payment_status,members_count:t.participants.length})),states:d.states,slots:d.slots,winners:d.winners,details:d.details||[],admin:false});
function syncDemoGroup(d,reg){d.teams.filter(t=>t.group_id===reg.id).forEach(t=>{Object.assign(t,{code:reg.code,ranting:reg.ranting,ranting_norm:reg.ranting_norm,total_amount:reg.total_amount,contact:reg.contact,notes:reg.notes,payment_method:reg.payment_method,payment_status:reg.payment_status})})}
async function demoApi(path,method='GET',b={}){
 const d=getDemo();if(path==='public')return demoPublic(d);
 if(path==='session')return {ok:true,admin:adminLogged||(()=>{try{return sessionStorage.getItem('pgri81-demo-admin')==='1'}catch{return false}})()};
 if(path==='login'){if(b.password!=='demo81')throw Error('Kata sandi demo: demo81');adminLogged=true;try{sessionStorage.setItem('pgri81-demo-admin','1')}catch{}return{ok:true}}
 if(path==='logout'){adminLogged=false;try{sessionStorage.removeItem('pgri81-demo-admin')}catch{}return{ok:true}}
 if(path==='admin'){if(!adminLogged)throw Error('Silakan masuk sebagai panitia.');return {...demoPublic(d),teams:d.teams,registrations:d.registrations,admin:true}}
 if(path==='register'){
  if(!d.settings.registration_open)throw Error('Pendaftaran ditutup.');
  if(d.registrations.some(r=>r.ranting_norm===b.ranting.trim().toLocaleLowerCase('id-ID')))throw Error('Ranting sudah terdaftar. Minta panitia memperbaiki data.');
  if(!Array.isArray(b.entries)||!b.entries.length)throw Error('Pilih cabang lomba.');
  const cats=b.entries.map(x=>x.category);
  if(new Set(cats).size!==cats.length||cats.includes('tarik_putra')!==cats.includes('tarik_putri'))throw Error('Tarik tambang adalah satu paket putra dan putri.');
  if(cats.some(c=>d.states[c]!=='idle'))throw Error('Undian cabang terpilih sudah dimulai.');
  b.entries.forEach(x=>{if(!x.participants?.length||x.participants.length>30)throw Error('Isi nama anggota untuk setiap tim.')});
  const reg={id:d.nextGroupId++,code:'SIM-'+Math.random().toString(36).slice(2,8).toUpperCase(),ranting:b.ranting.trim(),ranting_norm:b.ranting.trim().toLocaleLowerCase('id-ID'),contact:b.contact||'',notes:b.notes||'',payment_method:b.payment_method,payment_status:'pending',total_amount:groupPrice([...new Set(cats.map(sportForCat))],d.settings),fees_snapshot:JSON.stringify({fee_futsal:d.settings.fee_futsal,fee_gobak:d.settings.fee_gobak,fee_tarik:d.settings.fee_tarik}),created_at:new Date().toISOString()};
  d.registrations.push(reg);b.entries.forEach(x=>d.teams.push({...reg,id:d.nextId++,group_id:reg.id,category:x.category,participants:x.participants}));
  saveDemo(d);return{ok:true,code:reg.code,total_amount:reg.total_amount,categories:cats};
 }
 if(!adminLogged)throw Error('Masuk sebagai panitia dahulu.');
 if(path==='admin/settings'){Object.assign(d.settings,b)}
 else if(path==='admin/registration'){
  const reg=d.registrations.find(x=>x.id===Number(b.group_id));if(!reg)throw Error('Pendaftaran tidak ditemukan');
  reg.payment_status=b.payment_status;reg.payment_method=b.payment_method;syncDemoGroup(d,reg);
 }
 else if(path==='admin/team'){
  const t=d.teams.find(x=>x.id===Number(b.id));if(!t)throw Error('Tim tidak ditemukan');
  const reg=d.registrations.find(r=>r.id===t.group_id);
  if(d.states[t.category]==='idle'){t.participants=b.participants;}if(!d.teams.some(x=>x.group_id===t.group_id&&d.states[x.category]!=='idle')){reg.ranting=b.ranting;reg.ranting_norm=b.ranting.toLocaleLowerCase('id-ID');}
  for(const key of ['payment_status','payment_method','contact','notes'])if(key in b)reg[key]=b[key];syncDemoGroup(d,reg);
 }
 else if(path==='admin/delete-team'){
  const t=d.teams.find(x=>x.id===Number(b.id));if(!t)throw Error('Tim tidak ditemukan');if(d.states[t.category]!=='idle')throw Error('Reset undian sebelum menghapus tim.');d.teams=d.teams.filter(x=>x.id!==t.id);
  const reg=d.registrations.find(r=>r.id===t.group_id),left=d.teams.filter(x=>x.group_id===reg.id);
  if(!left.length)d.registrations=d.registrations.filter(r=>r.id!==reg.id);
  else {reg.total_amount=groupPrice([...new Set(left.map(t=>sportForCat(t.category)))],JSON.parse(reg.fees_snapshot||'{}'));syncDemoGroup(d,reg)}
 }
 else if(path==='admin/start-draw'){
  if(d.states[b.category]!=='idle')throw Error('Undian sudah dimulai');if(d.teams.filter(x=>x.category===b.category).length<2)throw Error('Minimal dua tim diperlukan');d.states[b.category]='live';
 }
 else if(path==='admin/next-draw'){
  if(d.states[b.category]!=='live')throw Error('Undian belum dimulai atau selesai.');
  const rest=d.teams.filter(x=>x.category===b.category&&!d.slots.some(s=>s.category===b.category&&s.team_id===x.id));
  const vals=new Uint32Array(1);try{crypto.getRandomValues(vals)}catch{vals[0]=Math.floor(Math.random()*4294967295)}
  const chosen=rest[vals[0]%rest.length];d.slots.push({category:b.category,team_id:chosen.id,draw_order:1+d.slots.filter(x=>x.category===b.category).length});
  if(rest.length===1)d.states[b.category]='complete';saveDemo(d);return{ok:true,chosen_team_id:chosen.id,complete:rest.length===1};
 }
 else if(path==='admin/reset-draw'){d.slots=d.slots.filter(s=>s.category!==b.category);d.winners=d.winners.filter(s=>s.category!==b.category);d.details=(d.details||[]).filter(s=>s.category!==b.category);d.states[b.category]='idle';}
 else if(path==='admin/match-details'){
  if(d.states[b.category]!=='complete')throw Error('Undian belum selesai.');
  if(!bracketFor(d,b.category)[b.round]?.[b.match_no])throw Error('Pertandingan tidak ditemukan.');
  d.details=(d.details||[]).filter(x=>!(x.category===b.category&&x.round===Number(b.round)&&x.match_no===Number(b.match_no)));
  d.details.push({category:b.category,round:Number(b.round),match_no:Number(b.match_no),day:b.day||'',time:b.time||'',field:b.field||'',score_a:b.score_a||'',score_b:b.score_b||'',note:b.note||''});
 }
 else if(path==='admin/winner'){
  const grid=bracketFor(d,b.category);const m=grid[Number(b.round)]?.[Number(b.match_no)];if(!m||!m.a||!m.b||![m.a,m.b].includes(Number(b.winner_id)))throw Error('Pertandingan/pemenang belum valid');
  d.winners=d.winners.filter(w=>w.category!==b.category || (w.round<Number(b.round)||w.round===Number(b.round)&&w.match_no!==Number(b.match_no)));
  d.winners.push({category:b.category,round:Number(b.round),match_no:Number(b.match_no),winner_team_id:Number(b.winner_id)});
 }
 else throw Error('Aksi demo tidak dikenal: '+path);
 saveDemo(d);return{ok:true};
}
function findTeam(id){return (publicData?.teams||[]).find(t=>t.id===id)}
function seedOrder(size){let n=[1,2];while(n.length<size){const x=n.length*2+1;n=n.flatMap(k=>[k,x-k])}return n}
function bracketFor(data,category){
 const slots=data.slots.filter(s=>s.category===category).sort((a,b)=>a.draw_order-b.draw_order);
 if(slots.length<2||data.states[category]!=='complete')return [];
 let size=2;while(size<slots.length)size*=2;
 const initial=seedOrder(size).map(s=>slots[s-1]?.team_id||null);
 let pair=initial;const rounds=[];
 while(pair.length>=2){const arr=[],next=[];
   for(let i=0;i<pair.length;i+=2){const a=pair[i],b=pair[i+1],r=rounds.length,m=i/2;
    const saved=data.winners.find(w=>w.category===category&&w.round===r&&w.match_no===m);
    let winner=r===0&&a&&!b?a:r===0&&b&&!a?b:(a&&b&&(saved?.winner_team_id===a||saved?.winner_team_id===b))?saved.winner_team_id:null;
    arr.push({round:r,match_no:m,a,b,winner,automatic:!!winner&&(!a||!b)});next.push(winner);
   }
   rounds.push(arr);pair=next;
 }
 return rounds;
}
function setPage(page,skipHash=false){
 if(!document.querySelector('#page-'+page))page='beranda';currentPage=page;
 $$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));
 $$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
 $('.main-nav').classList.remove('open');
 if(!skipHash)history.replaceState(null,'','#'+page);
 if(page==='peserta')renderTeams();if(page==='undian')renderDraw();if(page==='bagan')renderBracket();if(page==='panitia')renderAdmin();if(page==='daftar')renderBank();
 window.scrollTo({top:0,behavior:'instant'});
}
function renderCategoryCards(){
 const scene={futsal:'arena-futsal.webp',gobak:'arena-gobak.webp',tarik_putra:'arena-tarik.webp',tarik_putri:'arena-tarik.webp'};
 $('#homeCategoryGrid').innerHTML=CATS.map((c,i)=>`<button class="cat-card premium-cat cat-${c.id}" data-page="daftar" data-cat="${c.id}"><span class="cat-no">${String(i+1).padStart(2,'0')} / ARENA</span><img class="cat-illustration" src="${assetUrl(scene[c.id])}" alt="Ilustrasi ${e(c.name)}" loading="lazy"><span class="cat-text"><strong>${c.short.toUpperCase()}</strong><small>${c.gender} <span>PILIH LOMBA ↗</span></small></span></button>`).join('');
 $('#registerCategories').innerHTML=sports.map((sport,i)=>`<label class="choice premium-choice choice-${sport.id}"><input type="checkbox" name="sport" value="${sport.id}"><img src="${assetUrl(sport.asset)}" alt="" loading="lazy"><span class="choice-copy"><strong>${e(sport.name)}</strong><small>${e(sport.subtitle)}</small><em>${fmtMoney(DEFAULTS[sport.fee])}</em></span></label>`).join('');
 $('#filterTeams').innerHTML=opts;
}
function saveRosterDrafts(){
 $$('.roster-block').forEach(block=>{rosterDrafts[block.dataset.cat]=[...block.querySelectorAll('.member-row input')].map(el=>el.value)});
}
function rosterRow(category,index,value=''){
 return `<div class="member-row"><span class="member-index">${String(index+1).padStart(2,'0')}</span><input type="text" maxlength="90" required placeholder="Nama lengkap anggota ${index+1}" aria-label="Anggota ${e(catName(category))} nomor ${index+1}" value="${e(value)}"><button class="remove-member" type="button" title="Hapus nama">×</button></div>`;
}
function renderRosters(){
 saveRosterDrafts();const selection=selectedSports();
 const categories=sports.filter(s=>selection.includes(s.id)).flatMap(s=>s.categories);
 $('#rosterSections').innerHTML=categories.length?categories.map((category,i)=>{
  const art=category==='futsal'?'arena-futsal.webp':category==='gobak'?'arena-gobak.webp':'arena-tarik.webp';
  const names=rosterDrafts[category]||[''];
  return `<section class="roster-block" data-cat="${category}"><div class="roster-header"><img src="${assetUrl(art)}" alt=""><div><small>DAFTAR PEMAIN ${String(i+1).padStart(2,'0')}</small><h4>${e(catName(category))}</h4><p>Isi nama anggota untuk tim ini.</p></div><span class="roster-counter">${names.length}/30</span></div><div class="participant-rows">${names.map((value,j)=>rosterRow(category,j,value)).join('')}</div><button type="button" class="btn-add" data-action="add-member" data-cat="${category}">＋ Tambah anggota ${e(catName(category))}</button></section>`;
 }).join(''):'<div class="roster-empty">Pilih satu atau beberapa cabang lomba di atas untuk menampilkan formulir nama anggota.</div>';
 $$('.roster-block').forEach(block=>renumberMembers(block));
 renderInvoice();
}
function renumberMembers(block){
 const rows=[...block.querySelectorAll('.member-row')];
 rows.forEach((row,i)=>{row.querySelector('.member-index').textContent=String(i+1).padStart(2,'0');row.querySelector('input').placeholder='Nama lengkap anggota '+(i+1);row.querySelector('.remove-member').disabled=rows.length===1;});
 const counter=block.querySelector('.roster-counter');if(counter)counter.textContent=rows.length+'/30';
}
function addMember(category,value=''){
 const block=$(`.roster-block[data-cat="${category}"]`);if(!block)return;
 const container=block.querySelector('.participant-rows'),count=container.querySelectorAll('.member-row').length;
 if(count>=30){notify('Batas 30 anggota per tim.',true);return}
 container.insertAdjacentHTML('beforeend',rosterRow(category,count,value));renumberMembers(block);
 rosterDrafts[category]=[...block.querySelectorAll('.member-row input')].map(el=>el.value);
}
function renderInvoice(){
 const cfg=publicData?.settings||DEFAULTS,selection=selectedSports(),total=groupPrice(selection,cfg);
 const rows=sports.filter(s=>selection.includes(s.id)).map(s=>`<div class="invoice-line"><span><strong>${e(s.name)}</strong><small>${e(s.subtitle)}</small></span><b>${fmtMoney(cfg[s.fee])}</b></div>`).join('');
 $('#registrationInvoice').innerHTML=`<div class="invoice-caption"><span>RINGKASAN PENDAFTARAN</span><b>${selection.length} cabang · ${selection.includes('tarik')?selection.length+1:selection.length} tim</b></div>${rows||'<div class="invoice-empty">Belum ada lomba yang dipilih.</div>'}<div class="invoice-total"><span>TOTAL PENDAFTARAN</span><strong>${fmtMoney(total)}</strong></div><p>Satu pembayaran untuk seluruh tim dari ranting yang sama. Status diverifikasi oleh panitia.</p>`;
}
function renderBank(){
 if(!publicData)return;
 const cfg=publicData.settings;
 $('#bankInfo').innerHTML=cfg.bank_name&&cfg.bank_account?`<span class="account">${e(cfg.bank_account)}</span><p class="bank-name">${e(cfg.bank_name)}</p><p>Atas nama <b>${e(cfg.bank_holder||'Belum dicantumkan')}</b></p><button class="admin-mini" data-action="copy-bank">Salin nomor rekening</button>`:`<p>Rekening belum dicantumkan panitia. Gunakan bayar langsung atau tanyakan kepada bendahara.</p>`;
 $('#bankInfo').innerHTML+=`<p>${e(cfg.cash_instruction||'Pembayaran dicatat oleh panitia.')}</p><div class="fee-reference"><b>BIAYA PENDAFTARAN</b>${sports.map(s=>`<p><span>${e(s.name)}<small>${e(s.subtitle)}</small></span><strong>${fmtMoney(cfg[s.fee])}</strong></p>`).join('')}<small>Tarik tambang hanya satu kali biaya untuk dua tim.</small></div>`;
 $('#contactInfo').textContent=cfg.contact||'Kontak panitia belum dicantumkan.';
 renderInvoice();
}
function renderHome(){if(!publicData)return;const d=publicData,ct=d.teams.length;
 $('#openLabel').textContent=d.settings.registration_open?'Pendaftaran dibuka':'Pendaftaran ditutup';
 const completed=CATS.filter(c=>d.states[c.id]==='complete').length;
 $('#liveStrip').textContent=completed?`${completed} dari 4 kategori sudah memiliki bagan pertandingan`:`${ct} tim telah terdaftar • undian dapat disaksikan di menu TM`;
 const registered=new Set(d.teams.map(t=>t.ranting.toLocaleLowerCase('id-ID')));
 const suggestions=[...new Set(String(d.settings.ranting_options||'').split(/[,;\n]+/).map(x=>x.trim()).filter(x=>x.length>=3&&!registered.has(x.toLocaleLowerCase('id-ID'))))].sort((a,b)=>a.localeCompare(b,'id'));
 $('#rantingSuggestions').innerHTML=suggestions.map(s=>`<option value="${e(s)}"></option>`).join('');
 $('#submitRegister').disabled=!d.settings.registration_open;
 $('#submitRegister').innerHTML=d.settings.registration_open?'Daftarkan semua tim <span>↗</span>':'Pendaftaran ditutup';
 sports.forEach(s=>{const node=$(`.choice-${s.id} .choice-copy em`);if(node)node.textContent=fmtMoney(d.settings[s.fee]);});
 renderBank();
}
function renderTeams(){if(!publicData)return;
 const d=publicData,teams=d.teams,p=teams.filter(t=>t.payment_status==='paid').length;
 $('#participantStats').innerHTML=`<div class="stat-card red"><small>TOTAL TIM TERDAFTAR</small><strong>${teams.length}</strong></div><div class="stat-card"><small>PEMBAYARAN LUNAS</small><strong>${p}</strong></div><div class="stat-card"><small>MENUNGGU PEMBAYARAN</small><strong>${teams.length-p}</strong></div><div class="stat-card"><small>KATEGORI LOMBA</small><strong>04</strong></div>`;
 const search=$('#searchTeams').value.trim().toLowerCase(),filter=$('#filterTeams').value;
 const shown=teams.filter(t=>(!filter||t.category===filter)&&(!search||t.ranting.toLowerCase().includes(search)));
 $('#publicTeamsBody').innerHTML=shown.length?shown.map((t,i)=>`<tr><td>${String(i+1).padStart(2,'0')}</td><td><strong>${e(t.ranting)}</strong><small>ID Tim #${t.id}</small></td><td>${e(catName(t.category))}</td><td>${t.members_count??t.participants?.length??0} orang</td><td><span class="status ${t.payment_status}">${statuses[t.payment_status]}</span></td></tr>`).join(''):`<tr><td colspan="5" style="text-align:center;padding:55px">Belum ada tim sesuai pencarian ini.</td></tr>`;
}
function renderPills(el,active,kind){$(el).innerHTML=CATS.map(c=>`<button class="pill ${c.id===active?'active':''}" data-action="select-${kind}" data-cat="${c.id}">${e(c.name)} <small>${publicData?.teams.filter(t=>t.category===c.id).length||0}</small></button>`).join('')}
function renderDraw(){if(!publicData)return;
 renderPills('#drawCategoryTabs',drawCat,'draw');const d=publicData,c=drawCat,st=d.states[c],teams=d.teams.filter(t=>t.category===c),slots=d.slots.filter(s=>s.category===c).sort((a,b)=>a.draw_order-b.draw_order);
 const latest=slots.length&&findTeam(slots.at(-1).team_id);const chosen=spinResult?.category===c?spinResult.name:latest?.ranting;
 const canPress=adminLogged&&!spinning;
 $('#drawPanel').innerHTML=`<div class="draw-stage">
 <div class="stage-top"><span>● TECHNICAL MEETING 2026</span><span>${e(catName(c).toUpperCase())}</span></div>
 <div class="draw-orb ${spinning?'spinning':''}" id="drawOrb">${spinning?'<span class="orb-number">?</span>':chosen?`<div class="orb-name">${e(chosen)}</div>`:'<span class="orb-number">81</span>'}</div>
 <div class="stage-label">${st==='idle'?'SIAP UNTUK DIUNDI':st==='live'?'SIAPA SELANJUTNYA?':'URUTAN TELAH DITETAPKAN'}</div>
 <div class="stage-subtitle">${st==='idle'?`${teams.length} tim siap masuk pot undian`:st==='live'?`Nomor undi berikutnya: ${slots.length+1} dari ${teams.length}`:`${slots.length} dari ${teams.length} nama ranting sudah terundi`}</div>
 <div class="stage-control">${adminLogged? st==='idle'?`<button class="btn btn-light" data-action="start-draw" data-cat="${c}" ${teams.length<2?'disabled':''}>Mulai sesi undian <span>↗</span></button>`:st==='live'?`<button class="btn btn-light" data-action="next-draw" data-cat="${c}" ${!canPress?'disabled':''}>${spinning?'Sedang mengundi ...':'Undi nama berikutnya'} <span>↗</span></button>`:`<button class="btn btn-light" data-page="bagan" data-cat="${c}">Lihat bagan pertandingan <span>↗</span></button>`:`<button class="btn btn-outline-light" data-page="panitia">Masuk sebagai panitia <span>↗</span></button>`}</div>
 </div>
 <div class="draw-result"><div class="draw-result-head"><strong>URUTAN HASIL UNDIAN</strong><span>${String(slots.length).padStart(2,'0')} / ${String(teams.length).padStart(2,'0')}</span></div>
 <div class="draw-result-list">${slots.length?slots.map((s,i)=>`<div class="draw-result-item"><b>${String(s.draw_order).padStart(2,'0')}</b><strong>${e(findTeam(s.team_id)?.ranting||'Tim tidak ditemukan')}</strong><em>TERUNDI</em></div>`).join(''):`<div class="draw-placeholder">Belum ada nomor undian. Nama ranting akan muncul satu per satu ketika proses undian dimulai.</div>`}</div>
 <p class="draw-admin-note">${adminLogged?'MODE OPERATOR AKTIF. Perwakilan ranting dapat bergiliran menekan tombol pada perangkat yang sudah dibuka panitia.':'Hasil dapat dilihat semua orang. Hanya perangkat yang telah login sebagai panitia dapat mengaktifkan undian.'}</p>
 ${adminLogged&&st!=='idle'?`<div class="draw-tools"><button class="admin-mini danger" data-action="reset-draw" data-cat="${c}">↶ Reset undian kategori ini</button></div>`:''}
 </div>`;
}
function renderBracket(){if(!publicData)return;
 renderPills('#bracketCategoryTabs',bracketCat,'bracket');const c=bracketCat,d=publicData,st=d.states[c],teams=d.teams.filter(t=>t.category===c);
 const rounds=bracketFor(d,c);if(st!=='complete'||!rounds.length){$('#bracketPanel').innerHTML=`<div class="empty-state"><div class="empty-illustration">${st==='live'?'…':'81'}</div><strong>${st==='live'?'Undian sedang berlangsung.':'Bagan belum tersedia.'}</strong><p>${st==='live'?'Saksikan pengundian hingga semua tim memperoleh nomor. Bagan langsung muncul setelah selesai.':teams.length<2?'Minimal dua tim dibutuhkan pada kategori ini.':'Panitia akan mengadakan undian terlebih dahulu pada saat Technical Meeting.'}</p><button class="btn btn-dark" style="margin:20px auto 0" data-page="undian" data-cat="${c}">Lihat undian <span>↗</span></button></div>`;return;}
 const teamName=id=>id?e(findTeam(id)?.ranting||'Tim tak dikenal'):'—';
 const teamRow=(id,m)=>{const canWinner=adminLogged&&m.a&&m.b&&id!==null;const isWin=id!==null&&m.winner===id;
   return `<div class="match-team ${id===null?'waiting':isWin?'win':''}"><span>${teamName(id)}</span>${id?isWin?`<em>${m.automatic?'BYE':'MENANG'}</em>`:canWinner?`<button class="winner-btn" data-action="winner" data-cat="${c}" data-round="${m.round}" data-match="${m.match_no}" data-team="${id}" title="Tetapkan sebagai pemenang">Pilih ✓</button>`:'':`<em>${m.round===0?'BYE':'MENUNGGU'}</em>`}</div>`};
 const titleRound=(r,last)=>r===last?'FINAL':r===last-1?'SEMIFINAL':r===last-2?'PEREMPAT FINAL':`BABAK ${r+1}`;
 const columns=rounds.map((matches,r)=>`<div class="bracket-round"><h3><small>ROUND ${String(r+1).padStart(2,'0')}</small>${titleRound(r,rounds.length-1)}</h3>${matches.map(m=>{
   const detail=(d.details||[]).find(x=>x.category===c&&x.round===r&&x.match_no===m.match_no);
   const when=detail?.day?`${detail.day} Nov 2026${detail.time?' • '+detail.time:''}`:detail?.time?detail.time:'';
   return `<div class="match-card"><small>MATCH ${String(m.match_no+1).padStart(2,'0')} ${adminLogged?`<button class="edit-match" data-action="edit-match" data-cat="${c}" data-round="${r}" data-match="${m.match_no}">ATUR ↗</button>`:''}</small>${teamRow(m.a,m)}${teamRow(m.b,m)}${detail&&(when||detail.field||detail.score_a||detail.score_b)?`<div class="match-meta">${when?`<span>${e(when)}</span>`:''}${detail.field?`<span>${e(detail.field)}</span>`:''}${detail.score_a||detail.score_b?`<b>SKOR ${e(detail.score_a||'–')} : ${e(detail.score_b||'–')}</b>`:''}</div>`:''}</div>`;
 }).join('')}</div>`).join('');
 const champion=rounds.at(-1)[0].winner;
 $('#bracketPanel').innerHTML=`<div class="print-only">BAGAN ${e(catName(c).toUpperCase())} — PGRI CABANG SEKOTONG 18–19 NOVEMBER 2026</div><div class="bracket-scroll"><div class="bracket-grid">${columns}</div></div>${champion?`<div class="champion-banner"><div class="champion-cup">★</div><div><small>JUARA KATEGORI ${e(catName(c).toUpperCase())}</small><strong>${teamName(champion)}</strong></div></div>`:''}<p class="bracket-help">Bagan sistem gugur. Tim dengan posisi BYE lolos otomatis. ${adminLogged?'Klik “Pilih ✓” untuk menetapkan pemenang setiap pertandingan. Perubahan hasil babak sebelumnya akan mengosongkan hasil babak berikutnya.':'Hasil pertandingan diperbarui oleh panitia. Geser bagan ke samping untuk melihat sampai final.'}</p>`;
}
function renderAdmin(){const root=$('#adminRoot');if(!adminLogged){root.innerHTML=`<form id="loginForm" class="login-box"><span class="overline">AREA TERBATAS</span><h2>LOGIN PANITIA</h2><p>Gunakan kata sandi yang sudah disetel pada pengaturan rahasia Cloudflare. Data peserta dan pengundian hanya bisa dikelola oleh panitia.</p><label class="field"><label for="adminPass">Kata sandi</label><input id="adminPass" type="password" autocomplete="current-password" placeholder="Masukkan sandi panitia" required></label><button class="btn btn-red full-width" type="submit">Masuk panel <span>↗</span></button>${IS_DEMO?'<p class="admin-info"><b>Mode demo:</b> kata sandi <code>demo81</code></p>':''}</form>`;return;}
 root.innerHTML=`<div class="admin-head"><h2>DASHBOARD PANITIA</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-outline-dark" data-action="export-csv">↓ Ekspor Tim</button><button class="btn btn-outline-dark" data-action="export-billing">↓ Ekspor Keuangan</button><button class="btn btn-dark" data-action="logout">Keluar</button></div></div><div class="admin-tabs">${[{id:'teams',label:'Data & Pembayaran'},{id:'settings',label:'Pengaturan'},{id:'draw',label:'Kontrol Undian'}].map(x=>`<button class="admin-tab ${adminTab===x.id?'active':''}" data-action="admin-tab" data-tab="${x.id}">${x.label}</button>`).join('')}</div><div id="adminBody"></div>`;
 renderAdminBody();
}
function renderAdminBody(){if(!adminLogged||!adminData)return;
 const root=$('#adminBody'),d=adminData;
 if(adminTab==='teams'){
  const regs=d.registrations||[],paid=regs.filter(r=>r.payment_status==='paid').reduce((a,r)=>a+Number(r.total_amount),0),expected=regs.reduce((a,r)=>a+Number(r.total_amount),0);
  root.innerHTML=`<div class="admin-summary-grid"><div><small>RANTING TERDAFTAR</small><strong>${regs.length}</strong></div><div><small>TOTAL TAGIHAN</small><strong>${fmtMoney(expected)}</strong></div><div><small>SUDAH DIBAYAR</small><strong>${fmtMoney(paid)}</strong></div><div><small>BELUM LUNAS</small><strong>${fmtMoney(expected-paid)}</strong></div></div><div class="admin-note"><b>${d.teams.length} tim dari ${regs.length} ranting.</b> Setiap ranting memiliki satu tagihan. Perubahan pembayaran pada satu baris akan berlaku untuk seluruh tim ranting tersebut. Tim belum lunas tetap ikut undian.</div><div class="table-outer"><table class="data-table"><thead><tr><th>Ranting / Kode</th><th>Cabang & Anggota</th><th>Tagihan</th><th>Metode</th><th>Status</th></tr></thead><tbody>${regs.length?regs.map(r=>{
    const teams=d.teams.filter(t=>t.group_id===r.id);
    return `<tr><td><strong>${e(r.ranting)}</strong><small>${e(r.code)}</small><small>${e(r.contact||'Kontak belum diisi')}</small></td><td><div class="admin-roster-list">${teams.map(t=>`<div class="admin-roster-row"><span><b>${e(catName(t.category))}</b><small>${t.participants.length} orang · ${e(t.participants.join(', '))}</small></span><span class="admin-actions"><button class="admin-mini" data-action="edit-team" data-id="${t.id}">Edit</button><button class="admin-mini danger" data-action="delete-team" data-id="${t.id}" ${d.states[t.category]!=='idle'?'disabled title="Reset undian untuk menghapus tim"':''}>Hapus</button></span></div>`).join('')}</div></td><td><strong>${fmtMoney(r.total_amount)}</strong><small>Biaya satu ranting</small></td><td>${r.payment_method==='cash'?'Langsung':'Transfer'}</td><td><select class="select-status" data-action="inline-payment" data-id="${r.id}"><option value="pending" ${r.payment_status==='pending'?'selected':''}>Belum lunas</option><option value="paid" ${r.payment_status==='paid'?'selected':''}>Lunas ✓</option></select></td></tr>`;
   }).join(''):`<tr><td colspan="5" style="padding:50px;text-align:center">Belum ada pendaftar.</td></tr>`}</tbody></table></div>`;
 }else if(adminTab==='settings'){
  const cfg=d.settings;
  const field=(key,title)=>`<div class="field"><label for="cfg-${key}">${title}</label><input id="cfg-${key}" name="${key}" maxlength="150" value="${e(cfg[key]??'')}" placeholder="Isi ${e(title.toLowerCase())}"></div>`;
  root.innerHTML=`<form id="settingsForm" class="admin-surface"><h3>Pengaturan kegiatan & pembayaran</h3><p class="settings-hint">Nominal baru akan berlaku untuk pendaftaran baru. Tagihan yang sudah terdaftar tidak berubah secara otomatis.</p><label class="settings-toggle"><input type="checkbox" name="registration_open" ${cfg.registration_open?'checked':''}> Pendaftaran sedang dibuka</label><div class="setting-grid">${field('bank_name','Nama bank')}${field('bank_account','Nomor rekening')}${field('bank_holder','Nama pemilik rekening')}${field('contact','Kontak panitia / bendahara')}${field('fee_futsal','Futsal putra / tim (Rp)')}${field('fee_gobak','Gobak sodor putri / tim (Rp)')}${field('fee_tarik','Tarik tambang putra + putri / paket 2 tim (Rp)')}${field('venue','Lokasi kegiatan')}<div class="field full"><label for="cfg-ranting_options">Pilihan nama ranting (opsional, satu per baris)</label><textarea id="cfg-ranting_options" name="ranting_options" rows="4" maxlength="3000" placeholder="Contoh: Ranting SD Negeri ...">${e(cfg.ranting_options||'')}</textarea><small>Daftar ini muncul sebagai saran ketika pendaftar mengetik. Ranting tetap boleh mengisi nama lain.</small></div><div class="field full"><label for="cfg-cash_instruction">Informasi pembayaran langsung</label><textarea id="cfg-cash_instruction" name="cash_instruction" maxlength="400">${e(cfg.cash_instruction)}</textarea></div></div><button class="btn btn-red" type="submit">Simpan pengaturan <span>↗</span></button></form>`;
 }else{
  root.innerHTML=`<div class="admin-note">Gunakan layar “Undian TM” untuk mengundi satu nama per klik. Masing-masing kategori memiliki undian dan bagan terpisah. <b>Reset undian menghapus seluruh nomor undian dan hasil pertandingan kategori tersebut.</b></div><div class="admin-category-settings">${CATS.map(c=>`<div class="admin-category-box"><b>${e(c.name)}</b><span class="state">${d.teams.filter(t=>t.category===c.id).length} tim • ${statusText(d.states[c.id])}</span><button class="btn btn-dark full-width" data-page="undian" data-cat="${c.id}">Buka undian <span>↗</span></button><button class="admin-mini danger" data-action="reset-draw" data-cat="${c.id}" ${d.states[c.id]==='idle'?'disabled':''}>Reset kategori ini</button></div>`).join('')}</div><p class="admin-info">Saat undian berjalan, perwakilan ranting dapat bergiliran menekan tombol di laptop atau IFP yang sudah login panitia.</p>`;
 }
}
function openMatchEditor(category,round,matchNo){
 const m=bracketFor(publicData,category)[Number(round)]?.[Number(matchNo)];if(!m)return;
 const old=(publicData.details||[]).find(x=>x.category===category&&x.round===Number(round)&&x.match_no===Number(matchNo))||{};
 modal(`<span class="overline">JADWAL & SKOR PERTANDINGAN</span><h2>${e(catName(category))}</h2><p>Babak ${Number(round)+1}, pertandingan ${Number(matchNo)+1}. Isi tanggal, waktu, lokasi, dan skor sesuai keputusan panitia. Kosongkan bila belum ditentukan.</p><form id="matchDetailsForm" data-cat="${category}" data-round="${round}" data-match="${matchNo}"><div class="field"><label>Tanggal pertandingan</label><select name="day"><option value="">Belum dijadwalkan</option><option value="18" ${old.day==='18'?'selected':''}>18 November 2026</option><option value="19" ${old.day==='19'?'selected':''}>19 November 2026</option></select></div><div class="field"><label>Jam pertandingan</label><input type="time" name="time" value="${e(old.time||'')}"></div><div class="field"><label>Lapangan / tempat</label><input name="field" value="${e(old.field||'')}" maxlength="80" placeholder="Misalnya: Lapangan 1"></div><div class="split-field"><div class="field"><label>Skor tim atas</label><input type="number" min="0" max="999" name="score_a" value="${e(old.score_a||'')}"></div><div class="field"><label>Skor tim bawah</label><input type="number" min="0" max="999" name="score_b" value="${e(old.score_b||'')}"></div></div><div class="field"><label>Catatan pertandingan</label><input name="note" value="${e(old.note||'')}" maxlength="160"></div><button class="btn btn-red full-width" type="submit">Simpan jadwal & skor <span>↗</span></button></form>`);
}
function modal(html){$('#modalContent').innerHTML=html;$('#modal').hidden=false;document.body.style.overflow='hidden'}
function closeModal(){$('#modal').hidden=true;document.body.style.overflow=''}
async function reload(includeAdmin=adminLogged){
 publicData=await api('public');
 if(includeAdmin){try{adminData=await api('admin')}catch(e){if(!IS_DEMO){adminLogged=false;adminData=null;}notify(e.message,true)}}
 renderHome();renderTeams();if(currentPage==='undian')renderDraw();if(currentPage==='bagan')renderBracket();if(currentPage==='panitia')renderAdmin();
}
async function action(path,payload,quiet=false){try{await api(path,'POST',payload);await reload(true);if(!quiet)notify('Perubahan berhasil disimpan.');return true}catch(err){notify(err.message,true);return false}}
function downloadCsv(cols,rows,name){
 const csv='\ufeff'+[cols,...rows].map(row=>row.map(value=>{const str=String(value??''),safe=/^[\s]*[=+@-]/.test(str)?"'"+str:str;return '"'+safe.replace(/"/g,'""')+'"'}).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('CSV berhasil dibuat.');
}
function exportCsv(){if(!adminData)return;
 const cols=['Kode Pendaftaran','Ranting','Kategori','Nama Anggota','Jumlah Pemain','Metode','Status','Total Tagihan Per Ranting (hanya di baris pertama)'];
 const seen=new Set(),rows=adminData.teams.map(t=>{const fee=seen.has(t.group_id)?'':t.total_amount;seen.add(t.group_id);return [t.code,t.ranting,catName(t.category),t.participants.join(' | '),t.participants.length,t.payment_method,t.payment_status,fee]});
 downloadCsv(cols,rows,'tim-guru-games-2026.csv');
}
function exportBilling(){if(!adminData)return;
 const rows=adminData.registrations.map(r=>[r.code,r.ranting,adminData.teams.filter(t=>t.group_id===r.id).map(t=>catName(t.category)).join(' | '),r.total_amount,r.payment_method,r.payment_status,r.contact,r.notes]);
 downloadCsv(['Kode Pendaftaran','Ranting','Kategori','Total Tagihan (Rp)','Metode Bayar','Status','Kontak','Catatan'],rows,'keuangan-pgri-sekotong-2026.csv');
}
async function startDraw(c){if(!confirm(`Mulai undian ${catName(c)}? Setelah dimulai, pendaftaran/perubahan roster kategori ini dikunci sampai reset.`))return;await action('admin/start-draw',{category:c})}
async function nextDraw(c){if(spinning)return;spinning=true;chirp(360,115,'triangle');spinResult=null;renderDraw();try{
 const begin=Date.now();const result=await api('admin/next-draw','POST',{category:c});const minimum=1400;
 const left=Math.max(0,minimum-(Date.now()-begin));await new Promise(r=>setTimeout(r,left));spinning=false;
 await reload(true);spinResult={category:c,name:findTeam(result.chosen_team_id)?.ranting||'Tim terundi'};renderDraw();
 chirp(740,140,'sine');setTimeout(()=>chirp(1050,180,'triangle'),170);
 if(result.complete)notify('Undian selesai! Bagan pertandingan telah tersedia.');
 }catch(err){spinning=false;renderDraw();notify(err.message,true)}
}
function openTeamEditor(id){const t=adminData?.teams.find(t=>t.id===Number(id));if(!t)return;const lock=adminData.states[t.category]!=='idle',groupLocked=adminData.teams.some(x=>x.group_id===t.group_id&&adminData.states[x.category]!=='idle');modal(`<span class="overline">EDIT TIM / ${e(t.code)}</span><h2>${e(t.ranting)}</h2><p>${e(catName(t.category))}${lock?' • Roster terkunci karena undian telah dimulai':''}</p><form id="editTeamForm" data-id="${t.id}"><div class="field"><label>Nama ranting</label><input name="ranting" value="${e(t.ranting)}" ${groupLocked?'disabled':''} required></div><div class="field"><label>Nama anggota (satu nama per baris)</label><textarea name="participants" rows="6" ${lock?'disabled':''}>${e(t.participants.join('\n'))}</textarea></div><div class="field"><label>Kontak</label><input name="contact" value="${e(t.contact)}"></div><div class="field"><label>Catatan</label><input name="notes" value="${e(t.notes)}"></div><div class="field"><label>Metode pembayaran</label><select name="payment_method"><option value="cash" ${t.payment_method==='cash'?'selected':''}>Bayar langsung</option><option value="transfer" ${t.payment_method==='transfer'?'selected':''}>Transfer</option></select></div><div class="field"><label>Status pembayaran</label><select name="payment_status"><option value="pending" ${t.payment_status==='pending'?'selected':''}>Belum lunas</option><option value="paid" ${t.payment_status==='paid'?'selected':''}>Lunas</option></select></div><button class="btn btn-red full-width" type="submit">Simpan perubahan <span>↗</span></button></form>`)}
async function onSubmitRegister(form){
 if(!publicData.settings.registration_open){notify('Pendaftaran sedang ditutup.',true);return}
 const selection=selectedSports();if(!selection.length){notify('Pilih minimal satu cabang lomba.',true);$('#registerCategories').scrollIntoView({behavior:'smooth',block:'center'});return}
 const categories=sports.filter(x=>selection.includes(x.id)).flatMap(x=>x.categories);
 const entries=[];
 for(const category of categories){
  const block=$(`.roster-block[data-cat="${category}"]`),inputs=[...block.querySelectorAll('.member-row input')];
  const participants=inputs.map(el=>el.value.trim()).filter(Boolean);
  if(!participants.length){notify('Isi nama anggota '+catName(category)+'.',true);block.scrollIntoView({behavior:'smooth',block:'center'});return}
  if(new Set(participants.map(x=>x.toLocaleLowerCase('id-ID'))).size!==participants.length){notify('Ada nama anggota ganda dalam tim '+catName(category),true);block.scrollIntoView({behavior:'smooth',block:'center'});return}
  entries.push({category,participants});
 }
 const btn=$('#submitRegister'),payload={ranting:$('#ranting').value.trim(),entries,contact:$('#contact').value,notes:$('#notes').value,payment_method:form.elements.payment_method.value,website:$('#website').value};
 btn.disabled=true;btn.textContent='Mengirim seluruh tim ...';
 try{
  const res=await api('register','POST',payload);await reload(adminLogged);
  modal(`<span class="overline">PENDAFTARAN BERHASIL / SATU RANTING</span><h2>SEMUA TIM<br><i>TERDAFTAR!</i></h2><p>Ranting <strong>${e(payload.ranting)}</strong> berhasil mengirim <strong>${categories.length} tim</strong> dengan satu kode dan satu tagihan.</p><div class="receipt-code">${e(res.code)}</div><div class="receipt-summary"><span>Total tagihan pendaftaran</span><strong>${fmtMoney(res.total_amount)}</strong></div><p><b>Simpan kode pendaftaran.</b> Status awal adalah <strong>Belum lunas</strong> sampai panitia memverifikasi pembayaran. Semua tim tetap tercatat untuk undian.</p><button class="btn btn-dark" data-action="copy-code" data-code="${e(res.code)}">Salin kode <span>↗</span></button><button class="btn btn-outline-dark" data-action="close-to-register">Kembali ke pendaftaran</button>`);
  form.reset();rosterDrafts={};renderRosters();notify('Seluruh tim ranting berhasil terdaftar.');
 }catch(err){notify(err.message,true)}finally{btn.disabled=!publicData.settings.registration_open;btn.innerHTML='Daftarkan semua tim <span>↗</span>'}
}
function printBracket(){const page=$('#page-bagan');page.classList.add('printing');window.print();setTimeout(()=>page.classList.remove('printing'),500)}
function bindEvents(){
 document.addEventListener('click',async(ev)=>{
  const b=ev.target.closest('button');if(!b)return;
  const page=b.dataset.page,cat=b.dataset.cat;
  if(page){if(cat&&page==='daftar'){const inp=$(`#registerCategories input[value="${sportForCat(cat)}"]`);if(inp){inp.checked=true;renderRosters();}}if(cat&&page==='bagan')bracketCat=cat;if(cat&&page==='undian')drawCat=cat;setPage(page);return}
  const a=b.dataset.action;
  if(!a)return;
  if(a==='toggle-audio'){soundOn=!soundOn;const t=$('#soundToggle');t.setAttribute('aria-pressed',soundOn?'true':'false');t.setAttribute('aria-label',soundOn?'Nonaktifkan efek suara':'Aktifkan efek suara');t.querySelector('small').textContent=soundOn?'SUARA ON':'SUARA OFF';chirp(620,95);return}
  if(a==='select-draw'){drawCat=cat;spinResult=null;renderDraw()}
  else if(a==='select-bracket'){bracketCat=cat;renderBracket()}
  else if(a==='copy-bank'){const str=publicData.settings.bank_account;try{await navigator.clipboard.writeText(str);notify('Nomor rekening disalin.')}catch{notify('Nomor rekening: '+str)}}
  else if(a==='copy-code'){try{await navigator.clipboard.writeText(b.dataset.code);notify('Kode pendaftaran disalin.')}catch{notify('Kode: '+b.dataset.code)}}
  else if(a==='close-to-register'){closeModal();setPage('daftar')}
  else if(a==='start-draw')await startDraw(cat);
  else if(a==='next-draw')await nextDraw(cat);
  else if(a==='reset-draw'){
    if(confirm(`PERINGATAN: Hapus seluruh nomor undian dan hasil pertandingan ${catName(cat)}? Tindakan ini tidak dapat dibatalkan.`))await action('admin/reset-draw',{category:cat});
  }
  else if(a==='winner'){const team=findTeam(Number(b.dataset.team));if(confirm(`Tetapkan ${team?.ranting} sebagai pemenang pertandingan ini?`))await action('admin/winner',{category:cat,round:Number(b.dataset.round),match_no:Number(b.dataset.match),winner_id:Number(b.dataset.team)});}
  else if(a==='admin-tab'){adminTab=b.dataset.tab;renderAdmin()}
  else if(a==='export-csv')exportCsv();
  else if(a==='export-billing')exportBilling();
  else if(a==='add-member')addMember(cat);
  else if(a==='logout'){await api('logout','POST');adminLogged=false;adminData=null;renderAdmin();notify('Berhasil keluar.');}
  else if(a==='edit-team')openTeamEditor(b.dataset.id);
  else if(a==='edit-match')openMatchEditor(cat,b.dataset.round,b.dataset.match);
  else if(a==='delete-team'){const t=adminData?.teams.find(t=>t.id===Number(b.dataset.id));if(t&&confirm(`Hapus ${t.ranting} dari ${catName(t.category)}? Data akan hilang permanen.`))await action('admin/delete-team',{id:t.id})}
 });
 document.addEventListener('change',async(ev)=>{
  const target=ev.target;if(target.dataset.action!=='inline-payment')return;
  const group=adminData?.registrations.find(r=>r.id===Number(target.dataset.id));if(!group)return;
  if(target.value==='paid'&&!confirm(`Tandai seluruh tagihan ${group.ranting} sebesar ${fmtMoney(group.total_amount)} sebagai lunas?`)){target.value=group.payment_status;return}
  await action('admin/registration',{group_id:group.id,payment_status:target.value,payment_method:group.payment_method});
 });
 document.addEventListener('submit',async(ev)=>{
  if(ev.target.id==='registerForm'){ev.preventDefault();await onSubmitRegister(ev.target)}
  if(ev.target.id==='loginForm'){ev.preventDefault();const btn=ev.target.querySelector('button[type=submit]');btn.disabled=true;try{await api('login','POST',{password:$('#adminPass').value});adminLogged=true;adminData=await api('admin');renderAdmin();notify('Login panitia berhasil.')}catch(err){notify(err.message,true);btn.disabled=false}}
  if(ev.target.id==='settingsForm'){ev.preventDefault();const form=ev.target;let payload=Object.fromEntries(new FormData(form).entries());payload.registration_open=!!form.elements.registration_open.checked;await action('admin/settings',payload)}
  if(ev.target.id==='matchDetailsForm'){
   ev.preventDefault();const form=ev.target;const fd=new FormData(form);
   const payload={category:form.dataset.cat,round:Number(form.dataset.round),match_no:Number(form.dataset.match),...Object.fromEntries(fd.entries())};
   const success=await action('admin/match-details',payload);if(success)closeModal();
  }
  if(ev.target.id==='editTeamForm'){
   ev.preventDefault();const form=ev.target,t=adminData.teams.find(x=>x.id===Number(form.dataset.id));const fd=new FormData(form);
   const payload={...t,ranting:fd.get('ranting')||t.ranting,participants:fd.get('participants')?String(fd.get('participants')).split('\n').map(s=>s.trim()).filter(Boolean):t.participants,contact:fd.get('contact'),notes:fd.get('notes'),payment_method:fd.get('payment_method'),payment_status:fd.get('payment_status')};
   const success=await action('admin/team',payload);if(success)closeModal();
  }
 });
 $('#registerCategories').addEventListener('change',renderRosters);
 $('#rosterSections').addEventListener('click',ev=>{const b=ev.target.closest('.remove-member');if(b){const block=b.closest('.roster-block');b.closest('.member-row').remove();renumberMembers(block);rosterDrafts[block.dataset.cat]=[...block.querySelectorAll('.member-row input')].map(el=>el.value);renderInvoice();}});
 $('#rosterSections').addEventListener('input',ev=>{if(ev.target.matches('.member-row input')){const block=ev.target.closest('.roster-block');rosterDrafts[block.dataset.cat]=[...block.querySelectorAll('.member-row input')].map(el=>el.value);}});
 $('#searchTeams').addEventListener('input',renderTeams);$('#filterTeams').addEventListener('change',renderTeams);
 $('#refreshTeams').addEventListener('click',async()=>{try{await reload();notify('Daftar tim diperbarui.')}catch(err){notify(err.message,true)}});
 $('#mobileMenu').addEventListener('click',()=>$('.main-nav').classList.toggle('open'));
 $('#fullscreenTM').addEventListener('click',async()=>{
   document.body.classList.add('tm-presentation');
   if(document.documentElement.requestFullscreen&&!document.fullscreenElement){try{await document.documentElement.requestFullscreen()}catch{notify('Mode tayangan aktif. Layar penuh browser tidak tersedia di perangkat ini.')}}
 });
 $('#exitPresentation').addEventListener('click',async()=>{document.body.classList.remove('tm-presentation');if(document.fullscreenElement)try{await document.exitFullscreen()}catch{}});
 document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('tm-presentation')});
 $('#printBracket').addEventListener('click',printBracket);
 $('#closeModal').addEventListener('click',closeModal);
 $('#modal').addEventListener('click',ev=>{if(ev.target.id==='modal')closeModal()});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!$('#modal').hidden)closeModal()});
 $('#resetDemo')?.addEventListener('click',()=>{if(confirm('Reset semua data demo dan kembalikan tim contoh?')){try{localStorage.removeItem('pgri81-demo-v3');sessionStorage.removeItem('pgri81-demo-admin')}catch{}volatileDemo=null;adminLogged=false;window.location.reload()}});
 window.addEventListener('hashchange',()=>setPage(location.hash.slice(1),true));
}
async function init(){renderCategoryCards();renderRosters();bindEvents();if(IS_DEMO)$('#demoBanner').hidden=false;
 try{
  const sess=await api('session');adminLogged=sess.admin;
  await reload(adminLogged);
  const hash=location.hash.slice(1);setPage(document.querySelector('#page-'+hash)?hash:'beranda',true);
 }catch(err){notify(err.message,true);setPage('beranda',true);$('.status-strip').innerHTML=`<span class="blinking-dot" style="background:#bd2e3a"></span><b>Belum terhubung ke database.</b> ${e(err.message)}`;$('#submitRegister').disabled=true;}
 setInterval(async()=>{if(['undian','bagan','peserta'].includes(currentPage)&&!spinning&&!IS_DEMO){try{publicData=await api('public');renderHome();if(currentPage==='undian')renderDraw();if(currentPage==='bagan')renderBracket();if(currentPage==='peserta')renderTeams()}catch{}}},12000);
}
init();
})();
