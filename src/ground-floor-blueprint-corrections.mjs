// Checked PDF sheet 1, ground-floor plan. Inches use the established rear-left inside-face origin.
// Unlabelled offsets are traced from the PDF vectors, not surveyed dimensions.
export const groundFloorId='level_as4e3a9d57';
export const inch=x=>Number((x*.0254).toFixed(8));
const p=(x,z)=>[inch(x),inch(z)];
const review='2026-10-25';
const sourceFile='588 - M1 (Checked by Building Control).pdf';
export const newPassage={wallId:'wall_588_gf_bath2_east_1',centre:158.35,width:42,height:120,sourceOpening:'passages-0-6',name:'Open passage · GF'};
export const columns=[
 {name:'P1 · GF column',x:362.9,z:279.9,w:12,d:15,basis:'Structural column P1 at plan x=362.9, z=279.9 in; 12 x 15 in (x by z)'},
 {name:'P2 · GF column',x:362.9,z:323.35,w:12,d:12,basis:'Structural column P2 at plan x=362.9, z=323.35 in; 12 x 12 in'},
 {name:'P3 · GF column',x:434.9,z:323.35,w:12,d:12,basis:'Structural column P3 at plan x=434.9, z=323.35 in; 12 x 12 in'},
 {name:'P4 · GF column',x:673.4,z:439.8,w:9,d:9,basis:'Free-standing column P4 at the stair south-east corner, x=673.4, z=439.8 in; 9 x 9 in'},
];
export const columnMetadata=basis=>({sourceFile,positionBasis:'PDF vector trace',blueprintReview:review,correctionBasis:basis});
export function structuralSnapshot(nodes){return Object.values(nodes).filter(n=>n.type==='wall'&&n.parentId===groundFloorId).length;}
// Distance along a wall of an absolute plan coordinate (metres); walls here are axis-aligned.
const axisOf=w=>w.start[0]===w.end[0]?1:0;
const dirOf=w=>Math.sign(w.end[axisOf(w)]-w.start[axisOf(w)]);
const localAt=(w,abs)=>dirOf(w)*(abs-w.start[axisOf(w)]);
const absAt=(w,local)=>w.start[axisOf(w)]+dirOf(w)*local;
export const byKey=(nodes,key)=>Object.values(nodes).find(n=>n.metadata?.sourceOpening===key&&n.parentId&&nodes[n.parentId]?.parentId===groundFloorId);
const meta=(n,reason,extra={})=>({...n.metadata,...extra,blueprintReview:review,correctionBasis:reason});
// Openings (doors with openingKind 'opening', plus window W16 width). Centre/width in inches.
export function openingPatches(nodes){
 const out=[];
 const move=(key,centre,width,reason,extra={})=>{
  const n=byKey(nodes,key);if(!n)return;const w=nodes[n.parentId];
  out.push({op:'update',id:n.id,data:{position:[localAt(w,inch(centre)),n.position[1],n.position[2]],width:inch(width),metadata:meta(n,reason,{positionBasis:'PDF vector trace rechecked '+review,widthBasis:'PDF vector jamb-to-jamb trace',sourcePositionInches:centre,...extra})}});
 };
 const remove=(key)=>{const n=byKey(nodes,key);if(n)out.push({op:'delete',id:n.id,cascade:false});};
 move('passages-0-0',135,42,'Master walk-in closet jambs x=113.9..156.0 in; centre x=135 in');
 remove('passages-0-1'); // Closet 2 corridor wall is solid in the drawing.
 move('passages-0-2',613.4,111,'Open kitchen entry occupies x=557.9..668.9 in');
 move('passages-0-3',788.9,36,'Guest walk-in closet opening x=770.9..806.9 in');
 remove('passages-0-4'); // Guest bathroom front wall is solid in the drawing.
 move('passages-0-5',480.3,72,'Drawing-room west opening z=444.3..516.3 in; centre z=480.3 in');
 // Maid-bath rear W16: drawn width 36 in governs; 48 in overlapped the laundry partition.
 const w16=byKey(nodes,'windows-0-5');
 if(w16){const w=nodes[w16.parentId];out.push({op:'update',id:w16.id,data:{position:[localAt(w,inch(895.365)),w16.position[1],w16.position[2]],width:inch(36),metadata:meta(w16,'PDF drawn width 36 in governs; 48 in overlapped the laundry partition',{widthOverride:36,widthDecision:'PDF drawn width 36 in governs; 48 in overlapped the laundry partition',sourcePositionInches:895.365})}});}
 return out;
}
// Walls: extend/shorten pieces; shaft-east windows keep their absolute positions.
export function wallPatches(nodes){
 const changes=new Map();
 const upd=(id,data,reason)=>{const n=nodes[id];if(!n)throw Error('Missing correction target '+id);const prev=changes.get(id)??{};const merged={...prev,...data};const w={...n,...merged};
  merged.metadata=meta(n,reason,{sourceStart:w.start,sourceEnd:w.end});changes.set(id,merged);};
 const out=[];
 // 9: shaft-east runs z 277 -> 653.3. Windows on the first piece shift local position when its start moves.
 const sh=nodes.wall_asb9aa1d96;
 upd('wall_asb9aa1d96',{start:p(514.5,277)},'Shaft-east wall runs continuously z=277..653.3 in; hall-stair separator became a real wall');
 const newSh={...sh,start:p(514.5,277)};
 for(const cid of sh.children??[]){const c=nodes[cid];out.push({op:'update',id:cid,data:{position:[localAt(newSh,absAt(sh,c.position[0])),c.position[1],c.position[2]]}});}
 upd('wall_588_gf_shaft_east_1',{end:p(514.5,653.3)},'Shaft-east wall runs continuously z=277..653.3 in');
 // 10: powder-west / lobby-east, real 9 in wall z 516.3 -> 653.3.
 upd('wall_as050475c3',{start:p(673.5,516.3)},'Lobby-east real wall z=516.3..653.3 in; gap z=444.3..516.3 stays open under the beam');
 upd('wall_588_gf_powder_west_1',{end:p(673.5,653.3)},'Lobby-east real wall z=516.3..653.3 in');
 // 11, 12
 upd('wall_588_gf_lounge_east_1',{end:p(433.5,710.3)},'Lounge-east wall extends to z=710.3 in');
 upd('wall_as5ec1b1cf',{end:p(677.9,277)},'Stair-back wall extends to x=677.9 in');
 for(const [id,data] of changes)out.unshift({op:'update',id,data});
 // Separators
 const lobby=nodes.separator_588_gf_lobby_east;
 if(lobby)out.push({op:'update',id:lobby.id,data:{end:p(673.5,516.3),metadata:meta(lobby,'Lobby boundary kept in the open gap; real wall now covers z=516.3..653.3 in')}});
 if(nodes.separator_588_gf_hall_stair)out.push({op:'delete',id:'separator_588_gf_hall_stair',cascade:false});
 return out;
}
// Floor furniture moved so the corrected openings keep their door keep-outs. Mirrors src/ground-floor-interior-v1.mjs.
// The master sliding wardrobe was also shortened 2.1 -> 1.8 m (centre z 3.65): run
//   node scripts/ground-floor-interior-v1.mjs build masterCloset-wardrobe
// after editing the spec; a size change needs add_object, which this script does not repeat.
export const furnitureMoves=[
 {key:'closet2-east',position:[6.31,0,4.86],rotation:[0,3.14159265,0],basis:'Moved from the east wall (now carries the closet 2 opening) to the south wall of closet 2'},
 {key:'guestCloset-wardrobe',position:[19.26,0,9.45],basis:'Shifted south and against the west wall to clear the relocated guest closet opening keep-out'},
 {key:'drawing-art',position:[21.9,1.2,10.5],rotation:[0,0,0],basis:'Moved from the west wall, where the drawing-room opening now sits, to the north wall behind the sofa'},
];
export function furniturePatches(nodes){
 return furnitureMoves.flatMap(m=>{const n=Object.values(nodes).find(x=>x.parentId===groundFloorId&&x.metadata?.groundInteriorV1Key===m.key);if(!n)throw Error('Missing furniture '+m.key);
  return [{op:'update',id:n.id,data:{position:m.position,...(m.rotation?{rotation:m.rotation}:{}),metadata:{...n.metadata,placementBasis:m.basis,blueprintReview:review}}}];});
}

