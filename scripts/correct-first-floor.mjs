// Usage: node scripts/correct-first-floor.mjs [architecture|stairguard|save]  (stairguard = 2026-10-26 stair-front wall -> 42 in glass guard)
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {guardCode,paramCode} from '../src/588-exterior.mjs';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {architecturePatches,inch,stairGuard as SG,lobbyVoidSeed,lobbyVoidFields,firstFloorId} from '../src/first-floor-blueprint-corrections.mjs';
const c=new Client({name:'first-floor-blueprint-correction',version:'1'},{capabilities:{}}),id='588-m1-interior-v1';
async function call(name,args={}){const raw=await c.callTool({name,arguments:args});const r=raw.structuredContent??JSON.parse(raw.content.find(x=>x.type==='text').text);if(raw.isError||r.error||r.code)throw Error(name+': '+JSON.stringify(r).slice(0,1800));return r;}
function fullGraph(){const r=spawnSync('python3',['-c',"import sqlite3; c=sqlite3.connect('file:.pascal/data/pascal.db?mode=ro',uri=True);print(c.execute('select graph_json from scenes where id=?',('588-m1-interior-v1',)).fetchone()[0])"],{encoding:'utf8',maxBuffer:30e6});if(r.status)throw Error(r.stderr);const g=JSON.parse(r.stdout);if(!g.materials||Object.keys(g.materials).length<26)throw Error('Incomplete material registry');return g;}

const area=pl=>Math.abs(pl.reduce((a,q,i)=>{const r=pl[(i+1)%pl.length];return a+q[0]*r[1]-r[0]*q[1]},0))/2;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function zoneSnap(s,tag){const ceil={};for(const n of Object.values(s.nodes))if(n.type==='ceiling'&&n.zoneId)ceil[n.zoneId]=(ceil[n.zoneId]??0)+1;
 const rows=Object.values(s.nodes).filter(n=>n.type==='zone'&&n.parentId===firstFloorId).map(x=>({id:x.id,name:x.name,area:Number((area(x.polygon)/.0254/.0254).toFixed(1)),hasFloor:x.hasFloor,hasCeiling:x.hasCeiling,ceilings:ceil[x.id]??0,polygon:x.polygon.map(p=>p.map(v=>Number((v/.0254).toFixed(1))))}));
 fs.writeFileSync((process.env.FF_OUT??'/tmp')+'/ff-zones-'+tag+'.json',JSON.stringify(rows,null,2));return rows;}
