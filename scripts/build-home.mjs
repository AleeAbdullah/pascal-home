import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {model,payload,projectId,inch,splitWalls,constructionFloors,xy,windowSchedule,doorSchedule} from '../src/588-m1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const statePath=path.join(root,'.pascal/588-build-state.json');
const client=new Client({name:'pascal-home-588',version:'1.0.0'},{capabilities:{}});
await client.connect(new StdioClientTransport({command:process.execPath,args:[path.join(root,'scripts/pascal.mjs'),'mcp','connect']}));
const value=r=>{if(r.structuredContent)return r.structuredContent;const t=r.content.find(c=>c.type==='text')?.text??'';try{return JSON.parse(t);}catch{return {error:t};}};
let lastCall=0;
async function call(name,args={}){await new Promise(resolve=>setTimeout(resolve,Math.max(0,1100-(Date.now()-lastCall))));lastCall=Date.now();const raw=await client.callTool({name,arguments:args});const r=value(raw);if(raw.isError||r.error||r.code||r.conflicts?.some(c=>c.severity==='error'||r.changes===0)){fs.writeFileSync('/tmp/pascal-last-error.json',JSON.stringify(raw,null,2));throw Error(`${name}: ${JSON.stringify(r).slice(0,500)}`);}return r;}
try{
 await call('load_scene',{id:projectId});
 const stage=process.argv[2]??'inspect';
 if(stage==='author'){
  const current=await call('get_project_status',{id:projectId});
  if(current.nodeCount>3&&!process.argv.includes('--replace'))throw Error('Existing model: inspect manual edits before explicitly choosing --replace.');
  const r=await call('author_scene',{payload:payload(),replace:true});
  fs.writeFileSync(statePath,JSON.stringify(r,null,2));
  console.log(JSON.stringify(r).slice(0,2200));
 }else if(stage==='inspect'){
  const r=await call('get_scene');fs.writeFileSync('/tmp/pascal-588-scene.json',JSON.stringify(r,null,2));
  console.log(JSON.stringify(await call('get_project_status',{id:projectId})));
 }else if(stage==='call'){
  const q=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
  const r=await call(q.name,q.args);fs.writeFileSync(process.argv[4]??'/tmp/pascal-588-result.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r).slice(0,1200));
 }else if(stage==='configure'){
  const state=JSON.parse(fs.readFileSync(statePath)), ids=state.ids;
  if(!ids)throw Error('Missing author_scene ids.');
  const scene=await call('get_scene');
  const building=Object.values(scene.nodes).find(n=>n.type==='building');
  const patches=[{op:'update',id:building.id,data:{position:[0,inch(18),0],name:'588 M1 · governing PDF',metadata:{...building.metadata,source:model.source}}}];
  for(const [i,l] of model.levels.entries()){
   const parentId=ids[`level/${i}`];
   patches.push({op:'update',id:parentId,data:{height:inch(l.floorToFloor),baseElevation:0,metadata:{source:model.source,plan:l.key}}});
   for(const w of splitWalls(l)){
    const base=w.id.split(':')[0];
    const id=ids[w.id]??(w.id.endsWith(':0')?ids[base]:`wall_588_${w.id.replaceAll(/[^a-zA-Z0-9]/g,'_')}`);
    ids[w.id]=id;
    const data={start:w.start,end:w.end,thickness:w.thickness,height:w.height,name:base,metadata:{sourceFile:model.source.file,sheet:1,plan:l.key,sourceWall:base,positionBasis:'dimension-chain grid; undimensioned returns traced from PDF',sourceStart:w.start,sourceEnd:w.end}};
    patches.push(scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId,node:{id,type:'wall',parentId,children:[],...data}});
   }
   for(const q of l.separators){
    const id=`separator_588_${q.id.replaceAll('-','_')}`;
    const data={start:q.start,end:q.end,name:q.id,metadata:{sourceFile:model.source.file,physical:false}};
    patches.push(scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId,node:{id,type:'separator',parentId,...data}});
   }
  }
  await call('apply_patch',{patches});
  fs.writeFileSync(statePath,JSON.stringify(state,null,2));
  const after=await call('get_scene');
  fs.writeFileSync('/tmp/pascal-588-scene.json',JSON.stringify(after,null,2));
  console.log(`Restored source geometry and inserted wall junctions: ${patches.length} changes.`);
 }else if(stage==='floors'){
  const state=JSON.parse(fs.readFileSync(statePath)), ids=state.ids;
  const inside=(p,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++)if((poly[i][1]>p[1])!==(poly[j][1]>p[1])&&p[0]<(poly[j][0]-poly[i][0])*(p[1]-poly[i][1])/(poly[j][1]-poly[i][1])+poly[i][0])c=!c;return c;};
  const scene=await call('get_scene');
  const building=Object.values(scene.nodes).find(n=>n.type==='building');
  const finish=Object.values(scene.nodes).find(n=>n.type==='slab'&&n.slots?.surface)?.slots.surface;
  const patches=[{op:'update',id:building.id,data:{position:[0,inch(18),0],groundLevelId:ids['level/0']}}];
  for(const f of constructionFloors){
   const id=`slab_588_${f.key.replaceAll('-','_')}`,parentId=ids[`level/${f.level}`];
   const data={name:f.key+' · PDF floor construction',polygon:f.polygon.map(xy),holes:f.holes.map(h=>h.map(xy)),elevation:inch(f.top),thickness:inch(f.thickness),autoFromWalls:false,slots:{surface:finish},metadata:{sourceFile:model.source.file,sourceTopInches:f.top,sourceThicknessInches:f.thickness}};
   patches.push(scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId,node:{id,type:'slab',parentId,...data}});
  }
  for(const [i,l] of model.levels.entries()){
   const levelId=ids[`level/${i}`];
   patches.push({op:'update',id:levelId,data:{baseElevation:0,height:inch(l.floorToFloor)}});
   for(const slab of Object.values(scene.nodes).filter(n=>n.type==='slab'&&n.parentId===levelId&&!n.autoFromWalls&&n.plateRole!=='base')){
    const original=l.slabs.find(s=>s.name===slab.name);if(original)patches.push({op:'update',id:slab.id,data:{elevation:original.top}});
   }
   for(const z of Object.values(scene.nodes).filter(n=>n.type==='zone'&&n.parentId===levelId&&n.spaceRole==='room')){
    const match=pt=>inside(pt,z.polygon)&&!z.holes?.some(h=>inside(pt,h));
    const r=l.rooms.find(r=>match(r.seed));
    const q=l.labels.find(q=>match(q.polygon.reduce((a,p)=>[a[0]+p[0]/q.polygon.length,a[1]+p[1]/q.polygon.length],[0,0])));
    const sunken=i===0&&match(xy([300,500]));
    const shaft=match(xy([470,400]));const lobby=match(xy([590,520]));
    const step=i===0&&match(xy([300,282]));
    const key=i===0?(sunken?'gf-sunken':step?'gf-lounge-step':'gf-main'):i===1?'ff-main':match(xy([450,100]))?'sf-store':'sf-east';
    patches.push({op:'update',id:z.id,data:{...(r?{name:r.name}:q?{name:q.name}:{}),floor:{sourceSlabId:`slab_588_${key.replaceAll('-','_')}`,finish},...(shaft||lobby?{hasCeiling:false}:{}),...(shaft||lobby&&i===1?{hasFloor:false}:{})}});
   }
  }
  await call('apply_patch',{patches});
  const r=await call('get_scene');fs.writeFileSync('/tmp/pascal-588-scene.json',JSON.stringify(r,null,2));
  console.log('Native drawn floors bound to rooms; source heights preserved without automatic shared-floor displacement.');
 }else if(stage==='correct-and-paint'){
  const {ids}=JSON.parse(fs.readFileSync(statePath));let scene=await call('get_scene');const nodes=Object.values(scene.nodes);const patches=[];
  const wanted=new Set(model.levels.flatMap(l=>splitWalls(l).map(w=>ids[w.id])));
  for(const old of nodes.filter(n=>n.type==='wall'&&n.metadata?.sourceWall&&!wanted.has(n.id))){
   const target=nodes.find(n=>n.type==='wall'&&wanted.has(n.id)&&n.metadata?.sourceWall===old.metadata.sourceWall&&n.start[0]<=old.start[0]+1e-6&&n.start[1]<=old.start[1]+1e-6&&n.end[0]>=old.end[0]-1e-6&&n.end[1]>=old.end[1]-1e-6);
   if(!target)throw Error(`No replacement host for ${old.id}`);
   const moved=nodes.filter(n=>n.parentId===old.id);const shift=Math.hypot(old.start[0]-target.start[0],old.start[1]-target.start[1]);
   for(const n of moved)patches.push({op:'update',id:n.id,data:{parentId:target.id,wallId:target.id,position:[n.position[0]+shift,...n.position.slice(1)]}});
   patches.push({op:'update',id:target.id,data:{children:[...new Set([...(target.children??[]),...moved.map(n=>n.id)])]}});
   patches.push({op:'update',id:old.id,data:{children:[]}});patches.push({op:'delete',id:old.id,cascade:false});
  }
  const site=nodes.find(n=>n.type==='site'),boundary=JSON.parse(fs.readFileSync(path.join(root,'src/588-site.json')));
  patches.push({op:'update',id:site.id,data:{polygon:{type:'polygon',points:boundary.polygon},metadata:{...site.metadata,...boundary,polygon:undefined},frontEdge:boundary.polygon.length-2}});
  const secondary=nodes.find(n=>n.type==='stair'&&n.name==='Secondary stair · PDF winders');
  const secondaryPlate=scene.nodes.slab_588_sf_east;
  const uniqueHoleIndices=secondaryPlate.holes.map((_,i)=>i).filter(i=>secondaryPlate.holes.findIndex(h=>JSON.stringify(h)===JSON.stringify(secondaryPlate.holes[i]))===i);
  patches.push({op:'update',id:secondary.id,data:{slabOpeningMode:'none'}});
  patches.push({op:'update',id:secondaryPlate.id,data:{holes:uniqueHoleIndices.map(i=>secondaryPlate.holes[i]),holeMetadata:uniqueHoleIndices.map(i=>secondaryPlate.holeMetadata?.[i]??{source:'manual'})}});
  for(const z of nodes.filter(n=>n.type==='zone'&&/Open to sky|Looking below|Rear terrace|Roof terrace|Open-to-sky/.test(n.name)))patches.push({op:'update',id:z.id,data:{enclosureStatus:'open',hasCeiling:false}});
  await call('apply_patch',{patches:patches.filter(p=>p.op!=='delete')});
  const detached=await call('get_scene');
  const deletes=patches.filter(p=>p.op==='delete');
  for(const p of deletes)if(Object.values(detached.nodes).some(n=>n.parentId===p.id))throw Error('Opening reparenting failed; old wall retained.');
  if(deletes.length)await call('apply_patch',{patches:deletes});
  scene=await call('get_scene');const all=Object.values(scene.nodes);
  await call('paint',{targets:all.filter(n=>n.type==='wall').map(n=>n.id),material:{properties:{color:'#e8e3d8',roughness:.9,metalness:0}},materialName:'Neutral display plaster · not a specified finish'});
  await call('paint',{targets:all.filter(n=>['window','door'].includes(n.type)).map(n=>n.id),role:'frame',material:{properties:{color:'#303735',roughness:.45,metalness:.5}},materialName:'Neutral display charcoal frames'});
  await call('paint',{targets:all.filter(n=>n.type==='door'&&n.openingKind==='door').map(n=>n.id),role:'panel',material:{properties:{color:'#92765b',roughness:.75,metalness:0}},materialName:'Neutral display timber doors'});
  console.log('Removed stale wall host, traced site boundary, and applied neutral display finishes.');
 }else if(stage==='parapets'){
  const {ids}=JSON.parse(fs.readFileSync(statePath));let scene=await call('get_scene');
  const chains=[[[379.5,-4.5],[-4.5,-4.5],[-4.5,568],[433.5,568],[433.5,325],[514.5,325]],[[514.5,440],[514.5,595],[673.5,595],[673.5,631],[931.5,631],[931.5,440]],[[514.5,277],[673.5,277],[673.5,440],[514.5,440]],[[523.5,208],[673.5,208]],[[514.5,277],[514.5,440]],[[433.5,568],[514.5,568]]];
  const lines=chains.flatMap(p=>p.slice(1).map((end,i)=>({start:p[i],end})));
  const todo=lines.map((p,i)=>({...p,key:`parapet-${i}`})).filter(p=>!Object.values(scene.nodes).some(n=>n.metadata?.sourceParapet===p.key));
  if(todo.length){
   await call('run_batch',{calls:todo.map(p=>({tool:'add_wall',input:{start:xy(p.start),end:xy(p.end),thickness:inch(9),height:inch(42),levelId:ids['level/2']}}))});
   const fresh=await call('get_scene');const updates=[];
   for(const p of todo){const node=Object.values(fresh.nodes).find(n=>n.type==='wall'&&!scene.nodes[n.id]&&Math.hypot(n.start[0]-inch(p.start[0]),n.start[1]-inch(p.start[1]))<.01&&Math.hypot(n.end[0]-inch(p.end[0]),n.end[1]-inch(p.end[1]))<.01);if(!node)throw Error(`Parapet not found: ${p.key}`);updates.push({op:'update',id:node.id,data:{name:'Roof parapet · section level +31′-2″',metadata:{sourceParapet:p.key,sourceFile:model.source.file,heightBasis:'Owner-delegated conflict resolution: 42 inch difference between section levels',positionBasis:'PDF wall-face grid and vector trace'}}});}
   for(const z of Object.values(fresh.nodes).filter(n=>n.type==='zone'&&n.spaceRole==='room'&&n.parentId===ids['level/2']&&!scene.nodes[n.id]))updates.push({op:'update',id:z.id,data:{name:'Roof terrace',hasFloor:false,hasCeiling:false,floor:{sourceSlabId:'slab_588_sf_east'}}});
   await call('apply_patch',{patches:updates});
  }
  console.log(`Created ${todo.length} PDF roof parapet segments at 42 inches.`);
 }else if(stage==='stairs'){
  const {ids}=JSON.parse(fs.readFileSync(statePath));let scene=await call('get_scene');
  const patches=[];
  const flights=[{name:'Main stair · lower flight',x:678,z:311.5,y:0,rotation:270,length:99,height:58.5,steps:9},{name:'Main stair · middle flight',x:549,z:341.5,y:65,rotation:0,length:33,height:19.5,steps:3},{name:'Main stair · upper flight',x:579,z:404.5,y:91,rotation:90,length:110,height:65,steps:10}];
  for(const f of flights){
   let stair=Object.values(scene.nodes).find(n=>n.type==='stair'&&n.name===f.name);
   if(!stair){const r=await call('create_stair',{name:f.name,x:inch(f.x),z:inch(f.z),rotation:f.rotation,width:inch(60),length:inch(f.length),height:inch(f.height),steps:f.steps,levelId:ids['level/0'],toLevelId:null,railingMode:'none'});scene=await call('get_scene');stair=scene.nodes[r.stairId];}
   patches.push({op:'update',id:stair.id,data:{position:[inch(f.x),inch(f.y),inch(f.z)],fillToFloor:false,thickness:inch(6),metadata:{sourceFile:model.source.file,assembly:'Main stair',riserInches:6.5,treadInches:11,sourceBasis:'PDF 5 ft width, 11 inch tread, 6.5 inch riser; traced flight positions. Two landing risers complete 24 total rises.',constructionBasis:'6 inch display body; structural stair thickness not dimensioned'}}});
   for(const child of stair.children)patches.push({op:'update',id:child,data:{fillToFloor:false,thickness:inch(6)}});
  }
  for(const [i,f]of [{box:[519,281.5,579,341.5],top:65},{box:[519,374.5,579,434.5],top:91}].entries()){
   const id=`slab_588_stair_landing_${i}`,b=f.box,parentId=ids['level/0'];
   const data={name:`Main stair · landing ${i+1}`,polygon:[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]].map(xy),elevation:inch(f.top),thickness:inch(6.5),autoFromWalls:false,metadata:{sourceFile:model.source.file,role:'stair-landing',assembly:'Main stair',landingRiserInches:6.5}};
   patches.push(scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId,node:{id,type:'slab',parentId,...data}});
  }
  let secondary=Object.values(scene.nodes).find(n=>n.type==='stair'&&n.name==='Secondary stair · PDF winders');
  if(!secondary){const r=await call('create_stair',{name:'Secondary stair · PDF winders',x:inch(699),z:inch(122),rotation:180,width:inch(42),length:inch(170.5),height:inch(158),steps:23,levelId:ids['level/1'],toLevelId:ids['level/2'],railingMode:'none',openingOffset:0});scene=await call('get_scene');secondary=scene.nodes[r.stairId];}
  const chain=[{n:8,run:80},{n:3,run:42,winder:true},{n:7,run:70.5},{n:3,run:42,winder:true},{n:2,run:20}];
  const children=[];
  for(const [i,f]of chain.entries()){
   const id=secondary.children[i]??`sseg_588_secondary_${i}`;children.push(id);
   const data={segmentType:'stair',width:inch(42),length:inch(f.run),height:inch(158*f.n/23),stepCount:f.n,attachmentSide:'front',position:[0,0,0],rotation:0,fillToFloor:false,thickness:inch(6),...(f.winder?{winder:{turn:'left',innerGap:0,walkingLineOffset:inch(21),division:'equal-angle'}}:{})};
   patches.push(scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId:secondary.id,node:{id,type:'stair-segment',parentId:secondary.id,...data}});
  }
  patches.push({op:'update',id:secondary.id,data:{children,stepCount:23,totalRise:inch(158),uniformRisers:true,fillToFloor:false,thickness:inch(6),metadata:{sourceFile:model.source.file,riserBasis:'Owner approved: preserve 158 inch section rise and calculate equal risers; 22 numbered treads plus destination floor = 23 rises',riserInches:158/23,positionBasis:'PDF vector trace; final tread is integrated with destination floor',constructionBasis:'6 inch display body; structural thickness not dimensioned'}}});
  await call('apply_patch',{patches});
  const prior=Object.values(scene.nodes).some(n=>n.type==='floor-opening'&&n.metadata?.mainStair);
  if(!prior){const r=await call('cut_floor_opening',{levelId:ids['level/1'],polygon:[[519,281.5],[689,281.5],[689,434.5],[519,434.5]].map(xy),drawnOn:'floor',cutsAdjacent:true});for(const id of r.openingIds??[r.openingId])if(id)await call('apply_patch',{patches:[{op:'update',id,data:{metadata:{mainStair:true,sourceFile:model.source.file}}}]});}
  console.log('Created native stair flights, landing risers, and secondary winder chain.');
 }else if(stage==='finish-shell'){
  let scene=await call('get_scene');const nodes=Object.values(scene.nodes);
  const roof=nodes.find(n=>n.type==='roof');if(!roof)throw Error('Create the native flat roof first.');
  const rectangles=[[375,-9,528,208],[669,-9,915,166],[915,38.5,954,166],[738,166,936,444.5]];
  const oldSegments=roof.children.map(id=>scene.nodes[id]).filter(n=>n?.type==='roof-segment');
  const patches=[];const children=[];
  for(const [i,r]of rectangles.entries()){
   const id=oldSegments[i]?.id??`rseg_588_flat_${i}`;children.push(id);
   const data={name:`PDF flat roof ${i+1}`,roofType:'flat',position:[inch((r[0]+r[2])/2),0,inch((r[1]+r[3])/2)],rotation:0,width:inch(r[2]-r[0]),depth:inch(r[3]-r[1]),pitch:0,wallHeight:0,overhang:0,deckThickness:inch(6),shingleThickness:inch(4),metadata:{sourceFile:model.source.file,dimensionsBasis:'Wall-face grid; 6 inch RCC plus 4 inch finishes from section',finishBasis:'Neutral display finish'}};
   patches.push(scene.nodes[id]?{op:'update',id,data}:{op:'create',parentId:roof.id,node:{id,type:'roof-segment',parentId:roof.id,...data}});
  }
  patches.push({op:'update',id:roof.id,data:{position:[0,-inch(10),0],rotation:0,children}});
  for(const z of nodes.filter(n=>n.type==='zone')){
   if(z.spaceRole==='generic'&&nodes.some(n=>n.type==='zone'&&n.spaceRole==='room'&&n.parentId===z.parentId&&n.name===z.name)){patches.push({op:'delete',id:z.id});continue;}
   if(z.spaceRole!=='room')continue;
   const xs=z.polygon.map(p=>p[0]/.0254),zs=z.polygon.map(p=>p[1]/.0254);
   if(Math.abs(Math.min(...xs)-433.5)<.1&&Math.min(...zs)>324&&Math.max(...zs)>560)patches.push({op:'update',id:z.id,data:{name:'Open-to-sky shaft',hasFloor:false,hasCeiling:false}});
   else if(z.name.startsWith('Room '))patches.push({op:'update',id:z.id,data:{name:z.parentId==='level_as4e3a9d57'?'Lounge approach · upper floor':'Console passage'}});
  }
  for(const patch of patches.filter(p=>p.op==='create'||p.id?.startsWith('rseg_')||p.id===roof.id))await call('apply_patch',{patches:[patch]});
  await call('apply_patch',{patches:patches.filter(p=>p.id?.startsWith('zone_'))});
  console.log(`Corrected roof outlines and labels: ${patches.length} changes.`);
 }else if(stage==='verify-save'){
  const result=await call('verify_scene');fs.writeFileSync('/tmp/pascal-588-verification.json',JSON.stringify(result,null,2));
  const before=await call('get_project_status',{id:projectId});
  const saved=await call('save_scene',{id:projectId,name:before.name,expectedVersion:before.version,saveMode:'checkpoint'});
  await call('load_scene',{id:projectId});const after=await call('get_project_status',{id:projectId});
  if(saved.graphHash!==after.graphHash)throw Error('Saved/reopened graph hash mismatch');
  const scene=await call('get_scene');fs.writeFileSync(path.join(root,'scenes/588-m1-governing-plan.json'),JSON.stringify(scene,null,2));
  fs.writeFileSync('/tmp/pascal-588-scene.json',JSON.stringify(scene,null,2));
  console.log(JSON.stringify({valid:result.valid,issues:result.issues.reduce((a,x)=>(a[x.type]=(a[x.type]??0)+1,a),{}),saved,reopenedHashMatches:true}));
 }else if(stage==='openings'){
  const state=JSON.parse(fs.readFileSync(statePath)),ids=state.ids;
  const specs=JSON.parse(fs.readFileSync(path.join(root,'src/588-openings.json')));
  let scene=await call('get_scene');let added=0;const pending=[];
  for(const kind of ['windows','doors','passages'])for(const [index,q]of specs[kind].entries()){
   const key=`${kind}-${q.level}-${index}`;
   if(q.replacedByBridgeOpening||q.replacedByRoomReview)continue; // Room review 2026-10-26: window replaced by a bridge opening (appended passages entry)
   if(Object.values(scene.nodes).some(n=>n.metadata?.sourceOpening===key))continue;
   const base=model.levels[q.level].walls.find(w=>w.id===q.wall),axis=base.start[1]===base.end[1]?0:1;
   const size=kind==='windows'?windowSchedule[q.tag]:kind==='doors'?doorSchedule[q.tag]:[q.width,q.height];
   const width=q.widthOverride??size[0],at=inch(q.at);
   let height=kind==='windows'?96:size[1],sill=kind==='windows'?size[2]:0;
   if(kind==='windows'&&q.level===2&&["W11'","W18'"].includes(q.tag))height=size[1];
   const w=splitWalls(model.levels[q.level]).find(w=>w.id.split(':')[0]===q.wall&&at-inch(width/2)>=w.start[axis]-1e-7&&at+inch(width/2)<=w.end[axis]+1e-7);
   if(!w){pending.push({key,...q,reason:'Scheduled width crosses a wall junction at its traced position.'});continue;}
   const args={wallId:ids[w.id],t:(at-w.start[axis])/(w.end[axis]-w.start[axis]),width:inch(width),height:inch(height)};
   if(kind==='windows')Object.assign(args,{windowType:'fixed',sillHeight:inch(sill),style:'single'});
   else Object.assign(args,{openingKind:kind==='passages'?'opening':'door',doorType:q.tag==='D1'?'double':'hinged',style:q.tag==='D1'?'paneled-glass':q.style??'modern'});
   let r;try{r=await call(kind==='windows'?'add_window':'add_door',args);}catch(e){pending.push({key,...q,reason:e.message});continue;}
   const fresh=await call('get_scene');
   const type=kind==='windows'?'window':'door';const node=Object.values(fresh.nodes).find(n=>n.type===type&&!scene.nodes[n.id]&&n.parentId===args.wallId);
   if(!node)throw Error(`Created opening id missing: ${key}`);
   await call('apply_patch',{patches:[{op:'update',id:node.id,data:{name:`${q.tag??'Open passage'} · ${model.levels[q.level].key.toUpperCase()}`,metadata:{...node.metadata,sourceFile:model.source.file,sourceOpening:key,sourceTag:q.tag,positionBasis:'PDF vector trace',widthBasis:q.widthOverride?'Owner-delegated resolution: drawn 3 ft width retains partition clearance':q.tag?'PDF opening schedule':'PDF vector trace',heightBasis:kind==='windows'&&height===96?'Owner override: 8 ft':q.level===2?'PDF high-sill exception':'PDF schedule',pdfDrawnWidthInches:q.pdfDrawnWidth,sourcePositionInches:q.at,operability:kind==='windows'?'Unspecified in PDF; fixed representation only':'Door swing to be checked'}}}]});
   scene=await call('get_scene');added++;console.log(`Added ${key}`);
  }
  fs.writeFileSync(path.join(root,'.pascal/588-pending-openings.json'),JSON.stringify(pending,null,2));
  console.log(JSON.stringify({added,pending}));
 }else throw Error(`Unknown stage ${stage}`);
}finally{await client.close();}
