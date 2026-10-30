// Usage: node scripts/correct-ground-floor.mjs [apply|decisions|entrance|bridge|rooms|loungestep|garden|save]  (garden = 2026-10-31 audit: lounge garden door + fin gap, maid-bath door steps, D1 9 ft + timber panel)
// `loungestep` (2026-10-26) moves the lounge level change to the corridor edge: lounge floor (-12) extends to z 287, two-riser step band z 277..287 (tread -6), items/columns re-seated.
// `rooms` applies the architectural part of the 2026-10-26 room review: dirty-kitchen rear door replacing W16 plus the two outside steps (furniture lives in src/ground-floor-interior-v1.mjs).
// `entrance` applies the room-review changes: lobby depth z 444.3, D1 single east-hinged leaf, console set removed, plain square columns.
// `bridge` adds the architect's shaft bridge (2026-10-26): openings replacing the two W11 windows, walnut deck + lounge entry step, glass guards, shaft tree and planters.
// `decisions` re-applies only the five owner decisions of 2026-10-25 (ground-floor ones: W19 width, pantry opening, podium levels).
// Applies the 2026-10-25 ground-floor blueprint corrections to the live scene (idempotent), verifies, optionally checkpoints.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runBridge} from '../src/shaft-bridge.mjs';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {byKey,groundFloorId,inch,newPassage,columns,columnMetadata,openingPatches,wallPatches,furniturePatches,windowDecisionPatches,pantryPatches,podiumPatches,entryStepPatches,lobbyDepthPatches,entryDoorPatches,entryConsolePatches,columnStylePatches,plainColumnFields,rearDoor,rearWindowPatches,rearDoorNode,rearDoorPatch,rearStepPatches,loungeStepPatches,loungeStepZonePatches} from '../src/ground-floor-blueprint-corrections.mjs';
const c=new Client({name:'ground-floor-blueprint-correction',version:'1'},{capabilities:{}}),id='588-m1-interior-v1';
const outDir=process.env.GF_OUT??'/tmp';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(name,args={}){for(let i=0;;i++){await sleep(1000);const raw=await c.callTool({name,arguments:args});const r=raw.structuredContent??JSON.parse(raw.content.find(x=>x.type==='text').text);
 if(JSON.stringify(r).includes('rate_limited')&&i<5){await sleep(1500);continue;}
 if(raw.isError||r.error||r.code)throw Error(name+': '+JSON.stringify(r).slice(0,1800));return r;}}
function fullGraph(){const r=spawnSync('python3',['-c',"import sqlite3; c=sqlite3.connect('file:.pascal/data/pascal.db?mode=ro',uri=True);print(c.execute('select graph_json from scenes where id=?',('588-m1-interior-v1',)).fetchone()[0])"],{encoding:'utf8',maxBuffer:30e6});if(r.status)throw Error(r.stderr);const g=JSON.parse(r.stdout);if(!g.materials||Object.keys(g.materials).length<26)throw Error('Incomplete material registry');return g;}
const area=pl=>Math.abs(pl.reduce((a,q,i)=>{const r=pl[(i+1)%pl.length];return a+q[0]*r[1]-r[0]*q[1]},0))/2;
async function zoneSnap(tag){const s=await call('get_scene');
 const ceil={};for(const n of Object.values(s.nodes))if(n.type==='ceiling'&&n.zoneId)ceil[n.zoneId]=(ceil[n.zoneId]??0)+1;
 const rows=Object.values(s.nodes).filter(n=>n.type==='zone'&&n.parentId===groundFloorId).map(x=>({id:x.id,name:x.name,area:Number(area(x.polygon).toFixed(2)),hasFloor:x.hasFloor,hasCeiling:x.hasCeiling,ceilings:ceil[x.id]??0}));
 fs.writeFileSync(`${outDir}/gf-zones-${tag}.json`,JSON.stringify(rows,null,2));return rows;}
