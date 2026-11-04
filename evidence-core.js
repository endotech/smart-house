(function(root){
 'use strict';
 const K=typeof module!=='undefined'?require('./kit-core.js'):root.BlockKit;
 const M=typeof module!=='undefined'?require('./methods-core.js'):root.HouseMethods;
 const F=typeof module!=='undefined'?require('./frame-core.js'):root.HouseFrame;
 const D=typeof module!=='undefined'?require('./comparison-data.js'):root.HouseEvidenceData;

 function equipment(model){
  const counts=new Map();
  for(const part of model.parts)if(D.equipment[part.kind])counts.set(part.kind,(counts.get(part.kind)||0)+1);
  const rows=[];
  for(const [kind,quantity] of counts){
   const item=D.equipment[kind];
   const known=Number.isFinite(item.price);
   const gross=known?item.price*quantity:null;
   const amount=known?Math.round(item.tax==='included'?gross/1.1:gross):null;
   const tax=known?(item.tax==='included'?gross-amount:item.tax==='excluded'?Math.round(amount*.1):0):null;
   rows.push({kind,name:K.specs[kind].name,quantity,unitPrice:item.price,amount,tax,
    total:known?amount+tax:null,model:item.model,source:item.source,basis:item.basis,
    taxBasis:item.tax,checked:D.checked,range:item.range||null});
  }
  return {rows,net:rows.reduce((sum,row)=>sum+(row.amount||0),0),
   tax:rows.reduce((sum,row)=>sum+(row.tax||0),0),
   total:rows.reduce((sum,row)=>sum+(row.total||0),0),
   unpriced:rows.filter(row=>row.amount===null).reduce((sum,row)=>sum+row.quantity,0)};
 }

 function connected(floors){
  if(!floors.length)return false;
  const keys=new Set(floors.map(p=>p.c+','+p.r));
  const seen=new Set(),queue=[floors[0]];
  while(queue.length){
   const p=queue.pop(),key=p.c+','+p.r;
   if(seen.has(key))continue;
   seen.add(key);
   for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const c=p.c+dc,r=p.r+dr;
    if(keys.has(c+','+r)&&!seen.has(c+','+r))queue.push({c,r});
   }
  }
  return seen.size===keys.size;
 }

 function balance(model,level,axis,needed,walls){
  const floors=model.parts.filter(p=>p.kind==='floor'&&p.level===level);
  const coordinate=axis==='x'?'r':'c';
  const lo=Math.min(...floors.map(p=>p[coordinate]));
  const hi=Math.max(...floors.map(p=>p[coordinate]+1));
  const cut=(hi-lo)/4;
  const bands=[[lo,lo+cut],[hi-cut,hi]];
  const sides=bands.map(([a,b])=>{
   const area=floors.reduce((sum,p)=>sum+Math.max(0,Math.min(p[coordinate]+1,b)-Math.max(p[coordinate],a)),0)*.91*.91;
   const required=needed*area/(floors.length*.91*.91);
   const available=walls.filter(w=>w.axis===axis).reduce((sum,w)=>{
    const part=model.parts.find(p=>p.id===w.id);
    return sum+(part&&part[coordinate]>=a-1e-9&&part[coordinate]<=b+1e-9?w.equivalent:0);
   },0);
   return {area,required,available,ratio:required>0?available/required:null};
  });
  const values=sides.map(side=>side.ratio);
  const ratio=values.every(value=>value!==null)&&Math.max(...values)>0?Math.min(...values)/Math.max(...values):0;
  return {sides,ratio,adequate:sides.every(side=>side.ratio!==null&&side.ratio>=1)||ratio>=.5};
 }

 function seismic(model,method=model.method||'timber',selectedLevel=0){
  const unavailable=reason=>({available:false,reason,verified:false,sources:D.sources});
  const nonWood=['steel','rc'].includes(method);
  const floors=model.parts.filter(p=>p.kind==='floor');
  if(!floors.length)return unavailable('床を配置すると必要壁量を計算できます');
  const storeys=Math.max(...floors.map(p=>p.level))+1;
  if(storeys>2)return unavailable('この荷重モデルは平屋・2階建て用です。3階建ては未算定');
  if(!nonWood&&model.parts.some(p=>['post','beam','panel','brace','braceDouble'].includes(p.kind)&&p.material==='金属'))return unavailable('木造の耐力パーツに金属部材が混在しているため未算定');
  for(let level=0;level<storeys;level++){
   if(!connected(floors.filter(p=>p.level===level)))return unavailable('各階の床をひと続きにしてください');
  }
  const exposed=floors.filter(p=>!K.floorAt(model,p.level+1,p.c,p.r)).map(p=>K.stairOpeningAt(model,p.level+1,p.c,p.r)?{...p,level:p.level+1}:p);
  if(exposed.some(p=>!model.parts.some(q=>q.kind==='roof'&&q.level===p.level&&q.c===p.c&&q.r===p.r)))return unavailable('上に床のない部分に屋根を配置すると、屋根重量を含めて計算できます');
  const loads=D.loads;
  const slope={gable:Math.sqrt(1+.43*.43),shed:Math.sqrt(1+.28*.28),flat:1}[model.finishes?.roofShape||'flat'];
  const roofRate=loads.roof[model.finishes?.roof||'metal'];
  const finishRate=loads.wallFinish[model.finishes?.wall||'plaster'];
  const thickness={standard:105,high:105,thick:155}[model.options?.insulation||'standard'];
  const lumps=[];
  const weights=[];
  for(let level=0;level<storeys;level++){
   const storyFloors=floors.filter(p=>p.level===level);
   const roofArea=exposed.filter(p=>p.level===level).length*.91*.91;
   const wallParts=model.parts.filter(p=>M.wallKinds.includes(p.kind)&&p.level===level);
   let wallLoad=0;
   for(const p of wallParts){
    const h=method==='platform'?K.STOREY-K.BASE:K.HEIGHT;
    const opening=p.kind==='window'?1200:p.kind==='door'?2100:0;
    const fullArea=.91*h/1000,opaqueArea=.91*(h-opening)/1000;
    const exterior=K.edgeCells(p).filter(([c,r])=>K.floorAt(model,level,c,r)).length===1;
    const finish=exterior?finishRate:loads.wallInner;
    wallLoad+=fullArea*(method==='rc'&&p.kind==='panel'?0:loads.wallFrame)+opaqueArea*(finish+loads.wallInner+loads.wallInsulation*thickness/105)+.91*opening/1000*loads.window;
   }
   const roofLoad=roofArea*(roofRate*slope+loads.roofFrame+loads.ceiling+loads.roofInsulation);
   const solarLoad=model.parts.filter(p=>p.kind==='solar'&&p.level===level).length*.77*.77*loads.solar;
   const floorLoad=storyFloors.reduce((sum,p)=>sum+((loads.floorFinish[p.finish]||loads.floor)+loads.floorBeams+loads.ceiling+loads.live)*.91*.91,0);
   const balconyLoad=model.parts.filter(p=>p.kind==='balcony'&&p.level===level).length*.91*.91*loads.balcony;
   lumps.push({roof:roofLoad,solar:solarLoad,wall:wallLoad,floor:floorLoad,balcony:balconyLoad});
  }
  if(nonWood){
   const structural=F.mass(model,method);
   for(let i=0;i<lumps.length;i++){
    const a=structural[i];
    lumps[i].wall+=a.columns+a.walls;
    lumps[i].roof+=a.beams+a.roof-exposed.filter(p=>p.level===i).length*.91*.91*loads.roofFrame;
    lumps[i].floor+=a.floor-floors.filter(p=>p.level===i).length*.91*.91*loads.floorBeams;
    lumps[i].structural=a;
   }
  }
  // A story resists its roof, half the walls above and below its upper diaphragm,
  // and the next floor. The ground floor slab and its imposed load are not added.
  for(let level=0;level<storeys;level++){
   const own=lumps[level],above=lumps[level+1];
   const weight=(own.roof+own.solar+.5*own.wall+(above?.wall||0)*.5+(above?.floor||0)+(above?.balcony||0))/1000;
   weights.push(weight);
  }
  const totalWeight=weights.reduce((sum,value)=>sum+value,0);
  const depth=(Math.max(...floors.map(p=>p.r+1))-Math.min(...floors.map(p=>p.r)))*.91;
  const roofHeight=model.finishes?.roofShape==='gable'?depth*.43/2:model.finishes?.roofShape==='shed'?depth*.28:0;
  const height=storeys*K.STOREY/1000+roofHeight,T=(nonWood?(method==='steel'?.03:.02):.03)*height;
  const rows=weights.map((weight,level)=>{
   const supportedWeight=weights.slice(level).reduce((sum,value)=>sum+value,0);
   const alpha=supportedWeight/totalWeight;
   const Ai=1+(1/Math.sqrt(alpha)-alpha)*2*T/(1+3*T);
   const force=.2*Ai*supportedWeight;
   const required=force/1.96;
   const actual=M.evaluate(model,method,level);
   const directions={};
   for(const axis of ['x','z']){
    const available=actual.directions[axis].equivalent;
    directions[axis]={available,capacity:available*1.96,required,required15:required*1.5,
     ratio:available/required,ratio15:available/(required*1.5),
     balance:balance(model,level,axis,required,actual.walls)};
   }
   return {level,weight,supportedWeight,Ai,force,required,directions,unframed:actual.unframed};
  });
  if(nonWood){
   const frame=F.analyze(model,method,rows);
   return {...frame,selected:frame.available?frame.rows.find(row=>row.level===selectedLevel)||null:null,totalWeight,height,T,C0:.2,loads:lumps,sources:{...D.sources,...frame.sources}};
  }
  return {available:true,type:'wall',verified:false,rows,selected:rows.find(row=>row.level===selectedLevel)||null,
   totalWeight,height,T,C0:.2,loads:lumps,sources:D.sources,
   assumptions:'住宅・非多雪・C0=0.2の教材モデル。壁倍率は登録仕様を施工した想定。屋根・床・壁の法令荷重に、断熱材等の初期値を加算。小屋組200N/m²、開口部400N/m²、バルコニー1000N/m²、塗り壁はモルタル、レンガ調外壁とタイル床は20mmの仕上げを仮定。積載荷重600N/m²に家具・家電を含め、重複加算しない。',
   limitations:'必要壁量と四分割法の条件付き比較。地域・地盤・積雪・接合部・床の水平構面・柱梁の許容応力度・基礎は未照査。1.5倍欄は地震力を増やした比較で、耐震等級3の認定ではない。'};
 }
 const api={equipment,seismic,data:D,frame:F};
 if(typeof module!=='undefined')module.exports=api;
 else root.HouseEvidence=api;
})(globalThis);
