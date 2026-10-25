import {library as lounge,relax,palette as inherited,projectId,levelId} from './interior-v1.mjs';
export {projectId,levelId};
export const palette={...inherited,oak:['#a98764',.68,0],greige:['#b4aa99',.65,0],ceramic:['#f3eee5',.25,0],steel:['#9b9d99',.3,.85],mirror:['#c5c7bf',.08,.95],clay:['#946f5b',.86,0]};
export const rooms={
 kitchen:['zone_0003bh4uhk96opeh','ceiling_asc5c08b2a',16.0,2.6],bed2:['zone_0002qytux8xgogmy','ceiling_asc0c0834b',10.55,2.53],drawing:['zone_0001jgsy6e8lk4im','ceiling_asc1c084de',21.26,13.22],masterBath:['zone_0001lky50pl25d09','ceiling_as3bb8f627',2.28,1.25],masterCloset:['zone_0000odnkitve1kja','ceiling_asc3c08804',2.28,3.95],guest:['zone_0001y87pd9wqrztw','ceiling_asbbc07b6c',21.26,6.15],dirty:['zone_0002xfq1fikubj6l','ceiling_asc2c08671',20.8,2.1],guestBath:['zone_0002yf95xjne8cde','ceiling_asbebe418e',22.33,9.2],laundry:['zone_00004g787cin20kt','ceiling_asbcbe3e68',23.12,2.75],guestCloset:['zone_00027xvrpy0iun3h','ceiling_asbcc07cff',19.93,9.2],powder:['zone_0001kk7021aykkn9','ceiling_asbfc081b8',17.98,15.14],maidBath:['zone_00031l60xtehshl0','ceiling_asbfbe4321',23.12,.59],closet2:['zone_bkipm23szhgwkuc8','ceiling_ci2inji1rlhadmyq',6.25,3.95],master:['zone_kx0k56o3w9jkko8r','ceiling_zdrbjnvuyt4ssi0y',2.28,9.09],bath2:['zone_kyherqz78x8f4x7b','ceiling_s4hh0vv91ueugbqj',6.25,1.25],pantry:['zone_f4rg8wqsz60ntnj9','ceiling_eyujbftwo3uj0jkq',18.8,2.95],stair:['zone_766yrncmzupv7mqh',null,14.3,10.3],hall:['zone_b7j6e51tho42vp79','ceiling_qyuqw13q0mlko0ed',12,6.1],lobby:['zone_toaclo72dsgxkle0',null,15.08,13.25]};