function show(rows){for(const r of rows)console.log(' ',r.id,String(r.name).padEnd(28),r.area,r.hasFloor,r.hasCeiling,'ceil',r.ceilings);}
async function entrance(){
 let scene=await call('get_scene');console.log('zones before entrance');show(await zoneSnap('E0'));
 await call('apply_patch',{patches:[...lobbyDepthPatches(scene.nodes),...entryDoorPatches(scene.nodes),...columnStylePatches(scene.nodes)]});
 scene=await call('get_scene');const del=entryConsolePatches(scene.nodes);console.log('console removals',del.length);if(del.length)await call('apply_patch',{patches:del});
 console.log('zones after entrance');show(await zoneSnap('E1'));
}
async function decisions(){
 let scene=await call('get_scene');console.log('zones before decisions');show(await zoneSnap('D0'));
 await call('apply_patch',{patches:windowDecisionPatches(scene.nodes)});
 scene=await call('get_scene');const P=pantryPatches(scene.nodes);console.log('pantry',P.length);if(P.length)await call('apply_patch',{patches:P});
 console.log('zones after pantry');show(await zoneSnap('D1'));
 scene=await call('get_scene');await call('apply_patch',{patches:[...podiumPatches(scene.nodes),...entryStepPatches(scene.nodes)]});
 console.log('zones after podium');show(await zoneSnap('D2'));
}
async function loungestep(){
 let scene=await call('get_scene');console.log('zones before loungestep');show(await zoneSnap('LS0'));
 const A=loungeStepPatches(scene.nodes);console.log('slab/separator patches',A.length);if(A.length)await call('apply_patch',{patches:A});
 scene=await call('get_scene');const B=loungeStepZonePatches(scene.nodes);console.log('zone/item/column patches',B.length);if(B.length)await call('apply_patch',{patches:B});
 console.log('zones after loungestep');show(await zoneSnap('LS1'));
}
async function rooms(){
 let scene=await call('get_scene');console.log('zones before rooms');show(await zoneSnap('R0'));
 const del=rearWindowPatches(scene.nodes);if(del.length)await call('apply_patch',{patches:del});
 scene=await call('get_scene');
 if(!rearDoorNode(scene.nodes)){
  const w=scene.nodes[rearDoor.wallId];const t=(inch(rearDoor.centre)-w.start[0])/(w.end[0]-w.start[0]);
  await call('add_door',{wallId:rearDoor.wallId,t,width:inch(rearDoor.width),height:3.048,openingKind:'door',doorType:'hinged',style:'modern'});
  scene=await call('get_scene');
 }
 await call('apply_patch',{patches:rearDoorPatch(scene.nodes,rearDoorNode(scene.nodes).id)});
 scene=await call('get_scene');await call('apply_patch',{patches:rearStepPatches(scene.nodes)});
 console.log('zones after rooms');show(await zoneSnap('R1'));
}// Review 2026-10-31 (audit): GF lounge garden door + fin gap, maid-bath door steps, entrance D1 9 ft + timber panel. Idempotent. (`node scripts/correct-ground-floor.mjs garden`)
async function garden(){
 const p=(x,z)=>[inch(x),inch(z)];
 const A=await import('../src/ground-floor-blueprint-corrections.mjs');const EX=await import('../src/588-exterior.mjs');const {FRAME_MAT,TIMBER_MAT,loungeDoor:LD,maidSteps,entryDoor:ED,auditDecision}=A;
 let scene=await call('get_scene');
 const skip=new Set(['object','id','type','parentId','name','polygon','elevation','metadata','children','thickness']);
 const ref=scene.nodes['slab_588_ext_entry-step-12'];const copy=Object.fromEntries(Object.entries(ref).filter(([k])=>!skip.has(k)));
 const slabPatch=(s,meta,th)=>{const data={polygon:[p(s.x0,s.z0),p(s.x1,s.z0),p(s.x1,s.z1),p(s.x0,s.z1)],elevation:inch(s.top),thickness:inch(th),metadata:meta};
  return scene.nodes[s.id]?{op:'update',id:s.id,data}:{op:'create',parentId:groundFloorId,node:{...copy,id:s.id,type:'slab',parentId:groundFloorId,name:s.name,...data}};};
 // 1. Lounge: west lite resize, east lite, central sliding door, in-wall tread
 const wall=scene.nodes[LD.wallId],win=scene.nodes[LD.westWindowId];
 const local=c=>inch(c-LD.wallStartX);
 await call('apply_patch',{patches:[{op:'update',id:win.id,data:{width:inch(LD.west.width),position:[local(LD.west.centre),win.position[1],0],columnRatios:[1,1],metadata:{...win.metadata,splitBasis:LD.basis,ownerDecision:auditDecision+': lounge garden door',widthOverride:LD.west.width}}}]});
 scene=await call('get_scene');
 let east=Object.values(scene.nodes).find(n=>n.type==='window'&&n.metadata?.sourceOpening===LD.eastKey);
 if(!east){const r=await call('add_window',{wallId:LD.wallId,t:(LD.east.centre-LD.wallStartX)/249,width:inch(LD.east.width),height:inch(LD.door.height),sillHeight:0,windowType:'fixed'});await sleep(700);scene=await call('get_scene');east=scene.nodes[r.windowId??r.id]??Object.values(scene.nodes).find(n=>n.type==='window'&&n.parentId===LD.wallId&&!n.metadata?.sourceOpening&&Math.abs(n.position[0]-local(LD.east.centre))<.05);if(!east)throw Error('no east lite '+JSON.stringify(r).slice(0,200));}
 {const wskip=new Set(['object','id','type','parentId','wallId','position','rotation','width','metadata','name','children','visible']);const wcopy=Object.fromEntries(Object.entries(scene.nodes[LD.westWindowId]).filter(([k])=>!wskip.has(k)));
  await call('apply_patch',{patches:[{op:'update',id:east.id,data:{...wcopy,name:LD.east.name,width:inch(LD.east.width),height:inch(LD.door.height),position:[local(LD.east.centre),inch(LD.door.height)/2,0],columnRatios:[1,1],metadata:{sourceFile:'588 - M1 (Checked by Building Control).pdf',sourceOpening:LD.eastKey,sourceTag:LD.east.tag,positionBasis:'Split of W1 (windows-0-19)',widthBasis:'Owner audit 2026-10-31',heightBasis:'132 in, sill 0 (as W1)',sourcePositionInches:LD.east.centre,operability:'Fixed',blueprintReview:'2026-10-31',correctionBasis:LD.basis,ownerDecision:auditDecision+': lounge garden door',renderHeightInches:132,renderSillInches:0}}}]});}
 scene=await call('get_scene');
 let door=Object.values(scene.nodes).find(n=>n.type==='door'&&n.metadata?.sourceOpening===LD.doorKey);
 if(!door){const r=await call('add_door',{wallId:LD.wallId,t:(LD.door.centre-LD.wallStartX)/249,width:inch(LD.door.width),height:inch(LD.door.height),openingKind:'door',doorType:'sliding',style:'glass'});await sleep(700);scene=await call('get_scene');door=scene.nodes[r.doorId];if(!door)throw Error('no door');}
 await call('apply_patch',{patches:[{op:'update',id:door.id,data:{name:LD.door.name,doorType:'sliding',leafCount:2,slideDirection:'left',width:inch(LD.door.width),height:inch(LD.door.height),position:[local(LD.door.centre),inch(LD.door.height)/2,0],segments:(door.segments??[]).map((s,i)=>i?s:{...s,type:'glass',columnRatios:[1,1]}),slots:{...(door.slots??{}),frame:FRAME_MAT},
  metadata:{sourceFile:'588 - M1 (Checked by Building Control).pdf',sourceOpening:LD.doorKey,sourceTag:'W1',positionBasis:'Central section of W1, x 255..363',widthBasis:'Owner audit: 96-120 in',heightBasis:'132 in, sill 0 (as W1)',sourcePositionInches:LD.door.centre,operability:'Sliding glass door onto the sitting deck',blueprintReview:'2026-10-31',correctionBasis:LD.basis,ownerDecision:auditDecision+': lounge garden door'}}}]});
 scene=await call('get_scene');
 await call('apply_patch',{patches:[slabPatch(LD.step,{sourceFile:'588 - M1 (Checked by Building Control).pdf',undimensioned:'Tread in the wall depth; rise derived from deck -6 / lounge floor -12',blueprintReview:'2026-10-31',correctionBasis:'Inside tread (top -6) in the lounge-front wall depth below the door sill (0)',ownerDecision:auditDecision+': lounge garden door'},LD.step.thickness)]});
 // 2. fin screen with a walk-through gap
 scene=await call('get_scene');
 {const old=Object.values(scene.nodes).find(n=>n.metadata?.exteriorKey==='fins-w1');
  if(old&&!old.metadata.finGap){const b=EX.bake(EX.finParts(189,429,668.5,-6,132,[LD.finGap]));
   await call('add_object',{nodeId:old.id,name:old.name,code:EX.paramCode(b.code,{}),params:{},parentId:groundFloorId,position:[inch(b.pos[0]),inch(b.pos[1]),inch(b.pos[2])],rotation:0,category:'architectural detail',description:'Fin screen with a walk-through gap at the lounge garden door.',reason:auditDecision+': fin screen opened over the lounge garden door'});
   await sleep(800);scene=await call('get_scene');await call('apply_patch',{patches:[{op:'update',id:old.id,data:{metadata:{...scene.nodes[old.id].metadata,finGap:LD.finGap,dimensionBasis:'Render p2/p7 fins; open between x '+LD.finGap.join('..')+' for the garden door (2026-10-31)'}}}]});console.log('fins rebuilt');}}
 // 3. maid bathroom steps
 scene=await call('get_scene');
 await call('apply_patch',{patches:maidSteps.map(s=>slabPatch(s,{sourceFile:'588 - M1 (Checked by Building Control).pdf',undimensioned:'Rise derived from site levels (assumed side passage +6 in), as the dirty-kitchen rear door',blueprintReview:'2026-10-31',correctionBasis:s.tag,ownerDecision:auditDecision+': D4 maid-bathroom exterior door steps'},6))});
 // 4. entrance D1
 scene=await call('get_scene');const d1=scene.nodes[ED.doorId];
 await call('apply_patch',{patches:[{op:'update',id:d1.id,data:{height:inch(ED.height),position:[d1.position[0],inch(ED.height)/2,0],name:'D1 · GF',metadata:{...d1.metadata,heightBasis:'Owner audit 2026-10-31: 108 in (9 ft) operable leaf',appearance:'Solid timber leaf per owner render p6; modelled as a hinged leaf (Pascal has no pivot type)',blueprintReview:'2026-10-31',correctionBasis:ED.basis,ownerDecision:auditDecision+': entrance door'}}}]});
 scene=await call('get_scene');
 let panel=Object.values(scene.nodes).find(n=>n.type==='window'&&n.metadata?.sourceOpening===ED.panelKey);
 if(!panel){const r=await call('add_window',{wallId:ED.wallId,t:(ED.centre-ED.wallStartX)/159,width:inch(ED.width),height:inch(ED.panelHeight),sillHeight:inch(ED.height),windowType:'fixed'});await sleep(700);scene=await call('get_scene');panel=scene.nodes[r.windowId??r.id];if(!panel)throw Error('no panel '+JSON.stringify(r).slice(0,200));}
 await call('apply_patch',{patches:[{op:'update',id:panel.id,data:{name:ED.panelName,width:inch(ED.width),height:inch(ED.panelHeight),position:[inch(ED.centre-ED.wallStartX),inch(ED.height+ED.panelHeight/2),0],frameThickness:inch(32),frameDepth:inch(9),sill:false,columnRatios:[1],rowRatios:[1],slots:{...(panel.slots??{}),frame:TIMBER_MAT},
  metadata:{sourceFile:'588 - M1 (Checked by Building Control).pdf',sourceOpening:ED.panelKey,sourceTag:'D1-panel',frontKey:'entry-door-panel',positionBasis:'Above D1 (windows-0 / doors-0-22), same 60 in width',widthBasis:'D1 width',heightBasis:'180 in above the 108 in leaf (top 288 in; transom 289..297 unchanged)',sourcePositionInches:ED.centre,operability:'Fixed timber panel',blueprintReview:'2026-10-31',correctionBasis:ED.basis,ownerDecision:auditDecision+': entrance door'}}}]});
 scene=await call('get_scene');console.log('panel',JSON.stringify(scene.nodes[panel.id]).slice(0,900));
}

