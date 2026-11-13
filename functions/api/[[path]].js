const SESSION_SECONDS=2592000,ITERATIONS=100000;
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const unhex=s=>new Uint8Array((s.match(/.{2}/g)||[]).map(x=>parseInt(x,16)));
const randomHex=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
async function sha(s){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))}
async function hashPin(pin,salt){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(salt),iterations:ITERATIONS},k,256))}
function cookie(req){const s=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('mh_workout_session='));return s?decodeURIComponent(s.slice(19)):''}
const setCookie=(v,age=SESSION_SECONDS)=>'mh_workout_session='+encodeURIComponent(v)+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+age;
const iso=()=>new Date().toISOString();
async function session(req,env){const t=cookie(req);if(!t)return false;const h=await sha(t),r=await env.DB.prepare('SELECT expires_at FROM sessions WHERE token_hash=?').bind(h).first();if(!r||r.expires_at<Math.floor(Date.now()/1000)){if(r)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(h).run();return false}return h}
async function newSession(env){const t=randomHex(32),h=await sha(t),exp=Math.floor(Date.now()/1000)+SESSION_SECONDS;await env.DB.prepare('INSERT INTO sessions(token_hash,expires_at,created_at) VALUES(?,?,?)').bind(h,exp,iso()).run();return t}
function validPlan(p){if(!p||!Array.isArray(p.days)||p.days.length>7)return false;const ids=new Set();for(const d of p.days){if(!Number.isInteger(d.day)||d.day<0||d.day>6||!['strength','run','rest'].includes(d.type)||typeof d.title!=='string'||!Array.isArray(d.exercises))return false;for(const e of d.exercises){if(!/^[\w-]{1,100}$/.test(e.id)||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim())return false;ids.add(e.id);if(d.type==='strength'&&(!Number.isFinite(+e.weight)||+e.weight<0||!Number.isInteger(+e.sets)||+e.sets<1||!Number.isInteger(+e.reps)||+e.reps<1||!Number.isFinite(+e.increment)||+e.increment<0))return false;if(d.type==='run'&&(!Number.isFinite(+e.miles)||+e.miles<0||!Number.isFinite(+e.minutes)||+e.minutes<0))return false;if(d.type==='rest'&&(!Number.isFinite(+e.minutes)||+e.minutes<0||+e.minutes>720))return false}}return true}
export async function onRequest({request,env}){
const path=new URL(request.url).pathname.replace(/^\/api\/?/,'').replace(/\/$/,'');
if(path==='version'&&request.method==='GET')return json({commit:env.CF_PAGES_COMMIT_SHA||'',branch:env.CF_PAGES_BRANCH||''});
if(!env.DB)return json({error:'Workout database is not configured.'},503);
if(request.method!=='GET'){const o=request.headers.get('origin');if(o&&new URL(o).host!==new URL(request.url).host)return json({error:'Invalid request origin.'},403)}
if(path==='auth/status'&&request.method==='GET'){const c=await env.DB.prepare('SELECT id FROM app_config WHERE id=1').first();return json({configured:!!c,authenticated:c?!!(await session(request,env)):false})}
if(path==='auth/setup'&&request.method==='POST'){
  try{
    const existing=await env.DB.prepare('SELECT id FROM app_config WHERE id=1').first();
    if(existing)return json({error:'PIN already configured. Please log in.'},409);
    const body=await request.json().catch(()=>({})),pin=String(body.pin??'');
    if(!/^\d+$/.test(pin))return json({error:'PIN must contain digits only.'},400);
    const salt=randomHex(16),pinHash=await hashPin(pin,salt);
    await env.DB.prepare('INSERT INTO app_config(id,pin_salt,pin_hash,created_at) VALUES(1,?,?,?)').bind(salt,pinHash,iso()).run();
    const token=await newSession(env);
    return json({ok:true},200,{'set-cookie':setCookie(token)});
  }catch(error){
    return json({error:'PIN setup failed: '+String(error?.message||error).slice(0,240)},500);
  }
}
if(path==='auth/login'&&request.method==='POST'){
  try{
    const body=await request.json().catch(()=>({})),pin=String(body.pin??'');
    const ip=await sha(request.headers.get('cf-connecting-ip')||'unknown'),since=Math.floor(Date.now()/1000)-900;
    const attempts=await env.DB.prepare('SELECT COUNT(*) AS count FROM auth_attempts WHERE ip_hash=? AND attempted_at>?').bind(ip,since).first();
    if(Number(attempts?.count||0)>=8)return json({error:'Too many attempts. Try again in 15 minutes.'},429);
    const config=await env.DB.prepare('SELECT pin_salt,pin_hash FROM app_config WHERE id=1').first();
    if(!config)return json({error:'Set up your PIN first.'},400);
    if(await hashPin(pin,config.pin_salt)!==config.pin_hash){
      await env.DB.prepare('INSERT INTO auth_attempts(ip_hash,attempted_at) VALUES(?,?)').bind(ip,Math.floor(Date.now()/1000)).run();
      return json({error:'Incorrect PIN.'},401);
    }
    await env.DB.prepare('DELETE FROM auth_attempts WHERE ip_hash=?').bind(ip).run();
    return json({ok:true},200,{'set-cookie':setCookie(await newSession(env))});
  }catch(error){
    return json({error:'PIN login failed: '+String(error?.message||error).slice(0,240)},500);
  }
}
if(path==='auth/logout'&&request.method==='POST'){const t=cookie(request);if(t)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(t)).run();return json({ok:true},200,{'set-cookie':setCookie('',0)})}
if(path==='bookmarks'&&request.method==='GET'){const r=await env.DB.prepare('SELECT id,name,url,category FROM bookmarks ORDER BY sort_order,id').all();return json({bookmarks:r.results||[]})}
if(!await session(request,env))return json({error:'Authentication required.'},401);

