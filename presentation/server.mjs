import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const here = path.dirname(fileURLToPath(import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.hdr':'application/octet-stream','.wasm':'application/wasm'};
export async function createPresentationServer({ root=here }={}) {
  // Read once: this presentation cannot write to or follow the working editor.
  const graph = JSON.parse(await fs.readFile(path.join(root,'../scenes/588-m1-interior-v1.json'),'utf8'));
  const allowed = new Set();
  function scan(value) {
    if (typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)) allowed.add(value);
    else if (Array.isArray(value)) value.forEach(scan);
    else if (value && typeof value==='object') Object.values(value).forEach(scan);
  }
  scan(graph);
  const payload = JSON.stringify(graph);
  const compressed = new Map();
  const revision = createHash('sha256').update(payload).digest('hex').slice(0,12);
  return http.createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Read-only presentation');return;}
    try {
      const url=new URL(req.url,'http://localhost');
      const pathname=decodeURIComponent(url.pathname);
      let bytes, type, cache='no-cache';
      if(pathname==='/mobile-preview' && ['localhost:55880','127.0.0.1:55880'].includes(req.headers.host)){bytes='<!doctype html><meta name=viewport content="width=device-width"><title>Phone preview</title><body style="margin:0;background:#c9c9c0;display:grid;place-items:center;min-height:100vh"><iframe title="Phone presentation" src="/" style="width:390px;height:844px;border:0;border-radius:24px;box-shadow:0 15px 70px #0003"></iframe></body>';type=types['.html'];}
      else if (pathname==='/scene.json') {bytes=payload;type=types['.json'];}
      else if(pathname==='/health') {bytes=JSON.stringify({readOnly:true,revision,nodes:Object.keys(graph.nodes).length});type=types['.json'];}
      else if(/^\/api\/artifacts\/[a-f0-9]{64}$/.test(pathname)) {
        const hash=pathname.split('/').pop();
        if(!allowed.has(hash)) throw Object.assign(Error('Not found'),{code:'ENOENT'});
        bytes=await fs.readFile(path.join(root,'../scenes/artifacts',hash));
        type=bytes.subarray(0,4).toString()==='glTF'?'model/gltf-binary':'application/octet-stream';
        cache='public, max-age=31536000, immutable';
      } else {
        if(pathname.startsWith('/api/') || pathname.includes('..') || pathname.includes('\\') || /(?:^|\/)\./.test(pathname)) throw Object.assign(Error('Not found'),{code:'ENOENT'});
        const relative=pathname==='/'?'index.html':pathname.slice(1);
        const file=path.resolve(root,'dist',relative);
        if(!file.startsWith(path.resolve(root,'dist')+path.sep)) throw Object.assign(Error('Not found'),{code:'ENOENT'});
        bytes=await fs.readFile(file);type=types[path.extname(file)]??'application/octet-stream';
        if(pathname.startsWith('/assets/'))cache='public, max-age=31536000, immutable';
      }
      if(Buffer.byteLength(bytes)>1024 && /\bgzip\b/.test(req.headers['accept-encoding']??'')){
        const key=pathname+':'+createHash('sha256').update(bytes).digest('hex');
        if(!compressed.has(key))compressed.set(key,gzipSync(bytes,{level:4}));
        bytes=compressed.get(key);res.setHeader('Content-Encoding','gzip');res.setHeader('Vary','Accept-Encoding');
      }
      res.writeHead(200,{'Content-Type':type,'Cache-Control':cache,'Content-Length':Buffer.byteLength(bytes)});
      res.end(req.method==='HEAD'?undefined:bytes);
    } catch(e) {res.writeHead(e.code==='ENOENT'||e.code==='EISDIR'||e instanceof URIError?404:500);res.end('Unavailable');}
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const server=await createPresentationServer();
  server.listen(Number(process.env.PRESENTATION_PORT??55880),'127.0.0.1',()=>console.log('Read-only home presentation: http://localhost:'+server.address().port));
}
