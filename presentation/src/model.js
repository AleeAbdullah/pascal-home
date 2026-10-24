export const floorNames=['Ground floor','First floor','Second floor','Roof'];
export function inside([x,z],polygon){let result=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;}
export function bounds(polygon){const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]);return {minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};}
export function roomArea(room){const p=room.polygon;return Math.abs(p.reduce((a,v,i)=>{const n=p[(i+1)%p.length];return a+v[0]*n[1]-n[0]*v[1];},0)/2);}
export function shortName(name){return name.replace(/ ·.*/,'').replace('Open kitchen + secondary stair','Kitchen & stair').replace('5′ wide corridor','Hallway');}
export function roomStart(room,nodes){
 const b=bounds(room.polygon),obstacles=Object.values(nodes).filter(n=>n.type==='item'&&n.parentId===room.parentId&&n.source?.manifest?.bounds&&!/rug|cove|pendant|drape|light/i.test(n.name)&&n.position?.[1]<1.8);
 const boxes=obstacles.map(n=>{const m=n.source.manifest.bounds,r=n.rotation?.[1]??0,c=Math.cos(r),s=Math.sin(r);return bounds([[m.min[0],m.min[2]],[m.max[0],m.min[2]],[m.max[0],m.max[2]],[m.min[0],m.max[2]]].map(([x,z])=>[n.position[0]+x*c+z*s,n.position[2]-x*s+z*c]));});
 let best=null,score=-Infinity;
 for(let x=b.minX+.45;x<b.maxX-.4;x+=.28)for(let z=b.minZ+.45;z<b.maxZ-.4;z+=.28){
  if(!inside([x,z],room.polygon)||(room.holes??[]).some(p=>inside([x,z],p)))continue;
  const wall=Math.min(...room.polygon.map((a,i)=>{const e=room.polygon[(i+1)%room.polygon.length],dx=e[0]-a[0],dz=e[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}));
  const clearance=Math.min(wall,...boxes.map(v=>x>v.minX&&x<v.maxX&&z>v.minZ&&z<v.maxZ?-1:Math.hypot(Math.max(v.minX-x,0,x-v.maxX),Math.max(v.minZ-z,0,z-v.maxZ))));
  if(clearance>score){score=clearance;best=[x,z];}
 }
 return best??[(b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2];
}
