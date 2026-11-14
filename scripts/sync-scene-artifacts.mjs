#!/usr/bin/env node
// Copy every compiled module a scene export references from the local Pascal
// store (.pascal/data/pascal.db.artifacts) into scenes/artifacts, so a clone can import
// the scene with scripts/import-scene.mjs. Usage: node scripts/sync-scene-artifacts.mjs [scene.json]
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export function syncSceneArtifacts(scene=path.join(root,'scenes/588-m1-interior-v1.json')){
  const text=fs.readFileSync(scene,'utf8');
  const hashes=new Set([...text.matchAll(/"(?:artifact|script)": ?"([0-9a-f]{64})"/g)].map(m=>m[1]));
  const store=path.join(root,'.pascal/data/pascal.db.artifacts'),out=path.join(root,'scenes/artifacts');
  fs.mkdirSync(out,{recursive:true});
  let copied=0;const missing=[];
  for(const h of hashes){
    const dest=path.join(out,h);if(fs.existsSync(dest))continue;
    const src=path.join(store,h);if(fs.existsSync(src)){fs.copyFileSync(src,dest);copied++;}else missing.push(h);
  }
  return {referenced:hashes.size,copied,missing};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const r=syncSceneArtifacts(process.argv[2]);
  console.log(`Artifacts: ${r.referenced} referenced, ${r.copied} copied, ${r.missing.length} missing`);
  if(r.missing.length){console.error(r.missing.join('\n'));process.exitCode=1;}
}

export function readSceneGraph(id,dbPath='.pascal/data/pascal.db'){const db=new DatabaseSync(dbPath,{readOnly:true});try{const row=db.prepare('select graph_json from scenes where id = ?').get(id);if(!row)throw Error(`Scene ${id} not found in the local Pascal database`);return JSON.parse(row.graph_json)}finally{db.close()}}

export function saveSceneSnapshot(id,minMaterials,message){const g=readSceneGraph(id);if(!g.materials||Object.keys(g.materials).length<minMaterials)throw Error(message);fs.writeFileSync('scenes/'+id+'.json',JSON.stringify(g,null,2)+'\n');console.log('Artifacts',JSON.stringify(syncSceneArtifacts('scenes/'+id+'.json')));}
