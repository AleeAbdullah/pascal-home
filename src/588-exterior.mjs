// Imperial dimensions from the governing PDF; assumptions remain explicit in scene metadata.
export const sourceUrl='https://lda.gop.pk/downloads/file/09-02-2026-amended-building-regulations-2019-with-amendment.pdf';
const common=`export const mount='floor';
export default function build({params:p,THREE:T}){
const g=new T.Group();const mat=(name,color,extra={})=>new T.MeshStandardMaterial({name,color,roughness:.65,...extra});
const metal=mat('slot_metal','#282c2b',{metalness:.65}),stone=mat('slot_concrete','#cecac0'),glass=mat('glass','#b9d8dd',{transparent:true,opacity:.32,metalness:.1,roughness:.15});
function box(w,h,d,x,y,z,m=stone,parent=g){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;}
function beam(a,b,w,d,m=metal,parent=g){const va=new T.Vector3(...a),vb=new T.Vector3(...b),o=new T.Mesh(new T.BoxGeometry(w,va.distanceTo(vb),d),m);o.position.copy(va.clone().add(vb).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vb.sub(va).normalize());parent.add(o);return o;}
function part(name){const q=new T.Group();q.name='part:'+name;g.add(q);return q;}
`;
export const guardCode=common+`
const w=p.width,h=p.height;const rail=part('glass_guard');rail.userData.type='railing';const n=Math.ceil(w/1.2);
for(let i=0;i<n;i++)box(w/n-.014,h-.12,.014,-w/2+(i+.5)*w/n,h/2,0,glass,rail);
for(let i=0;i<=n;i++)box(.035,h,.035,-w/2+i*w/n,h/2,0,metal,rail);
box(w,.04,.045,0,h-.02,0,metal,rail);box(w,.065,.065,0,.0325,0,metal,rail);return g;}`;
export const tankCode=common+`
const w=p.width,d=p.depth,h=p.clearHeight,t=p.wall,base=p.base,cover=p.cover,s=p.support;
const body=part('tank_shell');box(w+2*t,base,d+2*t,0,s+base/2,0,stone,body);
box(t,h,d+2*t,-(w+t)/2,s+base+h/2,0,stone,body);box(t,h,d+2*t,(w+t)/2,s+base+h/2,0,stone,body);
box(w,h,t,0,s+base+h/2,-(d+t)/2,stone,body);box(w,h,t,0,s+base+h/2,(d+t)/2,stone,body);
const lid=part('removable_cover');box(w+2*t,cover,d+2*t,0,s+base+h+cover/2,0,stone,lid);
box(.48,.035,.48,w/2-.32,s+base+h+cover+.0175,d/2-.32,metal,lid);
if(s>0){const supports=part('supports');for(const x of [-w/2,w/2])box(.23,s,d, x,s/2,0,stone,supports);}
if(p.chambers>1)for(let i=1;i<p.chambers;i++)box(w,h-.15,.114,0,s+base+(h-.15)/2,-d/2+i*d/p.chambers,stone,body);
for(const x of [-w/2,w/2]){const pipe=new T.Mesh(new T.CylinderGeometry(.045,.045,.45,12),metal);pipe.rotation.z=Math.PI/2;pipe.position.set(x+(x<0?-.15:.15),s+base+h-.2,0);body.add(pipe);}
g.animations=[new T.AnimationClip('open',1,[new T.VectorKeyframeTrack(lid.uuid+'.position',[0,1],[0,0,0,0,.8,0])])];return g;}`;
export const trimCode=common+`
const w=p.width,h=p.height,d=p.depth;const q=part('stone_pier');for(let y=0;y<h;y+=.3)box(w,Math.min(.294,h-y),d,0,y+Math.min(.294,h-y)/2,0,stone,q);
box(w+.04,.03,d+.04,0,h+.015,0,stone,q);return g;}`;
export const rechargeCode=common+`
const r=p.width/2,h=p.height,t=.114;const body=part('circular_recharge_chamber');
const ring=new T.Shape();ring.absarc(0,0,r,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,r-t,0,Math.PI*2,true);ring.holes.push(hole);
const shell=new T.Mesh(new T.ExtrudeGeometry(ring,{depth:h,bevelEnabled:false,curveSegments:32}),stone);shell.rotation.x=-Math.PI/2;body.add(shell);
const grate=part('inspection_grate');for(let x=-r+.03;x<r;x+=.08){const d=2*Math.sqrt(r*r-x*x);box(.025,.035,d,x,h,0,metal,grate);}return g;}`;
// ---- Street-front dressing (owner exterior renders). Emissive geometry only: no point/spot lights anywhere. ----
export const emitHelper=`const em=(name,color,i)=>new T.MeshStandardMaterial({name,color,emissive:color,emissiveIntensity:i,roughness:.4});
`;
// Solid light panel box face (renders p2/p3/f-left, pass 2): one uniform panel colour over head, panel and foot, thin joints at 27 % and 87 % from the top,
// optional vertical joint on the cut-out line, one small sconce at 51 % from the top with two faint narrow light streaks (no opaque wash fans).
export const screenCode=common+emitHelper+`
const w=p.width,h=p.height,sw=p.screenWidth,sh=p.screenHeight,b=p.footer,head=h-sh-b,lx=p.lampX>0?p.lampX:w/2;
const face=mat('face','#dedfdd',{roughness:.85}),band=mat('band','#e6e7e5',{roughness:.8}),joint=mat('joint','#b4b5b3',{roughness:.9});
const left=-w/2,cx=left+sw/2;
const frame=part('architectural_bands');box(w,b,.24,0,b/2,0,face,frame);box(w,head,.24,0,h-head/2,0,face,frame);box(w+.01,.025,.25,0,h+.0125,0,band,frame);
const pnl=part('panel_face');pnl.userData.type='panel';box(sw,sh,.22,cx,b+sh/2,0,face,pnl);
for(const s of [1,-1]){box(w-.01,.012,.004,0,h*.73,s*.1212,joint,pnl);box(sw-.01,.012,.004,cx,h*.13,s*.1212,joint,pnl);
 if(p.centerJoint>0&&sw<w-.01){const xj=left+sw;box(.012,b,.004,xj,b/2,s*.1212,joint,pnl);box(.012,head,.004,xj,h-head/2,s*.1212,joint,pnl);}}
const lamp=part('wall_lamp'),ly=h*.49,zf=.12,xl=left+lx,warm=em('lamp_emissive','#ffe2a8',3),streak=em('lamp_streak','#ffe6b8',1.5);streak.transparent=true;streak.opacity=.12;streak.depthWrite=false;
box(.09,.3,.09,xl,ly,zf+.045,metal,lamp);box(.06,.01,.06,xl,ly+.155,zf+.046,warm,lamp);box(.06,.01,.06,xl,ly-.155,zf+.046,warm,lamp);
box(.04,.75,.002,xl,ly+.16+.375,zf+.002,streak,lamp);box(.04,.75,.002,xl,ly-.16-.375,zf+.002,streak,lamp);return g;}`;
export const slatGateCode=common+`
const w=p.width,h=p.height;const pivot=part('gate_leaf');pivot.position.x=-w/2;
box(w,.06,.08,w/2,.03,0,metal,pivot);box(w,.06,.08,w/2,h-.03,0,metal,pivot);
for(let x=.04;x<=w-.04;x+=.12)box(.065,h,.045,x,h/2,0,metal,pivot);
box(.08,h,.08,.04,h/2,0,metal,pivot);box(.08,h,.08,w-.04,h/2,0,metal,pivot);
g.animations=[new T.AnimationClip('open',1,[new T.NumberKeyframeTrack(pivot.uuid+'.rotation[y]',[0,1],[0,-Math.PI/2])])];return g;}`;
// Solid flush-panel gate leaf (render p4, pass 2): rails at 18 % / 82 % of the height, p.cols panels across, optional steel accents.
// p.swing 0 = clip rotates -90 deg, 1 = +90 deg (the architect plan swings both vehicle leaves and the pedestrian leaf outward, over the street).
// p.dark 1 = charcoal pedestrian door instead of black wood grain.
export const gateCode=common+`
const w=p.width,h=p.height,cols=Math.max(1,Math.round(p.cols||3));const pivot=part('gate_leaf');pivot.position.x=-w/2;
const wood=mat('slot_gate_wood',p.dark>0?'#303132':'#1b1b1c',{roughness:.55}),inlay=mat('slot_gate_panel',p.dark>0?'#38393a':'#262627',{roughness:.5}),grain=mat('slot_gate_grain',p.dark>0?'#2a2b2c':'#363536',{roughness:.6});
box(w,h,.05,w/2,h/2,0,wood,pivot);
const gap=.03,mx=.05,pw=(w-2*mx-(cols-1)*gap)/cols,rows=[[.03,.18*h-.015],[.18*h+.015,.82*h-.015],[.82*h+.015,h-.03]];
for(const s of [1,-1])for(let c=0;c<cols;c++)for(const [y0,y1] of rows){const x=mx+pw/2+c*(pw+gap),ph=y1-y0,y=(y0+y1)/2;box(pw,ph,.012,x,y,s*.028,inlay,pivot);
 if(!(p.dark>0))for(let k=1;k<6;k++)box(pw-.03,.003,.003,x,y0+k*ph/6,s*.0345,grain,pivot);}
if(p.accents>0)for(const f of [.55,.75])for(const s of [1,-1])box(.05,h-.1,.016,w*f,h/2,s*.03,metal,pivot);
g.animations=[new T.AnimationClip('open',1,[new T.NumberKeyframeTrack(pivot.uuid+'.rotation[y]',[0,1],[0,p.swing>0?Math.PI/2:-Math.PI/2])])];return g;}`;
// White masonry gate pier with an emissive box lantern of three glowing horizontal bands in a dark frame (render p4).
export const gatePierCode=common+emitHelper+`
const w=p.width,d=p.depth,h=p.height,lh=p.lanternHeight,lw=p.lanternWidth;
const pm=mat('slot_pier','#e6e7e5',{roughness:.85}),jm=mat('slot_pier_joint','#cfd0ce',{roughness:.9}),dark=mat('slot_lantern_frame','#1e1f20',{roughness:.5,metalness:.5}),glow=em('lantern_emissive','#ffe2a8',3);
const q=part('masonry_pier');box(w,h,d,0,h/2,0,pm,q);box(w+.03,.04,d+.03,0,h+.02,0,dark,q);
const l=part('box_lantern'),y0=h+.04,lwx=Math.min(lw,w*.9);box(lwx,lh,lw*.9,0,y0+lh/2,0,dark,l);
for(let i=0;i<3;i++)box(lwx+.004,lh*.12,lw*.9+.004,0,y0+lh*(.2+i*.28),0,glow,l);box(lwx+.02,.02,lw*.9+.02,0,y0+lh+.01,0,dark,l);return g;}`;
// Entrance canopy: timber slat soffit under a white slab and fascia, 7 emissive downlight discs and an emissive LED reveal.
export const entrySoffitCode=common+emitHelper+`
const W=p.width,D=p.depth;
const tm=mat('slot_timber','#85674a',{roughness:.7}),dl=em('downlight_emissive','#fff0c8',4),ledm=em('led_emissive','#ffd98a',3);
const s=part('slat_soffit');const pitch=.0508,n=Math.floor(W/pitch);
for(let i=0;i<n;i++)box(.0381,.03,D-.0762,-W/2+(i+.5)*(W/n),.019,0,tm,s);
const fh=p.fasciaH>0?p.fasciaH:.32,pl2=mat('slot_plaster','#e6e7e5',{roughness:.85});const slab=part('canopy_slab');box(W,.12,D,0,.004+.03+.06,0,pl2,slab);box(W,fh,.18,0,fh/2,D/2-.09,pl2,slab);
if(p.fasciaH>0){box(W,.2,D,0,fh-.1,0,pl2,slab);box(.02,fh-.12,D-.18,-W/2+.01,.12+(fh-.12)/2,-.09,pl2,slab);box(.02,fh-.12,D-.18,W/2-.01,.12+(fh-.12)/2,-.09,pl2,slab);}
const lights=part('downlights');lights.userData.type='light';
for(let i=0;i<7;i++){const dsc=new T.Mesh(new T.CylinderGeometry(.05,.05,.004,20),dl);dsc.position.set((i-3)*.5,.002,-D*.11);lights.add(dsc);}
const led=part('led_reveal');box(W-.2,.004,.012,0,.002,-D*.3,ledm,led);return g;}`;
export const ledReveal=common+emitHelper+`
const H=p.height,S=p.span;const ledm=em('led_emissive','#ffd98a',3);const q=part('pier_led_reveal');
for(const s of [-1,1])box(.012,H,.012,s*S/2,H/2,0,ledm,q);return g;}`;
// Dark metal cladding panel (optional vertical flutes, optional rectangular window hole). Origin at the back face centre-bottom.
export const claddingCode=common+`
const w=p.width,h=p.height,d=p.depth,pitch=p.pitch,hx=p.holeX,hy=p.holeY,hw=p.holeW,hh=p.holeH;
const dark=mat('slot_cladding','#3a3b3d',{roughness:.5,metalness:.55});const q=part('cladding_panel');q.userData.type='panel';
const rects=hw>0&&hh>0?[[0,0,w,hy],[0,hy+hh,w,h-hy-hh],[0,hy,hx,hh],[hx+hw,hy,w-hx-hw,hh]]:[[0,0,w,h]];
const bd=pitch>0?d*.55:d;for(const r of rects){if(r[2]<.002||r[3]<.002)continue;box(r[2],r[3],bd,r[0]+r[2]/2-w/2,r[1]+r[3]/2,bd/2,dark,q);
 if(pitch>0)for(let x=r[0]+pitch/2;x<r[0]+r[2]-.01;x+=pitch)box(.035,r[3],d*.45,x-w/2,r[1]+r[3]/2,d*.775,dark,q);}
return g;}`;
// Dark steel pergola grid with an optional planter.
export const pergolaCode=common+`
const W=p.width,D=p.depth,B=p.bar;const q=part('pergola_grid');const nx=Math.round(W/.35),nz=Math.round(D/.35);
for(let i=0;i<=nx;i++)box(.05,B,D,-W/2+i*W/nx,B/2,0,metal,q);
for(let j=0;j<=nz;j++)box(W,B*.7,.05,0,B*1.35,-D/2+j*D/nz,metal,q);return g;}`;
export const planterCode=common+`
const W=p.width,D=p.depth,H=p.height;const soil=mat('slot_soil','#3b2f26',{roughness:1}),leaf=mat('slot_foliage','#4c6b3b',{roughness:.9}),pot=mat('slot_planter','#e9e7e1',{roughness:.8});
const q=part('planter');box(W,H,D,0,H/2,0,pot,q);box(W-.06,.02,D-.06,0,H+.005,0,soil,q);
const n=Math.round(W/.4);for(let i=0;i<n;i++){const s=new T.Mesh(new T.SphereGeometry(.17,10,8),leaf);s.position.set(-W/2+(i+.5)*W/n,H+.16,0);q.add(s);}return g;}`;
export function paramCode(code,params){return 'export const params='+JSON.stringify(Object.fromEntries(Object.entries(params).map(([k,v])=>[k,{default:v,min:0,max:50,step:.001}])) )+';\n'+code;}

