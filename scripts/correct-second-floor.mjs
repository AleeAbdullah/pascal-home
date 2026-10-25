// Usage: node scripts/correct-second-floor.mjs [apply|save]
// Applies the 2026-10-25 second-floor blueprint corrections to the live scene (idempotent), verifies, optionally checkpoints.
// Source files (src/588-m1.mjs, src/588-openings.json, scripts/build-home.mjs, scripts/build-exterior.mjs) carry the same changes.
import fs from 'node:fs';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {secondFloorId,inch,newWalls,wallCreate,voidZonePatches,openingPatches,wallPatches,slabPatches,tank} from '../src/second-floor-blueprint-corrections.mjs';
import {spawnSync} from 'node:child_process';
const c=new Client({name:'second-floor-blueprint-correction',version:'1'},{capabilities:{}}),id='588-m1-interior-v1';
const outDir=process.env.SF_OUT??'/tmp';
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
 }
 const v=await call('verify_scene');fs.writeFileSync(`${outDir}/sf-verify-after.json`,JSON.stringify(v,null,2));fs.writeFileSync(`${outDir}/sf-scene-after.json`,JSON.stringify(await call('get_scene')));console.log('Verification',v.issues?.length);
 if(mode==='save'){
  const st=await call('get_project_status',{id});console.log(JSON.stringify(await call('save_scene',{id,name:st.name,expectedVersion:st.version,saveMode:'checkpoint',includeCurrentScene:true})).slice(0,900));
  fs.writeFileSync('scenes/588-m1-interior-v1.json',JSON.stringify(fullGraph(),null,2)+'\n');{const {syncSceneArtifacts}=await import('./sync-scene-artifacts.mjs');console.log('Artifacts',JSON.stringify(syncSceneArtifacts()));}
 }
 console.log(JSON.stringify(await call('get_project_status',{id})));
}finally{await c.close()}
