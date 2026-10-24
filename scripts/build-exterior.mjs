import fs from 'node:fs';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {inch,xy,projectId,source} from '../src/588-m1.mjs';
import {screenCode,guardCode,tankCode,gateCode,trimCode,rechargeCode,paramCode,sourceUrl} from '../src/588-exterior.mjs';
const c=new Client({name:'pascal-exterior',version:'1'},{capabilities:{}});await c.connect(new StdioClientTransport({command:process.execPath,args:['scripts/pascal.mjs','mcp','connect']}));
async function call(name,args={}){const raw=await c.callTool({name,arguments:args});let r=raw.structuredContent;if(!r){try{r=JSON.parse(raw.content.find(x=>x.type==='text').text)}catch{throw Error(JSON.stringify(raw).slice(0,500));}}if(raw.isError||r.error||r.code)throw Error(name+': '+JSON.stringify(r).slice(0,700));return r;}
const gf='level_as4e3a9d57',ff='level_as4d3a9bc4',sf='level_as503aa07d';
let scene;
const basis={sourceFile:source.file,undimensioned:'PDF trace or explicitly labeled owner-authorized assumption; not surveyed or engineered'};
async function object(key,name,code,params,parentId,x,y,z,rotation=0,notes='PDF vector/elevation trace; sections dimensioned where given'){
 const old=Object.values(scene.nodes).find(n=>n.metadata?.exteriorKey===key);
 const r=await call('add_object',{...(old?{nodeId:old.id}:{}),name,code:paramCode(code,params),params,parentId,position:[inch(x),inch(y),inch(z)],rotation,category:'architectural detail',description:notes.slice(0,200),reason:'Reconstruct the governing PDF exterior; preserve traced and assumed dimensions as editable parameters.'});
 scene=await call('get_scene');const id=old?.id??r.nodeId??r.id??Object.values(scene.nodes).find(n=>n.type==='item'&&n.name===name)?.id;if(!id)throw Error('No item id '+JSON.stringify(r).slice(0,300));
 await call('apply_patch',{patches:[{op:'update',id,data:{metadata:{...scene.nodes[id].metadata,...basis,exteriorKey:key,dimensionBasis:notes}}}]});scene=await call('get_scene');console.log(key+' added');
}
async function slab(key,parentId,points,elevation,thickness){const id='slab_588_ext_'+key;const data={name:key,polygon:points.map(xy),elevation:inch(elevation),thickness:inch(thickness),autoFromWalls:false,metadata:{...basis,exteriorKey:key}};await call('apply_patch',{patches:[scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId,node:{id,type:'slab',parentId,...data}}]});}
try{
await call('load_scene',{id:projectId});scene=await call('get_scene');
await call('design_brief',{source:'open',vision:'Faithful architectural reconstruction from the supplied checked PDF. Geometry explicitly missing from the sheet is an owner-authorized Lahore-informed concept, marked as assumed. Neutral display colors only where no finish is specified.',axes:Object.fromEntries(['action','size','pieces','openings','style','materials','dressing'].map(k=>[k,{kind:'bounded',extent:'exact',quote:'Add the facade screens, terrace guards, external spiral stair, water tanks and boundary elements. Keep it accurate',reading:'Only the requested exterior/site details, following the PDF and labeled authorized assumptions.'}])),beyond:Object.fromEntries(['textiles','light','windows','walls','floor','plants','objects','smallFurniture'].map(k=>[k,{none:'No unrelated dressing in this bounded reconstruction.'}]))});
const stage=process.argv[2]??'details';
if(stage==='details'){
await call('apply_patch',{patches:[{op:'update',id:'building_8qvglnlmkl86m0dc',data:{position:[0,inch(18),0]}}]});
for(const [key,x,w,sw] of [['left',285,306,222],['right',841.5,198,198]])await object('screen-'+key,'Front '+key+' lattice screen · elevation trace',screenCode,{width:inch(w),height:inch(224),screenWidth:inch(sw),screenHeight:inch(114),footer:inch(24)},ff,x,-24,721.5,0,'Black diagonal lattice and architectural bands traced from front elevation; bar section/depth assumed for display.');
const guards=[['ff-left-front',ff,18,710.5,429,710.5],['ff-left-west',ff,18,512.5,18,710.5],['ff-left-east',ff,429,512.5,429,710.5],['ff-right-front',ff,678,710.5,1055.5,710.5],['ff-right-east',ff,1055.5,635.5,1055.5,710.5],['ff-right-west',ff,678,635.5,678,710.5],['sf-balcony-front',sf,915,-9,954,-9],['sf-balcony-east',sf,954,38.5,1000,-10]];
for(const [key,l,x0,z0,x1,z1]of guards)await object(key,key+' · glass guard',guardCode,{width:inch(Math.hypot(x1-x0,z1-z0)),height:inch(42)},l,(x0+x1)/2,0,(z0+z1)/2,-Math.atan2(z1-z0,x1-x0)*180/Math.PI,'Glass railing shown by elevation; 42 inch height assumed, with panel division and metal fixings schematic.');
for(const [key,x,z,h,w]of [['entry-left',514.5,600,356,9],['entry-right',673.5,600,356,9],['front-west',-4.5,512.5,356,18]])await object('pier-'+key,'Facade '+key+' · traced stone bands',trimCode,{width:inch(w),height:inch(h),depth:inch(12)},gf,x,0,z,0,'Vertical facade band traced from elevation; stone course spacing is a display assumption.');
// Front decks already exist. Add the exterior approach risers shown in the plan.
await slab('entry-step-6',gf,[[519,695.5],[669,695.5],[669,719.5],[519,719.5]],-12,6);
await slab('entry-step-12',gf,[[519,683.5],[669,683.5],[669,707.5],[519,707.5]],-6,6);
}else if(stage==='boundary'){
 const points=JSON.parse(fs.readFileSync('src/588-site.json')).polygon.map(p=>p.map(v=>v/.0254));
 const rear=[0,3,7,11,15,19,23,27,31,35,40,44,48,52,56,60,61].map(i=>points[i]);
 const front=points.slice(62).reverse();const zAt=x=>{for(let i=1;i<front.length;i++){const a=front[i-1],b=front[i];if(x>=a[0]&&x<=b[0])return a[1]+(x-a[0])/(b[0]-a[0])*(b[1]-a[1]);}return 950;};
 const runs=[...rear.slice(1).map((p,i)=>[rear[i],p]),[points[61],points[62]],[points[76],points[0]]];
 const frontBreak=[points[76],...front.filter(p=>p[0]>points[76][0]&&p[0]<762),[762,zAt(762)]];runs.push(...frontBreak.slice(1).map((p,i)=>[frontBreak[i],p]),[[978,zAt(978)],[987,zAt(987)]],[[1030,zAt(1030)],points[62]]);
 const patches=runs.map(([a,b],i)=>{const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);let nx=-dz/len,nz=dx/len;if(nx*(480-(a[0]+b[0])/2)+nz*(400-(a[1]+b[1])/2)<0){nx=-nx;nz=-nz;}a=[a[0]+nx*4.5,a[1]+nz*4.5];b=[b[0]+nx*4.5,b[1]+nz*4.5];const id='wall_588_boundary_'+i;const data={name:'Boundary wall · PDF 6 ft',start:xy(a),end:xy(b),thickness:inch(9),height:inch(72),supportOffset:-inch(18),metadata:{...basis,exteriorKey:'boundary-'+i,dimensionBasis:'72 inch elevation height; 9 inch plan thickness; outer face follows curved site trace; gate openings from dimension chain'}};return scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId:gf,node:{id,type:'wall',parentId:gf,...data}};});
 // Join the inset east boundary and front return at their exact line intersection.
 const east=patches[16].data??patches[16].node,frontReturn=patches[30].data??patches[30].node;
 const [a,b,c,d]=[east.start,east.end,frontReturn.start,frontReturn.end];
 const ux=b[0]-a[0],uz=b[1]-a[1],vx=d[0]-c[0],vz=d[1]-c[1];
 const t=((c[0]-a[0])*vz-(c[1]-a[1])*vx)/(ux*vz-uz*vx);
 east.end=frontReturn.end=[a[0]+t*ux,a[1]+t*uz];
 await call('apply_patch',{patches});scene=await call('get_scene');
 await object('gate-left','Vehicle gate left leaf · assumed detailing',gateCode,{width:inch(108),height:inch(72)},gf,816,-18,zAt(816),0,'18 ft opening dimensioned; two 9 ft metal leaves and slat pattern assumed.');
 await object('gate-right','Vehicle gate right leaf · assumed detailing',gateCode,{width:inch(108),height:inch(72)},gf,924,-18,zAt(924),180,'18 ft opening dimensioned; two 9 ft metal leaves and slat pattern assumed.');
 await object('pedestrian-gate','Pedestrian gate · traced opening',gateCode,{width:inch(43),height:inch(72)},gf,1008.5,-18,zAt(1008.5),0,'43 inch opening from front chain; metal slat detailing assumed.');
}else if(stage==='tanks'){
 // Overhead tank: section clear volume; 21 inch support reconciles elevation top +34 ft 5 in.
 await object('overhead-tank','Overhead water tank · 7′ × 7′ × 4′',tankCode,{width:inch(84),depth:inch(84),clearHeight:inch(48),wall:inch(6),base:inch(6),cover:inch(6),support:inch(21),chambers:1},sf,306,0,39,0,'84×84×48 inch clear tank; 6 inch RCC walls/base/cover. 21 inch supports assumed to preserve elevation top +34 ft 5 in. Position traced.');
 for(const [key,name,x,z,w,d,h,t,base,cover,chambers] of [['ug-water','Underground water tank',98,852,60,120,60,6,6,4,1],['gray-water','Grey-water tank',-15,857,72,96,72,9,9,6,1],['septic','Septic tank · three chambers',987,807,54,108,51,9,9,6,3]])await object(key,name+' · PDF sections',tankCode,{width:inch(w),depth:inch(d),clearHeight:inch(h),wall:inch(t),base:inch(base),cover:inch(cover),support:0,chambers},gf,x,-12-h-base-cover,z,0,'Plan position traced. Section dimensions govern conflicting depth labels. Cover top assumed at +6 inch landscape level; lids open for inspection.');
 await object('rainwater','Rainwater tank · ASSUMED Lahore concept',tankCode,{width:inch(120),depth:inch(78),clearHeight:inch(60),wall:inch(6),base:inch(6),cover:inch(4),support:0,chambers:1},gf,360,-18,850,0,'ASSUMED above-grade front service location; 10×6.5×5 ft clear, 6 inch freeboard gives ~1822 imperial gallons. LDA 5.6.6 uses 1700 gallons for 1.1–2 kanal; not an approved drainage design.');
 await object('recharge','Recharge pit · ASSUMED location',rechargeCode,{width:inch(36),depth:inch(36),height:inch(120)},gf,550,-132,850,0,'PDF section gives 10 ft depth and 3 ft diameter; circular section retained; front service location assumed. Connect only treated rainwater; no sewer connection modeled.');
}else if(stage==='spiral'){
 // Native spiral geometry: assumed service access from grade +6 to first and second floors.
 for(const [i,l,rise,base,steps]of [[0,gf,168,-12,24],[1,ff,158,0,23]]){
  const id='stair_588_external_'+i;const data={name:'External spiral '+(i+1)+' · ASSUMED service access',position:[inch(1005),inch(base),inch(-63)],rotation:(Math.PI*4/3+inch(42)/(.2+inch(21))/2-Math.PI*5/6)+(i===0?Math.PI*8/3+inch(42)/(.2+inch(21)):0),stairType:'spiral',fromLevelId:l,toLevelId:null,slabOpeningMode:'none',width:inch(42),innerRadius:.2,sweepAngle:Math.PI*8/3,totalRise:inch(rise),stepCount:steps,uniformRisers:true,thickness:inch(2),fillToFloor:false,topLandingMode:'integrated',topLandingDepth:inch(42),showCenterColumn:true,showStepSupports:true,railingMode:'both',railingStyle:'metal',railingHeight:inch(42),metadata:{...basis,exteriorKey:'spiral-'+i,assumption:'Owner authorized Lahore-informed inference. 42 inch clear width, approximately 8 ft 4 in diameter, 480 degree flight. Ground +6 to first +14 ft 6 to second +27 ft 8. Landing/door interfaces require confirmation.',guidance:sourceUrl}};
  await call('apply_patch',{patches:[scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId:l,node:{id,type:'stair',parentId:l,...data}}]});
 }
 // Explicit small landing at upper-floor balcony; geometry remains editable.
 await slab('spiral-upper-bridge',sf,[[915,-9],[954,-9],[985,-30],[1000,-10],[954,38.5],[915,38.5]],0,4);
}else throw Error('Unknown stage');
console.log('Completed '+stage);
}finally{await c.close();}
