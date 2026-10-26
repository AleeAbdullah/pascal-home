// Room review 2026-10-26 (second floor): owner-approved layouts in the Interior V1 language.
// Reuses the first-floor / ground-floor Interior V1 pieces; positions come from the architect plan page 3
// (X=(x-118.382)*1.53942, Z=(y-304.623)*1.54014 in). Level-local metres = inches*0.0254.
import {items as ff,palette,projectId} from './first-floor-interior-v1.mjs';
import {items as gf} from './ground-floor-interior-v1.mjs';
import {guardCode,paramCode} from './588-exterior.mjs';
export {palette,projectId};
export const levelId='level_as503aa07d',supportSlabId='slab_588_sf_east';
export const rooms={
 stairHead:['zone_0001ufsujhxwkgfj','ceiling_as60236a5d'],maid:['zone_0000za6dcpklkc98','ceiling_as5c236411'],
 maidBath:['zone_gsgtn4kca1px7drd','ceiling_v9q0ztgag2q28rh3'], // auto-derived when the maid bath partition (src/second-floor-blueprint-corrections.mjs) splits the old Maid room zone
 bedroom:['zone_0003ia9g3eevzlvd','ceiling_as5a2360eb'],bath:['zone_00011crs3pi1ntr7','ceiling_as59235f58'],closet:['zone_0000zk40csqnt4tw','ceiling_as5f2368ca']
};
const m=x=>Number((x*.0254).toFixed(4));
const src=(list,key)=>{const i=list.find(x=>x.key===key);if(!i)throw Error('Missing template '+key);return i};
const relax=c=>c.replace(/"(\w+)":\{"default":([\d.e-]+),"min":[\d.e-]+,"max":[\d.e-]+/g,(all,k,d)=>k==='detail'||k==='shadows'?all:`"${k}":{"default":${d},"min":0.1,"max":15`);
export const items=[];
// room,key,label,template item,x,z (inches),rotation (deg),params override,y (m, default template y),mount
function add(room,key,label,tpl,x,z,rotation=0,params={},y,mount='floor'){
 const parentId=mount==='ceiling'?rooms[room][1]:levelId;
 items.push({key:room+'-'+key,room,name:'V1 · second floor · '+label,code:relax(tpl.code),parentId,position:[m(x),y??tpl.position[1],m(z)],rotation,params:{...tpl.params,...params}});
 return items.at(-1);
}
const lights=src(ff,'frontBath-lights');
const ceil=(room,key,label,x,z,params)=>add(room,key,label,lights,x,z,0,params,0,'ceiling');

// 1. Stair head: small sitting nook (two armchairs, round table, corner plant) in the free floor beside the secondary-stair opening.
add('stairHead','chair-w','stair head armchair west of the table (facing east)',src(ff,'frontMaster-reading'),741,72,90,{width:.76,depth:.8});
add('stairHead','chair-s','stair head armchair south of the table (facing north)',src(ff,'frontMaster-reading'),772,106,180,{width:.76,depth:.8});
add('stairHead','table','stair head round side table',src(ff,'frontMaster-side'),772,72,0,{width:.6,height:.45});
add('stairHead','plant','stair head corner planter',src(ff,'frontMaster-plant'),740,150);
ceil('stairHead','lights','stair head downlights',770,95,{count:2,spacing:.9});

// 2. Maid room + maid bath (architect page 3: single bed at the north partition, bedside east of it; western wall-hung WC under W18).
add('maid','bed','maid room single bed (39 x 75 in), headboard north',src(ff,'rearBed-bed'),859,87.3,0,{width:.99,depth:1.905});
add('maid','night','maid room bedside table east of the bed',src(ff,'frontMaster-night0'),889.3,58.1,0,{width:.46});
add('maidBath','wc','maid bathroom wall-hung western toilet under W18',src(gf,'maidBath-wc'),855.9,12.6,0);
add('maidBath','washer','maid bathroom handheld washer beside the toilet',src(gf,'maidBath-shower'),869,1.2,0);
add('maidBath','basin','maid bathroom compact basin beside the toilet',src(gf,'maidBath-basin'),886.9,5.9,0,{width:.45,depth:.30});
ceil('maid','lights','maid room downlights',886,105,{count:2,spacing:.9});
ceil('maidBath','lights','maid bathroom downlight',871.5,21,{count:1,spacing:.5});

// 3. Bedroom suite. Bed group (bed 72.5 in wide, 77 in long, headboard on the north wall), round bedsides with lamps, bench, rug, media unit, plant.
add('bedroom','head','bedroom padded headwall',src(ff,'frontMaster-head'),860,167.3,0,{width:2.3,height:2.5});
add('bedroom','bed','bedroom upholstered bed, headboard on the north wall',src(ff,'frontMaster-bed'),859.8,208.7,0,{width:1.84,depth:1.96});
for(const [i,x] of [812.2,908.6].entries()){
 add('bedroom','night'+i,'bedroom round bedside '+(i+1),src(ff,'frontMaster-side'),x,180.7,0,{width:.55,height:.5});
 add('bedroom','lamp'+i,'bedroom bedside globe '+(i+1),src(ff,'rearBed-lamp0'),x,180.7,0,{},.519);
}
add('bedroom','bench','bedroom bench at the foot of the bed',src(ff,'frontMaster-bench'),859.6,261,0,{width:1.47,depth:.46});
add('bedroom','rug','bedroom rug',src(ff,'frontMaster-rug'),859,256.6,0,{width:3.04,depth:2.44});
add('bedroom','tv','bedroom south-wall media unit (8 ft)',src(ff,'rearBed-tv'),858.6,313.4,180,{width:2.43,depth:.25});
add('bedroom','plant','bedroom corner planter (south-west)',src(ff,'frontMaster-plant'),754.8,301.5);
ceil('bedroom','lights','bedroom downlights',860,240,{count:3,spacing:1.1});

// Bathroom: identical zone and layout to the first-floor front bathroom (round-basin vanity NE, glass partition with two doors, toilet SW, shower SE).
for(const k of ['vanity','wc','screen','shower'])add('bath',k,src(ff,'frontBath-'+k).name.replace('V1 · first floor · ','').replace('front bath','bathroom'),src(ff,'frontBath-'+k),src(ff,'frontBath-'+k).position[0]/.0254,src(ff,'frontBath-'+k).position[2]/.0254,src(ff,'frontBath-'+k).rotation);
add('bath','accessories','bathroom towels and toiletries',src(ff,'frontBath-accessories'),23.14/.0254,9.38/.0254,0);
ceil('bath','lights','bathroom downlights',22.18/.0254,9.67/.0254,{count:2,spacing:.85});

// Walk-in closet: open hanging runs, full west wall and full south wall (L).
add('closet','run-w','closet hanging run, full west wall (from z 343 in, as the architect rails; clear of the passage)',src(ff,'frontCloset-run-w'),755.7,389.25,90,{length:2.35,depth:.44});
add('closet','run-s','closet hanging run, full south wall (L with the west run)',src(ff,'frontCloset-run-w'),788.7,426.8,180,{length:1.238,depth:.44});
ceil('closet','lights','closet downlights',778.9,380.6,{count:2,spacing:.85});

// Stair-head guard: 42 in clear glass panels with a walnut handrail (first-floor stair guard style), on the open floor-opening edges.
// Opening floor-opening_6iannrpnfuxc1udu: edges x=720 (z 42..122), z=42 (x 720..791), x=791 (z 42..62), z=122 (x 678..720; the stair foot).
// The step-off edge (z=62, x 791..833) stays open; x=678, z=0 and x=832.5 are walls.
export const walnutGuardCode=guardCode.replace("box(w,.04,.045,0,h-.02,0,metal,rail);","box(w,.05,.06,0,h-.025,0,walnut,rail);").replace("const metal=","const walnut=mat('slot_walnut','#58402e',{roughness:.58}),metal=");
export const guards=[
 {key:'x720',x:720,z:82,len:80,rotation:90,note:'west side of the stair, z 42..122'},
 {key:'z42',x:755.5,z:42,len:71,rotation:0,note:'north end of leg 1 / winder run, x 720..791'},
 {key:'x791',x:791,z:52,len:20,rotation:90,note:'east return beside the top step, z 42..62'},
 {key:'z122',x:699,z:122,len:42,rotation:0,note:'stair foot edge, x 678..720'}
];
export const guardParams=g=>({width:m(g.len),height:m(42)});
export {paramCode};
