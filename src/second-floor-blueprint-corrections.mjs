// Checked PDF sheet 1, second-floor plan. Inches use the established rear-left inside-face origin (shared with the other floors).
// Unlabelled offsets are traced from the PDF vectors, not surveyed dimensions.
export const secondFloorId='level_as503aa07d';
export const inch=x=>Number((x*.0254).toFixed(8));
const p=(x,z)=>[inch(x),inch(z)];
const review='2026-10-25';
const sourceFile='588 - M1 (Checked by Building Control).pdf';
const meta=(n,reason,extra={})=>({...n.metadata,...extra,blueprintReview:review,correctionBasis:reason});
const axisOf=w=>w.start[0]===w.end[0]?1:0;
const dirOf=w=>Math.sign(w.end[axisOf(w)]-w.start[axisOf(w)]);
const localAt=(w,abs)=>dirOf(w)*(abs-w.start[axisOf(w)]);
export const byKey=(nodes,key)=>Object.values(nodes).find(n=>n.metadata?.sourceOpening===key&&n.parentId&&nodes[n.parentId]?.parentId===secondFloorId);

// Item 7: bedroom -> walk-in closet passage on sf-bedroom-front (wall_as9414707a, starts x=742.5): 36 in at x 766.4..802.4.
export function openingPatches(nodes){
 const n=byKey(nodes,'passages-2-12');if(!n)return [];const w=nodes[n.parentId];
 return [{op:'update',id:n.id,data:{position:[localAt(w,inch(784.4)),n.position[1],n.position[2]],width:inch(36),metadata:meta(n,'Bedroom to walk-in closet opening jambs x=766.4..802.4 in (36 in); centre x=784.4 in',{positionBasis:'PDF vector trace rechecked '+review,widthBasis:'PDF vector jamb-to-jamb trace',sourcePositionInches:784.4})}}];
}

// Items 1, 2, 5: new walls (all 9 in). Parapets follow the roof parapet recipe in scripts/build-home.mjs (42 in, keys parapet-14/15).
export const parapetName='Roof parapet · section level +31′-2″';
const parapetBase={sourceFile,heightBasis:'Owner-delegated conflict resolution: 42 inch difference between section levels',positionBasis:'PDF wall-face grid and vector trace'};
export const newWalls=[
 {key:'parapet-14',template:'wall_vjv0rzneossz91q0',name:parapetName,start:[514.5,277],end:[514.5,440],t:9,h:42,
  meta:{...parapetBase,sourceParapet:'parapet-14'},basis:'Stair-void/shaft west parapet runs continuously x=510..519, z=272.4..572.3 in; z 277..440 was missing'},
 {key:'parapet-15',template:'wall_vjv0rzneossz91q0',name:parapetName,start:[433.5,568],end:[514.5,568],t:9,h:42,
  meta:{...parapetBase,sourceParapet:'parapet-15'},basis:'Shaft south parapet z=563.3..572.3 in closes x 429..519; was missing east of x=438'},
 {key:'void-east-stub',template:'wall_vjv0rzneossz91q0',name:'sf-void-east-stub',start:[673.5,163.75],end:[673.5,208],t:9,h:108,
  meta:{sourceFile,sheet:1,plan:'sf',sourceWall:'void-east-stub',positionBasis:'PDF vector trace; continues sf-mumty-west to the void front parapet',heightBasis:'Owner decision 2026-10-25: full 108 in height, matching sf-mumty-west'},
  basis:'Rear void east edge x=669..678, z=163.75..208 in continues sf-mumty-west; the edge was open between z 168.8 and 203.5'},
];
// Item 8 / 19: mumty front wall thickened to 9 in where the drawing shows it; centres from the drawn faces.
export const frontWalls=[
 {id:'wall_as693d64ae',z:165.8,t:9,reason:'Mumty front wall x 673.5..742.5 is 9 in, faces z=161.3 and 170.3 in (centre 165.8)'},
 {id:'wall_588_sf_maid_mumty_front_3',z:165.9,t:9,end:954,reason:'Maid/bedroom-east end block x 936..954, z 161.4..170.4 in is 9 in'},
];
export function wallPatches(nodes){
 const out=[];
 for(const f of frontWalls){const n=nodes[f.id];if(!n)throw Error('Missing correction target '+f.id);
  out.push({op:'update',id:f.id,data:{start:[n.start[0],inch(f.z)],end:[f.end?inch(f.end):n.end[0],inch(f.z)],thickness:inch(f.t),metadata:meta(n,f.reason,{sourceStart:[n.start[0],inch(f.z)],sourceEnd:[f.end?inch(f.end):n.end[0],inch(f.z)]})}});}
 return out;
}

