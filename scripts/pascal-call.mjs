#!/usr/bin/env node
// Usage: node scripts/pascal-call.mjs <tool> ['<json args>'] [--scene <id>]
// Generic one-shot Pascal MCP call. Loads the scene first unless --no-load is passed.
import {connectPascal} from './mcp-client.mjs';
const argv=process.argv.slice(2);
const flag=(n)=>{const i=argv.indexOf(n);return i>=0?argv.splice(i,2)[1]:undefined};
const scene=flag('--scene')??'588-m1-interior-v1';
const noLoad=argv.includes('--no-load');if(noLoad)argv.splice(argv.indexOf('--no-load'),1);
const [tool,json='{}']=argv;
const c=await connectPascal('pascal-call');

try{
  if(tool==='tools'){const t=await c.listTools();for(const x of t.tools){console.log('##',x.name);console.log(x.description?.slice(0,400));console.log(JSON.stringify(x.inputSchema).slice(0,1500));console.log()}}else{
  if(!noLoad){await c.callTool({name:'load_scene',arguments:{id:scene}})}
  const raw=await c.callTool({name:tool,arguments:JSON.parse(json)});
  const r=raw.structuredContent??(()=>{try{return JSON.parse(raw.content.find(x=>x.type==='text').text)}catch{return raw.content}})();
  console.log(JSON.stringify(r,null,2));
  if(raw.isError)process.exitCode=1;
}}finally{await c.close()}
