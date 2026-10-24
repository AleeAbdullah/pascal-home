import React,{useState,useEffect,useRef,Component} from 'react';
import {createRoot} from 'react-dom/client';
import {loadPlugin,configureArtifactStore,useScene,materializeRegisteredNodeDefaults,initSpatialGridSync,getLevelElevations,sceneRegistry,acquireSceneReadOnlyLease} from '@pascal-app/core';
import {builtinPlugin} from '@pascal-app/nodes';
import {Viewer,useViewer,SceneEnvironment,InteractiveSystem} from '@pascal-app/viewer';
import {CameraControls} from '@react-three/drei';
import {useFrame,useThree} from '@react-three/fiber';
import {Vector3,Raycaster} from 'three';
import {ArrowUpRight,ArrowLeft,ArrowRight,ArrowUp,ArrowDown,RotateCcw,Layers,Footprints,Compass,Maximize,Minimize,Map as MapIcon,X,Play,Sun,Home,Menu} from 'lucide-react';
import {bounds,roomArea,roomStart,shortName,floorNames,entryRoom} from './model';
import './style.css';

configureArtifactStore({url:h=>'/api/artifacts/'+h,text:async h=>(await fetch('/api/artifacts/'+h)).text(),put:async()=>{throw Error('Presentation is read-only');}});

