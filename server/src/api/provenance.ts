import type { KitStore } from "../persistence/store.js";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8"}});
export async function handleProvenance(request:Request,store:KitStore,kitId:string):Promise<Response>{
  if(request.method!=="GET")return json({error:{code:"METHOD_NOT_ALLOWED",message:"Only GET is supported"}},405);
  const kit=await store.getById(kitId);if(!kit)return json({error:{code:"NOT_FOUND",message:"Kit not found"}},404);
  return json({provenance:await store.getResearchProvenance(kitId)});
}
