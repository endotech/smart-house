(function(root){
'use strict';
const UNIT=910,STOREY=3045,BASE=105,HEIGHT=2730;
const furniture={
 vegetable:{name:'野菜プランター',category:'設備',icon:'♧',color:'#a26e50',w:660,d:420,h:650,plant:true},
 flower:{name:'花プランター',category:'設備',icon:'✿',color:'#b97868',w:660,d:420,h:650,plant:true},

 lock:{name:'スマートロック',category:'設備',icon:'▣',color:'#5b666c',w:160,d:100,h:220,mount:'door'},
 light:{name:'室内照明',category:'家電',icon:'☀',color:'#e9e5d9',w:540,d:540,h:90,mount:'ceiling'},
 camera:{name:'防犯カメラ',category:'家電',icon:'◉',color:'#dbe1e2',w:290,d:200,h:145,mount:'ceiling'},
 fan:{name:'扇風機',category:'家電',icon:'✣',color:'#83a1a9',w:420,d:360,h:900},
 solar:{name:'太陽光パネル',category:'設備',icon:'▦',color:'#354c75',w:770,d:770,h:45,mount:'roof'},
 shutter:{name:'シャッター',category:'設備',icon:'▤',color:'#92999b',w:650,d:95,h:1200,mount:'window'},

 stairs:{name:'直階段',category:'設備',icon:'▱',color:'#ad8d68',w:720,d:3300,h:3045,shape:'stairs'},

 bed:{name:'シングルベッド',category:'家具',icon:'▰',color:'#7797ae',w:1000,d:1950,h:720,shape:'bed'},
 kitchen:{name:'キッチン',category:'設備',icon:'▤',color:'#a6aaa6',w:2400,d:650,h:850,shape:'kitchen'},
 toilet:{name:'トイレ',category:'設備',icon:'◉',color:'#edf0eb',w:410,d:730,h:790,shape:'toilet'},
 bath:{name:'浴槽',category:'設備',icon:'▣',color:'#edf0eb',w:1500,d:750,h:570,shape:'bath'},
 tv:{name:'テレビ',category:'家電',icon:'▣',color:'#354454',w:1100,d:380,h:920,shape:'tv'},
 ac:{name:'エアコン（壁掛け）',category:'家電',icon:'▱',color:'#e9eded',w:800,d:240,h:300,shape:'ac'},
 fridge:{name:'冷蔵庫',category:'家電',icon:'▥',color:'#aeb8bc',w:650,d:700,h:1750,shape:'fridge'},
 washer:{name:'洗濯機',category:'家電',icon:'◉',color:'#dae0e0',w:640,d:640,h:1000,shape:'washer'},
 microwave:{name:'電子レンジ＋台',category:'家電',icon:'▣',color:'#666f79',w:550,d:500,h:1130,shape:'microwave'},
 vacuum:{name:'ロボット掃除機',category:'家電',icon:'●',color:'#434d55',w:350,d:350,h:95},

 sofa:{name:'ソファ（布張り）',category:'家具',icon:'▰',color:'#738dba',w:1700,d:790,h:820,shape:'sofa'},
 leatherSofa:{name:'ソファ（革張り）',category:'家具',icon:'▰',color:'#8b513d',w:1700,d:790,h:820,shape:'sofa'},
 desk:{name:'デスク',category:'家具',icon:'▤',color:'#85715f',w:840,d:540,h:740,shape:'table'},
 cabinet:{name:'キャビネット',category:'家具',icon:'▥',color:'#eee5d4',w:820,d:460,h:920,shape:'cabinet'},
 modernChair:{name:'椅子（モダン）',category:'家具',icon:'♧',color:'#d59653',w:460,d:460,h:780,shape:'chair'},
 chair:{name:'椅子',category:'家具',icon:'♧',color:'#648c80',w:460,d:460,h:880},
 table:{name:'テーブル',category:'家具',icon:'▤',color:'#a87550',w:790,d:790,h:720},
 shelf:{name:'収納棚',category:'家具',icon:'▥',color:'#b38557',w:820,d:420,h:1150}
};
const isFurniture=kind=>Object.hasOwn(furniture,kind);
const isCell=kind=>isFurniture(kind)||['floor','floor2','roof','balcony'].includes(kind);
const specs={...furniture,balcony:{name:'バルコニー',category:'床',icon:'▤',color:'#aac5ad'},braceDouble:{name:'筋かい2本の壁',category:'壁',icon:'╳',color:'#bcaa84'},panel:{name:'構造用合板の壁',category:'壁',icon:'▥',color:'#c5b585'},brace:{name:'筋かい1本の壁',category:'壁',icon:'╳',color:'#c0b18c'},floor:{name:'床 1マス',category:'床',icon:'▱',color:'#dfc7a0'},floor2:{name:'床 2マス',category:'床',icon:'▱▱',color:'#dfc7a0'},wall:{name:'壁',category:'壁',icon:'▥',color:'#efe8d5'},window:{name:'窓のある壁',category:'壁',icon:'▦',color:'#a8cdd1'},door:{name:'入口のある壁',category:'壁',icon:'▯',color:'#c19a70'},frame:{name:'柱＋梁セット',category:'軸',icon:'Π',color:'#c49b66'},post:{name:'柱',category:'軸',icon:'┃',color:'#c49b66'},beam:{name:'梁',category:'軸',icon:'━',color:'#c49b66'},roof:{name:'屋根 1マス',category:'屋根',icon:'▰',color:'#719083'}};
const key=p=>isCell(p.kind)?`${isFurniture(p.kind)&&!furniture[p.kind].mount?'furniture':p.kind}:${p.level}:${p.c}:${p.r}`:p.kind==='post'?`post:${p.level}:${p.c}:${p.r}`:`${['wall','window','door','brace','braceDouble','panel'].includes(p.kind)?'wall':p.kind}:${p.level}:${p.c}:${p.r}:${p.axis}`;
function empty(){return {format:'sumai-blocks',version:2,name:'わたしのブロックハウス',parts:[]};}
function floorAt(model,l,c,r){return model.parts.some(p=>p.kind==='floor'&&p.level===l&&p.c===c&&p.r===r);}
function edgeCells(t){return t.axis==='x'?[[t.c,t.r-1],[t.c,t.r]]:[[t.c-1,t.r],[t.c,t.r]];}
function nodeCells(t){return [[t.c-1,t.r-1],[t.c-1,t.r],[t.c,t.r-1],[t.c,t.r]];}
function ends(t){return [{c:t.c,r:t.r},{c:t.c+(t.axis==='x'?1:0),r:t.r+(t.axis==='z'?1:0)}];}
function furnitureSize(p){
 const spec=furniture[p.kind];
 return {...spec,w:p.compact?850:spec.w,d:p.compact?760:spec.d};
}
function furnitureBounds(p){
 const {w,d}=furnitureSize(p), turned=(p.rotation??0)%180!==0;
 const width=turned?d:w, depth=turned?w:d;
 const x=p.c*UNIT+Math.ceil(width/UNIT)*UNIT/2+(p.offsetX||0);
 const z=p.r*UNIT+Math.ceil(depth/UNIT)*UNIT/2+(p.offsetZ||0);
 return {x,z,left:x-width/2,right:x+width/2,near:z-depth/2,far:z+depth/2};
}
function stairOpeningAt(model,level,c,r){
 if(level<1||floorAt(model,level,c,r))return false;
 if(![[-1,0],[1,0],[0,-1],[0,1]].some(([dc,dr])=>floorAt(model,level,c+dc,r+dr)))return false;
 const cell={left:c*UNIT,right:(c+1)*UNIT,near:r*UNIT,far:(r+1)*UNIT};
 return model.parts.some(p=>p.kind==='stairs'&&p.level===level-1&&overlaps(cell,furnitureBounds(p)));
}
function wallBounds(p){
 const g=geometry(p),thickness=180;
 return {left:g.x-(p.axis==='x'?UNIT:thickness)/2,right:g.x+(p.axis==='x'?UNIT:thickness)/2,
  near:g.z-(p.axis==='z'?UNIT:thickness)/2,far:g.z+(p.axis==='z'?UNIT:thickness)/2};
}
const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.near<b.far&&a.far>b.near;
function deviceMount(model,p){
 const mount=furniture[p.kind]?.mount;
 if(mount==='door'||mount==='window'){
  return model.parts.find(part=>part.kind===mount&&part.level===p.level&&edgeCells(part).some(([c,r])=>c===p.c&&r===p.r));
 }
 if(mount==='roof')return model.parts.find(part=>part.kind==='roof'&&part.level===p.level&&part.c===p.c&&part.r===p.r);
 return null;
}
function furnitureError(model,p,ignore){
 for(const field of ['offsetX','offsetZ'])if(p[field]!==undefined&&(!Number.isInteger(p[field])||Math.abs(p[field])>200))return '家具の微調整は200mm以内です';
 if(![0,90,180,270].includes(p.rotation??0))return '向きは90°ずつ変更できます';
 const mount=furniture[p.kind].mount;
 if(mount==='door'||mount==='window'||mount==='roof'){
  const fixture=deviceMount(model,p);
  if(!fixture)return {door:'ドアに隣接する床へ',window:'窓に隣接する床へ',roof:'屋根のあるマスへ'}[mount];
  if(p.kind==='lock'&&!p.id&&model.parts.some(q=>q.kind==='lock'&&q.id!==ignore&&q.id!==key(p)&&deviceMount(model,q)===fixture))return 'このドアにはスマートロックが付いています';
  return '';
 }
 if(mount==='ceiling')return floorAt(model,p.level,p.c,p.r)?'':'室内床の上に置こう';
 const b=furnitureBounds(p);
 for(let c=Math.floor(b.left/UNIT);c<Math.ceil(b.right/UNIT);c++)
  for(let r=Math.floor(b.near/UNIT);r<Math.ceil(b.far/UNIT);r++)
   if(!floorAt(model,p.level,c,r)&&!(furniture[p.kind].plant&&model.parts.some(q=>q.kind==='balcony'&&q.level===p.level&&q.c===c&&q.r===r)))
    return furniture[p.kind].plant?'床またはバルコニーに置こう':'全体が同じ階の室内床に収まる場所へ';
 for(const part of model.parts){
  if(part.id===ignore||part.level!==p.level)continue;
  if(isFurniture(part.kind)&&!furniture[part.kind].mount&&(part.c===p.c&&part.r===p.r||overlaps(b,furnitureBounds(part))))return 'ほかの家具・設備と重なります';
  if(!p.legacy&&specs[part.kind].category==='壁'&&overlaps(b,wallBounds(part)))return '壁や開口部と重なります';
 }
 return '';
}
function allowed(model,kind,t,rotation=t.rotation??0,ignore=t.id){
 if(!Object.hasOwn(specs,kind))return '登録されていない部材です';
 if(kind==="solar"&&!model.parts.some(p=>p.kind==="solar"&&p.id===ignore)&&model.parts.filter(p=>p.kind==="solar").length>=5)return "太陽光パネルは5枚までです";
if(!Number.isInteger(t.level)||t.level<0||t.level>2||!Number.isInteger(t.c)||!Number.isInteger(t.r)||Math.abs(t.c)>15||Math.abs(t.r)>15)return '組み立て範囲の外です';
if(kind==='floor'||kind==='floor2'){const cells=[[t.c,t.r]];if(kind==='floor2')cells.push([t.c+(rotation%180===0?1:0),t.r+(rotation%180?1:0)]);if(cells.some(([c,r])=>model.parts.some(p=>p.kind==='balcony'&&p.level===t.level&&p.c===c&&p.r===r)))return '先にバルコニーをはずそう';if(cells.some(([c,r])=>Math.abs(c)>15||Math.abs(r)>15))return '組み立て範囲の外です';if(t.level&&cells.some(([c,r])=>!floorAt(model,t.level-1,c,r)))return '下の階に床のある場所へ置こう';return '';}
if(isFurniture(kind))return furnitureError(model,{...t,kind,rotation},ignore);
if(specs[kind]?.category==='壁'&&model.parts.some(p=>p.level===t.level&&isFurniture(p.kind)&&!furniture[p.kind].mount&&!p.legacy&&overlaps(furnitureBounds(p),wallBounds(t))))return '先に重なる家具・設備を動かそう';
if(kind==='balcony'){
 if(!t.level)return '2階以上を選ぼう';
 if(floorAt(model,t.level,t.c,t.r))return '室内の床と重ならない場所へ';
 return [[-1,0],[1,0],[0,-1],[0,1]].some(([dc,dr])=>floorAt(model,t.level,t.c+dc,t.r+dr))?'':'同じ階の床の外側へつなごう';
}
if(kind==='roof')return floorAt(model,t.level,t.c,t.r)||stairOpeningAt(model,t.level,t.c,t.r)?'':'先にこのマスに床を置こう';
if(kind==='post')return nodeCells(t).some(([c,r])=>floorAt(model,t.level,c,r)||model.parts.some(p=>p.kind==='balcony'&&p.level===t.level+1&&p.c===c&&p.r===r))?'':'床の角に柱を置こう';
if(!['x','z'].includes(t.axis))return '床の辺を選ぼう';
if(!edgeCells(t).some(([c,r])=>floorAt(model,t.level,c,r)))return '先に床を置いて、その辺を選ぼう';
if(kind==='beam'&&ends(t).some(v=>!model.parts.some(p=>p.kind==='post'&&p.level===t.level&&p.c===v.c&&p.r===v.r)))return '両端に柱を置こう。「柱＋梁セット」なら一緒に置けます';
return '';
}
function place(model,kind,t,rotation=0,material='木材',timber='sugi'){
const error=allowed(model,kind,t,rotation);if(error)return {ok:false,error};
const put=(k,c=t.c,r=t.r,axis=t.axis)=>{const p={kind:k,level:t.level,c,r,axis:(isCell(k)||k==='post')?null:axis,material};if(isFurniture(k)){p.rotation=rotation;p.sized=true;for(const field of ['offsetX','offsetZ'])if(t[field])p[field]=t[field];if(t.compact)p.compact=true;}
if(k==='post'||k==='beam')p.timber=timber==='hinoki'?'hinoki':'sugi';p.id=key(p);const i=model.parts.findIndex(v=>key(v)===p.id);if(i>=0){if(model.parts[i].kind===k&&model.parts[i].material===material&&model.parts[i].timber===p.timber&&model.parts[i].rotation===p.rotation&&(model.parts[i].offsetX||0)===(p.offsetX||0)&&(model.parts[i].offsetZ||0)===(p.offsetZ||0))return;model.parts[i]=p;}else model.parts.push(p);};
if(model.parts.length>2500)return {ok:false,error:'部材が多くなりました。別の作品に分けてください'};
if(kind==='frame'){for(const v of ends(t))put('post',v.c,v.r);put('beam');}else if(model.method!=='platform'&&['brace','braceDouble','panel'].includes(kind)){for(const v of ends(t))if(!model.parts.some(p=>p.kind==='post'&&p.level===t.level&&p.c===v.c&&p.r===v.r))put('post',v.c,v.r);if(!model.parts.some(p=>p.kind==='beam'&&p.level===t.level&&p.c===t.c&&p.r===t.r&&p.axis===t.axis))put('beam');put(kind);}else if(kind==='floor2'){put('floor');put('floor',t.c+(rotation%180===0?1:0),t.r+(rotation%180?1:0));}else put(kind);
return {ok:true};
}
function remove(model,id){const p=model.parts.find(p=>p.id===id);if(!p)return;model.parts=model.parts.filter(v=>v.id!==id);
// Keep attachments consistent when a floor tile or post is removed.
let changed=true;while(changed){const before=model.parts.length;model.parts=model.parts.filter(v=>!allowed(model,v.kind,v));changed=before!==model.parts.length;}
}
function geometry(p){const y=p.level*STOREY;
if(isFurniture(p.kind)){
 const {w,d,h}=furnitureSize(p),{x,z}=furnitureBounds(p);
 return {x,y:y+BASE+(p.kind==='ac'?2050:0),z,w,d,h};
}
if(['floor','balcony'].includes(p.kind))return {x:(p.c+.5)*UNIT,y,z:(p.r+.5)*UNIT,w:UNIT,h:BASE,d:UNIT};
if(p.kind==='roof')return {x:(p.c+.5)*UNIT,y:y+STOREY,z:(p.r+.5)*UNIT,w:UNIT,h:145,d:UNIT};
if(p.kind==='post')return {x:p.c*UNIT,y:y+BASE,z:p.r*UNIT,w:105,h:HEIGHT,d:105};
const edge={x:(p.c+(p.axis==='x'?.5:0))*UNIT,z:(p.r+(p.axis==='z'?.5:0))*UNIT};
return {...edge,y:y+(p.kind==='beam'?BASE+HEIGHT:BASE),w:p.axis==='x'?UNIT:105,h:p.kind==='beam'?210:HEIGHT,d:p.axis==='z'?UNIT:105};
}
function validate(raw){if(!raw||raw.format!=='sumai-blocks'||raw.version!==2||typeof raw.name!=='string'||raw.name.length>100||!Array.isArray(raw.parts)||raw.parts.length>2600)throw Error('ブロックハウスの保存データを選んでください');const ids=new Set();const model={format:'sumai-blocks',version:2,name:raw.name,parts:raw.parts.map(p=>{if(!p||!Object.hasOwn(specs,p.kind)||['frame','floor2'].includes(p.kind)||!Number.isInteger(p.c)||!Number.isInteger(p.r)||Math.abs(p.c)>15||Math.abs(p.r)>15||!Number.isInteger(p.level)||p.level<0||p.level>2||!['木材','金属'].includes(p.material)||(!(isCell(p.kind)||p.kind==='post')&&!['x','z'].includes(p.axis)))throw Error('部材の形式が正しくありません');const clean={kind:p.kind,level:p.level,c:p.c,r:p.r,axis:(isCell(p.kind)||p.kind==='post')?null:p.axis,material:p.material};if(isFurniture(p.kind)){clean.rotation=p.rotation??0;clean.sized=true;for(const field of ['offsetX','offsetZ'])if(p[field]!==undefined){if(!Number.isInteger(p[field])||Math.abs(p[field])>200)throw Error('家具の微調整が正しくありません');if(p[field])clean[field]=p[field];}if((p.compact||!p.sized)&&['sofa','leatherSofa'].includes(p.kind))clean.compact=true;if(p.legacy||!p.sized)clean.legacy=true;if(![0,90,180,270].includes(clean.rotation))throw Error('家具の向きが正しくありません');}if(p.timber!==undefined){if(!['sugi','hinoki'].includes(p.timber))throw Error('木材の種類が正しくありません');clean.timber=p.timber;}if(p.kind==='floor'&&Object.hasOwn(finishes.floors,p.finish))clean.finish=p.finish;if(p.kind==='floor'&&Object.hasOwn(finishes.wallpapers,p.wallpaper))clean.wallpaper=p.wallpaper;clean.id=key(clean);if(ids.has(clean.id))throw Error('同じ場所の部材が重複しています');ids.add(clean.id);return clean;})};for(const p of model.parts)if(!p.legacy&&allowed(model,p.kind,p))throw Error('接続先の床や柱が不足しています');
if(raw.method!==undefined){if(!['timber','platform','wpc','steel','rc'].includes(raw.method))throw Error('工法が正しくありません');model.method=raw.method==='wpc'?'timber':raw.method;}
if(raw.structural!==undefined){
 const choices={steelColumn:['small','large'],steelBeam:['small','large'],steelJoint:['rigid','pinned'],steelBase:['fixed','pinned'],steelBrace:['rod16','rod20'],steelBolts:['two','four'],rcColumn:['small','large'],rcBeam:['small','large'],rcFc:['24','30'],rcJoint:['continuous','straight','unconfirmed'],rcSlab:['150','180'],rcWall:['180','200']};
 if(!raw.structural||typeof raw.structural!=='object'||Array.isArray(raw.structural))throw Error('構造仕様が正しくありません');
 model.structural={};for(const [key,value] of Object.entries(raw.structural)){if(!Object.hasOwn(choices,key)||!choices[key].includes(value))throw Error('構造仕様の選択が正しくありません');model.structural[key]=value;}
}
if(raw.options!==undefined){const o=raw.options;if(!o||typeof o!=='object'||Array.isArray(o)||!['standard','high','thick'].includes(o.insulation)||!['none','four','eight'].includes(o.damper))throw Error('断熱・制震仕様が正しくありません');model.options={insulation:o.insulation,damper:o.damper};}
if(raw.evaluation!==undefined){const e=raw.evaluation;if(!e||typeof e!=='object'||Array.isArray(e))throw Error('評価条件の形式が正しくありません');const clean={prices:{}};for(const k of ['priceBasis','priceDate','basis','direction']){if(e[k]!==undefined){if(typeof e[k]!=='string'||e[k].length>1200)throw Error('評価条件の文字数が多すぎます');clean[k]=e[k];}}for(const k of ['weight','coefficient','stiffness','capacity']){if(e[k]!==undefined&&e[k]!==null){if(!Number.isFinite(e[k])||e[k]<0||e[k]>1e9)throw Error('評価条件の数値が正しくありません');clean[k]=e[k];}}if(e.prices){for(const [k,v] of Object.entries(e.prices)){if(!/^(floor|wall|window|door|brace|braceDouble|panel|post|beam|roof)\|(木材|金属)$/.test(k)||!(v===null||(Number.isFinite(v)&&v>=0&&v<=1e9)))throw Error('単価の形式が正しくありません');clean.prices[k]=v;}}model.evaluation=clean;}
if(raw.finishes&&typeof raw.finishes==='object'){
 model.finishes={};
 for(const [field,catalog] of Object.entries({wall:finishes.walls,roof:finishes.roofs,roofShape:finishes.roofShapes,wallColor:finishes.colors,roofColor:finishes.colors})){
  if(Object.hasOwn(catalog,raw.finishes[field]))model.finishes[field]=raw.finishes[field];
 }
}
return model;}
function sample(full=true){const m=empty();m.name=full?'完成見本｜窓のある平屋':'はじめの床｜3 × 2マス';const w=full?6:3,d=full?4:2;
const c0=full?-3:-1,r0=full?-2:-1;
for(let c=c0;c<c0+w;c++)for(let r=r0;r<r0+d;r++)place(m,'floor',{level:0,c,r});
if(full){for(let c=c0;c<c0+w;c++)for(const r of [r0,r0+d]){const t={level:0,c,r,axis:'x'};place(m,'frame',t);place(m,r===r0+d&&c===-2?'door':c%2===0?'window':'panel',t);}for(let r=r0;r<r0+d;r++)for(const c of [c0,c0+w]){const t={level:0,c,r,axis:'z'};place(m,'frame',t);place(m,r%2===0?'window':'panel',t);}for(let c=c0;c<c0+w;c++)for(let r=r0;r<r0+d;r++)place(m,'roof',{level:0,c,r});}
return m;}
function furnishedSample(advanced=false){
 const m=empty();
 m.name=advanced?'発展見本｜バルコニーのある二階建て':'完成見本｜家具のある平屋';
 m.method='timber';
 function add(kind,level,c,r,axis=null,rotation=0){
  const result=place(m,kind,{level,c,r,axis},rotation);
  if(!result.ok)throw Error(kind+' '+level+':'+c+':'+r+' '+result.error);
 }
 function floors(level,c0,c1,r0,r1){
  for(let c=c0;c<c1;c++)for(let r=r0;r<r1;r++)add('floor',level,c,r);
 }
 function wallRun(level,axis,fixed,start,end,openings={}){
  for(let i=start;i<end;i++){
   const [c,r]=axis==='x'?[i,fixed]:[fixed,i];
   add('frame',level,c,r,axis);
   add(openings[i]??'wall',level,c,r,axis);
  }
 }
 const width=advanced?15:13;
 floors(0,0,width,0,10);
 wallRun(0,'x',0,0,width,{0:'panel',2:'window',4:'window',8:'panel',10:'window',12:'panel'});
 wallRun(0,'x',10,0,width,{0:'panel',2:'window',5:'panel',7:'window',9:'panel',11:'window',12:'panel'});
 wallRun(0,'z',0,0,10,{0:'panel',2:'window',5:'door',7:'window',9:'panel'});
 wallRun(0,'z',width,0,10,{0:'panel',2:'window',7:'window',9:'panel'});
 wallRun(0,'x',5,0,width,{3:'door',9:'door',...(advanced?{13:'door',14:'door'}:{})});
 wallRun(0,'x',6,0,width,{2:'door',7:'door',11:'door'});
 wallRun(0,'z',8,0,5);
 wallRun(0,'z',6,6,10);
 wallRun(0,'z',10,6,10);
 if(advanced)wallRun(0,'z',13,0,5);
 add('sofa',0,1,1,null,90);
 add('tv',0,5,1,null,90);
 add('table',0,advanced?2:3,advanced?3:2);
 add('bed',0,10,0);
 add('shelf',0,12,1,null,90);
 add('kitchen',0,0,9,null,180);
 add('fridge',0,4,9,null,180);
 add('microwave',0,5,9,null,180);
 add('bath',0,6,8);
 add('washer',0,9,9);
 add('toilet',0,11,8,null,180);
 if(advanced){
  add('stairs',0,13,1,null,180);
  floors(1,4,15,0,6);
  for(let r=1;r<=4;r++)remove(m,key({kind:'floor',level:1,c:13,r}));
  wallRun(1,'x',0,4,15,{4:'panel',6:'window',8:'panel',10:'window',14:'panel'});
  wallRun(1,'x',6,4,15,{4:'panel',6:'window',8:'door',10:'panel',12:'window',14:'panel'});
  wallRun(1,'z',4,0,6,{0:'panel',2:'window',5:'panel'});
  wallRun(1,'z',15,0,6,{0:'panel',2:'window',5:'panel'});
  wallRun(1,'z',9,0,5,{3:'door'});
  add('bed',1,5,0);
  add('desk',1,10,0);
  add('modernChair',1,10,1);
  add('shelf',1,11,0);
  for(let c=7;c<=9;c++)add('balcony',1,c,6);
  for(let c=7;c<=10;c++)add('post',0,c,7);
  // Carry upper columns down without adding partitions across the hall.
  for(const p of m.parts.filter(p=>p.kind==='post'&&p.level===1))add('post',0,p.c,p.r);
  // Use stacked bearing walls where a ground-floor partition already exists.
  // Above openings or open rooms use infill walls carried by the frame instead.
  for(const p of m.parts.filter(p=>p.kind==='panel'&&p.level===1)){
   const below=m.parts.find(q=>specs[q.kind].category==='壁'&&q.level===0&&q.c===p.c&&q.r===p.r&&q.axis===p.axis);
   if(below?.kind==='panel')continue;
   if(below?.kind==='wall')add('panel',0,p.c,p.r,p.axis);
   else add('wall',1,p.c,p.r,p.axis);
  }

 }
 for(const p of [...m.parts]){
  if(p.kind!=='floor'||floorAt(m,p.level+1,p.c,p.r))continue;
  if(stairOpeningAt(m,p.level+1,p.c,p.r)){add('roof',p.level+1,p.c,p.r);continue;}
  add('roof',p.level,p.c,p.r);
 }
 return validate(m);
}
const finishes={
 wallpapers:{ivory:['アイボリー','#f0e7d5'],sage:['セージ','#acbca1'],blue:['淡いブルー','#a9c3d2'],rose:['くすみピンク','#d4aaa6']},
 floors:{oak:'オーク',walnut:'ウォルナット',tile:'石目タイル',tatami:'畳'},
 walls:{plaster:'塗り壁',wood:'木板張り',brick:'レンガ調'},
 roofShapes:{flat:'平屋根',gable:'切妻',shed:'片流れ'},
 roofs:{metal:'金属板',tile:'瓦調',slate:'スレート調'},
 colors:{sand:'#e9e1cf',white:'#f3f1eb',gray:'#a9b0af',charcoal:'#525b60',brown:'#9c6951',green:'#65796b'}
};
function roomFloors(model,start){
 const floors=new Map(model.parts.filter(p=>p.kind==='floor'&&p.level===start.level).map(p=>[p.c+','+p.r,p]));
 const walls=new Set(model.parts.filter(p=>specs[p.kind].category==='壁'&&p.level===start.level).map(key));
 const pending=[start],seen=new Set(),room=[];
 while(pending.length){
  const {c,r}=pending.pop(),id=c+','+r;
  if(seen.has(id)||!floors.has(id))continue;
  seen.add(id);
  room.push(floors.get(id));
  for(const [dc,dr] of [[-1,0],[1,0],[0,-1],[0,1]]){
   const edge={kind:'wall',level:start.level,c:c+Math.max(0,dc),r:r+Math.max(0,dr),axis:dc?'z':'x'};
   if(!walls.has(key(edge)))pending.push({c:c+dc,r:r+dr});
  }
 }
 return room;
}
const api={stairOpeningAt,deviceMount,finishes,roomFloors,furnitureBounds,isCell,isFurniture,UNIT,STOREY,BASE,HEIGHT,specs,key,empty,floorAt,edgeCells,nodeCells,ends,allowed,place,remove,geometry,validate,sample,furnishedSample};if(typeof module!=='undefined')module.exports=api;else root.BlockKit=api;
})(globalThis);