if(path==='bookmarks'&&request.method==='PUT'){const b=await request.json().catch(()=>null),items=Array.isArray(b)?b:b?.bookmarks;if(!Array.isArray(items)||items.length>500)return json({error:'Invalid bookmarks.'},400);const seen=new Set();for(const x of items){let u;try{u=new URL(x.url)}catch{return json({error:'Invalid bookmark URL.'},400)}if(!x||typeof x.id!=='string'||!x.id||x.id.length>100||seen.has(x.id)||typeof x.name!=='string'||!x.name.trim()||x.name.length>100||!['http:','https:'].includes(u.protocol)||typeof x.category!=='string'||x.category.length>40)return json({error:'Invalid bookmark.'},400);seen.add(x.id)}const stmts=[env.DB.prepare('DELETE FROM bookmarks'),...items.map((x,i)=>env.DB.prepare('INSERT INTO bookmarks(id,name,url,category,sort_order) VALUES(?,?,?,?,?)').bind(x.id,x.name.trim(),x.url,x.category,i))];await env.DB.batch(stmts);return json({ok:true})}
if(path==='workouts/plan'&&request.method==='GET'){const r=await env.DB.prepare('SELECT plan_json FROM plans WHERE id=1').first();return json({plan:r?JSON.parse(r.plan_json):null})}
if(path==='workouts/plan'&&request.method==='PUT'){const p=await request.json().catch(()=>null);if(!validPlan(p))return json({error:'Invalid plan. Check CSV columns and values.'},400);await env.DB.prepare('INSERT INTO plans(id,plan_json,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET plan_json=excluded.plan_json,updated_at=excluded.updated_at').bind(JSON.stringify(p),iso()).run();return json({ok:true})}
if(path==='workouts/logs'&&request.method==='GET'){const [r,rec]=await Promise.all([env.DB.prepare('SELECT * FROM workout_logs ORDER BY workout_date DESC,created_at DESC LIMIT 500').all(),env.DB.prepare('SELECT id,workout_date,exercise_id,exercise_name,duration_minutes,completed,created_at FROM recovery_logs ORDER BY workout_date DESC,created_at DESC LIMIT 500').all()]);const recovery=(rec.results||[]).map(x=>({...x,kind:'recovery'}));return json({logs:[...(r.results||[]),...recovery].sort((a,b)=>b.workout_date.localeCompare(a.workout_date))})}
if(path==='workouts/log'&&request.method==='POST'){const b=await request.json().catch(()=>({})),date=String(b.date||''),id=String(b.id||''),name=String(b.name||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^[\w-]{1,100}$/.test(id)||!name||name.length>120)return json({error:'Invalid workout entry.'},400);if(b.kind==='run'){const miles=+b.distance,secs=+b.durationSeconds;if(!Number.isFinite(miles)||miles<=0||miles>100||!Number.isInteger(secs)||secs<=0||secs>86400)return json({error:'Enter a valid distance and time.'},400);await env.DB.prepare("INSERT INTO workout_logs(id,workout_date,exercise_id,exercise_name,kind,completed,distance,duration_seconds,created_at) VALUES(?,?,?,?,'run',1,?,?,?) ON CONFLICT(workout_date,exercise_id) DO UPDATE SET distance=excluded.distance,duration_seconds=excluded.duration_seconds,completed=1,created_at=excluded.created_at").bind(crypto.randomUUID(),date,id,name,miles,secs,iso()).run()}else if(b.kind==='recovery'){const mins=+b.durationMinutes;if(!Number.isInteger(mins)||mins<1||mins>720)return json({error:'Enter recovery time between 1 and 720 minutes.'},400);await env.DB.prepare('INSERT INTO recovery_logs(id,workout_date,exercise_id,exercise_name,duration_minutes,completed,created_at) VALUES(?,?,?,?,?,1,?) ON CONFLICT(workout_date,exercise_id) DO UPDATE SET exercise_name=excluded.exercise_name,duration_minutes=excluded.duration_minutes,completed=1,created_at=excluded.created_at').bind(crypto.randomUUID(),date,id,name,mins,iso()).run()}else{const w=+b.weight,r=+b.actualReps,tr=+b.targetReps,s=+b.sets;if(!Number.isFinite(w)||w<0||w>3000||!Number.isInteger(r)||r<0||r>200||!Number.isInteger(tr)||tr<1||!Number.isInteger(s)||s<1||s>30)return json({error:'Invalid strength entry.'},400);await env.DB.prepare("INSERT INTO workout_logs(id,workout_date,exercise_id,exercise_name,kind,target_weight,target_reps,sets,actual_reps,completed,created_at) VALUES(?,?,?,?,'strength',?,?,?,?,1,?) ON CONFLICT(workout_date,exercise_id) DO UPDATE SET target_weight=excluded.target_weight,target_reps=excluded.target_reps,sets=excluded.sets,actual_reps=excluded.actual_reps,completed=1,created_at=excluded.created_at").bind(crypto.randomUUID(),date,id,name,w,tr,s,r,iso()).run()}return json({ok:true})}
return json({error:'Not found.'},404)}