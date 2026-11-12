import {json,cookie,sha,secureCookie} from "../_lib/api.js";
export async function onRequestPost({request,env}){const token=cookie(request);if(token)await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha(token)).run();return json({ok:true},200,{"set-cookie":secureCookie("",0)})}
