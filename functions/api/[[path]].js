const CATS = ['futsal','gobak','tarik_putra','tarik_putri'];
const DEFAULTS = {
  event_name: 'Pekan Olahraga Guru Sekotong 2026',
  registration_open: true,
  bank_name: '', bank_account: '', bank_holder: '',
  cash_instruction: 'Pembayaran langsung melalui bendahara panitia.',
  ranting_options: '',
  contact: '',
  venue: 'Sekotong, Lombok Barat',
  fee_futsal: '150000', fee_gobak: '100000', fee_tarik: '150000'
};
const j = (data, status=200, extra={}) => Response.json(data,{status,headers:{'Cache-Control':'no-store',...extra}});
const bad = (msg,code=400)=>j({ok:false,error:msg},code);
const clean = (s,max=120)=>String(s??'').trim().replace(/\s+/g,' ').slice(0,max);
const goodCat = s=>CATS.includes(s);
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
 const result={...DEFAULTS};
 for(const r of rows.results||[])if(Object.hasOwn(DEFAULTS,r.key)){
   result[r.key]=r.key==='registration_open' ? r.value==='true':r.value;
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
 const states=Object.fromEntries(CATS.map(c=>[c,'idle']));
 for(const x of ds.results||[])states[x.category]=x.status;
 return {ok:true,settings,teams,registrations:admin?(regs.results||[]):undefined,states,slots:drs.results||[],winners:ws.results||[],details:details.results||[],admin};
}
function billAmount(categories,settings){
 const n=k=>Number(settings[k]||0);
 return (categories.includes('futsal')?n('fee_futsal'):0)+
        (categories.includes('gobak')?n('fee_gobak'):0)+
        (categories.some(c=>c==='tarik_putra'||c==='tarik_putri')?n('fee_tarik'):0);
}