// ---- Owner decisions 2026-10-25 (idempotent; run with `node scripts/correct-ground-floor.mjs decisions`) ----
const ownerDecisionW19='Owner decision 2026-10-25: PDF drawn width 30 in governs over the 18 in schedule';
// Decision 1: bathroom 2 rear window W19 widens 18 -> 30 in about the same centre (x 262.12..292.12).
export function windowDecisionPatches(nodes){
 const n=byKey(nodes,'windows-0-1');if(!n)throw Error('Missing W19 windows-0-1');
 return [{op:'update',id:n.id,data:{width:inch(30),metadata:meta(n,'Bathroom 2 W19 drawn 30 in (x 262.12..292.12) governs; schedule 18 in superseded',{widthOverride:30,widthDecision:ownerDecisionW19,widthBasis:'Owner decision 2026-10-25',ownerDecision:ownerDecisionW19})}}];
}
// Decision 3: the pantry opens to the open kitchen. The 4.5 in west wall becomes a non-physical separator on the same line so the zone keeps its name.
export const pantryWestWallId='wall_588_gf_pantry_west';
export const pantrySeparatorId='separator_588_gf_pantry_west';
const ownerDecisionPantry='Owner decision 2026-10-25: pantry opens to the open kitchen; west wall (x 711.75, z 68.25..163.75) removed and replaced by a separator';
export function pantryPatches(nodes){
 const out=[];
 if(!nodes[pantrySeparatorId])out.push({op:'create',parentId:groundFloorId,node:{id:pantrySeparatorId,type:'separator',parentId:groundFloorId,name:'gf-pantry-west',start:p(711.75,68.25),end:p(711.75,163.75),metadata:{sourceFile,physical:false,blueprintReview:review,correctionBasis:'Pantry west boundary is open to the kitchen',ownerDecision:ownerDecisionPantry}}});
 if(nodes[pantryWestWallId])out.push({op:'delete',id:pantryWestWallId,cascade:false});
 return out;
}
// Decision 4: entrance podium in two levels: +18 in to z 653.3, then +12 in (top -6 in) to the front edge z 695.5.
export const podiumRearName='Entrance podium · +18″',podiumFrontName='Entrance podium front · +12″',podiumFrontId='slab_588_gf_podium_front';
const ownerDecisionPodium='Owner decision 2026-10-25: entrance podium has two levels, +18 in rear (z 599.5..653.3) and +12 in front (z 653.3..695.5)';
export function podiumPatches(nodes){
 const rear=Object.values(nodes).find(n=>n.type==='slab'&&n.parentId===groundFloorId&&n.name===podiumRearName);if(!rear)throw Error('Missing podium slab');
 const poly=(z0,z1)=>[p(519,z0),p(669,z0),p(669,z1),p(519,z1)];
 const out=[{op:'update',id:rear.id,data:{polygon:poly(599.5,653.3),metadata:{...rear.metadata,blueprintReview:review,correctionBasis:'Podium rear level ends at z=653.3 in',ownerDecision:ownerDecisionPodium}}}];
 const front=Object.values(nodes).find(n=>n.type==='slab'&&n.parentId===groundFloorId&&n.name===podiumFrontName);
 const data={polygon:poly(653.3,695.5),elevation:inch(-6)};
 if(front)out.push({op:'update',id:front.id,data:{...data,metadata:{...front.metadata,blueprintReview:review,correctionBasis:'Podium front level +12 in',ownerDecision:ownerDecisionPodium}}});
 else{const skip=new Set(['object','id','type','parentId','name','polygon','elevation','metadata','children']);
  const copy=Object.fromEntries(Object.entries(rear).filter(([k])=>!skip.has(k)));
  out.push({op:'create',parentId:groundFloorId,node:{...copy,id:podiumFrontId,type:'slab',parentId:groundFloorId,name:podiumFrontName,...data,metadata:{...rear.metadata,blueprintReview:review,correctionBasis:'Podium front level +12 in (top -6 in, thickness 8.25 in)',ownerDecision:ownerDecisionPodium}}});}
 return out;
}
// The +12 in entry step starts where the lowered podium front ends (z 695.5), so the two +12 in surfaces no longer overlap.
export function entryStepPatches(nodes){
 const s=nodes['slab_588_ext_entry-step-12'];if(!s)return [];
 return [{op:'update',id:s.id,data:{polygon:[p(519,695.5),p(669,695.5),p(669,707.5),p(519,707.5)],metadata:{...s.metadata,blueprintReview:review,correctionBasis:'Starts at the lowered podium front z=695.5 in',ownerDecision:ownerDecisionPodium}}}];
}

