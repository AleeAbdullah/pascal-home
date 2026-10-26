// Usage: node scripts/correct-first-floor.mjs [architecture|stairguard|bridge|rooms|save]  (rooms = 2026-10-26 room review: syncs every first-floor Interior V1 item with src/first-floor-interior-v1.mjs and re-hangs the Kitchen+Store door; idempotent, FF_DRY=1 lists the plan only)
// (previous usage:  (stairguard = 2026-10-26 stair-front wall -> 42 in glass guard)
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {guardCode,paramCode} from '../src/588-exterior.mjs';
import {runBridge} from '../src/shaft-bridge.mjs';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import crypto from 'node:crypto';
import {items as specItems,rooms as specRooms,levelId as ffLevel,extraRooms} from '../src/first-floor-interior-v1.mjs';
import {kitchenDoorPatch,architecturePatches,inch,stairGuard as SG,lobbyVoidSeed,lobbyVoidFields,firstFloorId} from '../src/first-floor-blueprint-corrections.mjs';
const supportSlab='slab_588_ff_main';
const c=new Client({name:'first-floor-blueprint-correction',version:'1'},{capabilities:{}}),id='588-m1-interior-v1';
async function call(name,args={},tries=1){const raw=await c.callTool({name,arguments:args});const r=raw.structuredContent??JSON.parse(raw.content.find(x=>x.type==='text').text);if(r.code==='design_brief_required'&&tries<4){await designBrief();return call(name,args,tries+1)}if((r.code==='script_failed'||/rate/i.test(String(r.error)))&&tries<4){await new Promise(z=>setTimeout(z,4000*tries));return call(name,args,tries+1)}if(raw.isError||r.error||r.code)throw Error(name+': '+JSON.stringify(r).slice(0,1800));return r;}
function fullGraph(){const r=spawnSync('python3',['-c',"import sqlite3; c=sqlite3.connect('file:.pascal/data/pascal.db?mode=ro',uri=True);print(c.execute('select graph_json from scenes where id=?',('588-m1-interior-v1',)).fetchone()[0])"],{encoding:'utf8',maxBuffer:30e6});if(r.status)throw Error(r.stderr);const g=JSON.parse(r.stdout);if(!g.materials||Object.keys(g.materials).length<26)throw Error('Incomplete material registry');return g;}

async function designBrief(){const bd=(quote,reading)=>({kind:'bounded',quote,reading}),op=design=>({kind:'open',design});
 const r=await c.callTool({name:'design_brief',arguments:{source:'open',vision:'Room review 2026-10-26: apply the owner-approved first-floor furniture changes (architect plans govern placement, orientation and count) in the existing Interior V1 language; preserve every wall, opening, level, stair and the other floors.',axes:{action:bd('apply every owner-approved FIRST-FLOOR furniture change','Only the listed first-floor room-review changes.'),size:bd('keeping the blueprint geometry','Existing rooms unchanged; furniture fitted to the architect positions.'),pieces:op('Beds with benches, sofas, L-sofa, side and coffee tables, media units, hanging runs, glass showers and screens, vanities, built-in cabinet, ledge and planters per the owner queue.'),openings:bd('keeping the blueprint geometry','Retain every opening and avoid door swings; only the kitchen corridor door changes as ordered.'),style:bd('Interior V1 styling stays','Warm stone, walnut, ivory textiles, bronze fixtures.'),materials:op('Existing Interior V1 palette.'),dressing:op('Plants and ceramics already on the floor stay; nothing unrelated is added.')},beyond:{textiles:['Existing bedding and sofas'],light:['Existing coves and lamps'],windows:['Existing drapes'],walls:['Walnut built-in cabinet and lounge ledge'],floor:['Existing rugs'],plants:['Terrace planters'],objects:['Existing ceramics'],smallFurniture:['Benches, side tables']}}});
 console.log('brief',JSON.stringify(r).slice(0,300))}
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

