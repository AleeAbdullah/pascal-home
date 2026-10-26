// Usage: node scripts/correct-second-floor.mjs [apply|decisions|rooms|save]  (rooms = 2026-10-26 room review: syncs every second-floor Interior V1 item and the stair-head guard with src/second-floor-interior-v1.mjs; idempotent, SF_DRY=1 lists the plan only)
// `decisions` re-applies only the owner decisions of 2026-10-25 for this floor (W-17 width, glazed balcony door).
// Applies the 2026-10-25 second-floor blueprint corrections to the live scene (idempotent), verifies, optionally checkpoints.
// Source files (src/588-m1.mjs, src/588-openings.json, scripts/build-home.mjs, scripts/build-exterior.mjs) carry the same changes.
import fs from 'node:fs';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {secondFloorId,inch,newWalls,wallCreate,voidZonePatches,openingPatches,wallPatches,slabPatches,tank,windowDecisionPatches,balconyDoor,balconyDoorWall,balconyDoorNode,balconyDoorMetadata,maidPartition,maidPartitionCreate} from '../src/second-floor-blueprint-corrections.mjs';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import {items as specItems,rooms as specRooms,levelId as sfLevel,supportSlabId as supportSlab,guards as guardSpecs,guardParams,walnutGuardCode,paramCode} from '../src/second-floor-interior-v1.mjs';
const c=new Client({name:'second-floor-blueprint-correction',version:'1'},{capabilities:{}}),id='588-m1-interior-v1';
const outDir=process.env.SF_OUT??'/tmp';
const axisOf=w=>w.start[0]===w.end[0]?1:0,dirOf=w=>Math.sign(w.end[axisOf(w)]-w.start[axisOf(w)]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(name,args={}){for(let i=0;;i++){await sleep(600);const raw=await c.callTool({name,arguments:args});const r=raw.structuredContent??JSON.parse(raw.content.find(x=>x.type==='text').text);
 if(JSON.stringify(r).includes('rate_limited')&&i<5){await sleep(1500);continue;}
 if(r.code==='design_brief_required'&&i<4){await designBrief();continue;}
 if(r.code==='script_failed'&&i<4){await sleep(4000*(i+1));continue;}
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

// Maid bathroom partition wall and its door (architect page 3), idempotent.
async function partitionMode(){
 let scene=await call('get_scene');const P=maidPartition;
 if(!scene.nodes[P.id]){await call('apply_patch',{patches:[maidPartitionCreate(scene.nodes)]});scene=await call('get_scene');console.log('partition wall added',P.id)}
 const w=scene.nodes[P.id],len=Math.abs(w.end[0]-w.start[0]),t=(inch(P.door.centre)-w.start[0])/len;
 {const bz=scene.nodes.zone_gsgtn4kca1px7drd;if(bz&&bz.name!=='Maid bathroom')await call('apply_patch',{patches:[{op:'update',id:bz.id,data:{name:'Maid bathroom'}}]});}
 let d=Object.values(scene.nodes).find(n=>n.type==='door'&&n.parentId===P.id);
 if(!d){
  const ref=scene.nodes.door_k9o8lz7lz03sqyhh;
  await call('add_door',{wallId:P.id,t,width:inch(P.door.width),height:inch(P.door.height),openingKind:'door',doorType:'hinged'});
  scene=await call('get_scene');d=Object.values(scene.nodes).find(n=>n.type==='door'&&n.parentId===P.id);if(!d)throw Error('Missing new partition door');
  console.log('partition door added',d.id,JSON.stringify(d.position),d.hingesSide,d.swingDirection,d.side);
  await call('apply_patch',{patches:[{op:'update',id:d.id,data:{name:P.door.name,slots:{...d.slots,...(ref.slots?.frame?{frame:ref.slots.frame}:{}),...(ref.slots?.panel?{panel:ref.slots.panel}:{})},metadata:{sourceFile:'SAQIB AZZIZ RESEIDENCE FLOOR PLANS (03-11-2025).pdf',sourceOpening:P.door.sourceOpening,sourceTag:P.door.tag,positionBasis:'Architect page-3 vector trace: leaf x 881.3..905.4, hinge east jamb, swings north into the bathroom',widthBasis:'Quarter-arc radius ~27 in',heightBasis:'Owner rule: 8 ft (96 in)',blueprintReview:'2026-10-26',ownerDecision:'Owner 2026-10-26: add the maid bathroom door as drawn'}}}]});
 }
 if(d.swingDirection!==P.door.swingDirection||d.hingesSide!==P.door.hingesSide)await call('apply_patch',{patches:[{op:'update',id:d.id,data:{hingesSide:P.door.hingesSide,swingDirection:P.door.swingDirection}}]});
}

async function designBrief(){const bd=(quote,reading)=>({kind:'bounded',quote,reading}),op=design=>({kind:'open',design});
 const r=await c.callTool({name:'design_brief',arguments:{source:'open',vision:'Room review 2026-10-26: apply the owner-approved SECOND-FLOOR furniture changes (architect plans govern placement, orientation and count) in the existing Interior V1 language; preserve every wall, opening, level, stair and the other floors.',axes:{action:bd('apply every owner-approved SECOND-FLOOR change','Only the listed second-floor room-review changes.'),size:bd('keeping the blueprint geometry','Existing rooms unchanged; furniture fitted to the architect positions.'),pieces:op('Stair-head sitting nook and glass guard, maid room bed and bath fittings, bedroom suite, bathroom fittings and walk-in closet hanging runs per the owner queue.'),openings:bd('keeping the blueprint geometry','Retain every opening and avoid door swings.'),style:bd('Interior V1 styling stays','Warm stone, walnut, ivory textiles, bronze fixtures.'),materials:op('Existing Interior V1 palette.'),dressing:op('One corner planter at the stair head and one in the bedroom.')},beyond:{textiles:['Existing bedding'],light:['Downlights and bedside globes'],windows:['None'],walls:['None'],floor:['Bedroom rug'],plants:['Two corner planters'],objects:['None'],smallFurniture:['Bedsides, bench, side table']}}});
 console.log('brief',JSON.stringify(r).slice(0,200))}
const deg=r=>r*Math.PI/180,near=(a,b,e=.0006)=>Math.abs(a-b)<e;
const guardMeta=(g)=>({exteriorKey:'sf-stair-guard-'+g.key,sourceFile:'588 - M1 (Checked by Building Control).pdf',undimensioned:'PDF trace or explicitly labeled owner-authorized assumption; not surveyed or engineered',dimensionBasis:'Owner decision 2026-10-26: 42 inch clear glass guard with walnut handrail on the open edge of floor-opening_6iannrpnfuxc1udu ('+g.note+'); top-step edge z=62, x 791..833 left open.',blueprintReview:'2026-10-26',ownerDecision:'Room review 2026-10-26: stair-head glass guard'});
async function roomsMode(){
 const dry=!!process.env.SF_DRY;let scene=await call('get_scene');
 const live=new Map(),stale=[];
 for(const n of Object.values(scene.nodes))if(n.type==='item'&&n.metadata?.secondInteriorV1Key){const k=n.metadata.secondInteriorV1Key;if(live.has(k))stale.push(n.id);else live.set(k,n)}
 const keys=new Set(specItems.map(i=>i.key));
 for(const [k,n] of live)if(!keys.has(k))stale.push(n.id);
 const roleRef={};for(const n of Object.values(scene.nodes))if(n.type==='item')for(const [r,ref] of Object.entries(n.slots??{}))if(String(ref).startsWith('scene:'))roleRef[r]??=ref;
 const plan={add:[],replace:[],param:[],move:[],delete:stale.map(id=>scene.nodes[id]?.metadata?.secondInteriorV1Key??id),guards:[]};
 const work=[];
 for(const spec of specItems){
  const hash=crypto.createHash('sha1').update(spec.code).digest('hex').slice(0,16),n=live.get(spec.key);
  if(!n){plan.add.push(spec.key);work.push({spec,hash,mode:'add'});continue}
  if(n.metadata.secondInteriorV1Hash!==hash){plan.replace.push(spec.key);work.push({spec,hash,mode:'replace',n});continue}
  const lp=n.source?.params??{},pdiff=Object.entries(spec.params).some(([k,v])=>k==='gap'&&v<.1?false:typeof v==='number'?!near(lp[k]??NaN,v):lp[k]!==v);
  const pos=spec.position.some((v,i)=>!near(n.position[i],v,.0006)),rot=!near(((n.rotation[1]-deg(spec.rotation))%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI,0,.001);
  if(pdiff){plan.param.push(spec.key);work.push({spec,hash,mode:'param',n})}else if(pos||rot){plan.move.push(spec.key);work.push({spec,hash,mode:'move',n})}
 }
 const guardLive=new Map(Object.values(scene.nodes).filter(n=>n.type==='item'&&n.metadata?.exteriorKey?.startsWith('sf-stair-guard-')).map(n=>[n.metadata.exteriorKey,n]));
 for(const g of guardSpecs)if(!guardLive.has('sf-stair-guard-'+g.key))plan.guards.push(g.key);
 console.log(JSON.stringify(plan,null,1));if(dry)return;
 for(let i=0;i<stale.length;i+=20){await call('apply_patch',{patches:stale.slice(i,i+20).map(id=>({op:'delete',id,cascade:false}))})}
 const meta=(spec,hash,old)=>({...(old??{}),secondInteriorV1Key:spec.key,secondInteriorV1Hash:hash,zoneId:specRooms[spec.room][0],room:spec.room,dimensionBasis:'Proposed editable interior; checked blueprint and accepted corrections preserve room geometry',styleReference:'Lake City mood board: lounge 20-30; bedrooms 39-49; bathrooms 50-62; lights and finishes 73-81',blueprintReview:'2026-10-26',ownerDecision:'Room review 2026-10-26: second-floor furniture follows the architect floor plans (page 3), Interior V1 styling kept'});
 const fresh=[];
 for(const w of work){
  const {spec,hash,mode,n}=w,{key,room,...args}=spec;
  if(mode==='move'){await call('apply_patch',{patches:[{op:'update',id:n.id,data:{position:spec.position,rotation:[0,deg(spec.rotation),0],metadata:meta(spec,hash,n.metadata)}}]});continue}
  if(mode==='param'){await call('add_object',{nodeId:n.id,params:spec.params,position:spec.position,rotation:spec.rotation});await call('apply_patch',{patches:[{op:'update',id:n.id,data:{metadata:meta(spec,hash,n.metadata)}}]});continue}
  const r=await call('add_object',{...args,...(mode==='replace'?{nodeId:n.id}:{}),category:key.includes('rug')?'rug':key.includes('light')?'light':'interior design',tags:['interior-v1','second-floor',room],description:'Editable second-floor Interior V1 proposal. Board-inspired furniture dimensions; governing architecture retained.',reason:'Room review 2026-10-26: layout follows the architect floor plan (page 3); custom board-inspired form fitted to this existing room.'});
  const id=n?.id??r.nodeId??r.id;if(!id)throw Error('Missing object id '+key+' '+JSON.stringify(r).slice(0,500));
  const node=await call('get_node',{id});
  const slots={...(node.slots??{})};for(const role of Object.keys(slots))if(roleRef[role])slots[role]=roleRef[role];
  await call('apply_patch',{patches:[{op:'update',id,data:{...(spec.parentId===sfLevel?{supportSlabId:supportSlab}:{}),slots,metadata:meta(spec,hash,node.metadata)}}]});
  fresh.push([room,id]);console.log(mode,key,id);
 }
 for(const room of new Set(fresh.map(f=>f[0]))){await call('edit_collection',{name:'Interior V1 · second floor · '+room,color:'#b99769',add:fresh.filter(f=>f[0]===room).map(f=>f[1])})}
 // stair-head guard panels
 for(const g of guardSpecs){
  const ek='sf-stair-guard-'+g.key,params=guardParams(g),position=[inch(g.x),0,inch(g.z)];
  const have=guardLive.get(ek);
  if(have){
   const same=near(have.position[0],position[0])&&near(have.position[2],position[2])&&near(have.source?.params?.width??NaN,params.width);
   if(!same){await call('add_object',{nodeId:have.id,params,position,rotation:g.rotation});}
   continue;
  }
  const r=await call('add_object',{name:'sf-stair-guard-'+g.key+' · glass guard with walnut handrail',code:paramCode(walnutGuardCode,params),params,parentId:sfLevel,position,rotation:g.rotation,category:'architectural detail',description:'42 inch clear glass guard with walnut handrail on the open edge of the second-floor stair opening.',reason:'Owner room review 2026-10-26: safety guard at the stair head; matches the first-floor stair glass guard with a walnut handrail.'});
  scene=await call('get_scene');
  const gid=r.nodeId??r.id??Object.values(scene.nodes).find(n=>n.type==='item'&&n.name?.startsWith('sf-stair-guard-'+g.key))?.id;if(!gid)throw Error('No guard id '+JSON.stringify(r).slice(0,300));
  const gn=scene.nodes[gid],slots={...(gn.slots??{})};if(roleRef.walnut)slots.walnut=roleRef.walnut;
  await call('apply_patch',{patches:[{op:'update',id:gid,data:{slots,supportSlabId:supportSlab,metadata:{...gn.metadata,...guardMeta(g)}}}]});
  console.log('guard',g.key,gid);
 }
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
 if(mode==='partition'||mode==='rooms')await partitionMode();
 if(mode==='rooms')await roomsMode();
 const v=await call('verify_scene');fs.writeFileSync(`${outDir}/sf-verify-after.json`,JSON.stringify(v,null,2));fs.writeFileSync(`${outDir}/sf-scene-after.json`,JSON.stringify(await call('get_scene')));console.log('Verification',v.issues?.length);
 if(mode==='save'){
  const st=await call('get_project_status',{id});console.log(JSON.stringify(await call('save_scene',{id,name:st.name,expectedVersion:st.version,saveMode:'checkpoint',includeCurrentScene:true})).slice(0,900));
  fs.writeFileSync('scenes/588-m1-interior-v1.json',JSON.stringify(fullGraph(),null,2)+'\n');{const {syncSceneArtifacts}=await import('./sync-scene-artifacts.mjs');console.log('Artifacts',JSON.stringify(syncSceneArtifacts()));}
 }
 console.log(JSON.stringify(await call('get_project_status',{id})));
}finally{await c.close()}
