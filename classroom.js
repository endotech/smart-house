'use strict';
const fixedHouse=K.furnishedSample(false);
fixedHouse.name='スマートハウス開発｜平屋';
fixedHouse.parts=fixedHouse.parts.filter(p=>!['tv','washer'].includes(p.kind));
for(const [kind,c,r] of [['desk',10,3],['chair',11,3]]){
 const result=K.place(fixedHouse,kind,{level:0,c,r});
 if(!result.ok)throw Error(result.error);
}
const available=new Set(['lock','light','fan','ac','tv','camera','vacuum','shutter','washer','solar','vegetable','flower','microwave','bath']);
const movable=part=>available.has(part.kind)&&(window.classroomImported||!['microwave','bath'].includes(part.kind));
const importedKey='sumai-classroom-imported';
const standardKey='sumai-classroom-standard-devices';
function storedValue(key){
 try{return localStorage.getItem(key);}catch{return null;}
}
let imported=storedValue(importedKey)==='yes'&&model.parts.some(p=>p.kind==='floor');
window.classroomImported=imported;
let fixedIds;
const solarDefaultsKey="sumai-classroom-solar-defaults";
function standardHouse(parts=[],seedSolar=false){
 const next=structuredClone(fixedHouse);
 const ids=new Set(next.parts.map(p=>p.id));
 for(const p of parts)if(movable(p)&&!ids.has(p.id))K.place(next,p.kind,p,p.rotation??0);
 if(seedSolar&&!next.parts.some(p=>p.kind==="solar")){
  for(const roof of next.parts.filter(p=>p.kind==="roof").slice(0,2)){
   const result=K.place(next,"solar",roof);
   if(!result.ok)throw Error(result.error);
  }
 }
 return next;
}
if(!imported)model=standardHouse(model.parts,!storedValue(solarDefaultsKey));
function lockLayout(){
 fixedIds=new Set(model.parts.filter(p=>!movable(p)).map(p=>p.id));
}
lockLayout();
const openHouse=document.createElement('button');
openHouse.textContent='CADで作った家を開く';
const defaultHouse=document.createElement('button');
defaultHouse.textContent='基本の平屋に戻る';
defaultHouse.hidden=!imported;
const houseFile=document.createElement('input');
houseFile.type='file';
houseFile.accept='.json,application/json';
houseFile.hidden=true;
document.querySelector('.file-actions').append(openHouse,defaultHouse,houseFile);
openHouse.onclick=()=>houseFile.click();
function loadHouse(next,isImported){
 if(carrying)cancelCarry();
 walk=null;
 deviceView=false;
 finishing=false;
 model=next;
 imported=isImported;
 window.classroomImported=imported;
 defaultHouse.hidden=!imported;
 try{localStorage.setItem(importedKey,imported?'yes':'no');}catch{}
 lockLayout();
 undoStack=[];
 redoStack=[];
 selectedFurniture=hover=gesture=grabbing=null;
 level=Math.min(...model.parts.filter(p=>p.kind==='floor').map(p=>p.level));
 document.querySelectorAll('[data-level]').forEach(button=>{
  button.classList.toggle('active',Number(button.dataset.level)===level);
  button.hidden=!model.parts.some(p=>p.kind==='floor'&&p.level===Number(button.dataset.level));
 });
 document.body.classList.toggle('classroom-imported',imported);
 group='家電';kind='light';mode='move';
 $('showRoof').checked=false;
 $('showWalls').checked=true;
 palette();
 $('plan').click();
 update();
 if(!imported)try{localStorage.setItem(solarDefaultsKey,"yes");}catch{}
}
houseFile.onchange=async()=>{
 const file=houseFile.files[0];
 if(!file)return;
 try{
  if(file.size>2e6)throw Error('2MB以下のCAD作品を選んでください');
  const next=SmartHouseTransfer.prepare(JSON.parse(await file.text()),K);
  if(!imported)try{localStorage.setItem(standardKey,JSON.stringify(model.parts.filter(movable)));}catch{}
  loadHouse(next,true);
  toast('CADの家を開きました。機器を配置できます');
 }catch(error){toast(error.message||'CAD作品を開けませんでした');}
 finally{houseFile.value='';}
};
defaultHouse.onclick=()=>{
 let parts=[];
 try{parts=JSON.parse(storedValue(standardKey)||'[]');}catch{}
 loadHouse(standardHouse(parts,!storedValue(solarDefaultsKey)),false);
};
group='家電';
kind='light';
const statuses=document.createElement('section');
statuses.id='classroomStatus';
statuses.innerHTML='<h2>動作状況</h2><p>置いた機器をここから操作できます。</p><div id="classroomRows"></div>';
document.querySelector('.guide').prepend(statuses);
document.body.classList.add('classroom');
$('title').readOnly=true;

