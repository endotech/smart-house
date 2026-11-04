'use strict';
const walkButton=document.createElement('button');
walkButton.textContent='家の中を歩く';
$('finishView').after(walkButton);
const walkControls=document.createElement('div');
walkControls.style.cssText='position:absolute;bottom:58px;left:16px;z-index:5;background:#fff;padding:8px;border-radius:8px;max-width:calc(100% - 32px)';
walkControls.hidden=true;
walkControls.innerHTML='<span>矢印・WASDで移動。ドラッグで見回す。</span><button data-walk="left" aria-label="左を向く">↶</button><button data-walk="forward" aria-label="前へ">↑</button><button data-walk="back" aria-label="後ろへ">↓</button><button data-walk="right" aria-label="右を向く">↷</button><button id="walkLevel">階を切り替える</button>';
$('stage').append(walkControls);
const roofPicker=document.createElement('select');
roofPicker.setAttribute('aria-label','完成表示の屋根形状');
for(const [key,label] of Object.entries(K.finishes.roofShapes))roofPicker.add(new Option('屋根 · '+label,key));
walkButton.after(roofPicker);
roofPicker.onchange=()=>{
 if(!reference)remember();
 model.finishes={...model.finishes,roofShape:roofPicker.value};
 update();
 fit();
};
let walk=null,deviceView=false;
let motionTime=0, motionFrame=0, litRooms=new Map();
const shutterMotion=new WeakMap();
const vacuumRuns=new WeakMap();
function vacuumPosition(part,g){
 const run=vacuumRuns.get(part);
 if(!run||!deviceState(part).on)return run?.position??g;
 const phase=((motionTime-run.start)/1800)%(run.path.length*2-2||1);
 const index=phase<=run.path.length-1?phase:2*(run.path.length-1)-phase;
 const a=run.path[Math.floor(index)]??run.path[0];
 const b=run.path[Math.ceil(index)]??a;
 const fraction=index-Math.floor(index);
 return {x:(a.c+(b.c-a.c)*fraction+.5)*K.UNIT,z:(a.r+(b.r-a.r)*fraction+.5)*K.UNIT};
}
function startVacuum(part){
 const path=[part],seen=new Set([part.c+','+part.r]);
 const walls=new Set(model.parts.filter(p=>p.level===part.level&&M.wallKinds.includes(p.kind)&&p.kind!=='door').map(K.key));
 for(let i=0;i<12;i++){
  const last=path.at(-1);
  const next=[[1,0],[0,1],[-1,0],[0,-1]].map(([dc,dr])=>({
   c:last.c+dc,r:last.r+dr,level:part.level,
   edge:K.key({kind:'wall',level:part.level,c:last.c+Math.max(0,dc),r:last.r+Math.max(0,dr),axis:dc?'z':'x'})
  })).find(p=>!seen.has(p.c+','+p.r)&&!walls.has(p.edge)&&!K.allowed(model,'vacuum',p,0,part.id));
  if(!next)break;
  path.push(next);seen.add(next.c+','+next.r);
 }
 vacuumRuns.set(part,{path,start:motionTime});
}
function shutterOpening(part){
 const movement=shutterMotion.get(part);
 if(!movement)return deviceState(part).on?1:0;
 const ratio=Math.min(1,Math.max(0,(motionTime-movement.start)/720));
 return movement.from+(movement.to-movement.from)*ratio;
}
function deviceLighting(){
 const levels=new Map();
 for(const part of devices()){
  const state=deviceState(part);
  if(part.kind!=='light'||!state.level)continue;
  for(const floor of K.roomFloors(model,part)){
   const key=floor.level+':'+floor.c+','+floor.r;
   levels.set(key,Math.max(state.level,levels.get(key)||0));
  }
 }
 return levels;
}
function lightAt(level,c,r){return litRooms.get(level+':'+c+','+r)||0;}
function requestDeviceFrame(){
 if(motionFrame)return;
 if(!devices().some(p=>finishing&&['fan','ac','vacuum'].includes(p.kind)&&deviceState(p).on||p.kind==='shutter'&&performance.now()-(shutterMotion.get(p)?.start??-Infinity)<760))return;
 motionFrame=requestAnimationFrame(()=>{
  motionFrame=0;
  if(walk)startWalk(walk.level,walk);
  draw();
 });
}
const deviceViewButton=document.createElement('button');
deviceViewButton.textContent='家電を見ながら操作';
walkButton.after(deviceViewButton);
deviceViewButton.onclick=()=>{walk=null;deviceView=!deviceView;draw();};
const deviceStates=new WeakMap();
const planterData=new WeakMap();
const planters=()=>model.parts.filter(p=>K.specs[p.kind].plant);
function soilState(part){
 const now=performance.now();
 if(!planterData.has(part))planterData.set(part,{moisture:45,time:now});
 const data=planterData.get(part);
 data.moisture=Math.max(0,data.moisture-(now-data.time)/10000);
 data.time=now;
 return data;
}
window.SumaiPlanters={
 list:()=>planters().map((p,i)=>({id:p.id,name:'プランター'+(i+1)+' · '+K.specs[p.kind].name,floor:p.level+1,moisture:Math.round(soilState(p).moisture)})),
 readMoisture(id){
  const p=planters().find(q=>q.id===id);
  return p?Math.round(soilState(p).moisture):null;
 },
 water(id){
  const p=planters().find(q=>q.id===id);
  if(!p)return false;
  const data=soilState(p);
  data.moisture=Math.min(100,data.moisture+20);
  window.dispatchEvent(new CustomEvent('sumai:water',{detail:{id,moisture:Math.round(data.moisture)}}));
  draw();
  return true;
 }
};
const planterPanel=document.createElement('div');
const planterSelect=document.createElement('select');
planterSelect.setAttribute('aria-label','操作するプランター');
const moistureReadout=document.createElement('output');
const waterButton=document.createElement('button');
waterButton.textContent='水やり';
waterButton.onclick=()=>SumaiPlanters.water(planterSelect.value);
planterSelect.onchange=()=>draw();
planterPanel.append(planterSelect,moistureReadout,waterButton);
walkControls.append(planterPanel);
const devices=()=>model.parts.filter(p=>['bath','lock','shutter'].includes(p.kind)||K.specs[p.kind].category==='家電'&&!['fridge','solar'].includes(p.kind));
const energyProfiles=new WeakMap();
const watts={light:35,fan:50,ac:700,tv:100,bath:1400,washer:400,microwave:950,vacuum:45,camera:10,lock:3,shutter:80};
function energyProfile(){
 const panels=model.parts.filter(p=>p.kind==='solar').length;
 if(!energyProfiles.has(model))energyProfiles.set(model,{stored:panels?960:0,solar:panels>0,sun:1,last:performance.now()});
 const profile=energyProfiles.get(model);profile.solar=panels>0;if(!panels)profile.stored=0;
 return profile;
}
function powerFlow(profile){
 const panels=model.parts.filter(p=>p.kind==='solar').length;
 const generation=panels*150*profile.sun;
 const load=devices().reduce((sum,p)=>{
  const state=deviceState(p);
  if(!state.on||p.kind==='shutter')return sum;
  return sum+(watts[p.kind]||0)*(state.level?state.level/3:1);
 },0);
 return {panels,generation,load};
}
function energyTick(){
 const profile=energyProfile(),now=performance.now(),flow=powerFlow(profile);
 const hours=Math.min(2,Math.max(0,(now-profile.last)/1000))/60;
 profile.last=now;
 profile.stored=Math.max(0,Math.min(1200,profile.stored+(flow.generation-(profile.solar?flow.load:0))*hours));
 if(profile.solar&&!profile.stored&&flow.load>flow.generation){
  for(const p of devices()){
   if(['lock','shutter'].includes(p.kind))continue;
   const state=deviceState(p);
   if(!state.on)continue;
   deviceStates.set(p,{...state,on:false,level:0});
   window.dispatchEvent(new CustomEvent('sumai:power',{detail:{id:p.id,...deviceState(p),reason:'battery-empty'}}));
  }
  if(walk)startWalk(walk.level,walk);
 }
}
window.SumaiEnergy={
 status(){const p=energyProfile();return {...powerFlow(p),storedWh:p.stored,capacityWh:1200,solarSupply:p.solar,sunlight:p.sun};},
 configure({solarSupply,sunlight}={}){
  if(solarSupply!==undefined&&typeof solarSupply!=='boolean'||sunlight!==undefined&&(!Number.isFinite(sunlight)||sunlight<0||sunlight>1))return false;
  energyTick();
  const p=energyProfile();
  if(solarSupply!==undefined)p.solar=solarSupply;
  if(sunlight!==undefined)p.sun=sunlight;
  draw();
  return true;
 }
};
const deviceState=p=>deviceStates.get(p)??{on:p.kind==='shutter',level:0,direction:0,...(p.kind==='ac'?{mode:'cool'}:{})};
window.SumaiDevices={
 list(){
  const numbers=new Map();
  return devices().map(p=>{
   const number=(numbers.get(p.kind)??0)+1;
   numbers.set(p.kind,number);
   const door=p.kind==='lock'?K.deviceMount(model,p):null;
   const rooms={3:'リビング',9:'寝室',2:'キッチン',7:'浴室',11:'トイレ'};
   const room=!window.classroomImported&&door&&(door.axis==='z'?'玄関':rooms[door.c]);
   const label=p.kind==='light'?'照明':room?room+'の鍵':K.specs[p.kind].name;
   return {id:p.id,kind:p.kind,name:label+number,number,floor:p.level+1,...deviceState(p)};
  });
 },
 state(id){const p=devices().find(p=>p.id===id);return p?{...deviceState(p)}:null;},
 setPower(id,on){return this.configure(id,{on});},
 configure(id,patch){
  const part=devices().find(p=>p.id===id);
  if(!part||!patch||typeof patch!=='object')return false;
  const state={...deviceState(part)};
  if(Object.hasOwn(patch,'on')){
   if(typeof patch.on!=='boolean')return false;
   state.on=patch.on;
   if(['light','fan'].includes(part.kind))state.level=patch.on?state.level||1:0;
  }
  if(Object.hasOwn(patch,'level')){
   if(!['light','fan'].includes(part.kind)||![0,1,2,3].includes(patch.level))return false;
   state.level=patch.level;state.on=state.level>0;
  }
  if(Object.hasOwn(patch,'mode')){
   if(part.kind!=='ac'||!['cool','heat'].includes(patch.mode))return false;
   state.mode=patch.mode;
  }
  if(Object.hasOwn(patch,'direction')){
   if(part.kind!=='camera'||![0,90,180,270].includes(patch.direction))return false;
   state.direction=patch.direction;
  }
  if(part.kind==='shutter'&&state.on!==deviceState(part).on){
   motionTime=performance.now();
   shutterMotion.set(part,{from:shutterOpening(part),to:state.on?1:0,start:motionTime});
  }
  if(part.kind==='vacuum'&&state.on!==deviceState(part).on){
   motionTime=performance.now();
   if(state.on)startVacuum(part);
   else vacuumRuns.set(part,{position:vacuumPosition(part,K.geometry(part))});
  }
  energyTick();
  const energy=energyProfile();
  if(state.on&&!['lock','shutter'].includes(part.kind)&&energy.solar&&!energy.stored&&powerFlow(energy).generation<(watts[part.kind]||0)*(state.level?state.level/3:1)){
   toast('蓄電残量と発電量が足りません');
   return false;
  }
  deviceStates.set(part,state);
  if(walk)startWalk(walk.level,walk);
  draw();
  window.dispatchEvent(new CustomEvent('sumai:power',{detail:{id,...state}}));
  return true;
 }
};
const deviceSelect=document.createElement('select');
deviceSelect.setAttribute('aria-label','操作する家電');
const power=document.createElement('button');
power.onclick=()=>{
 const device=SumaiDevices.list().find(p=>p.id===deviceSelect.value);
 if(device)SumaiDevices.setPower(device.id,!device.on);
};
const adjust=document.createElement('button');
adjust.onclick=()=>{
 const d=SumaiDevices.list().find(p=>p.id===deviceSelect.value);
 if(!d)return;
 SumaiDevices.configure(d.id,d.kind==='ac'?{mode:d.mode==='heat'?'cool':'heat'}:d.kind==='camera'?{direction:(d.direction+90)%360}:{level:d.level%3+1});
};
const energyPanel=document.createElement('div');
const supply=document.createElement('button');supply.hidden=true;
supply.onclick=()=>SumaiEnergy.configure({solarSupply:!energyProfile().solar});
const sun=document.createElement('select');
sun.setAttribute('aria-label','日当たり');
for(const [value,label] of [[1,'晴れ'],[.35,'曇り'],[0,'夜']])sun.add(new Option(label,value));
sun.onchange=()=>SumaiEnergy.configure({sunlight:Number(sun.value)});
const energyReadout=document.createElement('output');
energyPanel.append(supply,sun,energyReadout);
walkControls.append(deviceSelect,power,adjust,energyPanel);
deviceSelect.onchange=()=>draw();
const eye=1250, body=235;
function startWalk(floorLevel,position){
 const floors=model.parts.filter(p=>p.kind==='floor'&&p.level===floorLevel);
 if(!floors.length)return false;
 const balconies=model.parts.filter(p=>p.kind==='balcony'&&p.level===floorLevel);
 const tiles=new Set([...floors,...balconies].map(p=>p.c+','+p.r));
 const doors=model.parts.filter(p=>p.kind==='door'&&p.level===floorLevel);
 const entry=doors.map(p=>K.edgeCells(p).filter(([c,r])=>tiles.has(c+','+r))).find(c=>c.length===1);
 const [c,r]=entry?.[0]??[floors[0].c,floors[0].r];
 const faces=[],stairs=[],floorFinishes=new Map();
 const wallpaper=new Map(floors.map(p=>[p.c+','+p.r,K.finishes.wallpapers[p.wallpaper]?.[1]]));
 const add=(b,y,h,color,solid=true,device=null)=>faces.push({...b,y,h,color,solid,device});
 for(const p of model.parts){
  if(p.level!==floorLevel)continue;
  const g=K.geometry(p);
  const wall=M.wallKinds.includes(p.kind);
  if(wall){
   const box={left:g.x-g.w/2,right:g.x+g.w/2,near:g.z-g.d/2,far:g.z+g.d/2,axis:p.axis,papers:K.edgeCells(p).map(([c,r])=>wallpaper.get(c+','+r))};
   if(p.kind==='door'){
    add(box,2100,630,'#e4dfd2',false);
    const locked=devices().some(q=>q.kind==='lock'&&deviceState(q).on&&K.deviceMount(model,q)===p);
    if(locked)add(box,0,2100,'#997655');
    else{
     const inward=p.axis==='x'?(p.r===5?-1:1):1;
     const hinge=p.axis==='x'?g.x-K.UNIT/2+36:g.z-K.UNIT/2+36;
     const tip=(p.axis==='x'?g.z:g.x)+inward*710;
     const leaf=p.axis==='x'
      ?{left:hinge-22,right:hinge+22,near:Math.min(g.z,tip),far:Math.max(g.z,tip)}
      :{left:Math.min(g.x,tip),right:Math.max(g.x,tip),near:hinge-22,far:hinge+22};
     add(leaf,0,2100,'#b18a63',false);
     if(p.axis==='x')add({...leaf,near:tip-30,far:tip+30,left:hinge-32,right:hinge+32},920,75,'#584f43',false);
     else add({...leaf,left:tip-30,right:tip+30,near:hinge-32,far:hinge+32},920,75,'#584f43',false);
    }
   }
   else if(p.kind==='window'){
    add(box,0,900,'#e4dfd2');
    const shutter=devices().find(q=>q.kind==='shutter'&&K.deviceMount(model,q)===p);
    const openHeight=shutter?1200*shutterOpening(shutter):1200;
    if(openHeight>0)add(box,900,openHeight,'#9abfc8',false);
    if(openHeight<1200)add(box,900+openHeight,1200-openHeight,'#28343d',false);
    add(box,2100,630,'#e4dfd2',false);
   }else add(box,0,2730,'#e4dfd2');
  }else if(p.kind==='floor'){
   floorFinishes.set(p.c+','+p.r,p.finish||(reference&&p.level===0&&p.r>=6&&p.c>=6?'tile':'oak'));
  }else if(p.kind==='balcony'){
   floorFinishes.set(p.c+','+p.r,['steel','rc'].includes(model.method)?'tile':'oak');
   for(const [dc,dr] of [[-1,0],[1,0],[0,-1],[0,1]]){
    if(tiles.has((p.c+dc)+','+(p.r+dr)))continue;
    const x=(p.c+.5+dc*.5)*K.UNIT,z=(p.r+.5+dr*.5)*K.UNIT;
    add({left:x-(dc?30:K.UNIT/2),right:x+(dc?30:K.UNIT/2),near:z-(dr?30:K.UNIT/2),far:z+(dr?30:K.UNIT/2)},0,950,'#798a83');
   }
  }else if(K.isFurniture(p.kind)){
   const bounds=K.furnitureBounds(p);
   const original=cuboid;
   try{
    cuboid=(box,color)=>add({left:box.x-box.w/2,right:box.x+box.w/2,near:box.z-box.d/2,far:box.z+box.d/2},box.y-floorLevel*K.STOREY-K.BASE,box.h,color,false,p);
    blocks(p,[]);
   }finally{cuboid=original;}
   if(p.kind==='stairs'){
    const angle=(p.rotation??0)*Math.PI/180;
    stairs.push({x:g.x,z:g.z,dx:-Math.sin(angle),dz:Math.cos(angle),length:g.d,width:g.w});
   }else if(p.kind!=='ac'&&p.kind!=='vacuum'&&!K.specs[p.kind].mount)add(bounds,0,0,'#000000');
  }else if(p.kind==='post'){
   const size=model.method==='rc'?(model.structural?.rcColumn==='large'?400:300):model.method==='steel'?(model.structural?.steelColumn==='large'?250:200):106;
   add({left:g.x-size/2,right:g.x+size/2,near:g.z-size/2,far:g.z+size/2},0,g.h,model.method==='rc'?'#a7a8a4':model.method==='steel'?'#536f86':'#bd9b75');
  }
 }
 motionTime=performance.now();
 const previous=walk;
 walk={level:floorLevel,tiles,faces,stairs,floorFinishes,x:position?.x??(c+.5)*K.UNIT,z:position?.z??(r+.5)*K.UNIT,angle:position?.angle??0,look:position?.look??0,rise:position?.rise??0,descending:position?.descending||false};
 const directions=[0,Math.PI/2,Math.PI,Math.PI*1.5];
 if(!position)walk.angle=directions.sort((a,b)=>freeDistance(b)-freeDistance(a))[0];
 if(!previous)canvas.focus();
 return true;
}
function canWalk(x,z){
 for(const dx of [-body,body])for(const dz of [-body,body])
  if(!walk.tiles.has(Math.floor((x+dx)/K.UNIT)+','+Math.floor((z+dz)/K.UNIT)))return false;
 return !walk.faces.some(b=>b.solid&&x+body>b.left&&x-body<b.right&&z+body>b.near&&z-body<b.far);
}
function freeDistance(angle){
 let distance=0;
 for(let i=1;i<=12;i++){
  if(!canWalk(walk.x+Math.sin(angle)*i*100,walk.z+Math.cos(angle)*i*100))break;
  distance=i;
 }
 return distance;
}
function rayHit(b,dx,dz){
 const x1=(b.left-walk.x)/dx,x2=(b.right-walk.x)/dx,z1=(b.near-walk.z)/dz,z2=(b.far-walk.z)/dz;
 const enter=Math.max(Math.min(x1,x2),Math.min(z1,z2));
 const exit=Math.min(Math.max(x1,x2),Math.max(z1,z2));
 return exit>=Math.max(enter,20)?Math.max(enter,20):Infinity;
}
function drawWalk(){
 ctx.save();
 ctx.setTransform(1,0,0,1,0,0);
 const width=canvas.width,height=canvas.height;
 const pixelRatio=canvas.width/canvas.getBoundingClientRect().width;
 const focus=width*.48,horizon=height*.5+walk.look*pixelRatio;
 ctx.fillStyle='#eeeae1';ctx.fillRect(0,0,width,height);
 ctx.fillStyle='#c4aa8a';ctx.fillRect(0,Math.max(0,horizon),width,height);
 const cameraY=eye+walk.rise;
 const palette={oak:['#c8a47e','#d7b793'],walnut:['#765641','#8c684e'],tile:['#aab9b9','#c5cece'],tatami:['#a4ad78','#c0c692']};
 for(let sy=Math.max(0,Math.ceil(horizon+2));sy<height;sy+=4){
  const d=cameraY*focus/(sy-horizon);
  if(d>24000)continue;
  for(let sx=0;sx<width;sx+=5){
   const side=(width/2-sx)*d/focus;
   const x=walk.x+Math.sin(walk.angle)*d+Math.cos(walk.angle)*side;
   const z=walk.z+Math.cos(walk.angle)*d-Math.sin(walk.angle)*side;
   const style=walk.floorFinishes.get(Math.floor(x/K.UNIT)+','+Math.floor(z/K.UNIT));
   if(!style)continue;
   const stripe=Math.floor(x/(style==='tile'?455:style==='tatami'?455:180))+(style==='tile'?Math.floor(z/455):0);
   ctx.fillStyle=shade(palette[style][stripe&1],1+lightAt(walk.level,Math.floor(x/K.UNIT),Math.floor(z/K.UNIT))*.13);
   ctx.fillRect(sx,sy,5,4);
  }
 }
 for(let x=0;x<width;x+=2){
  const offset=Math.atan((x-width/2)/focus),angle=walk.angle-offset;
  const dx=Math.sin(angle)||1e-9,dz=Math.cos(angle)||1e-9;
  const hits=[];
  for(const b of walk.faces){
   if(!b.h)continue;
   const d=rayHit(b,dx,dz)*Math.cos(offset);
   if(d<28000)hits.push({b,d});
  }
  hits.sort((a,b)=>b.d-a.d);
  for(const {b,d} of hits){
   const side=b.axis==='x'?(walk.z<(b.near+b.far)/2?0:1):(walk.x<(b.left+b.right)/2?0:1);
   const daylight=window.SumaiClock?.brightness()??1;
   const glass=b.color==='#9abfc8'?shade(b.color,.3+.7*daylight):null;
   const paper=b.color==='#e4dfd2'?b.papers?.[side]:null;
   const top=horizon+(cameraY-b.y-b.h)*focus/d;
   const heightOnScreen=b.h*focus/d;
   const active=b.device&&deviceState(b.device).on;
   const screen=b.device?.kind==='tv'&&['#283845','#6ecbfa','#b6ebff'].includes(b.color);
   if(b.device?.kind==='shutter'&&b.color!=='#636f76'){
    ctx.fillStyle=shade(b.color,.53);
    ctx.fillRect(x,Math.floor(top),2,Math.ceil(top+heightOnScreen)-Math.floor(top));
    ctx.fillStyle='#52616a';
    ctx.fillRect(x,Math.floor(top+heightOnScreen)-1,2,1);
    continue;
   }
   const tint=screen?(active?b.color:'#283845'):paper||glass||b.color;
   const distanceLight=Math.max(.72,1-d/42000);
   const hitDistance=d/Math.cos(offset);
   const hitX=walk.x+dx*hitDistance,hitZ=walk.z+dz*hitDistance;
   const xFace=Math.min(Math.abs(hitX-b.left),Math.abs(hitX-b.right))<
    Math.min(Math.abs(hitZ-b.near),Math.abs(hitZ-b.far));
   const light=distanceLight*(b.device?(xFace?.80:1.03):1);
   if(b.device&&cameraY>b.y+b.h){
    const farDistance=Math.min(
     Math.max((b.left-walk.x)/dx,(b.right-walk.x)/dx),
     Math.max((b.near-walk.z)/dz,(b.far-walk.z)/dz)
    )*Math.cos(offset);
    const farTop=horizon+(cameraY-b.y-b.h)*focus/farDistance;
    ctx.fillStyle=shade(tint,Math.min(1.2,distanceLight*1.16));
    ctx.fillRect(x,Math.floor(farTop),2,Math.max(0,Math.ceil(top)-Math.floor(farTop)));
   }
   ctx.fillStyle=shade(tint,light);
   ctx.fillRect(x,Math.floor(top),2,Math.ceil(top+heightOnScreen)-Math.floor(top));
   if(b.device){
    ctx.fillStyle=shade(tint,light*.66);
    ctx.fillRect(x,Math.floor(top),2,1);
    ctx.fillRect(x,Math.floor(top+heightOnScreen)-1,2,1);
    if(active&&!screen&&b.device.kind!=='ac'){
     ctx.fillStyle='#5ac29a';
     ctx.fillRect(x,Math.floor(top)+2,2,2);
    }
   }
  }
 }
 ctx.restore();
}
function walkStep(x,z){
 for(const stair of walk.stairs){
  const along=(x-stair.x)*stair.dx+(z-stair.z)*stair.dz;
  const across=(x-stair.x)*stair.dz-(z-stair.z)*stair.dx;
  if(Math.abs(across)>stair.width/2-body||along < -stair.length/2||along>stair.length/2+550)continue;
  if(along>stair.length/2){
   if(walk.descending){walk.x=x;walk.z=z;walk.rise=K.STOREY;return true;}
   const previous=walk;
   for(const distance of [180,310,440,570,700]){
    const position={x:x+stair.dx*distance,z:z+stair.dz*distance,angle:previous.angle};
    if(!K.floorAt(model,previous.level+1,Math.floor(position.x/K.UNIT),Math.floor(position.z/K.UNIT)))continue;
    startWalk(previous.level+1,position);
    if(canWalk(walk.x,walk.z))return true;
   }
   walk=previous;return false;
  }
  walk.descending=false;
  walk.x=x;walk.z=z;
  walk.rise=Math.max(0,Math.min(1,(along+stair.length/2)/stair.length))*K.STOREY;
  return true;
 }
 if(walk.level>0){
  for(const p of model.parts.filter(p=>p.kind==='stairs'&&p.level===walk.level-1)){
   const g=K.geometry(p),angle=(p.rotation??0)*Math.PI/180,dx=-Math.sin(angle),dz=Math.cos(angle);
   const along=(x-g.x)*dx+(z-g.z)*dz, across=(x-g.x)*dz-(z-g.z)*dx;
   if(Math.abs(across)>g.w/2-body||along<g.d/2-250||along>g.d/2+550)continue;
   if(!canWalk(x,z)){
    startWalk(walk.level-1,{x,z,angle:walk.angle});
    walk.descending=true;
    walk.rise=Math.min(1,(along+g.d/2)/g.d)*K.STOREY;
    return true;
   }
  }
 }
 if(walk.rise>250||!canWalk(x,z))return false;
 walk.rise=0;walk.x=x;walk.z=z;
 return true;
}
function moveWalk(action,amount=130){
 if(action==='left'||action==='right')walk.angle+=(action==='left'?1:-1)*.13;
 else{
  const angle=walk.angle+({back:Math.PI,strafeLeft:Math.PI/2,strafeRight:-Math.PI/2}[action]||0);
  const x=walk.x+Math.sin(angle)*amount,z=walk.z+Math.cos(angle)*amount;
  if(!walkStep(x,z)&&!walkStep(x,walk.z))walkStep(walk.x,z);
 }
 draw();
}
const previousDraw=draw,previousBlocks=blocks,previousVisible=visible;
visible=function(p){return !(deviceView&&p.kind==='roof')&&previousVisible(p);};
blocks=function(p,out,ghost=false){
 const start=out.length;
 previousBlocks(p,out,ghost);
 if(!deviceView)return;
 if(M.wallKinds.includes(p.kind))for(let i=start;i<out.length;i++)out[i].alpha*=.14;
 if(!devices().includes(p)||ghost)return;
 const state=SumaiDevices.state(p.id),g=K.geometry(p);
 const high=p.kind==='light'?2590:p.kind==='camera'?2320:p.kind==='solar'?K.STOREY:0;
 const size=state?.on?175+75*(state.level||0):85;
 cuboid({x:g.x,z:g.z,y:g.y+g.h+high+85,w:size,d:size,h:65},p.id===deviceSelect.value?(state?.on?'#38cd88':'#ebba62'):(state?.on?'#55b490':'#79858a'),p.id,out,false,.9);
};
draw=function(){
 motionTime=performance.now();
 if(!finishing){walk=null;deviceView=false;}
 walkButton.hidden=!finishing;
 deviceViewButton.hidden=!finishing;
 deviceViewButton.textContent=deviceView?'通常の外観に戻る':'家電を見ながら操作';
 walkButton.textContent=walk?'外観に戻る':'家の中を歩く';
 roofPicker.hidden=!finishing||!!walk||deviceView;
 roofPicker.value=model.finishes?.roofShape||'flat';
 walkControls.hidden=!walk&&!deviceView;
 for(const child of walkControls.querySelectorAll('span,[data-walk],#walkLevel'))child.hidden=!walk;
 if(walk)$('walkLevel').textContent=(walk.level+1)+'階 · 階を切り替える';
 if(walk||deviceView){
  const list=SumaiDevices.list().filter(p=>!walk||p.floor===walk.level+1);
  const selected=deviceSelect.value;
  if([...deviceSelect.options].map(o=>o.value+o.text).join('|')!==list.map(p=>p.id+p.floor+'階 '+p.name).join('|')){
   deviceSelect.replaceChildren(...list.map(p=>new Option(p.floor+'階 '+p.name,p.id)));
   if(list.some(p=>p.id===selected))deviceSelect.value=selected;
  }
  const current=list.find(p=>p.id===deviceSelect.value);
  deviceSelect.hidden=power.hidden=!current;
  power.textContent=current?.kind==='bath'?(current.on?'湯はり停止':'湯はり開始'):current?.kind==='lock'?(current.on?'解錠する':'施錠する'):current?.kind==='shutter'?(current.on?'閉める':'開ける'):current?.on?'運転中 · 停止':'停止中 · 運転';
  adjust.hidden=!current||!['light','fan','camera','ac'].includes(current.kind);
  adjust.textContent=current?.kind==='ac'?(current.mode==='heat'?'暖房 → 冷房':'冷房 → 暖房'):current?.kind==='camera'?'向き '+current.direction+'° ↻':('弱中強'[(current?.level??1)-1]??'弱')+' ↻';
 }
 litRooms=finishing?deviceLighting():new Map();
 if(walk||deviceView){
  const pots=SumaiPlanters.list().filter(p=>!walk||p.floor===walk.level+1);
  planterPanel.hidden=!pots.length;
  const selectedPot=planterSelect.value;
  if([...planterSelect.options].map(o=>o.value+o.text).join('|')!==pots.map(p=>p.id+p.name).join('|')){
   planterSelect.replaceChildren(...pots.map(p=>new Option(p.name,p.id)));
   if(pots.some(p=>p.id===selectedPot))planterSelect.value=selectedPot;
  }
  const pot=pots.find(p=>p.id===planterSelect.value);
  moistureReadout.textContent=pot?' 土壌水分 '+pot.moisture+'% · ':'';
  const energy=SumaiEnergy.status();
  supply.textContent=energy.solarSupply?'電源 · 太陽光と蓄電池':'電源 · 通常';
  sun.value=energy.sunlight;
  energyReadout.textContent=' 残量 '+Math.round(energy.storedWh)+' / 1,200 Wh · 発電 '+Math.round(energy.generation)+' W · 使用 '+Math.round(energy.load)+' W';
 }
 if(walk&&width)drawWalk();
 else previousDraw();
 deviceSelect.hidden=power.hidden=adjust.hidden=planterPanel.hidden=energyPanel.hidden=true;
 requestDeviceFrame();
};
setInterval(()=>{
 energyTick();
 if(finishing||walk||deviceView)draw();
},1000);
walkButton.onclick=()=>{
 deviceView=false;
 if(walk)walk=null;
 else if(!startWalk(0)&&!startWalk(level))return toast('床を置いてから室内を見てみよう');
 draw();
};
$('walkLevel').onclick=()=>{
 for(let i=1;i<=3;i++)if(startWalk((walk.level+i)%3))break;
 draw();
};
walkControls.onclick=e=>{if(walk&&e.target.dataset.walk)moveWalk(e.target.dataset.walk);};
document.addEventListener('keydown',e=>{
 if(!walk||e.target.closest('input,select,textarea,dialog'))return;
 if(e.key==='Escape'){walk=null;draw();return;}
 const action={ArrowUp:'forward',ArrowDown:'back',ArrowLeft:'left',ArrowRight:'right',w:'forward',s:'back',a:'strafeLeft',d:'strafeRight'}[e.key];
 if(action){e.preventDefault();moveWalk(action);}
});
let walkDrag=null;
canvas.addEventListener('pointerdown',e=>{
 if(!walk)return;
 e.stopImmediatePropagation();
 canvas.setPointerCapture(e.pointerId);
 walkDrag={id:e.pointerId,x:e.clientX,y:e.clientY};
},true);
canvas.addEventListener('pointermove',e=>{
 if(!walk||walkDrag?.id!==e.pointerId)return;
 e.stopImmediatePropagation();
 walk.angle-=(e.clientX-walkDrag.x)*.006;
 walk.look=Math.max(-height*.34,Math.min(height*.34,walk.look+(e.clientY-walkDrag.y)));
 walkDrag={id:e.pointerId,x:e.clientX,y:e.clientY};
 draw();
},true);
for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,()=>{walkDrag=null;},true);
canvas.addEventListener('click',e=>{if(walk)e.stopImmediatePropagation();},true);
draw();
