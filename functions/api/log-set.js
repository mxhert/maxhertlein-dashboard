import {json,body,requireAuth} from "../_lib/api.js";
export async function onRequestPost({request,env}) {
 const denied=await requireAuth(request,env);if(denied)return denied;const d=await body(request);
 if(!d||!Number.isInteger(d.exercise_id)||!Number.isInteger(d.set_number)||!Number.isInteger(d.reps)||d.reps<0||d.reps>100||typeof d.date!=="string")return json({error:"Invalid set"},400);
 const ex=await env.DB.prepare("SELECT e.*,p.id day_id FROM plan_exercises e JOIN plan_days p ON p.id=e.day_id WHERE e.id=?").bind(d.exercise_id).first();if(!ex)return json({error:"Exercise not found"},404);
 let s=await env.DB.prepare("SELECT id FROM workout_sessions WHERE day_id=? AND workout_date=?").bind(ex.day_id,d.date).first();
 if(!s){const r=await env.DB.prepare("INSERT INTO workout_sessions(day_id,workout_date,created_at) VALUES(?,?,?)").bind(ex.day_id,d.date,Date.now()).run();s={id:r.meta.last_row_id}}
 await env.DB.prepare("INSERT OR REPLACE INTO set_logs(session_id,exercise_id,set_number,weight,reps,completed_at) VALUES(?,?,?,?,?,?)").bind(s.id,ex.id,d.set_number,ex.target_weight,d.reps,Date.now()).run();
 const sets=await env.DB.prepare("SELECT reps FROM set_logs WHERE session_id=? AND exercise_id=?").bind(s.id,ex.id).all();
 if(sets.results.length>=ex.target_sets){
  const allHit=sets.results.slice(0,ex.target_sets).every(x=>x.reps>=ex.target_reps);
  const under=sets.results.slice(0,ex.target_sets).filter(x=>x.reps<=ex.target_reps-2).length;
  let next=ex.target_weight;
  if(allHit)next=ex.target_weight+ex.weight_increment;
  else if(under>=Math.ceil(ex.target_sets/2))next=Math.max(0,ex.target_weight-ex.weight_increment);
  if(next!==ex.target_weight)await env.DB.prepare("UPDATE plan_exercises SET target_weight=? WHERE id=?").bind(Number(next.toFixed(2)),ex.id).run();
 }
 return json({ok:true,loggedSets:sets.results.length,targetSets:ex.target_sets});
}
