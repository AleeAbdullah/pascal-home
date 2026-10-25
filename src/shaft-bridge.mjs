// Room review 2026-10-26: the architect's timber bridge across the open-to-sky shaft (ground and first floor)
// plus the ground-floor shaft planting. Dimensions are traced from the architect floor plans (display pt -> model inches).
// Shaft wall centrelines x 433.5 / 514.5; clear x 438..510. Bridge deck z 444.45..516.45 (the two facing W11 windows).
import {palette} from './interior-v1.mjs';
import {guardCode,paramCode} from './588-exterior.mjs';
export const inch=x=>Number((x*.0254).toFixed(8));
export const ownerDecision='Room review 2026-10-26: architect bridge across the shaft';
export const review='2026-10-26';
export const deck={x0:438,x1:510,z0:444.45,z1:516.45,cx:474,cz:480.45,width:72,depth:72};
export const levels={ground:'level_as4e3a9d57',first:'level_as4d3a9bc4'};
const helper=`import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const palette=${JSON.stringify({...palette,oak:['#a98764',.68,0]})};
export default function build({params:p,THREE:T}){
const g=new T.Group(), mats={};
const D=(p.detail??1)>=.5, S=(p.shadows??1)>=.5;
function mat(k){if(!mats[k]){const [color,roughness,metalness]=palette[k];mats[k]=new T.MeshStandardMaterial({color,roughness,metalness});mats[k].name='slot_'+k;}return mats[k]}
function part(name){const q=new T.Group();q.name='part:'+name;g.add(q);return q}
function mesh(q,geo,k,x,y,z){const m=new T.Mesh(geo,mat(k));m.position.set(x,y,z);m.castShadow=S;m.receiveShadow=true;q.add(m);return m}
function box(q,w,h,d,x,y,z,k,r=.01){return mesh(q,D&&Math.min(w,h,d)>.02?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d),k,x,y,z)}
function cyl(q,r,h,x,y,z,k,r2=r){return mesh(q,new T.CylinderGeometry(r,r2,h,D?40:16),k,x,y,z)}
function ball(q,w,h,d,x,y,z,k){const m=mesh(q,new T.SphereGeometry(1,D?20:10,D?14:7),k,x,y,z);m.scale.set(w/2,h/2,d/2);return m}
function line(q,points,r,k){const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));return mesh(q,new T.TubeGeometry(curve,D?20:8,r,D?8:5,false),k,0,0,0)}
`;
const source=(body,params)=>`export const params=${JSON.stringify({...Object.fromEntries(Object.entries(params).map(([k,v])=>[k,{default:v,min:0,max:50,step:.001}])),detail:{default:1,min:0,max:1,step:1},shadows:{default:1,min:0,max:1,step:1}})};export const mount="floor";\n${helper}\n${body}\nreturn g;}`;
// Walnut boards at a 3 in pitch running along the shaft (z), bronze joists and thin fascia, stone entry tread on the lounge side.
export const deckCode=source(`const bd=part('walnut_boards'),fr=part('bronze_frame'),st=part('stone_step');
const W=p.width,Dp=p.depth,n=Math.max(1,Math.round(W/.0762)),pitch=W/n;
for(let i=0;i<n;i++)box(bd,pitch-.006,.035,Dp,-W/2+(i+.5)*pitch,-.0175,0,'walnut',.004);
for(const x of [-W/2+.05,-W/4,0,W/4,W/2-.05])box(fr,.06,.08,Dp-.03,x,-.075,0,'bronze',.004);
for(const s of [-1,1])box(fr,W,.12,.012,0,-.06,s*(Dp/2-.006),'bronze',.003);
if(p.stepLength>0)box(st,p.stepLength,p.stepRise,Dp,-W/2-p.stepLength/2,-p.stepRise*1.5,0,'stone',.006);`,{width:inch(72),depth:inch(72),stepLength:0,stepRise:inch(6)});
export const treeCode=source(`const bed=part('planting_bed'),tr=part('trunk_and_limbs'),cn=part('canopy');
const R=p.radius,H=p.height,B=p.bed,bh=p.bedHeight;
cyl(bed,B,bh,0,bh/2,0,'stone',B+.015);cyl(bed,B-.07,.02,0,bh-.01,0,'charcoal');
line(tr,[[0,bh,0],[.03,bh+H*.2,-.02],[.0,bh+H*.4,.03]],.1,'walnut');
const tops=[];for(let i=0;i<6;i++){const a=i*1.0472+.3,rr=R*(.45+.12*(i%2)),y=bh+H*(.66+.08*(i%3));tops.push([Math.cos(a)*rr,y,Math.sin(a)*rr]);line(tr,[[0,bh+H*.38,0],[Math.cos(a)*rr*.45,bh+H*.5,Math.sin(a)*rr*.45],[Math.cos(a)*rr,y,Math.sin(a)*rr]],.028,'walnut');}
for(let i=0;i<tops.length;i++){const [x,y,z]=tops[i];ball(cn,R*.78,H*.2,R*.78,x,y+H*.06,z,i%2?'sage':'leaf');ball(cn,R*.6,H*.16,R*.6,x*.55,y+H*.17,z*.55,i%2?'leaf':'sage');}
ball(cn,R*.9,H*.2,R*.9,0,bh+H*.78,0,'leaf');`,{radius:inch(28.5),height:inch(138),bed:inch(31),bedHeight:inch(10)});
// Five round planters traced from the plan circles: two shrubs (radial leaf symbol) and three low mounds. Positions are local (x east, z south of item origin).
export const plantersCode=source(`const pots=part('planters'),fo=part('foliage');
const list=[[-.3708,-.1016,1],[.5766,-.1016,1],[.1143,-.2286,0],[.2794,.1778,0],[-.6147,.127,0]];
for(const [x,z,k] of list){cyl(pots,.215,.4,x,.2,z,'ivory',.18);cyl(pots,.19,.008,x,.396,z,'charcoal');
 if(k===1){for(let i=0;i<9;i++){const a=i*2.4,h=.7+(i%3)*.16,dx=Math.cos(a)*.15,dz=Math.sin(a)*.15;line(fo,[[x,.4,z],[x+dx*.5,.4+h*.6,z+dz*.5],[x+dx,.4+h,z+dz]],.006,'leaf');const l=ball(fo,.16,.5,.03,x+dx,.4+h+.15,z+dz,i%2?'leaf':'sage');l.rotation.set(.45*Math.cos(a),a,.45*Math.sin(a));}}
 else{ball(fo,.4,.28,.4,x,.5,z,'sage');ball(fo,.28,.22,.28,x+.04,.62,z-.03,'leaf');}}`,{});
