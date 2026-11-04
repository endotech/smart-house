(function(root){
 'use strict';
 const K=typeof module!=='undefined'?require('./kit-core.js'):root.BlockKit;
 const catalog={
  steelColumn:{small:{label:'角形鋼管 200×200×6 mm',b:200,t:6},large:{label:'角形鋼管 250×250×9 mm',b:250,t:9}},
  steelBeam:{small:{label:'H形鋼 200×100×5.5×8 mm',h:200,b:100,tw:5.5,tf:8},large:{label:'H形鋼 250×125×6×9 mm',h:250,b:125,tw:6,tf:9}},
  rcColumn:{small:{label:'300角・4-D16（引張側2本）',b:300,h:300,bars:2,bar:198.6,dia:16},large:{label:'400角・8-D19（引張側3本）',b:400,h:400,bars:3,bar:286.5,dia:19}},
  rcBeam:{small:{label:'250×400・上下各2-D16',b:250,h:400,bars:2,bar:198.6,dia:16},large:{label:'300×500・上下各3-D19',b:300,h:500,bars:3,bar:286.5,dia:19}}
 };
 const defaults={steelColumn:'small',steelBeam:'small',steelJoint:'rigid',steelBase:'fixed',steelBrace:'rod16',steelBolts:'four',rcColumn:'small',rcBeam:'small',rcFc:'24',rcJoint:'continuous',rcSlab:'150',rcWall:'180'};
 const choices={steelColumn:['small','large'],steelBeam:['small','large'],steelJoint:['rigid','pinned'],steelBase:['fixed','pinned'],steelBrace:['rod16','rod20'],steelBolts:['two','four'],rcColumn:['small','large'],rcBeam:['small','large'],rcFc:['24','30'],rcJoint:['continuous','straight','unconfirmed'],rcSlab:['150','180'],rcWall:['180','200']};
 const sources={bolts:'https://www.kouriki-bolt.jp/qa/faq',steel:'https://www.jfe-steel.co.jp/products/building/assets/pdf/binran/binran_chapter04.pdf',sections:'https://www.jfe-steel.co.jp/products/building/assets/pdf/shapes/jis_h-danmen.pdf',concrete:'https://www.mlit.go.jp/notice/noticedata/pdf/201703/00006498.pdf',law:'https://laws.e-gov.go.jp/law/325CO0000000338'};
 function options(model){return {...defaults,...model.structural};}
 function steelBox(s){const A=s.b**2-(s.b-2*s.t)**2,I=(s.b**4-(s.b-2*s.t)**4)/12;return {...s,A,I,E:205000,M:235*I/(s.b/2),V:235/Math.sqrt(3)*2*s.t*(s.b-2*s.t)};}
 function steelH(s){const A=2*s.b*s.tf+(s.h-2*s.tf)*s.tw,I=(s.b*s.h**3-(s.b-s.tw)*(s.h-2*s.tf)**3)/12;return {...s,A,I,E:205000,M:235*I/(s.h/2),V:235/Math.sqrt(3)*(s.h-2*s.tf)*s.tw};}
 // Cracked, singly reinforced elastic section. Compression-side bars are ignored.
 // First limit = tensile steel 295 N/mm² or concrete short-term compression Fc/2.
 function rcSection(s,fc){
  const E=33500*(23/24)**2*Math.cbrt(fc/60),n=205000/E,As=s.bars*s.bar,d=s.h-40-s.dia/2;
  const x=(-n*As+Math.sqrt((n*As)**2+2*s.b*n*As*d))/s.b;
  const I=s.b*x**3/3+n*As*(d-x)**2;
  return {...s,A:s.b*s.h,I,E,d,x,As,M:Math.min(295*I/(n*(d-x)),fc/2*I/x),V:1.5*Math.min(fc/30,.49+fc/100)*s.b*d};
 }
 function specs(model,method){const o=options(model),fc=Number(o.rcFc);
  return {options:o,column:method==='steel'?steelBox(catalog.steelColumn[o.steelColumn]):rcSection(catalog.rcColumn[o.rcColumn],fc),beam:method==='steel'?steelH(catalog.steelBeam[o.steelBeam]):rcSection(catalog.rcBeam[o.rcBeam],fc),wall:rcSection({label:'壁厚'+o.rcWall+'・両端各2-D13・縦横D10@200複配筋（メッシュは耐力に加算しない）',b:Number(o.rcWall),h:910,bars:2,bar:126.7,dia:13},fc)};
 }
 function jointLimits(s,method){
  if(method==='steel'){
   const count=s.options.steelBolts==='four'?4:2;
   // Published M16/F10T, one friction surface, LONG-term allowable per bolt.
   // Intentionally a conservative reference, not short-term ultimate strength.
   return {M:count*30200*(s.beam.h-s.beam.tf),V:2*30200,brace:count*30200,count,bolt:30200,label:'F10T M16・1摩擦面・1本30.2kN（長期許容値を比較の下限として使用）'};
  }
  if(s.options.rcJoint!=='straight')return {M:null,V:null,label:'十分な定着を仮定。接合部せん断は未照査'};
  const fc=Number(s.options.rcFc),tau=2*(.9+2*fc/75),length=s.column.b-80;
  const tension=s.beam.bars*Math.PI*s.beam.dia*length*tau;
  return {M:tension*(s.beam.d-s.beam.x),V:null,length,tau,label:'梁上端筋の直線定着。長さ=柱幅−80mm、短期付着許容応力度2×(0.9+2Fc/75)。圧縮合力までの距離はd−x（保守的）'};
 }
 const at=(a,b)=>a.c===b.c&&a.r===b.r;
 function supported(model,p){return p.level===0||model.parts.some(q=>q.kind===p.kind&&q.level===p.level-1&&at(p,q)&&(!['panel','brace','braceDouble'].includes(p.kind)||p.axis===q.axis));}
 function framed(model,p){return K.ends(p).every(node=>model.parts.some(q=>q.kind==='post'&&q.level===p.level&&at(q,node)))&&model.parts.some(q=>q.kind==='beam'&&q.level===p.level&&q.axis===p.axis&&at(q,p));}
 function mass(model,method){
  const s=specs(model,method),h=K.STOREY,o=s.options,levels=[];
  const top=Math.max(...model.parts.filter(p=>p.kind==='floor').map(p=>p.level));
  for(let level=0;level<=top;level++){
   const parts=model.parts.filter(p=>p.level===level),roof=parts.filter(p=>p.kind==='roof'&&!K.floorAt(model,level+1,p.c,p.r)).length*.91**2;
   const volumeRate=method==='steel'?7.85e-5:2.4e-5;
   const columns=parts.filter(p=>p.kind==='post').length*s.column.A*h*volumeRate;
   const beams=parts.filter(p=>p.kind==='beam').length*s.beam.A*910*volumeRate;
   const walls=parts.filter(p=>['panel','brace','braceDouble'].includes(p.kind)).reduce((sum,p)=>sum+(method==='rc'?Number(o.rcWall)*910*h*2.4e-5:Math.PI*(o.steelBrace==='rod20'?20:16)**2/4*Math.hypot(910,h)*2*7.85e-5),0);
   const slab=method==='rc'?Number(o.rcSlab)*24:100*24; // Steel: 100 mm concrete on deck (assumption).
   levels.push({columns,beams,walls,roof:roof*slab,floor:parts.filter(p=>p.kind==='floor').length*.91**2*slab});
  }
  return levels;
 }
 function solve(matrix,rhs){
  const n=rhs.length,a=matrix.map((row,i)=>[...row,rhs[i]]),scale=Math.max(...matrix.map((r,i)=>Math.abs(r[i])));
  for(let k=0;k<n;k++){
   let p=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[p][k]))p=i;
   if(Math.abs(a[p][k])<Math.max(1e-9,scale*1e-12))return null;
   [a[p],a[k]]=[a[k],a[p]];
   for(let i=k+1;i<n;i++){const f=a[i][k]/a[k][k];if(!f)continue;for(let j=k+1;j<=n;j++)a[i][j]-=f*a[k][j];a[i][k]=0;}
  }
  const x=Array(n).fill(0);for(let i=n-1;i>=0;i--){let b=a[i][n];for(let j=i+1;j<n;j++)b-=a[i][j]*x[j];x[i]=b/a[i][i];}return x;
 }
 // Euler–Bernoulli bending elements. Floor translations are rigid-diaphragm
 // master DOFs; joint rotations are shared at actual column/beam nodes.
 // Rotations are scaled by h so matrix coefficients have uniform N/mm units.
 function analyze(model,method,rows){
  const s=specs(model,method),o=s.options,h=K.STOREY,n=rows.length,joint=jointLimits(s,method);
  const bad=reason=>({available:false,verified:false,type:'frame',reason,specification:s,sources});
  if(method==='rc'&&o.rcJoint==='unconfirmed')return bad('RCの柱梁・壁の定着条件が未確認です。連続配筋・十分な定着を仮定する条件を選ぶまで算定しません。');
  const posts=model.parts.filter(p=>p.kind==='post'),beams=model.parts.filter(p=>p.kind==='beam'),panels=model.parts.filter(p=>['panel','brace','braceDouble'].includes(p.kind));
  if(!posts.length)return bad('柱・梁を配置してください。壁だけでは鉄骨・RCの骨組みを算定できません。');
  if(posts.some(p=>!supported(model,p)))return bad('上階の柱の直下に柱がありません。梁による柱抜けの支持は未対応です。');
  if(beams.some(p=>!K.ends(p).every(node=>posts.some(q=>q.level===p.level&&at(q,node)))))return bad('梁の両端に同じ階の柱を配置してください。');
  if(panels.some(p=>!framed(model,p)||(method==='rc'&&!supported(model,p))))return bad('耐震パーツに柱・梁が不足、またはRC耐震壁が上下につながっていません。');
  const output=rows.map(row=>({...row,directions:{}})),details=[];
  for(const axis of ['x','z']){
   const rotations=new Map(),elements=[];
   const fixedBase=method==='rc'||o.steelBase==='fixed';
   const rot=(p,level)=>{if(level===0&&fixedBase)return -1;const key=level+':'+p.c+','+p.r;if(!rotations.has(key))rotations.set(key,n+rotations.size);return rotations.get(key);};
   const columnMatrix=section=>{const v=section.E*section.I/h**3;return [[12,6,-12,6],[6,4,-6,2],[-12,-6,12,-6],[6,2,-6,4]].map(r=>r.map(x=>x*v));};
   for(const p of posts)elements.push({id:p.id,kind:'post',level:p.level,s:s.column,indices:[p.level-1,rot(p,p.level),p.level,rot(p,p.level+1)],k:columnMatrix(s.column)});
   if(method==='rc'||o.steelJoint==='rigid')for(const p of beams.filter(p=>p.axis===axis)){
    const ends=K.ends(p),v=s.beam.E*s.beam.I/(910*h*h);
    elements.push({id:p.id,kind:'beam',level:p.level,s:s.beam,indices:ends.map(q=>rot(q,p.level+1)),k:[[4*v,2*v],[2*v,4*v]]});
   }
   for(const p of panels.filter(p=>p.axis===axis)){
    let stiffness,capacity;
    if(method==='steel'){
     const diameter=o.steelBrace==='rod20'?20:16,A=Math.PI*diameter**2/4,L=Math.hypot(910,h),cos=910/L;
     stiffness=205000*A/L*cos*cos;capacity=Math.min(235*A,joint.brace)*cos; // One tension diagonal of X; compression diagonal ignored.
    }else{stiffness=3*s.wall.E*s.wall.I/h**3;capacity=Math.min(s.wall.M/h,s.wall.V);}
    elements.push({id:p.id,kind:'panel',level:p.level,capacity,indices:[p.level-1,p.level],k:[[stiffness,-stiffness],[-stiffness,stiffness]]});
   }
   const size=n+rotations.size;if(size>240)return bad('この比較計算は自由度240までです。骨組みを減らした比較案で確認してください。');
   const matrix=Array.from({length:size},()=>Array(size).fill(0)),rhs=Array(size).fill(0);
   for(let i=0;i<n;i++)rhs[i]=(rows[i].force-(rows[i+1]?.force||0))*1000;
   for(const e of elements)for(let i=0;i<e.indices.length;i++)for(let j=0;j<e.indices.length;j++)if(e.indices[i]>=0&&e.indices[j]>=0)matrix[e.indices[i]][e.indices[j]]+=e.k[i][j];
   const u=solve(matrix,rhs);if(!u)return bad(axis.toUpperCase()+'方向の骨組みが不安定です。ピン接合だけでは横揺れを支えられません。ブレース、剛接合、柱脚条件を見直してください。');
   const memberRows=elements.map(e=>{
    const f=e.k.map(r=>r.reduce((v,c,j)=>v+c*(e.indices[j]<0?0:u[e.indices[j]]),0));
    const checks=[];
    if(e.kind==='panel')checks.push({governing:'panel',value:Math.abs(f[1])/e.capacity});
    else if(e.kind==='beam'){
     const moment=Math.max(...f.map(x=>Math.abs(x*h)));
     checks.push({governing:'beam',value:moment/e.s.M});
     if(joint.M!==null)checks.push({governing:'joint',value:moment/joint.M});
     if(method==='steel')checks.push({governing:'joint',value:Math.abs(f[0]+f[1])*h/910/joint.V});
    }else checks.push({governing:'post',value:Math.max(Math.abs(f[1]*h)/e.s.M,Math.abs(f[3]*h)/e.s.M,Math.abs(f[0])/e.s.V)});
    const controlling=checks.reduce((a,b)=>b.value>a.value?b:a);
    return {id:e.id,kind:e.kind,level:e.level,utilization:controlling.value,governing:controlling.governing,forces:f,limit:e.kind==='panel'?e.capacity:e.s.M};
   });
   for(let level=0;level<n;level++){
    const drift=Math.abs(u[level]-(level?u[level-1]:0)),angle=drift/h;
    const members=memberRows.filter(m=>m.level===level),critical=members.reduce((a,b)=>b.utilization>a.utilization?b:a,{utilization:0,id:null});
    const ratio=critical.utilization>0?1/critical.utilization:0;
    const sameAxis=panels.filter(p=>p.level===level&&p.axis===axis);
    output[level].directions[axis]={ratio,ratio15:ratio/1.5,drift,angle,driftRatio:angle>0?1/(200*angle):0,critical:critical.id,members,capacity:rows[level].force*ratio,required:rows[level].force,available:rows[level].force*ratio,required15:rows[level].force*1.5,balance:{adequate:false,ratio:0},panelCount:sameAxis.length};
   }
   details.push({axis,displacements:u.slice(0,n),members:memberRows});
  }
  return {available:true,verified:false,type:'frame',rows:output,specification:s,joint,sources,details,
   assumptions:'非多雪・地域係数1・C0=0.2・剛床を仮定した2方向別の線形弾性計算。柱梁は配置位置で接続。鋼材E=205000、F=235 N/mm²。RCはSD295、かぶり40mm、引張側鉄筋のみのひび割れ断面。RC壁は階ごとに固定端の片持ち壁として加算。鋼製Xブレースは引張側丸鋼1本のみ有効（ねじ部なし）。接合剛性は理想的な剛・ピン。鉄骨梁端は選択本数のF10T M16のすべり比較限界、RCの直線定着は梁上端筋の付着を照合。その他の溶接・柱脚等の接合耐力は未照査。',
   limitations:'表示は水平力だけに対する最初の曲げ・せん断の材料限界までの倍率と層間変形。鉛直荷重との応力組合せ、軸力・座屈・PΔ、立体ねじれ、接合板・孔欠損・ボルト配置・溶接・柱脚・RC接合部せん断、基礎・地盤、靱性・保有水平耐力は未照査。RC壁の固定条件・配筋も教材の仮定。木造の壁量充足率と同じ指標ではない。耐震等級・実際の耐震安全性は判定しない。'};
 }
 const api={catalog,defaults,choices,options,specs,jointLimits,mass,analyze,solve,steelBox,steelH,rcSection};
 if(typeof module!=='undefined')module.exports=api;else root.HouseFrame=api;
})(globalThis);