const setup=Promise.all([loadPlugin(builtinPlugin),fetch('/scene.json').then(r=>{if(!r.ok)throw Error('Scene could not be loaded');return r.json();})]).then(([,g])=>{
 useScene.getState().setScene(materializeRegisteredNodeDefaults(g.nodes),g.rootNodeIds,{materials:g.materials,collections:g.collections,installedPlugins:g.installedPlugins});
 initSpatialGridSync();acquireSceneReadOnlyLease();
 const v=useViewer.getState();v.setProjectId?.('588-presentation-899');v.setSelection({buildingId:Object.values(g.nodes).find(n=>n.type==='building').id,levelId:null,zoneId:null,selectedIds:[]});v.setLevelMode('stacked');v.setWallMode('up');v.setCameraMode('perspective');v.setSceneTheme('studio');
 return g;
});
const movement={forward:0,side:0,keys:new Set()};
function CameraRig({command,walk,ready,quality,onPosition}){
 const ref=useRef();const {camera,gl,size,setDpr}=useThree();const tick=useRef(0);
 const ray=useRef(new Raycaster()),direction=useRef(new Vector3()),target=useRef(new Vector3());
 useEffect(()=>{camera.fov=walk?70:50;camera.near=walk?.05:.1;camera.updateProjectionMatrix();},[camera,walk]);
 useEffect(()=>{setDpr(quality?Math.min(window.devicePixelRatio,1.5):1);},[quality,setDpr]);
 useEffect(()=>{
  if(!ref.current||!ready||!command)return;
  if(walk){gl.domElement.tabIndex=0;gl.domElement.focus({preventScroll:true});}
  const factor=walk?1:Math.max(1,.85/(size.width/size.height));const adjusted=command.position.map((p,i)=>command.target[i]+(p-command.target[i])*factor);
  ref.current.setLookAt(...adjusted,...command.target,!walk&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
 },[command,ready,walk,size.width,size.height]);
 useEffect(()=>{const down=e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();movement.keys.add(e.code);}};const up=e=>movement.keys.delete(e.code);const clear=()=>{movement.keys.clear();movement.forward=movement.side=0;};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);clear();};},[]);
 useFrame((_,dt)=>{
  if(!walk||!ref.current)return;
  const k=movement.keys,f=movement.forward+Number(k.has('KeyW')||k.has('ArrowUp'))-Number(k.has('KeyS')||k.has('ArrowDown')),s=movement.side+Number(k.has('KeyD')||k.has('ArrowRight'))-Number(k.has('KeyA')||k.has('ArrowLeft'));
  if(f||s){
   camera.getWorldDirection(direction.current);direction.current.y=0;direction.current.normalize();
   const dx=(direction.current.x*f-direction.current.z*s)*Math.min(dt,.04)*1.65,dz=(direction.current.z*f+direction.current.x*s)*Math.min(dt,.04)*1.65;
   const distance=Math.hypot(dx,dz),v=new Vector3(dx,0,dz).normalize();
   const meshes=[],floors=[];const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
   for(const [id,obj]of sceneRegistry.nodes){const n=useScene.getState().nodes[id];if(!n||!visible(obj))continue;if(['wall','door','window','item'].includes(n.type))obj.traverse(o=>{if(o.isMesh&&visible(o)&&!o.userData?.raycastOnly)meshes.push(o);});if(n.type==='slab')obj.traverse(o=>{if(o.isMesh&&visible(o))floors.push(o);});}
   let blocked=false;
   for(const offset of [0,-.7]){ray.current.set(new Vector3(camera.position.x,camera.position.y+offset,camera.position.z),v);ray.current.near=.02;ray.current.far=distance+.22;if(ray.current.intersectObjects(meshes,false).length){blocked=true;break;}}
   ray.current.set(new Vector3(camera.position.x+dx,camera.position.y+.3,camera.position.z+dz),new Vector3(0,-1,0));ray.current.near=.1;ray.current.far=2.15;const ground=ray.current.intersectObjects(floors,false)[0];
   if(!blocked&&ground){ref.current.getTarget(target.current);const y=ground.point.y+1.62;ref.current.setLookAt(camera.position.x+dx,y,camera.position.z+dz,target.current.x+dx,target.current.y+(y-camera.position.y),target.current.z+dz,false);}
  }
  if(++tick.current%12===0)onPosition([camera.position.x,camera.position.z]);
 });
 return <CameraControls ref={ref} makeDefault minDistance={walk?.01:2} maxDistance={walk?.01:120} minPolarAngle={walk?.18:.05} maxPolarAngle={walk?Math.PI-.18:Math.PI/2-.02} azimuthRotateSpeed={walk?.45:1} polarRotateSpeed={walk?.4:1} smoothTime={.28} draggingSmoothTime={.1} mouseButtons={walk?{left:1,middle:0,right:1,wheel:0}:undefined} touches={walk?{one:32,two:0,three:0}:undefined}/>;
}
class Boundary extends Component{state={error:null};static getDerivedStateFromError(error){return {error};}componentDidCatch(error){this.props.onError(error);}render(){return this.state.error?<div className="error-state"><h2>3D could not start.</h2><p>Try a current browser with hardware acceleration. Your saved model is unchanged.</p><button onClick={()=>location.reload()}>Try again</button><details><summary>Details</summary>{this.state.error.message}</details></div>:this.props.children;}}
function App(){
 const [graph,setGraph]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[ready,setReady]=useState(false),[floor,setFloor]=useState(null),[room,setRoom]=useState(null),[walk,setWalk]=useState(false),[menu,setMenu]=useState(false),[plan,setPlan]=useState(false),[cut,setCut]=useState(false),[quality,setQuality]=useState(()=>window.innerWidth>760),[tour,setTour]=useState(-1),[position,setPosition]=useState(null),[fullscreen,setFullscreen]=useState(false),[command,setCommand]=useState({position:[43,33,46],target:[12,4,10]});
 const failures=useViewer(s=>s.itemLoadFailures);
 useEffect(()=>{setup.then(setGraph).catch(e=>setError(e.message));},[]);
 const nodes=graph?.nodes??{},levels=Object.values(nodes).filter(n=>n.type==='level').sort((a,b)=>a.level-b.level),elevations=graph?getLevelElevations(nodes):new Map();
 const rooms=Object.values(nodes).filter(n=>n.type==='zone'&&n.parentId===floor&&n.spaceRole==='room'&&!/shaft|looking below/i.test(n.name));
 const floorY=id=>(elevations.get(id)?.baseY??0)+(Object.values(nodes).find(n=>n.type==='building')?.position?.[1]??0);
 function changeFloor(id){setWalk(false);setRoom(null);setFloor(id);setPosition(null);setPlan(false);setTour(-1);const v=useViewer.getState();v.setWalkthroughMode(false);v.setSelection({levelId:id,zoneId:null,selectedIds:[]});v.setLevelMode(id?'solo':'stacked');v.setWallMode(id?'cutaway':'up');setCut(!!id);setCommand(id?{position:[34,floorY(id)+31,37],target:[12,floorY(id)+1,9]}:{position:[43,33,46],target:[12,4,10]});}
 function showRoom(r,inside=false){if(!r)return;setRoom(r.id);setFloor(r.parentId);setMenu(false);const v=useViewer.getState();v.setSelection({levelId:r.parentId,zoneId:null,selectedIds:[]});v.setLevelMode('solo');v.setWallMode(inside?'up':'cutaway');v.setWalkthroughMode(inside);setWalk(inside);setCut(!inside);const b=bounds(r.polygon),cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2,y=floorY(r.parentId);if(inside){const [x,z]=roomStart(r,nodes);const slab=nodes[r.floor?.sourceSlabId];const eye=y+(slab?.elevation??0)+1.62;let dx=cx-x,dz=cz-z;if(Math.hypot(dx,dz)<.4){dx=-1;dz=-.4;}const norm=Math.hypot(dx,dz);setCommand({position:[x,eye,z],target:[x+dx/norm*.01,eye,z+dz/norm*.01]});}else{const d=Math.max(b.maxX-b.minX,b.maxZ-b.minZ)*1.1+2;setCommand({position:[cx+d,y+d*1.3,cz+d],target:[cx,y+1,cz]});}}
 const walkEntry=entryRoom(nodes,room,floor,levels[0]?.id);
 function enter(){setTour(-1);showRoom(walkEntry,true);}
 const stops=Object.values(nodes).filter(n=>n.type==='zone'&&((n.parentId===levels[0]?.id&&/^(Lounge \+ dining|Open kitchen$|Drawing room$|Master bedroom$)/.test(n.name))||(n.parentId===levels[1]?.id&&/^(Lounge$|Front master bedroom$)/.test(n.name))));
 function tourStop(i){const index=(i+stops.length)%stops.length;setPlan(false);setTour(index);showRoom(stops[index],true);}
 useEffect(()=>{const esc=e=>{if(e.key==='Escape'){if(walk){setWalk(false);useViewer.getState().setWalkthroughMode(false);if(nodes[room])showRoom(nodes[room]);}setMenu(false);setTour(-1);}};window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc);},[walk,room,graph]);
 useEffect(()=>{const f=()=>setFullscreen(!!document.fullscreenElement);document.addEventListener('fullscreenchange',f);return()=>document.removeEventListener('fullscreenchange',f);},[]);
 const floorLabel=floor?floorNames[nodes[floor]?.level]:'The whole house';
 return <main className={walk?'app walking':'app'}>
  <div className="viewport" style={{opacity:ready?1:0}}><Boundary onError={e=>setError(e.message)}>{graph&&<Viewer selectionManager="custom" renderContext="viewer" useBvh={false} defaultRender={{shading:'rendered'}} maxFps={quality?45:30} disablePostFx={!quality} sceneReadyKey="checkpoint-899" sceneReadyMaxWaitMs={120000} onSceneReadyChange={setReady} onRenderError={e=>setError(e.message)}><SceneEnvironment/><InteractiveSystem/><CameraRig command={command} walk={walk} ready={ready} quality={quality} onPosition={setPosition}/></Viewer>}</Boundary></div>
  <header><a href="/" className="brand" aria-label="588 home"><span className="brand-number">588<span>·</span></span><span className="brand-caption">LAKE CITY<br/>A HOME TO EXPLORE</span></a><div className="header-right"><span className="edition">INTERIOR V1 <i/> PRIVATE RESIDENCE</span>{document.fullscreenEnabled&&<button className="icon-button" aria-label={fullscreen?'Exit full screen':'Full screen'} onClick={async()=>{try{setNotice('');if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{setNotice('Full screen is unavailable in this browser session. You can keep exploring here.');}}}>{fullscreen?<Minimize size={18}/>:<Maximize size={18}/>}</button>}</div></header>
  {!ready&&!error&&<div className="loading" role="status"><span className="spinner"/><span>{graph?'Preparing the house':'Opening Interior V1'}<small>Geometry, furniture & materials</small></span></div>}
  {error&&<div className="loading error" role="alert">{error}<button onClick={()=>location.reload()}>Retry</button></div>}
  {notice&&<div className="asset-warning" role="status">{notice} <button onClick={()=>setNotice('')}>Dismiss</button></div>}
  {Object.keys(failures).length>0&&<div className="asset-warning" role="alert">Some furniture could not load. <button onClick={()=>location.reload()}>Reload</button></div>}
  {!walk&&<section className="intro"><div className="eyebrow">A STUDY IN WARMTH & SPACE</div><h1>{room?shortName(nodes[room].name):floor?floorLabel:<>Make yourself<br/><em>at home.</em></>}</h1><p>{room?'An intimate view of the materials, proportions and everyday details.':floor?'Explore the rooms, then step inside to experience them at eye level.':'Stone, walnut and soft light. Explore the house from the outside in.'}</p><button className="primary" disabled={!ready||!walkEntry} onClick={enter}>Walk inside <ArrowUpRight size={18}/></button></section>}
  <aside className={'navigator '+(menu?'is-open':'')} aria-label="Explore floors and rooms"><div className="nav-heading"><span>EXPLORE THE HOUSE</span><button className="mobile-only icon-button" aria-label="Close room menu" onClick={()=>setMenu(false)}><X size={18}/></button></div><div className="floors"><button className={!floor?'active':''} onClick={()=>changeFloor(null)}><Home size={16}/><span>Exterior</span><span className="floor-number">↗</span></button>{levels.map(l=><button key={l.id} className={floor===l.id?'active':''} onClick={()=>changeFloor(l.id)}><Layers size={16}/><span>{floorNames[l.level]}</span><span className="floor-number">0{l.level}</span></button>)}</div>{floor&&<div className="room-list"><div className="room-heading">ROOMS <span>{rooms.length}</span></div>{rooms.map(r=><button key={r.id} className={room===r.id?'selected':''} onClick={()=>{setTour(-1);showRoom(r,walk);}}><span>{shortName(r.name)}</span><small>{Math.round(roomArea(r))} m²</small></button>)}</div>}<div className="nav-foot">THE SAVED DESIGN · VIEW ONLY</div></aside>
  {walk&&<div className="walk-heading"><div className="eyebrow">{floorLabel} / EYE LEVEL</div><h2>{shortName(nodes[room]?.name??'Walkthrough')}</h2><p>Drag to look · arrows or WASD to move</p><button className="text-button" onClick={()=>{setTour(-1);showRoom(nodes[room]);}}><ArrowLeft size={15}/> Back to 3D overview</button></div>}
  {plan&&floor&&<div className="minimap"><div className="map-title"><span>{floorLabel}</span><button className="icon-button" aria-label="Close floor plan" onClick={()=>setPlan(false)}><X size={14}/></button></div><svg viewBox="-1 -1 27 23" role="group" aria-label="Interactive floor plan">{rooms.map(r=><polygon key={r.id} tabIndex={0} role="button" aria-label={shortName(r.name)} points={r.polygon.map(p=>p.join(',')).join(' ')} className={room===r.id?'chosen':''} onClick={()=>{setTour(-1);showRoom(r,walk);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setTour(-1);showRoom(r,walk);}}}><title>{shortName(r.name)}</title></polygon>)}{position&&walk&&<circle cx={position[0]} cy={position[1]} r=".3"/>}</svg><small>Tap a room to jump there</small></div>}
  {tour>=0&&<div className="tour-bar"><button aria-label="Previous tour room" onClick={()=>tourStop(tour-1)}><ArrowLeft size={17}/></button><div><small>ROOM TOUR</small><span>{tour+1} / {stops.length}</span></div><button aria-label="Next tour room" onClick={()=>tourStop(tour+1)}><ArrowRight size={17}/></button><button aria-label="End tour" onClick={()=>setTour(-1)}><X size={16}/></button></div>}
  {walk&&<div className="move-pad" aria-label="Walk controls">{[['forward',1,'Move forward',ArrowUp],['side',-1,'Move left',ArrowLeft],['forward',-1,'Move back',ArrowDown],['side',1,'Move right',ArrowRight]].map(([axis,val,label,Icon],i)=><button key={label} className={'move-'+i} aria-label={label} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);movement[axis]=val;}} onPointerUp={()=>movement[axis]=0} onPointerCancel={()=>movement[axis]=0} onLostPointerCapture={()=>movement[axis]=0}><Icon size={22}/></button>)}</div>}
  <footer><button className="mobile-only tool" onClick={()=>setMenu(!menu)}><Menu size={18}/><span>Rooms</span></button><div className="mode-switch"><button className={!walk?'active':''} onClick={()=>{setTour(-1);room?showRoom(nodes[room]):changeFloor(floor);}}><Compass size={17}/><span>Explore</span></button><button className={walk?'active':''} disabled={!ready||!walkEntry} onClick={enter}><Footprints size={17}/><span>Walk</span></button></div><span className="divider"/><button className={'tool '+(plan?'active':'')} disabled={!floor||!rooms.length} onClick={()=>{setTour(-1);setPlan(!plan);}}><MapIcon size={18}/><span>Plan</span></button><button className="tool desktop-tool" disabled={!floor||walk} onClick={()=>{setCut(!cut);useViewer.getState().setWallMode(cut?'up':'cutaway');}}><Layers size={18}/><span>{cut?'Walls up':'Cutaway'}</span></button><button className="tool" disabled={!ready} onClick={()=>tourStop(0)}><Play size={17}/><span>Tour</span></button><button className="tool desktop-tool" onClick={()=>{setQuality(!quality);}}><Sun size={18}/><span>{quality?'Quality':'Performance'}</span></button><button className="icon-button desktop-tool" aria-label="Reset view" onClick={()=>changeFloor(floor)}><RotateCcw size={17}/></button></footer>
  <div className="credit">588 / INTERIOR V1 <span>Powered by Pascal</span></div>
 </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
