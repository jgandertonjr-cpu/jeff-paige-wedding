// usage: node unit.cjs <engine.js> — unit checks on the v7 rules
const fs=require("fs"),vm=require("vm");
const src=fs.readFileSync(process.argv[2],"utf8");
const harness=`
;(function(){
  const out=[];const ok=(name,cond,extra)=>out.push((cond?"PASS ":"FAIL ")+name+(extra?"  ["+extra+"]":""));
  // shinVerdict
  const v=(a,b,c,d)=>{const r=shinVerdict(a,b,c,d);return r?r.k:null;};
  ok("nothing entered → null",v(null,null,null,0)===null);
  ok("0 pain → carry",v(0,null,null,0)==="carry");
  ok("2/10 that faded, clean morning → carry",v(2,"settles",0,0)==="carry");
  ok("2/10 with no shape → ask",v(2,null,null,0)==="ask");
  ok("2/10 that stayed → backoff",v(2,"plateau",null,0)==="backoff");
  ok("3/10 → backoff",v(3,null,null,0)==="backoff");
  ok("4/10 faded → backoff",v(4,"settles",0,0)==="backoff");
  ok("morning 1/10 only → backoff",v(null,null,1,0)==="backoff");
  ok("5/10 → stop",v(5,null,null,0)==="stop");
  ok("2/10 that got worse → stop",v(2,"climbs",null,0)==="stop");
  ok("warning sign → stop",v(null,null,null,1)==="stop");
  // caps table vs engine
  const OWN=ownTotalsPre(null), acadPlan=academyWeeks({},ACAD_PER_PT*2,OWN,2);
  const base={puMax:30,suMax:37,run15:792,e1:{squat:300,bench:225,dl:365,ohp:135,sol:200},acadPlan,trend:0,ptDays:[1,3],ptTemplate:"auto",gradT:parseISO(GRAD_T_DEFAULT),screenDone:true,programDays:30,today:new Date(2026,10,4)};
  const FAST=["quality","check15","ttRun","t300","speedEnd"];
  for(let w=5;w<=12;w++){
    const[tot,days,longest,fast]=RUN_CAPS7[w];let t=0,dn=0,lg=0,fm=0;
    for(let d=0;d<7;d++){const p=buildDay(w,d,null,base);let dm=0;[...p.am,...p.pm].forEach(x=>{if(RUNIDS.includes(x.id)){dm+=x.rm||0;if((x.rm||0)>lg)lg=x.rm;}});
      if(dm){dn++;t+=dm;}
      [...p.am,...p.pm].forEach(x=>{if(x.id==="quality"){const g=GP_REPS[w],gx=GP_EXTRA[w];fm+=g?g[0]*g[1]+(gx?gx[0]*gx[1]:0):0;}if(x.id==="check15")fm+=13;if(x.id==="ttRun")fm+=13;if(x.id==="t300")fm+=1;});}
    ok("W"+w+" total "+t+" = cap "+tot,t===tot);ok("W"+w+" run days "+dn+" = "+days,dn===days);ok("W"+w+" longest "+lg+" ≤ "+longest,lg<=longest);ok("W"+w+" fast "+fm+" ≤ "+fast,fm<=fast);
  }
  // longest-run rule: no single run >10% longer than the longest of the previous 30 days (Weeks 5–12, default plan)
  const runs=[];for(let w=1;w<=12;w++)for(let d=0;d<7;d++){const p=buildDay(w,d,null,base);let dm=0;[...p.am,...p.pm].forEach(x=>{if(RUNIDS.includes(x.id))dm+=x.rm||0;});if(dm)runs.push({t:(w-1)*7+d,dm,w,d});}
  let worst=0;runs.filter(r=>r.w>=5).forEach(r=>{const prev=runs.filter(q=>q.t<r.t&&q.t>=r.t-30).map(q=>q.dm);const mx=Math.max(...prev);const ratio=r.dm/mx;if(ratio>worst)worst=ratio;if(ratio>1.12)out.push("FAIL long-run spike W"+r.w+" d"+r.d+" "+r.dm+" vs "+mx);});
  ok("no run more than ~10% longer than the longest of the prior 30 days",worst<=1.12,"worst ratio "+worst.toFixed(3));
  // a shin flag (trend>0) removes fast running, time trials and jumps in Weeks 5–10
  let bad=0;for(let w=5;w<=10;w++)for(let d=0;d<7;d++){const p=buildDay(w,d,null,{...base,trend:1});[...p.am,...p.pm].forEach(x=>{if(["quality","check15","pogo"].includes(x.id))bad++;});}
  ok("shin flag removes goal-pace reps, time trials and jumps (Weeks 5–10)",bad===0,"left "+bad);
  // ... and takes own running out in the academy
  let own=0;for(let w=15;w<=29;w++)for(let d=0;d<7;d++){const p=buildDay(w,d,null,{...base,trend:1});[...p.am,...p.pm].forEach(x=>{if(RUNIDS.includes(x.id))own+=x.rm||0;});}
  ok("shin flag removes own running in the academy",own===0,"left "+own);
  // time-trial repeat on 28 Nov when the first was slower than 13:05
  const s7=buildDay(7,5,null,{...base,tt1Slow:true});ok("slow first time trial → repeat on Sat 28 Nov",s7.am.some(x=>x.id==="check15"));
  // missed-day handling in v7 weeks: nothing throws, notes appear
  const st={"7-0":"skipped","7-2":"skipped","7-3":"skipped","7-4":"skipped","8-5":"skipped"};
  const cx={...base,today:new Date(2026,10,20),status:st};
  let notes=0,throws=0;for(let w=5;w<=14;w++)for(let d=0;d<7;d++){try{const p=buildDay(w,d,null,cx);if(p.adjust)notes+=p.adjust.length;[...p.am,...p.pm].forEach(x=>{if(!LIBS[x.id])throw new Error("lib "+x.id);});}catch(e){throws++;out.push("THROW W"+w+" d"+d+" "+e.message);}}
  ok("missed-day handling runs without errors in Weeks 5–14",throws===0,notes+" adjustment notes");
  const tue7=buildDay(7,1,null,cx), wed7=buildDay(7,2,null,cx), sat9=buildDay(9,5,null,cx);
  ok("missed Monday → bench moves to Tuesday",tue7.pm.some(x=>x.id==="bench"));
  ok("missed Monday → goal-pace run moves to Wednesday",wed7.am.some(x=>x.id==="quality"));
  ok("missed time trial (5 Dec) → next Saturday",sat9.am.some(x=>x.id==="check15"),sat9.label);
  const sick={...base,today:new Date(2026,11,7),status:{"8-5":"skipped","9-0":"sick","9-1":"sick","9-2":"sick","9-3":"sick"}};
  const s9=buildDay(9,5,null,sick);
  ok("first week back after 4 sick days → no time trial, relabelled",!s9.am.some(x=>x.id==="check15")&&/First Week Back/.test(s9.label),s9.label);
  // lift log classification: Week 6 logs now count; taper logs do not; Week 4 unchanged
  ok("Week 6 lift log counts",isEasyLog({week:6})===false);ok("Week 11 lift log is easy",isEasyLog({week:11})===true);ok("Week 4 lift log counts",isEasyLog({week:4})===false);
  // every day of every week builds and every item has a library entry, for 1–5 PT days
  let miss=0;for(const pt of [[1,3],[0,2,4],[2],[0,1,2,3],[0,1,2,3,4],[0,1]])for(let w=13;w<=35;w++)for(let d=0;d<7;d++){const p=buildDay(w,d,null,{...base,ptDays:pt});[...p.am,...p.pm].forEach(x=>{if(!LIBS[x.id])miss++;});}
  ok("academy weeks build for every PT-day pattern",miss===0);
  __result=out;
})();`;
const sandbox={console,Date,Math,JSON,Object,Array,String,Number,RegExp,isNaN,parseInt,parseFloat,__result:null};
vm.createContext(sandbox);vm.runInContext(src+harness,sandbox);
const r=sandbox.__result;console.log(r.join("\n"));console.log("\n"+r.filter(x=>x.startsWith("PASS")).length+" passed, "+r.filter(x=>!x.startsWith("PASS")).length+" failed");
