'use strict';
const H=HouseChallenge,M=HouseMethods;const methodIds=['timber','platform','steel','rc'];
const currentMethod=()=>methodIds.includes(model.method)?model.method:'timber';
const isNonWood=m=>m==='steel'||m==='rc';
const partLabels={
 platform:{wall:'間仕切り壁（非耐力）',panel:'面材で補強した耐力壁'},
 steel:{post:'鉄骨柱',beam:'H形鋼梁',frame:'鉄骨柱＋梁セット',wall:'非構造の壁',panel:'鋼製ブレース付きの壁'},
 rc:{post:'RC柱',beam:'RC梁',frame:'RC柱＋梁セット',wall:'非構造の壁',panel:'RC耐震壁'}
};
const partLabel=k=>k==='post'&&currentMethod()==='platform'?'バルコニー支持柱':partLabels[currentMethod()]?.[k]||K.specs[k].name;
const resistance=r=>isNonWood(r.method)?`X ${r.counts.x} ／ Z ${r.counts.z} か所（骨組み付き）`:`X ${r.base.directions.x.equivalent.toFixed(2)} ／ Z ${r.base.directions.z.equivalent.toFixed(2)} m相当`;
const money=n=>Math.round(n).toLocaleString('ja-JP')+'円';let challengeResult=null,recordedPlan=null;
const basePalette=palette;function adaptMethodPalette(){const platform=currentMethod()==='platform';document.body.classList.toggle('method-non-timber',platform);for(const b of $('groups').querySelectorAll('[data-group]'))b.hidden=false;for(const b of $('pieces').querySelectorAll('[data-kind]')){b.hidden=(platform&&['beam','frame'].includes(b.dataset.kind))||((platform||isNonWood(currentMethod()))&&['brace','braceDouble'].includes(b.dataset.kind));const label=b.querySelector('b');if(label)label.textContent=partLabel(b.dataset.kind);}$('pieceName').textContent=partLabel(kind);
document.querySelector('.material').hidden=currentMethod()!=='timber';
if(isNonWood(currentMethod())&&partLabels[currentMethod()][kind])$('pieceDescription').textContent=M.methods[currentMethod()].message;
if(platform&&M.wallKinds.includes(kind)){
 $('pieceDescription').textContent=kind==='panel'
  ?'木の枠に構造用面材を張り、横揺れに抵抗します。教材の壁量に加わります。'
  :'部屋を仕切る壁です。この教材では壁量に加えません。';
}}
palette=function(){basePalette();adaptMethodPalette();};
const rawBlocks=blocks,rawVisible=visible;
const planView=()=> $('plan').classList.contains('active');
visible=function(p){if(planView()&&(p.level!==level||p.kind==='roof'||p.kind==='beam'||p.kind==='post'))return false;if(M.wallKinds.includes(p.kind))return (finishing||p.level<=level)&&$('showWalls').checked;return rawVisible(p);};
function addWallBlock(p,out,lo,h,w,d,color,alongOffset=0,normalOffset=0,ghost=false,alpha=1){const g=K.geometry(p),axis=p.axis==='x'?'x':'z';const q={...g,y:g.y+lo,h,w:axis==='x'?w:d,d:axis==='z'?w:d};q[axis]+=alongOffset;q[axis==='x'?'z':'x']+=normalOffset;cuboid(q,color,p.id,out,ghost,alpha);}
const roofNeighbors=[[0,-1],[1,0],[0,1],[-1,0]];
let roofProfiles=new Map();
function buildRoofProfiles(){
 const cells=new Map(model.parts.filter(p=>p.kind==='roof').map(p=>[K.key(p),p]));
 const profiles=new Map();
 for(const [id,tile] of cells){
  if(profiles.has(id))continue;
  const group=[],queue=[tile];
  const profile={low:Infinity,high:-Infinity};
  while(queue.length){
   const p=queue.pop(),key=K.key(p);
   if(profiles.has(key))continue;
   profiles.set(key,profile);
   profile.low=Math.min(profile.low,p.r*K.UNIT);
   profile.high=Math.max(profile.high,(p.r+1)*K.UNIT);
   group.push(p);
   for(const [dc,dr] of roofNeighbors){
    const next=cells.get(K.key({...p,c:p.c+dc,r:p.r+dr}));
    if(next&&!profiles.has(K.key(next)))queue.push(next);
   }
  }
  profile.cells=new Set(group.map(K.key));
 }
 return profiles;
}
function drawFinishedRoof(p,g,out,ghost){
 const profile=roofProfiles.get(p.id);
 const shape=model.finishes?.roofShape||'flat';
 const material=model.finishes?.roof||'metal';
 const color=K.finishes.colors[model.finishes?.roofColor]||'#525b60';
 const left=g.x-g.w/2,right=g.x+g.w/2,near=g.z-g.d/2,far=g.z+g.d/2;
 const ridge=profile?(profile.low+profile.high)/2:0;
 const rise=z=>!profile||shape==='flat'?0:shape==='shed'?(z-profile.low)*.28:Math.min(z-profile.low,profile.high-z)*.43;
 const top=z=>g.y+155+rise(z);
 const face=(verts,color)=>out.push({id:p.id,ghost,alpha:1,color,points:verts.map(v=>project(...v)),depth:verts.reduce((n,v)=>n+depth(...v),0)/verts.length});
 const surface=(x1,x2,z1,z2,tint,lift=0)=>face([[x1,top(z1)+lift,z1],[x2,top(z1)+lift,z1],[x2,top(z2)+lift,z2],[x1,top(z2)+lift,z2]],tint);
 const divisions=shape==='gable'&&ridge>near&&ridge<far?[near,ridge,far]:[near,far];
 for(let i=1;i<divisions.length;i++){
  const lo=divisions[i-1],hi=divisions[i],tint=shade(color,lo>=ridge&&shape==='gable'?.87:1.04);
  surface(left,right,lo,hi,tint);
  if(material==='metal'){
   for(const offset of [225,680])surface(left+offset,left+offset+13,lo,hi,shade(tint,1.24),4);
  }else{
   const rows=material==='tile'?5:3;
   for(let row=0;row<rows;row++){
    const z=lo+(hi-lo)*row/rows;
    surface(left,right,z,Math.min(z+15,hi),shade(tint,.68),6);
    for(let x=left+(row%2?145:295);x<right-10;x+=300)
     surface(x,x+9,z,lo+(hi-lo)*(row+1)/rows,shade(tint,.81),5);
   }
  }
 }
 const has=(dc,dr)=>profile?.cells.has(K.key({...p,c:p.c+dc,r:p.r+dr}));
 const trim=shade(color,.68);
 for(const [dc,dr] of roofNeighbors){
  if(has(dc,dr))continue;
  const edge=dc?divisions.map(z=>[dc<0?left:right,z]):[[left,dr<0?near:far],[right,dr<0?near:far]];
  for(let i=1;i<edge.length;i++){
   const [x1,z1]=edge[i-1],[x2,z2]=edge[i];
   face([[x1,g.y,z1],[x2,g.y,z2],[x2,top(z2)-85,z2],[x1,top(z1)-85,z1]],'#b5a895');
   face([[x1,top(z1)-85,z1],[x2,top(z2)-85,z2],[x2,top(z2),z2],[x1,top(z1),z1]],trim);
  }
 }
}
function viewBounds(p){
 const g=K.geometry(p);
 const profile=roofProfiles.get(p.id);
 if(!finishing||p.kind!=='roof'||!profile)return g;
 const factor=model.finishes?.roofShape==='gable'?.215:model.finishes?.roofShape==='shed'?.28:0;
 return {...g,h:155+(profile.high-profile.low)*factor};
}
const fitWithoutRoofProfiles=fit;
fit=function(){
 if(finishing)roofProfiles=buildRoofProfiles();
 fitWithoutRoofProfiles();
};
$('fit').onclick=fit;
const drawWithoutRoofProfiles=draw;
draw=function(){
 if(finishing)roofProfiles=buildRoofProfiles();
 drawWithoutRoofProfiles();
};
blocks=function(p,out,ghost=false){const method=currentMethod(),platform=method==='platform';const underBalcony=p.kind==='post'&&K.nodeCells(p).some(([c,r])=>model.parts.some(v=>v.kind==='balcony'&&v.level===p.level+1&&v.c===c&&v.r===r));
if(platform&&['post','beam'].includes(p.kind)&&!underBalcony)return;const plan=planView(),cut=!finishing&&$('cutWalls').checked;
const showFrame=!plan&&!finishing&&group==='軸';
const g=K.geometry(p), nonWood=isNonWood(method);
if(p.kind==='floor'&&(finishing||reference||p.finish)){
 const wet=reference&&p.level===0&&p.r>=6&&p.c>=6&&p.c<13;
 const hall=reference&&p.level===0&&p.r===5;
 const floorStyles={oak:['#d8b893','#e4c7a4',4],walnut:['#856044','#9c7655',4],tile:['#bdc9c9','#cbd5d4',2],tatami:['#aeb67f','#c4cb98',2]};
 const style=floorStyles[p.finish];
 const baseColors=style|| (wet?['#bdc9c9','#cbd5d4']:hall?['#ad8e70','#b89a79']:['#d8b893','#e4c7a4']);
 const glow=typeof lightAt==='function'?lightAt(p.level,p.c,p.r):0;
 const colors=baseColors.slice(0,2).map(color=>shade(color,1+glow*.15));
 if(p.finish==='tile'||(!style&&wet)){
  for(const dx of [-227.5,227.5])for(const dz of [-227.5,227.5]){
   cuboid({...g,x:g.x+dx,z:g.z+dz,w:450,d:450},colors[dx===dz?0:1],p.id,out,ghost);
  }
  return;
 }
 const count=style?.[2]||4;
 const strip=K.UNIT/count;
 for(let i=0;i<count;i++){
  const x=g.x-K.UNIT/2+strip*(i+.5);
  if(p.finish==='tatami'||hall) cuboid({...g,x,w:strip-2},colors[(i+p.r)%2],p.id,out,ghost);
  else{
   const joint=K.UNIT*(.28+((i*7+p.r*3+60)%7)/14);
   for(const [start,length] of [[0,joint],[joint,K.UNIT-joint]]){
    const base=colors[(i+p.r+(start?1:0)+64)%2];
    cuboid({...g,x,z:g.z-K.UNIT/2+start+length/2,w:strip-2,d:length-2},base,p.id,out,ghost);
   }
  }
  if(p.finish==='tatami')cuboid({...g,x:x-strip/2+12,y:g.y+g.h,w:15,h:3},'#687851',p.id,out,ghost);
 }
 return;
}
if(p.kind==='roof'&&finishing){
 drawFinishedRoof(p,g,out,ghost);
 return;
}
if(K.isFurniture(p.kind)){
 const color=K.specs[p.kind].color;
 const mount=K.specs[p.kind].mount;
 const fixture=K.deviceMount(model,p);
 const status=window.SumaiDevices?.state(p.id);
 if(mount==='door'||mount==='window'){
  if(!fixture)return;
  const wall=K.geometry(fixture),xAxis=fixture.axis==='x';
  const side=xAxis?Math.sign(g.z-wall.z):Math.sign(g.x-wall.x);
  const inset=p.kind==='shutter'?120:75;
  const x=wall.x+(xAxis?(p.kind==='lock'?280:0):side*inset);
  const z=wall.z+(xAxis?side*inset:(p.kind==='lock'?280:0));
  const base={...g,x,z,y:wall.y+900,w:xAxis?g.w:g.d,d:xAxis?g.d:g.w};
  if(p.kind==='shutter'){
   const opening=typeof shutterOpening==='function'?shutterOpening(p):1;
   const height=g.h*(1-opening);
   cuboid({...base,y:base.y+g.h,h:95},'#636f76',p.id,out,ghost);
   for(let top=0;top<height;top+=85){
    const slat=Math.min(80,height-top);
    cuboid({...base,y:base.y+g.h-top-slat,h:slat},top%170?'#a9b3b7':'#84949d',p.id,out,ghost);
   }
  }else cuboid(base,status?.on?'#c89061':'#5e8c77',p.id,out,ghost);
  return;
 }
 if(mount==='roof'){
  if(!fixture)return;
  const roof=K.geometry(fixture),profile=roofProfiles.get(fixture.id),shape=model.finishes?.roofShape;
  const ridge=profile?(profile.low+profile.high)/2:0;
  const near=g.z-g.d/2,far=g.z+g.d/2;
  const heightAt=z=>roof.y+185+(finishing&&profile?(shape==='gable'?Math.min(z-profile.low,profile.high-z)*.43:shape==='shed'?(z-profile.low)*.28:0):0);
  const spans=shape==='gable'&&ridge>near&&ridge<far?[near,ridge,far]:[near,far];
  for(let i=1;i<spans.length;i++)for(let row=0;row<4;row++)for(let col=0;col<5;col++){
   const x=g.x-g.w/2+col*g.w/5,z=spans[i-1]+row*(spans[i]-spans[i-1])/4;
   const x2=x+g.w/5-4,z2=z+(spans[i]-spans[i-1])/4-4;
   const vertices=[[x,heightAt(z),z],[x2,heightAt(z),z],[x2,heightAt(z2),z2],[x,heightAt(z2),z2]];
   out.push({id:p.id,ghost,alpha:1,color:status?.on?'#477bb3':color,points:vertices.map(v=>project(...v)),depth:vertices.reduce((sum,v)=>sum+depth(...v),0)/4});
  }
  return;
 }
 if(mount==='ceiling')g.y+=p.kind==='light'?2590:2320;
 const turns=((p.rotation??0)+(p.kind==='camera'?(status?.direction??0):0))%360/90;
 const cos=[1,0,-1,0][turns],sin=[0,1,0,-1][turns];
 const box=(x,z,y,w,d,h,finish=color)=>cuboid({x:g.x+x*cos-z*sin,z:g.z+x*sin+z*cos,y:g.y+y,w:sin?d:w,d:sin?w:d,h},finish,p.id,out,ghost);
 const shape=K.specs[p.kind].shape||p.kind;
 if(K.specs[p.kind].plant){
  box(0,0,0,g.w,g.d,235,color);
  const wet=window.SumaiPlanters?.readMoisture(p.id)??45;
  box(0,0,235,g.w-40,g.d-40,22,wet>=55?'#44332a':'#80644a');
  for(const x of [-210,0,210]){
   if(p.kind==='flower'){
    box(x,0,257,22,22,255,'#597447');
    box(x-35,0,378,95,55,30,'#749957');
    for(const [dx,dz] of [[-40,0],[40,0],[0,-40],[0,40]])box(x+dx,dz,500,60,60,35,'#e79bbd');
    box(x,0,535,32,32,18,'#f3ce55');
   }else{
    for(const [dx,dz,h] of [[-48,0,90],[48,0,105],[0,-55,110],[0,55,85],[0,0,155]]){
     box(x+dx*.35,dz*.35,257,20,20,h*.65,'#a2bd72');
     box(x+dx,dz,257+h*.55,72,62,h*.6,'#4e8c43');
     box(x+dx,dz,257+h*1.15,48,44,18,'#609b4c');
    }
   }
  }
  return;
 }
 if(p.kind==='vacuum'){
  const position=typeof vacuumPosition==='function'?vacuumPosition(p,g):g;
  g.x=position.x;g.z=position.z;
  for(const [offset,w,d] of [[0,350,155],[-110,275,100],[110,275,100],[-159,160,35],[159,160,35]])box(0,offset,0,w,d,88,'#48545d');
  box(0,0,88,105,105,26,'#68777e');
  box(0,70,89,70,24,7,status?.on?'#66d8a7':'#929b9c');
  return;
 }
 if(p.kind==='light'){box(0,0,0,g.w,g.d,g.h,status?.level?['','#f6dcaa','#ffe5aa','#fff4ca'][status.level]:color);return;}
 if(p.kind==='camera'){box(0,0,0,g.w,g.d,g.h);box(0,112,28,115,45,82,'#263b50');return;}
 if(p.kind==='fan'){
  const center=710,radius=193,level=status?.level||0;
  const phase=level&&typeof motionTime!=='undefined'?motionTime*[0,.008,.015,.025][level]:.35;
  box(0,0,0,400,340,52,'#62727b');
  box(0,0,52,50,50,600,'#8b9ba2');
  for(let i=0;i<24;i++){
   const a=i*Math.PI/12;
   box(Math.cos(a)*radius,52,center+Math.sin(a)*radius-11,24,35,24,'#48616b');
  }
  for(let i=0;i<3;i++)for(let j=1;j<=5;j++){
   const a=phase+i*2*Math.PI/3+j*.115,r=j*29;
   box(Math.cos(a)*r,32,center+Math.sin(a)*r-23,49,22,46,level?['','#aed1cf','#80c4c6','#54b7bb'][level]:'#94b2b8');
  }
  box(0,64,center-41,82,38,82,'#506673');
  return;
 }
 if(shape==='stairs'){
  const count=16, tread=g.d/count;
  for(let i=0;i<count;i++)box(0,-g.d/2+tread*(i+.5),0,g.w,tread,g.h*(i+1)/count);
  return;
 }
 if(shape==='bed'){
  box(0,0,30,g.w,g.d,270,'#9b775a');
  box(0,0,300,g.w-35,g.d-45,200);
  box(0,-g.d/2+60,500,g.w-160,95,220,'#9b775a');
  box(0,-g.d/2+255,500,g.w*.65,340,110,'#f2eee1');
  return;
 }
 if(['bath','kitchen','toilet'].includes(shape)){
  const basin=(x,z,w,d,y,h)=>{
   box(x,z,y,w,d,h*.4);
   for(const side of [-1,1]){
    box(x+side*(w/2-45),z,y,90,d,h);
    box(x,z+side*(d/2-45),y,w-180,90,h);
   }
  };
  if(shape==='bath'){
   basin(0,0,g.w,g.d,0,g.h);
   if(status?.on)box(0,0,g.h*.73,g.w-180,g.d-180,10,'#80c6d7');
  }
  if(shape==='toilet'){basin(0,110,g.w,g.d-220,0,440);box(0,-250,0,g.w,195,g.h);}
  if(shape==='kitchen'){
   box(0,0,0,g.w,g.d,760);
   basin(-620,0,570,g.d,760,90);
   box(340,0,760,1700,g.d,85,'#ddd9cb');
   for(const x of [650,900])box(x,0,845,155,180,5,'#323e46');
  }
  return;
 }
 if(['tv','ac','fridge','washer','microwave'].includes(shape)){
  if(shape==='tv'){box(0,0,0,g.w*.6,g.d,85);box(0,0,85,85,85,240);box(0,0,325,g.w,80,595);box(0,45,355,g.w-60,12,535,status?.on?'#6ecbfa':'#283845');if(status?.on)box(-210,53,700,350,5,145,'#b6ebff');}
  if(shape==='ac'){
   box(0,0,0,g.w,g.d,g.h,'#e1e8e8');
   box(0,g.d/2+8,32,g.w-70,18,53,'#526772');
   box(0,g.d/2+10,54,g.w-90,22,9,'#a2b0b5');
   if(status?.on&&typeof motionTime!=='undefined')for(const x of [-245,0,245])for(let i=0;i<3;i++){
    const travel=(motionTime/3+i*135)%420;
    box(x,g.d/2+45+travel,30-travel*.45,55,75,15,status.mode==='heat'?'#efa16b':'#89cbdc');
   }
  }
  if(shape==='fridge'){box(0,0,0,g.w,g.d,g.h);box(0,g.d/2+8,570,g.w,16,18,'#52606a');box(-g.w/3,g.d/2+20,660,35,40,300,'#64747e');}
  if(shape==='washer'){box(0,0,0,g.w,g.d,g.h);box(0,g.d/2+8,240,410,18,430,'#526a7b');box(0,g.d/2+19,310,285,12,285,'#92acba');}
  if(shape==='microwave'){box(0,0,0,g.w,g.d,780,'#b8a78c');box(0,0,780,g.w,g.d,350);box(-40,g.d/2+8,830,380,16,230,'#2c3942');}
  return;
 }
 if(shape==='sofa'){
  box(0,0,60,g.w,g.d,340);
  box(0,-300,400,g.w,155,420);
  for(const x of [-g.w/2+60,g.w/2-60])box(x,35,400,120,680,170);
  box(0,65,400,g.w-250,535,70);
  return;
 }
 if(shape==='cabinet'){
  box(0,0,0,g.w,g.d,g.h);
  for(const x of [-205,205])box(x,238,75,390,25,770,'#c3b69f');
  for(const x of [-48,48])box(x,258,430,30,28,125,'#736556');
  return;
 }
 if(p.kind==='shelf'){
  for(const x of [-390,390])box(x,0,0,40,g.d,g.h);
  for(const y of [0,360,720,1110])box(0,0,y,g.w,g.d,40);
  return;
 }
 const seat=shape==='chair', top=seat?440:g.h-45;
 box(0,0,top,g.w,g.d,45);
 for(const x of [-1,1])for(const z of [-1,1])box(x*(g.w/2-40),z*(g.d/2-40),0,45,45,top);
 if(seat)box(0,-g.d/2+25,top+45,g.w,50,g.h-top-45);
 return;
}
if(p.kind==='balcony'){
 const corners=[[0,0],[1,0],[0,1],[1,1]];
 const outside=corners.filter(([dc,dr])=>!K.nodeCells({c:p.c+dc,r:p.r+dr}).some(([c,r])=>K.floorAt(model,p.level,c,r)));
 const supported=outside.length>0&&outside.every(([dc,dr])=>model.parts.some(v=>v.kind==='post'&&v.level===p.level-1&&v.c===p.c+dc&&v.r===p.r+dr));
 const deck=method==='rc'?'#b1b5b6':method==='steel'?'#778c99':'#b69873';
 cuboid({...g,h:method==='rc'?185:g.h},deck,p.id,out,ghost);
 if(!supported)cuboid({...g,y:g.y+g.h+2,w:110,d:110,h:10},'#d8ae78',p.id,out,ghost);
 if(!plan)for(const [dc,dr] of [[-1,0],[1,0],[0,-1],[0,1]]){
   if(model.parts.some(v=>v.level===p.level&&['floor','balcony'].includes(v.kind)&&v.c===p.c+dc&&v.r===p.r+dr))continue;
   cuboid({...g,x:g.x+dc*430,z:g.z+dr*430,y:g.y+g.h+(cut?250:950),h:50,w:dc?45:910,d:dr?45:910},method==='rc'?'#70787d':method==='steel'?'#536f86':'#735b43',p.id,out,ghost);
   for(const offset of [-390,390])cuboid({...g,x:g.x+dc*430+dr*offset,z:g.z+dr*430+dc*offset,y:g.y+g.h,h:cut?250:950,w:42,d:42},method==='rc'?'#70787d':method==='steel'?'#536f86':'#735b43',p.id,out,ghost);
 }
 return;
}
if(!M.wallKinds.includes(p.kind)){
 if(cut&&!plan&&!showFrame&&p.kind==='beam')return;
 if(p.kind==='post'&&(nonWood||cut||underBalcony)){
  const frameSpec=nonWood&&typeof H!=='undefined'&&H.evidence?.frame?H.evidence.frame.specs(model,method):null;
  const size=frameSpec?.column.b||(method==='rc'?300:method==='steel'?175:105);
  return cuboid({...g,h:underBalcony?K.STOREY-K.BASE:cut&&!showFrame?1100:g.h,w:size,d:size},method==='rc'?'#a7a8a4':method==='steel'?'#536f86':'#c49b66',p.id,out,ghost);
 }
 if(nonWood&&p.kind==='beam'){
  const color=method==='steel'?'#536f86':'#a7a8a4';
  const across=n=>p.axis==='x'?{d:n}:{w:n};
  const section=typeof H!=='undefined'&&H.evidence?.frame?H.evidence.frame.specs(model,method).beam:{b:160,h:210,tf:20,tw:32};
  const beamY=g.y+g.h-section.h;
  if(method==='steel'){
   for(const dy of [0,section.h-section.tf])cuboid({...g,...across(section.b),y:beamY+dy,h:section.tf},color,p.id,out,ghost);
   return cuboid({...g,...across(section.tw),y:beamY+section.tf,h:section.h-2*section.tf},color,p.id,out,ghost);
  }
  return cuboid({...g,...across(section.b),y:beamY,h:section.h},color,p.id,out,ghost);
 }
 return rawBlocks(p,out,ghost);
}
const inspectFrame=platform&&!ghost&&p.id===selectedWall;
if(plan||(cut&&!inspectFrame)){
 if(!plan&&method==='timber'&&braceKinds.has(p.kind)&&p.id===selectedWall){
  addWallBlock(p,out,0,1100,K.UNIT,24,'#e9e1cf',0,0,ghost,.56);
  return rawBlocks(p,out,ghost,1100);
 }
 const color=p.kind==='door'?'#bd8b53':p.kind==='window'?'#76aebd':['brace','braceDouble','panel'].includes(p.kind)?'#7c8e77':'#e0d7c1';
 return addWallBlock(p,out,0,plan?60:1100,K.UNIT,p.kind==='door'?55:method==='rc'?180:105,color,0,0,ghost);
}
const outside=K.edgeCells(p).filter(([c,r])=>K.floorAt(model,p.level,c,r)).length===1;
const cladding=outside?K.finishes.colors[model.finishes?.wallColor]||'#e9e1cf':'#e9e1cf';
const view=inspectFrame?'structure':finishing?'finish':$('wallView').value,Hwall=platform?K.STOREY-K.BASE:K.HEIGHT,w=K.UNIT,opts=H.options(model),ins=H.catalog.insulations[opts.insulation],frameD=platform?89:105,add=(lo,h,width,d,color,x=0,z=0,a=1)=>addWallBlock(p,out,lo,h,width,d,color,x,z,ghost,a);
const opening=p.kind==='window'||p.kind==='door',opaque=[];if(p.kind==='window')opaque.push([0,900],[2100,Hwall-2100]);else if(p.kind==='door')opaque.push([2100,Hwall-2100]);else opaque.push([0,Hwall]);
if(finishing&&outside&&view==='finish'&&model.finishes?.wall&&model.finishes.wall!=='plaster'){
 const brick=model.finishes.wall==='brick';
 const spacing=brick?120:190;
 const depth=nonWood?185:Math.max(frameD,ins.thickness)+27;
 for(const [lo,h] of opaque)for(let row=0;row*spacing<h;row++){
  const y=lo+row*spacing;
  if(row)add(y,7,w,depth,shade(cladding,.82));
  if(brick)for(let x=-w/2+(row%2?105:210);x<w/2;x+=210)
   add(y,Math.min(spacing,h-row*spacing),6,depth,shade(cladding,.8),x);
 }
}
if(nonWood){
 const structural=['brace','braceDouble','panel'].includes(p.kind);
 if(view==='finish'||method==='rc'||!structural){
  for(const [lo,h] of opaque)add(lo,h,w,structural&&method==='rc'?Number(model.structural?.rcWall||180):100,outside&&model.finishes?.wallColor?cladding:structural&&method==='rc'?'#a7a8a4':'#e9e1cf',0,0,view==='finish'?1:.4);
  if(p.kind==='window'){
  const jamb=155, thickness=method==='steel'||method==='rc'?100:Math.max(frameD,ins.thickness)+24;
  for(const side of [-1,1])add(900,1200,jamb,thickness,cladding,side*(w-jamb)/2);
  add(900,1200,w-2*jamb,55,'#9c876c');
  add(950,1100,w-2*jamb-100,60,'#a4c9cd');
  add(950,1100,34,70,'#786e61');
  add(885,35,w-2*jamb+75,thickness+55,'#897969');
 }
  if(p.kind==='door')add(0,2100,w-90,45,'#b3936c');
 }
 if(view!=='finish'&&structural&&method==='rc'){
  const thickness=Number(model.structural?.rcWall||180);
  for(const normal of [-(thickness/2-40),thickness/2-40]){
   for(let x=-300;x<=300;x+=200)add(0,Hwall,10,10,'#536476',x,normal);
   for(const x of [-390,390])add(0,Hwall,13,13,'#536476',x,normal);
   for(let lo=100;lo<Hwall;lo+=200)add(lo,10,w,10,'#536476',0,normal);
  }
 }
 if(view!=='finish'&&structural&&method==='steel'){
  for(const dir of [-1,1]){
   const a=project(g.x-(p.axis==='x'?390:0),g.y+(dir===1?50:Hwall-50),g.z-(p.axis==='z'?390:0));
   const b=project(g.x+(p.axis==='x'?390:0),g.y+(dir===1?Hwall-50:50),g.z+(p.axis==='z'?390:0));
   out.push({id:p.id,ghost,alpha:1,color:'#536f86',depth:depth(g.x,g.y+Hwall/2,g.z),points:[[a[0]-3,a[1]], [a[0]+3,a[1]], [b[0]+3,b[1]], [b[0]-3,b[1]]]});
  }
 }
 if(view==='insulation')for(const [lo,h] of opaque)add(lo,h,w,ins.thickness,ins.color,0,-145,.55);
 return;
}
if(view==='finish'&&method==='timber'&&braceKinds.has(p.kind)&&p.id===selectedWall){
 add(0,Hwall,w,24,'#e9e1cf',0,0,.38);
 return rawBlocks(p,out,ghost);
}
if(view==='finish'){const wallDepth=Math.max(frameD,ins.thickness)+24;
for(const [lo,h] of opaque){
 add(lo,h,w,wallDepth,cladding);
 if(finishing&&lo===0&&K.edgeCells(p).filter(([c,r])=>K.floorAt(model,p.level,c,r)).length===1){
  add(0,150,w,wallDepth+12,'#b3a693');
 }
}if(p.kind==='window'){
  const jamb=155, thickness=method==='steel'||method==='rc'?100:Math.max(frameD,ins.thickness)+24;
  for(const side of [-1,1])add(900,1200,jamb,thickness,cladding,side*(w-jamb)/2);
  add(900,1200,w-2*jamb,55,'#9c876c');
  add(950,1100,w-2*jamb-100,60,'#a4c9cd');
  add(950,1100,34,70,'#786e61');
  add(885,35,w-2*jamb+75,thickness+55,'#897969');
 }if(p.kind==='door')add(0,2100,w-90,45,'#b3936c');}
else{
if(view==='insulation')for(const [lo,h] of opaque)for(const x of [-w/4,w/4])add(lo+30,Math.max(10,h-60),w/2-50,ins.thickness,ins.color,x,0,.65);
if(platform){for(const x of [-w/2+19,w/2-19])add(38,Hwall-114,38,89,'#c7a16e',x);if(!opening)add(38,Hwall-114,38,89,'#c7a16e');for(const lo of [0,Hwall-76,Hwall-38])add(lo,38,w,89,'#c7a16e');if(opening)add(2100,76,w,89,'#b99463');if(p.kind==='window')add(862,38,w,89,'#b99463');}
else{if(!opening)add(0,Hwall,30,105,'#c3a16c');for(const lo of [0,Hwall-30])add(lo,30,w,60,'#c3a16c');if(opening)add(2100,60,w,105,'#b99463');if(p.kind==='window')add(870,30,w,105,'#b99463');if(['brace','braceDouble'].includes(p.kind))rawBlocks(p,out,ghost);}
if(p.kind==='panel'||platform&&!['wall','window','door'].includes(p.kind)){
 const facing=p.axis==='x'?Math.cos(yaw):Math.sin(yaw);
 for(const [lo,h] of opaque)add(lo,h,w,9,inspectFrame?'#cb9851':'#c4ac80',0,-Math.sign(facing||1)*(frameD/2+8),inspectFrame?.8:.16);
}
if(challengeResult?.damperPositions.some(q=>q.id===p.id)){const z=Math.max(frameD,ins.thickness)/2+25;add(850,680,55,42,'#d28b4c',w*.16,z);add(780,75,110,55,'#7e8986',w*.16,z);add(1530,75,110,55,'#7e8986',w*.16,z);}
}
};
$('methodSelect').onchange=()=>{const next=$('methodSelect').value;if(!methodIds.includes(next))return;if(!reference)remember();model.method=next;if((next==='platform'&&group==='軸'&&kind!=='post')||(next!=='timber'&&['brace','braceDouble'].includes(kind))){group='壁';kind='panel';}if(carrying)cancelCarry();hover=gesture=grabbing=null;palette();update();fit();};
const structurePanel=document.createElement('section');
structurePanel.className='structure-specs';structurePanel.style.cssText='margin:14px 0;padding:14px;border:1px solid #aabcae;border-radius:12px;background:#f3f6ef';
structurePanel.innerHTML='<h3 style="margin:0 0 8px">骨組みの仕様</h3><p style="font-size:12px">同じ配置でも、断面と接合条件で変形が変わります。接合部は理想条件です。</p>';
const structuralLabels={steelColumn:'鉄骨柱',steelBeam:'鉄骨梁',steelJoint:'柱と梁の接合',steelBase:'柱脚の接合',steelBrace:'Xブレース（引張側のみ）',steelBolts:'鉄骨の摩擦接合ボルト（F10T M16）',rcColumn:'RC柱',rcBeam:'RC梁',rcFc:'コンクリート強度',rcJoint:'柱梁・耐震壁の接合',rcSlab:'床・屋根スラブ厚',rcWall:'耐震壁厚'};
const structuralNames={two:'フランジ片側・ブレース端：2本',four:'フランジ片側・ブレース端：4本',straight:'直線定着（柱幅内で付着を計算）',rigid:'剛接合（回転を共有・すべりを別照合）',pinned:'ピン接合（曲げを伝えない）',fixed:'固定柱脚（全強度の仮定）',rod16:'丸鋼φ16・端部ボルトを別照合',rod20:'丸鋼φ20・端部ボルトを別照合',continuous:'一体打ち・連続配筋・十分な定着を仮定',unconfirmed:'定着条件未確認（算定しない）'};
for(const [key,values] of Object.entries(H.evidence.frame.choices)){
 const label=document.createElement('label');label.style.cssText='display:block;margin:8px 0;font-size:12px';label.dataset.structureKey=key;
 label.append(document.createTextNode(structuralLabels[key]));
 const select=document.createElement('select');select.dataset.structureKey=key;select.style.cssText='display:block;width:100%;margin-top:4px';
 for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=H.evidence.frame.catalog[key]?.[value]?.label||structuralNames[value]||(key==='rcFc'?'Fc '+value+' N/mm²':value+' mm');select.append(option);}
 select.onchange=()=>{if(!reference)remember();model.structural={...model.structural,[key]:select.value};update();};
 label.append(select);structurePanel.append(label);
}
$('damperSelect').parentElement.after(structurePanel);
function renderStructureSpecs(){
 structurePanel.hidden=!isNonWood(currentMethod());
 const options=H.evidence.frame.options(model);
 for(const label of structurePanel.querySelectorAll('label')){const key=label.dataset.structureKey;label.hidden=!key.startsWith(currentMethod());label.querySelector('select').value=options[key];}
}
$('cutWalls').onchange=draw;
$('wallView').onchange=()=>{$('showWalls').checked=true;$('cutWalls').checked=false;if(planView())$('iso').click();
if(isNonWood(currentMethod())){$('layerLegend').textContent='青灰色：鉄骨・鉄筋 ／ 黄色：断熱材';draw();return;}$('layerLegend').textContent=$('wallView').value==='finish'?'仕上げの中に、支える仕組みがあります。':$('wallView').value==='structure'?'木の色：骨組み・筋かい ／ 橙：制震の配置案':'黄色：断熱材 ／ 木の色：骨組み ／ 橙：制震の配置案';draw();};
for(const id of ['insulationSelect','damperSelect'])$(id).onchange=()=>{if(!reference)remember();model.options={insulation:$('insulationSelect').value,damper:$('damperSelect').value};update();};
const braceKinds=new Set(['brace','braceDouble']);
const braceInfo=document.createElement('p');
braceInfo.setAttribute('aria-live','polite');braceInfo.className='wall-selection-info';
$('layerLegend').after(braceInfo);
let selectedWall=null, previousWalls=new Map(), wallChange='';
let previousWallLevel=null;
const formatWall=n=>n.toFixed(2)+' m相当';
function renderBraceInfo(){
 braceInfo.hidden=isNonWood(currentMethod())||!selectedWall;
 if(braceInfo.hidden)return;
 const wall=model.parts.find(p=>p.id===selectedWall&&p.level===level&&M.wallKinds.includes(p.kind));
 if(currentMethod()==='platform'){
  braceInfo.textContent=wall?(wall.kind==='panel'||braceKinds.has(wall.kind)?'耐力壁：たて枠と黄土色の構造用面材':'間仕切り・開口部：木の枠'): '壁をクリックすると、木の枠と面材の有無を確認できます。';
  return;
 }
 const amount=challengeResult.base.walls.find(p=>p.id===selectedWall)?.equivalent??0;
 const detail=wall?K.specs[wall.kind].name+' ／ '+wall.axis.toUpperCase()+'方向 ／ 壁量 '+formatWall(amount):'筋かいの壁を選ぶと壁量を表示します。';
 braceInfo.textContent=detail+(wallChange?'　'+wallChange:'');
}
canvas.addEventListener('click',e=>{
 if(mode!=='move')return;
 const wall=hitAt(pointer(e));
 selectedWall=wall&&M.wallKinds.includes(wall.kind)&&wall.id!==selectedWall?wall.id:null;
 if(selectedWall&&currentMethod()==='platform'&&planView())$('iso').click();
 renderBraceInfo();
 draw();
});
const originalUpdate=update;
update=function(){
 const before=challengeResult;
 challengeResult=H.evaluate(model,currentMethod(),level);
 const nextWalls=new Map(model.parts.filter(p=>p.level===level&&braceKinds.has(p.kind)).map(p=>[p.id,p]));
 if(before?.method==='timber'&&currentMethod()==='timber'&&previousWallLevel===level&&!reference){
  for(const [id,wall] of nextWalls){
   if(previousWalls.get(id)?.kind!=='brace'||wall.kind!=='braceDouble')continue;
   const a=before.base.directions[wall.axis].equivalent;
   const b=challengeResult.base.directions[wall.axis].equivalent;
   wallChange=level+1+'階 '+wall.axis.toUpperCase()+'方向の壁量 '+a.toFixed(2)+' → '+formatWall(b)+'（+'+formatWall(b-a)+'）';
  }
 }else wallChange='';
 previousWalls=nextWalls;
 previousWallLevel=level;
 originalUpdate();
 renderChallenge();
 renderBraceInfo();
};
$('methodHint').textContent='';
function renderChallenge(){renderStructureSpecs();const r=challengeResult||H.evaluate(model,currentMethod(),level);$('methodSelect').value=currentMethod();$('methodHint').textContent=M.methods[currentMethod()].message;$('insulationSelect').value=r.options.insulation;$('damperSelect').disabled=isNonWood(r.method);$('damperSelect').value=isNonWood(r.method)?'none':r.options.damper;adaptMethodPalette();
$('liveCost').textContent=money(r.cost.total)+(r.cost.equipment.unpriced?' ＋ 未積算あり':'');$('liveEquipment').textContent=money(r.cost.equipment.total)+(r.cost.equipment.unpriced?' ＋ 未積算'+r.cost.equipment.unpriced+'点':'');$('liveWalls').textContent=r.strength.label;$('liveWalls').dataset.strength=r.strength.tone;$('liveThermal').textContent='断熱材R '+r.insulation.resistance.toFixed(1);$('liveDamper').textContent=isNonWood(r.method)?'木造用の選択項目':r.damper.count?`配置案 ${r.damperPositions.length}/${r.damper.count}か所`:'追加なし';$('liveNote').textContent=r.strength.hint+(r.damperUnplaced?'\nダンパーの配置候補が足りません。':'');if($('compareDialog').open)renderChallengeComparison();}
$('liveCost').closest('.live-comparison').innerHTML=`<h3>この家の仕様</h3><div class="live-metric"><small>参考総額（仮定費用・税区分未確認分を含む）</small><b id="liveCost">—</b></div><div class="live-metric"><small>配置した設備・家電</small><b id="liveEquipment">—</b></div><div class="live-metric"><small>地震への強さ（教材モデル）</small><b id="liveWalls">—</b></div><div class="live-metric"><small>壁の断熱材</small><b id="liveThermal">—</b></div><div class="live-metric"><small>制震ダンパー</small><b id="liveDamper">—</b></div><p id="liveNote"></p>`;
$('compareDialog').innerHTML=`<div class="dialog-head"><h2>同じ間取りで仕様をくらべる</h2><button id="challengeClose">✕</button></div><div class="method-table-wrap"><table class="method-table"><thead><tr><th>くらべる項目</th><th>木造軸組</th><th>木造枠組壁</th><th>鉄骨造</th><th>鉄筋コンクリート造</th></tr></thead><tbody id="challengeRows"></tbody></table></div><div class="compare-actions"><button id="recordChallenge" class="primary">この案を基準にする</button><button id="exportChallenge">比較結果を保存</button></div><p id="challengeRecordNote" class="muted"></p><details class="teacher-details"><summary>設備費の内訳・計算の根拠を見る</summary><div id="challengeDetails"></div></details>`;
function renderChallengeComparison(){const rows=methodIds.map(m=>H.evaluate(model,m,level));$('challengeRows').replaceChildren();const add=(name,values)=>{const tr=document.createElement('tr');tr.insertCell().textContent=name;values.forEach((v,i)=>{const td=tr.insertCell();td.textContent=v;if(rows[i].method===currentMethod())td.className='selected-method';});$('challengeRows').append(tr);};
add('地震への強さ（教材モデル）',rows.map(r=>r.strength.label));add('改善のヒント',rows.map(r=>r.strength.hint));add('組み方',rows.map(r=>r.assembly));add('参考総額（仮定費用を含む）',rows.map(r=>money(r.cost.total)+(r.cost.equipment.unpriced?' ＋ 未積算あり':'')));add('設備・家電（配置分）',rows.map(r=>money(r.cost.equipment.total)+(r.cost.equipment.unpriced?' ＋ 未積算'+r.cost.equipment.unpriced+'点':'')));add('公表価格による小計',rows.map(r=>money(r.cost.publishedSubtotal)));add('仮定単価による小計',rows.map(r=>money(r.cost.assumedSubtotal)));add('木造：壁量充足率 / 鉄骨・RC：水平力の比較限界倍率',rows.map(wallRatioSummary));add('壁配置バランス',rows.map(r=>r.seismic.type==='frame'?'ねじれ・偏心は未照査':r.seismic.selected?['x','z'].map(axis=>axis.toUpperCase()+' '+(r.seismic.selected.directions[axis].balance.adequate?'条件内':'偏りに注意')).join(' / '):'未算定'));add('選択階の耐震パーツ X / Z',rows.map(resistance));add('組み立てチェック',rows.map(r=>r.seismic.selected?r.grade.passed+'/'+r.grade.checks.length+'項目':'強さを計算できません'));add('断熱材',rows.map(r=>`${r.insulation.name} ／ R ${r.insulation.resistance.toFixed(1)}`));add('断熱材の付加下地',rows.map(r=>r.extraDepth?'必要厚 '+r.extraDepth+' mmを追加する想定':'付加下地なし'));add('制震配置案',rows.map(r=>isNonWood(r.method)?'対象外（木造用）':r.damper.count?`${r.damperPositions.length}/${r.damper.count}か所。製品適合・効果は未確認`:'なし'));const costLines=result=>{
 const lines=new Map(result.cost.rows.map(item=>[item.name,item.amount]));
 const structure=['木材・合板','鉄骨柱・H形鋼梁・ブレース','RC柱・梁・耐震壁','構造床・屋根'];
 lines.set('構造の材料費',structure.reduce((sum,name)=>sum+(lines.get(name)??0),0));
 for(const name of structure)lines.delete(name);
 lines.set('予備費',result.cost.reserve);
 lines.set('消費税の想定',result.cost.tax);
 return lines;
};
const costs=rows.map(costLines);
const baseline=recordedPlan?costLines(recordedPlan.results.find(r=>r.method===recordedPlan.method)):null;
const labels=new Set([...costs.flatMap(lines=>[...lines.keys()]),...(baseline?.keys()??[])]);
for(const label of labels){
 add(label,costs.map(lines=>{
  const value=lines.get(label)??0;
  if(!baseline)return money(value);
  const delta=value-(baseline.get(label)??0);
  return money(value)+'（'+(delta>0?'+':'')+money(delta)+'）';
 }));
}
$('challengeRecordNote').textContent=recordedPlan?'基準：'+recordedPlan.name+' ／ '+M.methods[recordedPlan.method].name+'。括弧内は基準との差額です。色の変更は同じ単価です。':'基準案を記録すると、各項目の差額を表示できます。金額は教材用の概算です。';
renderChallengeDetails(rows);}
function wallRatioSummary(result){
 const row=result.seismic.selected;
 if(!row)return result.seismic.available?'選択階の床なし':'未算定';
 if(result.seismic.type==='frame')return ['x','z'].map(axis=>axis.toUpperCase()+' '+row.directions[axis].ratio.toFixed(2)+'倍 / 変形 '+row.directions[axis].drift.toFixed(1)+'mm').join(' ／ ');
 return ['x','z'].map(axis=>axis.toUpperCase()+' '+Math.round(row.directions[axis].ratio*100)+'%').join(' / ');
}
function renderChallengeDetails(rows){
 const box=$('challengeDetails');
 box.replaceChildren();
 const paragraph=message=>{const p=document.createElement('p');p.textContent=message;box.append(p);};
 const heading=message=>{const h=document.createElement('h3');h.textContent=message;box.append(h);};
 const link=(parent,url)=>{if(!url)return;const a=document.createElement('a');a.textContent=' 出典';a.href=url;a.target='_blank';a.rel='noopener';parent.append(a);};
 function table(headers){
  const t=document.createElement('table');
  t.className='evidence-table';
  const row=t.insertRow();
  for(const name of headers){const th=document.createElement('th');th.textContent=name;row.append(th);}
  box.append(t);
  return t;
 }
 heading('配置した設備・家電の費用');
 paragraph('代表製品の公表価格を台数分だけ集計します。機器のON・OFFで購入費は変わりません。確認日 '+H.evidence.data.checked+'。メーカー希望価格・通販価格・過去の購入実績が混在するため、同等品の予算比較として扱います。工事費は各行の条件を確認してください。');
 const equipment=rows[0].cost.equipment;
 const items=table(['設備・家電','台数・単価','配置分の費用','代表仕様・含まれるもの']);
 for(const item of equipment.rows){
  const row=items.insertRow();
  row.insertCell().textContent=item.name;
  row.insertCell().textContent=item.quantity+' × '+(item.unitPrice===null?'未登録':money(item.unitPrice))+(item.taxBasis==='excluded'?'（税別）':item.taxBasis==='included'?'（税込）':'（税区分未確認）');
  row.insertCell().textContent=item.total===null?'未積算':money(item.total);
  const basis=row.insertCell();basis.textContent=item.model+'。'+item.basis;link(basis,item.source);
 }
 paragraph('配置分の設備・家電費 '+money(equipment.total)+(equipment.unpriced?'。価格未登録 '+equipment.unpriced+'点は別途必要です。':'。'));
 heading('強さの表示基準');
 paragraph('教材用の簡易比較です。全階・両方向の最小値で、基準の1.5倍以上の余裕は「十分強い」、1倍以上は「強い」、1倍未満は「弱い」。木造は必要壁量との比と配置バランス、鉄骨・RCは材料・接合部の比較限界と層間変形1/200への余裕を用います。配置バランスや骨組みに不足がある木造は「弱い」と表示します。組み立て途中は判定しません。');
 heading('必要壁量との比較');
 paragraph('必要壁量 m = Ai × C0 × その階が支える重量 kN ÷ 1.96。配置壁量 m = 壁倍率 × 壁長 m の合計。地震力1.5倍の欄は同じ重量条件で必要量を1.5倍にした比較です。耐震等級の判定は行いません。');
 for(const result of rows){
  heading(M.methods[result.method].name);
  for(const issue of result.strength.issues||[])paragraph(issue.message);
  if(!result.seismic.available){paragraph(result.seismic.reason);continue;}
  paragraph(result.seismic.assumptions);
  if(result.seismic.type==='frame'){
   const spec=result.seismic.specification;
   paragraph('柱：'+spec.column.label+'、梁：'+spec.beam.label+'。柱 I='+Math.round(spec.column.I).toLocaleString('ja-JP')+' mm⁴、梁 I='+Math.round(spec.beam.I).toLocaleString('ja-JP')+' mm⁴。');
   if(result.method==='rc')paragraph('Fc '+spec.options.rcFc+' N/mm²・SD295。'+spec.wall.label+'。コンクリート全断面ではなく引張ひび割れ断面で剛性を計算します。');
   paragraph('K u = F を解いて各部材の端部力と層間変形を計算。鉄骨曲げ限界 F×Zと選択したボルト本数のすべり比較限界、RCは引張鉄筋295 N/mm²または圧縮コンクリートFc/2に先に達する力。倍率1未満はこの限界を超えます。倍率が大きくても未照査の項目があります。');
   const t=table(['階・方向','地震力 kN','材料・接合部の比較限界までの倍率','層間変形 mm / 角','地震力1.5倍時の倍率']);
   for(const story of result.seismic.rows)for(const axis of ['x','z']){
    const d=story.directions[axis],row=t.insertRow();
    row.insertCell().textContent=(story.level+1)+'階 '+axis.toUpperCase();row.insertCell().textContent=story.force.toFixed(2);
    row.insertCell().textContent=d.ratio.toFixed(2)+'倍';row.insertCell().textContent=d.drift.toFixed(2)+' mm / '+d.angle.toFixed(5)+'（目安0.005）';row.insertCell().textContent=d.ratio15.toFixed(2)+'倍';
   }
   if(result.seismic.joint.M!==null)paragraph('梁端の接合部曲げ比較限界 '+(result.seismic.joint.M/1e6).toFixed(2)+' kN·m。');
   paragraph('接合部：'+result.seismic.joint.label+(result.method==='steel'?'。ウェブのボルトは2本。接合板・孔欠損・溶接・柱脚は未照査。':'。接合部せん断・帯筋・継手は未照査。'));
   paragraph('建物重量 '+result.seismic.totalWeight.toFixed(2)+' kN。柱梁・RC壁・スラブの自重を断面と配置から集計。鋼材78.5・RC24 kN/m³、鉄骨床は100mmコンクリートデッキを仮定。部材同士の重なり体積の控除は省略しています。');
   paragraph(result.seismic.limitations);continue;
  }
  const t=table(['階・方向','配置 / 必要 m','充足率','地震力1.5倍時','壁率比・配置']);
  for(const story of result.seismic.rows){
   paragraph((story.level+1)+'階が支える重量 '+story.supportedWeight.toFixed(2)+' kN、Ai '+story.Ai.toFixed(3)+'、C0 '+result.seismic.C0+'、地震力 '+story.force.toFixed(2)+' kN。');
   for(const axis of ['x','z']){
    const d=story.directions[axis],row=t.insertRow();
    row.insertCell().textContent=(story.level+1)+'階 '+axis.toUpperCase();
    row.insertCell().textContent=d.available.toFixed(2)+' / '+d.required.toFixed(2);
    row.insertCell().textContent=Math.round(d.ratio*100)+'%';
    row.insertCell().textContent=Math.round(d.ratio15*100)+'%（必要 '+d.required15.toFixed(2)+'m）';
    row.insertCell().textContent=d.balance.ratio.toFixed(2)+' / '+(d.balance.adequate?'比較条件内':'偏りに注意');
   }
  }
  paragraph(result.seismic.limitations);
 }
 paragraph('荷重の根拠は建築基準法施行令84・85条、必要壁量の算定式とAiは国交省の2025年基準説明資料、壁配置は四分割法の説明資料です。窓・バルコニー等の教材仮定も含みます。ダンパーによる壁量の加点は行いません。');
 for(const url of new Set(rows.flatMap(r=>Object.values(r.seismic.sources||H.evidence.data.sources)))){const p=document.createElement('p');link(p,url);box.append(p);}
 heading('費用の内訳と出典');
 paragraph('木材・合板はKTSの2023年12月公表単価、枠組材は登録済みの参考単価1,030円/本を使用します。資料時点・仕様・地域が異なり、現在の実売見積とは一致しません。');
 paragraph('設備の一律300万円は廃止しました。公表価格を使う行と、工事等の仮定単価を使う行を明記します。税込価格は税抜額に換算してから税を一度だけ加算し、税区分未確認の資料は表示額のまま追加課税しません。設備・家電には工事予備費を上乗せしません。');
 for(const result of rows){
  heading(M.methods[result.method].name+' の参考費用');
  const t=table(['項目','小計計算用の金額','根拠の区分','計算条件']);
  for(const item of result.cost.rows){
   const row=t.insertRow();row.insertCell().textContent=item.name;
   row.insertCell().textContent=money(item.amount);
   row.insertCell().textContent=item.priceKind==='published'?'公表価格':'教材仮定';
   const basis=row.insertCell();basis.textContent=item.basis;link(basis,item.source);link(basis,item.secondarySource);
  }
  for(const [name,value] of [['工事等の予備費10%（仮定）',result.cost.reserve],['消費税（税区分確認分・仮定費用分）',result.cost.tax],['参考合計',result.cost.total]]){
   const row=t.insertRow();row.insertCell().textContent=name;row.insertCell().textContent=money(value);
  }
  if(result.cost.taxUnknownSubtotal)paragraph('税区分を確認できていない資料の表示額を含む項目 '+money(result.cost.taxUnknownSubtotal)+'。');
 }
 paragraph('基礎・施工・外装・鉄骨/RC部材・設計等には、引き続き教材仮定の単価を含みます。地域差や施工見積の検証は未完了です。設備の給排水・配線、搬入、蓄電池、土地、外構、家具等の不足費用もあるため、建築予算を確定する見積ではありません。');
}
$('evaluate').textContent='仕様をくらべる';$('evaluate').onclick=()=>{$('compareDialog').showModal();renderChallengeComparison();};$('challengeClose').onclick=()=>$('compareDialog').close();$('recordChallenge').onclick=()=>{recordedPlan={name:model.name,method:currentMethod(),model:structuredClone(model),results:methodIds.map(m=>H.evaluate(model,m,level))};renderChallengeComparison();toast('この案を基準にしました。');};$('exportChallenge').onclick=()=>download('家づくり仕様比較.json',JSON.stringify({model,results:methodIds.map(m=>comparisonExport(H.evaluate(model,m,level))),baseline:recordedPlan&&{...recordedPlan,results:recordedPlan.results.map(comparisonExport)},limitations:'教材用の概算と配置の比較です。'},null,2),'application/json');
document.querySelector('.level-picker').addEventListener('click',()=>{wallChange='';update();});
for(const id of ['starter']){const original=$(id).onclick;$(id).onclick=()=>{const selected=currentMethod(),spec=H.options(model);original();model.method=selected;model.options=spec;update();fit();};}
if(!methodIds.includes(model.method))model.method='timber';
palette();update();

