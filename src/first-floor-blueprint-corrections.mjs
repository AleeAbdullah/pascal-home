// Checked PDF sheet 1, first-floor plan. Inches use the established rear-left inside-face origin.
// Unlabelled offsets are traced from the PDF vectors, not surveyed dimensions.
export const firstFloorId='level_as4d3a9bc4';
export const inch=x=>Number((x*.0254).toFixed(8));
const p=(x,z)=>[inch(x),inch(z)];
export function architecturePatches(nodes){
 const changes=new Map();
 const update=(id,data)=>{if(!nodes[id])throw Error('Missing correction target '+id);changes.set(id,{...(changes.get(id)??{}),...data});};
 const metadata=(id,reason,extra={})=>({...nodes[id].metadata,...extra,blueprintReview:'2026-10-24',correctionBasis:reason});
 // Preserve the five-foot corridor through to the recessed, south-facing D2 entrance.
 update('wall_as8ade60c7',{start:p(673.5,525.5),end:p(742.5,525.5),metadata:metadata('wall_as8ade60c7','Entry return traced at 525.5 in; no cross-corridor wall at 440 in',{sourceWall:'ff-front-bedroom-entry'})});
 update('wall_as72938221',{start:p(673.5,525.5),metadata:metadata('wall_as72938221','Front master west wall starts after the entrance recess')});
 update('wall_588_ff_east_rooms_west_2',{end:p(742.5,525.5),metadata:metadata('wall_588_ff_east_rooms_west_2','Five-foot corridor continues alongside the recessed bedroom entrance')});
 // Master closet divider is 4.5 in, with its east face retained at 189 in.
 update('wall_588_ff_master_east_2',{start:p(186.75,105.25),end:p(186.75,208),thickness:inch(4.5),metadata:metadata('wall_588_ff_master_east_2','PDF 4.5 in closet partition; 15 ft 4.5 in master closet clear width',{sourceWall:'ff-master-closet-east'})});
 update('wall_asbf13ebdb',{end:p(186.75,105.25)});
 update('wall_as08296fc6',{end:p(186.75,208)});
 update('wall_588_ff_rear_rooms_front_1',{start:p(186.75,208)});
 function opening(id,wallId,offset,width,basis,extra={}){
  const n=nodes[id];
  update(id,{parentId:wallId,wallId,position:[inch(offset),n.position[1],n.position[2]],width:inch(width),...extra,metadata:metadata(id,basis,{positionBasis:'PDF vector trace rechecked 2026-10-24',widthBasis:n.openingKind==='opening'?'PDF vector jamb-to-jamb trace':'PDF schedule'})});
  // Pascal keeps wall.children itself; reparenting happens through the opening's own parentId.
 }
 opening('door_nsb2r98cha1k3n1z','wall_as8ade60c7',30,42,'D2 runs east-west at the corridor end, centre x=703.5 in, z=525.5 in',{hingesSide:'left',handleSide:'right',swingDirection:'inward'});
 opening('door_q46u9s31bxp94uiq','wall_as08296fc6',139.5,42,'Master closet jambs x=114 and 156 in; centre x=135 in');
 opening('door_q6az0l6p7yhvld5f','wall_588_ff_bath2_east_1',57.75,42,'Closet 2 opens east into Bedroom 02 at z=137.5..179.5 in; corridor wall remains closed');
 opening('door_y8r5e8p1bhus18nz','wall_588_ff_rear_rooms_front_4',34.5,60,'Kitchen entry occupies the full five-foot opening x=678..738 in');
 opening('door_yjux96s2oa2mne8l','wall_588_ff_rear_closet_front_1',68.5,36,'Rear closet opening x=885.25..921.25 in; centre x=903.25 in');
 opening('door_32a0q0ryp3gw7zu3','wall_588_ff_guest_bath_front_1',46.5,36,'Front closet opening x=771..807 in; centre x=789 in');
 const removed='door_n8j6x7wmfgqo63wj';
 // Deleting the opening is enough; its host wall's children list is maintained by Pascal.
 return [...changes].map(([id,data])=>({op:'update',id,data})).concat(nodes[removed]?[{op:'delete',id:removed,cascade:false}]:[]);
}

// Room review 2026-10-26: the stair-front wall (514.5,440)->(673.5,440) becomes an open 42 in glass guard.
// A non-physical separator keeps the same line so "Main staircase" and the double-height lobby void stay separate zones.
export const stairGuard={wallId:'wall_as9a3f1d7a',separatorId:'separator_588_ff_stair_front',key:'ff-stair-front',x0:514.5,x1:673.5,z:440,
 ownerDecision:'Room review 2026-10-26: replace first-floor stair-front wall with 42 in glass guard',
 basis:'Owner decision: stair-front wall removed; 42 in glass guard on the same centreline (514.5..673.5, z 440 in), same guard as the other house guards'};
// Pascal's zone auto-derivation drops the old void zone when the wall is removed and re-creates it as "Room 1"; these fields restore it.
export const lobbyVoidSeed=[15.0876,13.1445];
export const lobbyVoidFields={name:'Looking below · double-height lobby',visible:true,holes:[],autoFromWalls:true,hasFloor:false,hasCeiling:false,spaceRole:'room',roomNumber:'',enclosureStatus:'enclosed',floorFinish:'',wallFinish:'',ceilingFinish:'',ceilingHeight:2.7,occupancy:'',clearDimensionPolicy:'none',color:'#22c55e',
 floor:{sourceSlabId:'slab_588_ff_main',finish:'scene:mat_i5cw7zebgp01ed9b'},
 metadata:{correctionBasis:'Void over the double-height lobby restored after the corridor was opened alongside the recessed D2 entrance',blueprintReview:'2026-10-25',ownerDecision:stairGuard.ownerDecision,restoredAfter:'Pascal re-derived this zone as "Room 1" (new id) when the stair-front wall was removed; name, flags, finish and metadata restored from zone_bv6shzjn724wsmcg'}};
