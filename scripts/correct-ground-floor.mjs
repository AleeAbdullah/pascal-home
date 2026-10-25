// Usage: node scripts/correct-ground-floor.mjs [apply|decisions|entrance|bridge|save]
// `entrance` applies the room-review changes: lobby depth z 444.3, D1 single east-hinged leaf, console set removed, plain square columns.
// `bridge` adds the architect's shaft bridge (2026-10-26): openings replacing the two W11 windows, walnut deck + lounge entry step, glass guards, shaft tree and planters.
// `decisions` re-applies only the five owner decisions of 2026-10-25 (ground-floor ones: W19 width, pantry opening, podium levels).
// Applies the 2026-10-25 ground-floor blueprint corrections to the live scene (idempotent), verifies, optionally checkpoints.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runBridge} from '../src/shaft-bridge.mjs';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {byKey,groundFloorId,inch,newPassage,columns,columnMetadata,openingPatches,wallPatches,furniturePatches,windowDecisionPatches,pantryPatches,podiumPatches,entryStepPatches,lobbyDepthPatches,entryDoorPatches,entryConsolePatches,columnStylePatches,plainColumnFields} from '../src/ground-floor-blueprint-corrections.mjs';
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
 if(mode==='entrance')await entrance();
 const v=await call('verify_scene');fs.writeFileSync(`${outDir}/gf-verify-after.json`,JSON.stringify(v,null,2));fs.writeFileSync(`${outDir}/gf-scene-after.json`,JSON.stringify(await call('get_scene')));console.log('Verification',v.issues.length);
 if(mode==='save'){
  const st=await call('get_project_status',{id});console.log(JSON.stringify(await call('save_scene',{id,name:st.name,expectedVersion:st.version,saveMode:'checkpoint',includeCurrentScene:true})).slice(0,900));
  fs.writeFileSync('scenes/588-m1-interior-v1.json',JSON.stringify(fullGraph(),null,2)+'\n');{const {syncSceneArtifacts}=await import('./sync-scene-artifacts.mjs');console.log('Artifacts',JSON.stringify(syncSceneArtifacts()));}
 }
 console.log(JSON.stringify(await call('get_project_status',{id})));
}finally{await c.close()}
