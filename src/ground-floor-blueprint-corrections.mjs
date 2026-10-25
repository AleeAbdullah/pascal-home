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
