import type { KitStore } from "../persistence/store.js";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8"}});

export async function handlePins(request:Request,store:KitStore,kitId:string):Promise<Response>{
  const kit=await store.getById(kitId);
  if(!kit)return json({error:{code:"NOT_FOUND",message:"Kit not found"}},404);
  if(request.method==="GET")return json({pinned:await store.getPinnedQuestions(kitId)});
  if(request.method!=="POST")return json({error:{code:"METHOD_NOT_ALLOWED",message:"Only GET and POST are supported"}},405);
  let raw:unknown;try{raw=await request.json()}catch{return json({error:{code:"INVALID_JSON",message:"Request body must contain valid JSON"}},400)}
  if(!raw||typeof raw!=="object"||typeof (raw as {question_id?:unknown}).question_id!=="string")return json({error:{code:"VALIDATION_ERROR",message:"question_id is required"}},400);
  const questionId=(raw as {question_id:string}).question_id;
  if(!kit.questions.some(q=>q.id===questionId))return json({error:{code:"VALIDATION_ERROR",message:"Unknown question"}},422);
  const result=await store.withRequestLock(kitId,async()=>{
    const current=await store.getPinnedQuestions(kitId);
    const ids=new Set(current.question_ids);
    if(ids.has(questionId))ids.delete(questionId);else ids.add(questionId);
    return store.savePinnedQuestions(kitId,{question_ids:[...ids],updated_at:new Date().toISOString()});
  });
  return json({pinned:result});
}
