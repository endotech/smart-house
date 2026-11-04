'use strict';
const legacyKinds={LED:'light',door:'lock',TV:'tv',air:'ac',camera:'camera',window:'shutter',custom:'vacuum'};
function runMicrobitCommand(message){
 if(typeof message!=='string'||message.length>128||/[^\x20-\x7e\r\n\t]/.test(message))return 'BAD-COMMAND';
 const lightLevel=message.trim().match(/^L([1-9][0-9]*)([0-3])$/);
 if(lightLevel)message='L:light:'+lightLevel[1]+':'+lightLevel[2];
 const short=message.trim().match(/^A([1-9][0-9]*)$/);
 if(short)message='T:light:'+short[1];
 const air=message.trim().match(/^C:([1-9][0-9]*):([01])$/);
 if(air){
  const device=SumaiDevices.list().find(d=>d.kind==='ac'&&d.number===Number(air[1]));
  if(!device)return 'NO-DEVICE';
  return SumaiDevices.configure(device.id,{mode:air[2]==='1'?'heat':'cool',on:true})?'OK':'REJECTED';
 }
 const parts=message.trim().split(':');
 const [command,kind,index,value]=parts;
 if(command==='W'&&parts.length===2){
  const pot=SumaiPlanters.list()[Number(kind)-1];
  return pot&&SumaiPlanters.water(pot.id)?'OK':'NO-DEVICE';
 }
 const explicit=message.match(/^(LED|door|TV|air|camera|window|custom)-(ON|OFF)$/);
 const hvac=message.match(/^(heat|cold)-(weak|strong)$/);
 const request=message.match(/^REQUEST-(LED|DOOR|TV|AIR|CAMERA|CUSTOM)-STATE$/);
 const targetKind=explicit?legacyKinds[explicit[1]]:hvac?'ac':request?legacyKinds[request[1]==='LED'||request[1]==='TV'?request[1]:request[1].toLowerCase()]:kind;
 const number=explicit||hvac||request?1:Number(index);
 if(!Number.isInteger(number)||number<1)return 'BAD-COMMAND';
 const device=SumaiDevices.list().find(d=>d.kind===targetKind&&d.number===number);
 if(!device)return 'NO-DEVICE';
 if(request){
  if(targetKind==='ac')return device.on?(device.mode==='heat'?'heat':'cold')+'-'+(device.level===1?'weak':'strong'):'air-OFF';
  const prefix={light:'LED',tv:'TV',lock:'door',camera:'camera',vacuum:'custom'}[targetKind];
  return prefix+'-'+((targetKind==='lock'?!device.on:device.on)?'ON':'OFF');
 }
 let patch;
 if(explicit)patch={on:targetKind==='lock'?explicit[2]==='OFF':explicit[2]==='ON'};
 else if(hvac)patch={mode:hvac[1]==='heat'?'heat':'cool',on:true};
 else if(command==='T'&&parts.length===3)patch={on:!device.on};
 else if(command==='P'&&parts.length===4&&['0','1'].includes(value))patch={on:value==='1'};
 else if(command==='L'&&parts.length===4&&/^[0-3]$/.test(value))patch={level:Number(value)};
 else if(command==='D'&&parts.length===4&&/^(0|90|180|270)$/.test(value))patch={direction:Number(value)};
 else if(command==='M'&&parts.length===4&&['cool','heat'].includes(value))patch={mode:value};
 else return 'BAD-COMMAND';
 return SumaiDevices.configure(device.id,patch)?'OK':'REJECTED';
}
const microbitPanel=document.createElement('section');
microbitPanel.innerHTML='<h2>micro:bit</h2><button id="microbitConnect">USBで接続</button><p id="microbitStatus" role="status">未接続</p>';
statuses.after(microbitPanel);
const connectButton=$('microbitConnect');
const encoder=new TextEncoder();
let connection=null;
let unreadTimer;
function reportUnread(command){
 if(unreadTimer)return;
 unreadTimer=setTimeout(()=>{
  unreadTimer=undefined;
  serialStatus('命令を読み取れませんでした');
  appendClassroomLog('USB','命令を読み取れませんでした（'+command.slice(0,128)+'）');
 },350);
}

