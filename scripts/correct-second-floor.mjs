// Usage: node scripts/correct-second-floor.mjs [apply|decisions|save]
// `decisions` re-applies only the owner decisions of 2026-10-25 for this floor (W-17 width, glazed balcony door).
// Applies the 2026-10-25 second-floor blueprint corrections to the live scene (idempotent), verifies, optionally checkpoints.
// Source files (src/588-m1.mjs, src/588-openings.json, scripts/build-home.mjs, scripts/build-exterior.mjs) carry the same changes.
import fs from 'node:fs';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {secondFloorId,inch,newWalls,wallCreate,voidZonePatches,openingPatches,wallPatches,slabPatches,tank,windowDecisionPatches,balconyDoor,balconyDoorWall,balconyDoorNode,balconyDoorMetadata} from '../src/second-floor-blueprint-corrections.mjs';
import {spawnSync} from 'node:child_process';
const c=new Client({name:'second-floor-blueprint-correction',version:'1'},{capabilities:{}}),id='588-m1-interior-v1';
const outDir=process.env.SF_OUT??'/tmp';
const axisOf=w=>w.start[0]===w.end[0]?1:0,dirOf=w=>Math.sign(w.end[axisOf(w)]-w.start[axisOf(w)]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(name,args={}){for(let i=0;;i++){await sleep(600);const raw=await c.callTool({name,arguments:args});const r=raw.structuredContent??JSON.parse(raw.content.find(x=>x.type==='text').text);
 if(JSON.stringify(r).includes('rate_limited')&&i<5){await sleep(1500);continue;}
 if(raw.isError||r.error||r.code)throw Error(name+': '+JSON.stringify(r).slice(0,1800));return r;}}
function fullGraph(){const r=spawnSync('python3',['-c',"import sqlite3; c=sqlite3.connect('file:.pascal/data/pascal.db?mode=ro',uri=True);print(c.execute('select graph_json from scenes where id=?',('588-m1-interior-v1',)).fetchone()[0])"],{encoding:'utf8',maxBuffer:60e6});if(r.status)throw Error(r.stderr);const g=JSON.parse(r.stdout);if(!g.materials||Object.keys(g.materials).length<26)throw Error('Incomplete material registry');return g;}
const area=pl=>Math.abs(pl.reduce((a,q,i)=>{const r=pl[(i+1)%pl.length];return a+q[0]*r[1]-r[0]*q[1]},0))/2;
async function zoneSnap(tag){const s=await call('get_scene');
 const ceil={};for(const n of Object.values(s.nodes))if(n.type==='ceiling'&&n.zoneId)ceil[n.zoneId]=(ceil[n.zoneId]??0)+1;
 const rows=Object.values(s.nodes).filter(n=>n.type==='zone'&&n.parentId===secondFloorId).map(x=>({id:x.id,name:x.name,area:Number((area(x.polygon)/.0254**2).toFixed(1)),hasFloor:x.hasFloor,hasCeiling:x.hasCeiling,ceilings:ceil[x.id]??0}));
 fs.writeFileSync(`${outDir}/sf-zones-${tag}.json`,JSON.stringify(rows,null,2));return rows;}
function show(rows){for(const r of rows)console.log(' ',r.id,String(r.name).padEnd(34),r.area,r.hasFloor,r.hasCeiling,'ceil',r.ceilings);}
async function decisions(){
 let scene=await call('get_scene');console.log('zones before decisions');show(await zoneSnap('E0'));
 await call('apply_patch',{patches:windowDecisionPatches(scene.nodes)});
 scene=await call('get_scene');
 if(!balconyDoorNode(scene.nodes)){
  const w=balconyDoorWall(scene.nodes);if(!w)throw Error('Missing sf-balcony-return wall');
  const ax=axisOf(w),len=Math.abs(w.end[ax]-w.start[ax]);const t=dirOf(w)*(inch(balconyDoor.centre)-w.start[ax])/len;
  const ref=Object.values(scene.nodes).find(n=>n.type==='door'&&n.parentId===secondFloorId||n.type==='door'&&scene.nodes[n.parentId]?.parentId===secondFloorId&&n.openingKind==='door');
  await call('add_door',{wallId:w.id,t,width:inch(balconyDoor.width),height:inch(balconyDoor.height),openingKind:'door',doorType:'hinged',style:'glass'});
  const after=await call('get_scene');const n=Object.values(after.nodes).find(x=>x.type==='door'&&!scene.nodes[x.id]&&x.parentId===w.id);if(!n)throw Error('Missing new balcony door');
  console.log('door added',n.id,JSON.stringify(n.slots),JSON.stringify(n.position));
  await call('apply_patch',{patches:[{op:'update',id:n.id,data:{name:balconyDoor.name,...(ref?.slots?.frame?{slots:{...n.slots,frame:ref.slots.frame}}:{}),metadata:balconyDoorMetadata(n)}}]});
 }else{
  const n=balconyDoorNode(scene.nodes);await call('apply_patch',{patches:[{op:'update',id:n.id,data:{name:balconyDoor.name,metadata:balconyDoorMetadata(n)}}]});
 }
 console.log('zones after decisions');show(await zoneSnap('E1'));
}
try{
 await c.connect(new StdioClientTransport({command:process.execPath,args:['scripts/pascal.mjs','mcp','connect']}));
 await call('load_scene',{id});
 const mode=process.argv[2];
 if(mode==='apply'){
  let scene=await call('get_scene');
  console.log('zones before');show(await zoneSnap('0'));
  // A: bedroom -> closet passage
  const A=openingPatches(scene.nodes);console.log('A',A.length);if(A.length)await call('apply_patch',{patches:A});
  console.log('zones after openings');show(await zoneSnap('A'));
  // B: new walls (add_wall, then name/metadata/slots copied from a neighbouring parapet), then front walls
  for(const w of newWalls){
   scene=await call('get_scene');
   const exists=Object.values(scene.nodes).find(n=>n.type==='wall'&&n.parentId===secondFloorId&&(w.meta.sourceParapet?n.metadata?.sourceParapet===w.meta.sourceParapet:n.metadata?.sourceWall===w.meta.sourceWall));
   if(exists){console.log('wall exists',w.key,exists.id);continue;}
   await call('apply_patch',{patches:[wallCreate(scene.nodes,w)]});
   console.log('wall added',w.key,w.key);
  }
  scene=await call('get_scene');await call('apply_patch',{patches:wallPatches(scene.nodes)});
  console.log('zones after walls');show(await zoneSnap('B'));
  // C: slabs
  scene=await call('get_scene');await call('apply_patch',{patches:slabPatches(scene.nodes)});
  console.log('zones after slabs');show(await zoneSnap('C'));
  // D: tank
  await call('add_object',{nodeId:tank.id,params:{wall:inch(tank.wall)},position:[inch(tank.x),0,inch(tank.z)]});
  scene=await call('get_scene');const tn=scene.nodes[tank.id];
  await call('apply_patch',{patches:[{op:'update',id:tank.id,data:{metadata:{...tn.metadata,blueprintReview:'2026-10-25',correctionBasis:tank.reason}}}]});
  // E: the two void zones stay hand-drawn, open, floorless and ceilingless
  scene=await call('get_scene');await call('apply_patch',{patches:voidZonePatches(scene.nodes)});
  console.log('zones final');show(await zoneSnap('D'));
  await decisions();
 }
 if(mode==='decisions')await decisions();
 const v=await call('verify_scene');fs.writeFileSync(`${outDir}/sf-verify-after.json`,JSON.stringify(v,null,2));fs.writeFileSync(`${outDir}/sf-scene-after.json`,JSON.stringify(await call('get_scene')));console.log('Verification',v.issues?.length);
 if(mode==='save'){
  const st=await call('get_project_status',{id});console.log(JSON.stringify(await call('save_scene',{id,name:st.name,expectedVersion:st.version,saveMode:'checkpoint',includeCurrentScene:true})).slice(0,900));
  fs.writeFileSync('scenes/588-m1-interior-v1.json',JSON.stringify(fullGraph(),null,2)+'\n');{const {syncSceneArtifacts}=await import('./sync-scene-artifacts.mjs');console.log('Artifacts',JSON.stringify(syncSceneArtifacts()));}
 }
 console.log(JSON.stringify(await call('get_project_status',{id})));
}finally{await c.close()}