export const plantersModule=plantersCode;
export const tree={key:'bridge-gf-shaft-tree',name:'Open-to-sky shaft · tree',x:473.4,z:382,note:'Architect ground plan: large tree symbol in the shaft north of the bridge, canopy x 445..502, z 353..411 in. Plant form is an Interior V1-style authored object (walnut limbs, sage/leaf canopy, stone bed).'};
export const planters={key:'bridge-gf-shaft-planters',name:'Open-to-sky shaft · planters',x:472,z:540,note:'Architect ground plan: five round planters south of the bridge, z 522.5..555.6 in (two shrubs, three low mounds). Interior V1-style pots and foliage.'};
export const bridgeObjects=(level)=>level==='ground'
 ?[{key:'bridge-gf-deck',name:'Shaft bridge · walnut deck + lounge entry step',code:deckCode,params:{width:inch(72),depth:inch(72),stepLength:inch(9),stepRise:inch(6)},x:deck.cx,z:deck.cz,note:'Architect ground plan: timber-boarded bridge x 438..510, z 444.45..516.45 in (72 x 72); boards run N-S, 3 in pitch. Deck top at the lobby floor (+18 in plan = 0 in model); lounge floor is 12 in lower, so two 6 in risers: one stone tread in the lounge-east wall thickness (x 429..438, top -6 in) then the deck.'}]
 :[{key:'bridge-ff-deck',name:'Shaft bridge · walnut deck (first floor)',code:deckCode,params:{width:inch(72),depth:inch(72),stepLength:0,stepRise:inch(6)},x:deck.cx,z:deck.cz,note:'Architect first-floor plan: BRIDGE across the open-to-sky shaft between its two OPEN TO SKY areas, x 438..510, z 444.45..516.45 in; deck top at first-floor level (0).'}];
