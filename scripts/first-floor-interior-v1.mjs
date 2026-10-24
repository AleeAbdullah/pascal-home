import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {projectId,levelId,rooms,palette,items,floorFinishes} from '../src/first-floor-interior-v1.mjs';
const c=new Client({name:'first-floor-interior-v1',version:'1'},{capabilities:{}});
await c.connect(new StdioClientTransport({command:process.execPath,args:['scripts/pascal.mjs','mcp','connect']}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(name,args={}){await sleep(1150);const raw=await c.callTool({name,arguments:args});const r=raw.structuredContent??JSON.parse(raw.content.find(x=>x.type==='text').text);if(raw.isError||r.error||r.code)throw Error(name+': '+JSON.stringify(r).slice(0,1200));return r}
function fullGraph(){const p=spawnSync('python3',['-c',"import sqlite3; c=sqlite3.connect('file:.pascal/data/pascal.db?mode=ro',uri=True);print(c.execute('select graph_json from scenes where id=?',('588-m1-interior-v1',)).fetchone()[0])"],{encoding:'utf8',maxBuffer:30e6});if(p.status)throw Error(p.stderr);return JSON.parse(p.stdout)}
const mode=process.argv[2]??'build';
try{
await call('load_scene',{id:projectId});let scene=await call('get_scene');
const bounded=(quote,reading)=>({kind:'bounded',quote,reading}),open=design=>({kind:'open',design});
await call('design_brief',{source:'open',vision:'Continue Interior V1 upstairs: four calm upholstered bedrooms, walnut sliding closets, warm stone bathrooms, a relaxed ivory family lounge, compact kitchen clear of the secondary stair, and layered lighting. Mood-board pages 20–30,31–37,39–62,73–81 guide design; preserve all blueprint geometry, the completed ground floor and exterior.',axes:{action:bounded('And also continue on the first floor','Extend Interior V1 into the existing occupied first-floor rooms only.'),size:bounded('keeping the blueprint geometry and current lounge/dining design intact','Preserve every existing wall, opening, level, stair, slab, ceiling and all completed ground-floor work.'),pieces:open('Four upholstered beds, bedside storage and lamps, sliding closets, four sanitary suites, family lounge seating/media, galley kitchen and passage console.'),openings:bounded('keeping the blueprint geometry','Retain every opening and avoid door swings, window obstructions and stair footprints.'),style:bounded('using the mood board','Warm stone, walnut, ivory textiles, greige joinery, sage accents and restrained bronze; quiet bedroom variations.'),materials:open('Honed warm stone floor with woven room rugs, walnut and greige cabinetry, ivory upholstery and bronze fixtures.'),dressing:open('Layered bedding, stacked drapes, rugs, reading lamps, abstract art, ceramics, books and plants.')},beyond:{textiles:['Four layered beds','Ivory family lounge upholstery'],light:['Bedroom coves and lamps','Family lounge globe pendant','Illuminated vanity mirrors','Kitchen task lighting'],windows:['Stacked bedroom and lounge drapes'],walls:['Padded headwalls','Stone and walnut media wall','Abstract art'],floor:['Bedroom rugs','Family lounge woven rug'],plants:['Bedroom planters','Lounge greenery'],objects:['Vanity toiletries','Console and coffee-table ceramics'],smallFurniture:['Front master writing desk','Reading chairs','Passage console']}});
if(mode==='build'){
 const only=process.argv[3];let built=0;
 for(const spec of items.filter(x=>!only||x.room===only||only.split(',').includes(x.key))){
  const old=Object.values(scene.nodes).find(n=>n.metadata?.firstInteriorV1Key===spec.key||n.name===spec.name);
  if(old&&!only)continue;
  const {key,room,...args}=spec;
  const r=await call('add_object',{...args,...(old?{nodeId:old.id}:{}),category:key.includes('rug')?'rug':key.includes('light')||key.includes('pendant')?'light':'interior design',tags:['interior-v1','first-floor',room],description:'Editable first-floor Interior V1 proposal. Board-inspired furniture dimensions; governing architecture retained.',reason:'Custom board-inspired form and exact fit to this existing room; individually editable joinery, furniture or fixture.'});
  const id=old?.id??r.nodeId??r.id;
  if(!id)throw Error('Missing object id '+key+' '+JSON.stringify(r).slice(0,1000));
  await call('apply_patch',{patches:[{op:'update',id,data:{...(spec.parentId===levelId?{supportSlabId:'slab_588_ff_main'}:{}),metadata:{...(old?.metadata??{}),firstInteriorV1Key:key,zoneId:rooms[room][0],room,dimensionBasis:'Proposed editable interior; checked blueprint and accepted corrections preserve room geometry',styleReference:'Lake City mood board: lounge 20–30; kitchen 31–37; bedrooms 39–49; bathrooms 50–62; lights and finishes 73–81'}}}]});
  fs.writeFileSync('/tmp/pascal-first-v1-'+key+'.json',JSON.stringify(r));
  scene.nodes[id]={id,name:spec.name,metadata:{firstInteriorV1Key:key}};
  if(++built%5===0)console.log('Built '+built+' this run · '+room+' · '+key);
 }
 console.log('Build pass complete: '+built+' objects');
}
if(mode==='fit'){const patches=items.map(spec=>{const n=Object.values(scene.nodes).find(n=>n.metadata?.firstInteriorV1Key===spec.key);if(!n)throw Error(spec.key);return {op:'update',id:n.id,data:{position:spec.position}}});console.log(await call('apply_patch',{patches}));}
if(mode==='finish'||mode==='paint'){
 scene=await call('get_scene');
 const added=Object.values(scene.nodes).filter(n=>n.metadata?.firstInteriorV1Key);
 for(const [role,[color,roughness,metalness]]of Object.entries(palette)){
  const targets=added.filter(n=>n.source?.manifest?.slots?.some(s=>s.id===role)).map(n=>n.id);
  if(targets.length)await call('paint',{targets,role,material:{properties:{color,roughness,metalness}},materialName:'V1 · '+role});
 }
 if(mode==='finish'){
 await call('paint',{targets:['slab_588_ff_main'],role:'surface',material:{properties:{color:'#d5c6b0',roughness:.68,metalness:0}},materialName:'V1 · stone'});
 const ceilings=Object.values(rooms).map(r=>r[1]).filter(Boolean);
 await call('paint',{targets:ceilings,role:'surface',material:{preset:'plaster',properties:{color:'#eee8dc',roughness:.88,metalness:0}},materialName:'V1 · warm ivory ceiling'});
 scene=await call('get_scene');
 for(const [room,key]of Object.entries(floorFinishes)){
  const ref=Object.values(scene.nodes).find(n=>n.metadata?.firstInteriorV1Key&&n.slots?.[key])?.slots[key];if(!ref)throw Error('Missing finish '+key);
  await call('set_zone_intent',{zoneId:rooms[room][0],patch:{floor:{finish:ref}}});
 }
 for(const room of Object.keys(rooms)){const ids=added.filter(n=>n.metadata?.room===room).map(n=>n.id);if(ids.length)await call('edit_collection',{name:'Interior V1 · first floor · '+room,color:'#b99769',add:ids});}
 console.log('Native finishes applied; room collections created');
 }
}
if(mode==='check'){
 for(const [name,args]of [['verify_scene',{}],['check_collisions',{levelId,minimumClearance:0,floorOnly:true}],['get_project_status',{id:projectId}]]){
  const r=await call(name,args);fs.writeFileSync('/tmp/pascal-first-v1-'+name+'.json',JSON.stringify(r,null,2));console.log(name+' '+JSON.stringify(r).slice(0,name==='get_project_status'?1000:120));}
 const nodes={};for(const [room,[,id]]of Object.entries(rooms))if(id)nodes[room]=await call('get_node',{id});fs.writeFileSync('/tmp/pascal-first-v1-ceilings.json',JSON.stringify(nodes,null,2));
}
if(mode==='save'){
 const st=await call('get_project_status',{id:projectId});console.log(JSON.stringify(await call('save_scene',{id:projectId,name:st.name,includeCurrentScene:true,expectedVersion:st.version,saveMode:'checkpoint'})));
 const g=fullGraph();if(!g.materials||Object.keys(g.materials).length<20)throw Error('Incomplete material registry');fs.writeFileSync('scenes/588-m1-interior-v1.json',JSON.stringify(g,null,2));
 await call('load_scene',{id:projectId});console.log(JSON.stringify(await call('get_project_status',{id:projectId})));
}
if(mode==='walk'){
 const [x,z,rotation]=process.argv.slice(3).map(Number),id='spawn_first_interior_v1';
 const data={object:'node',id,type:'spawn',name:'Interior V1 · first-floor lounge walkthrough',parentId:levelId,visible:true,metadata:{firstFloorWalkthrough:true,zoneId:rooms.lounge[0]},position:[x,0,z],rotation,supportSlabId:'slab_588_ff_main'};
 const existing=scene.nodes[id];console.log(await call('apply_patch',{patches:[existing?{op:'update',id,data}:{op:'create',node:data,parentId:levelId}]}));
}
if(mode==='restore-walk'){
 const b=JSON.parse(fs.readFileSync('scenes/588-m1-interior-v1-ground-baseline-583.json','utf8')).nodes.spawn_interior_v1;
 await call('apply_patch',{patches:[{op:'update',id:b.id,data:b}]});console.log('Original lounge walkthrough restored');
}
}finally{await c.close()}