function buildMatches(data,cat){
 const slots=data.slots.filter(x=>x.category===cat).sort((a,b)=>a.draw_order-b.draw_order);
 if(!slots.length)return [];
 const teamids=slots.map(x=>x.team_id);
 let size=2;while(size<teamids.length)size*=2;
 let seeds=[1,2];while(seeds.length<size){let mirror=seeds.length*2+1;seeds=seeds.flatMap(x=>[x,mirror-x]);}
 let pair=seeds.map(s=>teamids[s-1]||null), rounds=[];
 for(let r=0;pair.length>=2;r++){
   const matches=[];const next=[];
   for(let m=0;m<pair.length;m+=2){
     const a=pair[m],b=pair[m+1];
     let winner=null;
     if(r===0&&a&&!b)winner=a;
     else if(r===0&&b&&!a)winner=b;
     else if(a&&b){
       const saved=data.winners.find(w=>w.category===cat&&w.round===r&&w.match_no===m/2);
       if(saved&&(saved.winner_team_id===a||saved.winner_team_id===b))winner=saved.winner_team_id;
     }
     matches.push({round:r,match_no:m/2,a,b,winner,automatic:!!winner&&(!a||!b)});
     next.push(winner);
   }
   rounds.push(matches);pair=next;
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
 try{
 if(method==='GET'&&path==='public')return j(await pull(db,false));
 if(method==='POST'&&path==='register'){
   const b=await body(request);
   if(b.website)return bad('Permintaan tidak diterima.');
   const cfg=await getSettings(db);
   if(!cfg.registration_open)return bad('Pendaftaran sedang ditutup. Hubungi panitia.');
   const ranting=clean(b.ranting,100),payment=clean(b.payment_method,20);
   if(ranting.length<3||!['cash','transfer'].includes(payment))return bad('Periksa nama ranting dan metode pembayaran.');
   if(!Array.isArray(b.entries)||b.entries.length<1||b.entries.length>4)return bad('Pilih minimal satu cabang perlombaan.');
   const categories=b.entries.map(x=>clean(x?.category,40));
   if(categories.some(x=>!goodCat(x))||new Set(categories).size!==categories.length)return bad('Kategori pilihan tidak valid atau berulang.');
   if(categories.includes('tarik_putra')!==categories.includes('tarik_putri'))return bad('Tarik tambang didaftarkan satu paket: tim putra dan tim putri.');
   const entries=b.entries.map(x=>({category:clean(x.category,40),participants:validateMembers(x.participants)}));
   for(const category of categories)if(await state(db,category)!=='idle')return bad('Pendaftaran '+category+' telah ditutup karena undian dimulai.');
   const norm=ranting.toLocaleLowerCase('id-ID'),c=code(),amount=billAmount(categories,cfg);
   const snapshot=JSON.stringify({fee_futsal:cfg.fee_futsal,fee_gobak:cfg.fee_gobak,fee_tarik:cfg.fee_tarik});
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
 if(method!=='POST')return bad('Metode tidak didukung.',405);
 const b=await body(request);
 if(path==='admin/settings'){
   const changes={};
   for(const k of Object.keys(DEFAULTS))if(Object.hasOwn(b,k))changes[k]=k==='registration_open'?(b[k]?'true':'false'):(k==='ranting_options'?String(b[k]??'').trim().slice(0,3000):clean(b[k],k.includes('instruction')?400:150));
   if(Object.keys(changes).length===0)return bad('Tidak ada pengaturan yang diperbarui.');
   for(const key of ['fee_futsal','fee_gobak','fee_tarik']){if(Object.hasOwn(changes,key)&&!/^\d*$/.test(changes[key]))return bad('Biaya kategori harus berupa angka tanpa titik atau simbol Rp.');}
   await db.batch(Object.entries(changes).map(([k,v])=>db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,v)));
   return j({ok:true});
 }
 if(path==='admin/registration'){
   const groupId=Number(b.group_id),pay=clean(b.payment_status,20),methodPay=clean(b.payment_method,20);
   if(!['paid','pending'].includes(pay)||!['cash','transfer'].includes(methodPay))return bad('Status atau metode pembayaran tidak valid.');
   const reg=await db.prepare('SELECT id FROM registrations WHERE id=?').bind(groupId).first();
   if(!reg)return bad('Pendaftaran tidak ditemukan.',404);
   await db.prepare('UPDATE registrations SET payment_method=?,payment_status=? WHERE id=?').bind(methodPay,pay,groupId).run();
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
   if(!lock)parts=validateMembers(b.participants);
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
   const remaining=(await db.prepare('SELECT category FROM teams WHERE registration_id=?').bind(t.registration_id).all()).results||[];
   if(!remaining.length)await db.prepare('DELETE FROM registrations WHERE id=?').bind(t.registration_id).run();
   else {const orig=await db.prepare('SELECT fees_snapshot FROM registrations WHERE id=?').bind(t.registration_id).first();
     const snapshot=JSON.parse(orig?.fees_snapshot||'{}');
     await db.prepare('UPDATE registrations SET total_amount=? WHERE id=?').bind(billAmount(remaining.map(x=>x.category),snapshot),t.registration_id).run();}
   return j({ok:true});
 }
 const cat=clean(b.category,40);
 if(!goodCat(cat))return bad('Kategori tidak dikenal.');
 if(path==='admin/start-draw'){
   if(await state(db,cat)!=='idle')return bad('Kategori ini telah memulai undian.');
   const ct=await db.prepare('SELECT COUNT(*) AS n FROM teams WHERE category=?').bind(cat).first();
   if(ct.n<2)return bad('Minimal dua tim dibutuhkan untuk membuat bagan.');
   await db.prepare('UPDATE draw_states SET status=? WHERE category=?').bind('live',cat).run();
   return j({ok:true});
 }
 if(path==='admin/next-draw'){
   if(await state(db,cat)!=='live')return bad('Undian belum dimulai atau sudah selesai.');
   const current=(await db.prepare('SELECT team_id FROM draw_slots WHERE category=? ORDER BY draw_order').bind(cat).all()).results||[];
   const all=(await db.prepare('SELECT id FROM teams WHERE category=?').bind(cat).all()).results||[];
   const used=new Set(current.map(t=>t.team_id));const remaining=all.filter(x=>!used.has(x.id));
   if(remaining.length===0){await db.prepare('UPDATE draw_states SET status=? WHERE category=?').bind('complete',cat).run();return j({ok:true});}
   const winner=randomlyPick(remaining);
   try{await db.prepare('INSERT INTO draw_slots(category,draw_order,team_id) VALUES(?,?,?)').bind(cat,current.length+1,winner.id).run();}
   catch(e){if(/UNIQUE constraint/.test(e.message))return bad('Undian baru saja diproses oleh perangkat lain. Muat ulang lalu lanjutkan.',409);throw e;}
   if(remaining.length===1)await db.prepare('UPDATE draw_states SET status=? WHERE category=?').bind('complete',cat).run();
   return j({ok:true,chosen_team_id:winner.id,draw_order:current.length+1,complete:remaining.length===1});
 }
 if(path==='admin/reset-draw'){
   await db.batch([
     db.prepare('DELETE FROM match_winners WHERE category=?').bind(cat),
     db.prepare('DELETE FROM draw_slots WHERE category=?').bind(cat),
     db.prepare('DELETE FROM match_details WHERE category=?').bind(cat),
     db.prepare('UPDATE draw_states SET status=? WHERE category=?').bind('idle',cat)
   ]);return j({ok:true});
 }
 if(path==='admin/match-details'){
   if(await state(db,cat)!=='complete')return bad('Undian belum selesai.');
   const all=await pull(db,true),round=Number(b.round),match=Number(b.match_no);
   const grid=buildMatches(all,cat);
   if(!Number.isInteger(round)||!Number.isInteger(match)||!grid[round]?.[match])return bad('Pertandingan tidak ditemukan.');
   const day=clean(b.day,2),time=clean(b.time,5),field=clean(b.field,80),note=clean(b.note,160);
   const score_a=clean(b.score_a,3),score_b=clean(b.score_b,3);
   if(!['','18','19'].includes(day) || (time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) ||
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
   await db.batch([
     db.prepare('INSERT INTO match_winners(category,round,match_no,winner_team_id) VALUES(?,?,?,?) ON CONFLICT(category,round,match_no) DO UPDATE SET winner_team_id=excluded.winner_team_id').bind(cat,round,match,chosen),
     db.prepare('DELETE FROM match_winners WHERE category=? AND round>?').bind(cat,round)
   ]);
   return j({ok:true});
 }
 return bad('Rute admin tidak dikenal.',404);
 }catch(e){
   const msg=String(e?.message||e);
   if(msg.includes('no such table'))return bad('Tabel database belum dibuat. Jalankan schema.sql pada D1 Console.',503);
   if(msg.includes('Unexpected token')||msg.includes('JSON'))return bad('Permintaan berisi data yang tidak valid.');
   console.error('api error',msg);
   return bad(msg.startsWith('Daftar ')||msg.startsWith('Masukkan ')||msg.startsWith('Ada nama')||msg.startsWith('Ukuran')?msg:'Terjadi gangguan server. Coba lagi atau periksa log Cloudflare.',500);
 }
}