// ---- Room review 2026-10-25: entrance (idempotent; run with `node scripts/correct-ground-floor.mjs entrance`) ----
const ownerEntrance='Room review 2026-10-25: entrance';
const entryMeta=(n,reason)=>({...n.metadata,blueprintReview:review,correctionBasis:reason,ownerDecision:ownerEntrance});
export const lobbyBackZ=444.3;
export const entryDoorId='door_p4au1lr69jeii7u9';
export const entryConsoleIds=['item_mpmurjm7w37g62dc','item_hdwhrx3sxye63vy9','item_4jo6km4jhwo7y8p9'];
// Plain structural columns: the column node defaults to a round-rings base and a simple capital even for style 'plain'; 'none' removes both.
export const plainColumnFields={baseStyle:'none',capitalStyle:'none'};
export function lobbyDepthPatches(nodes){
 const out=[];
 const sep=(id,data,reason)=>{const n=nodes[id];if(!n)throw Error('Missing separator '+id);out.push({op:'update',id,data:{...data,metadata:entryMeta(n,reason)}});};
 const reason='Lobby back boundary moved from z=449 to z=444.3 in (owner room review; clear lobby depth 12\'-2")';
 sep('separator_588_gf_lobby_back',{start:p(514.5,lobbyBackZ),end:p(673.5,lobbyBackZ)},reason);
 sep('separator_588_gf_lobby_east',{start:p(673.5,lobbyBackZ),end:p(673.5,516.3)},reason);
 sep('separator_588_gf_stair_east',{end:p(673.5,lobbyBackZ)},'Stair east boundary ends at the moved lobby back z=444.3 in so the outlines stay closed');
 return out;
}
// D1: single leaf, hinged on the east jamb, swinging north into the lobby.
// Wall wall_as8bd1c732 runs west->east (x 514.5 -> 673.5); face a (front, exterior) is +Z (street), face b (back, interior) is -Z (lobby).
// Pascal swings 'inward' at rotation 0 toward face a, so the lobby swing is swingDirection 'outward' at rotation 0 (door side stays 'front').
// Seen from the street (facing -Z) east is on the right, so the east hinge is hingesSide 'right' and the handle goes opposite (west, 'left').
export function entryDoorPatches(nodes){
 const n=nodes[entryDoorId];if(!n)throw Error('Missing D1 '+entryDoorId);
 return [{op:'update',id:n.id,data:{doorType:'hinged',leafCount:1,hingesSide:'right',handleSide:'left',swingDirection:'outward',swingAngle:0,metadata:entryMeta(n,'D1 is a single timber leaf hinged on the east jamb (x=624 in) swinging into the lobby (north)')}}];
}
export function entryConsolePatches(nodes){return entryConsoleIds.filter(id=>nodes[id]).map(id=>({op:'delete',id,cascade:false}));}
export function columnStylePatches(nodes){
 return Object.values(nodes).filter(n=>n.type==='column'&&n.parentId===groundFloorId&&/^P[1-4] · GF column$/.test(n.name)).map(n=>({op:'update',id:n.id,data:{...plainColumnFields,metadata:entryMeta(n,'Plain structural column: round base and capital removed (baseStyle/capitalStyle none)')}}));
}

