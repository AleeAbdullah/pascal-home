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

// Room review 2026-10-26: architect bridge across the shaft. W14 (lounge wall, 60 in) and W11 (shaft-east, 72 in) become openings; deck and guards live in shaft-bridge.mjs.
export {openingSpecs as bridgeOpeningSpecs,ownerDecision as bridgeOwnerDecision} from './shaft-bridge.mjs';

// Room review 2026-10-26 (owner queue section 6): hinged 3 ft door from the corridor at the Kitchen+Store south-west corner.
// The architect (page 2) draws the leaf in the 36 in gap x 679..715 hinged on the west jamb; the model's south wall (z 208) carries a 60 in open passage (x 678..738), so that opening becomes the 36 in leaf and the wall closes x 715..738.
export const kitchenDoor={wallId:'wall_588_ff_rear_rooms_front_4',doorId:'door_y8r5e8p1bhus18nz',wallStartX:673.5,centre:697,width:36,height:120,
 basis:'Owner room review 2026-10-26 (queue 6): hinged 3 ft door at the Kitchen+Store south-west corner, architect page-2 position x 679..715 in, hinged on the west jamb, swinging north into the kitchen'};
export function kitchenDoorPatch(nodes){
 const n=nodes[kitchenDoor.doorId];if(!n)throw Error('Missing kitchen entry door');
 return [{op:'update',id:n.id,data:{name:'Kitchen door · FF (corridor, 3 ft hinged)',openingKind:'door',doorType:'hinged',leafCount:1,hingesSide:'left',handleSide:'right',swingDirection:'outward',width:inch(kitchenDoor.width),position:[inch(kitchenDoor.centre-kitchenDoor.wallStartX),n.position[1],n.position[2]],
  metadata:{...n.metadata,blueprintReview:'2026-10-26',correctionBasis:kitchenDoor.basis,widthBasis:'Architect page-2 36 in leaf; replaces the 60 in open passage of the Building Control trace',positionBasis:'Architect page-2 vectors x 679..715 in',operability:'Door swing to be checked'}}}];
}

// Review 2026-10-31 (owner: "in the double height lobby first floor there is no glass railing"): the corridor's east strip
// had only non-physical separators along the main-stair well and the double-height lobby void. Two 42 in glass guards,
// same guard as the rest of the house. The upper flight's top step (x 689, z 374.5..434.5) stays open.
export const voidGuards=[
 {key:'ff-lobby-void-east',x:677,z0:438,z1:526,basis:'Lobby void east edge: slab notch edge x 678 / separator x 674 from the stair-front guard end (z 440) to the front-bedroom wall corner (z 526).'},
 {key:'ff-stairwell-east',x:690,z0:280,z1:373.5,basis:'Main stair-well east edge x 689 from the stair-back wall (z 277) to the upper flight top step (z 374.5); the step-off edge z 374.5..434.5 stays open.'},
];
export const voidGuardDecision='Owner review 2026-10-31: add 42 in glass guards on the open first-floor edges of the main stair well and the double-height lobby void';

// ---- Review 2026-10-31 (owner approved the whole-house audit fixes: "all"): terrace guards, terrace doors, secondary stair ----
export const auditDecision='Owner review 2026-10-31 (whole-house audit, "all" approved)';
// 42 in glass guards (same guard as elsewhere; add_object rotation is in DEGREES: 0 = east-west run, -90 = north-south run).
export const terraceGuards=[
 {key:'ff-right-north',x0:936,x1:1038,z:635.5,rotation:0,basis:'Front right terrace north edge z 635.5, east of the front-master-bedroom wall (outer face x 936) to the porch-east FF upstand (west face x 1036; guard overlaps it to 1038). The slab edge was an open drop to the car porch.'},
 {key:'ff-rear-terrace-north',x0:523.5,x1:673.5,z:-4.5,rotation:0,basis:'Rear terrace north edge on the rear wall line z -4.5 (floor plate ff-main reaches z -9), between the rear-left wall end (x 523.5) and the rear-terrace-east wall (x 673.5); architect page-2 plan draws a parapet here. Planters at z 11 stay.'},
];
export const terraceGuardDecision=auditDecision+': 42 in glass guards on the open edges of the front right terrace (north, east of the bedroom) and the rear terrace (north)';
// Earlier void guards (3df23b8) were added with rotation -PI/2 DEGREES (= -1.57 deg), i.e. east-west; they must run north-south.
export const voidGuardRotationRad=-Math.PI/2;
// Sliding glass doors replacing the fixed terrace glazing (same jambs, same height). Centres/widths in plan inches along the wall.
export const terraceDoors=[
 {doorKey:'doors-1-26',windowKey:'windows-1-42',tag:'W3',wallId:'wall_as68eeea9f',axis:0,centre:309.03,width:180,height:120,panels:3,name:'W3 · FF (sliding glass door)',
  basis:'FF lounge front glazing W3 (x 219..399, z 508, 120 in) becomes a 3-panel sliding glass door onto the front left terrace; same jambs and height, sill 0'},
 {doorKey:'doors-1-27',windowKey:'windows-1-45',tag:'W6',wallId:'wall_asbafc323d',axis:0,centre:838.6,width:132,height:120,panels:2,name:'W6 · FF (sliding glass door, front master)',
  basis:'FF front master bedroom W6 (x 772.6..904.6, z 631, 120 in) becomes a 2-panel sliding glass door onto the front right terrace; same jambs and height, sill 0. W4 and its Juliet guard are unchanged'},
 {doorKey:'doors-1-28',windowKey:'windows-1-33',tag:'W6',wallId:'wall_588_ff_rear_rooms_front_3',axis:0,centre:598.54,width:132,height:96,panels:2,name:'W6 · FF (sliding glass door, corridor to rear terrace)',
  basis:'FF corridor window W6 (x 532.5..664.5, z 208, was sill 6 / 96 in) becomes a 2-panel sliding glass door onto the rear terrace; same jambs and 96 in height, sill 0'},
];
// ---- Secondary stair (FF -> SF): first (NW) winder set replaced by a flat 42 x 42 quarter landing, its 3 risers moved to the first flight ----
// Stair origin (middle of the bottom riser) z 122 -> 152; flight 1 = 11 risers x 10 in going (z 152 -> 42); landing x 678..720, z 42..0 at +75.57 in;
// flight 2 (7 risers, east), NE winder and the 2-riser last flight are untouched. 23 equal risers of 158/23 = 6.8696 in.
export const secondaryStair={id:'stair_kp9tpho9wsnlkr4s',z:152,flight1:{id:'sseg_asla75j2vki8lwoe',steps:11,run:110},landing:{id:'sseg_588_secondary_1',run:42},flight2:{id:'sseg_588_secondary_2'},rise:158,count:23,
 basis:auditDecision+': the NW winder set had near-zero inner treads; replaced by a square quarter landing, its three risers added to the first flight (starts z 152, 11 x 10 in going). SF floor opening and sf-stair-guard-z122 unchanged: headroom at the SF slab edge (z 122, tread +20.6 in, slab underside +144 in) is 123 in.'};