// ======================= Pass 2 (owner renders, 2026-10-26): baked exterior geometry =======================
// Every object below is generated from plan-inch specs (frame: rear-left inside face of GF walls, +X east, +Z street, Y up from the host level floor),
// centred on its bounding box (x/z centre, y minimum) and placed there, because Pascal mounts floor objects by their bottom-centre.
// Emissive materials only (no lights). Material keys map to paintable slots: role = name without 'slot_'.
export const MAT={
 white:{n:'slot_white',c:'#e6e7e5',r:.85}, face:{n:'slot_face',c:'#dedfdd',r:.85}, charcoal:{n:'slot_charcoal',c:'#303132',r:.5,mt:.5},
 black:{n:'slot_black',c:'#1e1f20',r:.5,mt:.4}, stone:{n:'slot_black_stone',c:'#141414',r:.2}, timber:{n:'slot_timber',c:'#9a7752',r:.7},
 pave:{n:'slot_paving',c:'#d0d1cd',r:.8}, lawn:{n:'slot_lawn',c:'#3f5b2a',r:1}, leaf:{n:'slot_foliage',c:'#3e5a33',r:.9}, leaf2:{n:'slot_foliage_light',c:'#4c6b3b',r:.9},
 autumn:{n:'slot_foliage_autumn',c:'#7d6a3a',r:.9}, bark:{n:'slot_bark',c:'#4f3f31',r:.95}, palm:{n:'slot_palm_trunk',c:'#7b6a55',r:.95}, frond:{n:'slot_palm_frond',c:'#4a6534',r:.9},
 soil:{n:'slot_soil',c:'#3b2f26',r:1}, water:{n:'slot_water',c:'#6f8794',r:.1,o:.8}, solar:{n:'slot_solar_cell',c:'#1c2836',r:.25,mt:.3}, alu:{n:'slot_aluminium',c:'#b8bcc0',r:.4,mt:.6},
 led:{n:'led_emissive',c:'#ffd98a',e:3}, lamp:{n:'lamp_emissive',c:'#ffe2a8',e:3}, streak:{n:'lamp_streak',c:'#ffe6b8',e:1.5,o:.12},
 carWhite:{n:'slot_car_white',c:'#e9e9e7',r:.3,mt:.4}, carGrey:{n:'slot_car_grey',c:'#6d7073',r:.3,mt:.5}, carBlack:{n:'slot_car_black',c:'#1f2022',r:.3,mt:.5},
 carGlass:{n:'slot_car_glass',c:'#2a3138',r:.1,mt:.2}, tyre:{n:'slot_tyre',c:'#151515',r:.9}, tabletop:{n:'slot_tabletop',c:'#efefec',r:.4}
};
export const P2_FINISH_NAMES={white:'Exterior plaster · cool white',face:'Front box panel · light grey',charcoal:'Facade charcoal cladding',black:'Exterior black steel',stone:'Black polished stone',
 timber:'Exterior timber slats',pave:'Porch paving · pale concrete',lawn:'Lawn turf',leaf:'Foliage dark',leaf2:'Foliage light',autumn:'Foliage autumn',bark:'Tree bark',palm:'Palm trunk',frond:'Palm frond',
 soil:'Planter soil',water:'Water feature',solar:'Solar cell',alu:'Solar frame aluminium',carWhite:'Car white',carGrey:'Car grey',carBlack:'Car black',carGlass:'Car glass',tyre:'Tyre',tabletop:'Bistro table top'};