const helper=`import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const palette=${JSON.stringify(palette)};
export default function build({params:p,THREE:T}){const g=new T.Group(),mats={},clips=[];
const D=(p.detail??1)>=.5, S=(p.shadows??1)>=.5;
const mat=k=>{if(!mats[k]){const [color,roughness,metalness]=palette[k];mats[k]=new T.MeshStandardMaterial({color,roughness,metalness});mats[k].name='slot_'+k;}return mats[k]};
function part(id){const q=new T.Group();q.name='part:'+id;g.add(q);return q}
function mesh(q,geo,k,x,y,z){const m=new T.Mesh(geo,mat(k));m.position.set(x,y,z);m.castShadow=S;m.receiveShadow=true;q.add(m);return m}
function box(q,w,h,d,x,y,z,k,r=.01){return mesh(q,D||Math.min(w,h,d)>.02?new RoundedBoxGeometry(w,h,d,D?2:1,Math.min(r,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d),k,x,y,z)}
function cyl(q,r,h,x,y,z,k,r2=r){return mesh(q,new T.CylinderGeometry(r,r2,h,D?32:16),k,x,y,z)}
function ball(q,w,h,d,x,y,z,k){let m=mesh(q,new T.SphereGeometry(1,D?24:12,D?16:8),k,x,y,z);m.scale.set(w/2,h/2,d/2);return m}
function line(q,pts,r,k){if(!D&&r<.003)return null;return mesh(q,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),D?32:10,r,D?8:4,false),k,0,0,0)}
function glow(q,w,h,d,x,y,z){let m=box(q,w,h,d,x,y,z,'paper',.002);m.castShadow=false;m.material=new T.MeshStandardMaterial({color:'#fff0d4',emissive:'#ffce85',emissiveIntensity:1.5});m.material.name='slot_glow';return m}
function light(){return null} // Point lights removed; glow strips carry the lit reading.
function door(q,id,x,y,z,w,h,k='greige',direction=1){const pivot=new T.Group();pivot.name='hinge_'+id;pivot.position.set(x-w/2,y,z);q.add(pivot);box(pivot,w-.008,h,.024,w/2,0,0,k);box(pivot,.012,h*.38,.02,w-.05,0,.027*direction,'bronze',.003);clips.push(new T.NumberKeyframeTrack(pivot.name+'.rotation[y]',[0,1],[0,-Math.PI*.5*direction]));}
function faucet(q,x,y,z){line(q,[[x,y,z],[x,y+.27,z],[x,y+.33,z+.09],[x,y+.28,z+.18]],.012,'bronze');cyl(q,.022,.055,x+.055,y+.025,z,'bronze')}
function basin(q,x,y,z,w=.5,d=.34,k='ceramic'){box(q,w,.12,.045,x,y,z-d/2,k,.018);box(q,w,.12,.045,x,y,z+d/2,k,.018);for(const s of [-1,1])box(q,.045,.12,d-.05,x+s*(w/2-.0225),y,z,k,.018);box(q,w-.05,.025,d-.05,x,y-.055,z,k);cyl(q,.018,.003,x,y-.04,z,'bronze')}
`;
const source=(body,params={},mount='floor')=>`export const params=${JSON.stringify(Object.fromEntries(Object.entries(params).map(([k,v])=>[k,{default:v,min:Math.max(.01,v*.4),max:v*2.5,step:.01}]))).replace(/}$/,m=>(Object.keys(params).length?',':'')+'"detail":{"default":1,"min":0,"max":1,"step":1},"shadows":{"default":1,"min":0,"max":1,"step":1}}')};export const mount=${JSON.stringify(mount)};\n${helper}\n${body}\nif(clips.length)g.animations=[new T.AnimationClip('open',1,clips)];return g;}`;
const reuse=key=>relax(lounge.find(x=>x.key===key).code);
const cabinet=source(`const q=part('cabinet'),f=part('fronts');box(q,p.width,.10,p.depth-.08,0,.05,-.02,'bronze');box(q,p.width-.03,p.height-.15,p.depth-.05,0,(p.height+.1)/2,-.02,'walnut');box(q,p.width,.035,p.depth,0,p.height-.0175,0,'stone');const count=Math.max(1,Math.round(p.width/.6));for(let i=0;i<count;i++)door(f,'door'+i,-p.width/2+(i+.5)*p.width/count,(p.height+.09)/2,p.depth/2-.012,p.width/count-.012,p.height-.16,'greige');`,{width:1.2,depth:.6,height:.9});
const sinkCab=source(`const q=part('sink_cabinet'),f=part('fronts');box(q,p.width,.1,p.depth-.08,0,.05,-.02,'bronze');box(q,p.width-.02,.72,p.depth-.04,0,.46,-.01,'greige');for(const x of [-p.width*.25,p.width*.25])door(f,'sink'+x,x,.46,p.depth/2,p.width/2-.012,.69);const sw=.55,sd=.36;box(q,(p.width-sw)/2,.035,p.depth,-(p.width+sw)/4,.8825,0,'stone');box(q,(p.width-sw)/2,.035,p.depth,(p.width+sw)/4,.8825,0,'stone');for(const s of [-1,1])box(q,sw,.035,(p.depth-sd)/2,0,.8825,s*(p.depth+sd)/4,'stone');basin(q,0,.83,0,sw,sd,'steel');faucet(q,0,.90,-p.depth*.37);`,{width:1.2,depth:.62});
const hobCab=source(`const q=part('cooking_base'),f=part('fronts');box(q,p.width,.1,.52,0,.05,-.02,'bronze');box(q,p.width,.75,.60,0,.475,0,'greige');for(let i=0;i<3;i++){box(f,p.width-.03,.22,.025,0,.23+i*.24,.31,'greige');box(f,p.width-.09,.012,.012,0,.33+i*.24,.329,'bronze')}box(q,p.width+.02,.04,.63,0,.88,0,'stone');box(q,.66,.014,.46,0,.908,0,'charcoal');for(const x of [-.18,.18])for(const z of [-.115,.115]){const m=mesh(q,new T.TorusGeometry(.075,.002,6,32),'steel',x,.917,z);m.rotation.x=Math.PI/2;}for(let i=0;i<4;i++)cyl(q,.014,.004,-.10+i*.065,.92,.20,'bronze');`,{width:.9});
const tower=source(`const q=part('appliance_tower'),f=part('doors');box(q,p.width,p.height,.65,0,p.height/2,0,'walnut');const front=.339;if(p.kind<1.5){for(const [id,y,h]of [['fridge',1.35,1.65],['freezer',.27,.5]]){door(f,id,0,y,front,p.width-.035,h,'greige')}box(q,p.width-.025,.2,.025,0,p.height-.11,front,'walnut');}else{for(const [y,h]of [[.85,.6],[1.47,.42]]){box(q,p.width-.07,h,.035,0,y,front,'charcoal');box(q,p.width-.16,h-.14,.012,0,y-.015,front+.024,'mirror');box(q,p.width-.18,.025,.045,0,y+h/2-.07,front+.06,'steel');for(const x of [-.15,.15])cyl(q,.017,.02,x,y+h/2-.035,front+.02,'steel')}door(f,'bottom',0,.25,front,p.width-.04,.43);door(f,'top',0,2.0,front,p.width-.04,.55,'walnut');}`,{width:.75,height:2.35,kind:1});
const wallCab=source(`const q=part('upper_cabinet'),f=part('doors');box(q,p.width,p.height,.34,0,p.height/2,0,'walnut');const count=Math.round(p.width/.5);for(let i=0;i<count;i++)door(f,'upper'+i,-p.width/2+(i+.5)*p.width/count,p.height/2,.18,p.width/count-.012,p.height-.02,'walnut');glow(q,p.width-.06,.012,.04,0,.005,.1);light(q,'counter_task',0,-.08,.2,5);`,{width:1.8,height:.8});
const island=source(`const q=part('waterfall_stone'),b=part('storage');box(q,p.width,.045,p.depth,0,.915,0,'stone',.022);for(const s of [-1,1])box(q,.045,.91,p.depth,s*(p.width/2-.0225),.455,0,'stone');box(b,p.width-.15,.12,p.depth-.35,0,.06,-.13,'bronze');box(b,p.width-.12,.73,p.depth-.33,0,.485,-.13,'walnut');for(let i=0;i<3;i++)door(b,'island'+i,-p.width/2+(i+.5)*p.width/3,.485,-p.depth/2+.02,p.width/3-.04,.7,'walnut',-1);if(D)for(let i=0;i<42;i++)box(b,.014,.73,.014,-p.width/2+.09+i*(p.width-.18)/41,.485,p.depth/2-.27,'walnut',.003);for(let j=0;j<4;j++)line(q,[[-p.width*.47,.94,-.35+j*.2],[-.2,.94,-.31+j*.2],[p.width*.47,.94,-.39+j*.2]],.0012,'vein');`,{width:2.1,depth:1.05});
const stool=source(`const q=part('counter_stool');for(const x of [-.18,.18])for(const z of [-.17,.17])box(q,.03,.65,.03,x,.325,z,'walnut');box(q,.46,.10,.44,0,.70,0,'linen',.045);box(q,.46,.24,.07,0,.85,-.19,'linen',.03);box(q,.38,.025,.025,0,.26,.17,'bronze');`);
const shelving=source(`const q=part('shelves'),b=part('contents');box(q,p.width,p.height,.018,0,p.height/2,-p.depth/2,'walnut');for(const x of [-p.width/2+.012,p.width/2-.012])box(q,.024,p.height,p.depth,x,p.height/2,0,'walnut');for(let i=0;i<6;i++){const y=.10+i*(p.height-.15)/5;box(q,p.width,.025,p.depth,0,y,0,'oak');if(D&&i<5){for(let j=0;j<3;j++){const x=-p.width*.3+j*p.width*.3;box(b,p.width*.22,.20,p.depth*.7,x,y+.12,0,i%2?'linen':'greige',.025)}}}glow(q,p.width-.04,.01,.015,0,p.height-.025,p.depth/2-.02);light(q,'shelf',0,p.height-.1,p.depth/2+.06,3);`,{width:1.7,height:2.15,depth:.3});
const wardrobe=source(`const q=part('wardrobe_carcass'),f=part('sliding_fronts');box(q,p.width,p.height,p.depth,0,p.height/2,0,'walnut');const count=Math.max(2,Math.round(p.width/.6));for(let i=0;i<count;i++){const x=-p.width/2+(i+.5)*p.width/count;const d=part('sliding_door_'+i);d.name='slider_'+i;box(d,p.width/count-.014,p.height-.08,.025,x,p.height/2,p.depth/2+.015,'greige');box(d,.012,p.height*.35,.02,x+p.width/count*.36,p.height*.48,p.depth/2+.037,'bronze');clips.push(new T.NumberKeyframeTrack(d.name+'.position[x]',[0,1],[0,(i===count-1||i%2?-.45:.45)*p.width/count]));}glow(q,p.width-.06,.012,.025,0,.045,p.depth/2+.03);`,{width:2,height:2.65,depth:.6});
const bed=source(`const q=part('upholstered_frame'),b=part('bedding');box(q,p.width,.22,p.depth,0,.20,0,'linen',.10);box(q,p.width+.12,1.15,.14,0,.66,-p.depth/2+.07,'linen',.065);box(b,p.width-.13,.24,p.depth-.18,0,.43,.03,'ivory',.10);for(const x of [-p.width*.24,p.width*.24]){const a=box(b,p.width*.43,.15,.48,x,.60,-p.depth*.28,'paper',.07);a.rotation.x=-.12;}const cloth=new T.PlaneGeometry(p.width-.04,p.depth*.48,D?48:16,D?24:8);cloth.rotateX(-Math.PI/2);const cp=cloth.attributes.position;for(let i=0;i<cp.count;i++){const x=cp.getX(i),z=cp.getZ(i);cp.setXYZ(i,x,.580+.012*Math.sin(x*16+z*3)+.005*Math.sin(z*23)-.035*Math.pow(Math.abs(x)/(p.width/2),10),z+p.depth*.23);}cloth.computeVertexNormals();mesh(b,cloth,'taupe',0,0,0);for(const x of [-p.width*.23,p.width*.23]){const cushion=box(b,.38,.30,.14,x,.68,-.20,'sage',.06);cushion.rotation.x=-.2;}`,{width:2.05,depth:2.22});
const nightstand=source(`const q=part('bedside_storage');box(q,p.width,.46,.42,0,.25,0,'walnut',.04);for(let i=0;i<2;i++){box(q,p.width-.025,.20,.015,0,.145+i*.215,.217,'walnut');box(q,.12,.012,.02,0,.20+i*.215,.23,'bronze')}box(q,p.width+.01,.03,.43,0,.495,0,'stone');`,{width:.60});
const desk=source(`const q=part('writing_console');box(q,p.width,.045,p.depth,0,.76,0,'oak',.02);for(const x of [-p.width/2+.04,p.width/2-.04])box(q,.055,.74,p.depth-.06,x,.37,0,'walnut');box(q,p.width-.2,.14,p.depth-.05,0,.66,0,'greige');box(q,.18,.012,.025,0,.67,p.depth/2+.01,'bronze');`,{width:1.4,depth:.45});
const tv=source(`const q=part('media_console');box(q,p.width,.42,p.depth,0,.35,0,'walnut');box(q,p.width+.02,.035,p.depth+.02,0,.578,0,'stone');for(let i=0;i<3;i++)box(q,p.width/3-.015,.35,.015,-p.width/3+i*p.width/3,.35,p.depth/2+.008,'greige');box(q,p.width*.78,.72,.032,0,1.3,-p.depth/2+.03,'bronze');box(q,p.width*.75,.68,.008,0,1.3,-p.depth/2+.05,'charcoal');`,{width:1.6,depth:.28});
const headpanel=source(`const q=part('padded_wall_panels');for(let i=0;i<6;i++)box(q,p.width/6-.018,p.height,.045,-p.width/2+(i+.5)*p.width/6,p.height/2,0,'greige',.02);glow(q,p.width-.03,.012,.014,0,p.height-.02,.03);`,{width:3.7,height:2.9});
const bedsideLamp=source(`const q=part('bedside_lamp');cyl(q,.10,.025,0,.0125,0,'bronze');cyl(q,.009,.23,0,.135,0,'bronze');ball(q,.22,.22,.22,0,.32,0,'paper');glow(q,.07,.025,.07,0,.28,0);light(q,'reading',0,.34,0,3);`);
const vanity=source(`const q=part('floating_vanity'),f=part('fronts');box(q,p.width,.37,p.depth,0,.51,0,'walnut');for(let i=0;i<2;i++)box(f,p.width/2-.012,.33,.024,-p.width/4+i*p.width/2,.51,p.depth/2+.014,'greige');box(q,p.width,.065,p.depth+.015,0,.745,0,'stone');basin(q,0,.84,.02,Math.min(.5,p.width-.08),p.depth-.10);faucet(q,0,.78,-p.depth/2+.04);box(q,p.width-.1,1.05,.025,0,1.52,-p.depth/2+.01,'mirror',.02);for(const x of [-(p.width-.08)/2,(p.width-.08)/2])glow(q,.012,1.05,.015,x,1.52,-p.depth/2+.028);glow(q,p.width-.08,.012,.025,0,.32,.10);light(q,'mirror',0,1.75,0,5);`,{width:1.3,depth:.5});
const toilet=source(`const q=part('wall_hung_wc');box(q,.43,1.08,.13,0,.54,-.25,'stone');box(q,.18,.1,.009,0,.91,-.178,'bronze');ball(q,.37,.34,.52,0,.29,.03,'ceramic');box(q,.38,.035,.56,0,.445,.02,'ceramic',.017);line(q,[[.24,.68,-.17],[.28,.32,-.12],[.29,.62,-.08]],.009,'bronze');box(q,.07,.09,.04,.24,.68,-.16,'bronze');`,{});
const shower=source(`const q=part('shower_tray'),s=part('glass_and_hardware');box(q,p.width,.035,p.depth,0,.0175,0,'stone');box(q,.018,2.25,p.depth,-p.width/2+.012,1.125,0,'stone');box(q,p.width,2.25,.025,0,1.125,-p.depth/2+.012,'stone');const glass=new T.MeshPhysicalMaterial({color:'#dbe3df',roughness:.10,metalness:0,transparent:true,opacity:.22,side:T.DoubleSide});glass.name='slot_glass';const screen=new T.Mesh(new T.BoxGeometry(.008,2.1,p.depth),glass);screen.position.set(p.width/2-.01,1.1,0);s.add(screen);for(const y of [.07,2.15])box(s,.015,.015,p.depth,p.width/2-.01,y,0,'bronze');box(s,p.width*.32,2.1,.008,-p.width*.34,1.1,p.depth/2-.01,'bronze',.001);const panel=s.children[s.children.length-1];panel.material=glass;line(s,[[0,.9,-p.depth/2+.08],[0,2.03,-p.depth/2+.08],[0,2.08,-p.depth/2+.35]],.012,'bronze');box(s,.24,.018,.22,0,2.07,-p.depth/2+.32,'bronze');box(s,.20,.07,.035,0,1.05,-p.depth/2+.05,'bronze');box(q,p.width-.18,.006,.025,0,.038,-p.depth/2+.1,'bronze');`,{width:1.1,depth:1.1});
const wetShower=source(`const q=part('wetroom_shower');box(q,.09,.18,.025,0,1.08,0,'bronze');line(q,[[0,1.03,.03],[.14,.55,.10],[.24,1.55,.05],[.16,1.82,.05]],.008,'bronze');box(q,.10,.16,.026,.16,1.82,.05,'bronze');box(q,.12,.006,.12,0,.003,.08,'steel');g.scale.y=.57;`);
const washer=source(`const q=part('washer_dryer_stack');box(q,.61,1.72,.64,0,.86,0,'ivory',.025);for(const y of [.44,1.28]){const rim=mesh(q,new T.TorusGeometry(.205,.035,12,40),'steel',0,y,.33);const glass=mesh(q,new T.CircleGeometry(.17,40),'charcoal',0,y,.342);box(q,.52,.1,.015,0,y+.29,.333,'greige');const knob=cyl(q,.025,.02,.18,y+.29,.35,'steel');knob.rotation.x=Math.PI/2;box(q,.14,.035,.006,-.10,y+.29,.345,'charcoal')}box(q,.66,.04,.67,0,1.75,0,'oak');`);
const hood=source(`const q=part('extractor');box(q,.76,.12,.44,0,.06,0,'bronze');box(q,.32,.65,.27,0,.445,-.07,'bronze');glow(q,.58,.008,.10,0,.003,.07);light(q,'hob_task',0,-.08,.10,4);`);
const downlights=source(`const q=part('ceiling_lights');for(let i=0;i<p.count;i++){const x=(i-(p.count-1)/2)*p.spacing;cyl(q,.06,.025,x,-.0125,0,'bronze');glow(q,.078,.006,.078,x,-.028,0);light(q,'down_'+i,x,-.10,0,8)}`,{count:2,spacing:.9},'ceiling');
const globe=source(`const q=part('sculptural_pendant');cyl(q,.14,.03,0,-.015,0,'bronze');for(let i=0;i<5;i++){const a=i*2.4,r=.20+(i%2)*.17,d=p.drop-(i%3)*.16;const x=Math.sin(a)*r,z=Math.cos(a)*r;cyl(q,.004,d,x,-d/2,z,'bronze');ball(q,.27,.27,.27,x,-d,z,'paper');light(q,'globe'+i,x,-d,z,3);}`,{drop:1.3},'ceiling');
const bathAccessories=source(`if(!D)return g;const q=part('bath_accessories');for(let i=0;i<3;i++){cyl(q,.045,.14,-.10+i*.1,.07,0,i%2?'clay':'ceramic');cyl(q,.02,.025,-.1+i*.1,.152,0,'bronze')}box(q,.32,.04,.20,0,.02,.17,'linen',.018);`);

