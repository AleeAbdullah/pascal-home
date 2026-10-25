import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {inch,xy,projectId,source} from '../src/588-m1.mjs';
import {screenCode,guardCode,tankCode,gateCode,slatGateCode,gatePierCode,entrySoffitCode,ledReveal,claddingCode,pergolaCode,planterCode,trimCode,rechargeCode,paramCode,sourceUrl} from '../src/588-exterior.mjs';
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
try{
const sceneId=process.env.PASCAL_SCENE??projectId;await call('load_scene',{id:sceneId});scene=await call('get_scene');
await call('design_brief',{source:'open',vision:'Faithful architectural reconstruction from the supplied checked PDF. Geometry explicitly missing from the sheet is an owner-authorized Lahore-informed concept, marked as assumed. Neutral display colors only where no finish is specified.',axes:Object.fromEntries(['action','size','pieces','openings','style','materials','dressing'].map(k=>[k,{kind:'bounded',extent:'exact',quote:'Add the facade screens, terrace guards, external spiral stair, water tanks and boundary elements. Keep it accurate',reading:'Only the requested exterior/site details, following the PDF and labeled authorized assumptions.'}])),beyond:Object.fromEntries(['textiles','light','windows','walls','floor','plants','objects','smallFurniture'].map(k=>[k,{none:'No unrelated dressing in this bounded reconstruction.'}]))});
const stage=process.argv[2]??'details';
if(stage==='details'){
await call('apply_patch',{patches:[{op:'update',id:'building_8qvglnlmkl86m0dc',data:{position:[0,inch(18),0]}}]});
for(const [key,x,w,sw] of [['left',285,306,222],['right',841.5,198,198]])await object('screen-'+key,'Front '+key+' lattice screen · elevation trace',screenCode,{width:inch(w),height:inch(224),screenWidth:inch(sw),screenHeight:inch(114),footer:inch(24),centerJoint:key==='left'?1:0},ff,x,-24,721.5,0,'Box outline traced from front elevation; face is a solid light panel with shallow joints and one up/down wall lamp per owner render p2/p3 (BC elevation hatch not modelled).',[0,.035]);
const guards=[['ff-left-front',ff,18,710.5,429,710.5],['ff-left-west',ff,18,512.5,18,710.5],['ff-left-east',ff,429,512.5,429,710.5],['ff-right-front',ff,678,710.5,1055.5,710.5],['ff-right-east',ff,1055.5,635.5,1055.5,710.5],['ff-right-west',ff,678,635.5,678,710.5],['sf-balcony-front',sf,915,-9,954,-9],['sf-balcony-east',sf,954,38.5,1000,-10]];
for(const [key,l,x0,z0,x1,z1]of guards)await object(key,key+' · glass guard',guardCode,{width:inch(Math.hypot(x1-x0,z1-z0)),height:inch(42)},l,(x0+x1)/2,0,(z0+z1)/2,-Math.atan2(z1-z0,x1-x0)*180/Math.PI,'Glass railing shown by elevation; 42 inch height assumed, with panel division and metal fixings schematic.');
for(const [key,x,z,h,w,dp]of [['entry-left',514.5,702.8,356,9,15],['entry-right',673.5,702.8,356,9,15],['front-west',1,512.5,356,29,12]])await object('pier-'+key,'Facade '+key+' · traced stone bands',trimCode,{width:inch(w),height:inch(h),depth:inch(dp)},gf,x,0,z,0,'Vertical facade band traced from elevation; stone course spacing is a display assumption.');
// Front decks already exist. Add the exterior approach risers shown in the plan.
await slab('entry-step-6',gf,[[519,695.5],[669,695.5],[669,719.5],[519,719.5]],-12,6);
await slab('entry-step-12',gf,[[519,695.5],[669,695.5],[669,707.5],[519,707.5]],-6,6); // starts at the lowered podium front (owner decision 2026-10-25) so the +12 treads do not overlap coplanar
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
 await object('gate-left','Vehicle gate left leaf · assumed detailing',gateCode,{width:inch(108),height:inch(72)},gf,816,-18,zAt(816),0,'18 ft opening dimensioned; two 9 ft leaves; solid black wood-grain flush panels per owner render p4.');
 await object('gate-right','Vehicle gate right leaf · assumed detailing',gateCode,{width:inch(108),height:inch(72)},gf,924,-18,zAt(924),180,'18 ft opening dimensioned; two 9 ft leaves; solid black wood-grain flush panels per owner render p4.');
 await object('pedestrian-gate','Pedestrian gate · traced opening',slatGateCode,{width:inch(43),height:inch(72)},gf,1008.5,-18,zAt(1008.5),0,'43 inch opening from front chain; metal slat detailing assumed.');
}else if(stage==='tanks'){
 // Overhead tank: section clear volume; 21 inch support reconciles elevation top +34 ft 5 in.
 await object('overhead-tank','Overhead water tank · 7′ × 7′ × 4′',tankCode,{width:inch(84),depth:inch(84),clearHeight:inch(48),wall:inch(9),base:inch(6),cover:inch(6),support:inch(21),chambers:1},sf,249,0,42,0,'84×84×48 inch clear tank; 9 inch RCC walls, 6 inch base/cover. 21 inch supports assumed to preserve elevation top +34 ft 5 in. Position traced (O.H.W.T outline centre 249, 42).');
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
 await object('entry-soffit','Entrance soffit · timber slats, 7 downlights',entrySoffitCode,{width:inch(148.4),depth:inch(103)},gf,594,300,651.5,0,'Timber slat soffit between entry piers, x 519..669, z 600..703, underside 300 in above GF floor; emissive downlight discs and LED reveal only (no real lights).');
 await object('entry-led','Entrance pier LED reveals',ledReveal,{height:inch(292),span:inch(148)},gf,594,8,700,0,'Thin emissive LED reveal on the inner face of each entrance pier.');
 // 2/3. Front boxes (solid light panel faces, wall lamp) and widened left fin are handled by the details stage definitions above.
 for(const [key,x,w,sw] of [['left',285,306,222],['right',841.5,198,198]])await object('screen-'+key,'Front '+key+' lattice screen · elevation trace',screenCode,{width:inch(w),height:inch(224),screenWidth:inch(sw),screenHeight:inch(114),footer:inch(24),centerJoint:key==='left'?1:0},ff,x,-24,721.5,0,'Box outline traced from front elevation; face is a solid light panel with shallow joints and one up/down wall lamp per owner render p2/p3 (BC elevation hatch not modelled).',[0,.035]);
 await object('pier-front-west','Facade front-west · traced stone bands',trimCode,{width:inch(29),height:inch(356),depth:inch(12)},gf,1,0,512.5,0,'Vertical facade fin; BC fin 29 in wide.');
 for(const [key,x] of [['entry-left',514.5],['entry-right',673.5]])await object('pier-'+key,'Facade '+key+' · traced stone bands',trimCode,{width:inch(9),height:inch(356),depth:inch(15)},gf,x,0,702.8,0,'Entrance pier 9 x 15 in at the podium front per plan (z 695.3..710.3).');
 // 4. Dark cladding (charcoal, 3.5 in proud of the front wall faces).
 const clad=(key,name,x0,x1,roadY0,roadY1,zBack,depth,pitch,hole,note)=>object(key,name,claddingCode,{width:inch(x1-x0),height:inch(roadY1-roadY0),depth:inch(depth),pitch:inch(pitch),holeX:inch(hole?.[0]??0),holeY:inch(hole?.[1]??0),holeW:inch(hole?.[2]??0),holeH:inch(hole?.[3]??0)},ff,(x0+x1)/2,roadY0-174,zBack,0,note,[0,inch(depth)/2]);
 await clad('cladding-right','Dark fluted cladding · right of entrance',680,760,150,374,635.5,3.5,4.5,[0,28,60,100],'Render s02/p6/f-right: fluted charcoal metal panel FF to parapet around FF window W14 (x 678..738, sill 180..276 road).');
 await clad('spandrel-lower','Dark spandrel · below FF window beside left box',438,510,145,177,572.5,3.5,0,null,'Render s02: dark spandrel panel below FF window W11 beside the left box.');
 await clad('spandrel-upper','Dark spandrel · above FF window beside left box',438,510,278,332,572.5,3.5,0,null,'Render s02: dark spandrel panel above FF window W11 beside the left box.');
 await clad('slat-strip','Dark slat strip · beside left box',104,128,150,332,717,9,2.5,null,'Render s02/f-left: dark vertical slat strip between left fin and left box, in the box plane (z 717..726).');
 // 5. Window mullions on front-facing windows (sizes and heights untouched).
 const front={window_78bgjba2ntnv4ii4:4,window_5zttqap3p8rw5nvv:6,window_kxctyh4o7f47fxq8:2,window_klgt5jm9er5a1o7y:4,window_e049zxtna9o1msyv:4,window_41ipsx11sbxbe55f:4,window_xtcvc9xi029wfeuc:2,window_o0l3bclru7g3z1l5:2,window_37rm0ngmon7vq1s4:4};
 await call('apply_patch',{patches:Object.entries(front).map(([id,n])=>({op:'update',id,data:{columnRatios:Array(n).fill(1),metadata:{...scene.nodes[id].metadata,frontKey:'mullions-'+n,mullionBasis:'BC elevation 4-panel/2-panel groups; divisions only, size unchanged'}}}))});scene=await call('get_scene');
 // 6. Vehicle gate: solid leaves (gateCode in the boundary stage) and two white masonry piers with emissive lanterns.
 for(const [key,id,rot] of [['gate-left','item_o5lqxeu9eapf27lr',0],['gate-right','item_bzcqznlm37jdrzi9',180]]){const n=scene.nodes[id],pp=n.position.map(v=>v/.0254);await object(key,n.name,gateCode,{width:inch(108),height:inch(72)},gf,pp[0],pp[1],pp[2],rot,'18 ft opening dimensioned; two 9 ft leaves; solid black wood-grain flush panels per owner render p4.');}
 const gz=scene.nodes['item_o5lqxeu9eapf27lr'].position[2]/.0254;
 await object('gate-pier-west','Vehicle gate pier west · masonry + lantern',gatePierCode,{width:inch(18),depth:inch(18),height:inch(78),lanternHeight:inch(6),lanternWidth:inch(12)},gf,751,-18,gz,0,'White masonry pier 18 x 18 in beside the 18 ft opening, about 8 in over the 72 in wall; emissive box lantern.');
 await object('gate-pier-east','Vehicle gate pier east · masonry + lantern',gatePierCode,{width:inch(6),depth:inch(18),height:inch(78),lanternHeight:inch(6),lanternWidth:inch(8)},gf,982.5,-18,gz,0,'East pier limited to 6 in wide (+8 in lantern) inside the 9 in boundary stub between the vehicle and pedestrian openings; an 18 in pier would narrow a gate opening (owner decision).');
 // 7. Pergola and planter over the left box terrace cut-out.
 await object('pergola','Terrace pergola · dark steel grid',pergolaCode,{width:inch(69),depth:inch(99),bar:inch(4)},ff,392.5,107,664.5,0,'Render s02/s03/p7: dark steel grid at the top of the terrace cut-out x 358..427, back about 100 in from the box.');
 await object('terrace-planter','Terrace planter · at glass guard',planterCode,{width:inch(62),depth:inch(10),height:inch(18)},ff,392.5,0,700,0,'Render s02/p7: planter behind the glass guard at the terrace cut-out.');
 // Exact finishes (slot names come from the modules; library presets are replaced by exact native materials).
 const finish=async(key,slots)=>{const n=Object.values(scene.nodes).find(x=>x.metadata?.exteriorKey===key);if(!n)throw Error('no item '+key);for(const [slot,[color,roughness,metalness,materialName]] of Object.entries(slots)){try{await call('paint',{targets:[n.id],role:slot,material:{properties:{color,roughness,metalness}},materialName});}catch(e){if(!/unknown_role/.test(e.message))throw e;}}scene=await call('get_scene');};
 const BLACK=['#282c2b',.65,.65,'Front black metal'],CLAD=['#3a3b3d',.5,.55,'Facade charcoal cladding'];
 for(const k of ['screen-left','screen-right'])await finish(k,{face:['#dcdcd8',.85,0,'Front box panel · light grey'],band:['#f3f3f0',.8,0,'Front box band · white'],joint:['#b1b1ad',.9,0,'Front box joint'],metal:BLACK});
 for(const k of ['cladding-right','spandrel-lower','spandrel-upper','slat-strip'])await finish(k,{cladding:CLAD});
 await finish('entry-soffit',{timber:['#85674a',.7,0,'Entrance soffit timber'],plaster:['#eeece6',.85,0,'Entrance soffit plaster']});
 for(const k of ['gate-left','gate-right'])await finish(k,{gate_wood:['#1b1b1c',.55,0,'Gate black wood'],gate_panel:['#262627',.5,0,'Gate black wood panel'],gate_grain:['#363536',.6,0,'Gate wood grain line'],metal:BLACK});
 for(const k of ['gate-pier-west','gate-pier-east'])await finish(k,{pier:['#efefec',.85,0,'Gate pier white masonry'],pier_joint:['#cfcfca',.9,0,'Gate pier joint'],lantern_frame:['#2a2c2b',.5,.5,'Gate lantern frame']});
 await finish('pergola',{metal:BLACK});
 await finish('terrace-planter',{planter:['#e9e7e1',.8,0,'Planter white'],soil:['#3b2f26',1,0,'Planter soil'],foliage:['#4c6b3b',.9,0,'Planter foliage']});
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