// Room review 2026-10-26: sync the live first-floor Interior V1 objects with the spec (add / rebuild / move / delete). Idempotent.
const FORCE_REPLACE_ROOMS=new Set(['master','masterBath','masterCloset','bath2','closet2']),FORCE_REPLACE_KEYS=new Set(['rearBath-shower','rearBath-wc','frontBath-vanity','frontBath-wc','frontBath-shower','frontBath-screen','kitchen-hob','console-desk','frontMaster-reading']);
const pause=()=>sleep(650);
const deg=r=>r*Math.PI/180,near=(a,b,e=.0006)=>Math.abs(a-b)<e;
async function roomsMode(){
 const dry=!!process.env.FF_DRY;let scene=await call('get_scene');zoneSnap(scene,'RV0');
 const live=new Map(),stale=[];
 for(const n of Object.values(scene.nodes))if(n.type==='item'&&n.metadata?.firstInteriorV1Key){const k=n.metadata.firstInteriorV1Key;if(live.has(k))stale.push(n.id);else live.set(k,n)}
 const keys=new Set(specItems.map(i=>i.key));
 for(const [k,n] of live)if(!keys.has(k))stale.push(n.id);
 const roleRef={};for(const n of live.values())for(const [r,ref] of Object.entries(n.slots??{}))if(String(ref).startsWith('scene:'))roleRef[r]??=ref;
 const plan={add:[],replace:[],param:[],move:[],delete:stale.map(id=>scene.nodes[id]?.metadata?.firstInteriorV1Key??id)};
 const work=[];
 for(const spec of specItems){
  const hash=crypto.createHash('sha1').update(spec.code).digest('hex').slice(0,16),n=live.get(spec.key);
  if(!n){plan.add.push(spec.key);work.push({spec,hash,mode:'add'});continue}
  const had=n.metadata.firstInteriorV1Hash,force=FORCE_REPLACE_ROOMS.has(spec.room)||FORCE_REPLACE_KEYS.has(spec.key);
  if(had?had!==hash:force){plan.replace.push(spec.key);work.push({spec,hash,mode:'replace',n});continue}
  const lp=n.source?.params??{},pdiff=Object.entries(spec.params).some(([k,v])=>k==='gap'&&v<.1?false:typeof v==='number'?!near(lp[k]??NaN,v):lp[k]!==v); // gap 0 is clamped to the 0.1 minimum by add_object
  const pos=spec.position.some((v,i)=>!near(n.position[i],v,.0006)),rot=!near(((n.rotation[1]-deg(spec.rotation))%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI,0,.001);
  if(pdiff){plan.param.push(spec.key);work.push({spec,hash,mode:'param',n})}else if(pos||rot){plan.move.push(spec.key);work.push({spec,hash,mode:'move',n})}
 }
 console.log(JSON.stringify(plan,null,1));if(dry)return;
 // 1. delete retired pieces
 for(let i=0;i<stale.length;i+=20){await call('apply_patch',{patches:stale.slice(i,i+20).map(id=>({op:'delete',id,cascade:false}))});await pause()}
 // 2. add / rebuild / move
 const meta=(spec,hash,old)=>({...(old??{}),firstInteriorV1Key:spec.key,firstInteriorV1Hash:hash,zoneId:spec.zoneId??specRooms[spec.room][0],room:spec.room,dimensionBasis:'Proposed editable interior; checked blueprint and accepted corrections preserve room geometry',styleReference:'Lake City mood board: lounge 20–30; kitchen 31–37; bedrooms 39–49; bathrooms 50–62; lights and finishes 73–81',blueprintReview:'2026-10-26',ownerDecision:'Room review 2026-10-26: first-floor furniture follows the architect floor plans (page 2), Interior V1 styling kept'});
 const fresh=[];
 for(const w of work){
  const {spec,hash,mode,n}=w,{key,room,zoneId:_z,...args}=spec;
  if(mode==='move'){await call('apply_patch',{patches:[{op:'update',id:n.id,data:{position:spec.position,rotation:[0,deg(spec.rotation),0],metadata:meta(spec,n.metadata.firstInteriorV1Hash??hash,n.metadata)}}]});await pause();continue}
  if(mode==='param'){await call('add_object',{nodeId:n.id,params:spec.params,position:spec.position,rotation:spec.rotation});await pause();await call('apply_patch',{patches:[{op:'update',id:n.id,data:{metadata:meta(spec,n.metadata.firstInteriorV1Hash??hash,n.metadata)}}]});await pause();continue}
  const r=await call('add_object',{...args,...(mode==='replace'?{nodeId:n.id}:{}),category:key.includes('rug')?'rug':key.includes('light')||key.includes('pendant')?'light':'interior design',tags:['interior-v1','first-floor',room],description:'Editable first-floor Interior V1 proposal. Board-inspired furniture dimensions; governing architecture retained.',reason:'Room review 2026-10-26: layout follows the architect floor plan; custom board-inspired form fitted to this existing room.'});
  const id=n?.id??r.nodeId??r.id;if(!id)throw Error('Missing object id '+key+' '+JSON.stringify(r).slice(0,500));
  await pause();const node=await call('get_node',{id});await pause();
  const slots={...(node.slots??{})};for(const role of Object.keys(slots))if(roleRef[role])slots[role]=roleRef[role];
  await call('apply_patch',{patches:[{op:'update',id,data:{...(spec.parentId===ffLevel?{supportSlabId:supportSlab}:{}),slots,metadata:meta(spec,hash,node.metadata)}}]});await pause();
  fresh.push([room,id]);console.log(mode,key,id);
 }
 // 3. collections
 for(const room of new Set(fresh.map(f=>f[0]))){await call('edit_collection',{name:'Interior V1 · first floor · '+room,color:'#b99769',add:fresh.filter(f=>f[0]===room).map(f=>f[1])});await pause()}
 // 4. Kitchen+Store door
 scene=await call('get_scene');await call('apply_patch',{patches:kitchenDoorPatch(scene.nodes)});await pause();
 scene=await call('get_scene');for(const r of zoneSnap(scene,'RV1'))console.log(' ',r.id,String(r.name).padEnd(34),r.area,r.hasFloor,r.hasCeiling,'ceil',r.ceilings);
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
 if(process.argv[2]==='rooms')await roomsMode();
 if(process.argv[2]==='bridge'){zoneSnap(scene,'BR0');await runBridge({call,level:'first'});for(const r of zoneSnap(await call('get_scene'),'BR1'))console.log(' ',r.id,String(r.name).padEnd(34),r.area,r.hasFloor,r.hasCeiling,'ceil',r.ceilings);}
 const checked=await call('get_scene');fs.writeFileSync('/tmp/pascal-first-review-after.json',JSON.stringify(checked));
 const v=await call('verify_scene');fs.writeFileSync('/tmp/pascal-first-review-verify.json',JSON.stringify(v,null,2));console.log('Verification',JSON.stringify(v).slice(0,300));
 if(process.argv[2]==='save'){
  const st=await call('get_project_status',{id});console.log(JSON.stringify(await call('save_scene',{id,name:st.name,expectedVersion:st.version,saveMode:'checkpoint',includeCurrentScene:true})).slice(0,900));
  fs.writeFileSync('scenes/588-m1-interior-v1.json',JSON.stringify(fullGraph(),null,2)+'\n');{const {syncSceneArtifacts}=await import('./sync-scene-artifacts.mjs');console.log('Artifacts',JSON.stringify(syncSceneArtifacts()));}
 }
 console.log(JSON.stringify(await call('get_project_status',{id})));
}finally{await c.close()}