// Room review 2026-10-26: architect bridge across the shaft. The two facing W11 windows (lounge-east, shaft-east) become 72 in openings; deck, guards and planting live in shaft-bridge.mjs.
export {openingSpecs as bridgeOpeningSpecs,ownerDecision as bridgeOwnerDecision} from './shaft-bridge.mjs';

// ---- Room review 2026-10-26: dirty kitchen rear door + two outside steps (idempotent; `node scripts/correct-ground-floor.mjs rooms`) ----
// Architect plan p1: W16 (x 747..783) becomes a 3 ft exterior door; the closed leaf lies on the rear wall line and swings 90 deg south into the dirty kitchen,
// hinged on the west jamb (x 748.7); in Pascal terms that is swingDirection 'outward' (toward face b, south) with hingesSide 'right'. Outside: a 54.8 in wide tread z -21..-8.9 (tag 1) and the wall-depth tread z -8.9..0 (tag 2), UP arrow toward the kitchen.
// Levels: GF floor +18 in above the site datum; rear passage taken as +6 in (the lawn-front slab level, the lowest modelled finish) = -12 in from the GF floor,
// so three 4 in risers: passage -12 -> step 1 top -8 -> step 2 top -4 -> door sill 0.
const ownerRoomsDirty='Room review 2026-10-26: dirty kitchen';
export const rearDoor={wallId:'wall_588_gf_rear_4',windowKey:'windows-0-22',doorKey:'doors-0-25',refDoorKey:'doors-0-3',centre:765.06,width:36,name:'D3 · GF (rear exterior)'};
export const rearSteps=[
 {id:'slab_588_gf_rear_step_1',name:'rear-door-step-1',x0:737.6,x1:792.4,z0:-21,z1:-8.9,top:-8,tag:'tag 1: tread outside the wall, 12.1 in run, 4 in rise'},
 {id:'slab_588_gf_rear_step_2',name:'rear-door-step-2',x0:747,x1:783,z0:-8.9,z1:0,top:-4,tag:'tag 2: tread inside the wall depth, 8.9 in run, 4 in rise to the door sill at the GF floor'},
];
export function rearWindowPatches(nodes){const n=Object.values(nodes).find(x=>x.type==='window'&&x.metadata?.sourceOpening===rearDoor.windowKey);return n?[{op:'delete',id:n.id,cascade:false}]:[];}
export function rearDoorNode(nodes){return Object.values(nodes).find(n=>n.type==='door'&&n.parentId===rearDoor.wallId);}
export function rearDoorPatch(nodes,id){
 const ref=Object.values(nodes).find(n=>n.type==='door'&&n.name==='D3 · GF'&&n.parentId!==rearDoor.wallId&&n.doorCategory==='interior');if(!ref)throw Error('Missing D3 reference door');
 const skip=new Set(['object','id','type','parentId','wallId','position','rotation','width','metadata','name','children','visible']);
 const copy=Object.fromEntries(Object.entries(ref).filter(([k])=>!skip.has(k)));
 return [{op:'update',id,data:{...copy,name:rearDoor.name,hingesSide:'right',handleSide:'left',swingDirection:'outward',swingAngle:0,metadata:{sourceFile,sourceOpening:rearDoor.doorKey,sourceTag:'D3',positionBasis:'Architect floor plan p1; replaces W16 windows-0-22',widthBasis:'Owner room review: 3 ft',heightBasis:'PDF schedule',sourcePositionInches:rearDoor.centre,operability:'Hinged on the west jamb, swings south into the dirty kitchen',blueprintReview:review,correctionBasis:'Architect plan: exterior door at W16 position, swinging into the dirty kitchen',ownerDecision:ownerRoomsDirty}}}];
}
export function rearStepPatches(nodes){
 const ref=nodes['slab_588_ext_entry-step-12'];if(!ref)throw Error('Missing entry-step-12 reference slab');
 const skip=new Set(['object','id','type','parentId','name','polygon','elevation','metadata','children']);
 const copy=Object.fromEntries(Object.entries(ref).filter(([k])=>!skip.has(k)));
 return rearSteps.map(s=>{const data={polygon:[p(s.x0,s.z0),p(s.x1,s.z0),p(s.x1,s.z1),p(s.x0,s.z1)],elevation:inch(s.top),metadata:{sourceFile,undimensioned:'Architect floor plan tread outline; rise derived from site levels (assumed rear passage +6 in)',blueprintReview:review,correctionBasis:s.tag,ownerDecision:ownerRoomsDirty}};
  return nodes[s.id]?{op:'update',id:s.id,data}:{op:'create',parentId:groundFloorId,node:{...copy,id:s.id,type:'slab',parentId:groundFloorId,name:s.name,...data}};});
}

