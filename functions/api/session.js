import {json,authorized} from "../_lib/api.js";
export async function onRequestGet({request,env}){return json({authenticated:await authorized(request,env)})}
