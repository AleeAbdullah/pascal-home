// Governing source: base assets/588 - M1 (Checked by Building Control).pdf, sheet 1.
// Inches are retained to avoid rounding imperial dimension chains during authoring.
export const projectId = '588-m1-governing-plan';
export const inch = n => Number((n * 0.0254).toFixed(8));
export const xy = p => p.map(inch);
export const rect = (x0,z0,x1,z1) => [[x0,z0],[x1,z0],[x1,z1],[x0,z1]].map(xy);
export const source = {
  file: '588 - M1 (Checked by Building Control).pdf', sheet: 1,
  precedence: 'Dimension chains govern conflicting room labels, as instructed by the owner.',
  tracedPositions: 'Undimensioned offsets are traced from the PDF vectors, as authorized by the owner; they are not surveyed dimensions.',
  units: 'inches', origin: 'Inside rear-left wall face, ground-floor plan; +X right, +Z toward front.',
  floorLevels: {road:0,porch:6,deck:12,ground:18,first:174,second:332,roof:450},
  section: {groundClear:144,firstClear:144,secondClear:108,firstSlabAndFinish:12,secondSlabAndFinish:14,roofSlabAndFinish:10},
  dimensions: {rearOverall:963,masterBathWidth:180,groundMasterBathDepth:98.5,firstMasterBathDepth:103,masterBedWidth:180,masterBedDepth:291,secondStoreWidth:135,secondStoreDepth:199,shaftWidth:72,shaftDepth:234},
};
export const windowSchedule = {
  W1:[240,126,6],W2:[186,24,36],W3:[180,114,6],W4:[162,114,6],W5:[144,114,6],W6:[132,114,6],W7:[120,114,6],W8:[106,114,6],W9:[96,114,6],W10:[94,114,6],W11:[72,114,6],"W11'":[72,36,60],W12:[69,114,6],"W12'":[69,24,36],W13:[66,72,48],"W13'":[66,114,6],W14:[60,114,6],W15:[48,114,6],W16:[48,72,48],W17:[36,114,6],W18:[36,72,48],"W18'":[36,72,24],W19:[18,72,48],W20:[150,24,6],
};
export const doorSchedule = {D1:[60,288],D2:[42,120],"D2'":[42,96],D3:[36,120],"D3'":[36,96],D4:[30,120],"D4'":[30,96]};
const floorColor = '#dedbd3';
const levels = [];
function level(key,name,elevation,height){
 const l={key,name,elevation:inch(elevation-18),floorToFloor:height,walls:[],rooms:[],slabs:[],labels:[],separators:[],openings:[],voids:[]};levels.push(l);return l;
}
function wall(l,id,x0,z0,x1,z1,t=9,h=144,basis='dimension-chain'){
 const w={id:`${l.key}-${id}`,start:xy([x0,z0]),end:xy([x1,z1]),thickness:inch(t),height:inch(h),color:'#ece9e2'};
 l.walls.push(w);return w;
}
const H=(l,id,x0,x1,z,t=9,h=144,basis)=>wall(l,id,x0,z,x1,z,t,h,basis);
const V=(l,id,x,z0,z1,t=9,h=144,basis)=>wall(l,id,x,z0,x,z1,t,h,basis);
function room(l,name,x,z){l.rooms.push({name,seed:xy([x,z]),floor:floorColor});}
function label(l,name,x0,z0,x1,z1,extra={}){l.labels.push({name,polygon:rect(x0,z0,x1,z1),...extra});}
function sep(l,id,a,b){l.separators.push({id:`${l.key}-${id}`,start:xy(a),end:xy(b)});}
function slab(l,name,poly,top=0,thickness=12){l.slabs.push({name,polygon:poly.map(xy),top:inch(top),thickness:inch(thickness),finish:floorColor});}
const g=level('gf','Ground floor · +1′-6″',18,156);
H(g,'rear',-4.5,949.5,-4.5);
V(g,'west',-4.5,-4.5,508);
V(g,'master-east',184.5,-4.5,658);
H(g,'bath-cross',-4.5,307.5,103);
H(g,'rear-rooms-front',-4.5,742.5,208);
V(g,'bath2-east',307.5,-4.5,208);
V(g,'bed2-east',523.5,-4.5,208);
V(g,'kitchen-east-upper',742.5,-4.5,68.25);
H(g,'pantry-back',711.75,768.75,68.25,4.5);
V(g,'pantry-west',711.75,68.25,163.75,4.5);
V(g,'pantry-east',768.75,68.25,163.75,4.5);
H(g,'pantry-front',711.75,742.5,163.75,4.5);
sep(g,'pantry-entry',[742.5,163.75],[768.75,163.75]);
room(g,'Pantry · traced outline',740,110);
V(g,'kitchen-east-lower',742.5,163.75,208);
V(g,'laundry-west',870.75,-4.5,166,4.5);
H(g,'maid-bath-front',870.75,949.5,51);
V(g,'rear-east',949.5,-4.5,166);
H(g,'service-front',742.5,949.5,166);
V(g,'east',931.5,166,631);
V(g,'east-rooms-west',742.5,208,631);
H(g,'guest-front',742.5,931.5,319);
V(g,'guest-bath-partition',827.25,319,406,4.5);
H(g,'guest-bath-front',742.5,931.5,406);
H(g,'drawing-front',673.5,931.5,631);
H(g,'powder-back',673.5,742.5,561.25,4.5);
V(g,'powder-west',673.5,561.25,631);
H(g,'master-front',-4.5,184.5,508);
V(g,'lounge-east',433.5,325,658);
H(g,'lounge-front',184.5,433.5,658);
H(g,'shaft-back',433.5,514.5,325);
H(g,'shaft-front',433.5,514.5,568);
V(g,'shaft-east',514.5,325,595);
H(g,'stair-back',514.5,673.5,277);
H(g,'entry-front',514.5,673.5,595,9,300);
sep(g,'hall-lounge',[184.5,277],[433.5,277]);
sep(g,'hall-stair',[514.5,277],[514.5,325]);
sep(g,'lounge-step',[184.5,329.5],[433.5,329.5]);
sep(g,'lounge-step-side',[433.5,277],[433.5,325]);
sep(g,'stair-east',[673.5,277],[673.5,449]);
sep(g,'lobby-back',[514.5,449],[673.5,449]);
sep(g,'lobby-east',[673.5,449],[673.5,595]);
sep(g,'corridor-front',[673.5,595],[673.5,631]);
for(const r of [['Master bathroom',80,45],['Bathroom 2',240,45],['Master walk-in closet',80,150],['Walk-in closet 2',240,150],['Bedroom 02',400,100],['Guest bedroom',830,230],['Guest walk-in closet',785,360],['Guest bathroom',880,360],['Drawing room',830,520],['Powder room',705,595],['Master bedroom',80,360],['Maid bathroom',905,25],['Laundry room',905,110]])room(g,...r);
label(g,'Open kitchen',528,0,738,203.5);
label(g,'Dirty kitchen',771,0,868.5,161.5);
label(g,'Pantry · traced outline',714,70.5,766.5,161.5);
label(g,'5′ wide corridor',189,212.5,738,272.5);
label(g,'Lounge + dining · floor +6″',189,329.5,429,653.5,{floorOffset:-12});
label(g,'Double-height lobby',519,449,669,590.5);
label(g,'Main staircase',519,281.5,669,444.5);
g.voids.push(rect(438,329.5,510,563.5));
slab(g,'Master sitting deck · +12″',[[0,512.5],[180,512.5],[180,662.5],[132,662.5],[132,572.5],[0,572.5]],-6,8.25);
slab(g,'Lounge sitting deck · +12″',[[189,662.5],[429,662.5],[429,710.5],[189,710.5]],-6,8.25);
slab(g,'Entrance podium · +18″',[[519,599.5],[669,599.5],[669,695.5],[519,695.5]],0,8.25);
slab(g,'Porch · +6″',[[678,635.5],[1055.5,635.5],[1055.5,710.5],[678,710.5]],-12,8.25);
const f=level('ff','First floor · +14′-6″',174,158);
H(f,'rear-left',-4.5,523.5,-4.5);
H(f,'rear-right',673.5,949.5,-4.5);
V(f,'west',-4.5,-4.5,508);
V(f,'master-east',184.5,-4.5,508);
H(f,'master-bath-front',-4.5,184.5,105.25,4.5);
H(f,'bath2-front',184.5,307.5,100.75,4.5);
V(f,'bath2-east',307.5,-4.5,208);
H(f,'rear-rooms-front',-4.5,742.5,208);
V(f,'bed2-east',523.5,-4.5,208);
V(f,'rear-terrace-east',673.5,-4.5,208);
V(f,'rear-bath-west',834.75,-4.5,166,4.5);
H(f,'rear-bath-front',834.75,949.5,87.25,4.5);
V(f,'rear-east',949.5,-4.5,166);
H(f,'rear-closet-front',742.5,949.5,166);
V(f,'east',931.5,166,631);
V(f,'east-rooms-west',742.5,166,440);
H(f,'guest-front',742.5,931.5,321.25,4.5);
V(f,'guest-bath-partition',815.25,321.25,440,4.5);
H(f,'guest-bath-front',673.5,931.5,440);
V(f,'front-bedroom-west',673.5,440,631);
H(f,'front-bedroom-front',673.5,931.5,631);
H(f,'master-front',-4.5,184.5,508);
H(f,'lounge-front',184.5,433.5,508);
V(f,'lounge-shaft-west',433.5,277,568);
H(f,'shaft-back',433.5,514.5,325);
H(f,'shaft-front',433.5,514.5,568);
V(f,'shaft-east',514.5,325,595);
H(f,'stair-back',514.5,673.5,277);
H(f,'stair-front',514.5,673.5,440); // PDF vector wall faces at z=435.5 and 444.5 in.
sep(f,'lounge-back',[184.5,277],[433.5,277]);
sep(f,'hall-stair',[433.5,277],[514.5,277]);
sep(f,'stair-console',[514.5,277],[514.5,325]);
sep(f,'stair-east',[673.5,277],[673.5,440]);
sep(f,'lobby-east',[673.5,440],[673.5,595]);
sep(f,'lobby-front',[514.5,595],[673.5,595]);
for(const r of [['Master bathroom',80,45],['Bathroom 2',240,45],['Master walk-in closet',80,150],['Walk-in closet 2',240,150],['Bedroom 02',400,100],['Rear bathroom',885,45],['Rear walk-in closet',885,125],['Bedroom',830,230],['Front walk-in closet',785,380],['Front bathroom',880,380],['Front master bedroom',800,540],['Master bedroom',80,360]])room(f,...r);
label(f,'Open kitchen + secondary stair',678,0,832.5,203.5);
label(f,'Lounge',189,281.5,429,503.5);
label(f,'5′ wide corridor',189,212.5,738,272.5);
label(f,'Rear terrace',528,0,669,203.5);
label(f,'Main staircase',519,281.5,669,435.5);
label(f,'Looking below · double-height lobby',519,444.5,669,590.5);
f.voids.push(rect(438,329.5,510,563.5),rect(519,444.5,669,590.5));
slab(f,'Front left terrace',[[18,512.5],[429,512.5],[429,710.5],[18,710.5]],0,12);
slab(f,'Front right terrace',[[678,635.5],[1055.5,635.5],[1055.5,710.5],[678,710.5]],0,12);
slab(f,'Rear terrace',[[528,0],[669,0],[669,203.5],[528,203.5]],0,12);
const s=level('sf','Second floor · +27′-8″',332,118);
H(s,'store-back',379.5,523.5,-4.5,9,108);
V(s,'store-west',379.5,-4.5,203.5,9,108);
V(s,'store-east',523.5,-4.5,203.5,9,108);
H(s,'store-front',379.5,523.5,203.5,9,108);
H(s,'rear',673.5,910.5,-4.5,9,108);
V(s,'mumty-west',673.5,-4.5,163.75,9,108);
V(s,'maid-west',834.75,-4.5,163.75,4.5,108);
V(s,'maid-rear-east',910.5,-4.5,43,9,108);
H(s,'balcony-return',910.5,949.5,43,9,108);
V(s,'maid-east',949.5,43,163.75,9,108);
H(s,'maid-mumty-front',673.5,949.5,163.75,4.5,108);
V(s,'bedroom-west',742.5,163.75,440,9,108);
V(s,'bedroom-east',931.5,163.75,440,9,108);
H(s,'bedroom-front',742.5,931.5,321.25,4.5,108);
V(s,'bath-partition',815.25,321.25,440,4.5,108);
H(s,'bath-front',742.5,931.5,440,9,108);
for(const r of [['Store · 11′-3″ chain width',450,100],['Mumty / stair head',750,95],['Maid room',880,95],['Bedroom',830,230],['Walk-in closet',785,380],['Bathroom',880,380]])room(s,...r);
label(s,'Open to sky · rear terrace below',528,0,669,203.5);
label(s,'Open to sky · central shaft',438,329.5,510,563.5);
label(s,'Looking below · main stair',519,281.5,669,444.5);
s.voids.push(rect(528,0,669,203.5),rect(438,329.5,510,563.5),rect(519,281.5,669,444.5));
// Roof terrace plates surround actual voids; no plate spans a light well.
slab(s,'West roof terrace',[[ -9,-9],[375,-9],[375,208],[528,208],[528,272.5],[429,272.5],[429,572.5],[-9,572.5]],0,14);
slab(s,'Central roof terrace',[[528,208],[738,208],[738,272.5],[528,272.5]],0,14);
slab(s,'East circulation roof',[[678,208],[738,208],[738,449],[678,449]],0,14);
slab(s,'Front roof terrace',[[519,449],[738,449],[738,444.5],[936,444.5],[936,635.5],[678,635.5],[678,599.5],[519,599.5]],0,14);
slab(s,'Maid balcony',[[915,-9],[954,-9],[954,38.5],[915,38.5]],0,10);
export const model = {source,levels};
export function splitWalls(l){
 const out=[];
 for(const w of l.walls){
  const horizontal=w.start[1]===w.end[1],axis=horizontal?0:1,other=1-axis;
  const cuts=[w.start[axis],w.end[axis]];
  for(const q of l.walls){
   if(q===w)continue;
   if(q.start[axis]===q.end[axis]&&q.start[axis]>w.start[axis]+1e-7&&q.start[axis]<w.end[axis]-1e-7&&w.start[other]>=Math.min(q.start[other],q.end[other])-1e-7&&w.start[other]<=Math.max(q.start[other],q.end[other])+1e-7)cuts.push(q.start[axis]);
  }
  const ordered=[...new Set(cuts)].sort((a,b)=>a-b);
  for(let i=0;i<ordered.length-1;i++){
   const start=[...w.start],end=[...w.end];start[axis]=ordered[i];end[axis]=ordered[i+1];
   out.push({...w,id:ordered.length===2?w.id:`${w.id}:${i}`,start,end});
  }
 }
 return out;
}
export function payload(){return {levels:levels.map(l=>({name:l.name,elevation:l.elevation,walls:splitWalls(l),rooms:l.rooms,slabs:l.slabs})),notes:[source.precedence,source.tracedPositions,'Architectural reconstruction in progress. Finish colours are neutral display materials, not specified construction finishes. Opening operability is unspecified unless shown by a door swing.']};}
export const constructionFloors = [
 {key:'gf-main',level:0,top:0,thickness:8.25,polygon:[[-9,-9],[954,-9],[954,170.5],[936,170.5],[936,635.5],[678,635.5],[678,599.5],[510,599.5],[510,572.5],[433.5,572.5],[433.5,329.5],[184.5,329.5],[184.5,512.5],[-9,512.5]],holes:[[[438,329.5],[510,329.5],[510,563.5],[438,563.5]]]},
 {key:'gf-sunken',level:0,top:-12,thickness:8.25,polygon:[[184.5,329.5],[433.5,329.5],[433.5,662.5],[184.5,662.5]],holes:[]},
 {key:'ff-main',level:1,top:0,thickness:12,polygon:[[-9,-9],[954,-9],[954,170.5],[936,170.5],[936,635.5],[678,635.5],[678,444.5],[510,444.5],[510,572.5],[438,572.5],[438,512.5],[-9,512.5]],holes:[[[438,329.5],[510,329.5],[510,563.5],[438,563.5]],[[519,281.5],[689,281.5],[689,434.5],[519,434.5]]]},
 {key:'sf-store',level:2,top:0,thickness:14,polygon:[[375,-9],[528,-9],[528,208],[375,208]],holes:[]},
 {key:'sf-east',level:2,top:0,thickness:14,polygon:[[669,-9],[915,-9],[915,38.5],[954,38.5],[954,166],[936,166],[936,444.5],[738,444.5],[738,170.5],[669,170.5]],holes:[[[678,0],[832.5,0],[832.5,62],[790.5,62],[790.5,42],[720,42],[720,122],[678,122]]]},
];
export const windowHeightOverrides = {ordinary:96,source:'Owner instruction: window height should be same throughout, use 8 ft.',secondFloorHighSill:'Owner subsequent instruction: follow PDF for the 2 ft and 5 ft high-sill windows.'};