canvas.addEventListener('click',event=>{
 if(walk)return;
 const part=hitAt(pointer(event));
 if(part&&fixedIds.has(part.id)){
  selectedFurniture=null;
  event.stopImmediatePropagation();
  palette();
 }
},true);
const clockPanel=document.createElement('div');
clockPanel.className='classroom-clock';
clockPanel.innerHTML='<section class="clock-section clock-time" aria-label="時刻"><span class="clock-label">時刻</span><div class="clock-time-controls"><button type="button" aria-label="1時間戻す">−1時間</button><label><span class="clock-range-label">時刻を選ぶ</span><input aria-label="時刻を選ぶ" type="range" min="6" max="23" step="1" value="8"></label><output aria-live="polite"></output><button type="button" aria-label="1時間進める">＋1時間</button></div></section><section id="classroomBattery" class="clock-section" aria-label="蓄電残量"><span class="clock-label">蓄電残量</span><div class="battery-meter"><strong id="batteryReading"></strong><progress id="batteryGauge" max="100" aria-label="蓄電残量"></progress></div><small id="batteryAmount"></small></section><section class="clock-section" aria-label="太陽光発電"><span class="clock-label">太陽光発電</span><strong id="solarReading"></strong><small id="solarPanels"></small></section><section class="clock-section" aria-label="家全体の消費電力"><span class="clock-label">家全体の消費電力</span><strong id="consumptionReading"></strong><small>動いている機器の合計</small></section>';
document.querySelector('header').after(clockPanel);
const clockRange=clockPanel.querySelector('input');
const clockOutput=clockPanel.querySelector('output');
const [earlier,later]=clockPanel.querySelectorAll('button');
let hour=8;
const daylightAt=h=>Math.max(0,Math.sin((h-6)*Math.PI/12));
window.SumaiClock={
 hour:()=>hour,
 brightness:()=>Math.min(.48+(hour-6)*.26,1-Math.min(1,Math.max(0,(hour-17)/3))),
 setHour(value){
  if(!Number.isInteger(value)||value<6||value>23)return false;
  hour=value;
  clockRange.value=hour;
  clockOutput.textContent=String(hour).padStart(2,'0')+':00';
  earlier.disabled=hour===6;
  later.disabled=hour===23;
  const daylight=daylightAt(hour);
  document.body.style.setProperty('--night-opacity',String((1-SumaiClock.brightness())*.64));
  SumaiEnergy.configure({sunlight:daylight});
  refreshClassroom();
  window.dispatchEvent(new CustomEvent('sumai:time',{detail:{hour,daylight}}));
  return true;
 }
};
clockRange.oninput=()=>SumaiClock.setHour(Number(clockRange.value));
earlier.onclick=()=>SumaiClock.setHour(hour-1);
later.onclick=()=>SumaiClock.setHour(hour+1);
const originalPalette=palette;
palette=function(){
 originalPalette();
 for(const b of $('groups').querySelectorAll('button'))b.hidden=!['家電','設備'].includes(b.dataset.group);
 for(const b of $('pieces').querySelectorAll('button'))b.hidden=!available.has(b.dataset.kind);
 $('actionTitle').textContent='';
 $('actionHint').textContent='機器をドラッグして設置。右の「動作状況」で操作します。';
};
canvas.addEventListener('pointerdown',event=>{
 if(event.shiftKey||event.button===1)return;
 const part=hitAt(pointer(event));
 if(!finishing&&event.button===0&&part&&fixedIds.has(part.id)){
  event.stopImmediatePropagation();
  if(mode==='erase')toast('間取りと家具は固定です');
 }
},true);
$('groups').addEventListener('click',event=>{
 if(!['家電','設備'].includes(event.target.dataset.group))return;
 kind=group==='設備'?'solar':'light';
 palette();
});