const IN=.0254,r4=v=>Math.round(v*1e4)/1e4;
// Part constructors (inches). Box by extents; cylinder by bottom radius, top radius, height, base point; sphere by radius, centre, scale.
export const BX=(x0,x1,y0,y1,z0,z1,m,g,r)=>({k:'b',v:[x1-x0,y1-y0,z1-z0,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],m,g,r});
export const BC=(w,h,d,x,y,z,m,g,r)=>({k:'b',v:[w,h,d,x,y,z],m,g,r});
export const CYL=(rb,rt,h,x,y0,z,m,g,r,seg)=>({k:'c',v:[rt,rb,h,x,y0+h/2,z],m,g,r,seg});
export const SPH=(rad,x,y,z,m,g,sx=1,sy=1,sz=1)=>({k:'s',v:[rad,x,y,z],sc:[sx,sy,sz],m,g});
export function bake(parts){
 // Exact bounds: rotate the 8 corners of each part's local box (three.js Euler XYZ: v' = Rx·Ry·Rz·v), because Pascal mounts by the real bounding box.
 let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
 const rot=(r,[x,y,z])=>{const [a,b,c]=r;let X=x*Math.cos(c)-y*Math.sin(c),Y=x*Math.sin(c)+y*Math.cos(c),Z=z;
  let X2=X*Math.cos(b)+Z*Math.sin(b),Z2=-X*Math.sin(b)+Z*Math.cos(b);X=X2;Z=Z2;const Y2=Y*Math.cos(a)-Z*Math.sin(a);Z=Y*Math.sin(a)+Z*Math.cos(a);return [X,Y2,Z];};
 for(const p of parts){const v=p.v;let c,e;
  if(p.k==='b'){c=v.slice(3);e=[v[0]/2,v[1]/2,v[2]/2];}
  else if(p.k==='c'){c=v.slice(3);const rr=Math.max(v[0],v[1]);e=[rr,v[2]/2,rr];}
  else {c=v.slice(1);e=p.sc.map(s=>v[0]*s);}
  for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){let q=[sx*e[0],sy*e[1],sz*e[2]];if(p.r&&p.k!=='s')q=rot(p.r,q);
   for(let i=0;i<3;i++){mn[i]=Math.min(mn[i],c[i]+q[i]);mx[i]=Math.max(mx[i],c[i]+q[i]);}}}
 const o=[(mn[0]+mx[0])/2,mn[1],(mn[2]+mx[2])/2];
 const local=parts.map(p=>{const v=p.v.slice();const ci=p.k==='s'?1:3;for(let i=0;i<3;i++)v[ci+i]=v[ci+i]-o[i];
  return {k:p.k,v:v.map((x,i)=>p.k==='s'?r4(x*IN):(p.k==='c'&&i<3?r4(x*IN):r4(x*IN))),m:p.m,...(p.g?{g:p.g}:{}),...(p.r?{r:p.r.map(r4)}:{}),...(p.sc?{sc:p.sc.map(r4)}:{}),...(p.seg?{seg:p.seg}:{})};});
 const used={};for(const p of parts){if(!MAT[p.m])throw Error('Unknown material '+p.m);used[p.m]=MAT[p.m];}
 const code=`export const mount='floor';
export default function build({THREE:T}){const g=new T.Group();const M={};const md=${JSON.stringify(used)};
for(const k in md){const v=md[k];const o={name:v.n,color:v.c,roughness:v.r??.7,metalness:v.mt??0};if(v.e){o.emissive=v.c;o.emissiveIntensity=v.e;}if(v.o!=null){o.transparent=true;o.opacity=v.o;o.depthWrite=false;}M[k]=new T.MeshStandardMaterial(o);}
const G={};const grp=n=>{if(!G[n]){const q=new T.Group();q.name='part:'+n;g.add(q);G[n]=q;}return G[n];};
const P=${JSON.stringify(local)};
for(const p of P){const v=p.v;let geo;if(p.k==='b')geo=new T.BoxGeometry(v[0],v[1],v[2]);else if(p.k==='c')geo=new T.CylinderGeometry(v[0],v[1],v[2],p.seg||14);else geo=new T.SphereGeometry(v[0],12,9);
const o=new T.Mesh(geo,M[p.m]);if(p.k==='s')o.position.set(v[1],v[2],v[3]);else o.position.set(v[3],v[4],v[5]);if(p.sc)o.scale.set(p.sc[0],p.sc[1],p.sc[2]);if(p.r)o.rotation.set(p.r[0],p.r[1],p.r[2]);grp(p.g||'body').add(o);}
return g;}`;
 return {code,pos:o,slots:Object.keys(used).filter(k=>!MAT[k].e)};
}
// Deterministic jitter.
const rnd=s=>{let x=Math.sin(s*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
// Deciduous tree: trunk + clustered crown spheres. h = total height, c = canopy diameter (inches).
export function treeParts(x,z,base,h,c,seed,mix=0){const parts=[],tr=Math.max(2.5,c*.045),th=h-c*.75;
 parts.push(CYL(tr*1.3,tr*.8,th,x,base,z,'bark','trunk'));
 const n=7,cy=base+th+c*.32;for(let i=0;i<n;i++){const a=i/n*Math.PI*2+rnd(seed+i),rr=c*.22*(i?1:0),rad=c*(.26+.08*rnd(seed*3+i));
  parts.push(SPH(rad,x+Math.cos(a)*rr,cy+(i?c*.1*(rnd(seed*7+i)-.3):c*.12),z+Math.sin(a)*rr,mix&&i%2?'autumn':(i%3?'leaf':'leaf2'),'crown',1,.85,1));}
 for(let i=0;i<3;i++){const a=i*2.1+seed;parts.push(CYL(tr*.5,tr*.25,c*.45,x+Math.cos(a)*c*.08,base+th-c*.05,z+Math.sin(a)*c*.08,'bark','branches',[Math.sin(a)*.5,0,Math.cos(a)*.5]));}
 return parts;}
// Slim multi-stem tree (void tree, roof planters): narrow, tall crown.
export function slimTreeParts(x,z,base,h,c,seed){const parts=[];const th=h*.45;
 for(let i=0;i<3;i++){const a=i*2.09+seed;parts.push(CYL(1.6,1,th,x+Math.cos(a)*3,base,z+Math.sin(a)*3,'bark','stems',[Math.sin(a)*.08,0,Math.cos(a)*.08]));}
 for(let i=0;i<6;i++){const a=i*1.05+seed;parts.push(SPH(c*(.26+.06*rnd(seed+i)),x+Math.cos(a)*c*.14,base+th+(h-th)*(.25+.12*i),z+Math.sin(a)*c*.14,i%2?'leaf':'leaf2','crown',1,1.25,1));}
 return parts;}
// Date palm: leaning segmented trunk + 16 drooping fronds.
export function palmParts(x,z,base,h,seed){const parts=[];const segs=8,sh=(h-24)/segs;let px=x,pz=z;
 for(let i=0;i<segs;i++){const lean=.03;parts.push(CYL(9-i*.45,8.6-i*.45,sh+1,px,base+i*sh,pz,'palm','trunk',[0,0,-lean]));px+=Math.sin(lean)*sh;}
 const top=base+segs*sh;parts.push(SPH(10,px,top+3,pz,'palm','crown_base',1,1.2,1));
 for(let i=0;i<26;i++){const az=i/26*Math.PI*2+rnd(seed+i)*.25,dr=(i%3===0?.15:i%3===1?.5:.85)+rnd(seed*5+i)*.15,L=95+rnd(seed+i*3)*30;
  for(const [w,off] of [[7,0],[3,1.5]])parts.push(BC(L,.8,w,px+Math.cos(az)*L/2*Math.cos(dr),top+6+off-L/2*Math.sin(dr),pz-Math.sin(az)*L/2*Math.cos(dr),'frond','fronds',[0,az,-dr]));}
 return parts;}
// Low-poly car, long axis along Z (front toward +Z).
export function carParts(x,z,base,color){const p=[],W=70,L=180;
 p.push(BX(x-W/2,x+W/2,base+10,base+34,z-L/2,z+L/2,color,'body'));p.push(BX(x-W/2+5,x+W/2-5,base+34,base+54,z-L/2+40,z+L/2-55,'carGlass','cabin'));
 p.push(BX(x-W/2+6,x+W/2-6,base+53.5,base+56,z-L/2+46,z+L/2-60,color,'roof'));
 for(const sx of [-1,1])for(const sz of [-1,1])p.push(CYL(13,13,8,x+sx*(W/2-4),base+13-4,z+sz*58,'tyre','wheels',[0,0,Math.PI/2],16));
 return p;}
