import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {inch,xy,projectId,source} from '../src/588-m1.mjs';
import {screenCode,guardCode,tankCode,gateCode,slatGateCode,gatePierCode,entrySoffitCode,ledReveal,claddingCode,pergolaCode,planterCode,trimCode,rechargeCode,paramCode,sourceUrl} from '../src/588-exterior.mjs';
import * as EX from '../src/588-exterior.mjs';
const c=new Client({name:'pascal-exterior',version:'1'},{capabilities:{}});await c.connect(new StdioClientTransport({command:process.execPath,args:['scripts/pascal.mjs','mcp','connect']}));
async function call(name,args={}){await new Promise(r=>setTimeout(r,Number(process.env.PASCAL_THROTTLE_MS??1000)));const raw=await c.callTool({name,arguments:args});let r=raw.structuredContent;if(!r){try{r=JSON.parse(raw.content.find(x=>x.type==='text').text)}catch{throw Error(JSON.stringify(raw).slice(0,500));}}if(raw.isError||r.error||r.code)throw Error(name+': '+JSON.stringify(r).slice(0,700));return r;}
const gf='level_as4e3a9d57',ff='level_as4d3a9bc4',sf='level_as503aa07d';
let scene;
const basis={sourceFile:source.file,undimensioned:'PDF trace or explicitly labeled owner-authorized assumption; not surveyed or engineered'};
async function object(key,name,code,params,parentId,x,y,z,rotation=0,notes='PDF vector/elevation trace; sections dimensioned where given',off=[0,0]){
 const old=Object.values(scene.nodes).find(n=>n.metadata?.exteriorKey===key);
 const r=await call('add_object',{...(old?{nodeId:old.id}:{}),name,code:paramCode(code,params),params,parentId,position:[inch(x)+off[0],inch(y),inch(z)+off[1]],rotation,category:'architectural detail',description:notes.slice(0,200),reason:'Reconstruct the governing PDF exterior; preserve traced and assumed dimensions as editable parameters.'});
 scene=await call('get_scene');const id=old?.id??r.nodeId??r.id??Object.values(scene.nodes).find(n=>n.type==='item'&&n.name===name)?.id;if(!id)throw Error('No item id '+JSON.stringify(r).slice(0,300));
 await call('apply_patch',{patches:[{op:'update',id,data:{metadata:{...scene.nodes[id].metadata,...basis,exteriorKey:key,dimensionBasis:notes}}}]});scene=await call('get_scene');
 console.log(key+' added');
}
async function slab(key,parentId,points,elevation,thickness){const id='slab_588_ext_'+key;const data={name:key,polygon:points.map(xy),elevation:inch(elevation),thickness:inch(thickness),autoFromWalls:false,metadata:{...basis,exteriorKey:key}};await call('apply_patch',{patches:[scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId,node:{id,type:'slab',parentId,...data}}]});}
// ===== Pass 2 shared definitions (owner renders + architect plans, 2026-10-26) =====
const WHITE={properties:{color:'#e6e7e5',roughness:.85,metalness:0}},WHITE_NAME='Exterior plaster · cool white';
const SITE=JSON.parse(fs.readFileSync('src/588-site.json')).polygon.map(p=>p.map(v=>v/.0254));
const FRONT=SITE.slice(62).reverse();
// Front site line (street face of the front boundary wall), plan inches.
const zAt=x=>{for(let i=1;i<FRONT.length;i++){const a=FRONT[i-1],b=FRONT[i];if(x>=a[0]&&x<=b[0])return a[1]+(x-a[0])/(b[0]-a[0])*(b[1]-a[1]);}return 950;};
// Glass guards (42 in). Pass 2: ff-left-west moved to the architect terrace glass line x 134; ff-left-front starts there; Juliet guard in front of W4 over the void;
// ff-right-east removed (replaced by the white porch end wall); ff-right-front ends at that wall (x 1036).
const GUARDS=[['ff-left-front',ff,134,710.5,429,710.5],['ff-left-west',ff,134,512.5,134,710.5],['ff-left-east',ff,429,512.5,429,710.5],['ff-master-juliet',ff,18,513,130,513],['ff-right-front',ff,678,710.5,1036,710.5],['ff-right-west',ff,678,635.5,678,710.5],['ff-stair-front',ff,514.5,440,673.5,440],['sf-balcony-front',sf,915,-9,954,-9],['sf-balcony-east',sf,954,38.5,1000,-10]];
async function screens(){
 // Box faces: one uniform panel colour, joints 27/87 % from the top, sconce at 51 % (render f-left/f-right); left box vertical joint on the cut-out line.
 for(const [key,x,w,sw,cj,lx] of [['left',285,306,222,1,121],['right',841.5,198,198,0,99]]){
  await object('screen-'+key,'Front '+key+' box face · render panel',screenCode,{width:inch(w),height:inch(224),screenWidth:inch(sw),screenHeight:inch(114),footer:inch(24),centerJoint:cj,lampX:inch(lx)},ff,x,-24,721.5,0,'Box outline traced from the BC front elevation; one uniform light panel, joints at 27/87 % from the top, sconce at 51 % (owner renders p2/p3/f-left, pass 2).',[0,.035]);
  const n=Object.values(scene.nodes).find(v=>v.metadata?.exteriorKey==='screen-'+key);
  for(const [role,c,r,mt,nm] of [['face','#dedfdd',.85,0,'Front box panel · light grey'],['band','#e6e7e5',.8,0,WHITE_NAME],['joint','#b4b5b3',.9,0,'Front box joint'],['metal','#1e1f20',.5,.4,'Exterior black steel']]){
   try{await call('paint',{targets:[n.id],role,material:{properties:{color:c,roughness:r,metalness:mt}},materialName:nm});}catch(e){console.log('screen paint skipped',key,role,e.message.slice(0,120));}}
 }
 scene=await call('get_scene');
}
// Boundary walls from the site trace with the architect gate layout (GF plan piers at x 735–753, 796–814, 1030–1048: pedestrian gate 753–796, vehicle gate 814–1030).
// Runs are keyed by index; stale indices beyond the new count are deleted so a re-run never leaves orphans. The east-corner join finds its runs by geometry.
async function boundaryStage(){
 const points=SITE;
 const rear=[0,3,7,11,15,19,23,27,31,35,40,44,48,52,56,60,61].map(i=>points[i]);
 const runs=[...rear.slice(1).map((p,i)=>[rear[i],p]),[points[61],points[62]],[points[76],points[0]]];
 const cuts=[30,135,525,615]; // render p2/f-left/f-right: lowered wall behind the two front pier clusters
 const fp=[points[76],...FRONT.filter(p=>p[0]>points[76][0]&&p[0]<735&&!cuts.some(c=>Math.abs(c-p[0])<3)),...cuts.map(x=>[x,zAt(x)]),[735,zAt(735)]].sort((a,b)=>a[0]-b[0]);
 runs.push(...fp.slice(1).map((p,i)=>[fp[i],p]),[[1048,zAt(1048)],points[62]]);
 const low=(a,b)=>{const m=(a[0]+b[0])/2;return (m>30&&m<135)||(m>525&&m<615);};
 const patches=runs.map(([a,b],i)=>{const lowRun=low(a,b);const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);let nx=-dz/len,nz=dx/len;if(nx*(480-(a[0]+b[0])/2)+nz*(400-(a[1]+b[1])/2)<0){nx=-nx;nz=-nz;}a=[a[0]+nx*4.5,a[1]+nz*4.5];b=[b[0]+nx*4.5,b[1]+nz*4.5];const id='wall_588_boundary_'+i;
  const data={name:'Boundary wall · PDF 6 ft'+(lowRun?' · lowered behind render pier cluster':''),start:xy(a),end:xy(b),thickness:inch(9),height:inch(lowRun?54:72),supportOffset:-inch(18),metadata:{...basis,exteriorKey:'boundary-'+i,dimensionBasis:'72 inch elevation height (54 behind the render pier clusters); 9 inch plan thickness; outer face follows curved site trace; gate openings and piers per architect GF plan (pass 2)'}};
  return scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId:gf,node:{id,type:'wall',parentId:gf,...data}};});
 const east=patches[16].data??patches[16].node,frontReturn=patches[patches.length-1].data??patches[patches.length-1].node;
 const [a,b,c,d]=[east.start,east.end,frontReturn.start,frontReturn.end];
 const ux=b[0]-a[0],uz=b[1]-a[1],vx=d[0]-c[0],vz=d[1]-c[1];
 const t=((c[0]-a[0])*vz-(c[1]-a[1])*vx)/(ux*vz-uz*vx);
 east.end=frontReturn.end=[a[0]+t*ux,a[1]+t*uz];
 for(let i=runs.length;i<60;i++){const id='wall_588_boundary_'+i;if(scene.nodes[id])patches.push({op:'delete',id});}
 await call('apply_patch',{patches});scene=await call('get_scene');
 const bw=Object.values(scene.nodes).filter(n=>n.type==='wall'&&/^wall_588_boundary_/.test(n.id)).map(n=>n.id);
 for(const role of ['a','b'])await call('paint',{targets:bw,role,material:WHITE,materialName:WHITE_NAME});
 // Gates: architect positions; all leaves swing outward over the street as the architect draws them (owner 2026-10-26).
 const note='Architect GF plan: 18 ft opening x 814–1030 between piers, two 9 ft leaves swinging outward (owner decision 2026-10-26); solid black wood-grain flush panels, rails at 18/82 % per render p4.';
 await object('gate-left','Vehicle gate left leaf · architect opening',gateCode,{width:inch(108),height:inch(72),cols:3,swing:0,dark:0,accents:0},gf,868,-18,zAt(868),0,note);
 await object('gate-right','Vehicle gate right leaf · architect opening',gateCode,{width:inch(108),height:inch(72),cols:3,swing:1,dark:0,accents:1},gf,976,-18,zAt(976),180,note);
 await object('pedestrian-gate','Pedestrian gate · architect position 753–796',gateCode,{width:inch(43),height:inch(72),cols:1,swing:0,dark:1,accents:0},gf,774.5,-18,zAt(774.5),0,'Architect GF plan: 43 in pedestrian gate west of the vehicle gate, swinging outward; solid charcoal door per render p3/p4.');
 for(const [key,x] of [['gate-pier-west',744],['gate-pier-mid',805],['gate-pier-east',1039]])await object(key,'Gate pier '+key.slice(10)+' · masonry + lantern',gatePierCode,{width:inch(18),depth:inch(18),height:inch(78),lanternHeight:inch(7),lanternWidth:inch(12)},gf,x,-18,zAt(x),0,'Architect GF plan pier 18×19 in (x '+(x-9)+'–'+(x+9)+'); white masonry, 6 in above the wall, three-band box lantern per render p4.');
 const fin=async(k,slots)=>{const n=Object.values(scene.nodes).find(x=>x.metadata?.exteriorKey===k);for(const [role,c,r,mt,nm] of slots){try{await call('paint',{targets:[n.id],role,material:{properties:{color:c,roughness:r,metalness:mt}},materialName:nm});}catch(e){console.log('paint skipped',k,role,e.message.slice(0,100));}}};
 for(const k of ['gate-left','gate-right'])await fin(k,[['gate_wood','#1b1b1c',.55,0,'Gate black wood'],['gate_panel','#262627',.5,0,'Gate black wood panel'],['gate_grain','#363536',.6,0,'Gate wood grain line'],['metal','#1e1f20',.5,.4,'Exterior black steel']]);
 await fin('pedestrian-gate',[['gate_wood','#303132',.5,.5,'Facade charcoal cladding'],['gate_panel','#38393a',.5,.4,'Pedestrian gate panel charcoal'],['metal','#1e1f20',.5,.4,'Exterior black steel']]);
 for(const k of ['gate-pier-west','gate-pier-mid','gate-pier-east'])await fin(k,[['pier','#e6e7e5',.85,0,WHITE_NAME],['pier_joint','#cfd0ce',.9,0,'Gate pier joint'],['lantern_frame','#1e1f20',.5,.5,'Exterior black steel']]);
 scene=await call('get_scene');
}
// Outdoor wall faces the room test cannot classify: [wall name or name#id, face].
const P2_EXTRA_FACES=[['gf-lounge-east#wall_588_gf_lounge_east_1','a'],['gf-lounge-east#wall_as1e46695c','a'],['gf-shaft-back#wall_asfe754fa4','b'],['gf-shaft-east#wall_588_gf_shaft_east_1','b'],['gf-powder-west#wall_588_gf_powder_west_1','b'],
 ['ff-shaft-back#wall_asbf26d09b','b'],['ff-shaft-east#wall_asd7c7990d','b'],['ff-shaft-east#wall_588_ff_shaft_east_1','b'],['ff-lounge-shaft-west#wall_588_ff_lounge_shaft_west_1','a'],
 ['sf-store-west#wall_as5bb0a21f','b'],['sf-store-front#wall_as13dc21bf','b'],['sf-maid-mumty-front#wall_as693d64ae','b'],['sf-maid-mumty-front#wall_588_sf_maid_mumty_front_3','b'],['sf-bedroom-west#wall_asc4e299dc','b'],['sf-bedroom-west#wall_588_sf_bedroom_west_1','b'],['sf-bath-front#wall_as0e9642f7','b'],['sf-bath-front#wall_588_sf_bath_front_1','b']];