const previousFinishView=$('finishView').onclick;$('finishView').onclick=()=>{selectedWall=null;renderBraceInfo();previousFinishView();if(finishing){if(planView())$('iso').click();$('wallView').value='finish';$('layerLegend').textContent='仕上げの中に、支える仕組みがあります。';draw();}};

const finishControls=document.createElement('section');
finishControls.className='section finish-controls';
finishControls.innerHTML='<h3>仕上げ</h3><p id="finishStatus" aria-live="polite">床材は部屋の床を選んで適用できます。</p>';
const finishSelects={};
function finishSelect(field,label,items){
 const row=document.createElement('label');
 row.textContent=label+' ';
 const select=document.createElement('select');
 for(const [value,name] of Object.entries(items))select.add(new Option(name,value));
 row.append(select);
 finishControls.append(row);
 finishSelects[field]=select;
 return select;
}
const floorChoice=finishSelect('floor','床材',K.finishes.floors);
const paintFloor=document.createElement('button');
paintFloor.type='button';
paintFloor.textContent='部屋の床を選ぶ';
paintFloor.setAttribute('aria-pressed','false');
finishControls.append(paintFloor);
const paperChoice=finishSelect('wallpaper','壁紙',Object.fromEntries(Object.entries(K.finishes.wallpapers).map(([id,[name]])=>[id,name])));
const paintPaper=document.createElement('button');
paintPaper.type='button';
paintPaper.textContent='壁紙を貼る部屋を選ぶ';
paintPaper.setAttribute('aria-pressed','false');
finishControls.append(paintPaper);
const colorLabels={sand:'サンド',white:'白',gray:'グレー',charcoal:'チャコール',brown:'茶',green:'緑'};
const fields=[
 ['wall','外壁の素材',K.finishes.walls,'plaster'],
 ['wallColor','外壁の色',colorLabels,'sand'],
 ['roofShape','屋根の形',K.finishes.roofShapes,'flat'],
 ['roof','屋根の素材',K.finishes.roofs,'metal'],
 ['roofColor','屋根の色',colorLabels,'charcoal']
];
for(const [field,label,items] of fields){
 finishSelect(field,label,items).onchange=()=>{
  if(reference)return;
  remember();
  model.finishes={...model.finishes,[field]:finishSelects[field].value};
  update();
  if(finishing&&field==='roofShape')fit();
  $('finishStatus').textContent='完成表示で外観を確認できます。';
 };
}
document.querySelector('.palette').append(finishControls);
function stopFloorPaint(){
 paintFloor.setAttribute('aria-pressed','false');
 paintPaper.setAttribute('aria-pressed','false');
}
paintFloor.onclick=()=>{
 if(reference)return;
 if(paintFloor.getAttribute('aria-pressed')==='true'){stopFloorPaint();return;}
 if(finishing)$('finishView').click();
 $('plan').click();
 stopFloorPaint();
 paintFloor.setAttribute('aria-pressed','true');
 $('finishStatus').textContent='平面図で、仕上げたい部屋の床をクリック。もう一度ボタンを押すと終了します。';
};
paintPaper.onclick=()=>{
 if(reference)return;
 const wasActive=paintPaper.getAttribute('aria-pressed')==='true';
 stopFloorPaint();
 if(wasActive)return;
 if(finishing)$('finishView').click();
 $('plan').click();
 paintPaper.setAttribute('aria-pressed','true');
 $('finishStatus').textContent='平面図で部屋の床をクリック。貼った壁紙は「家の中を歩く」で確認できます。';
};
function applyFloorFinish(event){
 const paper=paintPaper.getAttribute('aria-pressed')==='true';
 if(reference||(!paper&&paintFloor.getAttribute('aria-pressed')!=='true'))return;
 const field=paper?'wallpaper':'finish';
 const choice=paper?paperChoice:floorChoice;
 event.stopImmediatePropagation();
 if(event.button!==0)return;
 const point=pointer(event),target=targetAt(point,'floor');
 const room=K.roomFloors(model,target);
 if(!room.length){$('finishStatus').textContent='室内の床をクリックしてください。';return;}
 if(room.some(p=>p[field]!==choice.value)){
  remember();
  for(const p of room)p[field]=choice.value;
  update();
 }
 $('finishStatus').textContent=paper?K.finishes.wallpapers[choice.value][0]+'の壁紙を部屋に貼りました。':K.finishes.floors[choice.value]+'を床'+room.length+'マスに適用しました。';
}
canvas.addEventListener('pointerdown',applyFloorFinish,true);
for(const id of ['iso','finishView','sample','move','build','erase'])$(id).addEventListener('click',stopFloorPaint);
$('groups').addEventListener('click',stopFloorPaint);
document.addEventListener('keydown',event=>{if(event.key==='Escape')stopFloorPaint();});
const updateWithFinishes=update;
update=function(){
 updateWithFinishes();
 for(const [field,,,fallback] of fields)finishSelects[field].value=model.finishes?.[field]||fallback;
 finishControls.hidden=!!reference;
 if(reference)stopFloorPaint();
};
update();

function comparisonExport(result){
 return {method:result.method,assembly:result.assembly,cost:{...result.cost},seismic:result.seismic,wallSummary:resistance(result),insulation:result.insulation,damperPositions:result.damperPositions};
}
