import {items as ground,palette,projectId} from './ground-floor-interior-v1.mjs';
import {items as lounge,library as loungeLibrary} from './interior-v1.mjs';
import legacy from './first-floor-legacy-templates.json' with {type:'json'};
export {palette,projectId};
export const levelId='level_as4d3a9bc4', supportSlabId='slab_588_ff_main';
export const rooms={
 master:['zone_0003hs4xwvjxbe6j','ceiling_as56235a9f',2.28,9.1],bed2:['zone_0001ern08dd2pdhi','ceiling_as33b8e98f',10.55,2.58],rearBed:['zone_00016gfrosg8i69a','ceiling_as2eb8e1b0',21.26,6.18],frontMaster:['zone_hucok6x506v3n6lx',null,20.38,13.60],
 masterCloset:['zone_jzaa3xlczpfl4xgf','ceiling_cpl7fhs127dqjwb5',2.28,3.98],closet2:['zone_bi1svik5z032webx','ceiling_cixusyvyr3azyr2n',6.25,3.92],rearCloset:['zone_0000foxvmn79q7gk','ceiling_as31b8e669',22.66,3.22],frontCloset:['zone_00018e375yoxdxzu','ceiling_as35b8ecb5',19.78,9.67],
 masterBath:['zone_0002r4qhy8azxspn','ceiling_as5b23627e',2.28,1.28],bath2:['zone_00019fkyt9hvq6xh','ceiling_as3ab8f494',6.25,1.22],rearBath:['zone_0000evaprx3adrz3','ceiling_as30b8e4d6',22.66,1.05],frontBath:['zone_0002e28una64iqah','ceiling_as2fb8e343',22.18,9.67],
 lounge:['zone_f0r1by0mpfy2ayxp','ceiling_7sadoifxgql85zav',7.85,9.97],hall:['zone_i7n5ppporimr3o3z','ceiling_bzrnelkbztvjs1q1',12,6.16],console:['zone_fj6oo1p0c5g64q6p','ceiling_cjocl6pjpl9jco4l',12.04,7.65],kitchen:['zone_0000r13b0ok25v3x','ceiling_as34b8eb22',19.4,2.8]
};
const code=(key)=>{const item=ground.find(x=>x.key===key)??lounge.find(x=>x.key===key)??loungeLibrary.find(x=>x.key===key)??(legacy[key]?{code:legacy[key]}:null);if(!item)throw Error(key);return item.code.replace(/"(\w+)":\{"default":([\d.e-]+),"min":[\d.e-]+,"max":[\d.e-]+/g,(all,k,d)=>k==='detail'||k==='shadows'?all:`"${k}":{"default":${d},"min":0.1,"max":15`)};
// Terraces are not interior rooms (no floor finish or ceiling of their own); their zones only tag the planters.
export const extraRooms={rearTerrace:'zone_c3dnsyu90t8kwvnw',frontTerrace:'zone_lci8s55pg6nuywy0'};
export const items=[];
function add(room,key,label,template,x,z,rotation=0,params={},y=0,mount='floor'){
 let src=template.includes('export default')?template:code(template),parentId=levelId;
 if(mount==='ceiling')parentId=rooms[room][1];
 if(!parentId)throw Error('Missing ceiling '+room);
 items.push({key:room+'-'+key,room,name:'V1 · first floor · '+label,code:src,parentId,position:[x,y,z],rotation,params,...(extraRooms[room]?{zoneId:extraRooms[room]}:{})});return items.at(-1);
}
const floor=(...args)=>add(...args);
function ceil(room,key,label,template,x,z,params={},rotation=0,y=0){return add(room,key,label,template,x,z,rotation,params,y,'ceiling')}
// Custom pieces for the 2026-10-26 room review, built from the shared bench/plant module header.
const moduleHeader=(template)=>code(template).replace(/export const params=.*?;export const mount="(\w+)";/s,'@@PARAMS@@');
const paramSet=(o)=>'export const params='+JSON.stringify({...Object.fromEntries(Object.entries(o).map(([k,[d,mn,mx]])=>[k,{default:d,min:mn,max:mx,step:.01}])),detail:{default:1,min:0,max:1,step:1},shadows:{default:1,min:0,max:1,step:1}})+';export const mount="floor";';
const bodyAfterHelpers=(src,marker)=>src.slice(0,src.indexOf(marker));
const customModule=(template,marker,params,body)=>bodyAfterHelpers(moduleHeader(template),marker).replace('@@PARAMS@@',paramSet(params))+body+'\nreturn g;}';
// Low walnut ledge (lounge corridor edge): 16-18 in high, stone-capped.
export const ledgeCode=customModule('bench',"const q=part('upholstered_bench')",{width:[4.17,.5,8],depth:[.38,.2,.8],height:[.43,.2,.8]},"const q=part('walnut_ledge');box(q,p.width,p.height-.03,p.depth,0,(p.height-.03)/2,0,'walnut',.012);box(q,p.width+.02,.03,p.depth+.02,0,p.height-.015,0,'stone',.008);for(let i=1;i<Math.round(p.width/.55);i++)box(q,.012,p.height-.12,.01,-p.width/2+i*p.width/Math.round(p.width/.55),(p.height-.03)/2,p.depth/2+.002,'charcoal',.003);");
// Built-in walnut cabinet (front master west wall): fluted doors with bronze pulls.
export const cabinetCode=customModule('bench',"const q=part('upholstered_bench')",{width:[2.17,.5,5],depth:[.5,.2,.9],height:[2.3,1,3.2]},"const q=part('walnut_cabinet'),f=part('doors');box(q,p.width,p.height,p.depth,0,p.height/2,0,'walnut',.012);const n=Math.max(2,Math.round(p.width/.55)),dw=p.width/n;for(let i=0;i<n;i++){box(f,dw-.012,p.height-.12,.02,-p.width/2+dw*(i+.5),p.height/2,p.depth/2+.008,'walnut',.006);if(D)for(let k=1;k<5;k++)box(f,.008,p.height-.16,.008,-p.width/2+dw*i+dw*k/5,p.height/2,p.depth/2+.02,'charcoal',.002);box(f,.014,.32,.02,-p.width/2+dw*(i+(i%2?.18:.82)),1.05,p.depth/2+.03,'bronze',.004)}box(q,p.width+.01,.06,p.depth+.01,0,.03,0,'charcoal',.004);");
// Round planter with a clipped shrub (rear and front terraces).
export const planterCode=customModule('plant',"if(!D)return g;",{radius:[.26,.12,.6],height:[.45,.2,.9]},"const q=part('round_planter'),l=part('shrub'),R=p.radius,H=p.height;cyl(q,R,H,0,H/2,0,'ivory',R*.86);cyl(q,R*.92,.012,0,H-.006,0,'walnut');ball(l,R*1.7,R*1.25,R*1.7,0,H+R*.55,0,'leaf');if(D)for(let i=0;i<8;i++){const a=i*.785+.3;ball(l,R*.8,R*.6,R*.8,Math.cos(a)*R*.62,H+R*.5+(i%2)*.07,Math.sin(a)*R*.62,i%2?'sage':'leaf')}");
// Reuse the established design language as separately editable objects, never the ground-floor nodes.
// Room review 2026-10-26: the first-floor master suite, bathroom 2 and closet 2 follow the ground-floor suite layouts (architect plans are identical).
for(const old of ground.filter(x=>['master','masterBath','masterCloset','bath2','closet2'].includes(x.room)&&x.key!=='closet2-lights')){
 const {key,room,...spec}=old;items.push({...spec,key,room,name:old.name.replace('V1 ·','V1 · first floor ·'),params:{...old.params},position:[...old.position],parentId:old.parentId===ground[0].parentId?levelId:rooms[room][1]});
}
// Bedroom 02: north headwall leaves the long east window open.
floor('bed2','head','bedroom two padded headwall','bed2-head',10.55,.065,0,{width:3.0,height:2.9});
floor('bed2','bed','bedroom two upholstered king bed','bed2-bed',10.55,1.25,0,{width:2.05,depth:2.22},.019);
floor('bed2','rug','bedroom two woven rug','lounge-rug',10.55,2.05,0,{width:3.8,depth:3.6});
for(const [i,x]of [9.10,12.0].entries()){floor('bed2','night'+i,'bedroom two bedside '+(i+1),'master-night0',x,.39,0,{width:.55},.019);floor('bed2','lamp'+i,'bedroom two bedside globe '+(i+1),'master-lamp0',x,.39,0,{},.529)}
floor('bed2','tv','bedroom two media console','bed2-tv',10.553,4.99,180,{width:2.44,depth:.28});
floor('bed2','bench','bedroom two bench at the foot of the bed','master-bench',10.55,2.66,0,{width:1.47,depth:.46},.019);
floor('bed2','sofa','bedroom two three-seat sofa on the west wall','bed2-sofa',8.38,2.21,90,{width:2.31,depth:.84},.019);
floor('bed2','plant','bedroom two planter','plant',8.3,.5);
ceil('bed2','drapes','bedroom two east drapes','curtain',13.05,2.6,{width:4.7,height:3.45},90,-.16);
ceil('bed2','cove','bedroom two ceiling cove','cove',10.55,2.58,{width:5.05,depth:4.95});
ceil('bed2','pendant','bedroom two globe pendant','master-pendant',10.55,3.2,{drop:.9});
// Rear bedroom: clear both its west entry and northern closet passage.
floor('rearBed','head','rear bedroom headwall','guest-head',20.84,4.39,0,{width:2.6,height:2.7});
floor('rearBed','bed','rear upholstered queen bed','guest-bed',20.84,5.55,0,{width:1.8,depth:2.18},.019);
floor('rearBed','rug','rear bedroom rug','lounge-rug',20.95,6.0,0,{width:2.9,depth:2.75});
for(const [i,x]of [19.59,22.09].entries()){floor('rearBed','night'+i,'rear bedside '+(i+1),'master-night0',x,4.68,0,{width:.40},.019);floor('rearBed','lamp'+i,'rear reading globe '+(i+1),'master-lamp0',x,4.68,0,{},.529)}
floor('rearBed','tv','rear bedroom media console','guest-tv',21.18,7.9,180,{width:2.44,depth:.25});
floor('rearBed','bench','rear bedroom bench at the foot of the bed','master-bench',20.84,6.92,0,{width:1.47,depth:.46},.019);
ceil('rearBed','drapes','rear bedroom east drapes','curtain',23.5,6.35,{width:2.9,height:3.45},90,-.16); // shortened north of the PDF rear-closet opening keep-out
ceil('rearBed','cove','rear bedroom ceiling cove','cove',21.26,6.18,{width:4.4,depth:3.53});
ceil('rearBed','pendant','rear bedroom globe pendant','master-pendant',21.5,6.4,{drop:.85});
// Front master has a retained terrace slab overhead, not an auto ceiling. Mount decorative pieces from its measured 3.6576 m underside.
// Bed group re-centred on the 9 ft 8 in of north wall east of the PDF front-closet opening (blueprint review 2026-10-25).
floor('frontMaster','head','front master padded headwall','master-head',22.06,11.35,0,{width:2.8,height:2.9});
floor('frontMaster','bed','front master upholstered king bed','master-bed',22.06,12.55,0,{width:1.9,depth:2.22},.019);
floor('frontMaster','rug','front master bedroom rug','lounge-rug',22.0,13.15,0,{width:3.0,depth:3.5});
for(const [i,x]of [20.795,23.325].entries()){floor('frontMaster','night'+i,'front master bedside '+(i+1),'master-night0',x,11.64,0,{width:.33},.019);floor('frontMaster','lamp'+i,'front master globe '+(i+1),'master-lamp0',x,11.64,0,{},.529)}
floor('frontMaster','bench','front master bench at the foot of the bed','master-bench',22.06,13.95,0,{width:1.47,depth:.46},.019);
floor('frontMaster','cabinet','front master built-in walnut cabinet (west wall, between the closet opening and door D2)',cabinetCode,19.222,12.376,90,{width:2.172,depth:.495,height:2.4});
floor('frontMaster','reading','front master lounge chair (south-west corner)','armchair-n',17.77,15.30,120,{},.019);
floor('frontMaster','side','front master round side table east of the chair','side-round',18.57,14.91,0,{width:.67,height:.5},.019);
floor('frontMaster','lamp','front master reading lamp','floor-lamp',18.85,15.58);
floor('frontMaster','art','front master abstract art','art',17.26,14.95,90,{},1.25);
floor('frontMaster','plant','front master planter','plant',22.95,15.35);
const fc=floor('frontMaster','cove','front master perimeter cove','cove',20.38,13.6,0,{width:6.12,depth:4.42},3.4876);fc.code=fc.code.replace('mount="ceiling"','mount="floor"');
const fd=floor('frontMaster','drapes','front master south drapes','curtain',20.38,15.78,0,{width:6.1,height:3.45},.0376);fd.code=fd.code.replace('mount="ceiling"','mount="floor"');
const fp=floor('frontMaster','pendant','front master sculptural pendant','master-pendant',21.95,14.35,0,{drop:1.0},2.5126);fp.code=fp.code.replace('mount="ceiling"','mount="floor"');
// Closets retain straight through-routes; sliding fronts avoid leaf conflicts.
floor('rearCloset','run-w','rear closet hanging run, full west wall','guestCloset-run-w',21.482,3.175,90,{length:1.83,depth:.44});
floor('rearCloset','run-e','rear closet hanging run, full east wall','guestCloset-run-w',23.77,3.175,-90,{length:1.83,depth:.44});
floor('frontCloset','run-n','front closet hanging run, full north wall','guestCloset-run-w',19.81,8.437,0,{length:1.676,depth:.44});
floor('frontCloset','run-w','front closet hanging run, full west wall (L with the north run)','guestCloset-run-w',19.20,9.86,90,{length:2.405,depth:.44});
// Four independently editable bathroom suites.
floor('rearBath','vanity','rear bath illuminated vanity','masterBath-vanity',21.75,.30,0,{width:.85,depth:.50},.32);
floor('rearBath','wc','rear bath wall-hung toilet (south-west, facing east)','masterBath-wc',21.66,1.73,90);
floor('rearBath','shower','rear bath full-depth walk-in shower with glass partition and door (east side)','masterBath-shower',23.476,1.076,0,{width:1.03,depth:2.15,sides:8,door:8,gap:0});
floor('frontBath','vanity','front bath round-basin vanity (north-east, east wall)','guestBath-vanity',23.24,8.98,-90,{width:1.52,depth:.61},.32);
floor('frontBath','wc','front bath wall-hung toilet (south-west compartment, facing east)','masterBath-wc',21.15,10.41,90);
floor('frontBath','screen','front bath glass partition with toilet compartment door','masterBath-wc-screen',21.40,9.759,0,{length:1.27,door:.762});
floor('frontBath','shower','front bath glass shower (south-east), head on the south wall','masterBath-shower',22.79,10.42,180,{width:1.511,depth:1.283,sides:3,door:2,gap:0});
for(const [room,x,z]of [['rearBath',21.47,.40],['frontBath',23.14,9.38]])floor(room,'accessories',room+' towels and toiletries','masterBath-accessories',x,z,0,{},.79);
for(const room of ['closet2','rearCloset','frontCloset','rearBath','frontBath']){const[,,x,z]=rooms[room];ceil(room,'lights',room+' downlights','masterBath-lights',x,z,{count:2,spacing:.85});}
// Family lounge: west media wall, east sofa and two southern chairs; north cross-circulation stays open.
floor('lounge','media','family lounge stone and walnut media wall','media',5.03,9.65,90);
floor('lounge','rug','family lounge woven rug','lounge-rug',8.1,10.0,0,{width:4.9,depth:4.45});
floor('lounge','sofa-l','family lounge ivory L-shaped corner sofa (east and south arms)','sofa-l',8.331,10.452,0,{armE:3.78,armS:3.15,depth:.914},.019);
floor('lounge','sofa-2','family lounge two-seat sofa facing south','sofa-2',7.39,8.20,0,{width:1.51,depth:.9},.019);
floor('lounge','coffee','family lounge square stone coffee table','coffee',7.57,10.15,0,{width:1.07,depth:1.07},.019);
floor('lounge','decor','family lounge ceramics and books','coffee-decor',7.57,10.15,0,{},.3823);
floor('lounge','side-ne','family lounge side table at the north-east end of the L','side-ne',9.45,8.15,0,{width:.55,height:.5},.019);
floor('lounge','side-sw','family lounge side table at the south-west end of the L','side-sw',6.27,12.04,0,{width:.55,height:.5},.019);
floor('lounge','ledge','family lounge low walnut ledge along the corridor edge (17 in high)',ledgeCode,6.985,7.112,0,{width:4.166,depth:.381,height:.43});
floor('lounge','plant','family lounge planter','plant',5.45,12.05);
ceil('lounge','drapes-s','family lounge south drapes','curtain',7.85,12.65,{width:5.75,height:3.45},0,-.16);
ceil('lounge','drapes-e','family lounge east drapes','curtain',10.77,10.5,{width:4.2,height:3.45},90,-.16);
ceil('lounge','cove','family lounge ceiling cove','cove',7.85,9.97,{width:5.9,depth:5.45});
ceil('lounge','pendant','family lounge globe cluster','master-pendant',7.85,9.5,{drop:1.15});
floor('console','desk','passage oak console','lobby-console',12.04,7.99,180,{width:1.45,depth:.25});
floor('console','decor','passage console ceramics','coffee-decor',12.04,7.99,180,{},.785);
ceil('console','lights','passage ceiling lights','masterBath-lights',12.04,7.5,{count:2,spacing:.65});
for(const[i,x]of[5.7,8.5,11.5,14.4,17.9].entries())ceil('hall','light'+i,'corridor downlight '+(i+1),'masterBath-lights',x,6.15,{count:1,spacing:.5});
for(const[i,z]of[7.9,9.8].entries())ceil('hall','east-light'+i,'east corridor downlight '+(i+1),'masterBath-lights',18.13,z,{count:1,spacing:.5});
// Kitchen is a compact east-wall galley entirely outside the secondary stair footprint.
floor('kitchen','fridge','upper kitchen refrigerator freezer','kitchen-fridge',20.72,1.90,-90,{width:.60,kind:1,height:2.35});
floor('kitchen','sink','upper kitchen sink and mixer','kitchen-sink',20.73,2.62,-90,{width:.75});
floor('kitchen','hob','upper kitchen induction and drawers','kitchen-west@legacy',20.73,3.45,-90,{width:.80});
floor('kitchen','hood','upper kitchen extractor','kitchen-hood',20.90,3.45,-90,{},1.70);
floor('kitchen','upper','upper kitchen walnut storage','kitchen-upper',20.88,2.62,-90,{width:.72,height:.8},1.8);
floor('kitchen','prep','upper kitchen preparation console','kitchen-north-left',19.30,3.80,180,{width:.90,depth:.55,height:.9});
ceil('kitchen','lights','upper kitchen task lights','masterBath-lights',19.45,2.65,{count:2,spacing:.8});
// Terraces: three round planters with shrubs along the parapet at the architect positions (page-2 vectors).
for(const [i,x] of [13.911,14.599,15.286].entries())floor('rearTerrace','planter'+i,'rear terrace round planter with shrub '+(i+1)+' (north parapet)',planterCode,x,.267,0,{radius:.26,height:.45});
for(const [i,x] of [6.289,6.977,7.666].entries())floor('frontTerrace','left-planter'+i,'front terrace (left) round planter with shrub '+(i+1)+' (south parapet)',planterCode,x,17.51,0,{radius:.26,height:.45});
for(const [i,x] of [20.645,21.333,22.022].entries())floor('frontTerrace','right-planter'+i,'front terrace (right) round planter with shrub '+(i+1)+' (south parapet)',planterCode,x,17.54,0,{radius:.26,height:.45});
export const floorFinishes=Object.fromEntries(Object.keys(rooms).map(k=>[k,'stone']));

for(const item of items)if(['lounge-lamp','lounge-plant'].includes(item.key))item.position[1]=.019;

// Keep the closet entrance and bedside passage edges comfortably clear.
for(const item of items){
 // closet2-east and the front master bedsides are now placed directly in their specs (blueprint review 2026-10-25).
 if(item.key==='rearBed-night1'){item.position[0]=22.09;item.params.width=.38;}
 if(item.key==='rearBed-lamp1')item.position[0]=22.09;
 if(item.key==='frontMaster-lamp'){
  item.position[2]=15.52;
  item.code=item.code.replace('cyl(q,.18,.025','cyl(q,.14,.025').replace("cyl(q,.17,.23,0,1.49,0,'paper',.24)","cyl(q,.14,.23,0,1.49,0,'paper',.18)");
 }
}
