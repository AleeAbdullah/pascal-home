import {items as ground,palette,projectId} from './ground-floor-interior-v1.mjs';
import {items as lounge} from './interior-v1.mjs';
export {palette,projectId};
export const levelId='level_as4d3a9bc4', supportSlabId='slab_588_ff_main';
export const rooms={
 master:['zone_0003hs4xwvjxbe6j','ceiling_as56235a9f',2.28,9.1],bed2:['zone_0001ern08dd2pdhi','ceiling_as33b8e98f',10.55,2.58],rearBed:['zone_00016gfrosg8i69a','ceiling_as2eb8e1b0',21.26,6.18],frontMaster:['zone_hucok6x506v3n6lx',null,20.38,13.60],
 masterCloset:['zone_jzaa3xlczpfl4xgf','ceiling_cpl7fhs127dqjwb5',2.28,3.98],closet2:['zone_bi1svik5z032webx','ceiling_cixusyvyr3azyr2n',6.25,3.92],rearCloset:['zone_0000foxvmn79q7gk','ceiling_as31b8e669',22.66,3.22],frontCloset:['zone_00018e375yoxdxzu','ceiling_as35b8ecb5',19.78,9.67],
 masterBath:['zone_0002r4qhy8azxspn','ceiling_as5b23627e',2.28,1.28],bath2:['zone_00019fkyt9hvq6xh','ceiling_as3ab8f494',6.25,1.22],rearBath:['zone_0000evaprx3adrz3','ceiling_as30b8e4d6',22.66,1.05],frontBath:['zone_0002e28una64iqah','ceiling_as2fb8e343',22.18,9.67],
 lounge:['zone_f0r1by0mpfy2ayxp','ceiling_7sadoifxgql85zav',7.85,9.97],hall:['zone_i7n5ppporimr3o3z','ceiling_bzrnelkbztvjs1q1',12,6.16],console:['zone_fj6oo1p0c5g64q6p','ceiling_cjocl6pjpl9jco4l',12.04,7.65],kitchen:['zone_0000r13b0ok25v3x','ceiling_as34b8eb22',19.4,2.8]
};
const code=(key)=>{const item=ground.find(x=>x.key===key)??lounge.find(x=>x.key===key);if(!item)throw Error(key);return item.code.replace(/"(\w+)":\{"default":([\d.e-]+),"min":[\d.e-]+,"max":[\d.e-]+/g,(all,k,d)=>k==='detail'||k==='shadows'?all:`"${k}":{"default":${d},"min":0.1,"max":15`)};
export const items=[];
function add(room,key,label,template,x,z,rotation=0,params={},y=0,mount='floor'){
 let src=code(template),parentId=levelId;
 if(mount==='ceiling')parentId=rooms[room][1];
 if(!parentId)throw Error('Missing ceiling '+room);
 items.push({key:room+'-'+key,room,name:'V1 · first floor · '+label,code:src,parentId,position:[x,y,z],rotation,params});return items.at(-1);
}
const floor=(...args)=>add(...args);
function ceil(room,key,label,template,x,z,params={},rotation=0,y=0){return add(room,key,label,template,x,z,rotation,params,y,'ceiling')}
// Reuse the established design language as separately editable objects, never the ground-floor nodes.
for(const old of ground.filter(x=>['master','masterBath','masterCloset','bath2'].includes(x.room))){
 const {key,room,...spec}=old;items.push({...spec,key,room,name:old.name.replace('V1 ·','V1 · first floor ·'),params:{...old.params},position:[...old.position],parentId:old.parentId===ground[0].parentId?levelId:rooms[room][1]});
}
// Align master storage to the slightly deeper first-floor closet.
{const w=items.find(x=>x.key==='masterCloset-wardrobe');w.position[0]=4.36;w.position[2]=3.8;} // flush to the 4.5 in partition, clear of the PDF closet-door keep-out (blueprint review 2026-10-25)
// Bedroom 02: north headwall leaves the long east window open.
floor('bed2','head','bedroom two padded headwall','bed2-head',10.55,.065,0,{width:3.0,height:2.9});
floor('bed2','bed','bedroom two upholstered king bed','bed2-bed',10.55,1.25,0,{width:2.05,depth:2.22},.019);
floor('bed2','rug','bedroom two woven rug','lounge-rug',10.55,2.05,0,{width:3.8,depth:3.6});
for(const [i,x]of [9.10,12.0].entries()){floor('bed2','night'+i,'bedroom two bedside '+(i+1),'master-night0',x,.39,0,{width:.55},.019);floor('bed2','lamp'+i,'bedroom two bedside globe '+(i+1),'master-lamp0',x,.39,0,{},.529)}
floor('bed2','tv','bedroom two media console','bed2-tv',11.1,4.99,180,{width:1.75,depth:.28});
floor('bed2','chair','bedroom two reading chair','armchair-n',12.3,3.65,-90,{},.019);
floor('bed2','plant','bedroom two planter','plant',8.3,.5);
ceil('bed2','drapes','bedroom two east drapes','curtain',13.05,2.6,{width:4.7,height:3.45},90,-.16);
ceil('bed2','cove','bedroom two ceiling cove','cove',10.55,2.58,{width:5.05,depth:4.95});
ceil('bed2','pendant','bedroom two globe pendant','master-pendant',10.55,3.2,{drop:.9});
// Rear bedroom: clear both its west entry and northern closet passage.
floor('rearBed','head','rear bedroom headwall','guest-head',20.44,4.39,0,{width:2.6,height:2.7});
floor('rearBed','bed','rear upholstered queen bed','guest-bed',20.44,5.55,0,{width:1.8,depth:2.18},.019);
floor('rearBed','rug','rear bedroom rug','lounge-rug',20.55,6.0,0,{width:2.9,depth:2.75});
for(const [i,x]of [19.19,21.69].entries()){floor('rearBed','night'+i,'rear bedside '+(i+1),'master-night0',x,4.68,0,{width:.40},.019);floor('rearBed','lamp'+i,'rear reading globe '+(i+1),'master-lamp0',x,4.68,0,{},.529)}
floor('rearBed','tv','rear bedroom media console','guest-tv',21.9,7.87,180,{width:1.6,depth:.25});
ceil('rearBed','drapes','rear bedroom east drapes','curtain',23.5,6.35,{width:2.9,height:3.45},90,-.16); // shortened north of the PDF rear-closet opening keep-out
ceil('rearBed','cove','rear bedroom ceiling cove','cove',21.26,6.18,{width:4.4,depth:3.53});
ceil('rearBed','pendant','rear bedroom globe pendant','master-pendant',21.5,6.4,{drop:.85});
// Front master has a retained terrace slab overhead, not an auto ceiling. Mount decorative pieces from its measured 3.6576 m underside.
// Bed group re-centred on the 9 ft 8 in of north wall east of the PDF front-closet opening (blueprint review 2026-10-25).
floor('frontMaster','head','front master padded headwall','master-head',22.06,11.35,0,{width:2.8,height:2.9});
floor('frontMaster','bed','front master upholstered king bed','master-bed',22.06,12.55,0,{width:1.9,depth:2.22},.019);
floor('frontMaster','rug','front master bedroom rug','lounge-rug',22.0,13.15,0,{width:3.0,depth:3.5});
for(const [i,x]of [20.795,23.325].entries()){floor('frontMaster','night'+i,'front master bedside '+(i+1),'master-night0',x,11.64,0,{width:.33},.019);floor('frontMaster','lamp'+i,'front master globe '+(i+1),'master-lamp0',x,11.64,0,{},.529)}
floor('frontMaster','desk','front master writing desk','bed2-desk',17.53,14.95,90,{width:1.35,depth:.45});
floor('frontMaster','desk-chair','front master desk chair','chair-n0',18.32,14.95,-90,{},.019);
floor('frontMaster','reading','front master lounge chair','armchair-n',19.5,14.6,45,{},.019);
floor('frontMaster','lamp','front master reading lamp','floor-lamp',18.85,15.58);
floor('frontMaster','art','front master abstract art','art',17.26,14.95,90,{},1.25);
floor('frontMaster','plant','front master planter','plant',22.95,15.35);
const fc=floor('frontMaster','cove','front master perimeter cove','cove',20.38,13.6,0,{width:6.12,depth:4.42},3.4876);fc.code=fc.code.replace('mount="ceiling"','mount="floor"');
const fd=floor('frontMaster','drapes','front master south drapes','curtain',20.38,15.78,0,{width:6.1,height:3.45},.0376);fd.code=fd.code.replace('mount="ceiling"','mount="floor"');
const fp=floor('frontMaster','pendant','front master sculptural pendant','master-pendant',21.95,14.35,0,{drop:1.0},2.5126);fp.code=fp.code.replace('mount="ceiling"','mount="floor"');
// Closets retain straight through-routes; sliding fronts avoid leaf conflicts.
floor('closet2','west','bedroom two west wardrobe','closet2-west',5.13,4.25,90,{width:1.50,height:2.65,depth:.6});
floor('closet2','east','bedroom two east wardrobe','closet2-west',6.4,4.845,180,{width:1.35,height:2.65,depth:.6}); // south wall: the PDF puts closet 2's door in the east wall (blueprint review 2026-10-25)
floor('rearCloset','wardrobe','rear closet sliding wardrobe','masterCloset-wardrobe',23.675,3.05,-90,{width:1.5,height:2.65,depth:.6}); // north of the PDF rear-closet opening keep-out
floor('rearCloset','dresser','rear closet shallow drawer unit','masterCloset-dresser',21.48,3.22,90,{width:1.1,height:.85,depth:.40});
floor('frontCloset','wardrobe','front closet sliding wardrobe','masterCloset-wardrobe',19.29,9.67,90,{width:1.65,height:2.65,depth:.55});
// Four independently editable bathroom suites.
floor('rearBath','vanity','rear bath illuminated vanity','masterBath-vanity',21.75,.30,0,{width:.85,depth:.50},.32);
floor('rearBath','wc','rear bath wall-hung toilet','masterBath-wc',22.60,.38);
floor('rearBath','shower','rear bath glass shower','masterBath-shower',23.48,1.58,180,{width:1.02,depth:1.0});
floor('frontBath','vanity','front bath illuminated vanity','masterBath-vanity',22.0,8.49,0,{width:1.55,depth:.5},.32);
floor('frontBath','wc','front bath wall-hung toilet','masterBath-wc',21.25,10.72,180);
floor('frontBath','shower','front bath glass shower','masterBath-shower',22.98,10.42,180,{width:1.1,depth:1.1});
for(const [room,x,z]of [['rearBath',21.47,.40],['frontBath',21.43,8.59]])floor(room,'accessories',room+' towels and toiletries','masterBath-accessories',x,z,0,{},.79);
for(const room of ['closet2','rearCloset','frontCloset','rearBath','frontBath']){const[,,x,z]=rooms[room];ceil(room,'lights',room+' downlights','masterBath-lights',x,z,{count:2,spacing:.85});}
// Family lounge: west media wall, east sofa and two southern chairs; north cross-circulation stays open.
floor('lounge','media','family lounge stone and walnut media wall','media',5.03,9.65,90);
floor('lounge','sofa','family lounge ivory sofa','sofa',9.82,9.6,-90,{width:2.85,depth:1.0},.019);
floor('lounge','rug','family lounge woven rug','lounge-rug',7.85,9.85,0,{width:4.9,depth:4.45});
floor('lounge','coffee','family lounge stone coffee table','coffee',7.85,9.5,90,{width:1.5,depth:.85},.019);
floor('lounge','decor','family lounge ceramics and books','coffee-decor',7.85,9.5,90,{},.3823);
for(const[i,x]of[6.8,8.7].entries())floor('lounge','chair'+i,'family conversation chair '+(i+1),'armchair-n',x,11.65,180,{},.019);
floor('lounge','lamp','family lounge reading lamp','floor-lamp',9.75,11.85);
floor('lounge','plant','family lounge planter','plant',5.45,12.05);
ceil('lounge','drapes-s','family lounge south drapes','curtain',7.85,12.65,{width:5.75,height:3.45},0,-.16);
ceil('lounge','drapes-e','family lounge east drapes','curtain',10.77,10.5,{width:4.2,height:3.45},90,-.16);
ceil('lounge','cove','family lounge ceiling cove','cove',7.85,9.97,{width:5.9,depth:5.45});
ceil('lounge','pendant','family lounge globe cluster','master-pendant',7.85,9.5,{drop:1.15});
floor('console','desk','passage oak console','lobby-console',12.04,7.99,180,{width:1.25,depth:.25});
floor('console','decor','passage console ceramics','coffee-decor',12.04,7.99,180,{},.785);
ceil('console','lights','passage ceiling lights','masterBath-lights',12.04,7.5,{count:2,spacing:.65});
for(const[i,x]of[5.7,8.5,11.5,14.4,17.9].entries())ceil('hall','light'+i,'corridor downlight '+(i+1),'masterBath-lights',x,6.15,{count:1,spacing:.5});
for(const[i,z]of[7.9,9.8].entries())ceil('hall','east-light'+i,'east corridor downlight '+(i+1),'masterBath-lights',18.13,z,{count:1,spacing:.5});
// Kitchen is a compact east-wall galley entirely outside the secondary stair footprint.
floor('kitchen','fridge','upper kitchen refrigerator freezer','kitchen-fridge',20.72,1.90,-90,{width:.60,kind:1,height:2.35});
floor('kitchen','sink','upper kitchen sink and mixer','kitchen-sink',20.73,2.62,-90,{width:.75});
floor('kitchen','hob','upper kitchen induction and drawers','kitchen-west',20.73,3.45,-90,{width:.80});
floor('kitchen','hood','upper kitchen extractor','kitchen-hood',20.90,3.45,-90,{},1.70);
floor('kitchen','upper','upper kitchen walnut storage','kitchen-upper',20.88,2.62,-90,{width:.72,height:.8},1.8);
floor('kitchen','prep','upper kitchen preparation console','kitchen-north-left',19.30,3.80,180,{width:.90,depth:.55,height:.9});
ceil('kitchen','lights','upper kitchen task lights','masterBath-lights',19.45,2.65,{count:2,spacing:.8});
export const floorFinishes=Object.fromEntries(Object.keys(rooms).map(k=>[k,'stone']));

for(const item of items)if(['lounge-lamp','lounge-plant'].includes(item.key))item.position[1]=.019;

// Keep the closet entrance and bedside passage edges comfortably clear.
for(const item of items){
 // closet2-east and the front master bedsides are now placed directly in their specs (blueprint review 2026-10-25).
 if(item.key==='rearBed-night1'){item.position[0]=21.675;item.params.width=.38;}
 if(item.key==='rearBed-lamp1')item.position[0]=21.675;
 if(item.key==='frontMaster-lamp'){
  item.position[2]=15.52;
  item.code=item.code.replace('cyl(q,.18,.025','cyl(q,.14,.025').replace("cyl(q,.17,.23,0,1.49,0,'paper',.24)","cyl(q,.14,.23,0,1.49,0,'paper',.18)");
 }
}
