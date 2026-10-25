import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {projectId,levelId,rooms,palette,items,floorFinishes} from '../src/ground-floor-interior-v1.mjs';
const c=new Client({name:'ground-floor-interior-v1',version:'1'},{capabilities:{}});
await c.connect(new StdioClientTransport({command:process.execPath,args:['scripts/pascal.mjs','mcp','connect']}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(name,args={}){await sleep(1150);const raw=await c.callTool({name,arguments:args});const r=raw.structuredContent??JSON.parse(raw.content.find(x=>x.type==='text').text);if(raw.isError||r.error||r.code)throw Error(name+': '+JSON.stringify(r).slice(0,1200));return r}
function fullGraph(){const p=spawnSync('python3',['-c',"import sqlite3; c=sqlite3.connect('file:.pascal/data/pascal.db?mode=ro',uri=True);print(c.execute('select graph_json from scenes where id=?',('588-m1-interior-v1',)).fetchone()[0])"],{encoding:'utf8',maxBuffer:30e6});if(p.status)throw Error(p.stderr);return JSON.parse(p.stdout)}
const mode=process.argv[2]??'build';
try{
await call('load_scene',{id:projectId});let scene=await call('get_scene');
const bounded=(quote,reading)=>({kind:'bounded',quote,reading}),open=design=>({kind:'open',design});
await call('design_brief',{source:'open',vision:'Continue the existing warm stone and walnut Interior V1 into the full ground floor: restrained taupe and walnut kitchen, stone waterfall island, sculptural ivory drawing-room seating, upholstered bedrooms, sliding closets, stone bathrooms and practical laundry. Mood-board pages 2–11,31–62 govern character. Preserve the current lounge/dining and all blueprint architecture and exterior.',axes:{action:bounded('Continue Interior V1 into the FULL ground-floor and kitchen using the mood board','Extend only the existing ground-floor V1, with separate editable pieces for every room.'),size:bounded('keeping the blueprint geometry and current lounge/dining design intact','Preserve every existing wall, opening, level, floor geometry and lounge/dining piece.'),pieces:open('Kitchen cabinetry, island, appliances, three stools, three furnished bedrooms, closets, sanitary fittings, formal drawing-room seating, laundry and entrance lighting.'),openings:bounded('keeping the blueprint geometry and current lounge/dining design intact','Retain exact existing door/window positions and sizes.'),style:bounded('using the mood board','Warm contemporary interiors: tactile ivory upholstery, walnut joinery, pale stone, soft taupe and discreet bronze.'),materials:open('Warm honed stone in shared and wet rooms, muted timber bedroom floors, taupe cabinet fronts, ivory linen and restrained bronze.'),dressing:open('Bedroom rugs and layered bedding, window drapes, lamps, bath accessories, kitchen ceramics, plants and drawing-room art.')},beyond:{textiles:['Three bedroom bedding sets','Drawing room ivory upholstery and cushions'],light:['Kitchen island pendant and under-cabinet light','Bedroom coves and bedside lamps','Bathroom illuminated mirrors','Corridor downlights','Double-height lobby chandelier'],windows:['Bedroom and drawing-room stacked taupe drapes'],walls:['Padded bedroom headboard walls','Drawing-room abstract art','Bathroom mirrors'],floor:['Three bedroom rugs','Drawing-room woven rug'],plants:['Master bedroom plant','Drawing-room corner plant'],objects:['Bathroom towels and toiletries','Kitchen ceramic tray','Drawing-room coffee-table books'],smallFurniture:['Bedroom writing desk','Closet dressing stool','Drawing-room console']}});
if(mode==='build'){
 const only=process.argv[3];let built=0;
 for(const spec of items.filter(x=>!only||x.room===only||only.split(',').includes(x.key))){
  const old=Object.values(scene.nodes).find(n=>n.metadata?.groundInteriorV1Key===spec.key||n.name===spec.name);
  if(old&&!only)continue;
  const {key,room,...args}=spec;
  const r=await call('add_object',{...args,...(old?{nodeId:old.id}:{}),category:key.includes('rug')?'rug':key.includes('light')||key.includes('pendant')?'light':'interior design',tags:['interior-v1','ground-floor',room],description:'Editable Interior V1 design proposal. Board-inspired furniture dimensions; governing architecture retained.',reason:'Custom board-inspired form and exact fit to this existing room; individually editable joinery, furniture or fixture.'});
  const id=old?.id??r.nodeId??r.id;
  if(!id)throw Error('Missing object id '+key+' '+JSON.stringify(r).slice(0,1000));
  await call('apply_patch',{patches:[{op:'update',id,data:{...(spec.parentId===levelId?{supportSlabId:'slab_588_gf_main'}:{}),metadata:{...(old?.metadata??{}),groundInteriorV1Key:key,zoneId:rooms[room][0],room,dimensionBasis:'Proposed editable interior; checked blueprint and accepted corrections preserve room geometry',styleReference:'Lake City mood board: entry 2–6; drawing 7–11; kitchen 31–37; laundry 38; bedrooms 39–49; bathrooms 50–62'}}}]});
  fs.writeFileSync('/tmp/pascal-ground-v1-'+key+'.json',JSON.stringify(r));
  scene.nodes[id]={id,name:spec.name,metadata:{groundInteriorV1Key:key}};
  if(++built%5===0)console.log('Built '+built+' this run · '+room+' · '+key);
 }
 console.log('Build pass complete: '+built+' objects');
}
if(mode==='fit'){const patches=items.map(spec=>{const n=Object.values(scene.nodes).find(n=>n.metadata?.groundInteriorV1Key===spec.key);if(!n)throw Error(spec.key);return {op:'update',id:n.id,data:{position:spec.position}}});console.log(await call('apply_patch',{patches}));}
if(mode==='finish'||mode==='paint'){
 scene=await call('get_scene');
 const added=Object.values(scene.nodes).filter(n=>n.metadata?.groundInteriorV1Key);
 for(const [role,[color,roughness,metalness]]of Object.entries(palette)){
  const targets=added.filter(n=>n.source?.manifest?.slots?.some(s=>s.id===role)).map(n=>n.id);
  if(targets.length)await call('paint',{targets,role,material:{properties:{color,roughness,metalness}},materialName:'V1 · '+role});
 }
 if(mode==='finish'){
 await call('paint',{targets:['slab_588_gf_main'],role:'surface',material:{properties:{color:'#d5c6b0',roughness:.68,metalness:0}},materialName:'V1 · stone'});
 const ceilings=Object.values(rooms).map(r=>r[1]).filter(Boolean);
 await call('paint',{targets:ceilings,role:'surface',material:{preset:'plaster',properties:{color:'#eee8dc',roughness:.88,metalness:0}},materialName:'V1 · warm ivory ceiling'});
 scene=await call('get_scene');
 for(const [room,key]of Object.entries(floorFinishes)){
  const ref=Object.values(scene.nodes).find(n=>n.metadata?.groundInteriorV1Key&&n.slots?.[key])?.slots[key];if(!ref)throw Error('Missing finish '+key);
  await call('set_zone_intent',{zoneId:rooms[room][0],patch:{floor:{finish:ref}}});
 }
 for(const room of Object.keys(rooms)){const ids=added.filter(n=>n.metadata?.room===room).map(n=>n.id);if(ids.length)await call('edit_collection',{name:'Interior V1 · '+room,color:'#b99769',add:ids});}
 console.log('Native finishes applied; room collections created');
 }
}
if(mode==='check'){
 for(const [name,args]of [['verify_scene',{}],['check_collisions',{levelId,minimumClearance:0,floorOnly:true}],['get_project_status',{id:projectId}]]){
  const r=await call(name,args);fs.writeFileSync('/tmp/pascal-ground-v1-'+name+'.json',JSON.stringify(r,null,2));console.log(name+' '+JSON.stringify(r).slice(0,name==='get_project_status'?1000:120));}
 const nodes={};for(const [room,[,id]]of Object.entries(rooms))if(id)nodes[room]=await call('get_node',{id});fs.writeFileSync('/tmp/pascal-ground-v1-ceilings.json',JSON.stringify(nodes,null,2));
}
if(mode==='save'){
 const st=await call('get_project_status',{id:projectId});console.log(JSON.stringify(await call('save_scene',{id:projectId,name:st.name,includeCurrentScene:true,expectedVersion:st.version,saveMode:'checkpoint'})));
 const g=fullGraph();if(!g.materials||Object.keys(g.materials).length<20)throw Error('Incomplete material registry');fs.writeFileSync('scenes/588-m1-interior-v1.json',JSON.stringify(g,null,2));{const {syncSceneArtifacts}=await import('./sync-scene-artifacts.mjs');console.log('Artifacts',JSON.stringify(syncSceneArtifacts()));}
 await call('load_scene',{id:projectId});console.log(JSON.stringify(await call('get_project_status',{id:projectId})));
}
if(mode==='walk'){
 const [x,z,rotation]=process.argv.slice(3).map(Number);
 console.log(await call('apply_patch',{patches:[{op:'update',id:'spawn_interior_v1',data:{position:[x,0,z],rotation,supportSlabId:'slab_588_gf_main'}}]}));
}
if(mode==='restore-walk'){
 const b=JSON.parse(fs.readFileSync('scenes/588-m1-interior-v1-lounge-baseline-89.json','utf8')).nodes.spawn_interior_v1;
 await call('apply_patch',{patches:[{op:'update',id:b.id,data:b}]});console.log('Original lounge walkthrough restored');
}
}finally{await c.close()}
