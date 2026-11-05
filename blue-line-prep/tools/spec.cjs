// usage (repo root): node blue-line-prep/tools/spec.cjs > blue-line-prep/PROGRAM_SPEC.md
// Regenerates the as-built spec by RUNNING the app's own engine, so the doc cannot drift from the code.
const fs=require("fs"),vm=require("vm"),path=require("path");
const html=fs.readFileSync(path.join(__dirname,"..","..","src","blue-line-prep.html"),"utf8").split("\n");
let on=false;const eng=[];for(const l of html){if(/^const STORE="blp-v6";/.test(l))on=true;if(/^\/\* ── icons /.test(l))on=false;if(on)eng.push(l);}
const harness=`
;(function(){
  const OWN=ownTotalsPre(null), acadPlan=academyWeeks({},ACAD_PER_PT*2,OWN,2);
  const ctx={puMax:30,suMax:37,run15:792,e1:{squat:100,bench:100,dl:100,ohp:100,sol:100},acadPlan,trend:0,ptDays:[1,3],ptTemplate:"auto",gradT:parseISO(GRAD_T_DEFAULT),screenDone:true,programDays:30,today:new Date(2026,10,4)};
  const L=[];const P=s=>L.push(s);
  const skip=id=>DAILY_NEURO.includes(id)||id==="shortFoot";
  const sum=w=>weekSummary(w,ctx);
  P("# Blue Line Prep — Program Spec (as built)");P("");
  P("**GENERATED FILE — do not edit by hand.** Regenerate with \`node blue-line-prep/tools/spec.cjs > blue-line-prep/PROGRAM_SPEC.md\` after any change to \`src/blue-line-prep.html\`. It is produced by running the app's own \`buildDay()\` engine, so it is exactly what the app prescribes. The rationale, sources and decision rules are in [HANDOFF.md](HANDOFF.md).");P("");
  P("Inputs for this dump: push-up max 30, sit-up max 37, 1.5 mile 13:12, every lift e1RM set to **100 lb so each load reads as a % of e1RM**, no shin flags, academy PT on Tue/Thu at 30 running minutes per PT day, final assessment at the default Tue 1 Jun 2027.");P("");
  P("## Calendar");P("");
  P("| Item | Value |");P("|---|---|");
  P("| Week 1 | Mon 12 Oct 2026 |");P("| v7 starts (\`V7_FROM\`) | Week "+V7_FROM+" = "+isoOf(dateOf(V7_FROM,0))+" |");
  P("| Time trials (\`TT_WKS\`) | Weeks "+TT_WKS.join(", ")+" (Saturdays) |");P("| Mock PFT | Week "+MOCK_PFT.w+" Tue = "+isoOf(dateOf(MOCK_PFT.w,MOCK_PFT.d))+" |");
  P("| Academy starts (\`ACADEMY_WK\`) | Week "+ACADEMY_WK+" = "+isoOf(dateOf(ACADEMY_WK,0))+" |");P("| Light running weeks (\`DELOADS\`) | "+DELOADS.join(", ")+" |");
  P("| Final assessment default | "+GRAD_T_DEFAULT+" |");P("| Calendar ends | Week "+TOTAL_WEEKS+" |");P("");
  P("## Week summary");P("");
  P("Running minutes are minutes of actual running. \\"Acad\\" is the planning assumption until academy weeks are logged.");P("");
  P("| Wk | Mon | Phase | Own run | Acad run | Total | Run days | Bike/row | Lift days | PU days | SU days | Boot walk min |");P("|---|---|---|---|---|---|---|---|---|---|---|---|");
  for(let w=1;w<=TOTAL_WEEKS;w++){const s=sum(w);P("| "+w+(isDeload(w)?" (light)":"")+" | "+isoOf(dateOf(w,0))+" | "+getPhase(w).id+" | "+s.own+" | "+s.acad+" | "+s.total+" | "+s.runDays+" | "+s.bike+" | "+s.strength+" | "+s.pu+" | "+s.su+" | "+s.boot+" |");}
  P("");P("## Run caps, Weeks 5–12 (\`RUN_CAPS7\`)");P("");P("| Wk | Total | Run days | Longest run | Fast minutes |");P("|---|---|---|---|---|");
  for(let w=5;w<=12;w++){const c=RUN_CAPS7[w];P("| "+w+" | "+c[0]+" | "+c[1]+" | "+c[2]+" | "+c[3]+" |");}
  P("");P("## Academy run caps (\`RUN_CEIL\`, academy + own)");P("");P("| Wk | Cap | Own running planned at the default assumption |");P("|---|---|---|");
  for(let w=ACADEMY_WK;w<=TOTAL_WEEKS;w++){const a=acadPlan[w];P("| "+w+" | "+(RUN_CEIL[w]||(isDeload(w)?"light week":"peak / taper"))+" | quality "+a.own+(a.easy?" + easy "+a.easy:"")+" |");}
  const weeks=[4,5,6,7,8,9,10,11,12,13,15,16,18,19,22,25,30,31,32,33,34];
  P("");P("## Week by week");P("");P("Weeks "+weeks.join(", ")+". Other academy weeks repeat the Week 18 shape with the run minutes from the table above. Weeks 1–3 are history (the v6 template) and are not reproduced here.");
  for(const w of weeks){const s=sum(w);P("");P("### Week "+w+" · "+isoOf(dateOf(w,0))+" · phase "+getPhase(w).id+(isDeload(w)?" · light running week":""));P("");P("Own run "+s.own+" min · academy "+s.acad+" · bike/row "+s.bike+" · run days "+s.runDays+" · lift days "+s.strength);P("");
    for(let d=0;d<7;d++){const p=buildDay(w,d,null,ctx);P("- **"+DAYS[d]+" "+isoOf(dateOf(w,d))+" — "+p.label+"**"+(p.impact?" (impact)":""));
      for(const [k,arr] of [["first",p.am],["then",p.pm]]){const a=arr.filter(x=>!skip(x.id));const bat=arr.some(x=>skip(x.id));if(!arr.length)continue;
        if(bat)P("  - "+k+": daily battery (v6)");
        for(const x of a)P("  - "+k+": "+(LIBS[x.id]||{n:x.id}).n+(x.rm?" ["+x.rm+" run-min]":"")+" — "+(x.sr||(LIBS[x.id]||{}).sr||""));}}}
  __result=L.join("\\n")+"\\n";
})();`;
const sandbox={console,Date,Math,JSON,Object,Array,String,Number,RegExp,isNaN,parseInt,parseFloat,__result:null};
vm.createContext(sandbox);vm.runInContext(eng.join("\n")+harness,sandbox);
process.stdout.write(sandbox.__result);
