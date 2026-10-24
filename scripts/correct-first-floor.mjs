import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';
import {architecturePatches,inch} from '../src/first-floor-blueprint-corrections.mjs';
const c=new Client({name:'first-floor-blueprint-correction',version:'1'},{capabilities:{}}),id='588-m1-interior-v1';
async function call(name,args={}){const raw=await c.callTool({name,arguments:args});const r=raw.structuredContent??JSON.parse(raw.content.find(x=>x.type==='text').text);if(raw.isError||r.error||r.code)throw Error(name+': '+JSON.stringify(r).slice(0,1800));return r;}
function fullGraph(){const r=spawnSync('python3',['-c',"import sqlite3; c=sqlite3.connect('file:.pascal/data/pascal.db?mode=ro',uri=True);print(c.execute('select graph_json from scenes where id=?',('588-m1-interior-v1',)).fetchone()[0])"],{encoding:'utf8',maxBuffer:30e6});if(r.status)throw Error(r.stderr);const g=JSON.parse(r.stdout);if(!g.materials||Object.keys(g.materials).length<26)throw Error('Incomplete material registry');return g;}
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
 const checked=await call('get_scene');fs.writeFileSync('/tmp/pascal-first-review-after.json',JSON.stringify(checked));
 const v=await call('verify_scene');fs.writeFileSync('/tmp/pascal-first-review-verify.json',JSON.stringify(v,null,2));console.log('Verification',JSON.stringify(v).slice(0,300));
 if(process.argv[2]==='save'){
  const st=await call('get_project_status',{id});console.log(JSON.stringify(await call('save_scene',{id,name:st.name,expectedVersion:st.version,saveMode:'checkpoint',includeCurrentScene:true})).slice(0,900));
  fs.writeFileSync('scenes/588-m1-interior-v1.json',JSON.stringify(fullGraph(),null,2)+'\n');
 }
 console.log(JSON.stringify(await call('get_project_status',{id})));
}finally{await c.close()}