function serialStatus(message){$('microbitStatus').textContent=message;}
async function readSerial(session){
 const decoder=new TextDecoder();
 let pending='';
 while(!session.stopping){
  const {value,done}=await session.reader.read();
  if(done)break;
  pending+=decoder.decode(value,{stream:true});
  const lines=pending.split('\n');
  pending=lines.pop();
  if(pending.length>1024){pending='';serialStatus('受信データが長すぎます');}
  for(const line of lines){
   if(session.stopping)break;
   const command=line.trim();
   if(!command)continue;
   const result=runMicrobitCommand(command);
   if(result==='BAD-COMMAND'){reportUnread(command);continue;}
   clearTimeout(unreadTimer);unreadTimer=undefined;
   serialStatus('USB接続中');
   if(result==='NO-DEVICE'||result==='REJECTED')appendClassroomLog('USB',command+' · '+(result==='NO-DEVICE'?'対象の機器がありません':'機器を操作できませんでした'));
   if(command.startsWith('REQUEST-'))await session.writer.write(encoder.encode(result+'\n'));
  }
 }
}
function sendMeasurements(){
 const session=connection;
 if(!session||session.stopping||session.measurementPending)return;
 const energy=SumaiEnergy.status();
 const hour=SumaiClock.hour();
 const percent=Math.max(0,Math.min(100,Math.round(energy.storedWh/energy.capacityWh*100)));
 const devices=SumaiDevices.list();
 const kinds=['light','fan','ac','tv','lock','shutter','camera','vacuum','bath','washer','microwave'];
 const states=kinds.map(kind=>{
  let mask=0;
  for(const d of devices)if(d.kind===kind&&d.on&&d.number>=1&&d.number<=16)mask|=1<<(d.number-1);
  return mask.toString(16).padStart(4,'0');
 }).join('');
 session.measurementPending=true;
 session.writer.write(encoder.encode('H'+hour+'\nB'+percent+'\nP'+Math.round(energy.load)+'\nS'+states+'\n'))
  .catch(()=>{}).finally(()=>{session.measurementPending=false;});
}
window.addEventListener('sumai:time',sendMeasurements);
window.addEventListener('sumai:power',sendMeasurements);
setInterval(sendMeasurements,1000);
async function closeSerial(session){
 session.reader.releaseLock();
 session.writer.releaseLock();
 try{await session.port.close();}catch{}
 clearTimeout(unreadTimer);unreadTimer=undefined;
 connection=null;
 connectButton.disabled=false;
 connectButton.textContent='USBで接続';
}
connectButton.onclick=async()=>{
 if(connection){
  connectButton.disabled=true;
  connection.stopping=true;
  try{await connection.reader.cancel();}catch{}
  return;
 }
 if(!navigator.serial){
  serialStatus('USBシリアル対応のChromeやEdgeで開いてください');
  return;
 }
 connectButton.disabled=true;
 let port;
 try{
  port=await navigator.serial.requestPort();
  await port.open({baudRate:115200});
  connection={port,reader:port.readable.getReader(),writer:port.writable.getWriter(),stopping:false};
 }catch(error){
  try{await port?.close();}catch{}
  connectButton.disabled=false;
  serialStatus(error.name==='NotFoundError'?'ポートの選択を取り消しました':'USBで接続できませんでした · '+error.message);
  return;
 }
 const session=connection;
 connectButton.disabled=false;
 connectButton.textContent='USB接続を切る';
 serialStatus('USB接続中');
 sendMeasurements();
 try{await readSerial(session);serialStatus('未接続');}
 catch(error){serialStatus(session.stopping?'未接続':'USB接続が切れました · '+error.message);}
 finally{await closeSerial(session);}
};
