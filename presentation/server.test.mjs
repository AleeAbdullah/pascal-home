import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationServer} from './server.mjs';
test('snapshot is complete; editor routes, writes and file escapes are unavailable',async()=>{
 const server=await createPresentationServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  const graph=await (await fetch(origin+'/scene.json')).json();assert.equal(Object.keys(graph.nodes).length,732);assert.equal(Object.keys(graph.materials).length,26);
  for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await fetch(origin+'/scene.json',{method})).status,405);
  for(const p of ['/api/scenes','/api/scenes/588-m1-interior-v1','/.codex/config.toml','/%2e%2e%2fpackage.json','/api/artifacts/'+'0'.repeat(64)])assert.equal((await fetch(origin+p)).status,404,p);
  const n=Object.values(graph.nodes).find(n=>n.source?.artifact);const asset=await fetch(origin+'/api/artifacts/'+n.source.artifact);assert.equal(asset.status,200);assert.equal(asset.headers.get('content-type'),'model/gltf-binary');
 }finally{await new Promise(r=>server.close(r));}
});

test('room entry points stay within the actual room boundaries and outside openings',async()=>{
 const {readFile}=await import('node:fs/promises');const {inside,roomStart}=await import('./src/model.js');
 const graph=JSON.parse(await readFile(new URL('../scenes/588-m1-interior-v1.json',import.meta.url),'utf8'));
 for(const room of Object.values(graph.nodes).filter(n=>n.type==='zone'&&n.spaceRole==='room'&&!/shaft|looking below/i.test(n.name))){
  const point=roomStart(room,graph.nodes);assert.ok(inside(point,room.polygon),room.name);assert.ok(!(room.holes??[]).some(h=>inside(point,h)),room.name+' hole');
 }
});

test('walk entry stays on the selected floor and is unavailable on an empty roof',async()=>{
 const {entryRoom}=await import('./src/model.js');
 const nodes={lounge:{id:'lounge',type:'zone',spaceRole:'room',parentId:'ground',name:'Lounge'},bed:{id:'bed',type:'zone',spaceRole:'room',parentId:'second',name:'Bedroom'},void:{id:'void',type:'zone',spaceRole:'room',parentId:'second',name:'Looking below'}};
 assert.equal(entryRoom(nodes,null,'second','ground').id,'bed');
 assert.equal(entryRoom(nodes,'lounge','second','ground').id,'bed');
 assert.equal(entryRoom(nodes,null,null,'ground').id,'lounge');
 assert.equal(entryRoom(nodes,null,'roof','ground'),undefined);
});