// ---- Room-review modules (2026-10-26): same helper kit and palette as the pieces above ----
const GLASS=`const glass=new T.MeshPhysicalMaterial({color:'#dbe3df',roughness:.10,metalness:0,transparent:true,opacity:.22,side:T.DoubleSide});glass.name='slot_glass';`;
// Enclosed walk-in shower: p.sides is a bit mask of glazed sides (1 east, 2 south, 4 north, 8 west), p.door the side that carries the hinged glass door, p.gap an open entry (m) at the north end of the east side.
const showerEnc=relax(source(`const q=part('shower_tray'),s=part('glass_and_hardware');const W=p.width,Dp=p.depth,m=Math.round(p.sides),dr=Math.round(p.door),gap=p.gap<.05?0:p.gap;const has=b=>(m&b)>0;${GLASS}
box(q,W,.035,Dp,0,.0175,0,'stone');if(!has(8))box(q,.018,2.25,Dp,-W/2+.009,1.125,0,'stone');if(!has(1))box(q,.018,2.25,Dp,W/2-.009,1.125,0,'stone');if(!has(4))box(q,W,2.25,.025,0,1.125,-Dp/2+.0125,'stone');if(!has(2))box(q,W,2.25,.018,0,1.125,Dp/2-.009,'stone');
const pane=(sx,sz,x,z)=>{const m2=new T.Mesh(new T.BoxGeometry(sx,2.1,sz),glass);m2.position.set(x,1.09,z);s.add(m2);for(const y of [.045,2.15])box(s,Math.max(sx,.016),.016,Math.max(sz,.016),x,y,z,'bronze',.003)};
if(has(1)){const z0=-Dp/2+gap,z1=Dp/2,len=z1-z0,x=W/2-.01;if((dr&1)>0){const dw=Math.min(.7,len*.6),fw=len-dw;pane(.008,fw,x,z0+fw/2);const pv=new T.Group();pv.name='hinge_shower_door_e';pv.position.set(x,0,z1);s.add(pv);const leaf=new T.Mesh(new T.BoxGeometry(.008,2.1,dw-.012),glass);leaf.position.set(0,1.09,-dw/2);pv.add(leaf);for(const y of [.045,2.15])box(pv,.016,.016,dw-.012,0,y,-dw/2,'bronze',.003);box(pv,.03,.2,.016,0,1.0,-dw+.07,'bronze',.004);clips.push(new T.NumberKeyframeTrack('hinge_shower_door_e.rotation[y]',[0,1],[0,-Math.PI/2]))}else pane(.008,len,x,z0+len/2)}
if(has(2)){const x0=-W/2,x1=W/2-.02,len=x1-x0,z=Dp/2-.01;if((dr&2)>0){const dw=Math.min(.7,len*.6),fw=len-dw;pane(fw,.008,x0+fw/2,z);const pv=new T.Group();pv.name='hinge_shower_door_s';pv.position.set(x1,0,z);s.add(pv);const leaf=new T.Mesh(new T.BoxGeometry(dw-.012,2.1,.008),glass);leaf.position.set(-dw/2,1.09,0);pv.add(leaf);for(const y of [.045,2.15])box(pv,dw-.012,.016,.016,-dw/2,y,0,'bronze',.003);box(pv,.016,.2,.03,-dw+.07,1.0,0,'bronze',.004);clips.push(new T.NumberKeyframeTrack('hinge_shower_door_s.rotation[y]',[0,1],[0,Math.PI/2]))}else pane(len,.008,x0+len/2,z)}
if(has(8)){const z0=-Dp/2,z1=Dp/2-.02,len=z1-z0,x=-W/2+.01;if((dr&8)>0){const dw=Math.min(.61,len*.5),fw=len-dw;pane(.008,fw,x,z1-fw/2);const pv=new T.Group();pv.name='hinge_shower_door_w';pv.position.set(x,0,z0+dw);s.add(pv);const leaf=new T.Mesh(new T.BoxGeometry(.008,2.1,dw-.012),glass);leaf.position.set(0,1.09,-dw/2);pv.add(leaf);for(const y of [.045,2.15])box(pv,.016,.016,dw-.012,0,y,-dw/2,'bronze',.003);box(pv,.03,.2,.016,0,1.0,-dw+.07,'bronze',.004);clips.push(new T.NumberKeyframeTrack('hinge_shower_door_w.rotation[y]',[0,1],[0,Math.PI/2]))}else pane(.008,len,x,0)}
line(s,[[0,.9,-Dp/2+.08],[0,2.03,-Dp/2+.08],[0,2.08,-Dp/2+.35]],.012,'bronze');box(s,.24,.018,.22,0,2.07,-Dp/2+.32,'bronze');box(s,.20,.07,.035,0,1.05,-Dp/2+.05,'bronze');box(q,W-.18,.006,.025,0,.038,-Dp/2+.1,'bronze');`,{width:1.5,depth:1.37,sides:3,door:1,gap:.61}));
// Free glass compartment screen along local x (door optional): used for the toilet compartments.
const glassScreen=relax(source(`const s=part('glass_screen');${GLASS}const L=p.length,dw=p.door<.05?0:p.door;
const pane=(w,x)=>{const m2=new T.Mesh(new T.BoxGeometry(w,2.1,.008),glass);m2.position.set(x,1.09,0);s.add(m2);for(const y of [.045,2.15])box(s,w,.016,.016,x,y,0,'bronze',.003)};
if(dw){const fw=L-dw;pane(fw,-L/2+fw/2);const pv=new T.Group();pv.name='hinge_screen_door';pv.position.set(L/2,0,0);s.add(pv);const leaf=new T.Mesh(new T.BoxGeometry(dw-.012,2.1,.008),glass);leaf.position.set(-dw/2,1.09,0);pv.add(leaf);for(const y of [.045,2.15])box(pv,dw-.012,.016,.016,-dw/2,y,0,'bronze',.003);box(pv,.016,.2,.03,-dw+.07,1.0,0,'bronze',.004);clips.push(new T.NumberKeyframeTrack('hinge_screen_door.rotation[y]',[0,1],[0,Math.PI/2]))}else pane(L,0)`,{length:.8,door:.5}));
const bathtub=relax(source(`const q=part('bathtub'),f=part('fittings');const L=p.length,Wd=p.width,H=p.height,t=.07,h2=H-.1;
box(q,L-.08,.1,Wd-.08,0,.05,0,'bronze',.02);for(const z of [-1,1])box(q,L,h2,t,0,.1+h2/2,z*(Wd/2-t/2),'ceramic',.035);for(const x of [-1,1])box(q,t,h2,Wd-2*t+.01,x*(L/2-t/2),.1+h2/2,0,'ceramic',.035);box(q,L-2*t,.04,Wd-2*t,0,.2,0,'ceramic',.012);box(q,L+.015,.02,Wd+.015,0,H-.01,0,'ceramic',.01);
box(f,.07,.012,.07,L/2-.28,H+.004,0,'steel',.004);line(f,[[L/2-.12,.0,-.0],[L/2-.12,.62,0],[L/2-.12,.72,.0],[L/2-.34,.74,0]],.014,'bronze');box(f,.05,.05,.05,L/2-.12,.5,.06,'bronze',.01);`,{length:1.905,width:.762,height:.55}));
const planter=source(`const q=part('raised_planted_bed'),l=part('planting');const L=p.length,Wd=p.width,H=p.height;
box(q,L,H,Wd,0,H/2,0,'walnut',.03);box(q,L+.04,.03,Wd+.04,0,H-.015,0,'stone',.012);box(q,L-.1,.02,Wd-.1,0,H+.002,0,'leaf',.01);
if(D){const px=.307,pz=-.023,ph=p.palmHeight;line(l,[[px,H,pz],[px+.03,H+ph*.5,pz-.02],[px,H+ph,pz]],.04,'walnut');
for(let i=0;i<10;i++){const a=i*.628+.3,dx=Math.cos(a),dz=Math.sin(a);line(l,[[px,H+ph,pz],[px+dx*.35,H+ph+.12,pz+dz*.35],[px+dx*.62,H+ph-.12,pz+dz*.62]],.012,'leaf');const lf=ball(l,.5,.03,.12,px+dx*.45,H+ph,pz+dz*.45,'leaf');lf.rotation.y=-a;lf.rotation.z=-.3}
for(const [tx,tz,th] of [[-.693,-.378,1.45],[.470,.389,1.35]]){line(l,[[tx,H,tz],[tx+.02,H+th*.5,tz],[tx,H+th*.72,tz]],.03,'walnut');ball(l,.62,.42,.62,tx,H+th*.82,tz,'leaf');ball(l,.45,.3,.45,tx+.12,H+th*.95,tz-.08,'sage')}
ball(l,.5,.32,.5,-.137,H+.18,-.434,'sage');ball(l,.3,.22,.3,-.07,H+.3,-.40,'leaf')}`,{length:2.21,width:1.68,height:.165,palmHeight:1.35});
// Island pieces (2026-10-26): induction hob inset, ceiling-hung island extractor, lower breakfast ledge.
const hobInsert=source(`const q=part('induction_hob');box(q,.66,.014,.46,0,.007,0,'charcoal',.004);for(const x of [-.18,.18])for(const z of [-.115,.115]){const m=mesh(q,new T.TorusGeometry(.075,.002,6,32),'steel',x,.0155,z);m.rotation.x=Math.PI/2;}for(let i=0;i<4;i++)cyl(q,.014,.004,-.10+i*.065,.016,.20,'bronze');`);
const islandHood=source(`const q=part('island_extractor'),r=part('suspension');box(q,p.width,.07,.52,0,-p.drop-.035,0,'bronze',.02);box(q,p.width-.06,.18,.40,0,-p.drop+.09,0,'bronze',.03);box(q,.30,p.drop-.1,.26,0,-(p.drop-.1)/2,0,'bronze',.02);for(const x of [-p.width*.42,p.width*.42])cyl(r,.004,p.drop,x,-p.drop/2,0,'bronze');glow(q,p.width-.12,.006,.30,0,-p.drop-.073,0);`,{width:.9,drop:1.35},'ceiling');
const ledge=source(`const q=part('breakfast_ledge');box(q,p.width,.04,p.depth,0,.74,0,'stone',.02);box(q,p.width-.06,.70,.05,0,.37,p.depth/2-.04,'walnut',.01);for(const x of [-p.width/2+.05,p.width/2-.05])box(q,.04,.70,.04,x,.37,-p.depth/2+.05,'bronze',.008);`,{width:1.98,depth:.61});

