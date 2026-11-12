import {json,body,sha,secureCookie} from "../_lib/api.js";
export async function onRequestPost({request,env}) {
 const data=await body(request);if(!data||typeof data.pin!=="string"||!env.PIN_HASH)return json({error:"Invalid request"},400);
 const ip=request.headers.get("CF-Connecting-IP")||"unknown",ipHash=await sha(ip),now=Date.now();
 let row=await env.DB.prepare("SELECT attempts,window_start FROM pin_attempts WHERE ip_hash=?").bind(ipHash).first();
 if(row&&now-row.window_start<15*60*1000&&row.attempts>=8)return json({error:"Too many attempts. Try again in 15 minutes."},429);
 if(!row||now-row.window_start>=15*60*1000){await env.DB.prepare("INSERT OR REPLACE INTO pin_attempts(ip_hash,attempts,window_start) VALUES(?,0,?)").bind(ipHash,now).run();row={attempts:0,window_start:now}}
 const supplied=await sha(data.pin),expected=env.PIN_HASH.trim().toLowerCase();
 if(supplied!==expected){await env.DB.prepare("UPDATE pin_attempts SET attempts=attempts+1 WHERE ip_hash=?").bind(ipHash).run();return json({error:"Incorrect PIN"},401)}
 await env.DB.prepare("DELETE FROM pin_attempts WHERE ip_hash=?").bind(ipHash).run();
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
 await env.DB.prepare("INSERT INTO sessions(token_hash,expires_at) VALUES(?,?)").bind(await sha(token),now+7*24*60*60*1000).run();
 return json({ok:true},200,{"set-cookie":secureCookie(token,7*24*60*60)});
}