try{
const sceneId=process.env.PASCAL_SCENE??projectId;await call('load_scene',{id:sceneId});scene=await call('get_scene');
await call('design_brief',{source:'open',vision:'Faithful architectural reconstruction from the supplied checked PDF. Geometry explicitly missing from the sheet is an owner-authorized Lahore-informed concept, marked as assumed. Neutral display colors only where no finish is specified.',axes:Object.fromEntries(['action','size','pieces','openings','style','materials','dressing'].map(k=>[k,{kind:'bounded',extent:'exact',quote:'Add the facade screens, terrace guards, external spiral stair, water tanks and boundary elements. Keep it accurate',reading:'Only the requested exterior/site details, following the PDF and labeled authorized assumptions.'}])),beyond:Object.fromEntries(['textiles','light','windows','walls','floor','plants','objects','smallFurniture'].map(k=>[k,{none:'No unrelated dressing in this bounded reconstruction.'}]))});
const stage=process.argv[2]??'details';
if(stage==='details'){
await call('apply_patch',{patches:[{op:'update',id:'building_8qvglnlmkl86m0dc',data:{position:[0,inch(18),0]}}]});
await screens();
const guards=GUARDS;
for(const [key,l,x0,z0,x1,z1]of guards)await object(key,key+' · glass guard',guardCode,{width:inch(Math.hypot(x1-x0,z1-z0)),height:inch(42)},l,(x0+x1)/2,0,(z0+z1)/2,-Math.atan2(z1-z0,x1-x0)*180/Math.PI,'Glass railing shown by elevation; 42 inch height assumed, with panel division and metal fixings schematic.');
// Pass 2: the stone piers (pier-entry-*, pier-front-west) are replaced by the white blade/portal walls built in stage render2a.
// Front decks already exist. Add the exterior approach risers shown in the plan.
await slab('entry-step-6',gf,[[519,695.5],[669,695.5],[669,719.5],[519,719.5]],-12,6);
await slab('entry-step-12',gf,[[519,695.5],[669,695.5],[669,707.5],[519,707.5]],-6,6); // starts at the lowered podium front (owner decision 2026-10-25) so the +12 treads do not overlap coplanar
}else if(stage==='boundary'){
 await boundaryStage();
}else if(stage==='tanks'){
 // Overhead tank: architect second-floor plan governs (pass 2).
 await object('overhead-tank','Overhead water tank · 9′-6″ × 9′-6″ (architect)',tankCode,{width:inch(96),depth:inch(96),clearHeight:inch(54),wall:inch(9),base:inch(6),cover:inch(6),support:inch(6),chambers:1},sf,255,0,47,0,'Pass 2: architect SF plan O.H.W.T 9′-6″×9′-6″ outer (96 in clear + 9 in RCC walls), top +33′-8″ from road = SF +72 (6 in supports + 6 base + 54 clear + 6 cover); centre traced at x 255, z 47. Architect plan overrides BC 7′×7′×4′.');
 for(const [key,name,x,z,w,d,h,t,base,cover,chambers] of [['ug-water','Underground water tank',98,852,60,120,60,6,6,4,1],['gray-water','Grey-water tank',-15,857,72,96,72,9,9,6,1],['septic','Septic tank · three chambers',987,807,54,108,51,9,9,6,3]])await object(key,name+' · PDF sections',tankCode,{width:inch(w),depth:inch(d),clearHeight:inch(h),wall:inch(t),base:inch(base),cover:inch(cover),support:0,chambers},gf,x,-12-h-base-cover,z,0,'Plan position traced. Section dimensions govern conflicting depth labels. Cover top assumed at +6 inch landscape level; lids open for inspection.');
 await object('rainwater','Rainwater tank · ASSUMED Lahore concept',tankCode,{width:inch(120),depth:inch(78),clearHeight:inch(60),wall:inch(6),base:inch(6),cover:inch(4),support:0,chambers:1},gf,360,-82,850,0,'Owner 2026-10-26: sunk underground, lid flush with the lawn (+6). ASSUMED above-grade front service location; 10×6.5×5 ft clear, 6 inch freeboard gives ~1822 imperial gallons. LDA 5.6.6 uses 1700 gallons for 1.1–2 kanal; not an approved drainage design.');
 await object('recharge','Recharge pit · ASSUMED location',rechargeCode,{width:inch(36),depth:inch(36),height:inch(120)},gf,550,-132,850,0,'PDF section gives 10 ft depth and 3 ft diameter; circular section retained; front service location assumed. Connect only treated rainwater; no sewer connection modeled.');
}else if(stage==='spiral'){
 // Native spiral geometry: assumed service access from grade +6 to first and second floors.
 for(const [i,l,rise,base,steps]of [[0,gf,168,-12,24],[1,ff,158,0,23]]){
  const id='stair_588_external_'+i;const data={name:'External spiral '+(i+1)+' · ASSUMED service access',position:[inch(1005),inch(base),inch(-63)],rotation:(Math.PI*4/3+inch(42)/(.2+inch(21))/2-Math.PI*5/6)+(i===0?Math.PI*8/3+inch(42)/(.2+inch(21)):0),stairType:'spiral',fromLevelId:l,toLevelId:null,slabOpeningMode:'none',width:inch(42),innerRadius:.2,sweepAngle:Math.PI*8/3,totalRise:inch(rise),stepCount:steps,uniformRisers:true,thickness:inch(2),fillToFloor:false,topLandingMode:'integrated',topLandingDepth:inch(42),showCenterColumn:true,showStepSupports:true,railingMode:'both',railingStyle:'cable',railingHeight:inch(42),metadata:{...basis,exteriorKey:'spiral-'+i,assumption:'Owner authorized Lahore-informed inference. 42 inch clear width, approximately 8 ft 4 in diameter, 480 degree flight. Ground +6 to first +14 ft 6 to second +27 ft 8. Landing/door interfaces require confirmation.',guidance:sourceUrl}};
  await call('apply_patch',{patches:[scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId:l,node:{id,type:'stair',parentId:l,...data}}]});
 }
 // Explicit small landing at upper-floor balcony; geometry remains editable.
 await slab('spiral-upper-bridge',sf,[[915,-9],[954,-9],[985,-30],[1000,-10],[954,38.5],[915,38.5]],0,4);
}else if(stage==='front'){
 // Street-front pass matching the owner renders. Idempotent: items are keyed by exteriorKey, native openings by metadata.frontKey.
 const frameMat='scene:mat_m548d3ql7l2z76yt';
 // 1. Entrance: curtain wall on gf-entry-front (native fixed windows either side of D1, mullions via column/row ratios), wood D1, soffit, LED reveals.
 const entry='wall_as8bd1c732',doorId='door_p4au1lr69jeii7u9',wallLen=159,wall0=514.5;
 const glaze=[['entry-glaze-left',539,48,2,295,[0.5,0.5]],['entry-glaze-right',649,48,2,295,[0.5,0.5]],['entry-glaze-transom',594,60,289,8,null]];
 for(const [key,cx,wi,sill,ht] of glaze){
  let w=Object.values(scene.nodes).find(n=>n.type==='window'&&n.metadata?.frontKey===key);
  if(!w){await call('add_window',{wallId:entry,t:(cx-wall0)/wallLen,width:inch(wi),height:inch(ht),sillHeight:inch(sill)});const after=await call('get_scene');w=Object.values(after.nodes).find(n=>n.type==='window'&&n.wallId===entry&&!scene.nodes[n.id]);if(!w)throw Error('window not added '+key);scene=after;}
  const rows=key==='entry-glaze-transom'?[1]:[10,107,54,60,64];
  await call('apply_patch',{patches:[{op:'update',id:w.id,data:{name:'Entrance curtain wall · '+key,columnRatios:key==='entry-glaze-transom'?[1,1]:[1,1],rowRatios:rows,slots:{...w.slots,frame:frameMat},metadata:{...w.metadata,...basis,frontKey:key,dimensionBasis:'Owner render p6/s02 double-height glazed curtain wall, black mullion grid; BC elevation shows mullioned glazing between piers.'}}}]});scene=await call('get_scene');
 }
 await call('apply_patch',{patches:[{op:'update',id:doorId,data:{doorType:'hinged',leafCount:1,hingesSide:'right',handleSide:'left',swingDirection:'outward',swingAngle:0,segments:[{type:'panel',heightRatio:1,columnRatios:[1],dividerThickness:.03,panelDepth:.03,panelInset:.06}],metadata:{...scene.nodes[doorId].metadata,frontKey:'entry-door-wood',appearance:'Solid timber leaf per owner render p6 (walnut panel ~38% of width).',ownerDecision:'Room review 2026-10-25: entrance (single leaf, east hinge, swings north into lobby)'}}}]});scene=await call('get_scene');
 await object('entry-soffit','Entrance soffit · timber slats, 7 downlights',entrySoffitCode,{width:inch(148.4),depth:inch(103),fasciaH:inch(30)},gf,594,300,651.5,0,'Timber slat soffit between entry piers, x 519..669, z 600..703, underside 300 in above GF floor; emissive downlight discs and LED reveal only (no real lights).');
 await object('entry-led','Entrance pier LED reveals',ledReveal,{height:inch(292),span:inch(148)},gf,594,8,700,0,'Thin emissive LED reveal on the inner face of each entrance pier.');
 // 2/3. Front boxes (solid light panel faces, wall lamp) and widened left fin are handled by the details stage definitions above.
 await screens();
 // Pass 2: pier-front-west superseded by blade-west (render2a).
 // Pass 2: pier-entry-* superseded by portal-west/east (render2a).
 // 4. Dark cladding (charcoal, 3.5 in proud of the front wall faces).
 const clad=(key,name,x0,x1,roadY0,roadY1,zBack,depth,pitch,hole,note)=>object(key,name,claddingCode,{width:inch(x1-x0),height:inch(roadY1-roadY0),depth:inch(depth),pitch:inch(pitch),holeX:inch(hole?.[0]??0),holeY:inch(hole?.[1]??0),holeW:inch(hole?.[2]??0),holeH:inch(hole?.[3]??0)},ff,(x0+x1)/2,roadY0-174,zBack,0,note,[0,inch(depth)/2]);
 await clad('cladding-right','Dark fluted cladding · right of entrance',680,760,150,374,635.5,3.5,4.5,[0,28,60,100],'Render s02/p6/f-right: fluted charcoal metal panel FF to parapet around FF window W14 (x 678..738, sill 180..276 road).');
 await clad('spandrel-lower','Dark spandrel · below FF window beside left box',438,510,145,177,572.5,3.5,0,null,'Render s02: dark spandrel panel below FF window W11 beside the left box.');
 await clad('spandrel-upper','Dark spandrel · above FF window beside left box',438,510,278,332,572.5,3.5,0,null,'Render s02: dark spandrel panel above FF window W11 beside the left box.');
 await clad('slat-strip','Dark slat strip · beside left box',104,128,6,332,717,9,2.5,null,'Render s02/f-left: dark vertical slat strip between left fin and left box, in the box plane (z 717..726).');
 // 5. Window mullions on front-facing windows (sizes and heights untouched).
 const front={window_78bgjba2ntnv4ii4:4,window_5zttqap3p8rw5nvv:6,window_kxctyh4o7f47fxq8:2,window_klgt5jm9er5a1o7y:4,window_e049zxtna9o1msyv:4,window_41ipsx11sbxbe55f:4,window_xtcvc9xi029wfeuc:2,window_o0l3bclru7g3z1l5:2,window_37rm0ngmon7vq1s4:4};
 await call('apply_patch',{patches:Object.entries(front).map(([id,n])=>({op:'update',id,data:{columnRatios:Array(n).fill(1),metadata:{...scene.nodes[id].metadata,frontKey:'mullions-'+n,mullionBasis:'BC elevation 4-panel/2-panel groups; divisions only, size unchanged'}}}))});scene=await call('get_scene');
 // 6. Vehicle gate: solid leaves (gateCode in the boundary stage) and two white masonry piers with emissive lanterns.
 // Pass 2: gate leaves, pedestrian gate and gate piers are built by boundaryStage() at the architect positions.



 // 7. Pergola and planter over the left box terrace cut-out.
 await object('pergola','Terrace pergola · dark steel grid',pergolaCode,{width:inch(69),depth:inch(99),bar:inch(4)},ff,392.5,107,664.5,0,'Render s02/s03/p7: dark steel grid at the top of the terrace cut-out x 358..427, back about 100 in from the box.');
 await object('terrace-planter','Terrace planter · at glass guard',planterCode,{width:inch(62),depth:inch(10),height:inch(18)},ff,392.5,0,700,0,'Render s02/p7: planter behind the glass guard at the terrace cut-out.');
 // Exact finishes (slot names come from the modules; library presets are replaced by exact native materials).
 const finish=async(key,slots)=>{const n=Object.values(scene.nodes).find(x=>x.metadata?.exteriorKey===key);if(!n)throw Error('no item '+key);for(const [slot,[color,roughness,metalness,materialName]] of Object.entries(slots)){try{await call('paint',{targets:[n.id],role:slot,material:{properties:{color,roughness,metalness}},materialName});}catch(e){if(!/unknown_role/.test(e.message))throw e;}}scene=await call('get_scene');};
 const BLACK=['#282c2b',.65,.65,'Front black metal'],CLAD=['#3a3b3d',.5,.55,'Facade charcoal cladding'];

 for(const k of ['cladding-right','spandrel-lower','spandrel-upper','slat-strip'])await finish(k,{cladding:CLAD});
 await finish('entry-soffit',{timber:['#85674a',.7,0,'Entrance soffit timber'],plaster:['#eeece6',.85,0,'Entrance soffit plaster']});


 await finish('pergola',{metal:BLACK});
 await finish('terrace-planter',{planter:['#e9e7e1',.8,0,'Planter white'],soil:['#3b2f26',1,0,'Planter soil'],foliage:['#4c6b3b',.9,0,'Planter foliage']});
}else if(stage.startsWith('render2')){
 // Pass 2 (owner renders govern the look; architect plans > BC for sizes/positions; front glazing heights follow the renders). Sub-stages: a = A–C, b = D–F, c = G–J.
 const sub=stage.slice(7)||'abc';
 const {MAT,P2_FINISH_NAMES,bake,BX,BC,CYL,SPH,treeParts,slimTreeParts,palmParts,carParts}=EX;
 const keyNode=k=>Object.values(scene.nodes).find(n=>n.metadata?.exteriorKey===k);
 const del=async k=>{const n=Object.values(scene.nodes).find(n=>n.type==='item'&&n.metadata?.exteriorKey===k);if(n){await call('delete_node',{id:n.id});scene=await call('get_scene');console.log('deleted',k);}};
 const paintSlots=async(key,slots)=>{const n=keyNode(key);for(const s of slots){const M=MAT[s];const props={color:M.c,roughness:M.r??.7,metalness:M.mt??0};if(M.o!=null){props.opacity=M.o;props.transparent=true;}
  try{await call('paint',{targets:[n.id],role:M.n.replace(/^slot_/,''),material:{properties:props},materialName:P2_FINISH_NAMES[s]});}catch(e){console.log('paint skipped',key,s,e.message.slice(0,120));}}scene=await call('get_scene');};
 const baked=async(key,name,parts,parent,note,rot=0,at=null)=>{const b=bake(parts);const pos=at?[at[0],b.pos[1]+(at[1]??0),at[2]]:b.pos;await object(key,name,b.code,{},parent,pos[0],pos[1],pos[2],rot,note);await paintSlots(key,b.slots);return b;};
 const paintSlab=async(name,props,materialName)=>{const s=Object.values(scene.nodes).find(n=>n.type==='slab'&&(n.name===name||n.id===name));if(!s)throw Error('no slab '+name);
  try{await call('paint',{targets:[s.id],material:{properties:props},materialName});}catch(e){await call('paint',{targets:[s.id],role:'surface',material:{properties:props},materialName});}};
 const guard=async([key,l,x0,z0,x1,z1])=>object(key,key+' · glass guard',guardCode,{width:inch(Math.hypot(x1-x0,z1-z0)),height:inch(42)},l,(x0+x1)/2,0,(z0+z1)/2,-Math.atan2(z1-z0,x1-x0)*180/Math.PI,'Glass railing 42 in; pass 2 positions per architect FF plan (terrace glass at x 134, Juliet guard in front of W4 over the open void, east end at the porch end wall).');
 if(sub.includes('a')){
  // A1. Every exterior wall face cool white (render p2/p5/p12); interiors keep their finish. Parapets and boundary walls: both faces.
  const lvls=new Set([gf,ff,sf,'level_6mnj4xp8f5jn8td0']);const refused=[];
  for(const w of Object.values(scene.nodes).filter(n=>n.type==='wall'&&lvls.has(n.parentId))){
   if(/^Boundary|parapet/i.test(w.name||'')){for(const role of ['a','b'])await call('paint',{targets:[w.id],role,material:WHITE,materialName:WHITE_NAME});continue;}
   try{await call('paint',{targets:[w.id],role:'exterior',material:WHITE,materialName:WHITE_NAME});}catch(e){refused.push((w.name||'')+' '+w.id+' :: '+e.message.slice(0,160));}}
  fs.writeFileSync((process.env.EXT_OUT??'/tmp')+'/p2-paint-refused.txt',refused.join('\n'));console.log('exterior paint refused',refused.length);scene=await call('get_scene');
  // A2. Box faces. A3. Guards (architect terrace glass line x 134, Juliet guard, porch end).
  await screens();
  for(const g of GUARDS.filter(g=>['ff-left-front','ff-left-west','ff-master-juliet','ff-right-front'].includes(g[0])))await guard(g);
  await del('ff-right-east');
  // B1. West blade wall (architect fin x -9..18: GF z 572.5..710, FF z 497..710; render: white, full height, LED line) replaces the stone pier.
  await baked('blade-west','West blade wall · architect fin, render white',[BX(-9,18,-12,144,572.5,710,'white','blade'),BX(-9,18,144,360,512.5,710,'white','blade'),BX(-1.3,-.5,-12,358,710,710.35,'led','led_line')],gf,'Architect GF/FF plans: 27 in fin from x -9 to 18, GF part z 572.5–710 (front of the master deck), upper part z 512.5–710; top GF 360 (4 in above the box tops). White with a full-height LED line on the street face (render p2/p5/p12).');
  await del('pier-front-west');
  // B2. First-floor left terrace only east of the architect terrace glass (x 134); west of it is the open void over the master deck.
  const terr=Object.values(scene.nodes).find(n=>n.type==='slab'&&n.name==='Front left terrace');
  await call('apply_patch',{patches:[{op:'update',id:terr.id,data:{polygon:[[134,512.5],[429,512.5],[429,710.5],[134,710.5]].map(xy),metadata:{...(terr.metadata??{}),pass2:'Owner 2026-10-26 / architect FF plan: terrace from the glass line x 134; x 18–134 is open void with the tree and Juliet guard.'}}}]});scene=await call('get_scene');
  // B4. Timber slat soffit with LED line under the SF overhang (renders p10/p12).
  const sl=[];for(let z=513.5;z<566;z+=2)sl.push(BX(18,433.5,142.5,144,z,z+1.5,'timber','slats'));sl.push(BX(18,433.5,142.1,142.5,566,567,'led','led_line'));
  await baked('ff-shade-soffit','First-floor shade soffit · timber slats + LED',sl,ff,'Timber slat soffit under the second-floor overhang, x 18–433.5, z 512.5–567, underside FF +144 (renders p10/p12).');
  // B5. Dark slat strip from the lawn to the box top (render f-left).
  await object('slat-strip','Dark slat strip · beside left box',claddingCode,{width:inch(24),height:inch(326),depth:inch(9),pitch:inch(2.5),holeX:0,holeY:0,holeW:0,holeH:0},ff,116,6-174,717,0,'Render f-left: dark vertical slats from the lawn (+6) to the box top in the box plane x 104–128, z 717–726 (pass 2).',[0,inch(9)/2]);
  // B6. Dark slat screens over the west windows, both storeys (render p5/p12; estimate).
  for(const zc of [155.41,237.94,470.43])await object('west-slats-'+Math.round(zc),'West face dark slat screen · z '+Math.round(zc),claddingCode,{width:inch(52),height:inch(252),depth:inch(3),pitch:inch(3),holeX:0,holeY:0,holeW:0,holeH:0},gf,-10.5,0,zc,-90,'Render p5/p12: dark vertical slat strip over the west windows W15/W16 on both floors, 52 in wide, GF 0–252 (estimate from render).');
  for(const zc of [155,238,470]){const n=keyNode('west-slats-'+zc);if(n)try{await call('paint',{targets:[n.id],role:'cladding',material:{properties:{color:'#303132',roughness:.5,metalness:.5}},materialName:'Facade charcoal cladding'});}catch(e){}}
  // C1. Entrance portal walls (lobby side walls continued to the front, architect GF/FF; render p6) replace the stone posts.
  for(const [key,x0,x1] of [['portal-west',510,519],['portal-east',669,678]])await baked(key,'Entrance portal wall · white',[BX(x0,x1,-6,144,653.3,710.3,'white','portal'),BX(x0,x1,144,360,595,710.3,'white','portal')],gf,'Architect plans: lobby side wall continues to the podium front (z 710); white deep portal to GF 360 per render p6. Lower part only in front of the existing GF walls (z 653.3–710.3).');
  await del('pier-entry-left');await del('pier-entry-right');
  // C2. Low height roof = white 30 in lintel over the timber soffit (architect SF plan x 521–669, z 599–710).
  await object('entry-soffit','Entrance soffit + low height roof · timber slats, 7 downlights',entrySoffitCode,{width:inch(148.4),depth:inch(103),fasciaH:inch(30)},gf,594,300,651.5,0,'Timber slat soffit x 519–669, z 600–703, underside GF 300; white 30 in lintel = architect "low height roof" above (render p6).');
  {const n=keyNode('entry-soffit');for(const [role,c,r,nm] of [['timber','#9a7752',.7,'Entrance soffit timber'],['plaster','#e6e7e5',.85,WHITE_NAME]])try{await call('paint',{targets:[n.id],role,material:{properties:{color:c,roughness:r,metalness:0}},materialName:nm});}catch(e){console.log('soffit paint',role,e.message.slice(0,80));}}
  // C3. Black stone posts inside the entrance glazing; C4. black stone podium/steps + LED nosings (render p6/p7).
  await del('entry-posts');
  for(const [k,x0] of [['entry-post-west',536],['entry-post-east',642]])await baked(k,'Entrance black stone post',[BX(x0,x0+10,0,300,600,610,'stone','post')],gf,'Render p6/p7: near-black stone post inside the entrance glazing at about 0.14 / 0.86 of the portal opening (estimate).');
  await baked('entry-step-led','Entrance step LED nosings',[BX(519,669,-6.8,-6.3,707.6,708.1,'led','led_line'),BX(519,669,-.8,-.3,653.4,653.9,'led','led_line')],gf,'Render p7: LED strip under the entrance step nosings.');
  for(const nm of ['Entrance podium · +18″','Entrance podium front · +12″','entry-step-6','entry-step-12'])await paintSlab(nm,{color:'#141414',roughness:.2,metalness:0},'Black polished stone');
  scene=await call('get_scene');
 }
 if(sub.includes('a')||sub.includes('x')){
  // Outdoor faces the room test cannot name: walls that stand in the open in front of the lounge, shaft and portal.
  for(const [name,role] of P2_EXTRA_FACES){const w=Object.values(scene.nodes).find(n=>n.type==='wall'&&n.name===name.split('#')[0]&&(!name.includes('#')||n.id===name.split('#')[1]));if(w){try{await call('paint',{targets:[w.id],role,material:WHITE,materialName:WHITE_NAME});}catch(e){console.log('extra face refused',name,e.message.slice(0,100));}}}
 }
 if(sub.includes('b')){
  // D1. Front glazing heights follow the renders (openings.json renderHeight/renderSill; centre = sill + h/2).
  const op=JSON.parse(fs.readFileSync('src/588-openings.json'));const lvlOf=[gf,ff,sf];const wp=[];
  for(const o of op.windows.filter(o=>o.renderHeight)){const w=Object.values(scene.nodes).find(n=>n.type==='window'&&n.metadata?.sourceTag===o.tag&&scene.nodes[n.wallId]?.name===o.wall&&scene.nodes[n.wallId]?.parentId===lvlOf[o.level]);
   if(!w){console.log('window not found',o.tag,o.wall);continue;}
   wp.push({op:'update',id:w.id,data:{height:inch(o.renderHeight),position:[w.position[0],inch(o.renderSill+o.renderHeight/2),w.position[2]],metadata:{...w.metadata,heightBasis:o.heightDecision,renderHeightInches:o.renderHeight,renderSillInches:o.renderSill}}});}
  await call('apply_patch',{patches:wp});scene=await call('get_scene');console.log('windows resized',wp.length);
  // D2. Black vertical fin screens in front of the GF front glazing (renders p2/p4/p7/p12); D3. LED line under the box soffits.
  const fins=(x0,x1,z,y0,y1)=>{const p=[];const pat=[4,7,4,12,5,8,4,14];let x=x0+2,i=0;while(x<x1-2){p.push(BX(x-1,x+1,y0+2,y1-2,z-2,z+2,'black','fins'));x+=pat[i++%pat.length];}p.push(BX(x0,x1,y1-2,y1,z-2.5,z+2.5,'black','channel'),BX(x0,x1,y0,y0+2,z-2.5,z+2.5,'black','channel'));return p;};
  await baked('fins-w5','Fin screen · master W5',fins(18,162,518.5,-6,132),gf,'Render p12: irregular black vertical fins 2×4 in in front of the full-height master glazing (pattern estimated).');
  await baked('fins-w1','Fin screen · lounge W1',fins(189,429,668.5,-6,132),gf,'Render p2/p7: irregular black vertical fins in front of the full-height lounge glazing (pattern estimated).');
  await baked('fins-w6','Fin screen · drawing room W6',fins(771,903,645,-12,132),gf,'Render p4: irregular black vertical fins in front of the drawing-room glazing (pattern estimated).');
  await baked('box-soffit-led','Box soffit LED lines',[BX(132,438,131.4,131.8,715.6,716.4,'led','led_line'),BX(742,940,131.4,131.8,715.6,716.4,'led','led_line')],gf,'Render p2/p7/p12: LED line under the front boxes.');
  // E1. White porch end wall (architect GF bar at x ≈1050; render p4), inboard of the east boundary. E2. Charcoal FF slab fascia. E3. Timber soffit + downlights.
  // E1 is built in sub-step w (two level-owned walls).
  await baked('fascia-ff-right','First-floor terrace fascia · charcoal',[BX(678,742,140,158,710.5,713.5,'charcoal','fascia'),BX(940,1036,140,158,710.5,713.5,'charcoal','fascia'),BX(675,678,140,158,635.5,713.5,'charcoal','fascia')],gf,'Render p4: dark 18 in slab-edge band under the first-floor glass guards.');
  {const p=[];for(let z=637;z<708;z+=3)p.push(BX(678,1036,142.5,144,z,z+2,'timber','slats'));for(let x=702;x<1030;x+=48)p.push(CYL(2.5,2.5,.3,x,142.1,690,'lamp','downlights'));p.push(BX(678,1036,142.1,142.5,708.5,709.5,'led','led_line'));
   await baked('ff-right-soffit','Porch soffit · timber slats + downlights',p,gf,'Render p2/p4: timber slat soffit with downlights under the first-floor right terrace, x 678–1036, z 637–710.');}
  // E4. Charcoal fluted cladding on the GF drawing-room front with holes for W19 and W6 (render p4/f-right).
  await object('cladding-gf-a','Dark fluted cladding · GF drawing front west',claddingCode,{width:inch(97.5),height:inch(144),depth:inch(3.5),pitch:inch(4.5),holeX:inch(4.5),holeY:0,holeW:inch(18),holeH:inch(132)},gf,722.25,0,635.5,0,'Render p4/f-right: fluted charcoal cladding on the GF drawing-room front x 673.5–771 with the W19 opening.',[0,inch(3.5)/2]);
  await object('cladding-gf-b','Dark fluted cladding · GF drawing front east',claddingCode,{width:inch(160.5),height:inch(144),depth:inch(3.5),pitch:inch(4.5),holeX:0,holeY:0,holeW:inch(132),holeH:inch(132)},gf,851.25,0,635.5,0,'Render p4: fluted charcoal cladding x 771–931.5 around W6.',[0,inch(3.5)/2]);
  for(const k of ['cladding-gf-a','cladding-gf-b']){const n=keyNode(k);try{await call('paint',{targets:[n.id],role:'cladding',material:{properties:{color:'#303132',roughness:.5,metalness:.5}},materialName:'Facade charcoal cladding'});}catch(e){}}
  // E5. Porch/driveway paving (architect "PORCH 31′-0″×26′-3″") and three parked cars (architect plan).
  await slab('porch-drive',gf,[[669,710.5],[1036,710.5],[1036,940],[669,940]],-12,6);scene=await call('get_scene');
  for(const nm of ['Porch · +6″','porch-drive'])await paintSlab(nm,{color:'#d0d1cd',roughness:.8,metalness:0},'Porch paving · pale concrete');
  await baked('porch-cars','Porch · three parked cars (architect plan)',[...carParts(736,730,-12,'carWhite'),...carParts(832,730,-12,'carGrey'),...carParts(928,730,-12,'carBlack')],gf,'Architect GF plan shows three cars in the porch (x 688–976, z 634–826); simple placeholders.');
  // F. Boundary walls, gates and piers at the architect positions; pier clusters, LED grooves and street apron (renders p2/p3/p4).
  await boundaryStage();
  {const p=[];const pier=(x0,x1,dark)=>{const s=zAt((x0+x1)/2),xc=(x0+x1)/2,H=dark?60:64;p.push(BX(x0,x1,-18,-18+H,s-3,s+9,dark?'charcoal':'white','piers'));
     if(dark){p.push(BX(xc-1.5,xc+1.5,18,28,s+9,s+10.5,'black','sconces'),BX(xc-1,xc+1,28,28.4,s+9.2,s+10.3,'lamp','sconces'),BX(xc-1,xc+1,17.6,18,s+9.2,s+10.3,'lamp','sconces'),BX(xc-.6,xc+.6,28.5,41,s+9.05,s+9.15,'streak','sconces'),BX(xc-.6,xc+.6,5,17.5,s+9.05,s+9.15,'streak','sconces'));}};
   [[30,51,1],[51,72,0],[72,93,1],[93,114,0],[114,135,1],[525,549,0],[549,570,1],[570,596,0],[596,615,1]].forEach(([a,b,d])=>pier(a,b,d));
   for(const x of [184,206,413,434]){const s=zAt(x);p.push(BX(x-.3,x+.3,-18,54,s+.05,s+.35,'led','led_grooves'));}
   await baked('boundary-piers','Front boundary pier clusters + LED grooves',p,gf,'Renders p2/f-left/f-right: alternating charcoal/white piers (21–26 in, 60/64 in tall) in front of lowered wall runs at x 30–135 and 525–615, sconces with faint up/down streaks; vertical LED grooves at x 184/206/413/434 (positions from render ratios, ±10 in).');}
  {const s=zAt(909),th=Math.atan(6/72);await baked('street-apron','Street apron · pale concrete ramp',[BC(348,2,72.3,909,-16,s+36,'pave','ramp',[th,0,0])],gf,'Renders p3/p4: pale concrete apron from the road up to the gate threshold (+6), x 735–1083.');}
  scene=await call('get_scene');
 }
 if(sub.includes('b')||sub.includes('w')){
  // E1. White porch end wall (architect GF bar at x ≈1050; render p4): a GF wall from the road to the FF slab soffit plus an FF upstand to the guard top, inboard of the east boundary.
  for(const [id,lvl,h,so,note] of [['wall_588_ext_porch_east',gf,162,-18,'GF part: road to the first-floor slab soffit (GF 144)'],['wall_588_ext_porch_east_ff',ff,42,0,'FF part: upstand on the terrace slab to the guard top']]){
   const data={name:'Porch east end wall · white',start:xy([1041.5,635.5]),end:xy([1041.5,710.5]),thickness:inch(11),height:inch(h),supportOffset:inch(so),metadata:{...basis,exteriorKey:id==='wall_588_ext_porch_east'?'porch-east-wall':'porch-east-wall-ff',dimensionBasis:'Architect GF plan wall at the porch east end (x ≈1050, z 626–707); render p4 white column up to the FF guard top; kept inboard of the east boundary wall (x 1036–1047). '+note}};
   await call('apply_patch',{patches:[scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId:lvl,node:{id,type:'wall',parentId:lvl,...data}}]});scene=await call('get_scene');
   for(const role of ['a','b'])await call('paint',{targets:[id],role,material:WHITE,materialName:WHITE_NAME});}
 }
 if(sub.includes('c')||sub.includes('t')){
  // H2. Overhead water tank per the architect second-floor plan (same call as the tanks stage).
  await object('overhead-tank','Overhead water tank · 9′-6″ × 9′-6″ (architect)',tankCode,{width:inch(96),depth:inch(96),clearHeight:inch(54),wall:inch(9),base:inch(6),cover:inch(6),support:inch(6),chambers:1},sf,255,0,47,0,'Pass 2: architect SF plan O.H.W.T 9′-6″×9′-6″ outer (96 in clear + 9 in RCC walls), top +33′-8″ from road = SF +72 (6 in supports + 6 base + 54 clear + 6 cover); centre traced at x 255, z 47. Architect plan overrides BC 7′×7′×4′.');
 }
 if(sub.includes('c')){
  // G1. Front lawn (architect "FRONT LAWN 64′-7″×20′-0″") at landscape +6, inside the boundary walls.
  const lawnFront=FRONT.filter(p=>p[0]>-106&&p[0]<669).map(p=>[p[0],p[1]-9]).reverse();
  await slab('lawn-front',gf,[[-119,572.5],[184.5,572.5],[184.5,662.5],[433.5,662.5],[433.5,710.5],[519,710.5],[519,719.5],[669,719.5],[669,zAt(669)-9],...lawnFront,[-106.5,zAt(-106)-9]],-12,6);scene=await call('get_scene');
  await paintSlab('lawn-front',{color:'#3f5b2a',roughness:1,metalness:0},'Lawn turf');
  // G2/G3. Lawn trees at the architect positions (palm = small circle A), plus the void tree (owner 2026-10-26).
  const trees=[['tree-a','palm',-74,886,312,59],['tree-b','tree',-28,894,192,75],['tree-c','tree',41,900,144,59],['tree-d','autumn',93,872,264,99],['tree-e','tree',161,886,144,59],['tree-f','tree',401,894,192,72],['tree-g','tree',461,890,144,59],['tree-h','tree',497,904,144,59],['tree-void','slim',70,640,240,80]];
  for(const [k,t,x,z,h,c] of trees){const parts=t==='palm'?palmParts(x,z,-12,h,3):t==='slim'?slimTreeParts(x,z,-12,h,c,5):treeParts(x,z,-12,h,c,x*.01+z*.001,t==='autumn'?1:0);
   await baked(k,'Lawn '+(t==='palm'?'date palm':t==='slim'?'void tree (render p12)':'tree')+' · '+k.slice(5).toUpperCase(),parts,gf,(k==='tree-void'?'Owner 2026-10-26: render tree in the open void in front of the master bedroom.':'Architect GF plan tree '+k.slice(5).toUpperCase()+' at x '+x+', z '+z+' (canopy '+c+' in); height and species from the renders (estimate).'));}
  // G4. Bistro set (architect seating position; render p12 look). G5. Stepping stones (architect pavers; render p7 black stone).
  {const p=[],cx=308,cz=760,b=-12;p.push(CYL(15,15,1,cx,b+28,cz,'tabletop','table'),CYL(1.2,1.2,28,cx,b,cz,'black','table'),CYL(9,9,1,cx,b,cz,'black','table'));
   for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,x=cx+Math.cos(a)*26,z=cz+Math.sin(a)*26,ry=-a+Math.PI/2;p.push(BC(18,1,18,x,b+17,z,'black','chairs',[0,ry,0]));
    p.push(BC(18,15,1,x+Math.cos(a)*9,b+25,z+Math.sin(a)*9,'black','chairs',[0,ry,0]));for(const [dx,dz] of [[-7,-7],[7,-7],[-7,7],[7,7]])p.push(CYL(.4,.4,17,x+dx,b,z+dz,'black','chairs'));}
   await baked('lawn-seating','Lawn bistro set · table + 4 wire chairs',p,gf,'Architect GF plan seating at x 279–337, z 746–774; render p12 bistro table with black wire chairs.');}
  {const p=[];for(let i=0;i<7;i++){const z=735+21.6*i;p.push(BX(567,625,-12,-10.5,z-6,z+6,'stone','stones'));}await baked('stepping-stones','Stepping stones · black stone',p,gf,'Architect GF plan pavers 58×12 in at x 567–625 (from the step edge to z ≈865); render p7 black polished stone.');}
  // G6. Street verge: grass strip, low hedge balls and upright shrubs along the front wall (renders p2/p3/p5; outside the plot).
  await slab('verge-grass',gf,[[-150,zAt(-115)+1],[735,zAt(735)+1],[735,1040],[-150,1040]],-17.5,.5);scene=await call('get_scene');
  await paintSlab('verge-grass',{color:'#3f5b2a',roughness:1,metalness:0},'Lawn turf');
  {const p=[];for(let x=-100;x<=725;x+=20)p.push(SPH(9,x,-18+8,zAt(x)+20,x%40?'leaf':'leaf2','hedge',1,.85,1));
   for(const x of [-60,20,160,250,345,440,520,640]){const s=zAt(x)+22;p.push(CYL(1.2,.8,30,x,-18,s,'bark','shrubs'),SPH(15,x,-18+52,s,'leaf2','shrubs',1,1.9,1),SPH(11,x+5,-18+36,s-4,'leaf','shrubs'));}
   await baked('verge-planting','Street verge planting · hedge + shrubs',p,gf,'Renders p2/p3/p5: low hedge balls and upright shrubs in a bed along the street face of the front wall (render dressing, outside the plot).');}
  // G7. Water feature + planter strip between the lounge east wall and the entrance portal (architect GF plan "WATER FEATURE").
  {const p=[BX(438,510,-14,-12,572.5,710.5,'pave','paving'),BX(443,480,-12,-4,574,578,'white','kerb'),BX(443,480,-12,-4,658,662,'white','kerb'),BX(443,447,-12,-4,578,658,'white','kerb'),BX(476,480,-12,-4,578,658,'white','kerb'),BX(447,476,-12,-5,578,658,'water','water'),BX(482,508,-12,6,574,700,'white','planter'),BX(484,506,6,6.4,576,698,'soil','planter')];
   for(let z=590;z<=690;z+=25)p.push(SPH(9,495,14,z,'leaf2','planting'));
   await baked('water-feature','Water feature + planter',p,gf,'Architect GF plan: water feature x 443–480, z 574–662 and planter strip beside the entrance (render p7 white plinth).');}
  // G8. Rainwater tank (assumed concept) sunk underground with its lid flush with the lawn (owner 2026-10-26).
  await object('rainwater','Rainwater tank · ASSUMED Lahore concept',tankCode,{width:inch(120),depth:inch(78),clearHeight:inch(60),wall:inch(6),base:inch(6),cover:inch(4),support:0,chambers:1},gf,360,-82,850,0,'Owner 2026-10-26: sunk underground, lid flush with the lawn (+6). ASSUMED above-grade concept moved below grade; 10×6.5×5 ft clear.');
  // H1. Solar panels (architect SF plan: three arrays, 28 modules 40×79 in, axis 71° from +X), 10° tilt toward the street/south, low edge 12 in (assumption).
  const solar=n=>{const p=[],L=79*n,th=10*Math.PI/180;for(let i=0;i<n;i++){const xc=-L/2+79*(i+.5),yc=12+39.5*Math.sin(th)+1;
    for(const zc of [-20,20])p.push(BC(78.6,1.5,39.4,xc,yc,zc,'alu','frames',[0,0,-th]),BC(77,1.8,37.6,xc,yc,zc,'solar','cells',[0,0,-th]));
    for(const zc of [-36,36])p.push(BX(xc-37,xc-35,0,yc+36*Math.sin(th)-1,zc-1,zc+1,'alu','supports'),BX(xc+35,xc+37,0,yc-36*Math.sin(th)-1,zc-1,zc+1,'alu','supports'));}return p;};
  for(const [k,n,x,z] of [['solar-l',5,104.4,344.5],['solar-m',6,209.3,292.5],['solar-r',3,331.7,291.6]])await baked(k,'Solar array '+k.slice(6).toUpperCase()+' · '+(2*n)+' modules',solar(n),sf,'Architect SF plan solar array: '+(2*n)+' modules 40×79 in, centre x '+x+', z '+z+', long axis 71° from +X; 10° tilt and 12 in clearance assumed.',-71,[x,0,z]);
  // H4. Roof turf + planter trees on the front roof terrace (architect SF plan).
  await slab('roof-turf',sf,[[525,446],[927,446],[927,626.5],[678,626.5],[678,599.5],[525,599.5]],1,1);scene=await call('get_scene');
  await paintSlab('roof-turf',{color:'#3f5b2a',roughness:1,metalness:0},'Lawn turf');
  {const p=[];const pos=[[701,604],[733,604],[770,604],[809,604],[840,604],[872,604],[905,604],[905,488],[905,526],[905,560]];
   pos.forEach(([x,z],i)=>{p.push(CYL(14,20,18,x,1,z,'white','planters'),CYL(19,19,.5,x,19,z,'soil','planters'),...slimTreeParts(x,z,19,110+(i%3)*15,52,i+1));});
   await baked('roof-planters','Roof planters · 10 trees',p,sf,'Architect SF plan roof planting: 7 trees along z 604 and 3 along the east side (moved to x 905 to clear the parapet); white bowls Ø40 in.');}
  // H5. R.C.C. shade 2′-6″ above the roof floor over the stair core and shaft (architect SF dashed outline), on 9×9 in posts; parapets under it lowered to 24 in.
  {const p=[BX(423,688.5,30,35,266.5,450.6,'white','slab'),BX(423,525,30,35,450.6,578.6,'white','slab')];
   for(const [x,z] of [[427.5,271],[555,271],[684,271],[684,446],[600,446],[520.5,455],[520.5,574],[427.5,574],[427.5,420]])p.push(BX(x-4.5,x+4.5,0,30,z-4.5,z+4.5,'white','posts'));
   await baked('rcc-shade','R.C.C. shade · 2′-6″ above roof floor',p,sf,'Architect SF plan dashed outline (423,266.5)-(688.5,266.5)-(688.5,450.6)-(525,450.6)-(525,578.6)-(423,578.6): 5 in RCC slab with underside 30 in above the roof floor over the stair core and shaft; 9×9 in posts at the corners/≤10 ft; void parapets below lowered to 24 in, leaving a 6 in ventilation gap.');
   const inL=(x,z)=>(x>=423&&x<=688.5&&z>=266.5&&z<=450.6)||(x>=423&&x<=525&&z>=450.6&&z<=578.6);
   const par=Object.values(scene.nodes).filter(n=>n.type==='wall'&&n.parentId===sf&&/parapet/i.test(n.name||'')&&inL((n.start[0]+n.end[0])/2/.0254,(n.start[1]+n.end[1])/2/.0254));
   await call('apply_patch',{patches:par.map(n=>({op:'update',id:n.id,data:{height:inch(24),metadata:{...(n.metadata??{}),pass2:'Lowered to 24 in under the architect R.C.C. shade (owner 2026-10-26)'}}}))});scene=await call('get_scene');console.log('parapets lowered',par.length);}
  // I. Spiral stairs: black steel with horizontal cable rails (render p13).
  for(const id of ['stair_588_external_0','stair_588_external_1'])if(scene.nodes[id]){await call('apply_patch',{patches:[{op:'update',id,data:{railingStyle:'cable'}}]});for(const role of ['treads','body','railing'])try{await call('paint',{targets:[id],role,material:{properties:{color:'#1e1f20',roughness:.5,metalness:.4}},materialName:'Exterior black steel'});}catch(e){console.log('stair paint',role,e.message.slice(0,120));}}
  // J. Light stone floor on the first-floor left terrace (render p10).
  await paintSlab('Front left terrace',{color:'#cfccc5',roughness:.7,metalness:0},'Terrace stone · light grey');
  scene=await call('get_scene');
 }
}else throw Error('Unknown stage');
console.log('Completed '+stage);
// Optional: node scripts/build-exterior.mjs <stage> [save]. Edits live only in this process until a checkpoint is saved.
const out=process.env.EXT_OUT??'/tmp';
fs.writeFileSync(out+'/ext-scene-after.json',JSON.stringify(await call('get_scene')));
const v=await call('verify_scene');fs.writeFileSync(out+'/ext-verify-after.json',JSON.stringify(v,null,2));console.log('Verification issues',v.issues.length);
if(process.argv[3]==='save'){
 const id=sceneId,st=await call('get_project_status',{id});
 console.log(JSON.stringify(await call('save_scene',{id,name:st.name,expectedVersion:st.version,saveMode:'checkpoint',includeCurrentScene:true})).slice(0,600));
 const r=spawnSync('python3',['-c',"import sqlite3; c=sqlite3.connect('file:.pascal/data/pascal.db?mode=ro',uri=True);print(c.execute('select graph_json from scenes where id=?',('"+id+"',)).fetchone()[0])"],{encoding:'utf8',maxBuffer:30e6});if(r.status)throw Error(r.stderr);
 const g=JSON.parse(r.stdout);if(!g.materials||Object.keys(g.materials).length<26)throw Error('Incomplete material registry');
 fs.writeFileSync('scenes/'+id+'.json',JSON.stringify(g,null,2)+'\n');{const {syncSceneArtifacts}=await import('./sync-scene-artifacts.mjs');console.log('Artifacts',JSON.stringify(syncSceneArtifacts()));}console.log(JSON.stringify(await call('get_project_status',{id})));
}
}finally{await c.close();}
