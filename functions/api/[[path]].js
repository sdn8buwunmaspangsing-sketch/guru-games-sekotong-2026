const INITIAL_CATEGORIES = [
 {id:'futsal',name:'Futsal Putra',short:'Futsal',gender:'Putra',art:'futsal',fee:150000,package_group:'',package_fee:0,min_players:1,max_players:30,rules:'Ketentuan jumlah pemain dan perlengkapan mengikuti juknis panitia.',enabled:true},
 {id:'gobak',name:'Gobak Sodor Putri',short:'Gobak Sodor',gender:'Putri',art:'gobak',fee:100000,package_group:'',package_fee:0,min_players:1,max_players:30,rules:'Ketentuan jumlah pemain dan perlengkapan mengikuti juknis panitia.',enabled:true},
 {id:'tarik_putra',name:'Tarik Tambang Putra',short:'Tarik Tambang',gender:'Putra',art:'tarik',fee:150000,package_group:'tarik_tambang',package_fee:150000,min_players:1,max_players:30,rules:'Boleh mendaftar kategori putra saja atau bersama kategori putri.',enabled:true},
 {id:'tarik_putri',name:'Tarik Tambang Putri',short:'Tarik Tambang',gender:'Putri',art:'tarik',fee:150000,package_group:'tarik_tambang',package_fee:150000,min_players:1,max_players:30,rules:'Boleh mendaftar kategori putri saja atau bersama kategori putra.',enabled:true}
];
const DEFAULTS = {
 event_name:'Pekan Olahraga Guru Sekotong 2026',season_year:'2026',organizer:'PGRI Cabang Kecamatan Sekotong',
 event_start:'2026-11-18',event_end:'2026-11-19',tm_date:'2026-11-16',tm_time:'09:00',tm_venue:'SDN 1 Cendi Manik',
 registration_open:true,bank_name:'',bank_account:'',bank_holder:'',
 cash_instruction:'Pembayaran langsung melalui bendahara panitia.',ranting_options:'',contact:'',venue:'Sekotong, Lombok Barat',
 rules_general:'Panitia berhak memverifikasi persyaratan peserta. Setiap tim mengikuti aturan lomba dan keputusan Technical Meeting.',
 theme_primary:'#e5323c',theme_secondary:'#172b40',theme_accent:'#e9bd67',theme_preset:'pgri',anniversary_number:'81',
 poster_url:'',hero_image_url:'',logo_hut_url:'',logo_pgri_url:'',logo_pjok_url:'',
 spin_duration:'8500',categories_json:JSON.stringify(INITIAL_CATEGORIES),
 media_hut_rev:'',media_pgri_rev:'',media_pjok_rev:'',media_poster_rev:'',media_hero_rev:'',
 fee_futsal:'150000',fee_gobak:'100000',fee_tarik:'150000'
};
const parseCategories = settings => {try {const arr=JSON.parse(settings.categories_json);return Array.isArray(arr)?arr:INITIAL_CATEGORIES;}catch{return INITIAL_CATEGORIES}};
const idsFor = settings => new Set(parseCategories(settings).map(c=>c.id));
const billAmount = (categories,settings) => {
 const selected=new Set(categories),byGroup=new Map();let total=0;
 for(const cat of parseCategories(settings).filter(c=>selected.has(c.id))){
  const group=cat.package_group||'';
  if(!group){total+=Number(cat.fee)||0;continue;}
  if(!byGroup.has(group))byGroup.set(group,[]);
  byGroup.get(group).push(cat);
 }
 for(const cats of byGroup.values())total+=cats.length>1?Number(cats[0].package_fee||0):Number(cats[0].fee||0);
 return total;
};
const validHex=v=>/^#[0-9a-fA-F]{6}$/.test(v);
function normalizeCategories(input){
 if(!Array.isArray(input)||!input.length||input.length>20)throw Error('Jumlah kategori harus 1 sampai 20.');
 const ids=new Set(),groups=new Map();
 const arr=input.map((x,i)=>{
  const id=clean(x?.id,32),name=clean(x?.name,80),short=clean(x?.short||name,35),gender=clean(x?.gender,30),art=clean(x?.art,15)||'futsal';
  const group=clean(x?.package_group,32),fee=Number(x?.fee),pkg=Number(x?.package_fee||0),min=Number(x?.min_players),max=Number(x?.max_players);
  if(!/^[a-z][a-z0-9_]{1,31}$/.test(id)||ids.has(id))throw Error('ID kategori harus unik dan hanya huruf kecil, angka atau garis bawah.');
  ids.add(id);
  if(!name||!short||!['futsal','gobak','tarik'].includes(art))throw Error('Nama, nama pendek atau ilustrasi kategori tidak valid.');
  if(group&&!/^[a-z][a-z0-9_]{0,31}$/.test(group))throw Error('Kode paket tidak valid.');
  if(!Number.isSafeInteger(fee)||fee<0||fee>100000000||!Number.isSafeInteger(pkg)||pkg<0||pkg>100000000)throw Error('Biaya kategori/paket harus angka Rp0–Rp100.000.000.');
  if(!Number.isInteger(min)||!Number.isInteger(max)||min<1||max>30||max<min)throw Error('Jumlah pemain minimal dan maksimal harus 1–30, maksimal tidak lebih kecil dari minimal.');
  if(group){if(groups.has(group)&&groups.get(group)!==pkg)throw Error('Harga paket dengan kode yang sama harus identik.');groups.set(group,pkg);}
  return {id,name,short,gender,art,fee,package_group:group,package_fee:pkg,min_players:min,max_players:max,rules:clean(x?.rules,1200),enabled:x?.enabled!==false};
 });
 return arr;
}
const j = (data, status=200, extra={}) => Response.json(data,{status,headers:{'Cache-Control':'no-store',...extra}});
const bad = (msg,code=400)=>j({ok:false,error:msg},code);
const clean = (s,max=120)=>String(s??'').trim().replace(/\s+/g,' ').slice(0,max);

