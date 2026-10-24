import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {projectId,levelId,zoneId,ceilingId,palette,items} from '../src/interior-v1.mjs';
const c=new Client({name:'interior-v1-builder',version:'1'},{capabilities:{}});await c.connect(new StdioClientTransport({command:process.execPath,args:['scripts/pascal.mjs','mcp','connect']}));
export async function call(name,args={}){await new Promise(r=>setTimeout(r,1100));const raw=await c.callTool({name,arguments:args});const r=raw.structuredContent??JSON.parse(raw.content.find(x=>x.type==='text').text);if(raw.isError||r.error||r.code)throw Error(name+': '+JSON.stringify(r).slice(0,1200));return r}
const open=design=>({kind:'open',design});const bounded=(quote,reading)=>({kind:'bounded',quote,reading});
const mode=process.argv[2]??'build';
try{
await call('load_scene',{id:projectId});let scene=await call('get_scene');
await call('design_brief',{source:'open',vision:'Board pages 17–19, 20, 22, 29: warm travertine, walnut, soft ivory linen, taupe drapes and dark bronze. An eight-seat dining group beside a low conversation lounge, integrated storage and layered warm lighting. Preserve the governing blueprint and current exterior.',axes:{action:bounded('Begin with the ground-floor lounge/dining area','Furnish and finish only this existing room in a separate V1 project.'),size:bounded('Keep the governing blueprint and my accepted corrections authoritative for geometry.','Preserve all original geometry, openings, levels and sunken floor.'),pieces:open('Eight dining chairs, stone table, sofa, two armchairs, coffee table and integrated media and dining storage.'),openings:bounded('Preserve the baseline and all current exterior work.','Retain every existing door and window without geometry changes.'),style:bounded('Treat the boards as style, material, lighting and furniture references.','Warm contemporary furniture and surfaces interpreted from board pages 17–29.'),materials:open('Honed pale stone, walnut, ivory linen, warm greige rug, taupe drapery and dark bronze.'),dressing:open('Subtle cushions, two woven rugs, abstract art, ceramics, books and a tall indoor plant.')},beyond:{textiles:['Ivory sofa with sage and taupe cushions','Linen dining and lounge seating'],light:['Dining linear pendant','Perimeter warm cove','Two lounge tracks','Reading floor lamp','Media accent strip'],windows:['Full-width southern window track with stacked taupe drapes'],walls:['Travertine and walnut media unit','Dining abstract art'],floor:['Dining and lounge woven rugs'],plants:['Tall lounge plant in ivory planter'],objects:['Books and ceramic vessels on coffee table and sideboard'],smallFurniture:['Two lounge armchairs','Dining storage sideboard']}});
if(mode==='build'){
 const only=process.argv[3];
 for(const spec of items.filter(x=>!only||x.key===only)){
  const old=Object.values(scene.nodes).find(n=>n.metadata?.interiorV1Key===spec.key||n.name===spec.name);
  const {key,...args}=spec;
  const r=await call('add_object',{...args,...(old?{nodeId:old.id}:{}),category:key.includes('rug')?'rug':key.includes('chair')?'chair':key.includes('track')||key==='pendant'||key==='floor-lamp'?'light':'interior design',tags:['interior-v1','lounge-dining'],description:'Interior V1 concept · board-inspired furniture; proposed dimensions, governing architecture unchanged.',reason:'Individually editable board-inspired form and dimensions fitted to the measured ground-floor lounge/dining.'});
  scene=await call('get_scene');const id=old?.id??r.nodeId??r.id??Object.values(scene.nodes).find(n=>n.name===spec.name)?.id;if(!id)throw Error('Missing id '+spec.key);
  await call('apply_patch',{patches:[{op:'update',id,data:{metadata:{...scene.nodes[id].metadata,interiorV1Key:key,styleReference:'588 M1 Lake City mood board · dining 17–19; lounge 20,22,29; lighting 73–75; finishes 79–81',dimensionBasis:'Proposed furniture design; existing checked blueprint controls room dimensions',zoneId}}}]});
  fs.writeFileSync('/tmp/pascal-v1-receipt-'+key+'.json',JSON.stringify(r,null,2));
  console.log(key+' '+id+' '+JSON.stringify(r.dimensions??r.size??{}));scene=await call('get_scene');
 }
}
if(mode==='paint'||mode==='build'&&!process.argv[3]){
 scene=await call('get_scene');
 for(const [k,[color,roughness,metalness]]of Object.entries(palette)){
  const targets=Object.values(scene.nodes).filter(n=>n.metadata?.interiorV1Key&&n.source?.manifest?.slots?.some(s=>s.id===k)).map(n=>n.id);
  if(targets.length){const role=k;await call('paint',{targets,role,material:{properties:{color,roughness,metalness}},materialName:'V1 · '+k});}
 }
 await call('paint',{targets:['slab_588_gf_sunken'],role:'surface',material:{preset:'tile',properties:{color:'#d5c6b0',roughness:.66,metalness:0}},materialName:'V1 · honed warm stone floor'});
 await call('paint',{targets:[ceilingId],role:'surface',material:{preset:'plaster',properties:{color:'#eee8dc',roughness:.88,metalness:0}},materialName:'V1 · warm ivory ceiling'});
 const all=Object.values(scene.nodes).filter(n=>n.metadata?.interiorV1Key).map(n=>n.id);await call('edit_collection',{name:'Interior V1 · lounge / dining',color:'#b99769',add:all});console.log('Painted and grouped '+all.length+' individually editable objects');
}
if(mode==='fit'){
 const patches=items.map(spec=>{const n=Object.values(scene.nodes).find(n=>n.metadata?.interiorV1Key===spec.key);return {op:'update',id:n.id,data:{position:spec.position,...(spec.parentId===levelId?{supportSlabId:'slab_588_gf_sunken'}:{})}}});console.log(await call('apply_patch',{patches}));
 console.log(JSON.stringify(await call('get_node',{id:ceilingId})));
 await call('set_zone_intent',{zoneId,patch:{floor:{finish:scene.nodes['slab_588_gf_sunken'].slots.surface}}});
}
if(mode==='curtain-finish'){
 const n=Object.values(scene.nodes).find(n=>n.metadata?.interiorV1Key==='curtain');console.log(await call('paint',{targets:[n.id],role:'taupe',material:{properties:{color:'#ad9c88',roughness:.94,metalness:0,side:'double'}},materialName:'V1 · two-sided pleated drapery'}));
}
if(mode==='walk'){
 const id='spawn_interior_v1';const data={name:'Interior V1 · lounge walkthrough start',position:[10.35,0,8.95],rotation:2.6,supportSlabId:'slab_588_gf_sunken',metadata:{interiorV1Key:'walkthrough',zoneId}};console.log(await call('apply_patch',{patches:[scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId:levelId,node:{id,type:'spawn',parentId:levelId,...data}}]}));
}
if(mode==='check'){
 for(const [name,args]of [['verify_scene',{}],['check_collisions',{levelId,minimumClearance:0,floorOnly:true}],['get_project_status',{id:projectId}]]){const r=await call(name,args);fs.writeFileSync('/tmp/pascal-v1-'+name+'.json',JSON.stringify(r,null,2));console.log(name+' '+JSON.stringify(r).slice(0,name==='get_project_status'?1200:250));}
}
if(mode==='save'){
 const st=await call('get_project_status',{id:projectId});console.log(JSON.stringify(await call('save_scene',{id:projectId,name:st.name,includeCurrentScene:true,expectedVersion:st.version,saveMode:'checkpoint'})));
 const out=spawnSync('python3',['-c',`import sqlite3,sys;c=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True);print(c.execute('select graph_json from scenes where id=?',(sys.argv[2],)).fetchone()[0])`,'.pascal/data/pascal.db',projectId],{encoding:'utf8',maxBuffer:20e6});if(out.status!==0)throw Error(out.stderr);const graph=JSON.parse(out.stdout);if(!graph.materials||Object.keys(graph.materials).length<5)throw Error('Complete material registry missing');fs.writeFileSync('scenes/588-m1-interior-v1.json',JSON.stringify(graph,null,2));await call('load_scene',{id:projectId});console.log(JSON.stringify(await call('get_project_status',{id:projectId})));
}
}finally{await c.close()}