// ---- Room review 2026-10-26: lounge level change at the corridor edge (architect plan p1) ----
// Step band measured from page-1 vectors: display x 250.38..355.53 (west wall to column P1), y 529.38..538.77 -> plan x 189..357, z 272.5..287.5 in (risers at the band edges, tread nosings run N-S pairs at 17.5 in pitch).
// Two 6 in risers: corridor level 0 -> intermediate tread -6 (z 277..287, the approach zone) -> lounge floor -12 from z 287 south. The whole lounge + dining is one level.
const loungeStepReview='2026-10-26',loungeStepDecision='Room review 2026-10-26: lounge step at the corridor edge per architect';
export const loungeStep={z0:277,z1:287,x0:184.5,x1:433.5,treadTop:-6,lowTop:-12,thickness:8.25,slabId:'slab_588_gf_lounge_step',slabName:'gf-lounge-step · PDF floor construction',
 loungeZoneId:'zone_00015marrt4a3m4i',approachZoneId:'zone_pjp68o1aowuy1h0l',approachName:'Lounge step band · tread -6″'};
const lsMeta=(n,basis,extra={})=>({...(n?.metadata??{}),...extra,blueprintReview:loungeStepReview,correctionBasis:basis,ownerDecision:loungeStepDecision});
const setZ=(poly,from,to)=>poly.map(q=>Math.abs(q[1]-from)<1e-4?[q[0],to]:q);
export const loungeStepFurniture=[
 {key:'plant',x:5.212,z:7.42,basis:'Lounge floor now reaches z 287 in; plant moved north to the riser edge (its foliage bbox is z +-0.30 m) so it clears the dining rug'},
 {key:'plant-ne',x:10.3,z:7.65,basis:'Lounge floor now reaches z 287 in; plant moved east of the dining rug and columns, still in the north-east corner'},
 {key:'dining-rug',x:7.007,z:9.5,basis:'Rug shifted 0.25 m south so the north-west corner plant stands clear of it'},
];
export function loungeStepPatches(nodes){
 const out=[],L=loungeStep,zNew=inch(L.z1),zOld=inch(329.5),zTop=inch(L.z0);
 const sep=nodes.separator_588_gf_lounge_step;if(!sep)throw Error('Missing separator_588_gf_lounge_step');
 if(Math.abs(sep.start[1]-zNew)>1e-4)out.push({op:'update',id:sep.id,data:{start:[sep.start[0],zNew],end:[sep.end[0],zNew],metadata:lsMeta(sep,'Lounge level change moved from z 329.5 to the corridor-edge step band; separator now at the lounge side of the band (z 287)')}});
 const main=nodes.slab_588_gf_main,sunk=nodes.slab_588_gf_sunken;if(!main||!sunk)throw Error('Missing gf slabs');
 if(main.polygon.some(q=>Math.abs(q[1]-zOld)<1e-4))out.push({op:'update',id:main.id,data:{polygon:setZ(main.polygon,zOld,zTop),metadata:lsMeta(main,'Level 0 floor now ends at the corridor edge z 277 in (was 329.5)')}});
 if(sunk.polygon.some(q=>Math.abs(q[1]-zOld)<1e-4))out.push({op:'update',id:sunk.id,data:{polygon:setZ(sunk.polygon,zOld,zNew),metadata:lsMeta(sunk,'Lounge + dining floor (top -12 in) extends north to the step band, z 287 in (was 329.5)')}});
 const step={polygon:[p(L.x0,L.z0),p(L.x1,L.z0),p(L.x1,L.z1),p(L.x0,L.z1)],elevation:inch(L.treadTop),thickness:inch(L.thickness),metadata:lsMeta(null,'Intermediate tread between the two 6 in risers: top -6 in, z 277..287',{sourceFile,sourceTopInches:L.treadTop,sourceThicknessInches:L.thickness})};
 const ex=nodes[L.slabId];
 if(ex){if(JSON.stringify(ex.polygon)!==JSON.stringify(step.polygon)||ex.elevation!==step.elevation)out.push({op:'update',id:L.slabId,data:step});}
 else out.push({op:'create',parentId:groundFloorId,node:{id:L.slabId,type:'slab',parentId:groundFloorId,name:L.slabName,autoFromWalls:false,holes:[],holeMetadata:[],recessed:false,slots:{surface:main.slots?.surface},visible:true,...step}});
 return out;
}
// Second pass (after the zones have re-derived): bind the approach zone to the tread slab, drop the stale name, and make floor items / columns stand on the right floor.
export function loungeStepZonePatches(nodes){
 const L=loungeStep,out=[];
 // Moving the separator re-mints the approach zone (it was zone_pjp68o1aowuy1h0l, now an auto "Room N"); find it by outline.
 const near=(a,b)=>Math.abs(a-b)<2e-3,box=q=>[Math.min(...q.map(r=>r[0])),Math.max(...q.map(r=>r[0])),Math.min(...q.map(r=>r[1])),Math.max(...q.map(r=>r[1]))];
 const z=Object.values(nodes).find(n=>n.type==='zone'&&n.parentId===groundFloorId&&n.spaceRole==='room'&&(b=>near(b[0],inch(L.x0))&&near(b[1],inch(L.x1))&&near(b[2],inch(L.z0))&&near(b[3],inch(L.z1)))(box(n.polygon)));
 if(z&&(z.name!==L.approachName||z.floor?.sourceSlabId!==L.slabId))out.push({op:'update',id:z.id,data:{name:L.approachName,floor:{sourceSlabId:L.slabId,finish:z.floor?.finish},metadata:lsMeta(z,'Zone is the two-riser step band; its floor is the -6 in tread slab')}});
 // Every lounge floor item rests on the lounge slab (plants NW/NE were still bound to the level-0 slab).
 for(const n of Object.values(nodes)){
  if(n.parentId!==groundFloorId||!n.position||!['item','spawn'].includes(n.type))continue;
  const [x,,zz]=n.position;if(x<inch(L.x0)||x>inch(L.x1)||zz<inch(L.z1)||zz>inch(658))continue;
  if(n.supportSlabId==='slab_588_gf_sunken'||!n.supportSlabId)continue;
  out.push({op:'update',id:n.id,data:{supportSlabId:'slab_588_gf_sunken',position:[n.position[0],0,n.position[2]]}});
 }
 // The plants now stand on the lounge floor beside the dining rug: nudge the NW plant north and the NE plant east, and the rug 0.25 m south, so they do not overlap. Mirrors src/interior-v1.mjs.
 for(const m of loungeStepFurniture){const n=Object.values(nodes).find(x=>x.parentId===groundFloorId&&x.metadata?.interiorV1Key===m.key);if(!n)throw Error('Missing lounge item '+m.key);
  if(Math.abs(n.position[2]-m.z)>1e-6||Math.abs(n.position[0]-m.x)>1e-6)out.push({op:'update',id:n.id,data:{position:[m.x,n.position[1],m.z],metadata:lsMeta(n,m.basis)}});}
 // Columns stand on the floor they are in: P1 on the -6 tread, P2/P3 on the -12 lounge floor; the top stays at level height + 3.96 m.
 const colTop={'P1 · GF column':L.treadTop,'P2 · GF column':L.lowTop,'P3 · GF column':L.lowTop};
 for(const n of Object.values(nodes)){
  if(n.type!=='column'||n.parentId!==groundFloorId||!(n.name in colTop))continue;
  const base=inch(colTop[n.name]),h=Number((3.96-base).toFixed(5));if(Math.abs(n.position[1]-base)<1e-6&&Math.abs(n.height-h)<1e-6)continue;
  out.push({op:'update',id:n.id,data:{position:[n.position[0],base,n.position[2]],height:h,metadata:lsMeta(n,'Column base follows the floor it stands on ('+colTop[n.name]+' in); top unchanged at 3.96 m above level 0')}});
 }
 return out;
}

