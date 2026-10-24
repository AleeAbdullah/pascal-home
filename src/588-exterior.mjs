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
export const screenCode=common+`
const w=p.width,h=p.height,sw=p.screenWidth,sh=p.screenHeight,b=p.footer,head=h-sh-b;
const frame=part('architectural_bands');box(w,b,.23,0,b/2,0,metal,frame);box(w,head,.23,0,h-head/2,0,metal,frame);
const lattice=part('diagonal_screen');lattice.userData.type='panel';const left=-w/2,right=left+sw;
for(const slope of [-1,1])for(let intercept=-sw-sh;intercept<sw+sh;intercept+=.43){
 let pts=[];for(const x of [0,sw]){const y=slope*x+intercept;if(y>=0&&y<=sh)pts.push([left+x,b+y,.15]);}for(const y of [0,sh]){const x=(y-intercept)/slope;if(x>0&&x<sw)pts.push([left+x,b+y,.15]);}if(pts.length>=2)beam(pts[0],pts[1],.065,.065,metal,lattice);
}
box(w,.025,.26,0,h+.0125,0,stone,frame);return g;}`;
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
export const gateCode=common+`
const w=p.width,h=p.height;const pivot=part('gate_leaf');pivot.position.x=-w/2;
box(w,.06,.08,w/2,.03,0,metal,pivot);box(w,.06,.08,w/2,h-.03,0,metal,pivot);
for(let x=.04;x<=w-.04;x+=.12)box(.065,h,.045,x,h/2,0,metal,pivot);
box(.08,h,.08,.04,h/2,0,metal,pivot);box(.08,h,.08,w-.04,h/2,0,metal,pivot);
g.animations=[new T.AnimationClip('open',1,[new T.NumberKeyframeTrack(pivot.uuid+'.rotation[y]',[0,1],[0,-Math.PI/2])])];return g;}`;
export const trimCode=common+`
const w=p.width,h=p.height,d=p.depth;const q=part('stone_pier');for(let y=0;y<h;y+=.3)box(w,Math.min(.294,h-y),d,0,y+Math.min(.294,h-y)/2,0,stone,q);
box(w+.04,.03,d+.04,0,h+.015,0,stone,q);return g;}`;
export const rechargeCode=common+`
const r=p.width/2,h=p.height,t=.114;const body=part('circular_recharge_chamber');
const ring=new T.Shape();ring.absarc(0,0,r,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,r-t,0,Math.PI*2,true);ring.holes.push(hole);
const shell=new T.Mesh(new T.ExtrudeGeometry(ring,{depth:h,bevelEnabled:false,curveSegments:32}),stone);shell.rotation.x=-Math.PI/2;body.add(shell);
const grate=part('inspection_grate');for(let x=-r+.03;x<r;x+=.08){const d=2*Math.sqrt(r*r-x*x);box(.025,.035,d,x,h,0,metal,grate);}return g;}`;
export function paramCode(code,params){return 'export const params='+JSON.stringify(Object.fromEntries(Object.entries(params).map(([k,v])=>[k,{default:v,min:0,max:50,step:.001}])) )+';\n'+code;}
