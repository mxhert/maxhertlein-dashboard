export const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});
export const cookieName="mh_workout_session";
export async function sha(value){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("")}
export function cookie(request){return (request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(cookieName+"="))?.slice(cookieName.length+1)||""}
export async function authorized(request,env){const token=cookie(request);if(!token)return false;const hash=await sha(token);const row=await env.DB.prepare("SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>?").bind(hash,Date.now()).first();return !!row}
export function secureCookie(value,maxAge){return cookieName+"="+value+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age="+maxAge}
export async function requireAuth(request,env){if(!await authorized(request,env))return json({error:"Unauthorized"},401);return null}
export async function body(request){try{return await request.json()}catch{return null}}
export function sameOrigin(request){const origin=request.headers.get("Origin");return !origin||origin===new URL(request.url).origin}
