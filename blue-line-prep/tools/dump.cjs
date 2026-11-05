// usage: node dump.cjs <engine.js> <out.json> [maxWeek]
// Runs the app's own engine in a sandbox and dumps buildDay() for every day under several contexts.
const fs=require("fs"),vm=require("vm");
const src=fs.readFileSync(process.argv[2],"utf8");
const maxWeek=+(process.argv[4]||35);
const harness=`
;(function(){
  const OWN=ownTotalsPre(null);
  const acadPlan=academyWeeks({},ACAD_PER_PT*2,OWN,2);
  const base={puMax:30,suMax:37,run15:792,e1:{squat:300,bench:225,dl:365,ohp:135,sol:200},acadPlan,trend:0,ptDays:[1,3],ptTemplate:"auto",gradT:parseISO(GRAD_T_DEFAULT),screenDone:true,programDays:30,today:new Date(2026,10,4)};
  const ctxs={
    A:base,
    B:{...base,trend:1},
    C:{...base,sub:"bike"},
    D:{...base,rtr:5},
    E:{...base,puMax:undefined,suMax:undefined,e1:{},run15:undefined},
    F:{...base,today:new Date(2026,9,12),status:{"2-0":"skipped","3-2":"sick","3-3":"sick","4-0":"skipped","4-3":"skipped"}},
    G:{...base,ptDays:[0,2,4]},
    H:{...base,ptDays:[0,1,2,3]},
  };
  const out={};
  for(const [name,ctx] of Object.entries(ctxs)){
    out[name]={};
    for(let w=1;w<=${maxWeek};w++)for(let d=0;d<7;d++){
      const p=buildDay(w,d,null,ctx);
      out[name][w+"-"+d]={label:p.label,rest:!!p.rest,impact:!!p.impact,strain:p.strain,pmOff:!!p.pmOff,dl:!!p.dl,
        am:p.am.map(x=>[x.id,x.rm||0,x.sr||""]),pm:p.pm.map(x=>[x.id,x.rm||0,x.sr||""]),adjust:p.adjust||null,
        keys:trackKeys(w,d,null,ctx).all.length};
    }
  }
  const sum={};for(let w=1;w<=${maxWeek};w++){const s=weekSummary(w,base);sum[w]=s;}
  const missing=[];for(const n of Object.keys(out))for(const k of Object.keys(out[n]))for(const it of [...out[n][k].am,...out[n][k].pm])if(!LIBS[it[0]])missing.push(n+":"+k+":"+it[0]);
  __result={out,sum,missing,acadPlan};
})();`;
const sandbox={console,Date,Math,JSON,Object,Array,String,Number,RegExp,isNaN,parseInt,parseFloat,__result:null};
vm.createContext(sandbox);
vm.runInContext(src+harness,sandbox,{filename:process.argv[2]});
fs.writeFileSync(process.argv[3],JSON.stringify(sandbox.__result,null,1));
const r=sandbox.__result;
console.log("days dumped per ctx:",Object.keys(r.out.A).length,"| missing lib ids:",r.missing.length?[...new Set(r.missing.map(x=>x.split(":")[2]))].join(","):"none");
for(let w=1;w<=maxWeek;w++){const s=r.sum[w];console.log("W"+String(w).padStart(2),"own",String(s.own).padStart(3),"acad",String(s.acad).padStart(3),"tot",String(s.total).padStart(3),"runDays",s.runDays,"bike",String(s.bike).padStart(3),"lift",s.strength,"PU",s.pu,"SU",s.su,"boot",s.boot,"prehab",s.prehab);}