// ---- Review 2026-10-31 (owner approved the whole-house audit, "all"): lounge garden door, maid-bath door steps, entrance door 9 ft + timber panel ----
export const auditDecision='Owner review 2026-10-31 (whole-house audit, "all" approved)';
const FRAME_MAT='scene:mat_m548d3ql7l2z76yt',TIMBER_MAT='scene:mat_yllacqa9i7s62l6g';
export {FRAME_MAT,TIMBER_MAT};
// Lounge front wall gf-lounge-front (x 184.5..433.5, z 658). W1 (x 189..429, 132 in, sill 0) -> 66 in fixed lite | 108 in sliding door | 66 in fixed lite.
// Levels (inches from the GF floor): lounge floor -12, sitting deck outside -6 (z 662.5..710.5), lawn -12, door sill 0. The deck is already the first 6 in step down;
// a 6 in tread inside the wall depth (top -6) makes the inside rise 6 + 6 instead of one 12 in step.
export const loungeDoor={wallId:'wall_asa168b878',westWindowId:'window_5zttqap3p8rw5nvv',windowKey:'windows-0-19',doorKey:'doors-0-29',eastKey:'windows-0-54',wallStartX:184.5,
 door:{centre:309,width:108,height:132,panels:2,name:'W1 · GF (sliding glass door)'},west:{centre:222,width:66},east:{centre:396,width:66,name:'W1 east lite · GF',tag:'W1-east'},
 step:{id:'slab_588_gf_lounge_door_step',name:'gf-lounge-door-step',x0:255,x1:363,z0:653.5,z1:662.5,top:-6,thickness:8.25},finGap:[252,366],
 basis:'GF lounge W1 (x 189..429): central 108 in sliding glass door x 255..363 onto the sitting deck, the rest stays fixed glazing'};
