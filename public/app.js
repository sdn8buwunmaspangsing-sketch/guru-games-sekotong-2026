/* PGRI Sekotong 2026 — public & admin event application. Vanilla JS, no build dependencies. */
(() => {
'use strict';
const CATS=[
 {id:'futsal',name:'Futsal Putra',short:'Futsal',gender:'Putra',art:'futsal',fee:150000,package_group:'',package_fee:0,min_players:1,max_players:30,rules:'Ketentuan mengikuti juknis panitia.',enabled:true},
 {id:'gobak',name:'Gobak Sodor Putri',short:'Gobak Sodor',gender:'Putri',art:'gobak',fee:100000,package_group:'',package_fee:0,min_players:1,max_players:30,rules:'Ketentuan mengikuti juknis panitia.',enabled:true},
 {id:'tarik_putra',name:'Tarik Tambang Putra',short:'Tarik Tambang',gender:'Putra',art:'tarik',fee:150000,package_group:'tarik_tambang',package_fee:150000,min_players:1,max_players:30,rules:'Boleh memilih putra saja.',enabled:true},
 {id:'tarik_putri',name:'Tarik Tambang Putri',short:'Tarik Tambang',gender:'Putri',art:'tarik',fee:150000,package_group:'tarik_tambang',package_fee:150000,min_players:1,max_players:30,rules:'Boleh memilih putri saja.',enabled:true}
];
const DEFAULTS={event_name:'Pekan Olahraga Guru Sekotong 2026',season_year:'2026',organizer:'PGRI Cabang Kecamatan Sekotong',
 event_start:'2026-11-18',event_end:'2026-11-19',tm_date:'2026-11-16',tm_time:'09:00',tm_venue:'SDN 1 Cendi Manik',
 registration_open:true,bank_name:'',bank_account:'',bank_holder:'',cash_instruction:'Pembayaran langsung melalui bendahara panitia.',
 ranting_options:'',contact:'',venue:'Sekotong, Lombok Barat',rules_general:'Ketentuan lomba mengikuti juknis panitia.',
 theme_primary:'#e5323c',theme_secondary:'#172b40',theme_accent:'#e9bd67',theme_preset:'pgri',anniversary_number:'81',
 poster_url:'',hero_image_url:'',logo_hut_url:'',logo_pgri_url:'',logo_pjok_url:'',spin_duration:'8500',
 fee_futsal:'150000',fee_gobak:'100000',fee_tarik:'150000'};
const catList=()=>CATS;
const enabledCats=()=>CATS.filter(c=>c.enabled);
const catById=id=>CATS.find(c=>c.id===id);
const artFor=c=>`arena-${['futsal','gobak','tarik'].includes(c?.art)?c.art:'futsal'}.webp`;
function calcFee(ids,cats=CATS){
 const selected=new Set(ids),groups=new Map();let total=0;
 for(const c of cats.filter(c=>selected.has(c.id))){if(!c.package_group){total+=Number(c.fee)||0;continue}if(!groups.has(c.package_group))groups.set(c.package_group,[]);groups.get(c.package_group).push(c)}
 for(const members of groups.values())total+=members.length>1?Number(members[0].package_fee)||0:Number(members[0].fee)||0;
 return total;
}
function invoiceParts(ids){const used=new Set(),rows=[];for(const c of CATS.filter(c=>ids.includes(c.id))){
 if(used.has(c.id))continue;
 if(c.package_group){const members=CATS.filter(x=>x.package_group===c.package_group&&ids.includes(x.id));
  if(members.length>1){members.forEach(x=>used.add(x.id));rows.push({name:'Paket: '+members.map(x=>x.name).join(' + '),subtitle:members.length+' kategori',amount:Number(c.package_fee)});continue;}}
 used.add(c.id);rows.push({name:c.name,subtitle:`${c.gender||'Tim'} • ${c.min_players}–${c.max_players} pemain`,amount:Number(c.fee)})}
 return rows}
const themePresets={pgri:['#e5323c','#172b40','#e9bd67'],samudra:['#087c98','#10354f','#f8be56'],hijau:['#18714c','#193e35','#ecc66e'],ungu:['#7b3fb2','#262043','#f4bb65']};
function syncSettings(cfg){
 if(!cfg)return;
 try{const a=JSON.parse(cfg.categories_json);if(Array.isArray(a)&&a.length)CATS.splice(0,CATS.length,...a);}catch{}
 const root=document.documentElement.style;
 if(/^#[0-9a-fA-F]{6}$/.test(cfg.theme_primary||'')){root.setProperty('--red',cfg.theme_primary);root.setProperty('--red2',cfg.theme_primary);}
 if(/^#[0-9a-fA-F]{6}$/.test(cfg.theme_secondary||'')){root.setProperty('--navy',cfg.theme_secondary);root.setProperty('--navy2',cfg.theme_secondary);}
 if(/^#[0-9a-fA-F]{6}$/.test(cfg.theme_accent||''))root.setProperty('--gold',cfg.theme_accent);
 if([6000,8500,11000].includes(Number(cfg.spin_duration)))spinDuration=Number(cfg.spin_duration);
 if(!CATS.some(x=>x.id===drawCat))drawCat=CATS[0]?.id||'futsal';
 if(!CATS.some(x=>x.id===bracketCat))bracketCat=CATS[0]?.id||'futsal';
}
const IS_DEMO=!!window.APP_DEMO_MODE;
const T=window.GuruGamesTournament;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const assetUrl=name=>(window.APP_ASSETS||{})[name]||'assets/'+name;
// Gambar resmi 2026 selalu memiliki cadangan lokal, termasuk dalam demo offline.
const MEDIA_ITEMS=[
 {key:'hut',setting:'logo_hut_url',label:'Logo HUT PGRI',fallback:'hut81.jpg'},
 {key:'pgri',setting:'logo_pgri_url',label:'Logo PGRI Cabang',fallback:'logo-pgri.jpg'},
 {key:'pjok',setting:'logo_pjok_url',label:'Logo KKG PJOK',fallback:'logo-pjok.jpg'},
 {key:'poster',setting:'poster_url',label:'Poster Kegiatan',fallback:'poster.jpg'},
 {key:'hero',setting:'hero_image_url',label:'Ilustrasi Beranda',fallback:'arena-guru-games.webp'}
];
const demoMedia={};
function mediaFallback(key){return assetUrl(MEDIA_ITEMS.find(m=>m.key===key)?.fallback||'arena-guru-games.webp')}
function mediaSrc(cfg,key){
 const item=MEDIA_ITEMS.find(m=>m.key===key);if(!item)return '';
 if(/^https:\/\/[^\s]+$/i.test(cfg?.[item.setting]||''))return cfg[item.setting];
 const rev=cfg?.['media_'+key+'_rev'];
 if(rev){if(IS_DEMO){try{return localStorage.getItem('pgri81-demo-upload-'+key)||demoMedia[key]||mediaFallback(key)}catch{return demoMedia[key]||mediaFallback(key)}}return '/api/media/'+key+'?v='+encodeURIComponent(rev)}
 return mediaFallback(key);
}
function setBrandImg(selector,cfg,key){const img=$(selector);if(!img)return;const fallback=mediaFallback(key);const src=mediaSrc(cfg,key);
 img.onerror=()=>{img.onerror=null;if(img.getAttribute('src')!==fallback)img.src=fallback};
 if(img.getAttribute('src')!==src)img.src=src;
}

const e=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const catName=id=>CATS.find(c=>c.id===id)?.name||id;
const fmtMoney=v=>v!==null&&v!==undefined&&v!==''?(/^\d+$/.test(String(v))?'Rp '+new Intl.NumberFormat('id-ID').format(Number(v)):'Rp '+e(String(v))):'Belum ditetapkan';
const statusText=s=>s==='complete'?'SELESAI':s==='live'?'BERLANGSUNG':'BELUM DIMULAI';
const statuses={pending:'Belum lunas',paid:'Lunas'};
const opts=()=>'<option value="">Semua kategori</option>'+CATS.map(c=>`<option value="${e(c.id)}">${e(c.name)}</option>`).join('');
const selectedSports=()=>$$('#registerCategories input[name=sport]:checked').map(el=>el.value);
const groupPrice=(selected,settings)=>calcFee(selected,JSON.parse(settings.categories_json||'null')||CATS);
let rosterDrafts={};
let soundOn=true,audioContext=null;
function chirp(freq=620,ms=100,type='sine'){
 if(!soundOn)return;
 try{audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();
 const osc=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
 osc.type=type;osc.frequency.setValueAtTime(freq,now);gain.gain.setValueAtTime(.075,now);gain.gain.exponentialRampToValueAtTime(.001,now+ms/1000);
 osc.connect(gain).connect(audioContext.destination);osc.start(now);osc.stop(now+ms/1000+.02);
 }catch{}
}

let currentPage='beranda',drawCat='futsal',bracketCat='futsal',adminTab='teams',adminLogged=false,publicData=null,adminData=null,spinning=false,spinResult=null,toastTimer=null;
const wheelAngles=Object.create(null);
const wheelPending=Object.create(null);
let spinDuration=8500;
let spinTickFrame=0;
const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
function notify(msg,isError=false){const t=$('#toast');t.textContent=msg;t.className='toast show'+(isError?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.className='toast',3700)}
const safeJson=async resp=>{const b=await resp.json().catch(()=>({ok:false,error:'Server tidak mengirim data JSON.'}));if(!resp.ok||b.ok===false)throw Error(b.error||'Permintaan gagal.');return b};
async function api(path,method='GET',payload=null){if(IS_DEMO)return demoApi(path,method,payload);const init={method,credentials:'same-origin',headers:{}};if(payload){init.headers['Content-Type']='application/json';init.body=JSON.stringify(payload)}return safeJson(await fetch('/api/'+path,init));}
const startDataset=()=>{
 const seed=['Ranting Contoh A','Ranting Contoh B','Ranting Contoh C','Ranting Contoh D','Ranting Contoh E','Ranting Contoh F','Ranting Contoh G'];
 const settings={...DEFAULTS,categories_json:JSON.stringify(CATS),bank_name:'Bank Contoh',bank_account:'1234567890',bank_holder:'Bendahara Contoh (DEMO)',contact:'Isi kontak panitia di Pengaturan'};
 let nextId=1;const registrations=[],teams=[];
 seed.forEach((ranting,k)=>{
   const chosen=[...(k<6?['futsal']:[]),...(k<5?['gobak']:[]),'tarik_putra','tarik_putri'];
   const group={id:k+1,code:'SIMULASI-'+String(k+1).padStart(3,'0'),ranting,ranting_norm:ranting.toLowerCase(),total_amount:groupPrice(chosen,settings),contact:'',notes:'',payment_method:k%2?'transfer':'cash',payment_status:k%3===0?'paid':'pending',fees_snapshot:settings.categories_json,created_at:'2026-11-14'};
   registrations.push(group);
   chosen.forEach(category=>teams.push({...group,id:nextId++,group_id:group.id,category,participants:[`Nama Uji ${k+1}A`,`Nama Uji ${k+1}B`,`Nama Uji ${k+1}C`]}));
 });
 return {teams,registrations,settings,states:Object.fromEntries(CATS.map(c=>[c.id,'idle'])),slots:[],winners:[],details:[],nextId,nextGroupId:8};
};
let volatileDemo=null;
function getDemo(){try{const x=JSON.parse(localStorage.getItem('pgri81-demo-v7'));if(x?.teams&&x?.registrations&&x?.settings)return x}catch{}if(volatileDemo)return volatileDemo;const d=startDataset();saveDemo(d);return d}
function saveDemo(d){volatileDemo=d;try{localStorage.setItem('pgri81-demo-v7',JSON.stringify(d))}catch{}}
const demoPublic=d=>({ok:true,settings:d.settings,teams:d.teams.map(t=>({id:t.id,group_id:t.group_id,ranting:t.ranting,category:t.category,payment_status:t.payment_status,members_count:t.participants.length})),states:d.states,slots:d.slots,winners:d.winners,details:d.details||[],admin:false});
function syncDemoGroup(d,reg){d.teams.filter(t=>t.group_id===reg.id).forEach(t=>{Object.assign(t,{code:reg.code,ranting:reg.ranting,ranting_norm:reg.ranting_norm,total_amount:reg.total_amount,contact:reg.contact,notes:reg.notes,payment_method:reg.payment_method,payment_status:reg.payment_status})})}
async function demoApi(path,method='GET',b={}){
 const d=getDemo();if(path==='public')return demoPublic(d);
 if(path==='session')return {ok:true,admin:adminLogged||(()=>{try{return sessionStorage.getItem('pgri81-demo-admin')==='1'}catch{return false}})()};
 if(path==='login'){if(b.password!=='demo81')throw Error('Kata sandi demo: demo81');adminLogged=true;try{sessionStorage.setItem('pgri81-demo-admin','1')}catch{}return{ok:true}}
 if(path==='logout'){adminLogged=false;try{sessionStorage.removeItem('pgri81-demo-admin')}catch{}return{ok:true}}
 if(path==='admin'){if(!adminLogged)throw Error('Silakan masuk sebagai panitia.');return {...demoPublic(d),teams:d.teams,registrations:d.registrations,admin:true}}
 if(path==='admin/media' || path==='admin/media-reset'){
  if(!adminLogged)throw Error('Masuk sebagai panitia terlebih dahulu.');
  const item=MEDIA_ITEMS.find(m=>m.key===b.key);if(!item)throw Error('Jenis gambar tidak dikenal.');
  if(path==='admin/media'){
   if(typeof b.data_url!=='string'||!/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(b.data_url)||b.data_url.length>950000)throw Error('Gambar harus WebP, PNG, atau JPEG dan maksimal 700 KB.');
   try{localStorage.setItem('pgri81-demo-upload-'+b.key,b.data_url)}catch{demoMedia[b.key]=b.data_url;throw Error('Penyimpanan demo penuh. Coba gambar lebih kecil.');}
   demoMedia[b.key]=b.data_url;d.settings['media_'+b.key+'_rev']=String(Date.now());d.settings[item.setting]='';
  } else {
   try{localStorage.removeItem('pgri81-demo-upload-'+b.key)}catch{}
   delete demoMedia[b.key];d.settings['media_'+b.key+'_rev']='';d.settings[item.setting]='';
  }
  saveDemo(d);return {ok:true};
 }

 if(path==='admin/archives'){if(!adminLogged)throw Error('Masuk sebagai panitia dahulu.');return {ok:true,archives:(d.archives||[]).map(a=>({id:a.id,season_year:a.season_year,event_name:a.event_name,saved_at:a.saved_at,registrations_count:a.snapshot.registrations.length,teams_count:a.snapshot.teams.length}))}}
 if(path.startsWith('admin/archive?')){if(!adminLogged)throw Error('Masuk sebagai panitia dahulu.');const a=(d.archives||[]).find(x=>x.id===Number(path.split('=')[1]));if(!a)throw Error('Arsip tidak ditemukan');return{ok:true,archive:{...a,snapshot:JSON.stringify(a.snapshot)}}}
 if(path==='register'){
  if(!d.settings.registration_open)throw Error('Pendaftaran ditutup.');
  if(d.registrations.some(r=>r.ranting_norm===b.ranting.trim().toLocaleLowerCase('id-ID')))throw Error('Ranting sudah terdaftar. Minta panitia memperbaiki data.');
  if(!Array.isArray(b.entries)||!b.entries.length)throw Error('Pilih cabang lomba.');
  const cats=b.entries.map(x=>x.category);
  if(new Set(cats).size!==cats.length||cats.some(id=>!JSON.parse(d.settings.categories_json).some(c=>c.id===id&&c.enabled)))throw Error('Kategori tidak aktif atau duplikat.');
  if(cats.some(c=>d.states[c]!=='idle'))throw Error('Undian cabang terpilih sudah dimulai.');
  b.entries.forEach(x=>{const c=JSON.parse(d.settings.categories_json).find(y=>y.id===x.category);if(!x.participants?.length||x.participants.length<c.min_players||x.participants.length>c.max_players)throw Error('Jumlah pemain tidak sesuai aturan kategori '+c.name)});
  const reg={id:d.nextGroupId++,code:'SIM-'+Math.random().toString(36).slice(2,8).toUpperCase(),ranting:b.ranting.trim(),ranting_norm:b.ranting.trim().toLocaleLowerCase('id-ID'),contact:b.contact||'',notes:b.notes||'',payment_method:b.payment_method,payment_status:'pending',total_amount:groupPrice(cats,d.settings),fees_snapshot:d.settings.categories_json,created_at:new Date().toISOString()};
  d.registrations.push(reg);b.entries.forEach(x=>d.teams.push({...reg,id:d.nextId++,group_id:reg.id,category:x.category,participants:x.participants}));
  saveDemo(d);return{ok:true,code:reg.code,total_amount:reg.total_amount,categories:cats};
 }
 if(!adminLogged)throw Error('Masuk sebagai panitia dahulu.');
 if(path==='admin/settings'){
  if(b.categories_json){let cats;try{cats=JSON.parse(b.categories_json)}catch{throw Error('Format kategori tidak valid')};if(!Array.isArray(cats)||!cats.length||cats.length>20)throw Error('Daftar kategori harus 1-20');
   for(const oldCat of JSON.parse(d.settings.categories_json||'[]'))if(!cats.some(x=>x.id===oldCat.id))if(d.teams.some(x=>x.category===oldCat.id)||d.states[oldCat.id]!=='idle')throw Error('Kategori berisi tim/undian harus dinonaktifkan, bukan dihapus.');
   cats.forEach(c=>{if(!c.name||c.min_players<1||c.max_players>30||c.max_players<c.min_players)throw Error('Aturan kategori tidak valid');if(!(c.id in d.states))d.states[c.id]='idle'})}
  Object.assign(d.settings,b);
 }
 else if(path==='admin/new-edition'){
  if(b.confirm!=='ARSIPKAN'||!/^20\d{2}$/.test(b.season_year)||b.season_year===d.settings.season_year)throw Error('Tahun baru atau konfirmasi ARSIPKAN tidak valid.');
  d.archives=d.archives||[];d.archives.push({id:d.archives.length?Math.max(...d.archives.map(a=>a.id))+1:1,season_year:d.settings.season_year,event_name:d.settings.event_name,saved_at:new Date().toISOString(),snapshot:JSON.parse(JSON.stringify({settings:d.settings,registrations:d.registrations,teams:d.teams,states:d.states,slots:d.slots,winners:d.winners,details:d.details}))});
  d.registrations=[];d.teams=[];d.slots=[];d.winners=[];d.details=[];d.states=Object.fromEntries(JSON.parse(d.settings.categories_json).map(c=>[c.id,'idle']));d.settings={...d.settings,season_year:b.season_year,event_name:b.event_name,event_start:'',event_end:'',tm_date:'',anniversary_number:String((Number(d.settings.anniversary_number)||81)+(Number(b.season_year)-Number(d.settings.season_year))),registration_open:false};
 }
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
  else {reg.total_amount=calcFee(left.map(t=>t.category),JSON.parse(reg.fees_snapshot||d.settings.categories_json));syncDemoGroup(d,reg)}
 }
 else if(path==='admin/start-draw'){
  if(d.states[b.category]!=='idle')throw Error('Undian sudah dimulai');if(d.teams.filter(x=>x.category===b.category).length<2)throw Error('Minimal dua tim diperlukan');d.states[b.category]='live';
 }
 else if(path==='admin/next-draw'){
  if(d.states[b.category]!=='live')throw Error('Undian belum dimulai atau selesai.');
  const entrants=d.teams.filter(x=>x.category===b.category);
  const assigned=d.slots.filter(s=>s.category===b.category);
  const assignedTeams=new Set(assigned.map(s=>s.team_id));
  const queue=entrants.filter(x=>!assignedTeams.has(x.id));
  if(!queue.length){d.states[b.category]='complete';saveDemo(d);return{ok:true,complete:true};}
  const chosen=queue[0];
  const size=entrants.length;
  const usedSlots=new Set(assigned.map(s=>s.draw_order));
  const available=Array.from({length:size},(_,i)=>i+1).filter(n=>!usedSlots.has(n));
  const vals=new Uint32Array(1);let draw=0;
  try{const m=0x100000000,lim=m-m%available.length;do{crypto.getRandomValues(vals);draw=vals[0]}while(draw>=lim)}catch{draw=Math.floor(Math.random()*available.length)}
  const slotNo=available[draw%available.length];
  d.slots.push({category:b.category,team_id:chosen.id,draw_order:slotNo,created_at:new Date().toISOString()});
  if(queue.length===1)d.states[b.category]='complete';saveDemo(d);return{ok:true,chosen_team_id:chosen.id,slot_no:slotNo,complete:queue.length===1};
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
const bracketSizeFor=T.nextPower2;
function bracketFor(data,category,preview=false){return T.buildRounds(data,category,preview)}
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
 const visual=CATS;
 $('#homeCategoryGrid').innerHTML=visual.map((c,i)=>`<button class="cat-card premium-cat cat-${e(c.art)}" data-page="daftar" data-cat="${e(c.id)}"><span class="cat-no">${String(i+1).padStart(2,'0')} / ARENA</span><img class="cat-illustration" src="${assetUrl(artFor(c))}" alt="Ilustrasi ${e(c.name)}" loading="lazy"><span class="cat-text"><strong>${e(c.short||c.name).toUpperCase()}</strong><small>${e(c.gender||'TIM').toUpperCase()} <span>${c.enabled?'PILIH LOMBA ↗':'TIDAK AKTIF'}</span></small></span></button>`).join('');
 $('#registerCategories').innerHTML=enabledCats().map(c=>`<label class="choice premium-choice choice-${e(c.art)}"><input type="checkbox" name="sport" value="${e(c.id)}"><img src="${assetUrl(artFor(c))}" alt="" loading="lazy"><span class="choice-copy"><strong>${e(c.name)}</strong><small>${e(c.gender)} · ${c.min_players}–${c.max_players} pemain</small><em>${fmtMoney(c.fee)}</em></span></label>`).join('');
 $('#filterTeams').innerHTML=opts();
}
function saveRosterDrafts(){
 $$('.roster-block').forEach(block=>{rosterDrafts[block.dataset.cat]=[...block.querySelectorAll('.member-row input')].map(el=>el.value)});
}
function rosterRow(category,index,value=''){
 return `<div class="member-row"><span class="member-index">${String(index+1).padStart(2,'0')}</span><input type="text" maxlength="90" required placeholder="Nama lengkap anggota ${index+1}" aria-label="Anggota ${e(catName(category))} nomor ${index+1}" value="${e(value)}"><button class="remove-member" type="button" title="Hapus nama">×</button></div>`;
}
function renderRosters(){
 saveRosterDrafts();const categories=selectedSports();
 $('#rosterSections').innerHTML=categories.length?categories.map((category,i)=>{
  const cat=catById(category),names=rosterDrafts[category]||Array.from({length:cat.min_players},()=> '');
  return `<section class="roster-block" data-cat="${e(category)}"><div class="roster-header"><img src="${assetUrl(artFor(cat))}" alt=""><div><small>DAFTAR PEMAIN ${String(i+1).padStart(2,'0')}</small><h4>${e(cat.name)}</h4><p>${e(cat.rules||'Isi nama sesuai aturan panitia.')}</p></div><span class="roster-counter">${names.length}/${cat.max_players}</span></div><div class="participant-rows">${names.map((value,j)=>rosterRow(category,j,value)).join('')}</div><button type="button" class="btn-add" data-action="add-member" data-cat="${e(category)}">＋ Tambah anggota ${e(cat.name)}</button></section>`;
 }).join(''):'<div class="roster-empty">Pilih kategori perlombaan untuk menampilkan formulir nama anggota.</div>';
 $$('.roster-block').forEach(block=>renumberMembers(block));renderInvoice();
}
function renumberMembers(block){
 const rows=[...block.querySelectorAll('.member-row')],cat=catById(block.dataset.cat),max=cat?.max_players||30,min=cat?.min_players||1;
 rows.forEach((row,i)=>{row.querySelector('.member-index').textContent=String(i+1).padStart(2,'0');row.querySelector('input').placeholder='Nama lengkap anggota '+(i+1);row.querySelector('.remove-member').disabled=rows.length<=min;});
 const counter=block.querySelector('.roster-counter');if(counter)counter.textContent=rows.length+'/'+max;
 const add=block.querySelector('.btn-add');if(add)add.disabled=rows.length>=max;
}
function addMember(category,value=''){
 const block=$(`.roster-block[data-cat="${category}"]`),cat=catById(category);if(!block)return;
 const container=block.querySelector('.participant-rows'),count=container.querySelectorAll('.member-row').length;
 if(count>=cat.max_players){notify(`Batas ${cat.max_players} anggota per tim.`,true);return}
 container.insertAdjacentHTML('beforeend',rosterRow(category,count,value));renumberMembers(block);
 rosterDrafts[category]=[...block.querySelectorAll('.member-row input')].map(el=>el.value);
}
function renderInvoice(){
 const selection=selectedSports(),rows=invoiceParts(selection),total=calcFee(selection);
 $('#registrationInvoice').innerHTML=`<div class="invoice-caption"><span>RINGKASAN PENDAFTARAN</span><b>${selection.length} kategori · ${selection.length} tim</b></div>${rows.map(s=>`<div class="invoice-line"><span><strong>${e(s.name)}</strong><small>${e(s.subtitle)}</small></span><b>${fmtMoney(s.amount)}</b></div>`).join('')||'<div class="invoice-empty">Belum ada lomba yang dipilih.</div>'}<div class="invoice-total"><span>TOTAL PENDAFTARAN</span><strong>${fmtMoney(total)}</strong></div><p>Satu pembayaran per ranting. Jika dua kategori memiliki kode paket yang sama, tarif paket berlaku sekali.</p>`;
}
function renderBank(){
 if(!publicData)return;const cfg=publicData.settings;
 $('#bankInfo').innerHTML=cfg.bank_name&&cfg.bank_account?`<span class="account">${e(cfg.bank_account)}</span><p class="bank-name">${e(cfg.bank_name)}</p><p>Atas nama <b>${e(cfg.bank_holder||'Belum dicantumkan')}</b></p><button class="admin-mini" data-action="copy-bank">Salin nomor rekening</button>`:`<p>Rekening belum dicantumkan panitia. Gunakan bayar langsung atau tanyakan kepada bendahara.</p>`;
 $('#bankInfo').innerHTML+=`<p>${e(cfg.cash_instruction||'Pembayaran dicatat oleh panitia.')}</p><div class="fee-reference"><b>BIAYA PENDAFTARAN</b>${enabledCats().map(c=>`<p><span>${e(c.name)}<small>${e(c.gender)} • ${c.min_players}–${c.max_players} pemain</small></span><strong>${fmtMoney(c.fee)}</strong></p>`).join('')}<small>Harga paket kategori yang memiliki kode paket sama otomatis dihitung saat memilih dua kategori atau lebih.</small></div>`;
 $('#contactInfo').textContent=cfg.contact||'Kontak panitia belum dicantumkan.';renderInvoice();
}
function renderHome(){if(!publicData)return;const d=publicData,ct=d.teams.length,cfg=d.settings;
 $('#openLabel').textContent=cfg.registration_open?'Pendaftaran dibuka':'Pendaftaran ditutup';
 const completed=CATS.filter(c=>d.states[c.id]==='complete').length;
 $('#liveStrip').textContent=completed?`${completed} dari ${CATS.length} kategori sudah memiliki bagan`:`${ct} tim terdaftar • undian tersedia di menu TM`;
 const registered=new Set(d.teams.map(t=>t.ranting.toLocaleLowerCase('id-ID')));
 const suggestions=[...new Set(String(cfg.ranting_options||'').split(/[,;\n]+/).map(x=>x.trim()).filter(x=>x.length>=3&&!registered.has(x.toLocaleLowerCase('id-ID'))))].sort((a,b)=>a.localeCompare(b,'id'));
 $('#rantingSuggestions').innerHTML=suggestions.map(s=>`<option value="${e(s)}"></option>`).join('');
 $('#submitRegister').disabled=!cfg.registration_open;$('#submitRegister').innerHTML=cfg.registration_open?'Daftarkan semua tim <span>↗</span>':'Pendaftaran ditutup';
 document.title=`${cfg.event_name} · Guru Games`;
 const description=document.querySelector('meta[name=description]');if(description)description.content=`Pendaftaran, undian, dan bagan pertandingan ${cfg.event_name} · ${cfg.venue}.`;
 const dstr=(s)=>s?new Date(s+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'';
 $$('.topline span').forEach((node,i)=>{if(i===0)node.textContent='GURU GAMES × '+cfg.season_year;if(i===1)node.textContent=cfg.event_name;if(i===2)node.textContent=cfg.venue});
 $('.hero-kicker').innerHTML=`${cfg.event_start?`${e(dstr(cfg.event_start))} — ${e(dstr(cfg.event_end))}`:'JADWAL SEGERA DIUMUMKAN'} <span>●</span> ${e(cfg.venue)}`;
 $('.hero-foot span:first-child b').textContent=String(CATS.length).padStart(2,'0');
 $('.hero-copy .eyebrow').innerHTML=`<span class="eyebrow-square"></span> ${e(cfg.organizer)}`;
 $('.home-categories .section-heading h2').innerHTML=`${CATS.length} kategori.<br><i>Siap bertanding.</i>`;
 $('.home-categories .section-heading p').textContent=`Pilih kategori secara bebas, termasuk hanya tarik tambang putra atau putri. Setiap ranting mendapatkan satu tagihan.`;
 $('.aside-date').innerHTML=cfg.event_start?`${e(dstr(cfg.event_start))}<span>HINGGA<br>${e(dstr(cfg.event_end))}</span>`:'<span>JADWAL<br>MENYUSUL</span>';
 $('.aside-top>small').textContent=cfg.venue;
 $('#registerRules').textContent=cfg.rules_general||'Ketentuan panitia berlaku untuk semua kategori.';
 // Aset 2026 tidak disembunyikan atau ditimpa tanpa perintah panitia.
 setBrandImg('.feature-image img',cfg,'poster');
 $('.poster-tag').textContent='POSTER KEGIATAN ↗';
 setBrandImg('.hero-sport-photo',cfg,'hero');
 for(const [selector,key] of [
  ['.footer-logos img:nth-child(1)','hut'],['.footer-logos img:nth-child(2)','pgri'],['.footer-logos img:nth-child(3)','pjok'],
  ['.hero-badges img:nth-child(1)','hut'],['.hero-badges img:nth-child(2)','pgri'],['.hero-badges img:nth-child(3)','pjok']
 ]){const img=$(selector);if(img)img.hidden=false;setBrandImg(selector,cfg,key)}
 $('.brand-mark').innerHTML=`${e(cfg.anniversary_number||'81')}<span>↗</span>`;
 $('.hero-bg-number').textContent=cfg.anniversary_number||'81';
 $('.hero-photo-stamp').innerHTML=`PGRI <b>${e(cfg.anniversary_number||'81')}</b> / ${e(cfg.season_year)}`;
 $('.hero-photo-credit').textContent=CATS.map(c=>c.short).filter((v,i,a)=>a.indexOf(v)===i).slice(0,4).join(' · ').toUpperCase();
 $('.home-cta .overline').textContent=`${e(dstr(cfg.event_start))} • ${e(cfg.venue)}`;
 $('.site-footer .footer-main p').textContent=cfg.event_name;
 $('.site-footer .footer-bottom span:first-child').textContent=`© ${cfg.season_year} ${cfg.organizer}`;
 renderBank();
}
function renderTeams(){if(!publicData)return;
 const d=publicData,teams=d.teams,p=teams.filter(t=>t.payment_status==='paid').length;
 $('#participantStats').innerHTML=`<div class="stat-card red"><small>TOTAL TIM TERDAFTAR</small><strong>${teams.length}</strong></div><div class="stat-card"><small>PEMBAYARAN LUNAS</small><strong>${p}</strong></div><div class="stat-card"><small>MENUNGGU PEMBAYARAN</small><strong>${teams.length-p}</strong></div><div class="stat-card"><small>KATEGORI LOMBA</small><strong>${CATS.length}</strong></div>`;
 const search=$('#searchTeams').value.trim().toLowerCase(),filter=$('#filterTeams').value;
 const shown=teams.filter(t=>(!filter||t.category===filter)&&(!search||t.ranting.toLowerCase().includes(search)));
 $('#publicTeamsBody').innerHTML=shown.length?shown.map((t,i)=>`<tr><td>${String(i+1).padStart(2,'0')}</td><td><strong>${e(t.ranting)}</strong><small>ID Tim #${t.id}</small></td><td>${e(catName(t.category))}</td><td>${t.members_count??t.participants?.length??0} orang</td><td><span class="status ${t.payment_status}">${statuses[t.payment_status]}</span></td></tr>`).join(''):`<tr><td colspan="5" style="text-align:center;padding:55px">Belum ada tim sesuai pencarian ini.</td></tr>`;
}
function renderPills(el,active,kind){$(el).innerHTML=CATS.map(c=>`<button class="pill ${c.id===active?'active':''}" data-action="select-${kind}" data-cat="${c.id}">${e(c.name)} <small>${publicData?.teams.filter(t=>t.category===c.id).length||0}</small></button>`).join('')}
// Renderer inserted into existing app.js closure.
function wheelSvg(numbers){
 // One slice per available position. Drawn positions are removed completely.
 const count=numbers.length;
 const palette=['#D72E35','#E47D28','#1C9A97','#2E6AA0','#702F86','#C14E4E','#3E905A','#BF7D19'];
 const edgeLights=Array.from({length:56},(_,i)=>{const a=i*2*Math.PI/56;return `<circle cx="${(300+274*Math.cos(a)).toFixed(2)}" cy="${(300+274*Math.sin(a)).toFixed(2)}" r="${i%4===0?3.3:2.1}" fill="${i%4===0?'#fff7db':'#dcbf7c'}" opacity=".95"/>`}).join('');
 const paths=count?numbers.map((number,i)=>{
  const angle=-90+i*360/count,rads=angle*Math.PI/180;
  const x=300+195*Math.cos(rads),y=300+195*Math.sin(rads);
  let tilt=angle+90;const normalized=T.mod(tilt,360);if(normalized>90&&normalized<270)tilt+=180;
  const font=count>24?22:count>16?26:count>10?31:38;
  return `<path data-sector="${number}" d="${T.segmentPath(300,300,266,i,count)}" fill="${palette[i%palette.length]}" stroke="#182b3b" stroke-width="3"/><g transform="rotate(${tilt.toFixed(3)},${x.toFixed(3)},${y.toFixed(3)})"><text x="${x.toFixed(2)}" y="${(y+font*.34).toFixed(2)}" font-size="${font}" font-weight="900" text-anchor="middle" font-family="Arial,sans-serif" fill="#fff8e4" stroke="#142a41" stroke-width="2" paint-order="stroke" letter-spacing="-1">${String(number).padStart(2,'0')}</text></g>`;
 }).join(''):'<circle cx="300" cy="300" r="266" fill="#2a5262"/><text x="300" y="195" fill="#f1d48d" font-family="Arial,sans-serif" font-size="27" font-weight="900" text-anchor="middle">SEMUA NOMOR</text><text x="300" y="226" fill="#f1d48d" font-family="Arial,sans-serif" font-size="27" font-weight="900" text-anchor="middle">TERUNDI ✓</text>';
 return `<svg id="tmWheelDisc" class="tm-wheel-disc" viewBox="0 0 600 600" aria-hidden="true" style="transform:rotate(${wheelAngles[drawCat]||0}deg)">
 <defs><radialGradient id="tmWheelSheen"><stop offset="0%" stop-color="#fff" stop-opacity=".15"/><stop offset="65%" stop-color="#fff" stop-opacity=".03"/><stop offset="100%" stop-color="#000" stop-opacity=".22"/></radialGradient></defs>
 <circle cx="300" cy="300" r="293" fill="#0d1c29" stroke="#d2b66f" stroke-width="6"/>
 ${paths}<circle cx="300" cy="300" r="266" fill="url(#tmWheelSheen)" stroke="#142a3c" stroke-width="3"/>
 <circle cx="300" cy="300" r="272" fill="none" stroke="#d8c69a" stroke-width="3" stroke-dasharray="2 7"/>
 ${edgeLights}
 <circle cx="300" cy="300" r="73" fill="#13293e" stroke="#edcf7c" stroke-width="7"/>
 </svg>`;
}
function stageBracket(d,c,{compact=false,preview=false}={}){
 const rounds=bracketFor(d,c,preview);
 if(!rounds.length)return `<div class="bracket-empty">Minimal dua tim diperlukan untuk menampilkan bagan.</div>`;
 const L=T.bracketLayout(rounds,{compact});
 const rtitle=(r,last)=>r===last?'FINAL':r===last-1?'SEMIFINAL':r===last-2?'PEREMPAT FINAL':`BABAK ${r+1}`;
 const details=d.details||[];
 const row=(node,m,side,detail)=>{
  const selected=node?.type==='team',bye=node?.type==='bye',unknown=!selected&&!bye;
  const name=selected?(findTeam(node.id)?.ranting||'Nama tim tidak ditemukan'):(bye?'BYE — lolos otomatis':node?.slot?`Menunggu undian #${String(node.slot).padStart(2,'0')}`:node?.from?`Pemenang ${node.from}`:'Menunggu pemenang');
  const isWinner=selected&&m.winner===node.id;
  const vote=selected&&d.states[c]==='complete'&&adminLogged&&m.a&&m.b&&!m.automatic;
  const score=selected&&detail&&String(side==='a'?detail.score_a:detail.score_b)!==''?String(side==='a'?detail.score_a:detail.score_b):null;
  return `<div class="tb-team ${bye?'bye':unknown?'pending':isWinner?'advance':''}" title="${e(name)}"><span class="tb-team-name">${e(name)}</span>${node?.slot&&!bye?`<span class="tb-seed">#${String(node.slot).padStart(2,'0')}</span>`:''}${score!==null?`<span class="tb-score">${e(score)}</span>`:''}${isWinner?'<span class="tb-wins">✓</span>':''}${vote&&!isWinner&&!compact?`<button class="tb-pick" data-action="winner" data-cat="${c}" data-round="${m.round}" data-match="${m.match_no}" data-team="${node.id}" title="Tetapkan pemenang">✓</button>`:''}</div>`;
 };
 const headers=rounds.map((round,r)=>`<div class="tb-column-title" style="left:${L.positions[r][0].x}px;width:${L.cardWidth}px"><span>${String(r+1).padStart(2,'0')} / ${rtitle(r,rounds.length-1)}</span><b>${round.length} PERTANDINGAN</b></div>`).join('');
 const nodes=rounds.map((round,r)=>round.map((m,i)=>{
  const pos=L.positions[r][i];
  const detail=details.find(x=>x.category===c&&Number(x.round)===r&&Number(x.match_no)===i);
  const date=detail?.day?`${/^20\d{2}-/.test(detail.day)?new Date(detail.day+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short'}):detail.day+' NOV'}${detail.time?' · '+detail.time:''}`:(detail?.time||'');
  const hint=[date,detail?.field].filter(Boolean).join(' / ');
  return `<div class="tb-card" data-round="${r}" data-match="${i}" style="left:${pos.x}px;top:${pos.top}px;width:${L.cardWidth}px;height:${L.cardHeight}px"><div class="tb-card-label"><b>${e(m.match_id)}</b><span>${hint?e(hint):m.automatic?'BYE':m.winner?'HASIL TERCATAT':'—'}</span>${!compact&&adminLogged&&d.states[c]==='complete'?`<button class="tb-editor" data-action="edit-match" data-cat="${c}" data-round="${r}" data-match="${i}" title="Atur jadwal, skor, lapangan">ATUR</button>`:''}</div><div class="tb-team-stack">${row(m.aNode,m,'a',detail)}${row(m.bNode,m,'b',detail)}</div></div>`;
 }).join('')).join('');
 const connector=`<svg class="tb-lines" width="${L.width}" height="${L.height}" viewBox="0 0 ${L.width} ${L.height}" aria-hidden="true"><g fill="none" stroke="#b09a7c" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${L.paths.map(s=>`<path d="${s}"/>`).join('')}</g></svg>`;
 return `<div class="tb-scroll ${compact?'compact':''}"><div class="tb-stage" style="width:${L.width}px;height:${L.height}px">${connector}${headers}${nodes}</div></div>`;
}
function renderDraw(){if(!publicData)return;
 renderPills('#drawCategoryTabs',drawCat,'draw');
 const d=publicData,c=drawCat,st=d.states[c],teams=d.teams.filter(t=>t.category===c);
 const slots=d.slots.filter(s=>s.category===c),assigned=new Set(slots.map(s=>s.draw_order));
 const remainingNumbers=T.remainingWheelNumbers(teams.length,assigned);
 const byId=new Map(slots.map(s=>[s.team_id,s.draw_order]));
 const waiting=teams.filter(t=>!byId.has(t.id)),called=waiting[0];
 const last=spinResult?.category===c?spinResult:null;
 const already=slots.length;
 const wheelBtn=st==='idle'&&adminLogged?`<button class="tm-center-button" data-action="start-draw" data-cat="${c}" ${teams.length<2?'disabled':''}><span>MULAI</span><small>UNDIAN</small></button>`:st==='live'&&adminLogged?`<button class="tm-center-button" data-action="next-draw" data-cat="${c}" ${spinning||!called?'disabled':''}><span>${spinning?'···':'SPIN'}</span><small>${spinning?'MEMUTAR':'TEKAN DI SINI'}</small></button>`:st==='complete'?`<button class="tm-center-button" data-page="bagan" data-cat="${c}"><span>✓</span><small>BAGAN</small></button>`:`<div class="tm-center-button passive"><span>SPIN</span><small>PANITIA</small></div>`;
 const callText=st==='idle'?'Sesi belum dimulai':st==='complete'?'Semua ranting telah diundi':called?called.ranting:'Menunggu antrean';
 const calls=teams.map((t,i)=>{const pos=byId.get(t.id),selected=t.id===called?.id;
  return `<div class="tm-queue-entry ${selected&&st==='live'?'is-called':''} ${pos?'is-drawn':''}"><span class="tm-queue-no">${String(i+1).padStart(2,'0')}</span><div><b>${e(t.ranting)}</b><small>${pos?`Terundi → posisi #${String(pos).padStart(2,'0')}`:selected&&st==='live'?'Silakan maju dan tekan tombol SPIN':'Menunggu panggilan'}</small></div><span class="tm-queue-status">${pos?'✓':selected&&st==='live'?'●':'–'}</span></div>`}).join('');
 $('#drawPanel').innerHTML=`<div class="tm-wheel-panel"><div class="tm-panel-kicker">01 / RODA UNDIAN</div><div class="tm-wheel-head"><strong>PUTAR & TENTUKAN</strong><span>POSISI BAGAN</span></div><div class="tm-wheel-frame"><div class="tm-needle"><svg viewBox="0 0 56 85" role="img" aria-label="Jarum penunjuk bagian atas"><path d="M9 8 H47 L47 31 L28 80 L9 31 Z" fill="#f0c458" stroke="#101e2e" stroke-width="5"/><path d="M20 20 H36 L28 57 Z" fill="#fff3c0"/></svg></div>${wheelSvg(remainingNumbers)}${wheelBtn}</div><p class="tm-wheel-caption">${remainingNumbers.length?`<b>${remainingNumbers.length} NOMOR TERSISA</b> · Nomor yang sudah keluar otomatis dihapus dari roda. Jarum menunjukkan hasil saat roda berhenti.`:`<b>SEMUA NOMOR SUDAH TERUNDI</b> · Hasil tersimpan di bagan pertandingan.`}</p><div class="tm-progress"><span>${already} / ${teams.length} RANTING TERUNDI</span><span>${st==='complete'?'SELESAI':st==='live'?'LIVE TM':'BELUM MULAI'}</span></div><div class="tm-progress-track"><i style="width:${teams.length?already/teams.length*100:0}%"></i></div></div><div class="tm-call-panel"><div class="tm-panel-kicker">02 / GILIRAN RANTING</div><div class="tm-call-hero"><small>${st==='live'?'DIPANGGIL KE DEPAN':'STATUS PENGUNDIAN'}</small><strong id="tmCalledName">${e(callText)}</strong><p>${st==='idle'?'Panitia memulai sesi, kemudian memanggil peserta sesuai urutan pendaftaran.':st==='live'?'Ranting yang dipanggil menekan tombol SPIN di tengah roda. Slot yang terpilih akan ditandai otomatis pada bagan.':'Seluruh slot undian telah terisi. Bagan siap digunakan.'}</p></div><div id="tmResult" class="tm-result ${last?'visible':''}" aria-live="polite">${last?`<small>HASIL PUTARAN TERAKHIR</small><b>POSISI ${String(last.slot).padStart(2,'0')}</b><strong>${e(last.name)}</strong>`:`<small>HASIL PUTARAN</small><b>—</b><strong>Menunggu putaran pertama</strong>`}</div><div class="tm-settings"><label>DURASI PUTARAN <select id="spinDurationSelect" ${spinning?'disabled':''}><option value="6000" ${spinDuration===6000?'selected':''}>6 detik</option><option value="8500" ${spinDuration===8500?'selected':''}>8,5 detik (disarankan)</option><option value="11000" ${spinDuration===11000?'selected':''}>11 detik (dramatis)</option></select></label><span><b>EFEK SUARA</b> <button data-action="toggle-audio" class="tm-sound-btn" aria-label="Hidupkan atau matikan suara">${soundOn?'ON ♪':'OFF'}</button></span></div><div class="tm-queue-wrap"><div class="tm-queue-head"><b>URUTAN PANGGIL</b><span>${already}/${teams.length}</span></div><div class="tm-queue-list">${calls||'<p>Belum ada pendaftar.</p>'}</div></div>${st==='complete'?`<button class="btn btn-red tm-bracket-open" data-page="bagan" data-cat="${c}">LIHAT BAGAN FINAL ↗</button>`:''}${adminLogged&&st!=='idle'?`<button class="tm-reset" data-action="reset-draw" data-cat="${c}">↶ Reset undian kategori ini</button>`:!adminLogged?`<button class="btn btn-dark tm-bracket-open" data-page="panitia">Masuk panel panitia ↗</button>`:''}</div><div class="tm-preview-panel"><div class="tm-panel-kicker">03 / BAGAN LANGSUNG</div><div class="tm-preview-heading"><strong>SKEMA PERTANDINGAN</strong><span>Update setiap putaran</span></div>${stageBracket(d,c,{compact:true,preview:true})}<div class="tm-preview-note">Geser bagan untuk melihat babak berikutnya. <button data-page="bagan" data-cat="${c}">BUKA BAGAN BESAR ↗</button></div></div>`;
}
function renderBracket(){if(!publicData)return;
 renderPills('#bracketCategoryTabs',bracketCat,'bracket');
 const d=publicData,c=bracketCat,st=d.states[c],teams=d.teams.filter(t=>t.category===c);
 const rounds=bracketFor(d,c,true);
 if(teams.length<2||!rounds.length){$('#bracketPanel').innerHTML=`<div class="empty-state"><strong>Bagan belum tersedia.</strong><p>Minimal dua tim harus mendaftar pada kategori ini.</p></div>`;return}
 const champion=st==='complete'&&rounds.at(-1)[0].winner;
 const championName=champion?e(findTeam(champion)?.ranting||'—'):'';
 const first=rounds[0];const byes=first.filter(m=>m.aNode.type==='bye'||m.bNode.type==='bye').length;
 $('#bracketPanel').innerHTML=`<div class="tb-header"><div><span class="overline">BAGAN SISTEM GUGUR / ${e(catName(c).toUpperCase())}</span><h2>JALUR MENUJU JUARA</h2><p>${teams.length} tim · ${rounds.length} babak · ${byes} pertandingan memiliki BYE. ${st==='complete'?'Pengundian selesai.':'Posisi peserta akan terisi selama TM.'}</p></div><div class="tb-status ${st==='complete'?'finished':''}">${st==='complete'?'BAGAN FINAL':st==='live'?'PROSES UNDIAN':'MENUNGGU TM'}</div></div>${stageBracket(d,c,{compact:false,preview:true})}<div class="tb-legend"><span><i class="dot played"></i> Tim terundi</span><span><i class="dot bye"></i> BYE / lolos otomatis</span><span><i class="dot pending"></i> Menunggu undian / pemenang</span></div>${champion?`<div class="champion-banner"><div class="champion-cup">★</div><div><small>JUARA ${e(catName(c).toUpperCase())}</small><strong>${championName}</strong></div></div>`:''}<p class="bracket-help">Kotak dan garis memperlihatkan pertemuan tiap tim dari babak awal menuju final. <b>BYE</b> berarti langsung lolos tanpa bertanding. ${adminLogged&&st==='complete'?'Klik ✓ pada nama tim untuk menetapkan pemenang, atau ATUR untuk mengisi jadwal, lokasi, dan skor.':'Panitia akan memperbarui hasil dan jadwal pertandingan.'}</p>`;
}

function renderAdmin(){const root=$('#adminRoot');if(!adminLogged){root.innerHTML=`<form id="loginForm" class="login-box"><span class="overline">AREA TERBATAS</span><h2>LOGIN PANITIA</h2><p>Gunakan kata sandi yang sudah disetel pada pengaturan rahasia Cloudflare. Data peserta dan pengundian hanya bisa dikelola oleh panitia.</p><label class="field"><label for="adminPass">Kata sandi</label><input id="adminPass" type="password" autocomplete="current-password" placeholder="Masukkan sandi panitia" required></label><button class="btn btn-red full-width" type="submit">Masuk panel <span>↗</span></button>${IS_DEMO?'<p class="admin-info"><b>Mode demo:</b> kata sandi <code>demo81</code></p>':''}</form>`;return;}
 root.innerHTML=`<div class="admin-head"><h2>DASHBOARD PANITIA</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-outline-dark" data-action="export-csv">↓ Ekspor Tim</button><button class="btn btn-outline-dark" data-action="export-billing">↓ Ekspor Keuangan</button><button class="btn btn-dark" data-action="logout">Keluar</button></div></div><div class="admin-tabs">${[{id:'teams',label:'Data & Pembayaran'},{id:'settings',label:'Pengaturan'},{id:'draw',label:'Kontrol Undian'},{id:'archive',label:'Arsip & Tahun Baru'}].map(x=>`<button class="admin-tab ${adminTab===x.id?'active':''}" data-action="admin-tab" data-tab="${x.id}">${x.label}</button>`).join('')}</div><div id="adminBody"></div>`;
 renderAdminBody();
}
function readCategoryEditors(){return [...$$('#categoryEditors [data-cat-editor]')].map(el=>{const v=k=>el.querySelector(`[data-ck="${k}"]`)?.value??'';return {id:v('id'),name:v('name'),short:v('short'),gender:v('gender'),art:v('art'),fee:Number(v('fee')),package_group:v('package_group'),package_fee:Number(v('package_fee')),min_players:Number(v('min_players')),max_players:Number(v('max_players')),rules:v('rules'),enabled:v('enabled')==='true'}})}
function rebuildCategoryEditors(cats){
 const form=$('#settingsForm');if(!form)return;
 const preserved=Object.fromEntries(new FormData(form).entries());
 const currentTab=adminTab;const savedCats=CATS.map(x=>({...x}));
 CATS.splice(0,CATS.length,...cats);
 adminTab='settings';renderAdminBody();
 const now=$('#settingsForm');for(const [k,v] of Object.entries(preserved)){if(k==='registration_open')continue;const node=now.elements.namedItem(k);if(node&&node.value!==undefined)node.value=v;}
 now.elements.registration_open.checked=form.elements.registration_open?.checked??false;
 CATS.splice(0,CATS.length,...savedCats);adminTab=currentTab;
}
function previewColors(){const css=document.documentElement.style;for(const [id,key] of [['cfg-theme_primary','--red'],['cfg-theme_secondary','--navy'],['cfg-theme_accent','--gold']]){const v=$('#'+id)?.value;if(/^#[a-fA-F0-9]{6}$/.test(v||''))css.setProperty(key,v)}}
function downloadJson(data,name){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
async function loadArchiveList(){try{const result=await api('admin/archives');const root=$('#archiveList');if(!root)return;root.innerHTML=`<h3>Arsip edisi sebelumnya</h3>${result.archives.length?result.archives.map(a=>`<div class="archive-row"><div><b>${e(a.season_year)} · ${e(a.event_name)}</b><small>${a.registrations_count} ranting • ${a.teams_count} tim • diarsipkan ${e(a.saved_at)}</small></div><button type="button" class="btn btn-outline-dark" data-action="download-archive" data-id="${a.id}">Unduh arsip JSON</button></div>`).join(''):'<p>Belum ada arsip. Data kegiatan saat ini tetap aktif.</p>'}`;}catch(err){const root=$('#archiveList');if(root)root.textContent='Arsip tidak dapat dimuat: '+err.message}}
async function prepareMedia(file,key){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Pilih gambar PNG, JPG, atau WebP.');
 if(file.size>15*1024*1024)throw Error('File lebih dari 15 MB; kompres gambar terlebih dahulu.');
 const img=await new Promise((resolve,reject)=>{const tmp=new Image(),url=URL.createObjectURL(file);tmp.onload=()=>{URL.revokeObjectURL(url);resolve(tmp)};tmp.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Gambar tidak dapat dibaca.'))};tmp.src=url});
 const limit=key==='poster'?1500:key==='hero'?1200:700;
 let ratio=Math.min(1,limit/Math.max(img.naturalWidth,img.naturalHeight));
 for(let i=0;i<7;i++){
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
  const context=canvas.getContext('2d');if(!context)throw Error('Perangkat tidak mendukung pemrosesan gambar.');
  context.drawImage(img,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL('image/webp',Math.max(.58,.85-i*.04));
  if(data.length<900000 && /^data:image\/(webp|png|jpeg);base64,/.test(data))return data;
  ratio*=.78;
 }
 throw Error('Gambar masih terlalu besar; pilih gambar lebih kecil.');
}
async function uploadMedia(input){const item=MEDIA_ITEMS.find(x=>x.key===input.dataset.mediaKey);const file=input.files?.[0];if(!file||!item)return;
 input.disabled=true;notify('Mengoptimalkan dan mengunggah '+item.label+'...');
 try{const data=await prepareMedia(file,item.key);await api('admin/media','POST',{key:item.key,data_url:data});await reload(true);notify(item.label+' berhasil diganti dan tersimpan.');}
 catch(err){notify(err.message,true)}finally{input.disabled=false;input.value=''}
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
  const field=(key,title,type='text')=>`<div class="field"><label for="cfg-${key}">${title}</label><input id="cfg-${key}" type="${type}" name="${key}" maxlength="${key.endsWith('_url')?500:150}" value="${e(cfg[key]??'')}" placeholder="${e(title)}"></div>`;
  const area=(key,title,rows=3)=>`<div class="field full"><label for="cfg-${key}">${title}</label><textarea id="cfg-${key}" name="${key}" rows="${rows}" maxlength="3000">${e(cfg[key]||'')}</textarea></div>`;
  const categoryCard=(c,i)=>`<article class="cat-editor" data-cat-editor="${e(c.id)}"><div class="cat-editor-head"><b>NO. ${String(i+1).padStart(2,'0')} · ${e(c.name)}</b><span class="status ${c.enabled?'paid':'pending'}">${c.enabled?'Aktif':'Nonaktif'}</span><button type="button" class="admin-mini danger" data-action="remove-category" data-cat="${e(c.id)}">Hapus</button></div><div class="setting-grid">
   <div class="field"><label>Kode kategori (tetap)</label><input data-ck="id" value="${e(c.id)}" readonly></div>
   <div class="field"><label>Nama lengkap kategori</label><input data-ck="name" maxlength="80" value="${e(c.name)}" required></div>
   <div class="field"><label>Nama singkat</label><input data-ck="short" maxlength="35" value="${e(c.short)}" required></div>
   <div class="field"><label>Kelompok (Putra/Putri/Campuran)</label><input data-ck="gender" maxlength="30" value="${e(c.gender)}"></div>
   <div class="field"><label>Ilustrasi olahraga</label><select data-ck="art">${[['futsal','Futsal/bola'],['gobak','Gobak sodor'],['tarik','Tarik tambang']].map(([value,text])=>`<option value="${value}" ${c.art===value?'selected':''}>${text}</option>`).join('')}</select></div>
   <div class="field"><label>Biaya satu tim (Rp)</label><input type="number" data-ck="fee" min="0" max="100000000" value="${Number(c.fee)}" required></div>
   <div class="field"><label>Kode paket biaya (kosong = terpisah)</label><input data-ck="package_group" maxlength="32" value="${e(c.package_group)}" placeholder="Contoh: tarik_tambang"></div>
   <div class="field"><label>Biaya paket jika 2+ kategori dipilih (Rp)</label><input type="number" data-ck="package_fee" min="0" max="100000000" value="${Number(c.package_fee)}"></div>
   <div class="field"><label>Min. anggota tim</label><input type="number" data-ck="min_players" min="1" max="30" value="${Number(c.min_players)}" required></div>
   <div class="field"><label>Maks. anggota tim</label><input type="number" data-ck="max_players" min="1" max="30" value="${Number(c.max_players)}" required></div>
   <div class="field"><label>Ditampilkan di formulir?</label><select data-ck="enabled"><option value="true" ${c.enabled?'selected':''}>Ya, aktif</option><option value="false" ${!c.enabled?'selected':''}>Nonaktif</option></select></div>
   <div class="field full"><label>Aturan / juknis kategori</label><textarea data-ck="rules" rows="2" maxlength="1200">${e(c.rules)}</textarea></div>
  </div></article>`;
  root.innerHTML=`<form id="settingsForm" class="admin-surface manage-panel"><div class="setting-intro"><span class="overline">PUSAT KENDALI • ADMIN</span><h3>PENGATURAN SEMUA KEGIATAN</h3><p>Ubah langsung dari aplikasi tanpa mengedit kode. Data yang sudah terdaftar tetap tersimpan; perubahan tarif hanya berlaku untuk pendaftaran baru.</p></div><label class="settings-toggle"><input type="checkbox" name="registration_open" ${cfg.registration_open?'checked':''}> Pendaftaran sedang dibuka</label>
  <section class="setting-section"><div class="setting-section-heading"><b>01</b><div><h3>Identitas & Jadwal Kegiatan</h3><p>Digunakan pada beranda, formulir, bagan, dan publikasi.</p></div></div><div class="setting-grid">${field('event_name','Nama kegiatan')}${field('season_year','Tahun edisi')}${field('organizer','Nama penyelenggara')}${field('venue','Lokasi perlombaan')}${field('event_start','Tanggal mulai lomba','date')}${field('event_end','Tanggal selesai lomba','date')}${field('tm_date','Tanggal TM','date')}${field('tm_time','Jam TM','time')}${field('tm_venue','Tempat TM')}${field('contact','Kontak panitia')}${field('anniversary_number','HUT PGRI ke-')}</div>${area('rules_general','Ketentuan umum peserta & tata tertib',4)}</section>
  <section class="setting-section"><div class="setting-section-heading"><b>02</b><div><h3>Kategori, Tarif & Juknis</h3><p>Atur kategori putra/putri terpisah, jumlah anggota, dan tarif paket. Jika dua kategori memiliki kode paket identik, biaya paket dikenakan satu kali.</p></div></div><div id="categoryEditors">${CATS.map(categoryCard).join('')}</div><button type="button" class="btn btn-outline-dark" data-action="add-category">＋ Tambah kategori baru</button><p class="settings-hint">Jika kategori sudah memiliki peserta atau undian, nonaktifkan untuk menyembunyikannya dari pendaftaran; jangan menghapusnya.</p></section>
  <section class="setting-section"><div class="setting-section-heading"><b>03</b><div><h3>Pembayaran & Daftar Ranting</h3><p>Nomor rekening dan pilihan nama ranting dapat diperbarui kapan saja.</p></div></div><div class="setting-grid">${field('bank_name','Nama bank')}${field('bank_account','Nomor rekening')}${field('bank_holder','Pemilik rekening')}${area('cash_instruction','Instruksi pembayaran langsung',2)}${area('ranting_options','Nama ranting pilihan (satu per baris)',4)}</div></section>
  <section class="setting-section"><div class="setting-section-heading"><b>04</b><div><h3>Warna & Pengalaman Undian</h3><p>Sesuaikan identitas acara, durasi spin, dan warna utama.</p></div></div><div class="theme-presets">${Object.entries(themePresets).map(([id,cols])=>`<button type="button" class="theme-preset" data-action="theme-preset" data-preset="${id}" title="Tema ${id}"><i style="background:${cols[0]}"></i><i style="background:${cols[1]}"></i><i style="background:${cols[2]}"></i><span>${id.toUpperCase()}</span></button>`).join('')}</div><div class="setting-grid">${field('theme_primary','Warna utama','color')}${field('theme_secondary','Warna gelap','color')}${field('theme_accent','Warna aksen','color')}<div class="field"><label for="cfg-spin_duration">Durasi putaran standar</label><select id="cfg-spin_duration" name="spin_duration"><option value="6000" ${String(cfg.spin_duration)==='6000'?'selected':''}>6 detik</option><option value="8500" ${String(cfg.spin_duration)==='8500'?'selected':''}>8,5 detik</option><option value="11000" ${String(cfg.spin_duration)==='11000'?'selected':''}>11 detik</option></select></div></div><div class="setting-section-heading" style="margin-top:25px"><b>05</b><div><h3>Logo, Poster & Ilustrasi</h3><p>Gambar resmi 2026 tetap dipakai. Untuk tahun berikutnya Anda dapat langsung mengunggah gambar dari HP/laptop, memasang URL HTTPS, atau mengembalikan gambar bawaan. Unggahan akan muncul pada semua pengunjung setelah berhasil disimpan.</p></div></div><div class="media-setting-grid">${MEDIA_ITEMS.map(item=>`<div class="media-setting-card"><div class="media-preview"><img src="${e(mediaSrc(cfg,item.key))}" data-media-preview="${item.key}" alt="Pratinjau ${e(item.label)}"></div><div class="media-setting-content"><strong>${e(item.label)}</strong><small>Gambar sekarang · pratinjau diperbarui setelah unggah</small><label class="media-upload-trigger" for="media-file-${item.key}">↑ Pilih & unggah gambar<input type="file" id="media-file-${item.key}" data-media-key="${item.key}" accept="image/png,image/jpeg,image/webp" hidden></label><button type="button" class="admin-mini" data-action="reset-media" data-key="${item.key}">Kembalikan gambar bawaan</button><div class="field media-url-field"><label for="cfg-${item.setting}">Atau URL gambar HTTPS</label><input id="cfg-${item.setting}" name="${item.setting}" maxlength="500" value="${e(cfg[item.setting]||'')}" placeholder="https://...gambar.jpg"><small>Simpan seluruh pengaturan untuk menerapkan URL. Unggah gambar langsung tidak membutuhkan URL.</small></div></div></div>`).join('')}</div></section>
  <button class="btn btn-red settings-save" type="submit">SIMPAN SELURUH PENGATURAN <span>↗</span></button></form>`;
 }else if(adminTab==='archive'){
  root.innerHTML=`<div class="archive-panel"><div class="setting-intro"><span class="overline">EDISI TAHUNAN / ARSIP TERLINDUNGI</span><h3>GUNAKAN LAGI TAHUN DEPAN</h3><p>Mulai edisi baru tanpa membuat aplikasi baru. Data peserta, keuangan, undian, dan hasil tahun sebelumnya disimpan dalam arsip yang hanya dapat dibuka panitia.</p></div><div class="admin-note"><b>Langkah aman:</b> selesaikan seluruh pertandingan dan ekspor berkas keuangan, lalu buat edisi baru. Pengaturan lomba dan tema menjadi template edisi berikutnya. Pendaftaran edisi baru otomatis ditutup sampai panitia membukanya.</div><form id="newEditionForm" class="archive-form"><div class="setting-grid"><div class="field"><label>Tahun edisi berikutnya</label><input name="season_year" type="number" min="2026" max="2099" value="${Number(d.settings.season_year)+1}" required></div><div class="field"><label>Nama kegiatan edisi berikutnya</label><input name="event_name" maxlength="120" value="${e((d.settings.event_name||'Guru Games').replace(/20\d{2}/g,String(Number(d.settings.season_year)+1)))}" required></div><div class="field"><label>Ketik ARSIPKAN untuk mengonfirmasi</label><input name="confirm" maxlength="20" autocomplete="off" placeholder="ARSIPKAN" required></div></div><button type="submit" class="btn btn-red">ARSIPKAN DATA LAMA & BUAT EDISI BARU</button></form><div class="archive-list" id="archiveList"><p>Memuat daftar arsip ...</p></div></div>`;
  loadArchiveList();
 }else{
  root.innerHTML=`<div class="admin-note">Gunakan layar “Undian TM” untuk memanggil ranting sesuai urutan daftar, lalu memutar spin posisi bagan. Masing-masing kategori memiliki undian dan bagan terpisah. <b>Reset undian menghapus seluruh nomor undian dan hasil pertandingan kategori tersebut.</b></div><div class="admin-category-settings">${CATS.map(c=>`<div class="admin-category-box"><b>${e(c.name)}</b><span class="state">${d.teams.filter(t=>t.category===c.id).length} tim • ${statusText(d.states[c.id])}</span><button class="btn btn-dark full-width" data-page="undian" data-cat="${c.id}">Buka undian <span>↗</span></button><button class="admin-mini danger" data-action="reset-draw" data-cat="${c.id}" ${d.states[c.id]==='idle'?'disabled':''}>Reset kategori ini</button></div>`).join('')}</div><p class="admin-info">Saat undian berjalan, perwakilan ranting dapat bergiliran menekan tombol di laptop atau IFP yang sudah login panitia.</p>`;
 }
}
function openMatchEditor(category,round,matchNo){
 const m=bracketFor(publicData,category)[Number(round)]?.[Number(matchNo)];if(!m)return;
 const old=(publicData.details||[]).find(x=>x.category===category&&x.round===Number(round)&&x.match_no===Number(matchNo))||{};
 modal(`<span class="overline">JADWAL & SKOR PERTANDINGAN</span><h2>${e(catName(category))}</h2><p>Babak ${Number(round)+1}, pertandingan ${Number(matchNo)+1}. Isi tanggal, waktu, lokasi, dan skor sesuai keputusan panitia. Kosongkan bila belum ditentukan.</p><form id="matchDetailsForm" data-cat="${category}" data-round="${round}" data-match="${matchNo}"><div class="field"><label>Tanggal pertandingan</label><input type="date" name="day" value="${e(old.day?.length===2?`${publicData.settings.season_year}-11-${old.day}`:old.day||'')}"></div><div class="field"><label>Jam pertandingan</label><input type="time" name="time" value="${e(old.time||'')}"></div><div class="field"><label>Lapangan / tempat</label><input name="field" value="${e(old.field||'')}" maxlength="80" placeholder="Misalnya: Lapangan 1"></div><div class="split-field"><div class="field"><label>Skor tim atas</label><input type="number" min="0" max="999" name="score_a" value="${e(old.score_a||'')}"></div><div class="field"><label>Skor tim bawah</label><input type="number" min="0" max="999" name="score_b" value="${e(old.score_b||'')}"></div></div><div class="field"><label>Catatan pertandingan</label><input name="note" value="${e(old.note||'')}" maxlength="160"></div><button class="btn btn-red full-width" type="submit">Simpan jadwal & skor <span>↗</span></button></form>`);
}
function modal(html){$('#modalContent').innerHTML=html;$('#modal').hidden=false;document.body.style.overflow='hidden'}
function closeModal(){$('#modal').hidden=true;document.body.style.overflow=''}
async function reload(includeAdmin=adminLogged){
 publicData=await api('public');
 syncSettings(publicData.settings);renderCategoryCards();
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
 downloadCsv(cols,rows,`tim-guru-games-${publicData.settings.season_year}.csv`);
}
function exportBilling(){if(!adminData)return;
 const rows=adminData.registrations.map(r=>[r.code,r.ranting,adminData.teams.filter(t=>t.group_id===r.id).map(t=>catName(t.category)).join(' | '),r.total_amount,r.payment_method,r.payment_status,r.contact,r.notes]);
 downloadCsv(['Kode Pendaftaran','Ranting','Kategori','Total Tagihan (Rp)','Metode Bayar','Status','Kontak','Catatan'],rows,`keuangan-pgri-sekotong-${publicData.settings.season_year}.csv`);
}
async function startDraw(c){if(spinning)return;if(!adminLogged){notify('Masuk panitia untuk memulai undian.',true);return;}if(!confirm(`Mulai undian ${catName(c)}? Pendaftaran dan perubahan peserta kategori ini akan dikunci sampai reset.`))return;spinResult=null;await action('admin/start-draw',{category:c});}
function tickSound(){chirp(1050,20,'triangle')}
function victorySound(){if(!soundOn)return;[523,659,784,1047].forEach((freq,i)=>setTimeout(()=>chirp(freq,135,'sine'),i*138))}
function bezierCoord(a,b,t){const u=1-t;return 3*u*u*t*a+3*u*t*t*b+t*t*t;}
// Inverse of the exact CSS easing used below: x=.09/.10; y=.70/1.00.
// Gives audio ticks at the moments the fixed pointer actually crosses slice borders.
function easedTimeAtProgress(progress){
 let lo=0,hi=1;
 for(let i=0;i<22;i++){const mid=(lo+hi)/2;if(bezierCoord(.70,1,mid)<progress)lo=mid;else hi=mid;}
 return bezierCoord(.09,.10,(lo+hi)/2);
}
function tickSchedule(from,to,count,duration){
 const step=360/count,boundaries=[];
 for(let k=Math.floor(from/360)-2;k<=Math.ceil(to/360)+2;k++){
  for(let i=0;i<count;i++){
   const angle=-(i+.5)*step+360*k;
   if(angle>from&&angle<to)boundaries.push(angle);
  }
 }
 boundaries.sort((a,b)=>a-b);
 let last=-1000;
 return boundaries.map(angle=>{
  const ms=duration*easedTimeAtProgress((angle-from)/(to-from));
  if(ms-last<43)return null;
  last=ms;return ms;
 }).filter(ms=>ms!==null);
}
async function animateWheelTo(c,slot,numbers){
 const size=numbers.length;
 const disc=$('#tmWheelDisc');if(!disc)return;
 const previous=wheelAngles[c]||0;
 const selectedIndex=numbers.indexOf(slot);
 if(selectedIndex===-1)throw Error(`Nomor ${slot} tidak tersedia di roda. Undian sudah berubah; muat ulang.`);
 const destination=T.angleForSpin(previous,selectedIndex,size,7);
 if(T.wheelIndexFromAngle(destination,size)!==selectedIndex)throw Error('Posisi jarum tidak sesuai hasil undian.');
 const duration=spinDuration;
 disc.style.transform=`rotate(${previous}deg)`;
 if(reducedMotion()){
   wheelAngles[c]=T.mod(destination,360);
   disc.style.transform=`rotate(${wheelAngles[c]}deg)`;
   // Respect reduced motion: show the result with no revolutions at all.
   await new Promise(resolve=>setTimeout(resolve,200));
 }else{
   const timers=[];
   tickSchedule(previous,destination,size,duration).forEach(ms=>{if(soundOn)timers.push(setTimeout(()=>{if(spinning&&!document.hidden)tickSound()},ms))});
   if(typeof disc.animate==='function'){
     const animator=disc.animate([{transform:`rotate(${previous}deg)`},{transform:`rotate(${destination}deg)`}],{duration,easing:'cubic-bezier(.09,.70,.10,1)',fill:'forwards'});
     try{await Promise.race([animator.finished.catch(()=>{}),new Promise(resolve=>setTimeout(resolve,duration+250))]);}
     finally{timers.forEach(clearTimeout)}
     wheelAngles[c]=T.mod(destination,360);
     disc.style.transform=`rotate(${wheelAngles[c]}deg)`;
     animator.cancel();
   }else{
     // Fallback for older Android IFP browsers without Web Animations API.
     disc.style.transition=`transform ${duration}ms cubic-bezier(.09,.70,.10,1)`;
     await new Promise(resolve=>requestAnimationFrame(()=>{disc.style.transform=`rotate(${destination}deg)`;resolve()}));
     await new Promise(resolve=>setTimeout(resolve,duration+80));
     timers.forEach(clearTimeout);
     wheelAngles[c]=T.mod(destination,360);
     disc.style.transition='none';disc.style.transform=`rotate(${wheelAngles[c]}deg)`;
   }
 }

 const actual=numbers[T.wheelIndexFromAngle(wheelAngles[c],size)];
 if(actual!==slot)throw Error(`Verifikasi sudut gagal: jarum menunjukkan ${actual}, hasil server ${slot}`);
}
async function nextDraw(c){
 if(spinning)return;
 if(!adminLogged){notify('Login panitia diperlukan.',true);return}
 chirp(420,90,'triangle'); // unlock audio under the real user click before awaiting the server
 const current=publicData?.teams.filter(t=>t.category===c)||[];
 if(current.length<2||publicData.states[c]!=='live')return;
 // Snapshot the wheel *before* requesting a result. Offline demo reuses
 // the same slots array and mutates it synchronously when a result is saved.
 const numbers=T.remainingWheelNumbers(current.length,(publicData?.slots||[]).filter(s=>s.category===c).map(s=>s.draw_order));
 spinning=true;spinResult=null;
 const activeButton=$('#drawPanel .tm-center-button');if(activeButton){activeButton.disabled=true;activeButton.querySelector('span').textContent='···';}
 try{
  const result=await api('admin/next-draw','POST',{category:c});
  if(!result.slot_no)throw Error('Nomor posisi hasil undian tidak diterima. Muat ulang untuk memeriksa hasil.');
  if(!Number.isInteger(result.slot_no)||result.slot_no<1||result.slot_no>current.length)throw Error('Hasil undian di luar rentang posisi.');
  if(!numbers.includes(result.slot_no))throw Error('Nomor hasil sudah keluar sebelumnya. Periksa kembali data undian.');
  await animateWheelTo(c,result.slot_no,numbers);
  // Hold the winning number under the needle before removing that slice.
  // Its final position is verified against the exact list used to draw the wheel.
  const drawnName=findTeam(result.chosen_team_id)?.ranting||'Ranting terundi';
  const resultBox=$('#tmResult');
  if(resultBox){
   resultBox.classList.add('visible');
   resultBox.innerHTML=`<small>HASIL PUTARAN — NOMOR AKAN DIHAPUS</small><b>POSISI ${String(result.slot_no).padStart(2,'0')}</b><strong>${e(drawnName)}</strong>`;
  }
  victorySound();
  await new Promise(resolve=>setTimeout(resolve,reducedMotion()?250:1300));
  // Rebuild the wheel from the remaining slot numbers, with a fresh neutral angle.
  wheelAngles[c]=0;
  spinning=false;
  await reload(true);
  spinResult={category:c,name:drawnName,slot:result.slot_no};
  renderDraw();
  notify(result.complete?'Seluruh ranting terundi. Bagan telah siap.':`${spinResult.name} masuk POSISI BAGAN ${String(spinResult.slot).padStart(2,'0')}.`);
 }catch(err){spinning=false;await reload(true).catch(()=>{});renderDraw();notify('Undian perlu diperiksa: '+err.message,true)}
}

function openTeamEditor(id){const t=adminData?.teams.find(t=>t.id===Number(id));if(!t)return;const lock=adminData.states[t.category]!=='idle',groupLocked=adminData.teams.some(x=>x.group_id===t.group_id&&adminData.states[x.category]!=='idle');modal(`<span class="overline">EDIT TIM / ${e(t.code)}</span><h2>${e(t.ranting)}</h2><p>${e(catName(t.category))}${lock?' • Roster terkunci karena undian telah dimulai':''}</p><form id="editTeamForm" data-id="${t.id}"><div class="field"><label>Nama ranting</label><input name="ranting" value="${e(t.ranting)}" ${groupLocked?'disabled':''} required></div><div class="field"><label>Nama anggota (satu nama per baris)</label><textarea name="participants" rows="6" ${lock?'disabled':''}>${e(t.participants.join('\n'))}</textarea></div><div class="field"><label>Kontak</label><input name="contact" value="${e(t.contact)}"></div><div class="field"><label>Catatan</label><input name="notes" value="${e(t.notes)}"></div><div class="field"><label>Metode pembayaran</label><select name="payment_method"><option value="cash" ${t.payment_method==='cash'?'selected':''}>Bayar langsung</option><option value="transfer" ${t.payment_method==='transfer'?'selected':''}>Transfer</option></select></div><div class="field"><label>Status pembayaran</label><select name="payment_status"><option value="pending" ${t.payment_status==='pending'?'selected':''}>Belum lunas</option><option value="paid" ${t.payment_status==='paid'?'selected':''}>Lunas</option></select></div><button class="btn btn-red full-width" type="submit">Simpan perubahan <span>↗</span></button></form>`)}
async function onSubmitRegister(form){
 if(!publicData.settings.registration_open){notify('Pendaftaran sedang ditutup.',true);return}
 const selection=selectedSports();if(!selection.length){notify('Pilih minimal satu cabang lomba.',true);$('#registerCategories').scrollIntoView({behavior:'smooth',block:'center'});return}
 const categories=selection;
 const entries=[];
 for(const category of categories){
  const block=$(`.roster-block[data-cat="${category}"]`),inputs=[...block.querySelectorAll('.member-row input')];
  const participants=inputs.map(el=>el.value.trim()).filter(Boolean);
  if(participants.length<(catById(category)?.min_players||1)||participants.length>(catById(category)?.max_players||30)){notify('Jumlah anggota '+catName(category)+' tidak sesuai pengaturan lomba.',true);block.scrollIntoView({behavior:'smooth',block:'center'});return}
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
  if(page){if(spinning)return;if(cat&&page==='daftar'){const inp=$(`#registerCategories input[value="${cat}"]`);if(inp){inp.checked=true;renderRosters();}}if(cat&&page==='bagan')bracketCat=cat;if(cat&&page==='undian')drawCat=cat;setPage(page);return}
  const a=b.dataset.action;
  if(!a)return;
  if(a==='toggle-audio'){soundOn=!soundOn;const t=$('#soundToggle');t.setAttribute('aria-pressed',soundOn?'true':'false');t.setAttribute('aria-label',soundOn?'Nonaktifkan efek suara':'Aktifkan efek suara');t.querySelector('small').textContent=soundOn?'SUARA ON':'SUARA OFF';chirp(620,95);if(currentPage==='undian'&&!spinning)renderDraw();return}
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
   else if(a==='reset-media'){
    const item=MEDIA_ITEMS.find(m=>m.key===b.dataset.key);if(!item)return;
    if(!confirm('Kembalikan '+item.label+' ke gambar bawaan aplikasi?'))return;
    const good=await action('admin/media-reset',{key:item.key});if(good)notify(item.label+' kembali menggunakan gambar bawaan.');
   }
  else if(a==='add-category'){
    const current=$$('#categoryEditors [data-cat-editor]').length;
    if(current>=20){notify('Maksimal 20 kategori.',true);return}
    const id='lomba_'+String(Date.now()).slice(-8);const newCat={id,name:'Kategori Baru',short:'Lomba Baru',gender:'Campuran',art:'futsal',fee:0,package_group:'',package_fee:0,min_players:1,max_players:30,rules:'Ketentuan ditetapkan panitia.',enabled:true};
    // Render one editor by saving unsaved settings into a temporary DOM template.
    const currentCats=readCategoryEditors();currentCats.push(newCat);
    rebuildCategoryEditors(currentCats);
    $('#categoryEditors').lastElementChild?.scrollIntoView({block:'center',behavior:'smooth'});
   }
   else if(a==='remove-category'){
    const oldId=b.dataset.cat,hasTeams=(adminData?.teams||[]).some(x=>x.category===oldId);
    if(hasTeams||adminData?.states?.[oldId]!=='idle'){notify('Kategori yang memiliki peserta atau sudah diundi hanya boleh dinonaktifkan.',true);return}
    if(!confirm('Hapus kategori ini dari daftar?'))return;
    const cats=readCategoryEditors().filter(x=>x.id!==oldId);
    if(!cats.length){notify('Minimal harus ada satu kategori.',true);return}
    rebuildCategoryEditors(cats);
   }
   else if(a==='theme-preset'){
    const v=themePresets[b.dataset.preset];if(!v)return;
    ['theme_primary','theme_secondary','theme_accent'].forEach((k,i)=>{const inp=$(`#cfg-${k}`);if(inp)inp.value=v[i]});
    previewColors();
   }
   else if(a==='download-archive'){const id=Number(b.dataset.id);try{const d=await api('admin/archive?id='+id);downloadJson(JSON.parse(d.archive.snapshot),`arsip-guru-games-${d.archive.season_year}.json`)}catch(err){notify(err.message,true)}}
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
  const target=ev.target;
  if(target.matches('input[data-media-key]')){await uploadMedia(target);return}
  if(target.id==='spinDurationSelect'){spinDuration=Number(target.value)||8500;try{localStorage.setItem('pgri81-spin-duration',String(spinDuration))}catch{}return;}if(target.dataset.action!=='inline-payment')return;
  const group=adminData?.registrations.find(r=>r.id===Number(target.dataset.id));if(!group)return;
  if(target.value==='paid'&&!confirm(`Tandai seluruh tagihan ${group.ranting} sebesar ${fmtMoney(group.total_amount)} sebagai lunas?`)){target.value=group.payment_status;return}
  await action('admin/registration',{group_id:group.id,payment_status:target.value,payment_method:group.payment_method});
 });
 document.addEventListener('submit',async(ev)=>{
  if(ev.target.id==='registerForm'){ev.preventDefault();await onSubmitRegister(ev.target)}
  if(ev.target.id==='loginForm'){ev.preventDefault();const btn=ev.target.querySelector('button[type=submit]');btn.disabled=true;try{await api('login','POST',{password:$('#adminPass').value});adminLogged=true;adminData=await api('admin');renderAdmin();notify('Login panitia berhasil.')}catch(err){notify(err.message,true);btn.disabled=false}}
  if(ev.target.id==='settingsForm'){
   ev.preventDefault();const form=ev.target,payload=Object.fromEntries(new FormData(form).entries());
   payload.registration_open=form.elements.registration_open.checked;
   const cats=[...form.querySelectorAll('[data-cat-editor]')].map(el=>{
    const v=k=>el.querySelector(`[data-ck="${k}"]`)?.value??'';
    return {id:v('id'),name:v('name'),short:v('short'),gender:v('gender'),art:v('art'),fee:Number(v('fee')),package_group:v('package_group'),package_fee:Number(v('package_fee')),min_players:Number(v('min_players')),max_players:Number(v('max_players')),enabled:v('enabled')==='true',rules:v('rules')};
   });
   if(!cats.length){notify('Minimal harus ada satu kategori lomba.',true);return}
   if(new Set(cats.map(x=>x.id)).size!==cats.length){notify('Kode kategori harus unik.',true);return}
   for(const group of new Set(cats.map(x=>x.package_group).filter(Boolean))){const members=cats.filter(x=>x.package_group===group);if(new Set(members.map(x=>x.package_fee)).size>1){notify('Biaya paket harus sama untuk semua kategori dalam paket '+group,true);return}}
   payload.categories_json=JSON.stringify(cats);
   const success=await action('admin/settings',payload);if(success){notify('Semua pengaturan berhasil disimpan.');renderAdmin()}
  }
  if(ev.target.id==='newEditionForm'){
   ev.preventDefault();const payload=Object.fromEntries(new FormData(ev.target).entries());
   if(payload.confirm!=='ARSIPKAN'){notify('Untuk membuat edisi baru ketik ARSIPKAN.',true);return}
   if(!confirm('Seluruh data aktif akan DIPINDAH KE ARSIP, lalu pendaftaran edisi baru dimulai dalam keadaan tertutup. Lanjut?'))return;
   const done=await action('admin/new-edition',payload);if(done){adminTab='archive';renderAdmin();notify('Edisi baru dibuat. Atur tanggal dan buka pendaftaran setelah siap.')}
  }
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
 document.addEventListener('input',ev=>{if(['cfg-theme_primary','cfg-theme_secondary','cfg-theme_accent'].includes(ev.target.id))previewColors()});
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
 document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('tm-presentation','bracket-presentation')});
 $('#fullscreenBracket').addEventListener('click',async()=>{
   document.body.classList.add('bracket-presentation');
   if(document.documentElement.requestFullscreen&&!document.fullscreenElement)try{await document.documentElement.requestFullscreen()}catch{notify('Mode tayangan bagan aktif, tetapi fullscreen browser tidak tersedia.')}
 });
 $('#exitBracketPresentation').addEventListener('click',async()=>{document.body.classList.remove('bracket-presentation');if(document.fullscreenElement)try{await document.exitFullscreen()}catch{}});
 $('#printBracket').addEventListener('click',printBracket);
 $('#closeModal').addEventListener('click',closeModal);
 $('#modal').addEventListener('click',ev=>{if(ev.target.id==='modal')closeModal()});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!$('#modal').hidden)closeModal()});
 $('#resetDemo')?.addEventListener('click',()=>{if(confirm('Reset semua data demo dan kembalikan tim contoh?')){try{localStorage.removeItem('pgri81-demo-v7');MEDIA_ITEMS.forEach(m=>localStorage.removeItem('pgri81-demo-upload-'+m.key));sessionStorage.removeItem('pgri81-demo-admin')}catch{}volatileDemo=null;adminLogged=false;window.location.reload()}});
 window.addEventListener('hashchange',()=>setPage(location.hash.slice(1),true));
}
async function init(){try{const d=Number(localStorage.getItem('pgri81-spin-duration'));if([6000,8500,11000].includes(d))spinDuration=d}catch{}const audio=$('#soundToggle');audio.setAttribute('aria-pressed','true');audio.setAttribute('aria-label','Nonaktifkan efek suara');audio.querySelector('small').textContent='SUARA ON';renderCategoryCards();renderRosters();bindEvents();if(IS_DEMO)$('#demoBanner').hidden=false;
 try{
  const sess=await api('session');adminLogged=sess.admin;
  await reload(adminLogged);
  const hash=location.hash.slice(1);setPage(document.querySelector('#page-'+hash)?hash:'beranda',true);
 }catch(err){notify(err.message,true);setPage('beranda',true);$('.status-strip').innerHTML=`<span class="blinking-dot" style="background:#bd2e3a"></span><b>Belum terhubung ke database.</b> ${e(err.message)}`;$('#submitRegister').disabled=true;}
 setInterval(async()=>{if(['undian','bagan','peserta'].includes(currentPage)&&!spinning&&!IS_DEMO){try{publicData=await api('public');renderHome();if(currentPage==='undian')renderDraw();if(currentPage==='bagan')renderBracket();if(currentPage==='peserta')renderTeams()}catch{}}},12000);
}
init();
})();