const laundryUnit=source(`const q=part('front_loader'),f=part('drum');box(q,p.width,.84,.64,0,.46,0,'ivory',.025);box(q,p.width+.02,.04,.66,0,.90,0,'oak');box(q,p.width-.08,.1,.015,0,.82,.325,'greige');const knob=cyl(q,.025,.02,p.width*.28,.82,.34,'steel');knob.rotation.x=Math.PI/2;const rim=mesh(f,new T.TorusGeometry(.205,.035,12,40),'steel',0,.42,.33);const gl=mesh(f,new T.CircleGeometry(.17,40),'charcoal',0,.42,.342);box(q,p.width-.04,.05,.5,0,.03,0,'bronze');`,{width:.68});

// Vanity with a round vessel basin (guest bathroom): same stone-top walnut unit, round ceramic bowl.
const vanityRound=source(`const q=part('floating_vanity'),f=part('fronts');box(q,p.width,.37,p.depth,0,.51,0,'walnut');for(let i=0;i<2;i++)box(f,p.width/2-.012,.33,.024,-p.width/4+i*p.width/2,.51,p.depth/2+.014,'greige');box(q,p.width,.065,p.depth+.015,0,.745,0,'stone');const bz=.02,r=.245;const rim=mesh(q,new T.TorusGeometry(r,.028,12,48),'ceramic',0,.915,bz);rim.rotation.x=Math.PI/2;cyl(q,r,.14,0,.855,bz,'ceramic',r*.78);cyl(q,.02,.004,0,.79,bz,'bronze');faucet(q,0,.78,-p.depth/2+.05);box(q,p.width-.1,1.05,.025,0,1.52,-p.depth/2+.01,'mirror',.02);for(const x of [-(p.width-.08)/2,(p.width-.08)/2])glow(q,.012,1.05,.015,x,1.52,-p.depth/2+.028);glow(q,p.width-.08,.012,.025,0,.32,.10);`,{width:1.07,depth:.61});
export const items=[];
function add(room,key,name,code,x,z,rotation=0,opts={}){items.push({key:room+'-'+key,room,name:'V1 · '+name,code,parentId:levelId,position:[x,0,z],rotation,...opts})}
function ceiling(room,key,name,code,x,z,params={},rotation=0){add(room,key,name,code,x,z,rotation,{parentId:rooms[room][1],params})}
function floor(room,key,name,code,x,z,rotation=0,params={},y=0){add(room,key,name,code,x,z,rotation,{params,position:[x,y,z]})}
// Appliance dimensions are editable design allowances; no manufacturer or MEP specification is implied.
floor('kitchen','sink','kitchen sink and mixer',sinkCab,15.8,.34,0,{width:1.2});
floor('kitchen','north-left','kitchen north storage',cabinet,14.6,.34,0,{width:1.18,depth:.62,height:.9});
floor('kitchen','north-right','kitchen north drawer storage',cabinet,16.7,.34,0,{width:.58,depth:.62,height:.9});
// Room review 2026-10-26 (open kitchen + pantry): hob and extractor move into the island, which shifts to the architect position with a lower breakfast ledge and four stools on its west side; the west-wall hob base becomes plain storage; pantry open, shelved on its three inside walls.
floor('kitchen','west','kitchen west storage base (hob removed)',cabinet,13.75,1.82,90,{width:1.76,depth:.62,height:.9});
floor('kitchen','island','stone waterfall kitchen island',island,16.383,2.677,90,{width:1.98,depth:.762});
floor('kitchen','island-hob','island induction hob',hobInsert,16.383,2.72,90,{},.9375);
floor('kitchen','ledge','lower breakfast ledge on the west side of the island',ledge,15.69,3.134,90,{width:1.98,depth:.60});
for(const [i,z]of [2.451,2.898,3.378,3.868].entries())floor('kitchen','stool'+i,'upholstered counter stool '+(i+1),stool,15.382,z,90);
ceiling('kitchen','island-hood','island extractor hood',islandHood,16.383,2.72,{width:.9,drop:1.35},90);
floor('kitchen','decor','kitchen ceramic tray',reuse('coffee-decor'),16.383,3.25,0,{},.941);
floor('pantry','shelf-n','pantry north wall shelving',shelving,18.556,2.022,0,{width:.84,depth:.457,height:2.15});
floor('pantry','shelf-s','pantry south wall shelving',shelving,18.556,3.874,180,{width:.84,depth:.457,height:2.15});
floor('pantry','shelf-e','pantry east wall shelving',shelving,19.241,2.948,-90,{width:2.31,depth:.457,height:2.15});
floor('kitchen','upper','walnut kitchen upper storage',wallCab,13.61,1.8,90,{width:1.8},1.80);
floor('kitchen','oven','integrated oven and microwave tower',tower,13.79,3.25,90,{width:.75,kind:2});
floor('kitchen','fridge','integrated refrigerator freezer',tower,13.76,4.2,90,{width:.85,kind:1});
ceiling('kitchen','spots','kitchen working light rail',reuse('track-w'),17.4,2.5,{length:3.1});
floor('dirty','sink','dirty kitchen wash sink',sinkCab,20.44,.34,0,{width:.85});
floor('dirty','prep','dirty kitchen preparation and storage',cabinet,21.45,.34,0,{width:1.14,depth:.62,height:.9});
// Room review 2026-10-26 (dirty kitchen): U-shaped counters per the architect plan: hob at the centre of the south wall under a new extractor, south counter returning up the east side, a west-side run, and the north sink/prep run extended down the east wall.
floor('dirty','hob','dirty kitchen hob and drawers (centre of the south wall)',hobCab,20.822,3.797,180,{width:.9});
floor('dirty','hood','dirty kitchen extractor hood',hood,20.822,3.897,180,{},1.70);
floor('dirty','south-w','dirty kitchen south counter (west)',cabinet,19.968,3.797,180,{width:.76,depth:.6,height:.9});
floor('dirty','south-e','dirty kitchen south-east corner counter',cabinet,21.68,3.797,180,{width:.76,depth:.6,height:.9});
floor('dirty','east-low','dirty kitchen east counter (south of the door)',cabinet,21.755,2.927,-90,{width:1.029,depth:.6,height:.9});
floor('dirty','east-up','dirty kitchen east counter (north-east extension of the prep run)',cabinet,21.755,.991,-90,{width:.66,depth:.6,height:.9});
floor('dirty','west','dirty kitchen west-side counter',cabinet,19.736,2.560,90,{width:1.763,depth:.3,height:.9});
// Room review 2026-10-26 (laundry): washer and dryer side by side along the east wall, counter with a utility sink on the south wall; folding counter and linen shelves removed.
floor('laundry','washer','washing machine',laundryUnit,23.68,2.096,-90,{width:.68});
floor('laundry','dryer','tumble dryer',laundryUnit,23.68,2.90,-90,{width:.68});
floor('laundry','sink','laundry counter with utility sink',sinkCab,22.784,3.793,180,{width:1.2});
// Room review 2026-10-26 (master bedroom): bed group moved ~2.65 ft north to the architect centre line z 326.4 in, bench, 9 ft media unit, south sofa group, three corner plants.
floor('master','head','master padded headboard wall',headpanel,.065,8.291,90,{width:3.65,height:2.9});
floor('master','bed','master upholstered king bed',bed,1.09,8.291,90,{width:1.76,depth:1.96},.019);
floor('master','rug','master woven bedroom rug',reuse('lounge-rug'),1.95,8.291,0,{width:3.6,depth:3.9});
for(const [i,z]of [7.061,9.517].entries()){floor('master','night'+i,'master bedside cabinet '+(i+1),nightstand,.373,z,90);floor('master','lamp'+i,'master bedside globe '+(i+1),bedsideLamp,.373,z,0,{},.51)}
floor('master','bench','master bench at the foot of the bed',reuse('bench'),2.408,8.291,90,{width:1.47,depth:.46},.019);
floor('master','tv','master floating media console',tv,4.28,8.291,-90,{width:2.74});
floor('master','sofa','master three-seat sofa on the south window wall',reuse('sofa'),2.253,12.23,180,{width:2.31,depth:.84},.019);
floor('master','coffee','master round coffee table',reuse('side-round'),2.273,11.039,0,{width:.91,height:.38},.019);
floor('master','chair-w','master west armchair',reuse('armchair-n'),.686,11.382,90,{width:.78,depth:.8},.019);
floor('master','chair-e','master east armchair',reuse('armchair-n'),3.820,11.382,-90,{width:.78,depth:.8},.019);
floor('master','plant','master corner plant (south-east)',reuse('plant'),4.117,12.350);
floor('master','plant-nw','master corner plant (north-west)',reuse('plant'),.358,5.740);
floor('master','plant-sw','master corner plant (south-west)',reuse('plant'),.511,12.329);
ceiling('master','drapes','master south window drapes',reuse('curtain'),2.28,12.65,{width:4.4,height:3.45});
ceiling('master','cove','master ceiling cove',reuse('cove'),2.28,9.1,{width:4.40,depth:7.2});
ceiling('master','pendant','master sculptural globe pendant',globe,2.7,9.1,{drop:1.0});
// Room review 2026-10-26 (bedroom 02): bed group moved north to the architect centre line z 74.5 in, bench, 9 ft media unit, south sofa with a round side table, SE corner plant; desk, desk chair and reading chair removed.
floor('bed2','head','bedroom two padded headboard wall',headpanel,13.11,1.892,-90,{width:4.0,height:2.9});
floor('bed2','bed','bedroom two upholstered king bed',bed,12.10,1.892,-90,{width:1.76,depth:1.95},.019);
floor('bed2','rug','bedroom two woven rug',reuse('lounge-rug'),11.4,1.892,0,{width:3.5,depth:3.85});
for(const [i,z]of [.665,3.119].entries()){floor('bed2','night'+i,'bedroom two bedside cabinet '+(i+1),nightstand,12.827,z,-90);floor('bed2','lamp'+i,'bedroom two bedside lamp '+(i+1),bedsideLamp,12.827,z,0,{},.51)}
floor('bed2','bench','bedroom two bench at the foot of the bed',reuse('bench'),10.792,1.892,-90,{width:1.47,depth:.46},.019);
floor('bed2','tv','bedroom two media console',tv,8.19,1.892,90,{width:2.74});
floor('bed2','sofa','bedroom two three-seat sofa on the south wall',reuse('sofa'),11.30,4.712,180,{width:2.31,depth:.84},.019);
floor('bed2','side','bedroom two round side table at the west end of the sofa',reuse('side-round'),9.70,4.750,0,{width:.675,height:.5},.019);
floor('bed2','plant','bedroom two corner plant (south-east)',reuse('plant'),12.834,4.788);
ceiling('bed2','drapes','bedroom two window drapes',reuse('curtain'),10.55,.13,{width:3.60,height:3.45});
ceiling('bed2','cove','bedroom two ceiling cove',reuse('cove'),10.55,2.53,{width:5.03,depth:4.94});
ceiling('bed2','pendant','bedroom two globe pendant',globe,10.65,2.5,{drop:1.0});
// Room review 2026-10-26 (guest bedroom): bed group on the architect centre line x 857.4 in, bench at the foot, two armchairs on the west wall facing east, 9 ft media unit centred as drawn.
floor('guest','head','guest padded headboard wall',headpanel,21.78,4.38,0,{width:3.6,height:2.8});
floor('guest','bed','guest upholstered double bed',bed,21.78,5.40,0,{width:1.78,depth:2.0},.019);
floor('guest','rug','guest woven bedroom rug',reuse('lounge-rug'),21.78,5.80,0,{width:3.5,depth:2.85});
for(const [i,x]of [20.549,23.004].entries()){floor('guest','night'+i,'guest bedside cabinet '+(i+1),nightstand,x,4.691,0,{width:.52});floor('guest','lamp'+i,'guest bedside globe '+(i+1),bedsideLamp,x,4.691,0,{},.51)}
floor('guest','bench','guest bench at the foot of the bed',reuse('bench'),21.78,6.802,0,{width:1.47,depth:.61},.019);
floor('guest','chair0','guest armchair (north)',reuse('armchair-n'),19.368,5.382,90,{width:.72,depth:.8},.019);
floor('guest','chair1','guest armchair (south)',reuse('armchair-n'),19.365,6.218,90,{width:.72,depth:.8},.019);
floor('guest','tv','guest media console',tv,21.95,7.836,180,{width:2.5,depth:.25});
ceiling('guest','drapes','guest east window drapes',reuse('curtain'),23.36,6.15,{width:3.1,height:3.45},90);
ceiling('guest','cove','guest ceiling cove',reuse('cove'),21.26,6.15,{width:4.38,depth:3.48});
ceiling('guest','pendant','guest globe pendant',globe,21.3,6.45,{drop:.9});
// Room review 2026-10-26 (master walk-in closet): the sliding wardrobe, low dresser and dressing stool are replaced by open hanging runs read from the architect plan (north wall either side of the bathroom door, south wall, full east wall).
floor('masterCloset','run-nw','master closet hanging run, north wall west of the bathroom door',reuse('hanging'),.864,3.018,0,{length:1.727,depth:.44});
floor('masterCloset','run-ne','master closet hanging run, north wall east of the bathroom door',reuse('hanging'),3.81,3.018,0,{length:1.524,depth:.44});
floor('masterCloset','run-s','master closet hanging run, south wall',reuse('hanging'),1.379,4.872,180,{length:2.76,depth:.44});
floor('masterCloset','run-e','master closet hanging run, east wall full depth',reuse('hanging'),4.281,4.255,-90,{length:1.83,depth:.44});
// Room review 2026-10-26 (walk-in closet 2): the two sliding wardrobes are replaced by open hanging runs along the full west and south walls, read from the architect plan.
floor('closet2','run-w','bedroom two closet hanging run, west wall',reuse('hanging'),5.113,3.663,90,{length:1.869,depth:.44});
floor('closet2','run-s','bedroom two closet hanging run, south wall',reuse('hanging'),6.172,4.872,180,{length:2.743,depth:.44});
// Room review 2026-10-26 (guest walk-in closet): the sliding wardrobe is replaced by open hanging runs along the west and south walls (L).
floor('guestCloset','run-w','guest closet hanging run, west wall',reuse('hanging'),19.289,9.131,90,{length:1.829,depth:.44});
floor('guestCloset','run-s','guest closet hanging run, south wall',reuse('hanging'),20.247,9.881,180,{length:1.377,depth:.44});
floor('masterBath','vanity','master stone vanity and lit mirror',vanity,2.34,.30,0,{width:1.5,depth:.50});
// Room review 2026-10-26 (master bathroom): enlarged NW shower with glass partition and door, toilet in the SW compartment behind its own glass screen facing east, bathtub on the east side; linen shelf removed.
floor('masterBath','shower','master walk-in shower with glass partition and door',showerEnc,.749,.686,0,{width:1.5,depth:1.372,sides:3,door:1,gap:.61});
floor('masterBath','wc','master wall-hung toilet (south-west compartment)',toilet,.455,1.943,90);
floor('masterBath','wc-screen','master toilet compartment glass screen',glassScreen,1.443,1.76,90,{length:.775,door:.5});
floor('masterBath','tub','master bathtub',bathtub,3.937,1.227,90,{length:1.905,width:.762,height:.55});
floor('bath2','vanity','bathroom two vanity and lit mirror',vanity,5.42,.3,0,{width:1.05,depth:.50});
// Room review 2026-10-26 (bathroom 2): shower moved to the NE corner behind a glass partition and door, toilet on the east wall in the SE facing west; vanity stays NW.
floor('bath2','wc','bathroom two wall-hung toilet (south-east)',toilet,7.244,1.923,-90);
floor('bath2','shower','bathroom two walk-in shower (north-east corner) with glass partition and door',showerEnc,7.049,.686,0,{width:1.295,depth:1.372,sides:10,door:8,gap:0});
// Room review 2026-10-26 (guest bathroom): toilet in the north-east on the east wall facing west under W18, round-basin vanity in the south-west; shower stays SE.
floor('guestBath','vanity','guest bathroom round-basin vanity and lit mirror',vanityRound,21.603,9.893,180,{width:1.07,depth:.61});
floor('guestBath','wc','guest bathroom wall-hung toilet (north-east)',toilet,23.243,8.750,-90);
floor('guestBath','shower','guest bathroom walk-in shower',shower,23.0,9.70,-90,{width:.96,depth:.98});
floor('powder','vanity','powder stone vanity and illuminated mirror',vanity,18.49,14.80,-90,{width:.64,depth:.40});
// Room review 2026-10-26 (powder room): toilet moved to the east wall in the south-east corner, facing west; basin stays north-east.
floor('powder','wc','powder wall-hung toilet (south-east)',toilet,18.446,15.427,-90);
// Room review 2026-10-26 (maid bathroom): wall-hung western toilet at the architect toilet position on the west side, basin in the north-east corner, handheld washer beside the toilet.
floor('maidBath','wc','maid bathroom toilet',toilet,22.52,.592,90);
floor('maidBath','basin','maid bathroom compact basin (north-east corner)',vanity,23.69,.15,0,{width:.45,depth:.30});
floor('maidBath','shower','maid bathroom handheld wetroom shower',wetShower,22.97,.03,0);
for(const [room,x,z]of [['masterBath',2.75,.40],['bath2',5.08,.40]])floor(room,'accessories',room+' towels and toiletries',bathAccessories,x,z,0,{},.79);
// Room review 2026-10-26 (drawing room): north media unit, two-seat sofa facing it, three-seat east sofa, south sofa re-centred, square table, three round side tables, corner plants NW/NE; west conversation chairs and console removed. The 6 ft west entrance stays open.
floor('drawing','tv','drawing room north media unit',tv,21.260,10.579,0,{width:2.44,depth:.30});
floor('drawing','sofa-n','drawing room two-seat sofa facing the media unit',reuse('sofa'),20.828,11.552,0,{width:1.587,depth:.762},.019);
floor('drawing','sofa-e','drawing room three-seat sofa on the east wall',reuse('sofa'),22.870,13.428,-90,{width:2.6,depth:.94},.019);
floor('drawing','sofa-s','drawing room south sofa',reuse('sofa'),21.029,15.22,180,{width:2.69,depth:.90},.019);
floor('drawing','rug','drawing room woven rug',reuse('lounge-rug'),21.30,13.46,0,{width:4.0,depth:4.35});
floor('drawing','coffee','drawing room square stone coffee table',reuse('coffee'),20.963,13.417,0,{width:1.07,depth:1.07},.019);
floor('drawing','decor','drawing room coffee table ceramics',reuse('coffee-decor'),20.963,13.417,0,{},.3823);
floor('drawing','side-ne','drawing room round side table (north-east)',reuse('side-round'),22.748,11.638,0,{width:.5,height:.5},.019);
floor('drawing','side-sw','drawing room round side table (south-west)',reuse('side-round'),19.325,15.176,0,{width:.5,height:.5},.019);
floor('drawing','side-se','drawing room round side table (south-east)',reuse('side-round'),22.821,15.158,0,{width:.5,height:.5},.019);
floor('drawing','art','drawing room abstract artwork',reuse('art'),21.26,10.5,0,{},1.75);
floor('drawing','plant','drawing room corner plant (north-west)',reuse('plant'),19.373,10.767);
floor('drawing','plant-ne','drawing room corner plant (north-east)',reuse('plant'),23.134,10.757);
ceiling('drawing','drapes','drawing room south window drapes',reuse('curtain'),21.26,15.75,{width:4.20,height:3.45});
ceiling('drawing','cove','drawing room ceiling cove',reuse('cove'),21.26,13.22,{width:4.38,depth:5.30});
ceiling('drawing','pendant','drawing room sculptural globe chandelier',globe,20.963,13.417,{drop:1.25});
for(const room of ['masterCloset','closet2','guestCloset','pantry','dirty','laundry','masterBath','bath2','guestBath','powder','maidBath']){const [,,x,z]=rooms[room];ceiling(room,'lights',room+' ceiling lights',downlights,x,z,{count:room==='dirty'?3:2,spacing:room==='maidBath'||room==='powder'?.55:.9});}
// Room review 2026-10-26 (main staircase + 5 ft corridor): raised planted bed (one 6.5 in step) with a palm and two trees in the SW of the stair box, clear of the flights above; reading nook with lounge chair and round side table north of the stair box; plant at the corridor east end.
floor('stair','planter','raised planted bed with palm and two trees (under the upper flight, 6.5 in high)',planter,14.288,10.287,0,{length:2.21,width:1.68,height:.165,palmHeight:1.35});
floor('hall','nook-chair','corridor reading-nook lounge chair',reuse('armchair-n'),12.401,7.600,-63,{width:.78,depth:.8},.019);
floor('hall','nook-table','corridor reading-nook round side table',reuse('side-round'),11.603,7.203,0,{width:.675,height:.5},.019);
floor('hall','plant-east','corridor east-end plant',reuse('plant'),18.334,5.753);
for(const [i,x]of [5.7,8.5,11.5,14.4,17.7].entries())ceiling('hall','light'+i,'corridor ceiling light '+(i+1),downlights,x,6.12,{count:1,spacing:.5});
for(const [i,z]of [8.6,11.7,13.4].entries())ceiling('hall','east-light'+i,'east corridor ceiling light '+(i+1),downlights,17.98,z,{count:1,spacing:.5});
// Double-height suspension ends below the measured upper ceiling; its floor-host datum is explicit.
const lobbyPendant=source(`const q=part('double_height_pendant');cyl(q,.30,.04,0,p.height-.02,0,'bronze');for(let i=0;i<9;i++){const a=i*2.4,r=.15+(i%3)*.15,y=.18+(i%5)*.32;const x=Math.sin(a)*r,z=Math.cos(a)*r;cyl(q,.004,p.height-y,x,(p.height+y)/2,z,'bronze');ball(q,.26,.26,.26,x,y,z,'paper');light(q,'globe'+i,x,y,z,3);}`,{height:3.4});
floor('lobby','pendant','double-height entrance globe chandelier',lobbyPendant,15.10,13.25,0,{height:3.47},4.15);
export const floorFinishes={bed2:'oak',master:'oak',guest:'oak',masterCloset:'oak',closet2:'oak',guestCloset:'oak',kitchen:'stone',drawing:'stone',hall:'stone',lobby:'stone',pantry:'stone',dirty:'greige',laundry:'greige',masterBath:'stone',bath2:'stone',guestBath:'stone',powder:'stone',maidBath:'greige'};