// Items 3, 4, 10, 14: slab polygons (inches). East circulation/front terrace edges are the parapet-face z 444.4 in.
export const slabPolygons={
 slab_as0b8b8246:{reason:'West roof terrace also covers x 429..519, z 272.5..320.5 in (stops at the shaft parapet and the stair-void west face; shaft void x 433.5..514.5, z 325..568 stays open)',
  polygon:[[-9,-9],[375,-9],[375,208],[528,208],[528,281.5],[519,281.5],[519,320.5],[429,320.5],[429,572.5],[-9,572.5]]},
 slab_as098b7f20:{reason:'East circulation roof starts at z=170.5 in (floor hole outside mumty door D-3′) and ends at the stair-void south parapet face z=444.4 in',
  polygon:[[678,170.5],[738,170.5],[738,444.4],[678,444.4]]},
 slab_as0a8b80b3:{reason:'Front roof terrace north edge z=444.4 in (stair-void south parapet face)',
  polygon:[[519,444.4],[738,444.4],[738,444.5],[936,444.5],[936,635.5],[678,635.5],[678,599.5],[519,599.5]]},
 slab_588_sf_east:{reason:'Construction floor corner block ends at z=170.4 in',
  polygon:[[669,-9],[915,-9],[915,38.5],[954,38.5],[954,170.4],[936,170.4],[936,444.5],[738,444.5],[738,170.5],[669,170.5]]},
};
export function slabPatches(nodes){
 return Object.entries(slabPolygons).map(([id,s])=>{const n=nodes[id];if(!n)throw Error('Missing slab '+id);
  return {op:'update',id,data:{polygon:s.polygon.map(([x,z])=>p(x,z)),metadata:meta(n,s.reason)}};});
}

// Item 6: overhead water tank O.H.W.T drawn x 198..300.1, z -9..93.1 (RCC wall 9 in); centre (249, 42).
export const tank={id:'item_y0mwm5mvj3zaseyw',x:249,z:42,wall:9,reason:'Tank centre (249, 42) in and 9 in RCC walls traced from the O.H.W.T outline; height and top level unchanged'};

// New walls are created with apply_patch op:create, NOT add_wall: add_wall closes the shaft/stair-void parapet rings, which makes Pascal
// auto-derive an enclosed "Room 1" over the whole roof and re-claim the two void zones as auto rooms. delete_zone on that room also deletes
// its parapet walls (even with contents:'keep'), so avoid it. Creating the walls directly leaves the zones untouched.
export function wallCreate(nodes,w){
 const t=nodes[w.template];const id=w.id??'wall_588_sf_'+w.key.replace(/-/g,'_');
 return {op:'create',parentId:secondFloorId,node:{id,type:'wall',parentId:secondFloorId,name:w.name,visible:true,metadata:{...w.meta,blueprintReview:review,correctionBasis:w.basis},children:[],slots:t.slots,
  thickness:inch(w.t),height:inch(w.h),start:p(...w.start),end:p(...w.end),frontSide:'unknown',backSide:'unknown'}};
}
// Closing the shaft/stair-void rings re-claims those two zones as auto-derived rooms (polygons run to the wall centrelines; Pascal ignores a
// patch back to the hand-drawn rectangles). Names are kept; floor and ceiling stay off. The stub wall (item 5) closes the roof perimeter, so
// Pascal also derives one roof-wide room: keep it as a floorless, ceilingless "Roof terrace" zone like the original build did.
export const voidZoneIds=['zone_3gf3yqu2qcbklm8o','zone_wc15jlwxzc3jn9v0'];
export const voidZonePatches=nodes=>[
 ...voidZoneIds.filter(id=>nodes[id]).map(id=>({op:'update',id,data:{hasFloor:false,hasCeiling:false}})),
 ...Object.values(nodes).filter(n=>n.parentId===secondFloorId&&n.type==='zone'&&n.autoFromWalls&&/^Room \d+$/.test(n.name)).map(z=>({op:'update',id:z.id,data:{name:'Roof terrace',hasFloor:false,hasCeiling:false,spaceRole:'generic',enclosureStatus:'open'}})),
];
