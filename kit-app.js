'use strict';
const K=BlockKit,$=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d');
let selectedFurniture=null;
let model=K.empty(),kind='floor',group='床',mode='move',material='木材',timber='sugi',level=0,rotation=0,undoStack=[],redoStack=[],reference=null;
let width=0,height=0,scale=.062,yaw=-.65,pitch=.65,panX=0,panY=0,hover=null,gesture=null,facesOnScreen=[],grabbing=null,finishing=false;
let carrying=null;
const STORAGE='sumai-smart-classroom-v1';
try{const saved=localStorage.getItem(STORAGE);if(saved)model=K.validate(JSON.parse(saved));}catch(e){toast('保存データを開けませんでした。ファイルから復元できます。');}
const descriptions={balcony:'2階以上の室内床の外側にはめます。出入口にドアを置こう。',braceDouble:'45×105 mmの筋かいを2本組んだ壁。柱・梁と一緒にはまり、比較結果も自動で変わります。',panel:'厚さ9 mmの構造用合板の壁。規定の釘・間隔・下地の仕様を想定して比較します。',brace:'45×105 mmの筋かい1本の壁。柱・梁と一緒にはまり、壁の強さを自動で比較できます。',floor:'1マスの床。マスにはめて、家の広さや形を自由につくります。一覧から1枚ずつ運び、光るマスで離します。',floor2:'2マスつながった床。Rキーで横・縦を切り替えられます。',wall:'床の辺にはめます。向きと高さは自動でそろうので、数値入力は不要です。',window:'窓まで組み込まれた壁パーツ。同じ辺の壁を、そのまま窓付きに交換できます。',door:'入口まで組み込まれた壁パーツ。玄関にしたい辺にはめます。',frame:'1辺分の柱と梁がセット。床の辺を選ぶだけで、両端に柱・上に梁がはまります。',post:'床の角や、上階のバルコニーの下にはめます。上端の高さは、同じ階のほかの柱と自動でそろいます。',beam:'両端に柱がある辺にはめます。柱の上端へ自動でつながります。',roof:'床と同じ1マスの屋根。位置を選ぶだけで、その階の一番上にはまります。'};
const hints={設備:['設備を置こう。','室内の床に置きます。'],家電:['家電を置こう。','室内の床に置きます。'],家具:['家具を置こう。','室内の床へドラッグしよう。'],床:['床をならべよう。','一覧から床をつかんで、光るマスへ運ぼう。'],壁:['辺に、壁をはめよう。','一覧から壁をつかんで、光る辺で離そう。'],軸:['角と辺に、骨組みをつくろう。','柱は角、梁は柱の間。セットなら一度で組めます。'],屋根:['家に、屋根をかけよう。','床と同じマスを選ぶと、一番上にはまります。']};
function toast(t){$('toast').textContent=t;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function saveLocal(){if(reference)return;try{localStorage.setItem(STORAGE,JSON.stringify(model));$('saveState').textContent='✓ この端末に自動保存';}catch(e){$('saveState').textContent='保存できません：保存ボタンで書き出してください';}}
function remember(before=JSON.stringify(model)){undoStack.push(before);if(undoStack.length>80)undoStack.shift();redoStack=[];}
function update(){saveLocal();$('title').value=model.name;$('title').disabled=!!reference;$('count').textContent=model.parts.length;const area=model.parts.filter(p=>p.kind==='floor').length*K.UNIT*K.UNIT/1e6;$('area').textContent=` / 床 ${area.toFixed(1)} m²`;$('sample').textContent=reference?'← 自分の設計に戻る':'完成見本';$('reference').hidden=!reference;$('newDesign').disabled=!!reference;$('undo').disabled=!!reference||!undoStack.length;$('redo').disabled=!!reference||!redoStack.length;draw();}
function palette(){const cats=['床','壁','軸','屋根','家具','設備','家電'];$('groups').innerHTML=cats.map(c=>`<button data-group="${c}" class="${group===c?'active':''}">${c}</button>`).join('');$('pieces').innerHTML=Object.entries(K.specs).filter(([id,s])=>s.category===group).map(([id,s])=>`<button class="piece ${kind===id?'selected':''}" data-kind="${id}"><span class="piece-icon">${s.icon}</span><span><b>${s.name}</b><small>${id==='floor2'?'1 × 2マス':id==='post'?'床の角にはまる':K.isFurniture(id)?(s.w/1000)+' × '+(s.d/1000)+' m':K.isCell(id)?'1 × 1マス':'床の1辺にはまる'}</small></span></button>`).join('');$('pieceName').textContent=K.specs[kind].name;$('pieceDescription').textContent=descriptions[kind]||'室内の床に置きます。家具や壁に重ならない場所を選びます。';$('guideDiagram').textContent=K.specs[kind].icon;$('rotate').textContent=selectedFurniture?'↻ 選んだ家具を90°回転':K.isFurniture(kind)?'↻ 置く家具を90°回転':'↻ 床2マスの向きを変える';$('rotationBox').hidden=kind!=='floor2'&&!K.isFurniture(kind)&&!selectedFurniture;$('actionTitle').textContent=mode==='erase'?'パーツをはずそう。':mode==='move'?'パーツをつかんで、組み立てよう。':hints[group][0];$('actionHint').textContent=mode==='erase'?'パーツをクリック。元に戻すこともできます。':mode==='move'?'部材は一覧からドラッグ。3Dでは空白をドラッグすると視点が回ります。':hints[group][1];for(const id of ['build','move','erase'])$(id).classList.toggle('active',mode===id);}
$('groups').onclick=e=>{const g=e.target.dataset.group;if(g){group=g;kind=g==='壁'?'wall':Object.keys(K.specs).find(k=>K.specs[k].category===g);mode='move';hover=null;finishing=false;if(group==='屋根')$('showRoof').checked=true;palette();draw();}};
$('pieces').onclick=e=>{const b=e.target.closest('[data-kind]');if(b){kind=b.dataset.kind;mode='move';hover=null;finishing=false;palette();draw();}};
for(const id of ['build','move','erase'])$(id).onclick=()=>{mode=id;hover=null;palette();if(typeof adaptMethodPalette==='function')adaptMethodPalette();draw();};
for(const [id,value] of [['wood','木材'],['metal','金属']])$(id).onclick=()=>{material=value;$('wood').classList.toggle('active',value==='木材');$('metal').classList.toggle('active',value==='金属');};
function project(x,y,z){return [width*.5+panX+(x*Math.cos(yaw)-z*Math.sin(yaw))*scale,height*.67+panY+((x*Math.sin(yaw)+z*Math.cos(yaw))*Math.sin(pitch)-y*Math.cos(pitch))*scale];}
function ground(x,y,h){const a=(x-width*.5-panX)/scale,b=((y-height*.67-panY)/scale+h*Math.cos(pitch))/Math.sin(pitch);return {x:a*Math.cos(yaw)+b*Math.sin(yaw),z:-a*Math.sin(yaw)+b*Math.cos(yaw)};}
function depth(x,y,z){return (x*Math.sin(yaw)+z*Math.cos(yaw))*Math.cos(pitch)+y*Math.sin(pitch);}
function path(pts){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();}
function shade(hex,k){return '#'+hex.slice(1).match(/../g).map(n=>Math.min(255,Math.round(parseInt(n,16)*k)).toString(16).padStart(2,'0')).join('');}
function cuboid(g,color,id,out,ghost=false,alpha=1){const v=[[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]].map(a=>[g.x+a[0]*g.w/2,g.y+a[1]*g.h,g.z+a[2]*g.d/2]);for(const f of [[0,1,5,4,.73],[1,2,6,5,.86],[2,3,7,6,.99],[3,0,4,7,.92],[4,5,6,7,1.12]]){const verts=f.slice(0,4).map(i=>v[i]);out.push({id,ghost,alpha,color:shade(color,f[4]),points:verts.map(p=>project(...p)),depth:verts.reduce((s,p)=>s+depth(...p),0)/4});}}
function visible(p){if(p.level>level&&!finishing)return false;if(p.kind==='roof')return $('showRoof').checked&&(finishing||group==='屋根')&&pitch<1.5;if(['wall','window','door','brace','braceDouble','panel'].includes(p.kind)&&!$('showWalls').checked)return false;return true;}
function blocks(p,out,ghost=false,heightOverride){const g=K.geometry(p);g.h=heightOverride??g.h;const color=p.timber==='hinoki'&&['post','beam'].includes(p.kind)?'#deca9c':p.material==='金属'&&['post','beam'].includes(p.kind)?'#90a2a7':K.specs[p.kind].color,alpha=!finishing&&group==='床'&&p.kind!=='floor'?.17:1;
if(p.kind==='window'||p.kind==='door'){const along=p.axis==='x'?'x':'z',full=K.HEIGHT;const slab=(lo,h,c,w=K.UNIT,dx=0)=>{const q={...g,y:g.y+lo,h,w:p.axis==='x'?w:105,d:p.axis==='z'?w:105};q[along]+=dx;cuboid(q,c,p.id,out,ghost,alpha);};if(p.kind==='window'){slab(0,900,'#eee6d0');slab(2100,full-2100,'#eee6d0');slab(900,1200,'#a7cdd0');slab(900,1200,'#e7dec9',36);slab(900,45,'#e7dec9');slab(2055,45,'#e7dec9');}else{slab(0,2100,'#bc946c');slab(2100,full-2100,'#eee6d0');slab(950,90,'#e4cd95',28,300);}return;}
if(!['brace','braceDouble'].includes(p.kind))cuboid(g,color,p.id,out,ghost,alpha);if(['brace','braceDouble'].includes(p.kind)){const along=p.axis==='x'?'x':'z';for(const sign of p.kind==='brace'?[1]:[-1,1]){const vertices=[];for(const side of [-1,1])for(const end of [0,1])for(const offset of [-1,1]){const q=[g.x,g.y+end*g.h+offset*23,g.z];q[along==='x'?0:2]+=sign*(end-.5)*K.UNIT;q[along==='x'?2:0]+=side*60;vertices.push(q);}for(const ids of [[0,2,3,1],[4,5,7,6],[0,4,6,2],[1,3,7,5]]){const pts=ids.map(i=>vertices[i]);out.push({id:p.id,ghost,alpha,color:'#8b7754',points:pts.map(p=>project(...p)),depth:pts.reduce((s,p)=>s+depth(...p),0)/4});}}}
// Four small registration marks on floors visually explain their connection grid.
if(p.kind==='floor')for(const dx of [-.28,.28])for(const dz of [-.28,.28])cuboid({x:g.x+dx*K.UNIT,y:g.y+g.h,z:g.z+dz*K.UNIT,w:52,h:8,d:52},'#cbb088',p.id,out,ghost,alpha);
}
function boardRange(){const floors=model.parts.filter(p=>p.kind==='floor');if(!floors.length)return {c0:-4,c1:4,r0:-4,r1:4};return {c0:Math.max(-15,Math.min(-4,...floors.map(p=>p.c-2))),c1:Math.min(15,Math.max(4,...floors.map(p=>p.c+3))),r0:Math.max(-15,Math.min(-4,...floors.map(p=>p.r-2))),r1:Math.min(15,Math.max(4,...floors.map(p=>p.r+3)))};}
function draw(){if(!width)return;ctx.clearRect(0,0,width,height);const background=ctx.createLinearGradient(0,0,0,height);
background.addColorStop(0,'#e5edf0');
background.addColorStop(1,'#f5f2e9');
ctx.fillStyle=finishing?background:'#f2f5ed';
ctx.fillRect(0,0,width,height);
if(finishing){
 ctx.fillStyle='#454e4024';
 for(const floor of model.parts.filter(p=>p.kind==='floor'&&p.level===0)){
  const x=floor.c*K.UNIT+160,z=floor.r*K.UNIT+210;
  path([[x,z],[x+K.UNIT,z],[x+K.UNIT,z+K.UNIT],[x,z+K.UNIT]].map(([x,z])=>project(x,-10,z)));
  ctx.fill();
 }
}const range=boardRange(),plane=level*K.STOREY;ctx.lineWidth=.7;for(let c=range.c0;!finishing&&c<=range.c1;c++)line([c*K.UNIT,plane,range.r0*K.UNIT],[c*K.UNIT,plane,range.r1*K.UNIT],'#d8e1d1');for(let r=range.r0;!finishing&&r<=range.r1;r++)line([range.c0*K.UNIT,plane,r*K.UNIT],[range.c1*K.UNIT,plane,r*K.UNIT],'#d8e1d1');
const fs=[];for(const p of model.parts){if(!visible(p)||grabbing?.id===p.id)continue;blocks(p,fs);}
if(hover&&(carrying||grabbing)&&!reference){const target=hover.target;const previewKind=grabbing?.kind||kind;const fake={kind:previewKind,level,c:target.c,r:target.r,axis:target.axis,material,rotation:grabbing?.rotation??rotation,compact:grabbing?.compact,id:'preview'};if(previewKind==='frame'){for(const n of K.ends(target))blocks({...fake,kind:'post',c:n.c,r:n.r},fs,true);blocks({...fake,kind:'beam'},fs,true);}else if(previewKind==='floor2'){blocks({...fake,kind:'floor'},fs,true);blocks({...fake,kind:'floor',c:fake.c+(rotation%180?0:1),r:fake.r+(rotation%180?1:0)},fs,true);}else blocks(fake,fs,true);}
fs.sort((a,b)=>a.depth-b.depth);facesOnScreen=[];for(const f of fs){path(f.points);ctx.globalAlpha=f.ghost?.42:f.alpha;ctx.fillStyle=f.ghost&&hover?.error?'#d5ad80':f.color;ctx.fill();ctx.lineWidth=f.ghost?1.7:.65;ctx.strokeStyle=f.ghost?(hover?.error?'#ba8c58':'#4f8d5e'):'#615e4326';ctx.stroke();if(!f.ghost&&f.alpha>.5)facesOnScreen.push(f);}ctx.globalAlpha=1;
if(carrying&&!reference)drawSlots();
if(hover&&!reference){const t=hover.target;if(!t)return;const y=level*K.STOREY+K.BASE+12;ctx.strokeStyle=hover.error?'#c19664':'#4d9362';ctx.fillStyle=hover.error?'#d1aa7b33':'#69a47e38';ctx.lineWidth=3;const h=grabbing?.kind||kind;if(K.isCell(h)){path([[t.c,y/K.UNIT,t.r],[t.c+1,y/K.UNIT,t.r],[t.c+1,y/K.UNIT,t.r+1],[t.c,y/K.UNIT,t.r+1]].map(a=>project(a[0]*K.UNIT,y,a[2]*K.UNIT)));ctx.fill();ctx.stroke();}else if(h==='post'){const a=project(t.c*K.UNIT,y,t.r*K.UNIT);ctx.beginPath();ctx.arc(...a,9,0,Math.PI*2);ctx.fill();ctx.stroke();}else{const a=K.ends(t).map(n=>project(n.c*K.UNIT,y,n.r*K.UNIT));ctx.beginPath();ctx.moveTo(...a[0]);ctx.lineTo(...a[1]);ctx.stroke();}}
}
function line(a,b,color){ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(...project(...a));ctx.lineTo(...project(...b));ctx.stroke();}
function drawSlots(){
if(K.isCell(kind)){const range=boardRange(),y=level*K.STOREY+K.BASE+10;for(let c=range.c0;c<range.c1;c++)for(let r=range.r0;r<range.r1;r++){const t={level,c,r};if(K.allowed(model,kind,t,rotation))continue;if(kind==='floor'&&K.floorAt(model,level,c,r))continue;path([[c,r],[c+1,r],[c+1,r+1],[c,r+1]].map(([x,z])=>project(x*K.UNIT,y,z*K.UNIT)));ctx.fillStyle='#58b57928';ctx.strokeStyle='#59a97388';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();}}
const slots=new Map(),pKind=kind;for(const p of model.parts.filter(p=>(p.kind==='floor'&&p.level===level)||(p.kind==='balcony'&&p.level===level+1))){for(const t of [{c:p.c,r:p.r,axis:'x'},{c:p.c,r:p.r+1,axis:'x'},{c:p.c,r:p.r,axis:'z'},{c:p.c+1,r:p.r,axis:'z'}])slots.set(`${t.c}:${t.r}:${t.axis}`,{...t,level});}
if(['wall','window','door','brace','braceDouble','panel','frame','beam'].includes(pKind)){ctx.lineWidth=2;for(const t of slots.values()){if(K.allowed(model,pKind,t))continue;const a=K.ends(t);line([a[0].c*K.UNIT,level*K.STOREY+K.BASE+8,a[0].r*K.UNIT],[a[1].c*K.UNIT,level*K.STOREY+K.BASE+8,a[1].r*K.UNIT],'#32ae63dd');}}
if(pKind==='post'){const points=new Set();for(const t of slots.values())for(const n of K.ends(t)){const key=n.c+':'+n.r;if(points.has(key))continue;points.add(key);const a=project(n.c*K.UNIT,level*K.STOREY+K.BASE+8,n.r*K.UNIT);ctx.beginPath();ctx.arc(...a,4,0,Math.PI*2);ctx.fillStyle='#4f8e65';ctx.fill();}}
}
function inside(poly,p){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
function hitAt(p){for(let i=facesOnScreen.length-1;i>=0;i--)if(inside(facesOnScreen[i].points,p))return model.parts.find(p=>p.id===facesOnScreen[i].id);return null;}
function pointer(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function targetAt(p,k=kind){const g=ground(p.x,p.y,level*K.STOREY+K.BASE),u=g.x/K.UNIT,v=g.z/K.UNIT;let t={level,c:Math.floor(u),r:Math.floor(v),axis:null};if(k==='post')t={level,c:Math.round(u),r:Math.round(v),axis:null};else if(!K.isCell(k)){const a=Math.abs(u-Math.round(u)),b=Math.abs(v-Math.round(v));t=a<b?{level,c:Math.round(u),r:Math.floor(v),axis:'z'}:{level,c:Math.floor(u),r:Math.round(v),axis:'x'};const existing=hitAt(p);if(existing&&existing.level===level&&['wall','window','door','brace','braceDouble','panel'].includes(existing.kind)&&['wall','window','door','brace','braceDouble','panel'].includes(k))t={level,c:existing.c,r:existing.r,axis:existing.axis};}return t;}
function refreshHover(p){if(reference)return;const k=grabbing?.kind||kind,t=targetAt(p,k);hover={target:t,error:K.allowed(model,k,{...t,compact:grabbing?.compact},grabbing?.rotation??rotation,grabbing?.id)};$('connection').textContent=hover.error||`${K.specs[k].name}が${k==='post'?'角':K.isCell(k)?'マス':'辺'}にはまります`;$('connection').classList.toggle('invalid',!!hover.error);}
function applyAt(p){if(reference)return;refreshHover(p);if(hover.error)return;K.place(model,kind,hover.target,rotation,material);update();}
canvas.oncontextmenu=e=>e.preventDefault();
canvas.onpointerdown=e=>{canvas.focus({preventScroll:true});const p=pointer(e);gesture={...p,startX:p.x,startY:p.y,button:e.button,before:JSON.stringify(model),moved:false};canvas.setPointerCapture(e.pointerId);
gesture.pan=e.button===1||(e.button===0&&e.shiftKey);
gesture.orbit=!gesture.pan&&(e.button===2||(e.button===0&&pitch<1.56&&(finishing||reference||!hitAt(p))));
if(gesture.pan||gesture.orbit||reference||e.button!==0)return;if(mode==='move'){const picked=hitAt(p);if(picked){selectedFurniture=K.isFurniture(picked.kind)?picked.id:null;palette();const connected=picked.kind==='floor'?model.parts.some(v=>v.kind!=='floor'&&v.level===picked.level&&Math.abs(v.c-picked.c)<=1&&Math.abs(v.r-picked.r)<=1):picked.kind==='post'&&model.parts.some(v=>v.kind==='beam'&&v.level===picked.level&&K.ends(v).some(n=>n.c===picked.c&&n.r===picked.r));if(connected){toast('つながっている部材を先にはずしてから動かそう');return;}grabbing={...picked};hover=null;}}else{const picked=hitAt(p);if(picked){const before=model.parts.length;K.remove(model,picked.id);if(before-model.parts.length>1)toast(`つながる部材を含めて${before-model.parts.length}個はずしました。元に戻せます。`);update();}}};
canvas.onpointermove=e=>{if(carrying)return;const p=pointer(e);if(gesture){const dx=p.x-gesture.x,dy=p.y-gesture.y;if(Math.hypot(p.x-gesture.startX,p.y-gesture.startY)>4)gesture.moved=true;if(gesture.pan){panX+=dx;panY+=dy;}else if(gesture.orbit&&gesture.moved){
 const anchor=ground(width/2,height*.56,level*K.STOREY);
 yaw+=dx*.008;
 pitch=Math.max(.25,Math.min(1.5,pitch+dy*.006));
 const [ax,ay]=project(anchor.x,level*K.STOREY,anchor.z);
 panX+=width/2-ax;
 panY+=height*.56-ay;
}else if(gesture.button===1){panX+=dx;panY+=dy;}gesture.x=p.x;gesture.y=p.y;}if(grabbing)refreshHover(p);else hover=null;draw();};
canvas.onpointerup=e=>{if(carrying)return;if(!gesture)return;if(grabbing&&gesture.moved&&hover&&!hover.error){const old=grabbing;const candidate=structuredClone(model);candidate.parts=candidate.parts.filter(p=>p.id!==old.id);const result=K.place(candidate,old.kind,{...hover.target,compact:old.compact},old.rotation??0,old.material,old.timber||'sugi');if(result.ok){try{model=K.validate(candidate);}catch(e){toast('つながる部材を先にはずしてから動かそう');}}}if(gesture.before!==JSON.stringify(model))remember(gesture.before);gesture=null;grabbing=null;hover=null;update();};
canvas.onpointercancel=()=>{if(gesture&&!reference)model=JSON.parse(gesture.before);gesture=null;grabbing=null;hover=null;update();};canvas.onpointerleave=()=>{if(!gesture){hover=null;draw();}};
canvas.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.018,Math.min(.18,scale*Math.exp(-e.deltaY*.001)));draw();},{passive:false});
function fit(){const all=model.parts.length?model.parts.map(p=>typeof viewBounds==='function'?viewBounds(p):K.geometry(p)):[{x:0,y:0,z:0,w:5*K.UNIT,h:0,d:5*K.UNIT}];scale=1;panX=panY=0;const pts=all.flatMap(g=>[-1,1].flatMap(x=>[-1,1].flatMap(z=>[0,1].map(y=>project(g.x+x*g.w/2,g.y+y*g.h,g.z+z*g.d/2)))));const xs=pts.map(a=>a[0]-width*.5),ys=pts.map(a=>a[1]-height*.67);const loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);scale=Math.max(.018,Math.min(.1,(width-75)/Math.max(hiX-loX,1),(height-255)/Math.max(hiY-loY,1)));panX=-(loX+hiX)*scale/2;panY=height*.56-height*.67-(loY+hiY)*scale/2;draw();}
$('fit').onclick=fit;$('iso').onclick=()=>{yaw=-.65;pitch=.65;$('iso').classList.add('active');$('plan').classList.remove('active');fit();};$('plan').onclick=()=>{yaw=0;pitch=Math.PI/2;$('plan').classList.add('active');$('iso').classList.remove('active');fit();};$('turnLeft').onclick=()=>{yaw-=Math.PI/4;draw();};$('turnRight').onclick=()=>{yaw+=Math.PI/4;draw();};$('zoomIn').onclick=()=>{scale=Math.min(.18,scale*1.2);draw();};$('zoomOut').onclick=()=>{scale=Math.max(.018,scale/1.2);draw();};
document.querySelector('.level-picker').onclick=e=>{if(e.target.dataset.level===undefined)return;level=Number(e.target.dataset.level);document.querySelectorAll('[data-level]').forEach(b=>b.classList.toggle('active',Number(b.dataset.level)===level));hover=null;finishing=false;fit();};
function undo(){if(reference||!undoStack.length)return;redoStack.push(JSON.stringify(model));model=JSON.parse(undoStack.pop());hover=null;update();}function redo(){if(reference||!redoStack.length)return;undoStack.push(JSON.stringify(model));model=JSON.parse(redoStack.pop());update();}$('undo').onclick=undo;$('redo').onclick=redo;
canvas.addEventListener('click',e=>{
 const p=mode==='move'&&!reference?hitAt(pointer(e)):null;
 selectedFurniture=p&&K.isFurniture(p.kind)?p.id:null;
 palette();
});
$('rotate').onclick=()=>{
 const picked=!reference&&!carrying&&!grabbing&&model.parts.find(p=>p.id===selectedFurniture&&p.level===level&&K.isFurniture(p.kind));
 if(picked){
  const next=((picked.rotation??0)+90)%360;
  const error=K.allowed(model,picked.kind,{...picked,legacy:false},next);
  if(error){toast(error);return;}
  remember();
  delete picked.legacy;
  picked.rotation=next;
  update();
  toast(K.specs[picked.kind].name+'を90°回転しました');
  return;
 }
 rotation=(rotation+90)%360;
 toast('配置する向き '+rotation+'°');
 draw();
};
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName)||document.querySelector('dialog[open]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}else if(e.key.toLowerCase()==='r'&&(kind==='floor2'||K.isFurniture(kind)||selectedFurniture))$('rotate').click();else if(e.key==='Escape'){if(reference){returnWork();return;}if(gesture&&!reference)model=JSON.parse(gesture.before);gesture=null;grabbing=null;hover=null;mode='move';palette();update();}});
$('showWalls').onchange=draw;$('showRoof').onchange=draw;$('finishView').onclick=()=>{finishing=!finishing;$('showWalls').checked=true;$('showRoof').checked=finishing;$('finishView').textContent=finishing?'組み立てに戻る':'完成の姿を見る';hover=null;fit();};
$('starter').onclick=()=>{remember();model=K.sample(false);update();fit();};
$('newDesign').onclick=()=>{
 if(reference)return;
 remember();
 model=K.empty();
 level=0;
 kind='floor';
 group='床';
 mode='move';
 finishing=false;
 selectedFurniture=hover=gesture=grabbing=null;
 $('showWalls').checked=true;
 $('showRoof').checked=false;
 document.querySelectorAll('[data-level]').forEach(b=>b.classList.toggle('active',b.dataset.level==='0'));
 palette();
 $('plan').click();
 update();
 toast('新しい設計を始めました。前の設計は「元に戻す」で復元できます。');
};
function gallery(){$('sampleDialog').showModal();}$('sample').onclick=()=>reference?returnWork():gallery();
function previewHouse(next){
  reference={model,undoStack,redoStack,level,finishing,roof:$('showRoof').checked,walls:$('showWalls').checked};
  model=next;
  level=0;
  document.querySelectorAll('[data-level]').forEach(b=>b.classList.toggle('active',b.dataset.level==='0'));
  finishing=false;
  $('showWalls').checked=true;
  $('showRoof').checked=false;
  $('cutWalls').checked=true;
  hover=gesture=null;
  $('sampleDialog').close();
  $('plan').click();
  update();
  $('returnWork').focus();
}
for(const [button,advanced] of [['previewSample',false],['advancedSample',true]])$(button).onclick=()=>previewHouse(K.furnishedSample(advanced));

function returnWork(){
 if(!reference)return;
 ({model,undoStack,redoStack,level,finishing}=reference);
 $('showRoof').checked=reference.roof;
 $('showWalls').checked=reference.walls;
 reference=null;
 document.querySelectorAll('[data-level]').forEach(b=>b.classList.toggle('active',Number(b.dataset.level)===level));
 $('iso').click();
 update();
 $('sample').focus();
}
$('returnWork').onclick=returnWork;
$('useSample').onclick=()=>{if(!reference)return;const next=model;model=reference.model;undoStack=reference.undoStack;redoStack=reference.redoStack;reference=null;remember();model=next;finishing=false;$('showRoof').checked=false;group='壁';kind='wall';mode='move';palette();update();fit();};
$('title').onchange=()=>{if(reference)return;remember();model.name=$('title').value.trim().slice(0,100)||'わたしのブロックハウス';update();};
function download(name,contents,type){const u=URL.createObjectURL(new Blob([contents],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('save').onclick=()=>download(model.name.replace(/[\\/:*?"<>|]/g,'_')+'.json',JSON.stringify(model,null,2),'application/json');$('open').onclick=()=>$('file').click();$('file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2e6)throw Error('2MB以下のファイルを選んでください');const next=K.validate(JSON.parse(await file.text()));if(reference)returnWork();remember();model=next;update();fit();}catch(e){toast(e.message+'。以前のCADのデータは、以前のCADから開けます。');}finally{$('file').value='';}};
function counts(){const result=new Map();for(const p of model.parts){const key=K.specs[p.kind].name+' / '+p.material;result.set(key,(result.get(key)||0)+1);}return [...result];}
$('inventory').onclick=()=>{$('inventoryContent').replaceChildren();const table=document.createElement('table');for(const [name,n] of counts()){const tr=table.insertRow();tr.insertCell().textContent=name;tr.insertCell().textContent=n+'個';}$('inventoryContent').append(table);$('inventoryDialog').showModal();};$('csv').onclick=()=>download('パーツ数量表.csv','\uFEFFパーツ,数量\r\n'+counts().map(([s,n])=>'"'+s.replaceAll('"','""')+'",'+n).join('\r\n'),'text/csv;charset=utf-8');document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const dpi=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpi);canvas.height=Math.round(height*dpi);ctx.setTransform(dpi,0,0,dpi,0,0);fit();}).observe($('stage'));
$('build').hidden=true;$('move').textContent='✋ つかんで組む';$('metal').disabled=false;$('metal').title='ヒノキの柱・梁を使う';palette();update();

function carryPosition(e){const r=canvas.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;}
function cancelCarry(){carrying=null;hover=null;$('dragChip').hidden=true;document.body.classList.remove('is-carrying');draw();}
$('pieces').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-kind]');if(!b||e.button!==0)return;if(reference)return toast('「この家からつくる」で編集を始めてください');e.preventDefault();kind=b.dataset.kind;group=K.specs[kind].category;mode='move';finishing=false;gesture=null;grabbing=null;carrying={kind,before:JSON.stringify(model),pointerId:e.pointerId};document.body.classList.add('is-carrying');$('dragChip').textContent=K.specs[kind].icon+' '+K.specs[kind].name;$('dragChip').hidden=false;$('dragChip').style.left=e.clientX+16+'px';$('dragChip').style.top=e.clientY+12+'px';if(kind==='roof')$('showRoof').checked=true;b.setPointerCapture(e.pointerId);draw();});
document.addEventListener('pointermove',e=>{if(!carrying||carrying.pointerId!==e.pointerId)return;e.preventDefault();$('dragChip').style.left=e.clientX+16+'px';$('dragChip').style.top=e.clientY+12+'px';if(carryPosition(e))refreshHover(pointer(e));else{hover=null;$('connection').textContent='光る接続先まで運んで、離そう';}draw();},{passive:false});
document.addEventListener('pointerup',e=>{if(!carrying||carrying.pointerId!==e.pointerId)return;const held=carrying;selectedFurniture=null;if(carryPosition(e)){refreshHover(pointer(e));if(hover&&!hover.error){K.place(model,held.kind,hover.target,rotation,material,timber);if(held.before!==JSON.stringify(model)){remember(held.before);toast(K.specs[held.kind].name+'がはまりました');}}else if(hover?.error)toast(hover.error);}cancelCarry();palette();update();});
document.addEventListener('pointercancel',()=>{if(carrying){cancelCarry();update();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&carrying){cancelCarry();update();}});

$('wood').textContent='杉';$('metal').textContent='ヒノキ';for(const [id,value] of [['wood','sugi'],['metal','hinoki']])$(id).onclick=()=>{material='木材';timber=value;$('wood').classList.toggle('active',value==='sugi');$('metal').classList.toggle('active',value==='hinoki');};
