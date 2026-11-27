/* TEST ONLY — not shipped (see HANDOFF.md §11). Seeds localStorage['blp-v6'] with realistic history
   up to yesterday, using the app's own trackKeys. Load the app first, then run
   window.__seed() and reload. */
window.__seed=function(){
  const B=window.__blp,START=new Date(2026,9,12);
  const today=new Date();today.setHours(0,0,0,0);
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const stamp=(w,d)=>{const t=new Date(START);t.setDate(t.getDate()+(w-1)*7+d);return{date:t.toLocaleDateString(),iso:iso(t),week:w};};
  const done={};
  for(let w=1;w<=35;w++)for(let d=0;d<7;d++){
    const t=new Date(START);t.setDate(t.getDate()+(w-1)*7+d);
    if(t>=today)continue;
    const k=B.trackKeys(w,d,null,null);
    let keys=k.all;
    if(w===6&&d===2)keys=keys.slice(0,Math.ceil(keys.length/2));   // one half-done day
    if(w===3&&d===5)keys=[];                                        // one missed day
    keys.forEach(x=>{done[x]=true;});
  }
  const scores=[
    {...stamp(1,0),pushups:28,situps:36,run15:null,t300:null,puSp:"9/8/6/5",suSp:"11/10/8/7"},
    {...stamp(4,2),pushups:30,situps:37,run15:null,t300:null,puSp:null,suSp:null},
    {...stamp(5,5),pushups:null,situps:null,run15:"12:52",t300:null,puSp:null,suSp:null},
    {...stamp(6,4),pushups:32,situps:39,run15:null,t300:null,puSp:"10/9/7/6",suSp:"12/10/9/8"},
  ];
  const weights=[[1,0,246.2],[2,0,245.4],[3,0,244.6],[4,0,243.8],[5,0,242.6],[6,0,241.8],[7,0,240.6],[7,3,240.2]].map(([w,d,bw])=>({...stamp(w,d),bw}));
  const lifts=[
    [2,0,"bench",185,6,8],[2,1,"squat",225,5,8],[2,3,"dl",275,5,8],[3,2,"ohp",105,6,8],
    [5,0,"bench",190,7,9],[5,1,"squat",235,5,8],[5,2,"ohp",110,6,9],[5,3,"dl",285,5,8],
    [6,0,"bench",195,6,9],[6,1,"squat",240,5,8],[7,0,"bench",195,7,9],[7,1,"squat",245,5,8],[7,2,"ohp",110,7,9],[7,3,"dl",295,5,8],
  ].map(([w,d,k,wt,reps,rpe])=>({...stamp(w,d),k,wt,reps,rpe}));
  const data={v:6,done,
    pmPain:{"5-2":2},pmShape:{"5-2":"settles"},amPain:{"5-3":0},
    screen:{date:stamp(6,6).date,tenderL:"0",tenderR:"0",hopL:"10",hopR:"10",raiseL:"22",raiseR:"21"},
    subs:{"6-0":"bike"},rtr:null,flags:{},scores,weights,efforts:[],
    runLog:{"1":24,"2":30,"3":22,"4":38,"5":47,"6":30},
    body:{bw:"240.2",bf:"23.5",ex:"450",neat:"light"},
    tests:[],lifts,acad:{},acadAssume:undefined,
    ready:{"7-2":{sleep:"7.5",rhr:"57",sore:"2",base:58},"7-3":{sleep:"6",rhr:"60",sore:"4",base:58}},
    status:{"6-2":"partial"},runAct:{"6-2":"8"},built:{}};
  delete data.acadAssume;
  localStorage.setItem("blp-v6",JSON.stringify(data));
  return{ticks:Object.keys(done).length,scores:scores.length,lifts:lifts.length};
};