const utf8 = new TextEncoder();
const toHex = u=>Array.from(u).map(x=>x.toString(16).padStart(2,'0')).join('');
async function digest(secret, message){
  const key=await crypto.subtle.importKey('raw',utf8.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return toHex(new Uint8Array(await crypto.subtle.sign('HMAC',key,utf8.encode(message))));
}
async function authorized(req, env){
  if(!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return false;
  const cookie=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('pgri_admin='));
  if(!cookie) return false;
  const parts=cookie.slice(11).split('.');
  if(parts.length!==2 || !/^\d+$/.test(parts[0]) || !/^[0-9a-f]{64}$/.test(parts[1]))return false;
  const exp=Number(parts[0]);
  if(!Number.isSafeInteger(exp)||exp<Date.now()||exp>Date.now()+86400001)return false;
  const sign=await digest(env.SESSION_SECRET,`pgri81.${exp}`);
  // constant-time-ish comparison
  let diff=0;for(let i=0;i<64;i++)diff|=sign.charCodeAt(i)^parts[1].charCodeAt(i);
  return diff===0;
}
async function getSettings(db){
 const rows=await db.prepare('SELECT key,value FROM settings').all();
 const result={...DEFAULTS},stored=new Set();
 for(const r of rows.results||[])if(Object.hasOwn(DEFAULTS,r.key)){
   stored.add(r.key);result[r.key]=r.key==='registration_open' ? r.value==='true':r.value;
 }
 // Preserve legacy custom prices for V6 installations during the upgrade.
 if(!stored.has('categories_json')){
  const base=structuredClone(INITIAL_CATEGORIES);
  for(const c of base){if(c.id==='futsal')c.fee=Number(result.fee_futsal);if(c.id==='gobak')c.fee=Number(result.fee_gobak);
    if(c.id.startsWith('tarik')){c.fee=Number(result.fee_tarik);c.package_fee=Number(result.fee_tarik)} }
  result.categories_json=JSON.stringify(base);
 }
 return result;
}
async function state(db,cat){return (await db.prepare('SELECT status FROM draw_states WHERE category=?').bind(cat).first())?.status||'idle';}
async function pull(db,admin=false){
 const [settings,trs,regs,ds,drs,ws,details]=await Promise.all([
   getSettings(db), db.prepare(`SELECT t.*, r.code, r.ranting, r.ranting_norm, r.contact, r.notes,
      r.payment_method, r.payment_status, r.total_amount, r.id AS group_id
      FROM teams t JOIN registrations r ON t.registration_id=r.id
      ORDER BY r.created_at ASC, t.id ASC`).all(),
   admin ? db.prepare('SELECT * FROM registrations ORDER BY created_at ASC, id ASC').all() : Promise.resolve({results:[]}),
   db.prepare('SELECT category,status FROM draw_states').all(),
   db.prepare('SELECT category,draw_order,team_id FROM draw_slots ORDER BY category,draw_order').all(),
   db.prepare('SELECT category,round,match_no,winner_team_id FROM match_winners').all(),
   db.prepare('SELECT * FROM match_details').all()
 ]);
 const teams=(trs.results||[]).map(t=>admin ? {...t,participants:JSON.parse(t.participants||'[]')} : {
   id:t.id,group_id:t.group_id,ranting:t.ranting,category:t.category,payment_status:t.payment_status,members_count:JSON.parse(t.participants||'[]').length
 });
 const states=Object.fromEntries(parseCategories(settings).map(c=>[c.id,'idle']));
 for(const x of ds.results||[])states[x.category]=x.status;
 return {ok:true,settings,teams,registrations:admin?(regs.results||[]):undefined,states,slots:drs.results||[],winners:ws.results||[],details:details.results||[],admin};
}
function cfgSafeSnapshot(raw){
 try{const parsed=JSON.parse(raw||'[]');
  if(Array.isArray(parsed))return {categories_json:JSON.stringify(parsed)};
  const base=structuredClone(INITIAL_CATEGORIES);
  for(const c of base){if(c.id==='futsal')c.fee=Number(parsed.fee_futsal||c.fee);if(c.id==='gobak')c.fee=Number(parsed.fee_gobak||c.fee);
   if(c.id.startsWith('tarik')){c.fee=Number(parsed.fee_tarik||c.fee);c.package_fee=Number(parsed.fee_tarik||c.package_fee)}}
  return {categories_json:JSON.stringify(base)};
 }catch{return {categories_json:DEFAULTS.categories_json}}
}
function bracketSizeFor(count){let size=2;while(size<count)size*=2;return size;}
function seedOrder(size){let seeds=[1,2];while(seeds.length<size){const sum=2*seeds.length+1;seeds=seeds.flatMap(n=>[n,sum-n]);}return seeds;}
function buildMatches(data,cat){
 const slots=data.slots.filter(x=>x.category===cat);
 if(!slots.length)return [];
 const teams=data.teams.filter(x=>x.category===cat);
 const seeded=seedOrder(bracketSizeFor(teams.length));
 const byNumber=new Map(slots.map(x=>[x.draw_order,x.team_id]));
 let incoming=seeded.map(n=>n>teams.length?{type:'bye'}:byNumber.has(n)?{type:'team',id:byNumber.get(n)}:{type:'awaiting'}),rounds=[];
 for(let r=0;incoming.length>=2;r++){
   const matches=[],next=[];
   for(let m=0;m<incoming.length/2;m++){
     const aNode=incoming[m*2],bNode=incoming[m*2+1];
     const a=aNode.type==='team'?aNode.id:null,b=bNode.type==='team'?bNode.id:null;
     let winner=null;
     if(aNode.type==='team' && bNode.type==='bye')winner=a;
     else if(bNode.type==='team'&&aNode.type==='bye')winner=b;
     else if(a && b){
       const saved=data.winners.find(w=>w.category===cat&&Number(w.round)===r&&Number(w.match_no)===m);
       if(saved&&(Number(saved.winner_team_id)===a||Number(saved.winner_team_id)===b))winner=Number(saved.winner_team_id);
     }
     matches.push({round:r,match_no:m,a,b,winner,automatic:!!winner&&(aNode.type==='bye'||bNode.type==='bye')});
     next.push(winner?{type:'team',id:winner}:{type:'awaiting'});
   }
   rounds.push(matches);incoming=next;
 }
 return rounds;
}
async function body(req){
 if(Number(req.headers.get('content-length')||0)>40000)throw Error('Ukuran permintaan terlalu besar.');
 const b=await req.json();
 if(!b || typeof b!=='object'||Array.isArray(b))throw Error('Format data tidak valid.');return b;
}
function validateMembers(raw){
 if(!Array.isArray(raw))throw Error('Daftar peserta tidak valid.');
 let p=raw.map(x=>clean(x,90)).filter(Boolean);
 if(p.length<1||p.length>30)throw Error('Masukkan 1–30 nama peserta.');
 if(new Set(p.map(x=>x.toLocaleLowerCase('id-ID'))).size!==p.length)throw Error('Ada nama peserta yang sama dalam satu tim.');
 return p;
}

// ===== V3: audit log, tagihan manual, edit bagan =====
async function auditRun(db,action,detail){
 try{await db.prepare('INSERT INTO audit_log(action,detail) VALUES(?,?)').bind(action,JSON.stringify(detail||{}).slice(0,2000)).run();}catch{}
}
const catLabel=(cfg,id)=>parseCategories(cfg).find(c=>c.id===id)?.name||id;
const toMoney=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<0||n>1000000000)throw Error('Nominal harus angka bulat Rp0–Rp1.000.000.000.');return n;};
function billingSettings(reg,cfg){
 let cats=[];try{cats=JSON.parse(cfgSafeSnapshot(reg.fees_snapshot).categories_json)}catch{}
 const have=new Set(cats.map(c=>c.id));
 for(const c of parseCategories(cfg))if(!have.has(c.id))cats.push(c);
 return {categories_json:JSON.stringify(cats)};
}
// Pertandingan yang dilalui sebuah nomor posisi, dari babak 1 sampai final.
function pathMatches(size,slot){
 const pos=seedOrder(size).indexOf(slot),rounds=Math.log2(size),out=[];
 for(let r=0;r<rounds;r++)out.push({round:r,match_no:pos>>(r+1)});
 return out;
}
async function resultsInPaths(db,cat,size,slots){
 const [w,d]=await Promise.all([
  db.prepare('SELECT round,match_no FROM match_winners WHERE category=?').bind(cat).all(),
  db.prepare("SELECT round,match_no FROM match_details WHERE category=? AND (score_a<>'' OR score_b<>'')").bind(cat).all()]);
 const hit=new Set([...(w.results||[]),...(d.results||[])].map(x=>x.round+':'+x.match_no));
 return slots.some(s=>pathMatches(size,s).some(p=>hit.has(p.round+':'+p.match_no)));
}
// Pertandingan babak berikutnya yang bergantung pada hasil sebuah pertandingan.
const downstreamPairs=(round,match,rounds)=>{const out=[];for(let r=round+1;r<rounds;r++)out.push({round:r,match_no:match>>(r-round)});return out;};
const code=()=>`SKT-${Array.from(crypto.getRandomValues(new Uint8Array(4))).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase()}`;
function randomlyPick(arr){
 if(arr.length===1)return arr[0];
 const max=0x100000000, lim=max-max%arr.length;let x;
 do{x=crypto.getRandomValues(new Uint32Array(1))[0];}while(x>=lim);
 return arr[x%arr.length];
}
export async function onRequest({request,env}){
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,'').replace(/\/$/,'');
 const method=request.method.toUpperCase(), db=env.DB;
 if(!db)return bad('Database belum terhubung. Atur binding D1 bernama DB di Cloudflare Pages.',503);
 // File media publik. Berkas hanya dapat diganti oleh panitia yang login.
 const mediaKey=path.startsWith('media/')?path.slice(6):'';
 const validMedia=new Set(['hut','pgri','pjok','poster','hero']);
 if(method==='GET'&&validMedia.has(mediaKey)){
  try{
   const row=await db.prepare('SELECT mime,data FROM site_media WHERE key=?').bind(mediaKey).first();
   if(!row)return new Response('Gambar belum diunggah',{status:404,headers:{'Cache-Control':'no-store'}});
   const binary=atob(row.data);const bytes=new Uint8Array(binary.length);
   for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
   return new Response(bytes,{headers:{'Content-Type':row.mime,'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
  }catch{return new Response('Media belum tersedia',{status:404})}
 }

 try{
 if(method==='GET'&&path==='public')return j(await pull(db,false));
 if(method==='POST'&&path==='register'){
   const b=await body(request);
   if(b.website)return bad('Permintaan tidak diterima.');
   const cfg=await getSettings(db);
   if(!cfg.registration_open)return bad('Pendaftaran sedang ditutup. Hubungi panitia.');
   const ranting=clean(b.ranting,100),payment=clean(b.payment_method,20);
   if(ranting.length<3||!['cash','transfer'].includes(payment))return bad('Periksa nama ranting dan metode pembayaran.');
   if(!Array.isArray(b.entries)||b.entries.length<1||b.entries.length>20)return bad('Pilih minimal satu cabang perlombaan.');
   const categories=b.entries.map(x=>clean(x?.category,40));
   const active=new Map(parseCategories(cfg).filter(c=>c.enabled).map(c=>[c.id,c]));
   if(categories.some(x=>!active.has(x))||new Set(categories).size!==categories.length)return bad('Kategori pilihan tidak valid, berulang atau sudah ditutup.');
   const entries=b.entries.map(x=>{const category=clean(x.category,40),cat=active.get(category),players=validateMembers(x.participants);if(players.length<cat.min_players||players.length>cat.max_players)throw Error(`Anggota ${cat.name} harus ${cat.min_players} sampai ${cat.max_players} orang.`);return{category,participants:players};});
   for(const category of categories)if(await state(db,category)!=='idle')return bad('Pendaftaran '+category+' telah ditutup karena undian dimulai. Hubungi panitia untuk penambahan tim setelah undian.');
   const norm=ranting.toLocaleLowerCase('id-ID'),c=code(),amount=billAmount(categories,cfg);
   const snapshot=cfg.categories_json;
   try{
     const ops=[db.prepare(`INSERT INTO registrations(code,ranting,ranting_norm,contact,notes,payment_method,total_amount,fees_snapshot)
       VALUES(?,?,?,?,?,?,?,?)`).bind(c,ranting,norm,clean(b.contact,100),clean(b.notes,300),payment,amount,snapshot)];
     for(const x of entries)ops.push(db.prepare(`INSERT INTO teams(registration_id,category,participants)
       SELECT id,?,? FROM registrations WHERE ranting_norm=?`).bind(x.category,JSON.stringify(x.participants),norm));
     await db.batch(ops); // D1 batch is atomic: all selected teams enter or none do.
   }catch(err){
     if(/UNIQUE constraint/i.test(err.message))return bad('Ranting ini sudah terdaftar. Hubungi panitia untuk memperbaiki atau menambah kategori.',409);
     throw err;
   }
   return j({ok:true,code:c,total_amount:amount,categories,info:'Semua tim terdaftar. Satu pembayaran menunggu konfirmasi panitia.'},201);
 }
 if(method==='POST'&&path==='login'){
   if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET)return bad('ADMIN_PASSWORD dan SESSION_SECRET belum disetel oleh pemilik aplikasi.',503);
   const b=await body(request);
   const input=String(b.password||'');
   const good=await digest(env.SESSION_SECRET,input)===await digest(env.SESSION_SECRET,env.ADMIN_PASSWORD);
   if(!good)return bad('Kata sandi panitia salah.',401);
   const exp=Date.now()+12*60*60*1000;
   const sign=await digest(env.SESSION_SECRET,`pgri81.${exp}`);
   return j({ok:true},200,{'Set-Cookie':`pgri_admin=${exp}.${sign}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200`});
 }
 if(method==='POST'&&path==='logout')return j({ok:true},200,{'Set-Cookie':'pgri_admin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'});
 if(path==='session'&&method==='GET')return j({ok:true,admin:await authorized(request,env)});
 if(!path.startsWith('admin/')&&path!=='admin')return bad('Rute tidak dikenal.',404);
 if(!await authorized(request,env))return bad('Silakan masuk sebagai panitia.',401);
 if(method==='GET'&&path==='admin')return j(await pull(db,true));
 if(method==='GET'&&path==='admin/audit'){
   const rows=await db.prepare('SELECT id,at,action,detail FROM audit_log ORDER BY id DESC LIMIT 150').all();
   return j({ok:true,logs:rows.results||[]});
 }
 if(method==='GET'&&path==='admin/archives'){
   const rows=await db.prepare('SELECT id,season_year,event_name,saved_at,registrations_count,teams_count FROM archived_editions ORDER BY id DESC').all();
   return j({ok:true,archives:rows.results||[]});
 }
 if(method==='GET'&&path==='admin/archive'){
   const id=Number(url.searchParams.get('id'));
   if(!Number.isInteger(id)||id<1)return bad('Arsip tidak valid.');
   const row=await db.prepare('SELECT * FROM archived_editions WHERE id=?').bind(id).first();
   if(!row)return bad('Arsip tidak ditemukan.',404);
   return j({ok:true,archive:row});
 }
 if(method==='POST' && (path==='admin/media' || path==='admin/media-reset')){
   const payload=await request.text();if(payload.length>950000)return bad('Gambar terlalu besar. Maksimal sekitar 700 KB.');
   let b;try{b=JSON.parse(payload)}catch{return bad('Format unggahan tidak benar.');}
   if(!validMedia.has(b.key))return bad('Jenis gambar tidak dikenal.');
   const urlField=({hut:'logo_hut_url',pgri:'logo_pgri_url',pjok:'logo_pjok_url',poster:'poster_url',hero:'hero_image_url'})[b.key];
   const revField='media_'+b.key+'_rev';
   if(path==='admin/media'){
    const match=/^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(b.data_url||'');
    if(!match||match[2].length>900000)return bad('Format gambar tidak didukung atau terlalu besar.');
    if(match[2].length%4!==0)return bad('Data gambar tidak lengkap.');
    const rev=String(Date.now());
    await db.batch([
     db.prepare('INSERT INTO site_media(key,mime,data) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET mime=excluded.mime,data=excluded.data').bind(b.key,match[1],match[2]),
     db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(revField,rev),
     db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(urlField,'')
    ]);
    return j({ok:true});
   }
   await db.batch([
    db.prepare('DELETE FROM site_media WHERE key=?').bind(b.key),
    db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(revField,''),
    db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(urlField,'')
   ]);
   return j({ok:true});
 }
 if(method!=='POST')return bad('Metode tidak didukung.',405);
 const b=await body(request);
 if(path==='admin/new-edition'){
   const year=clean(b.season_year,4),eventName=clean(b.event_name,120);
   if(!/^20\d{2}$/.test(year)||!eventName)return bad('Isi tahun 20XX dan judul kegiatan baru.');
   const current=await pull(db,true);
   if(year===String(current.settings.season_year))return bad('Tahun baru harus berbeda dari tahun berjalan.');
   if(clean(b.confirm,20)!=='ARSIPKAN')return bad('Ketik ARSIPKAN untuk konfirmasi pergantian tahun.');
   const archive={settings:current.settings,registrations:current.registrations,teams:current.teams,states:current.states,slots:current.slots,winners:current.winners,details:current.details};
   const snapshot=JSON.stringify(archive);
   const operations=[
    db.prepare('INSERT INTO archived_editions(season_year,event_name,registrations_count,teams_count,snapshot) VALUES(?,?,?,?,?)').bind(String(current.settings.season_year),String(current.settings.event_name),current.registrations.length,current.teams.length,snapshot),
    db.prepare('DELETE FROM match_winners'),db.prepare('DELETE FROM match_details'),db.prepare('DELETE FROM draw_slots'),
    db.prepare('DELETE FROM teams'),db.prepare('DELETE FROM registrations'),
    db.prepare("UPDATE draw_states SET status='idle'"),
    db.prepare("INSERT INTO settings(key,value) VALUES('season_year',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(year),
    db.prepare("INSERT INTO settings(key,value) VALUES('event_name',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(eventName),
    db.prepare("INSERT INTO settings(key,value) VALUES('registration_open','false') ON CONFLICT(key) DO UPDATE SET value='false'"),
    db.prepare("INSERT INTO settings(key,value) VALUES('event_start','') ON CONFLICT(key) DO UPDATE SET value=''"),
    db.prepare("INSERT INTO settings(key,value) VALUES('event_end','') ON CONFLICT(key) DO UPDATE SET value=''"),
    db.prepare("INSERT INTO settings(key,value) VALUES('tm_date','') ON CONFLICT(key) DO UPDATE SET value=''"),
    db.prepare("INSERT INTO settings(key,value) VALUES('anniversary_number',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String((Number(current.settings.anniversary_number)||81)+(Number(year)-Number(current.settings.season_year))))
   ];
   await db.batch(operations);
   return j({ok:true,archived_season:current.settings.season_year,new_season:year});
 }
 if(path==='admin/settings'){
   const changes={};
   for(const k of Object.keys(DEFAULTS))if(Object.hasOwn(b,k))changes[k]=k==='registration_open'?(b[k]?'true':'false'):
     (k==='categories_json'?String(b[k]):k==='ranting_options'?String(b[k]??'').trim().slice(0,3000):
       k==='rules_general'?String(b[k]??'').trim().slice(0,3000):clean(b[k],k.endsWith('_url')?500:k.includes('instruction')?400:150));
   if(Object.keys(changes).length===0)return bad('Tidak ada pengaturan yang diperbarui.');
   for(const key of ['fee_futsal','fee_gobak','fee_tarik'])if(Object.hasOwn(changes,key)&&!/^\d*$/.test(changes[key]))return bad('Biaya harus angka.');
   for(const key of ['theme_primary','theme_secondary','theme_accent'])if(Object.hasOwn(changes,key)&&!validHex(changes[key]))return bad('Warna tema harus format #RRGGBB.');
   if(Object.hasOwn(changes,'season_year')&&!/^20\d{2}$/.test(changes.season_year))return bad('Tahun kegiatan harus format YYYY.');
   if(Object.hasOwn(changes,'season_year')){const current=await getSettings(db);if(changes.season_year!==current.season_year){const n=await db.prepare('SELECT COUNT(*) AS n FROM registrations').first();if(n.n>0)return bad('Untuk mengganti tahun dengan peserta aktif, gunakan menu Arsip & Tahun Baru agar data lama aman.');}}
   for(const key of ['poster_url','hero_image_url','logo_hut_url','logo_pgri_url','logo_pjok_url'])if(Object.hasOwn(changes,key)&&changes[key]&&!/^https:\/\/[^\s]+$/i.test(changes[key]))return bad('URL gambar harus HTTPS publik atau dikosongkan.');
   if(Object.hasOwn(changes,'anniversary_number')&&!/^\d{1,3}$/.test(changes.anniversary_number))return bad('Nomor HUT maksimal tiga digit.');
   for(const key of ['event_start','event_end','tm_date'])if(Object.hasOwn(changes,key)&&changes[key]&&!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(changes[key]))return bad('Tanggal harus format YYYY-MM-DD.');
   if(Object.hasOwn(changes,'spin_duration')&&![6000,8500,11000].includes(Number(changes.spin_duration)))return bad('Durasi putar hanya 6, 8,5, atau 11 detik.');
   if(Object.hasOwn(changes,'categories_json')){
     let normalized;try{normalized=normalizeCategories(JSON.parse(changes.categories_json));}catch(err){return bad(err.message)}
     const old=await getSettings(db),oldCats=parseCategories(old),newIds=new Set(normalized.map(c=>c.id));
     for(const c of oldCats.filter(c=>!newIds.has(c.id))){
       const row=await db.prepare('SELECT COUNT(*) AS n FROM teams WHERE category=?').bind(c.id).first();
       if(row.n>0||await state(db,c.id)!=='idle')return bad('Kategori '+c.name+' masih memiliki tim atau undian. Nonaktifkan saja, jangan dihapus.');
     }
     changes.categories_json=JSON.stringify(normalized);
     const ops=normalized.map(c=>db.prepare('INSERT OR IGNORE INTO draw_states(category,status) VALUES(?,?)').bind(c.id,'idle'));
     await db.batch([...ops,...Object.entries(changes).map(([k,v])=>db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,v))]);
     return j({ok:true});
   }
   await db.batch(Object.entries(changes).map(([k,v])=>db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,v)));
   return j({ok:true});
 }
 if(path==='admin/registration'){
   const groupId=Number(b.group_id),pay=clean(b.payment_status,20),methodPay=clean(b.payment_method,20);
   if(!['paid','pending'].includes(pay)||!['cash','transfer'].includes(methodPay))return bad('Status atau metode pembayaran tidak valid.');
   const reg=await db.prepare('SELECT id FROM registrations WHERE id=?').bind(groupId).first();
   if(!reg)return bad('Pendaftaran tidak ditemukan.',404);
   await db.prepare("UPDATE registrations SET payment_method=?,payment_status=?,paid_amount=CASE WHEN ?='paid' THEN total_amount WHEN paid_amount>=total_amount THEN 0 ELSE paid_amount END WHERE id=?").bind(methodPay,pay,pay,groupId).run();
   await auditRun(db,'payment_status',{group_id:groupId,status:pay,method:methodPay});
   return j({ok:true});
 }
 if(path==='admin/team'){
   const id=Number(b.id);
   const old=await db.prepare('SELECT t.*,r.id AS group_id,r.ranting AS group_ranting FROM teams t JOIN registrations r ON r.id=t.registration_id WHERE t.id=?').bind(id).first();
   if(!old)return bad('Tim tidak ditemukan.',404);
   const lock=await state(db,old.category)!=='idle';
   const sisterTeams=(await db.prepare('SELECT category FROM teams WHERE registration_id=?').bind(old.group_id).all()).results||[];
   const groupLocked=(await Promise.all(sisterTeams.map(t=>state(db,t.category)))).some(x=>x!=='idle');
   let parts=JSON.parse(old.participants),ranting=old.group_ranting;
   if(!lock){parts=validateMembers(b.participants);const cfg=await getSettings(db),cat=parseCategories(cfg).find(c=>c.id===old.category);if(cat&&(parts.length<cat.min_players||parts.length>cat.max_players))return bad('Jumlah anggota tidak sesuai batas kategori.');}
   if(!groupLocked){ranting=clean(b.ranting,100);if(ranting.length<3)return bad('Nama ranting minimal 3 karakter.');}

   try{
     await db.batch([
       db.prepare('UPDATE teams SET participants=? WHERE id=?').bind(JSON.stringify(parts),id),
       db.prepare('UPDATE registrations SET ranting=?,ranting_norm=?,contact=?,notes=?,payment_method=?,payment_status=? WHERE id=?')
       .bind(ranting,ranting.toLocaleLowerCase('id-ID'),clean(b.contact,100),clean(b.notes,300),clean(b.payment_method,20),clean(b.payment_status,20),old.group_id)
     ]);
   }catch(err){if(/UNIQUE constraint/.test(err.message))return bad('Nama ranting sudah digunakan.',409);throw err;}
   return j({ok:true});
 }
 if(path==='admin/delete-team'){
   const id=Number(b.id),t=await db.prepare('SELECT category,registration_id FROM teams WHERE id=?').bind(id).first();
   if(!t)return bad('Tim tidak ditemukan.',404);
   if(await state(db,t.category)!=='idle')return bad('Reset undian kategori tersebut sebelum menghapus tim.');
   await db.prepare('DELETE FROM teams WHERE id=?').bind(id).run();
   await auditRun(db,'delete_team',{team_id:id,category:t.category});
   const remaining=(await db.prepare('SELECT category FROM teams WHERE registration_id=?').bind(t.registration_id).all()).results||[];
   if(!remaining.length)await db.prepare('DELETE FROM registrations WHERE id=?').bind(t.registration_id).run();
   else {const orig=await db.prepare('SELECT fees_snapshot FROM registrations WHERE id=?').bind(t.registration_id).first();
     let snapshot=cfgSafeSnapshot(orig?.fees_snapshot);
     await db.prepare('UPDATE registrations SET total_amount=? WHERE id=?').bind(billAmount(remaining.map(x=>x.category),snapshot),t.registration_id).run();}
   return j({ok:true});
 }

 if(path==='admin/billing'){
   const id=Number(b.group_id),reg=await db.prepare('SELECT * FROM registrations WHERE id=?').bind(id).first();
   if(!reg)return bad('Pendaftaran tidak ditemukan.',404);
   const cfg=await getSettings(db),cats=((await db.prepare('SELECT category FROM teams WHERE registration_id=?').bind(id).all()).results||[]).map(x=>x.category);
   let total=Number(reg.total_amount),manual=Number(reg.amount_manual||0);
   if(b.auto===true){total=billAmount(cats,billingSettings(reg,cfg));manual=0;}
   else if(b.total_amount!==undefined&&b.total_amount!==''&&b.total_amount!==null){const n=toMoney(b.total_amount);if(n!==total){total=n;manual=1;}}
   const paid=(b.paid_amount!==undefined&&b.paid_amount!==''&&b.paid_amount!==null)?toMoney(b.paid_amount):Number(reg.paid_amount||0);
   const note=clean(b.billing_note,300);
   if(manual===1&&!note)return bad('Isi catatan alasan karena nominal tagihan diubah manual.');
   const method=['cash','transfer'].includes(clean(b.payment_method,20))?clean(b.payment_method,20):reg.payment_method;
   const status=paid>=total?'paid':'pending';
   await db.prepare('UPDATE registrations SET total_amount=?,amount_manual=?,paid_amount=?,billing_note=?,payment_method=?,payment_status=? WHERE id=?').bind(total,manual,paid,manual||note?note:'',method,status,id).run();
   await auditRun(db,'billing',{ranting:reg.ranting,tagihan_lama:reg.total_amount,tagihan_baru:total,dibayar:paid,manual:manual?'ya':'otomatis',catatan:note});
   return j({ok:true,total_amount:total,paid_amount:paid,payment_status:status});
 }
 if(path==='admin/add-team'){
   const category=clean(b.category,40),cfg=await getSettings(db),catDef=parseCategories(cfg).find(c=>c.id===category);
   if(!catDef)return bad('Kategori tidak dikenal.');
   const players=validateMembers(b.participants);
   if(players.length<catDef.min_players||players.length>catDef.max_players)return bad(`Anggota ${catDef.name} harus ${catDef.min_players} sampai ${catDef.max_players} orang.`);
   const st=await state(db,category);
   if(st==='live')return bad('Undian kategori ini sedang berlangsung. Selesaikan undian dahulu, baru tambahkan tim.');
   let reg=null;
   if(b.group_id)reg=await db.prepare('SELECT * FROM registrations WHERE id=?').bind(Number(b.group_id)).first();
   else{const name=clean(b.ranting,100);if(name.length<3)return bad('Pilih ranting atau ketik nama ranting baru (minimal 3 karakter).');reg=await db.prepare('SELECT * FROM registrations WHERE ranting_norm=?').bind(name.toLocaleLowerCase('id-ID')).first();
     if(!reg&&!['cash','transfer'].includes(clean(b.payment_method,20)))return bad('Pilih metode pembayaran untuk ranting baru.');
     b._newName=name;}
   if(b.group_id&&!reg)return bad('Ranting tidak ditemukan.',404);
   if(reg&&await db.prepare('SELECT 1 AS x FROM teams WHERE registration_id=? AND category=?').bind(reg.id,category).first())return bad('Ranting ini sudah memiliki tim pada kategori tersebut.');
   const n=(await db.prepare('SELECT COUNT(*) AS n FROM teams WHERE category=?').bind(category).first()).n;
   let slot=null;
   if(st==='complete'){
     const size=bracketSizeFor(n);
     if(n>=size)return bad('Bagan kategori ini sudah penuh dan tidak memiliki slot BYE. Tim baru hanya dapat mengisi slot BYE.');
     slot=n+1;
     if(await resultsInPaths(db,category,size,[slot]))return bad('Pertandingan yang akan menjadi lawan tim baru sudah memiliki hasil/skor. Batalkan hasilnya (tombol BATAL pada bagan) lalu coba lagi.');
   }
   const ranting=reg?reg.ranting:b._newName,norm=ranting.toLocaleLowerCase('id-ID');
   const ownedCats=reg?((await db.prepare('SELECT category FROM teams WHERE registration_id=?').bind(reg.id).all()).results||[]).map(x=>x.category):[];
   const ops=[];let newTotal,newPaid=0,oldTotal=0,newStatus='pending',manual=0;
   if(reg){
     oldTotal=Number(reg.total_amount);manual=Number(reg.amount_manual||0);newPaid=Number(reg.paid_amount||0);
     newTotal=manual?oldTotal:billAmount([...ownedCats,category],billingSettings(reg,cfg));
     newStatus=newPaid>=newTotal?'paid':'pending';
     ops.push(db.prepare('UPDATE registrations SET total_amount=?,payment_status=? WHERE id=?').bind(newTotal,newStatus,reg.id));
   }else{
     newTotal=billAmount([category],cfg);
     ops.push(db.prepare(`INSERT INTO registrations(code,ranting,ranting_norm,contact,notes,payment_method,total_amount,fees_snapshot)
       VALUES(?,?,?,?,?,?,?,?)`).bind(code(),ranting,norm,clean(b.contact,100),clean(b.notes,300),clean(b.payment_method,20),newTotal,cfg.categories_json));
   }
   ops.push(db.prepare('INSERT INTO teams(registration_id,category,participants) SELECT id,?,? FROM registrations WHERE ranting_norm=?').bind(category,JSON.stringify(players),norm));
   if(slot)ops.push(db.prepare('INSERT INTO draw_slots(category,draw_order,team_id) SELECT ?,?,t.id FROM teams t WHERE t.category=? AND t.registration_id=(SELECT id FROM registrations WHERE ranting_norm=?)').bind(category,slot,category,norm));
   try{await db.batch(ops);}catch(err){if(/UNIQUE constraint/i.test(err.message))return bad('Data bentrok dengan perubahan lain. Muat ulang lalu coba lagi.',409);throw err;}
   await auditRun(db,'add_team',{ranting,kategori:catDef.name,slot_bagan:slot||'belum diundi',tagihan_lama:oldTotal,tagihan_baru:newTotal});
   return j({ok:true,slot_no:slot,total_amount:newTotal,previous_total:oldTotal,payment_status:newStatus,new_registration:!reg},201);
 }
 const cat=clean(b.category,40);
 if(!idsFor(await getSettings(db)).has(cat))return bad('Kategori tidak dikenal.');
 if(path==='admin/start-draw'){
   if(await state(db,cat)!=='idle')return bad('Kategori ini telah memulai undian.');
   const ct=await db.prepare('SELECT COUNT(*) AS n FROM teams WHERE category=?').bind(cat).first();
   if(ct.n<2)return bad('Minimal dua tim dibutuhkan untuk membuat bagan.');
   await db.prepare('UPDATE draw_states SET status=? WHERE category=?').bind('live',cat).run();
   return j({ok:true});
 }
 if(path==='admin/next-draw'){
   if(await state(db,cat)!=='live')return bad('Undian belum dimulai atau sudah selesai.');
   const current=(await db.prepare('SELECT team_id,draw_order FROM draw_slots WHERE category=? ORDER BY draw_order').bind(cat).all()).results||[];
   const all=(await db.prepare('SELECT id FROM teams WHERE category=? ORDER BY id ASC').bind(cat).all()).results||[];
   const usedTeams=new Set(current.map(t=>t.team_id));
   const remainingTeams=all.filter(x=>!usedTeams.has(x.id));
   if(remainingTeams.length===0){await db.prepare('UPDATE draw_states SET status=? WHERE category=?').bind('complete',cat).run();return j({ok:true,complete:true});}
   const chosenTeam=remainingTeams[0];
   const size=all.length;
   const usedSlots=new Set(current.map(t=>t.draw_order));
   const remainingSlots=Array.from({length:size},(_,i)=>i+1).filter(n=>!usedSlots.has(n));
   const slotNo=randomlyPick(remainingSlots);
   try{await db.prepare('INSERT INTO draw_slots(category,draw_order,team_id) VALUES(?,?,?)').bind(cat,slotNo,chosenTeam.id).run();}
   catch(e){if(/UNIQUE constraint/.test(e.message))return bad('Undian baru saja diproses oleh perangkat lain. Muat ulang lalu lanjutkan.',409);throw e;}
   if(remainingTeams.length===1)await db.prepare('UPDATE draw_states SET status=? WHERE category=?').bind('complete',cat).run();
   return j({ok:true,chosen_team_id:chosenTeam.id,slot_no:slotNo,complete:remainingTeams.length===1});
 }
 if(path==='admin/reset-draw'){
   await db.batch([
     db.prepare('DELETE FROM match_winners WHERE category=?').bind(cat),
     db.prepare('DELETE FROM draw_slots WHERE category=?').bind(cat),
     db.prepare('DELETE FROM match_details WHERE category=?').bind(cat),
     db.prepare('UPDATE draw_states SET status=? WHERE category=?').bind('idle',cat)
   ]);await auditRun(db,'reset_draw',{kategori:cat});return j({ok:true});
 }
 if(path==='admin/match-details'){
   if(await state(db,cat)!=='complete')return bad('Undian belum selesai.');
   const all=await pull(db,true),round=Number(b.round),match=Number(b.match_no);
   const grid=buildMatches(all,cat);
   if(!Number.isInteger(round)||!Number.isInteger(match)||!grid[round]?.[match])return bad('Pertandingan tidak ditemukan.');
   const day=clean(b.day,10),time=clean(b.time,5),field=clean(b.field,80),note=clean(b.note,160);
   const score_a=clean(b.score_a,3),score_b=clean(b.score_b,3);
   if(!(day===''||day==='18'||day==='19'||/^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(day)) || (time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) ||
      (score_a&&!/^\d{1,3}$/.test(score_a)) || (score_b&&!/^\d{1,3}$/.test(score_b)))return bad('Tanggal, waktu, atau skor tidak valid.');
   await db.prepare(`INSERT INTO match_details(category,round,match_no,day,time,field,score_a,score_b,note)
     VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(category,round,match_no) DO UPDATE SET
     day=excluded.day,time=excluded.time,field=excluded.field,score_a=excluded.score_a,score_b=excluded.score_b,note=excluded.note`)
    .bind(cat,round,match,day,time,field,score_a,score_b,note).run();
   return j({ok:true});
 }
 if(path==='admin/winner'){
   if(await state(db,cat)!=='complete')return bad('Selesaikan undian terlebih dahulu.');
   const all=await pull(db,true),round=Number(b.round),match=Number(b.match_no),chosen=Number(b.winner_id);
   const grid=buildMatches(all,cat);
   if(!Number.isInteger(round)||!Number.isInteger(match)||!grid[round]?.[match])return bad('Pertandingan tidak ditemukan.');
   const m=grid[round][match];
   if(!m.a||!m.b)return bad('Pertandingan ini belum memiliki dua tim; tim dengan bye lolos otomatis.');
   if(chosen!==m.a&&chosen!==m.b)return bad('Pemenang harus salah satu dari dua tim yang bertanding.');
   const prev=await db.prepare('SELECT winner_team_id FROM match_winners WHERE category=? AND round=? AND match_no=?').bind(cat,round,match).first();
   const ops=[db.prepare('INSERT INTO match_winners(category,round,match_no,winner_team_id) VALUES(?,?,?,?) ON CONFLICT(category,round,match_no) DO UPDATE SET winner_team_id=excluded.winner_team_id').bind(cat,round,match,chosen)];
   // Hanya jalur pertandingan yang bergantung pada hasil ini yang dibersihkan, bukan seluruh babak.
   if(prev&&Number(prev.winner_team_id)!==chosen)for(const d of downstreamPairs(round,match,grid.length))ops.push(db.prepare('DELETE FROM match_winners WHERE category=? AND round=? AND match_no=?').bind(cat,d.round,d.match_no));
   await db.batch(ops);
   await auditRun(db,'set_winner',{kategori:catLabel(all.settings,cat),pertandingan:`R${round+1}-P${match+1}`,pemenang_id:chosen});
   return j({ok:true});
 }

 if(path==='admin/undo-winner'){
   const round=Number(b.round),match=Number(b.match_no);
   if(!Number.isInteger(round)||!Number.isInteger(match))return bad('Pertandingan tidak valid.');
   const w=await db.prepare('SELECT winner_team_id FROM match_winners WHERE category=? AND round=? AND match_no=?').bind(cat,round,match).first();
   if(!w)return bad('Pertandingan ini belum memiliki pemenang tercatat.');
   const n=(await db.prepare('SELECT COUNT(*) AS n FROM teams WHERE category=?').bind(cat).first()).n,rounds=Math.log2(bracketSizeFor(n));
   const down=downstreamPairs(round,match,rounds);
   const ops=[db.prepare('DELETE FROM match_winners WHERE category=? AND round=? AND match_no=?').bind(cat,round,match)];
   for(const d of down){
     ops.push(db.prepare('DELETE FROM match_winners WHERE category=? AND round=? AND match_no=?').bind(cat,d.round,d.match_no));
     ops.push(db.prepare("UPDATE match_details SET score_a='',score_b='' WHERE category=? AND round=? AND match_no=?").bind(cat,d.round,d.match_no));
   }
   await db.batch(ops);
   await auditRun(db,'undo_winner',{kategori:cat,pertandingan:`R${round+1}-P${match+1}`,pemenang_id:w.winner_team_id});
   return j({ok:true});
 }
 if(path==='admin/swap-slots'){
   if(await state(db,cat)!=='complete')return bad('Undian kategori ini belum selesai.');
   const a=Number(b.slot_a),c=Number(b.slot_b);
   const rows=(await db.prepare('SELECT draw_order,team_id FROM draw_slots WHERE category=?').bind(cat).all()).results||[];
   const A=rows.find(x=>x.draw_order===a),B=rows.find(x=>x.draw_order===c);
   if(!A||!B||a===c)return bad('Pilih dua nomor posisi berbeda yang sudah terisi.');
   const size=bracketSizeFor(rows.length);
   if(await resultsInPaths(db,cat,size,[a,c]))return bad('Pertandingan terkait sudah memiliki hasil/skor. Batalkan hasilnya terlebih dahulu (tombol BATAL pada bagan).');
   // Tiga langkah dalam satu transaksi agar batasan UNIQUE(category,team_id) tidak terlanggar.
   await db.batch([
     db.prepare('UPDATE draw_slots SET team_id=-1 WHERE category=? AND draw_order=?').bind(cat,a),
     db.prepare('UPDATE draw_slots SET team_id=? WHERE category=? AND draw_order=?').bind(A.team_id,cat,c),
     db.prepare('UPDATE draw_slots SET team_id=? WHERE category=? AND draw_order=?').bind(B.team_id,cat,a)
   ]);
   await auditRun(db,'swap_slots',{kategori:cat,posisi_a:a,tim_a:A.team_id,posisi_b:c,tim_b:B.team_id});
   return j({ok:true});
 }
 return bad('Rute admin tidak dikenal.',404);
 }catch(e){
   const msg=String(e?.message||e);
   if(msg.includes('no such column')||msg.includes('audit_log'))return bad('Database belum diperbarui. Jalankan migration-v3.sql pada D1 Console lebih dulu.',503);
   if(msg.includes('no such table'))return bad('Tabel database belum dibuat. Jalankan schema.sql pada D1 Console.',503);
   if(msg.includes('Unexpected token')||msg.includes('JSON'))return bad('Permintaan berisi data yang tidak valid.');
   console.error('api error',msg);
   const isInput=msg.startsWith('Daftar ')||msg.startsWith('Masukkan ')||msg.startsWith('Ada nama')||msg.startsWith('Ukuran')||msg.startsWith('Anggota ');return bad(isInput?msg:'Terjadi gangguan server. Coba lagi atau periksa log Cloudflare.',isInput?400:500);
 }
}
