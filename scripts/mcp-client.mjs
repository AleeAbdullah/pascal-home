import {Client} from '../node_modules/@modelcontextprotocol/client/dist/index.mjs';
import {StdioClientTransport} from '../node_modules/@modelcontextprotocol/client/dist/stdio.mjs';

export async function connectPascal(name,{version='1',args=['scripts/pascal.mjs','mcp','connect'],cwd}={}){
 const client=new Client({name,version},{capabilities:{}});
 try{await client.connect(new StdioClientTransport({command:process.execPath,args,...(cwd?{cwd}:{})}))}catch(error){try{await client.close()}catch{}throw error}
 return client;
}
export async function callMcpTool(client,name,args,delay){await new Promise(r=>setTimeout(r,delay));const raw=await client.callTool({name,arguments:args});const r=raw.structuredContent??JSON.parse(raw.content.find(x=>x.type==='text').text);if(raw.isError||r.error||r.code)throw Error(name+': '+JSON.stringify(r).slice(0,1200));return r}
