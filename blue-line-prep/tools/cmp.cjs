// usage: node cmp.cjs <base.json> <new.json> <maxWeekToCompare>
const fs=require("fs");const a=JSON.parse(fs.readFileSync(process.argv[2])),b=JSON.parse(fs.readFileSync(process.argv[3]));const mw=+process.argv[4];
let diffs=0,n=0;
for(const c of Object.keys(a.out))for(const k of Object.keys(a.out[c])){const w=+k.split("-")[0];if(w>mw)continue;n++;
  const x=JSON.stringify(a.out[c][k]),y=JSON.stringify((b.out[c]||{})[k]);
  if(x!==y){diffs++;if(diffs<=8)console.log("DIFF ctx",c,"day",k,"\n  base:",x.slice(0,400),"\n  new: ",(y||"").slice(0,400));}}
console.log(`compared ${n} day-builds for weeks 1-${mw}: ${diffs} differences`);
process.exit(diffs?1:0);
