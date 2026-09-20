import { buildPracticeQueue, practiceCoverage, recordPractice, startNextPracticeSession, CONFIDENCE_LEVELS, type Confidence } from "@trao/interview-prep-shared/practice.js";
import type { KitStore } from "../persistence/store.js";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8"}});

export async function handlePractice(request:Request,store:KitStore,kitId:string):Promise<Response>{
 const kit=await store.getById(kitId); if(!kit)return json({error:{code:"NOT_FOUND",message:"Kit not found"}},404);
 if(request.method==="GET"){const state=await store.getPractice(kitId);const queue=buildPracticeQueue(kit,state);const coverage=practiceCoverage(kit,state);return json({state,queue,coverage});}
 if(request.method!=="POST")return json({error:{code:"METHOD_NOT_ALLOWED",message:"Only GET and POST are supported"}},405);
 let raw:unknown;try{raw=await request.json()}catch{return json({error:{code:"INVALID_JSON",message:"Request body must contain valid JSON"}},400)}
 if(raw&&typeof raw==="object"&&"action" in raw&&(raw as {action?:unknown}).action==="next_session"){const state=await store.withRequestLock(kitId,async()=>{const current=await store.getPractice(kitId);return store.savePractice(kitId,startNextPracticeSession(current));});return json({state,queue:buildPracticeQueue(kit,state),coverage:practiceCoverage(kit,state)});}
 if(!raw||typeof raw!=="object"||!("question_id" in raw)||!("confidence" in raw))return json({error:{code:"VALIDATION_ERROR",message:"question_id and confidence are required"}},400);
 const body=raw as {question_id:unknown;confidence:unknown};if(typeof body.question_id!=="string"||!CONFIDENCE_LEVELS.includes(body.confidence as Confidence))return json({error:{code:"VALIDATION_ERROR",message:"Invalid question_id or confidence"}},400); const questionId=body.question_id; const confidence=body.confidence as Confidence;
 try{const state=await store.withRequestLock(kitId,async()=>{const current=await store.getPractice(kitId);return store.savePractice(kitId,recordPractice(kit,current,questionId,confidence));});const queue=buildPracticeQueue(kit,state);return json({state,queue,coverage:practiceCoverage(kit,state)});}catch(error){return json({error:{code:"PRACTICE_FAILED",message:error instanceof Error?error.message:"Practice update failed"}},422)}
}
