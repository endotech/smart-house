(function(root){
'use strict';const K=typeof module!=='undefined'?require('./kit-core.js'):root.BlockKit;
function audit(model){let open=0;for(const p of model.parts.filter(p=>['wall','window','door','brace'].includes(p.kind))){const nodes=K.ends(p);if(nodes.some(n=>!model.parts.some(v=>v.kind==='post'&&v.level===p.level&&v.c===n.c&&v.r===n.r))||!model.parts.some(v=>v.kind==='beam'&&v.level===p.level&&v.c===p.c&&v.r===p.r&&v.axis===p.axis))open++;}return {unframedWalls:open,metal:model.parts.filter(p=>p.material==='金属').length,storeys:Math.max(0,...model.parts.map(p=>p.level))+1};}
function quantities(model){const map=new Map();for(const p of model.parts){const id=p.kind+'|'+p.material;if(!map.has(id))map.set(id,{id,kind:p.kind,material:p.material,count:0});map.get(id).count++;}return [...map.values()];}
function cost(model,prices={}){let total=0,unknown=0;const rows=quantities(model).map(row=>{const price=prices[row.id];const known=price!==null&&price!==''&&Number.isFinite(Number(price))&&Number(price)>=0;if(!known)unknown+=row.count;const subtotal=known?row.count*Number(price):null;if(known)total+=subtotal;return {...row,price:known?Number(price):null,subtotal};});return {rows,total,unknown,complete:unknown===0};}
function solve3(a,b){const m=a.map((r,i)=>[...r,b[i]]);for(let c=0;c<3;c++){let best=c;for(let r=c+1;r<3;r++)if(Math.abs(m[r][c])>Math.abs(m[best][c]))best=r;if(Math.abs(m[best][c])<1e-9)return null;[m[c],m[best]]=[m[best],m[c]];const div=m[c][c];for(let j=c;j<4;j++)m[c][j]/=div;for(let r=0;r<3;r++)if(r!==c){const f=m[r][c];for(let j=c;j<4;j++)m[r][j]-=f*m[c][j];}}return m.map(r=>r[3]);}
function lateral(model,settings){
if(!model.parts.some(p=>p.kind==='floor'))return {error:'先に床と骨組みをつくってください。'};
if(model.parts.some(p=>p.level>0))return {error:'この計算は1階建ての単層モデルに限定しています。2階以上は未対応です。'};
if(model.parts.some(p=>p.material!=='木材'))return {error:'木造軸組モデルのみ対応しています。金属部材を混在させた建物は計算対象外です。'};
const weight=Number(settings.weight),coefficient=Number(settings.coefficient),stiffness=Number(settings.stiffness),capacity=Number(settings.capacity);
if(![weight,coefficient,stiffness,capacity].every(v=>Number.isFinite(v)&&v>0))return {error:'建物重量、水平力係数、耐力壁1枚の剛性・耐力を入力してください。'};
if(!String(settings.basis||'').trim())return {error:'入力条件の出典・仕様、または「教材用仮定」と明記してください。'};
const floors=model.parts.filter(p=>p.kind==='floor'),cx=floors.reduce((s,p)=>s+(p.c+.5)*K.UNIT,0)/floors.length,cz=floors.reduce((s,p)=>s+(p.r+.5)*K.UNIT,0)/floors.length;
// A rigid diaphragm is meaningful here only for a connected floor footprint.
const seen=new Set(),todo=[floors[0]],keys=new Set(floors.map(p=>p.c+':'+p.r));while(todo.length){const p=todo.pop(),key=p.c+':'+p.r;if(seen.has(key))continue;seen.add(key);for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]])if(keys.has((p.c+dc)+':'+(p.r+dr))&&!seen.has((p.c+dc)+':'+(p.r+dr)))todo.push({c:p.c+dc,r:p.r+dr});}if(seen.size!==floors.length)return {error:'床が離れています。ひと続きの床を持つ建物のみ計算できます。'};
const radius=Math.max(K.UNIT,...floors.flatMap(p=>[Math.abs((p.c+.5)*K.UNIT-cx),Math.abs((p.r+.5)*K.UNIT-cz)]));
const panels=model.parts.filter(p=>p.kind==='brace');if(!panels.length)return {error:'「耐力壁候補」を配置してください。普通の壁・窓・入口は耐力に算入しません。'};
for(const p of panels){if(K.ends(p).some(n=>!model.parts.some(v=>v.kind==='post'&&v.c===n.c&&v.r===n.r))||!model.parts.some(v=>v.kind==='beam'&&v.c===p.c&&v.r===p.r&&v.axis===p.axis))return {error:'耐力壁候補の両端の柱と上の梁をそろえてください。'};}
const matrix=Array.from({length:3},()=>[0,0,0]);const elements=panels.map(p=>{const g=K.geometry(p),v=p.axis==='x'?[1,0,-(g.z-cz)/radius]:[0,1,(g.x-cx)/radius];for(let i=0;i<3;i++)for(let j=0;j<3;j++)matrix[i][j]+=stiffness*v[i]*v[j];return {id:p.id,...g,axis:p.axis,v};});
const force=weight*coefficient,direction=settings.direction==='z'?'z':'x',loads=direction==='x'?[force,0,0]:[0,force,0],q=solve3(matrix,loads);if(!q)return {error:'抵抗する方向や配置が不足し、並進・ねじれを拘束できません。X・Z両方向に離して耐力壁候補を配置してください。'};
const theta=q[2]/radius,rows=elements.map(p=>{const deformation=p.v.reduce((s,v,i)=>s+v*q[i],0),reaction=stiffness*deformation;return {...p,deformation,reaction,ratio:Math.abs(reaction)/capacity};});const displacements=floors.flatMap(p=>[[p.c*K.UNIT,p.r*K.UNIT],[(p.c+1)*K.UNIT,(p.r+1)*K.UNIT]]).map(([x,z])=>({x,z,dx:q[0]-theta*(z-cz),dz:q[1]+theta*(x-cx)}));
const resultant=rows.reduce((a,p)=>{const f=p.reaction;return [a[0]+(p.axis==='x'?f:0),a[1]+(p.axis==='z'?f:0),a[2]+f*p.v[2]];},[0,0,0]);
return {q,theta,cx,cz,radius,force,direction,rows,displacements,resultant,maxDisplacement:Math.max(...displacements.map(p=>Math.hypot(p.dx,p.dz))),maxRatio:Math.max(...rows.map(p=>p.ratio)),basis:settings.basis};
}
const api={audit,quantities,cost,solve3,lateral};if(typeof module!=='undefined')module.exports=api;else root.HouseAssessment=api;
})(globalThis);
