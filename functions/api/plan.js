import {json,requireAuth,body} from "../_lib/api.js";
const csvCell=v=>{const s=String(v??"");return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
export async function onRequestGet({request,env}) {
 const denied=await requireAuth(request,env);if(denied)return denied;
 const days=await env.DB.prepare("SELECT * FROM plan_days ORDER BY weekday").all(),rows=[];
 for(const d of days.results){if(d.type==="run")rows.push({type:"run",weekday:d.weekday,title:d.title,target_miles:d.target_miles,run_type:d.run_type});else{const ex=await env.DB.prepare("SELECT * FROM plan_exercises WHERE day_id=? ORDER BY sort_order").bind(d.id).all();for(const e of ex.results)rows.push({type:"strength",weekday:d.weekday,title:d.title,exercise:e.name,sets:e.target_sets,reps:e.target_reps,weight:e.target_weight,increment:e.weight_increment})}}
 const headers=["type","weekday","title","exercise","sets","reps","weight","increment","target_miles","run_type"];
 return new Response([headers.join(","),...rows.map(r=>headers.map(h=>csvCell(r[h])).join(","))].join("\n"),{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":'attachment; filename="workout-plan.csv"',"cache-control":"no-store"}});
}
export async function onRequestPost({request,env}) {
 const denied=await requireAuth(request,env);if(denied)return denied;
 const d=await body(request);if(!d||typeof d.csv!=="string"||d.csv.length>200000)return json({error:"Upload a valid CSV (max 200 KB)"},400);
 const lines=d.csv.replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)return json({error:"CSV has no plan rows"},400);
 const parse=line=>{const out=[];let s="",q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'&&q){s+='"';i++}else if(c==='"')q=!q;else if(c===","&&!q){out.push(s);s=""}else s+=c}out.push(s);return out};
 const headers=parse(lines.shift()).map(x=>x.trim().toLowerCase()),idx=h=>headers.indexOf(h),val=(r,h)=>idx(h)<0?"":r[idx(h)]?.trim()||"";
 if(!["type","weekday","title"].every(h=>idx(h)>=0))return json({error:"Required columns: type, weekday, title"},400);
 const rows=lines.map(parse).map(r=>({type:val(r,"type").toLowerCase(),weekday:Number(val(r,"weekday")),title:val(r,"title"),exercise:val(r,"exercise"),sets:Number(val(r,"sets")||3),reps:Number(val(r,"reps")||8),weight:Number(val(r,"weight")||0),increment:Number(val(r,"increment")||5),miles:Number(val(r,"target_miles")||0),runType:val(r,"run_type")||"Easy"}));
 if(rows.some(r=>!["run","strength"].includes(r.type)||!Number.isInteger(r.weekday)||r.weekday<0||r.weekday>6||!r.title||(r.type==="strength"&&(!r.exercise||r.sets<1||r.sets>20||r.reps<1||r.reps>100||r.weight<0||r.increment<0))||(r.type==="run"&&(r.miles<=0||r.miles>100))))return json({error:"Check types, weekdays (0=Sun to 6=Sat), and workout values."},400);
 const groups=new Map();for(const r of rows){const key=r.weekday;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
 for(const [weekday,items] of groups){if(new Set(items.map(x=>x.type)).size>1||new Set(items.map(x=>x.title)).size>1)return json({error:"Each weekday must have one workout title and one workout type."},400)}
 await env.DB.prepare("DELETE FROM plan_days").run();
 for(const [weekday,items] of groups){const first=items[0],ins=await env.DB.prepare("INSERT INTO plan_days(weekday,title,type,target_miles,run_type) VALUES(?,?,?,?,?)").bind(weekday,first.title,first.type,first.type==="run"?first.miles:null,first.runType).run();const dayId=ins.meta.last_row_id;
  if(first.type==="strength")for(let i=0;i<items.length;i++){const x=items[i];await env.DB.prepare("INSERT INTO plan_exercises(day_id,name,sort_order,target_sets,target_reps,target_weight,weight_increment) VALUES(?,?,?,?,?,?,?)").bind(dayId,x.exercise,i,x.sets,x.reps,x.weight,x.increment).run()}
 }
 return json({ok:true,days:groups.size});
}
