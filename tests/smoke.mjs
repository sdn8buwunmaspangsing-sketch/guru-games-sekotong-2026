import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const {onRequest}=await import('../functions/api/[[path]].js');
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
class Q{constructor(q,args=[]){this.q=q;this.args=args}bind(...args){return new Q(this.q,args)}first(){return db.prepare(this.q).get(...this.args)}all(){return {results:db.prepare(this.q).all(...this.args)}}run(){return db.prepare(this.q).run(...this.args)}}
const env={ADMIN_PASSWORD:'test-pgri-2026',SESSION_SECRET:'long-test-session-secret-2026',DB:{prepare(q){return new Q(q)},batch(stmts){db.exec('BEGIN');try{const results=stmts.map(s=>s.run());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}}}};
let cookie='';async function call(path,method='GET',payload=null){const req=new Request('https://example.pages.dev/api/'+path,{method,headers:{...(cookie?{cookie}:{}),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});const res=await onRequest({request:req,env});if(res.headers.get('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];return{status:res.status,data:await res.json()}}
const ok=(x,s)=>{if(!x)throw Error(s)};
const entry=category=>({category,participants:['Guru A','Guru B']});
const register=(ranting,categories)=>call('register','POST',{ranting,entries:categories.map(entry),payment_method:'transfer',contact:'08xx'});
let x=await call('public');ok(x.status===200&&x.data.teams.length===0,'public');
x=await register('Ranting Lengkap',['futsal','gobak','tarik_putra','tarik_putri']);ok(x.status===201&&x.data.total_amount===400000,'all sports amount: '+JSON.stringify(x));
let groupCode=x.data.code;
x=await call('public');ok(x.data.teams.length===4&&x.data.teams.every(t=>t.payment_status==='pending'),'4 teams all pending');
x=await register('Ranting Lengkap',['futsal']);ok(x.status===409,'duplicate ranting rejected');
x=await register('Ranting Setengah',['tarik_putra']);ok(x.status===400,'tug of war requires two teams');
x=await register('Ranting Gobak',['gobak']);ok(x.data.total_amount===100000,'gobak 100k');
x=await register('Ranting Tarik',['tarik_putra','tarik_putri']);ok(x.data.total_amount===150000,'tug package 150k');
x=await register('Ranting Futsal 1',['futsal']);ok(x.data.total_amount===150000,'futsal 150k');
for(let i=2;i<=5;i++){x=await register('Ranting Futsal '+i,['futsal']);ok(x.status===201,'futsal '+i+' failed')}
x=await call('login','POST',{password:env.ADMIN_PASSWORD});ok(x.status===200&&cookie.startsWith('pgri_admin='),'login');
let adm=(await call('admin')).data;ok(adm.registrations.length===8&&adm.teams.length===12,'group and team counts: '+adm.registrations.length+'/'+adm.teams.length);
let reg=adm.registrations.find(r=>r.code===groupCode);ok(reg.total_amount===400000,'billing stored');
x=await call('admin/registration','POST',{group_id:reg.id,payment_method:'cash',payment_status:'paid'});ok(x.status===200,'paid');
adm=(await call('admin')).data;ok(adm.teams.filter(t=>t.group_id===reg.id).every(t=>t.payment_status==='paid'&&t.payment_method==='cash'),'group payment cascades through JOIN');
x=await call('admin/settings','POST',{fee_futsal:'160000',fee_gobak:'100000',fee_tarik:'150000',bank_name:'BRI',bank_account:'12345',bank_holder:'Bendahara'});ok(x.status===200,'settings');
x=await register('Ranting Tarif Baru',['futsal']);ok(x.data.total_amount===160000,'new tariff applied');
adm=(await call('admin')).data;ok(adm.registrations.find(r=>r.id===reg.id).total_amount===400000,'old tariff preserved');
x=await call('admin/start-draw','POST',{category:'futsal'});ok(x.status===200,'start draw');
const n=adm.teams.filter(t=>t.category==='futsal').length;
for(let i=0;i<n;i++){x=await call('admin/next-draw','POST',{category:'futsal'});ok(x.status===200,'draw '+i)}
let pub=(await call('public')).data;ok(pub.states.futsal==='complete'&&pub.slots.length===n,'draw completed');ok(new Set(pub.slots.map(x=>x.team_id)).size===n,'random no duplicate');
x=await call('admin/match-details','POST',{category:'futsal',round:0,match_no:0,day:'18',time:'09:00',field:'Lapangan Utama',score_a:'1',score_b:'2'});ok(x.status===200,'schedule');
x=await call('admin/reset-draw','POST',{category:'futsal'});ok(x.status===200,'reset');
pub=(await call('public')).data;ok(pub.slots.length===0&&pub.details.length===0&&pub.states.futsal==='idle','reset clears');
// Deleting one team updates the group invoice without discarding other teams.
const futsal=adm.teams.find(t=>t.code===groupCode&&t.category==='futsal');
x=await call('admin/delete-team','POST',{id:futsal.id});ok(x.status===200,'delete one team');
adm=(await call('admin')).data;ok(adm.registrations.find(r=>r.id===reg.id).total_amount===250000,'recomputed group tariff');
console.log('PASS: multi-category atomics, single invoice, rates 150/100/150, duplicate, group payment, updated tariff, draw, schedule, reset, fee recomputation.');
