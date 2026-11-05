// usage: node show.cjs <dump.json> <ctx> <weeks comma> [maxlen]
const fs=require("fs");const r=JSON.parse(fs.readFileSync(process.argv[2]));const c=process.argv[3];const ws=process.argv[4].split(",").map(Number);const ml=+(process.argv[5]||230);
const D=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
for(const w of ws){console.log("\n### Week "+w);for(let d=0;d<7;d++){const p=r.out[c][w+"-"+d];console.log(`- ${D[d]} — ${p.label}${p.impact?" [IMPACT]":""}${p.dl?" [light]":""}`+(p.adjust?"\n   ADJUST: "+p.adjust.join(" | "):""));
  for(const [k,arr] of [["AM",p.am],["PM",p.pm]]){if(arr.length)console.log("  "+k+":");for(const x of arr)console.log(`    • ${x[0]}${x[1]?" ["+x[1]+"m]":""}: ${x[2].slice(0,ml)}`);}}}
