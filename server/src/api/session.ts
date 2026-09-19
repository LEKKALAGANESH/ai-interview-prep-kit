import { randomBytes } from "node:crypto";

type Session={id:string;name:string;email:string;created_at:string};
const sessions=new Map<string,Session>();
const cookieName="prepkit_session";

function json(body:unknown,status=200,headers:Record<string,string>={}){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8",...headers}})}
function tokenFrom(request:Request){return request.headers.get("cookie")?.match(new RegExp(cookieName+"=([^;]+)"))?.[1]??null}

export async function handleSession(request:Request):Promise<Response>{
  if(request.method==="GET"){
    const token=tokenFrom(request);const session=token?sessions.get(token):undefined;
    return json({authenticated:Boolean(session),session:session??null});
  }
  if(request.method==="DELETE"){
    const token=tokenFrom(request);if(token)sessions.delete(token);
    return json({authenticated:false,session:null},{"headers":""} as any);
  }
  if(request.method!=="POST")return json({error:{code:"METHOD_NOT_ALLOWED",message:"Only GET, POST and DELETE are supported"}},405);
  let raw:unknown;try{raw=await request.json()}catch{return json({error:{code:"INVALID_JSON",message:"Request body must contain valid JSON"}},400)}
  if(!raw||typeof raw!=="object")return json({error:{code:"VALIDATION_ERROR",message:"Session details are required"}},400);
  const body=raw as {name?:unknown;email?:unknown};
  const name=typeof body.name==="string"?body.name.trim():"";const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
  if(name.length<2||!/^\S+@\S+\.\S+$/.test(email))return json({error:{code:"VALIDATION_ERROR",message:"Enter a valid name and email"}},422);
  const token=randomBytes(24).toString("hex");const session={id:token,name,email,created_at:new Date().toISOString()};sessions.set(token,session);
  return json({authenticated:true,session},{headers:{"set-cookie":`${cookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`}} as any);
}