const operationLog=document.createElement('section');
operationLog.id='operationLog';
operationLog.innerHTML='<h2>動作ログ</h2><ol aria-label="動作ログ" tabindex="0"></ol>';
statuses.after(operationLog);
function appendClassroomLog(source,message){
 const list=operationLog.querySelector('ol');
 const entry=document.createElement('li');
 entry.textContent=new Date().toLocaleTimeString('ja-JP')+' · '+source+' · '+message;
 list.prepend(entry);
 if(list.children.length>100)list.lastElementChild.remove();
}
let previousDeviceStates=new Map();
function refreshClassroom(){
 const devices=SumaiDevices.list();
 const pots=SumaiPlanters.list();
 const energy=SumaiEnergy.status();
 const rows=$('classroomRows');
 const focused=document.activeElement?.dataset.control;
 rows.replaceChildren();
 function button(label,key,action){
  const b=document.createElement('button');
  b.textContent=label;
  b.dataset.control=key;
  b.onclick=()=>{action();refreshClassroom();};
  return b;
 }
 for(const d of devices){
  const row=document.createElement('div');
  row.className='device-row';
  const label=document.createElement('strong');
  label.textContent=d.name;
  const state=d.kind==='lock'?(d.on?'施錠':'解錠'):d.kind==='shutter'?(d.on?'開':'閉'):d.kind==='bath'?(d.on?'湯はり中':'停止'):d.on?'運転中':'停止';
  const toggle=button(state==='停止'?'停止中':state,d.id,()=>SumaiDevices.setPower(d.id,!d.on));
  toggle.dataset.running=String(d.on);
  const detail=[state,...(['light','fan'].includes(d.kind)&&d.on?['弱中強'[d.level-1]]:[]),...(d.kind==='ac'?[d.mode==='heat'?'暖房':'冷房']:[]),...(d.kind==='camera'?[d.direction+'°']:[])].join('・');
  const previous=previousDeviceStates.get(d.id);
  if(previous!==undefined&&previous!==detail)appendClassroomLog(d.name,detail);
  previousDeviceStates.set(d.id,detail);
  if(['lock','shutter'].includes(d.kind)){
   const current=document.createElement('span');
   current.className='device-current-state';
   current.textContent='現在：'+state;
   current.dataset.running=String(d.on);
   toggle.textContent=d.kind==='lock'?(d.on?'解錠する':'施錠する'):(d.on?'閉める':'開ける');
   toggle.removeAttribute('data-running');
   row.append(label,current,toggle);
  }else row.append(label,toggle);
  if(['light','fan'].includes(d.kind))row.append(button(d.on?'弱中強'[d.level-1]:'弱でつける',d.id+'-level',()=>SumaiDevices.configure(d.id,{level:d.level%3+1})));
  if(d.kind==='camera')row.append(button('向き '+d.direction+'°',d.id+'-direction',()=>SumaiDevices.configure(d.id,{direction:(d.direction+90)%360})));
  if(d.kind==='ac')row.append(button(d.mode==='heat'?'暖房':'冷房',d.id+'-mode',()=>SumaiDevices.configure(d.id,{mode:d.mode==='heat'?'cool':'heat'})));
  rows.append(row);
 }
 for(const p of pots){
  const row=document.createElement('div');
  row.className='device-row';
  const label=document.createElement('strong');
  label.textContent=p.name+' · 水分 '+p.moisture+'%';
  row.append(label,button('水やり',p.id,()=>{if(SumaiPlanters.water(p.id))appendClassroomLog(p.name,'水やり');}));
  rows.append(row);
 }
 for(const id of previousDeviceStates.keys())if(!devices.some(d=>d.id===id))previousDeviceStates.delete(id);
 const percent=Math.max(0,Math.min(100,Math.round(energy.storedWh/energy.capacityWh*100)));
 $('batteryReading').textContent=percent+'%';
 $('batteryAmount').textContent=Math.round(energy.storedWh).toLocaleString('ja-JP')+' / '+energy.capacityWh.toLocaleString('ja-JP')+' Wh';
 $('batteryGauge').value=percent;
 $('solarReading').textContent=Math.round(energy.generation).toLocaleString('ja-JP')+' W';
 $('solarPanels').textContent='パネル '+energy.panels+' / 5 枚';
 $('consumptionReading').textContent=Math.round(energy.load).toLocaleString('ja-JP')+' W';
 if(focused)rows.querySelector('[data-control="'+CSS.escape(focused)+'"]')?.focus({preventScroll:true});
}
const classroomUpdate=update;
update=function(){classroomUpdate();refreshClassroom();};
window.addEventListener('sumai:power',refreshClassroom);
window.addEventListener('sumai:water',refreshClassroom);
setInterval(refreshClassroom,1000);
const classroomDraw=draw;
draw=function(){
 const placing=!!(carrying||grabbing);
 $('connection').hidden=!placing;
 if(placing&&!hover){
  $('connection').textContent='光る接続先まで運んで、離そう';
  $('connection').classList.toggle('invalid',false);
 }
 classroomDraw();
};
loadHouse(model,imported);
SumaiClock.setHour(hour);
