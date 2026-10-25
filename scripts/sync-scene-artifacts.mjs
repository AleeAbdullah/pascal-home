#!/usr/bin/env node
// Copy every compiled module a scene export references from the local Pascal
// store (.pascal/data/pascal.db.artifacts) into scenes/artifacts, which the
// presentation serves. Usage: node scripts/sync-scene-artifacts.mjs [scene.json]
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