export const guardKeys=level=>[['bridge-'+(level==='ground'?'gf':'ff')+'-guard-north',deck.z0],['bridge-'+(level==='ground'?'gf':'ff')+'-guard-south',deck.z1]];
// Openings replacing the two facing W11 (ground) / W11 + W14 (first) windows. Each is {key,wall,windowId,centre,width,height,...}.
export const openingSpecs={
 ground:[
  {key:'passages-0-12',wallId:'wall_as1e46695c',windowId:'window_5si9h4tnu9h85s93',centre:480.45,width:72,height:96,name:'Bridge opening · GF lounge-east',basis:'Replaces lounge-east W11 (z 444.45..516.45); bridge connects lounge to lobby; opening bottom at the deck level (lobby +18 in)'},
  {key:'passages-0-13',wallId:'wall_asb9aa1d96',windowId:'window_zkiyqfztesffewnm',centre:480.45,width:72,height:96,name:'Bridge opening · GF shaft-east',basis:'Replaces shaft-east W11 (z 444.45..516.45); bridge lands in the lobby at +18 in'}],
 first:[
  {key:'passages-1-14',wallId:'wall_588_ff_lounge_shaft_west_1',windowId:'window_2t38k3h68cewcifw',centre:473.94,width:60,height:96,name:'Bridge opening · FF lounge-shaft-west',basis:'Replaces W14 (5 ft, z 443.9..503.9) in the first-floor lounge wall; wall seam at z 508 prevents the full 72 in'},
  {key:'passages-1-15',wallId:'wall_588_ff_shaft_east_1',windowId:'window_8uyhwwcqs4mgx88r',centre:480.45,width:72,height:96,name:'Bridge opening · FF shaft-east',basis:'Replaces W11 (z 444.45..516.45) in ff-shaft-east'}]};