// Idempotent: separator first (so the zones stay split), then remove the wall, then the 42 in glass guard item.
async function stairGuard(){
 let scene=await call('get_scene');zoneSnap(scene,'SG0');const meta={blueprintReview:'2026-10-25',correctionBasis:SG.basis,ownerDecision:SG.ownerDecision};
 if(!scene.nodes[SG.separatorId]){
  const ref=scene.nodes.separator_588_ff_lobby_front;
  const {id:_i,start:_s,end:_e,...rest}=ref;
  await call('apply_patch',{patches:[{op:'create',parentId:firstFloorId,node:{id:SG.separatorId,...rest,name:SG.key,start:[inch(SG.x0),inch(SG.z)],end:[inch(SG.x1),inch(SG.z)],metadata:{...ref.metadata,sourceWall:SG.key,physical:false,...meta}}}]});
  await sleep(1000);
 }
 scene=await call('get_scene');
 if(scene.nodes[SG.wallId]){await call('apply_patch',{patches:[{op:'delete',id:SG.wallId,cascade:false}]});await sleep(1000);scene=await call('get_scene');}
 if(!Object.values(scene.nodes).some(n=>n.type==='item'&&n.metadata?.exteriorKey===SG.key)){
  const q='Replace the first-floor stair-front wall with a 42 in glass guard.';
  await call('design_brief',{source:'open',vision:'Owner room-review decision: the stair-front wall becomes the same 42 in glass guard used elsewhere in the house. No other dressing.',axes:Object.fromEntries(['action','size','pieces','openings','style','materials','dressing'].map(k=>[k,{kind:'bounded',extent:'exact',quote:q,reading:'Only the glass guard on the former wall line.'}])),beyond:Object.fromEntries(['textiles','light','windows','walls','floor','plants','objects','smallFurniture'].map(k=>[k,{none:'No unrelated dressing.'}]))});await sleep(1000);
  const params={width:inch(SG.x1-SG.x0),height:inch(42)};
  const r=await call('add_object',{name:SG.key+' · glass guard',code:paramCode(guardCode,params),params,parentId:firstFloorId,position:[inch((SG.x0+SG.x1)/2),0,inch(SG.z)],rotation:0,category:'architectural detail',description:'Glass railing on the removed stair-front wall line; 42 inch height.',reason:'Owner room review: replace stair-front wall with a glass guard; same guard as the other house guards.'});
  await sleep(1000);scene=await call('get_scene');
  const g=r.nodeId??r.id??Object.values(scene.nodes).find(n=>n.type==='item'&&n.name===SG.key+' · glass guard')?.id;if(!g)throw Error('No guard id '+JSON.stringify(r).slice(0,300));
  await call('apply_patch',{patches:[{op:'update',id:g,data:{metadata:{...scene.nodes[g].metadata,sourceFile:'588 - M1 (Checked by Building Control).pdf',undimensioned:'PDF trace or explicitly labeled owner-authorized assumption; not surveyed or engineered',exteriorKey:SG.key,dimensionBasis:'Owner decision: 42 inch glass guard along z=440 in, x 514.5..673.5 in; glass plane on the former wall centreline.',...meta}}}]});
  console.log('guard',g);
 }
 await sleep(1000);scene=await call('get_scene');
 const near=(a,b)=>Math.abs(a-b)<.01;const lz=Object.values(scene.nodes).find(n=>n.type==='zone'&&n.parentId===firstFloorId&&n.seed&&near(n.seed[0],lobbyVoidSeed[0])&&near(n.seed[1],lobbyVoidSeed[1]));
 if(lz&&(lz.name!==lobbyVoidFields.name||lz.hasCeiling!==false||lz.hasFloor!==false)){
  const dead=Object.values(scene.nodes).filter(n=>n.type==='ceiling'&&n.zoneId===lz.id).map(n=>({op:'delete',id:n.id,cascade:false}));
  await call('apply_patch',{patches:[{op:'update',id:lz.id,data:lobbyVoidFields},...dead]});await sleep(1000);scene=await call('get_scene');console.log('void zone restored',lz.id);
 }
 for(const r of zoneSnap(scene,'SG1'))console.log(' ',r.id,String(r.name).padEnd(34),r.area,r.hasFloor,r.hasCeiling,'ceil',r.ceilings);
}
try{
 await c.connect(new StdioClientTransport({command:process.execPath,args:['scripts/pascal.mjs','mcp','connect']}));
 await call('load_scene',{id});const scene=await call('get_scene');
 if(process.argv[2]==='architecture'){
  const patches=architecturePatches(scene.nodes);console.log(JSON.stringify(await call('apply_patch',{patches})).slice(0,1800));
  const s=await call('get_scene');
  if(!Object.values(s.nodes).some(n=>n.metadata?.sourceOpening==='windows-1-review-terrace-w11')){
   const r=await call('add_window',{wallId:'wall_ase65fccc0',t:(80.75+4.5)/212.5,width:inch(72),height:inch(96),sillHeight:inch(6),windowType:'fixed',name:'W11 · FF · rear terrace'});
   console.log('Window',JSON.stringify(r).slice(0,600));
   const after=await call('get_scene');const w=Object.values(after.nodes).find(n=>n.type==='window'&&!s.nodes[n.id]);if(!w)throw Error('Missing new W11');
   await call('apply_patch',{patches:[{op:'update',id:w.id,data:{metadata:{sourceFile:'588 - M1 (Checked by Building Control).pdf',sourceOpening:'windows-1-review-terrace-w11',sourceTag:'W11',positionBasis:'PDF vector trace: jambs z=44.75..116.75 in',widthBasis:'PDF W11 schedule 72 in',heightBasis:'Owner override 8 ft; sill 6 in from PDF',blueprintReview:'2026-10-24'}}}]});
  }
 }
 if(process.argv[2]==='architecture'||process.argv[2]==='stairguard')await stairGuard();
 const checked=await call('get_scene');fs.writeFileSync('/tmp/pascal-first-review-after.json',JSON.stringify(checked));
 const v=await call('verify_scene');fs.writeFileSync('/tmp/pascal-first-review-verify.json',JSON.stringify(v,null,2));console.log('Verification',JSON.stringify(v).slice(0,300));
 if(process.argv[2]==='save'){
  const st=await call('get_project_status',{id});console.log(JSON.stringify(await call('save_scene',{id,name:st.name,expectedVersion:st.version,saveMode:'checkpoint',includeCurrentScene:true})).slice(0,900));
  fs.writeFileSync('scenes/588-m1-interior-v1.json',JSON.stringify(fullGraph(),null,2)+'\n');{const {syncSceneArtifacts}=await import('./sync-scene-artifacts.mjs');console.log('Artifacts',JSON.stringify(syncSceneArtifacts()));}
 }
 console.log(JSON.stringify(await call('get_project_status',{id})));
}finally{await c.close()}