for(const item of items){if(item.key.endsWith('-vanity')||item.key==='maidBath-basin')item.position[1]=.32;if(item.key.includes('-night')||['drawing-plant','drawing-plant-ne'].includes(item.key))item.position[1]=.019;if(/^(master|bed2|guest)-lamp/.test(item.key))item.position[1]=.529;if(item.key==='kitchen-decor')item.position[1]=.945;if(item.key.endsWith('-drapes'))item.position[1]=-.16;}

// The retained manual structural slab has one native surface; use a coherent honed-stone finish throughout, with bedroom rugs.
for(const room of Object.keys(floorFinishes))floorFinishes[room]='stone';

const dishwasher=source(`const q=part('integrated_dishwasher');box(q,.58,.10,.56,0,.05,-.02,'bronze');box(q,.58,.74,.58,0,.47,-.02,'steel');box(q,.60,.04,.62,0,.88,0,'stone');const f=new T.Group();f.name='dishwasher_door';f.position.set(0,.10,.285);q.add(f);box(f,.565,.74,.025,0,.37,0,'greige');box(f,.5,.035,.012,0,.70,.02,'charcoal');clips.push(new T.NumberKeyframeTrack(f.name+'.rotation[x]',[0,1],[0,Math.PI*.5]));`);
const integratedHood=source(`const q=part('integrated_extract');box(q,.76,.11,.40,0,.055,0,'bronze');for(const x of [-.25,.25])glow(q,.10,.008,.05,x,.005,.09);light(q,'hob_task',0,-.06,.10,5);`);
floor('kitchen','dishwasher','integrated kitchen dishwasher',dishwasher,17.30,.34);
floor('kitchen','corner','kitchen corner storage',cabinet,13.715,.45,90,{width:.85,depth:.55,height:.9});

