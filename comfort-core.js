(function(root){
'use strict';const K=typeof module!=='undefined'?require('./kit-core.js'):root.BlockKit,M=typeof module!=='undefined'?require('./methods-core.js'):root.HouseMethods;
const E=typeof module!=='undefined'?require('./evidence-core.js'):root.HouseEvidence;
const scenarios={
 steel:{post:18000,beam:14500,panel:11000,slabPerM2:19000,foundationFactor:1.2,depth:150},
 rc:{post:28000,beam:22000,panel:24000,slabPerM2:28000,foundationFactor:1.5,depth:180}
};
const catalog={id:'four-structure-classroom',scenarios,target:{grade:3,budget:25000000},insulationSource:'https://www.isover.co.jp/documents/solutionguide/solution-guide-2024.pdf',damperSource:'https://www.sumitomoriko.co.jp/ri200/themes/srk/pdf/product/TRCDamper_wood.pdf',insulations:{standard:{name:'標準・105 mm',thickness:105,lambda:.038,resistance:2.8,designYenPerTsubo:9700,sku:'IS38105L435',color:'#edda96'},high:{name:'高性能・105 mm',thickness:105,lambda:.035,resistance:3,designYenPerTsubo:15800,sku:'IS35105L435',color:'#ddc077'},thick:{name:'厚め・155 mm',thickness:155,lambda:.038,resistance:4.1,designYenPerTsubo:14200,sku:'IS38155A435',color:'#d7c29c'}},dampers:{none:{name:'なし',count:0},four:{name:'4か所を検討',count:4},eight:{name:'8か所を検討',count:8}},costScenario:{name:'教材用想定費用。市場価格・見積ではない。',foundationPerM2:22000,constructionPerM2:90000,exteriorPerM2:18000,windowEach:100000,doorEach:180000,design:1200000,temporary:800000,damperEach:120000,furringPerM2PerMm:30,tax:.1,reserve:.1}};
function options(model){return {insulation:model.options?.insulation||'standard',damper:model.options?.damper||'none'};}
function opaqueArea(p,method){const h=method==='platform'?K.STOREY-K.BASE:K.HEIGHT;return K.UNIT/1000*Math.max(0,h-(p.kind==='window'?1200:p.kind==='door'?2100:0))/1000;}
function damperPositions(model,method,requested){const candidates=model.parts.filter(p=>['wall','panel'].includes(p.kind)&&(method==='platform'||model.parts.some(v=>v.kind==='beam'&&v.level===p.level&&v.c===p.c&&v.r===p.r&&v.axis===p.axis))).map(p=>({...p}));const result=[];let axes=['x','z'];for(let n=0;n<requested;n++){const axis=axes[n%2],pool=candidates.filter(p=>p.axis===axis&&!result.some(q=>q.id===p.id));if(!pool.length)continue;pool.sort((a,b)=>{const score=p=>result.length?Math.min(...result.map(q=>Math.hypot(p.c-q.c,p.r-q.r)+Math.abs(p.level-q.level)*3)):Math.hypot(p.c,p.r);return score(b)-score(a)||a.id.localeCompare(b.id);});result.push(pool[0]);}return result;}
function strength(seismic){
 const pending=reason=>({label:'強さを計算できません',tone:'pending',score:null,issues:[],hint:reason||'床・壁・柱梁・屋根をそろえよう。'});
 if(!seismic.available||!seismic.rows?.length)return pending(seismic.reason);
 let score=Infinity,weakest=null;
 const issues=[];
 for(const row of seismic.rows){
  if(seismic.type!=='frame'&&row.unframed)issues.push({score:.99,level:row.level,cause:'骨組み不足',message:(row.level+1)+'階：耐力壁を支える柱・梁が不足しています。壁の両端に柱、上に梁をそろえよう。'});
  for(const axis of ['x','z']){
   const d=row.directions[axis],where=(row.level+1)+'階・'+axis.toUpperCase()+'方向';
   const add=(cause,message,value)=>issues.push({score:value,level:row.level,axis,cause,message:where+'：'+message});
   let value=seismic.type==='frame'?Math.min(d.ratio,d.driftRatio):d.ratio;
   if(seismic.type==='frame'){
    if(d.driftRatio<1)add('変形が大きい','揺れたときの変形が大きくなります。柱・梁を太くするか、この方向の耐震パーツを増やそう。',d.driftRatio);
    if(d.ratio<1){
     const part=d.members?.find(m=>m.id===d.critical),cause=part?.governing||part?.kind;
     const advice=cause==='joint'?'柱と梁の接合部が先に限界に達します。ボルト本数やRCの定着条件を見直すか、耐震パーツを増やして力を分担しよう。':cause==='post'?'柱にかかる力が大きすぎます。柱を太くするか、耐震パーツを増やして力を分担しよう。':cause==='beam'?'梁にかかる力が大きすぎます。梁を大きくするか、耐震パーツを増やして力を分担しよう。':cause==='panel'?'耐震パーツにかかる力が大きすぎます。同じ方向の耐震パーツを増やすか、その仕様を見直そう。':'骨組みが支えられる力が不足しています。柱・梁や接合部の仕様を見直そう。';
     add(cause||'骨組みの強さ',advice,d.ratio);
    }
   }else{
    if(d.ratio<1)add('壁量不足','揺れを支える壁の量が足りません。この方向の耐力壁を増やそう。',d.ratio);
    if(!d.balance.adequate&&d.ratio>0)add('壁の偏り','耐力壁の配置が偏っています。片側に集めず、反対側の外周にも耐力壁を配置しよう。',.99);
    if(!d.balance.adequate||row.unframed)value=Math.min(value,.99);
   }
   if(!Number.isFinite(value))return pending('骨組みを確認しよう。');
   if(value<score){score=value;weakest={level:row.level,axis};}
  }
 }
 const label=score>=1.5?'十分強い':score>=1?'強い':'弱い';
 issues.sort((a,b)=>a.score-b.score||a.level-b.level);
 const hints=issues.slice(0,3).map(issue=>issue.message);
 return {label,tone:score>=1.5?'high':score>=1?'normal':'low',score,weakest,issues,
 hint:hints.length?hints.join('\n')+(issues.length>3?'\nほかの不足は「仕様をくらべる」で確認できます。':''):(weakest.level+1)+'階の'+weakest.axis.toUpperCase()+'方向'+(score<1.5?'を補強すると、さらに余裕が増えます。':'にも余裕があります。')};
}
function evaluate(model,method=model.method||'timber',level=0){if(!['timber','platform','steel','rc'].includes(method))method='timber';const scenario=scenarios[method],base=M.evaluate(model,scenario?'wpc':method,level),o=options(model),ins=catalog.insulations[o.insulation],damper=catalog.dampers[scenario?'none':o.damper],positions=damperPositions(model,method,damper.count),floor=model.parts.filter(p=>p.kind==='floor'),walls=model.parts.filter(p=>M.wallKinds.includes(p.kind)),roof=model.parts.filter(p=>p.kind==='roof'),floorArea=floor.length*.91*.91,groundArea=floor.filter(p=>p.level===0).length*.91*.91,roofArea=roof.length*.91*.91,wallArea=walls.reduce((s,p)=>s+opaqueArea(p,method),0),extraDepth=scenario?0:Math.max(0,ins.thickness-(method==='platform'?89:105));
const posts=model.parts.filter(p=>p.kind==='post'),beams=model.parts.filter(p=>p.kind==='beam');
const panels=walls.filter(p=>['panel','brace','braceDouble'].includes(p.kind));
const hasBeam=p=>beams.some(b=>b.level===p.level&&b.axis===p.axis&&b.c===p.c&&b.r===p.r);
const lateral=panels.filter(p=>method==='platform'||hasBeam(p));
const counts={x:lateral.filter(p=>p.level===level&&p.axis==='x').length,z:lateral.filter(p=>p.level===level&&p.axis==='z').length};
const balconies=model.parts.filter(p=>p.kind==='balcony').length;
const s=catalog.costScenario,rows=[];const add=(name,amount,basis,metadata={})=>rows.push({name,amount:Math.round(amount),basis,priceKind:'assumed',taxMode:'excluded',...metadata});
if(scenario){
 const quantities=E.frame.mass(model,method),frameWeight=quantities.reduce((sum,a)=>sum+a.columns+a.beams+a.walls,0);
 const quantity=method==='steel'?frameWeight/10:frameWeight/24000;
 const rate=method==='steel'?1800:85000;
 add(method==='steel'?'鉄骨柱・H形鋼梁・ブレース':'RC柱・梁・耐震壁',quantity*rate,(method==='steel'?quantity.toFixed(1)+' kg × 仮定加工単価1,800円/kg':quantity.toFixed(3)+' m³ × 仮定鉄筋・型枠込み単価85,000円/m³')+'。断面・配置に連動。実売・施工見積ではない。');
 const joints=beams.length*2,settings=E.frame.options(model);
 add('柱梁・ブレースの接合部',joints*(method==='steel'?(settings.steelJoint==='rigid'?2500+((settings.steelBolts==='four'?4:2)*2+2)*200:1400):1800)+(method==='steel'?panels.length*2*(settings.steelBolts==='four'?4:2)*200:0),'梁端の数 × 教材仮定の接合工事単価。鉄骨は選択したボルト本数に仮定200円/本を加算。接合耐力の認定・実製品の価格ではない。');
 add('構造床・屋根', (floorArea+roofArea)*scenario.slabPerM2*(method==='rc'?Number(E.frame.options(model).rcSlab)/150:1),s.name+' RCは選択したスラブ厚に比例する仮定。');
}else add('木材・合板',base.cost||0,'購入本数・枚数を切り上げて積算。公表資料の税区分が未確認のため追加課税しない。',{priceKind:'published',taxMode:'unknown',source:method==='platform'?M.data.platform.source:M.methods[method].source,secondarySource:method==='platform'?M.methods.timber.source:null});add('壁の断熱材',Math.ceil(wallArea/3.305785)*ins.designYenPerTsubo,'メーカー設計価格による概算。税区分未確認分は追加課税しない。',{priceKind:'published',taxMode:'unknown',source:catalog.insulationSource});add('断熱材を納める付加下地',wallArea*extraDepth*s.furringPerM2PerMm,'教材仮定単価。厚さ不足分を圧縮せず付加下地で確保する想定。');
add('基礎',groundArea*s.foundationPerM2*(scenario?.foundationFactor||1),s.name);add('バルコニー床・手すり',balconies*(scenario?.slabPerM2+35000||48000),s.name);add('施工・標準工事',floorArea*s.constructionPerM2,'躯体等の標準工事のみを想定した教材単価。設備の給排水・配線・設置は別途。');const exteriorArea=walls.filter(p=>K.edgeCells(p).filter(([c,r])=>K.floorAt(model,p.level,c,r)).length===1).reduce((sum,p)=>sum+opaqueArea(p,method),0);
const wallRate={plaster:18000,wood:21000,brick:24000}[model.finishes?.wall]??18000;
const roofRate={metal:18000,slate:20000,tile:24000}[model.finishes?.roof]??18000;
const floorRates={oak:0,walnut:3500,tile:5000,tatami:4200};
add('外壁仕上げ',exteriorArea*wallRate,'外壁面積 × 素材別の教材単価。');
add('屋根仕上げ',roofArea*roofRate*({gable:1.09,shed:1.04}[model.finishes?.roofShape]??1),'屋根の水平面積 × 教材単価 × 勾配補正。');
add('床仕上げの追加費',floor.reduce((sum,p)=>sum+(floorRates[p.finish]??0)*.91*.91,0),'標準床からの差額。床材別の教材単価を使用。');add('窓・入口',model.parts.filter(p=>p.kind==='window').length*s.windowEach+model.parts.filter(p=>p.kind==='door').length*s.doorEach,s.name);if(floor.length){add('設計・申請',s.design,s.name);add('仮設・諸経費',s.temporary,s.name);}add('制震配置案',damper.count*s.damperEach,'未配置分を含む選択台数の予算枠。教材仮定単価。製品・施工の見積ではない。');
const equipment=E.equipment(model);
for(const item of equipment.rows)if(item.amount!==null)add('設備・家電：'+item.name,item.amount,item.basis,{category:'equipment',quantity:item.quantity,unitPrice:item.unitPrice,taxAmount:item.tax,taxMode:item.taxBasis,priceKind:'published',source:item.source,representative:item.model,checked:item.checked});
const subtotal=rows.reduce((sum,row)=>sum+row.amount,0);
const reserveBase=rows.filter(row=>row.category!=='equipment').reduce((sum,row)=>sum+row.amount,0);
const reserve=Math.round(reserveBase*s.reserve);
const tax=rows.reduce((sum,row)=>sum+(row.category==='equipment'?row.taxAmount:row.taxMode==='unknown'?0:Math.round(row.amount*s.tax)),0)+Math.round(reserve*s.tax);
const total=subtotal+reserve+tax;
const publishedSubtotal=rows.filter(row=>row.priceKind==='published').reduce((sum,row)=>sum+row.amount,0);
const assumedSubtotal=rows.filter(row=>row.priceKind==='assumed').reduce((sum,row)=>sum+row.amount,0);
const taxUnknownSubtotal=rows.filter(row=>row.taxMode==='unknown').reduce((sum,row)=>sum+row.amount,0);
const seismic=E.seismic(model,method,level);
let checks=scenario?[
 {name:'床がある',pass:floor.length>0},
 {name:'選択階のX・Z両方向に骨組み付きの耐震パーツがある',pass:counts.x>0&&counts.z>0},
 {name:'耐震パーツの位置に梁がある',pass:panels.length===lateral.length}
]:[{name:'床がある',pass:floor.length>0},{name:'X・Z両方向に耐力壁がある',pass:base.directions.x.count>0&&base.directions.z.count>0},{name:'両方向の外側に壁がある',pass:base.directions.x.layout==='両側にある'&&base.directions.z.layout==='両側にある'},{name:'骨組み不足の構造壁がない',pass:!base.unframed}];
if(seismic.selected&&seismic.type==='frame'){
 const d=seismic.selected.directions;
 checks=['x','z'].flatMap(axis=>[{name:axis.toUpperCase()+'方向の水平力のみの材料限界以内',pass:d[axis].ratio>=1},{name:axis.toUpperCase()+'方向の層間変形1/200以内',pass:d[axis].driftRatio>=1}]);
}
if(seismic.selected&&seismic.type!=='frame'){
 const d=seismic.selected.directions;
 checks=[
  {name:'X方向の配置壁量が必要量以上',pass:d.x.ratio>=1},
  {name:'Z方向の配置壁量が必要量以上',pass:d.z.ratio>=1},
  {name:'X方向の四分割法の比較条件内',pass:d.x.balance.adequate},
  {name:'Z方向の四分割法の比較条件内',pass:d.z.balance.adequate},
  {name:'骨組み不足の構造壁がない',pass:!base.unframed}
 ];
}
return {method,base,counts,assembly:M.methods[method].assembly,options:o,insulation:ins,damper,damperPositions:positions,damperUnplaced:damper.count-positions.length,wallArea,floorArea,groundArea,extraDepth,seismic,strength:strength(seismic),cost:{rows,subtotal,reserve,tax,total,equipment,publishedSubtotal,assumedSubtotal,taxUnknownSubtotal,remaining:catalog.target.budget-total,withinBudget:total<catalog.target.budget,actualVerified:false},grade:{target:3,verified:false,status:'未確認',checks,passed:checks.filter(c=>c.pass).length},conditionsMet:false,limitations:'教材想定総額と簡易構造チェック。耐震等級3の確認・実際の見積・断熱等級・制震効果の判定は未実装。'};
}
const api={catalog,options,evaluate,strength,damperPositions,evidence:E};if(typeof module!=='undefined')module.exports=api;else root.HouseChallenge=api;
})(globalThis);
