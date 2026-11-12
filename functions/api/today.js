import {json,requireAuth} from "../_lib/api.js";
export async function onRequestGet({request,env}) {
 const denied=await requireAuth(request,env);if(denied)return denied;
 const url=new URL(request.url),date=url.searchParams.get("date")||new Date().toISOString().slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({error:"Invalid date"},400);
 const weekday=new Date(date+"T12:00:00").getDay();
 const day=await env.DB.prepare("SELECT * FROM plan_days WHERE weekday=?").bind(weekday).first();
 if(!day)return json({date,day:null,completed:false});
 const exercises=await env.DB.prepare("SELECT * FROM plan_exercises WHERE day_id=? ORDER BY sort_order").bind(day.id).all();
 const prior=await env.DB.prepare("SELECT * FROM workout_sessions WHERE day_id=? AND workout_date=?").bind(day.id,date).first();
 const logs=prior?await env.DB.prepare("SELECT * FROM set_logs WHERE session_id=? ORDER BY exercise_id,set_number").bind(prior.id).all():{results:[]};
 const run=prior?await env.DB.prepare("SELECT * FROM run_logs WHERE session_id=?").bind(prior.id).first():null;
 return json({date,day,exercises:exercises.results,session:prior,logs:logs.results,run});
}
