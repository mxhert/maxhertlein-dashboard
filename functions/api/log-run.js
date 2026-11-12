import {json,body,requireAuth} from "../_lib/api.js";
export async function onRequestPost({request,env}) {
 const denied=await requireAuth(request,env);if(denied)return denied;const d=await body(request);
 if(!d||!Number.isInteger(d.day_id)||typeof d.date!=="string"||!Number.isFinite(d.miles)||d.miles<=0||d.miles>200||!Number.isInteger(d.duration_seconds)||d.duration_seconds<=0)return json({error:"Enter valid miles and time"},400);
 let s=await env.DB.prepare("SELECT id FROM workout_sessions WHERE day_id=? AND workout_date=?").bind(d.day_id,d.date).first();
 if(!s){const r=await env.DB.prepare("INSERT INTO workout_sessions(day_id,workout_date,created_at) VALUES(?,?,?)").bind(d.day_id,d.date,Date.now()).run();s={id:r.meta.last_row_id}}
 await env.DB.prepare("INSERT OR REPLACE INTO run_logs(session_id,miles,duration_seconds,logged_at) VALUES(?,?,?,?)").bind(s.id,d.miles,d.duration_seconds,Date.now()).run();
 const day=await env.DB.prepare("SELECT target_miles FROM plan_days WHERE id=?").bind(d.day_id).first();
 if(day&&d.miles>=day.target_miles)await env.DB.prepare("UPDATE plan_days SET target_miles=? WHERE id=?").bind(Number((day.target_miles+0.25).toFixed(2)),d.day_id).run();
 return json({ok:true});
}