export const meta=(extra={})=>({sourceFile:'588 - M1 (Checked by Building Control).pdf',blueprintReview:review,ownerDecision,...extra});
// ---- runner (idempotent). `call` is the caller's throttled MCP wrapper. ----
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function runBridge({call,level}){
 let scene=await call('get_scene');const lid=levels[level];
 await call('design_brief',{source:'open',vision:'Owner room-review decision: the architect bridge across the open-to-sky shaft (timber deck, glass guards, planting) exactly as drawn on the architect floor plans. No other dressing.',axes:Object.fromEntries(['action','size','pieces','openings','style','materials','dressing'].map(k=>[k,{kind:'bounded',extent:'exact',quote:'Add the architect bridge across the shaft plus the shaft trees and planters.',reading:'Only the drawn bridge, its guards, its wall openings and the drawn planting.'}])),beyond:Object.fromEntries(['textiles','light','windows','walls','floor','plants','objects','smallFurniture'].map(k=>[k,{none:'Nothing beyond the architect drawing.'}]))});
 await sleep(1000);
 // 1. openings
 const ref=scene.nodes['door_cd6t1e19xe7wcdic'];const skip=new Set(['object','id','type','parentId','wallId','position','rotation','width','height','metadata','name','children','visible']);
 const copy=Object.fromEntries(Object.entries(ref).filter(([k])=>!skip.has(k)));
 for(const o of openingSpecs[level]){
  scene=await call('get_scene');
  const w=scene.nodes[o.wallId];const start=w.start[1]/.0254,end=w.end[1]/.0254;
  if(scene.nodes[o.windowId])await call('apply_patch',{patches:[{op:'delete',id:o.windowId,cascade:false}]});
  scene=await call('get_scene');
  let n=Object.values(scene.nodes).find(x=>x.type==='door'&&x.metadata?.sourceOpening===o.key);
  if(!n){
   await call('add_door',{wallId:o.wallId,t:(o.centre-start)/(end-start),width:inch(o.width),height:inch(o.height),openingKind:'opening'});
   const after=await call('get_scene');n=Object.values(after.nodes).find(x=>x.type==='door'&&!scene.nodes[x.id]&&x.parentId===o.wallId);if(!n)throw Error('Missing new opening '+o.key);scene=after;
  }
  await call('apply_patch',{patches:[{op:'update',id:n.id,data:{...copy,threshold:false,thresholdHeight:0,name:o.name,width:inch(o.width),height:inch(o.height),position:[inch(o.centre-start),inch(o.height/2),0],metadata:{...n.metadata,...meta({sourceOpening:o.key,sourceTag:'W11',correctionBasis:o.basis,positionBasis:'Architect floor plan: bridge jambs',widthBasis:'Architect floor plan',heightBasis:'96 in (existing window head 102 in)',replacedWindow:o.windowId})}}}]});
  console.log('opening',o.key,n.id);
 }
 // 2. authored objects (deck / planting) and guards, keyed so reruns update in place
 const brief=(k)=>k;
 const objects=bridgeObjects(level);if(level==='ground')objects.push({key:tree.key,name:tree.name,code:treeCode,params:{radius:inch(28.5),height:inch(138),bed:inch(31),bedHeight:inch(10)},x:tree.x,z:tree.z,note:tree.note},{key:planters.key,name:planters.name,code:plantersModule,params:{},x:planters.x,z:planters.z,note:planters.note,raw:true});
 for(const g of guardKeys(level))objects.push({key:g[0],name:g[0]+' · glass guard',code:paramCode(guardCode,{width:inch(72),height:inch(42)}),params:{width:inch(72),height:inch(42)},x:deck.cx,z:g[1],note:'42 in glass guard on the open side of the shaft bridge, glass plane on the deck edge z='+g[1]+' in, x 438..510; same guard code as ff-stair-front.',raw:true,guard:true});
 for(const o of objects){
  scene=await call('get_scene');
  const old=Object.values(scene.nodes).find(n=>n.type==='item'&&n.metadata?.bridgeKey===o.key);
  const code=o.key===planters.key?plantersModule:o.code;const params=o.key===planters.key?{}:o.params;
  const r=await call('add_object',{...(old?{nodeId:old.id}:{}),name:o.name,code,params,parentId:lid,position:[inch(o.x),0,inch(o.z)],rotation:0,category:o.guard?'architectural detail':'landscape',tags:o.guard?['bridge']:['bridge','shaft'],description:o.note.slice(0,200),reason:'Owner room review: the architect drew this bridge/planting in the open-to-sky shaft; no Pascal tool or catalog item builds it.'});
  await sleep(1000);scene=await call('get_scene');
  const id=old?.id??r.nodeId??r.id??Object.values(scene.nodes).find(n=>n.type==='item'&&n.name===o.name)?.id;if(!id)throw Error('No item id '+o.key);
  await call('apply_patch',{patches:[{op:'update',id,data:{metadata:{...scene.nodes[id].metadata,...meta({bridgeKey:o.key,correctionBasis:o.note,undimensioned:'PDF trace or explicitly labeled owner-authorized assumption; not surveyed or engineered'})}}}]});
  console.log('object',o.key,id);
 }
 // 3. reuse the scene's existing exact materials for every slot the new objects share with the Interior V1 items
 scene=await call('get_scene');const refs={};
 for(const n of Object.values(scene.nodes))if(n.type==='item'&&(n.metadata?.interiorV1Key||n.metadata?.groundInteriorV1Key))for(const [k,v] of Object.entries(n.slots??{}))refs[k]??=v;
 const patches=[];
 for(const n of Object.values(scene.nodes))if(n.type==='item'&&n.metadata?.bridgeKey&&!n.metadata.bridgeKey.includes('guard')&&n.parentId===lid){
  const slots={...n.slots};for(const k of Object.keys(slots))if(refs[k])slots[k]=refs[k];patches.push({op:'update',id:n.id,data:{slots}});}
 if(patches.length)await call('apply_patch',{patches});
}
