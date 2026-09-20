import { KitSchema } from "@trao/interview-prep-shared/kit.js";
import { applyBuilderEdit } from "@trao/interview-prep-shared/builder.js";
import type { KitStore } from "../persistence/store.js";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8"}});

// Pin state lives on the kit (question.pinned); this route keeps the old {pinned:{question_ids}} response shape.
const pinnedState=(kit:{questions:{id:string;pinned?:boolean}[]})=>({question_ids:kit.questions.filter(q=>q.pinned).map(q=>q.id),updated_at:new Date().toISOString()});

export async function handlePins(request:Request,store:KitStore,kitId:string):Promise<Response>{
  const kit=await store.getById(kitId);
  if(!kit)return json({error:{code:"NOT_FOUND",message:"Kit not found"}},404);
  if(request.method==="GET")return json({pinned:pinnedState(kit)});
  if(request.method!=="POST")return json({error:{code:"METHOD_NOT_ALLOWED",message:"Only GET and POST are supported"}},405);
  let raw:unknown;try{raw=await request.json()}catch{return json({error:{code:"INVALID_JSON",message:"Request body must contain valid JSON"}},400)}
  if(!raw||typeof raw!=="object"||typeof (raw as {question_id?:unknown}).question_id!=="string")return json({error:{code:"VALIDATION_ERROR",message:"question_id is required"}},400);
  const questionId=(raw as {question_id:string}).question_id;
  if(!kit.questions.some(q=>q.id===questionId))return json({error:{code:"VALIDATION_ERROR",message:"Unknown question"}},422);
  const saved=await store.withRequestLock(kitId,async()=>{
    const current=await store.getById(kitId);
    if(!current)throw new Error("Kit not found");
    return store.update(kitId,KitSchema.parse(applyBuilderEdit(current,{type:"pin_question",question_id:questionId})));
  });
  return json({pinned:pinnedState(saved)});
}