try{
 await c.connect(new StdioClientTransport({command:process.execPath,args:['scripts/pascal.mjs','mcp','connect']}));
 await call('load_scene',{id});
 const mode=process.argv[2];
 if(mode==='apply'){
  let scene=await call('get_scene');
  console.log('zones before');show(await zoneSnap('0'));
  // Step A: openings
  const A=openingPatches(scene.nodes);console.log('A',A.length);if(A.length)await call('apply_patch',{patches:A});
  scene=await call('get_scene');
  if(!Object.values(scene.nodes).some(n=>n.metadata?.sourceOpening===newPassage.sourceOpening)){
   const w=scene.nodes[newPassage.wallId];const t=(newPassage.centre-w.start[1]/.0254)/((w.end[1]-w.start[1])/.0254);
   await call('add_door',{wallId:newPassage.wallId,t,width:inch(newPassage.width),height:inch(newPassage.height),openingKind:'opening'});
   const after=await call('get_scene');const n=Object.values(after.nodes).find(x=>x.type==='door'&&!scene.nodes[x.id]&&x.parentId===newPassage.wallId);if(!n)throw Error('Missing new passage');
   // Copy every non-positional field from the established passage on the same level so the new node matches it.
   const ref=byKey(after.nodes,'passages-0-0');const skip=new Set(['object','id','type','parentId','wallId','position','rotation','width','metadata','name','children','visible']);
   const copy=Object.fromEntries(Object.entries(ref).filter(([k])=>!skip.has(k)));
   await call('apply_patch',{patches:[{op:'update',id:n.id,data:{...copy,name:newPassage.name,metadata:{sourceFile:'588 - M1 (Checked by Building Control).pdf',sourceOpening:newPassage.sourceOpening,positionBasis:'PDF vector trace; OPENING AT 10\'-0" callout',widthBasis:'PDF vector jamb-to-jamb trace',heightBasis:'PDF schedule',sourcePositionInches:newPassage.centre,operability:'Door swing to be checked',blueprintReview:'2026-10-25',correctionBasis:'Closet 2 opens east into Bedroom 02 at z=137.4..179.3 in'}}}]});
  }
  console.log('zones after openings');show(await zoneSnap('A'));
  // Step B: walls
  scene=await call('get_scene');const B=wallPatches(scene.nodes);console.log('B',B.length);await call('apply_patch',{patches:B});
  console.log('zones after walls');show(await zoneSnap('B'));
  // Step C: columns
  scene=await call('get_scene');
  for(const col of columns){
   if(Object.values(scene.nodes).some(n=>n.name===col.name))continue;
   await call('add_column',{...plainColumnFields,x:inch(col.x),z:inch(col.z),height:3.96,width:inch(col.w),depth:inch(col.d),crossSection:col.w===col.d?'square':'rectangular',style:'plain',level:groundFloorId,name:col.name});
   const after=await call('get_scene');const added=Object.values(after.nodes).filter(x=>!scene.nodes[x.id]);console.log('column added',col.name,added.map(x=>x.id+':'+x.type+':'+x.name).join(','));const n=added.find(x=>x.name===col.name)??added[0];if(!n)throw Error('Missing column '+col.name);
   await call('apply_patch',{patches:[{op:'update',id:n.id,data:{metadata:{...n.metadata,...columnMetadata(col.basis)}}}]});scene=after;
  }
  console.log('zones after columns');show(await zoneSnap('C'));
  scene=await call('get_scene');await call('apply_patch',{patches:furniturePatches(scene.nodes)});
  await decisions();
  await entrance();
 }
 if(mode==='bridge'){console.log('zones before bridge');show(await zoneSnap('BR0'));await runBridge({call,level:'ground'});console.log('zones after bridge');show(await zoneSnap('BR1'));}
 if(mode==='decisions')await decisions();
 if(mode==='rooms')await rooms();
 if(mode==='loungestep')await loungestep();
 if(mode==='garden')await garden();
 if(mode==='entrance')await entrance();
 const v=await call('verify_scene');fs.writeFileSync(`${outDir}/gf-verify-after.json`,JSON.stringify(v,null,2));fs.writeFileSync(`${outDir}/gf-scene-after.json`,JSON.stringify(await call('get_scene')));console.log('Verification',v.issues.length);
 if(mode==='save'){
  const st=await call('get_project_status',{id});console.log(JSON.stringify(await call('save_scene',{id,name:st.name,expectedVersion:st.version,saveMode:'checkpoint',includeCurrentScene:true})).slice(0,900));
  fs.writeFileSync('scenes/588-m1-interior-v1.json',JSON.stringify(fullGraph(),null,2)+'\n');{const {syncSceneArtifacts}=await import('./sync-scene-artifacts.mjs');console.log('Artifacts',JSON.stringify(syncSceneArtifacts()));}
 }
 console.log(JSON.stringify(await call('get_project_status',{id})));
}finally{await c.close()}
