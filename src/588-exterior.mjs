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
// Solid light panel box face (renders p2/p3): white head/foot bands and edges, shallow joints, one up/down wall lamp.
export const screenCode=common+emitHelper+`
const w=p.width,h=p.height,sw=p.screenWidth,sh=p.screenHeight,b=p.footer,head=h-sh-b;
const face=mat('face','#dcdcd8',{roughness:.85}),band=mat('band','#f3f3f0',{roughness:.8}),joint=mat('joint','#b1b1ad',{roughness:.9});
const left=-w/2,cx=left+sw/2;
const frame=part('architectural_bands');box(w,b,.24,0,b/2,0,band,frame);box(w,head,.24,0,h-head/2,0,band,frame);box(w,.025,.26,0,h+.0125,0,band,frame);
const pnl=part('panel_face');pnl.userData.type='panel';box(sw,sh,.22,cx,b+sh/2,0,face,pnl);
for(const x of [left+.03,left+sw-.03])box(.06,sh,.24,x,b+sh/2,0,band,pnl);
const gy=h*.25;for(const s of [1,-1]){box(sw-.12,.012,.004,cx,gy,s*.1112,joint,pnl);if(p.centerJoint>0)box(.012,sh,.004,cx,b+sh/2,s*.1112,joint,pnl);}
const lamp=part('wall_lamp'),ly=b+sh*.66,zf=.11,warm=em('lamp_emissive','#ffe2a8',3),wash=em('lamp_wash','#ffd9a0',1.2);wash.transparent=true;wash.opacity=.2;wash.depthWrite=false;wash.side=T.DoubleSide;
box(.1,.3,.09,cx,ly,zf+.045,metal,lamp);box(.07,.01,.07,cx,ly+.155,zf+.046,warm,lamp);box(.07,.01,.07,cx,ly-.155,zf+.046,warm,lamp);
const fan=new T.Shape();fan.moveTo(-.035,0);fan.lineTo(.035,0);fan.lineTo(.3,.95);fan.lineTo(-.3,.95);fan.closePath();
const up=new T.Mesh(new T.ShapeGeometry(fan),wash);up.position.set(cx,ly+.16,zf+.002);lamp.add(up);
const dn=new T.Mesh(new T.ShapeGeometry(fan),wash);dn.scale.y=-1;dn.position.set(cx,ly-.16,zf+.002);lamp.add(dn);return g;}`;
export const slatGateCode=common+`
const w=p.width,h=p.height;const pivot=part('gate_leaf');pivot.position.x=-w/2;
box(w,.06,.08,w/2,.03,0,metal,pivot);box(w,.06,.08,w/2,h-.03,0,metal,pivot);
for(let x=.04;x<=w-.04;x+=.12)box(.065,h,.045,x,h/2,0,metal,pivot);
box(.08,h,.08,.04,h/2,0,metal,pivot);box(.08,h,.08,w-.04,h/2,0,metal,pivot);
g.animations=[new T.AnimationClip('open',1,[new T.NumberKeyframeTrack(pivot.uuid+'.rotation[y]',[0,1],[0,-Math.PI/2])])];return g;}`;
// Solid black wood-grain flush-panel vehicle gate leaf (render p4). Same hinge/open clip as before.
export const gateCode=common+`
const w=p.width,h=p.height;const pivot=part('gate_leaf');pivot.position.x=-w/2;
const wood=mat('slot_gate_wood','#1b1b1c',{roughness:.55}),inlay=mat('slot_gate_panel','#262627',{roughness:.5}),grain=mat('slot_gate_grain','#363536',{roughness:.6});
box(w,h,.05,w/2,h/2,0,wood,pivot);
const cols=3,rows=2,gap=.035,mx=.08,my=.08,pw=(w-2*mx-(cols-1)*gap)/cols,ph=(h-2*my-(rows-1)*gap)/rows;
for(const s of [1,-1])for(let c=0;c<cols;c++)for(let r=0;r<rows;r++){const x=mx+pw/2+c*(pw+gap),y=my+ph/2+r*(ph+gap);box(pw,ph,.012,x,y,s*.028,inlay,pivot);
 for(let k=1;k<9;k++)box(pw-.03,.004,.003,x,y-ph/2+k*ph/9,s*.0345,grain,pivot);}
g.animations=[new T.AnimationClip('open',1,[new T.NumberKeyframeTrack(pivot.uuid+'.rotation[y]',[0,1],[0,-Math.PI/2])])];return g;}`;
// White masonry gate pier with an emissive box lantern.
export const gatePierCode=common+emitHelper+`
const w=p.width,d=p.depth,h=p.height,lh=p.lanternHeight,lw=p.lanternWidth;
const pm=mat('slot_pier','#efefec',{roughness:.85}),jm=mat('slot_pier_joint','#cfcfca',{roughness:.9}),dark=mat('slot_lantern_frame','#2a2c2b',{roughness:.5,metalness:.5}),glow=em('lantern_emissive','#ffe2a8',3);
const q=part('masonry_pier');box(w,h,d,0,h/2,0,pm,q);for(let y=.3;y<h-.1;y+=.3)box(w+.004,.008,d+.004,0,y,0,jm,q);box(w+.04,.06,d+.04,0,h+.03,0,pm,q);
const l=part('box_lantern'),y0=h+.06;box(lw*.88,.02,lw*.88,0,y0+.01,0,dark,l);box(lw*.7,lh-.05,lw*.7,0,y0+.02+(lh-.05)/2,0,glow,l);
for(const sx of [-1,1])for(const sz of [-1,1])box(.025,lh-.04,.025,sx*lw*.4,y0+.02+(lh-.04)/2,sz*lw*.4,dark,l);box(lw,.03,lw,0,y0+lh-.015,0,dark,l);return g;}`;
// Entrance canopy: timber slat soffit under a white slab and fascia, 7 emissive downlight discs and an emissive LED reveal.
export const entrySoffitCode=common+emitHelper+`
const W=p.width,D=p.depth;
const tm=mat('slot_timber','#85674a',{roughness:.7}),pl=mat('slot_plaster','#eeece6',{roughness:.85}),dl=em('downlight_emissive','#fff0c8',4),ledm=em('led_emissive','#ffd98a',3);
const s=part('slat_soffit');const pitch=.0508,n=Math.floor(W/pitch);
for(let i=0;i<n;i++)box(.0381,.03,D-.0762,-W/2+(i+.5)*(W/n),.019,0,tm,s);
const slab=part('canopy_slab');box(W,.12,D,0,.004+.03+.06,0,pl,slab);box(W,.32,.08,0,.16,D/2-.04,pl,slab);
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
