/* Guru Games 2026 — pure tournament math shared by UI and automated tests.
   Wheel angle 0 means sector 1 is centered on the fixed 12-o'clock pointer.
   Logical draw slots 1..teamCount are mapped to seeded bracket leaves so no BYE-vs-BYE matches exist.
*/
(function (root) {
  'use strict';
  const mod = (a, n) => ((a % n) + n) % n;
  const nextPower2 = n => { let s = 2; while (s < n) s *= 2; return s; };
  const seedOrder = size => { if (size < 2 || (size & (size - 1))) throw Error('Size must be power of 2'); let seeds = [1, 2]; while (seeds.length < size) { const sum = 2 * seeds.length + 1; seeds = seeds.flatMap(k => [k, sum - k]); } return seeds; };
  // Visible wheel sectors always represent only positions not previously assigned.
  const remainingWheelNumbers = (count, assigned = []) => {
    if (!Number.isInteger(count) || count < 0) throw Error('Invalid number of participants');
    const used = assigned instanceof Set ? assigned : new Set(assigned);
    return Array.from({length:count},(_,i)=>i+1).filter(number=>!used.has(number));
  };
  const wheelIndexFromAngle = (angle, count) => {
    if (count < 1) return -1;
    return mod(Math.round(mod(-angle, 360) / (360 / count)), count);
  };
  const wheelTargetAngle = (index, count) => mod(-index * 360 / count, 360);
  const angleForSpin = (current, index, count, turns = 7) => {
    const desired = wheelTargetAngle(index, count);
    const shift = mod(desired - mod(current, 360), 360);
    const end = current + 360 * turns + shift;
    if (wheelIndexFromAngle(end, count) !== index) throw Error('Needle/slot mismatch');
    return end;
  };
  function segmentPath(cx, cy, radius, index, count) {
    if (count === 1) return `M${cx-radius},${cy} a${radius},${radius} 0 1 0 ${radius*2},0 a${radius},${radius} 0 1 0 ${-radius*2},0`;
    const mid = -Math.PI / 2 + 2 * Math.PI * index / count;
    const half = Math.PI / count;
    const a = mid - half, b = mid + half;
    const p1 = [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
    const p2 = [cx + radius * Math.cos(b), cy + radius * Math.sin(b)];
    return `M${cx},${cy} L${p1[0].toFixed(4)},${p1[1].toFixed(4)} A${radius},${radius} 0 ${count===1?1:0} 1 ${p2[0].toFixed(4)},${p2[1].toFixed(4)} Z`;
  }
  function buildRounds(data, category, allowPreview = false) {
    const teams = data.teams.filter(t => t.category === category);
    const count = teams.length;
    if (count < 2 || (!allowPreview && data.states[category] !== 'complete')) return [];
    const size = nextPower2(count), seeds = seedOrder(size);
    const byNumber = new Map(data.slots.filter(s=>s.category===category).map(s=>[s.draw_order,s.team_id]));
    let incoming = seeds.map(slot => slot > count ? {type:'bye', slot} : byNumber.has(slot) ? {type:'team', id:byNumber.get(slot),slot} : {type:'awaiting',slot});
    const winners = data.winners || [], rounds = [];
    for (let r = 0; incoming.length >= 2; r++) {
      const matches = [], next = [];
      for (let m = 0; m < incoming.length / 2; m++) {
        const aNode = incoming[2*m], bNode = incoming[2*m+1];
        const a = aNode.type==='team'?aNode.id:aNode.type==='bye'?null:undefined;
        const b = bNode.type==='team'?bNode.id:bNode.type==='bye'?null:undefined;
        const result = winners.find(w=>w.category===category && Number(w.round)===r && Number(w.match_no)===m);
        let winner=null, automatic=false;
        if (aNode.type==='team' && bNode.type==='bye') { winner=a; automatic=true; }
        else if (bNode.type==='team' && aNode.type==='bye') { winner=b; automatic=true; }
        else if (aNode.type==='team' && bNode.type==='team' && (Number(result?.winner_team_id)===a || Number(result?.winner_team_id)===b)) winner=Number(result.winner_team_id);
        const entry={round:r,match_no:m,a,b,aNode,bNode,winner,automatic,match_id:`R${r+1}-P${m+1}`};
        matches.push(entry);
        next.push(winner ? {type:'team',id:winner} : {type:'awaiting',from:entry.match_id});
      }
      rounds.push(matches);incoming=next;
    }
    return rounds;
  }
  function bracketLayout(rounds,{compact=false}={}) {
    const leafStep=compact?55:70;
    const cardWidth=compact?185:255;
    const gap=compact?62:82;
    const cardHeight=compact?87:110;
    const offsetY=compact?53:68;
    const paddingX=compact?15:25;
    const positions=rounds.map((round,r)=>round.map((m,i)=>({x:paddingX+r*(cardWidth+gap),y:offsetY+Math.pow(2,r)*(2*i+1)*leafStep,top:offsetY+Math.pow(2,r)*(2*i+1)*leafStep-cardHeight/2})));
    const paths=[];
    for(let r=0;r<rounds.length-1;r++){
      const right=paddingX+r*(cardWidth+gap)+cardWidth;
      const left=paddingX+(r+1)*(cardWidth+gap);
      const branch=(right+left)/2;
      for(let m=0;m<rounds[r+1].length;m++){
        const a=positions[r][2*m].y,b=positions[r][2*m+1].y,t=positions[r+1][m].y;
        paths.push(`M${right} ${a} H${branch} M${right} ${b} H${branch} M${branch} ${a} V${b} M${branch} ${t} H${left}`);
      }
    }
    return {leafStep,cardWidth,cardHeight,gap,paddingX,positions,paths,width:paddingX*2+rounds.length*cardWidth+(rounds.length-1)*gap,height:offsetY+Math.pow(2,rounds.length)*leafStep+cardHeight/2+30};
  }
  const api={mod,nextPower2,seedOrder,remainingWheelNumbers,wheelIndexFromAngle,wheelTargetAngle,angleForSpin,segmentPath,buildRounds,bracketLayout};
  root.GuruGamesTournament=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