// Maid bathroom exterior door D4 (wall gf-rear-east x 949.5, outer face 954; door centre z 30.67, 30 in). Same three 4 in risers as the dirty-kitchen rear door:
// side passage taken as +6 in (-12 from the GF floor); step 1 outside (12.1 in run, top -8), step 2 in the wall depth (top -4), sill 0.
export const maidSteps=[
 {id:'slab_588_gf_maid_step_1',name:'maid-door-step-1',x0:954,x1:966.1,z0:6.27,z1:55.07,top:-8,tag:'tag 1: tread outside the wall, 12.1 in run, 4 in rise (as the dirty-kitchen rear door)'},
 {id:'slab_588_gf_maid_step_2',name:'maid-door-step-2',x0:945,x1:954,z0:15.67,z1:45.67,top:-4,tag:'tag 2: tread inside the wall depth, 9 in run, 4 in rise to the door sill at the GF floor'},
];
// Entrance D1: 60 x 108 in (9 ft) operable timber leaf (hinged model of a pivot: Pascal has no pivot type), fixed timber panel 60 x 180 in above it, flush in the same opening.
export const entryDoor={doorId:'door_p4au1lr69jeii7u9',wallId:'wall_as8bd1c732',wallStartX:514.5,centre:594,width:60,height:108,panelKey:'windows-0-55',panelHeight:180,panelName:'D1 timber panel · GF',
 basis:'Owner audit 2026-10-31: D1 operable leaf is a realistic 60 x 108 in (9 ft) pivot door; the 180 in above it is a fixed timber panel in the leaf finish, flush in the same opening; side curtain wall unchanged'};
