"use client";
import { useEffect, useState } from "react";
import { friendlyError } from "./api";

type Question={id:string;prompt:string;answer_outline:string;difficulty:number};
type Props={kitId:string;questions:Question[]};
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";

function Badge({children}:{children:React.ReactNode}){return <span className="badge">{children}</span>}

export default function PracticeSection({kitId,questions}:Props){
 const[data,setData]=useState<any>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[revealed,setRevealed]=useState(false),[submitting,setSubmitting]=useState(false);
 async function load(){setLoading(true);setError("");try{const r=await fetch(API+"/api/kits/"+encodeURIComponent(kitId)+"/practice",{credentials:"include"});const d=await r.json();if(!r.ok)throw new Error(d.error?.message||"Practice load failed");setData(d)}catch(e){setError(friendlyError(e,"Practice load failed"))}finally{setLoading(false)}}
 useEffect(()=>{void load()},[kitId]);
 async function nextSession(){setLoading(true);setError("");try{const r=await fetch(API+"/api/kits/"+encodeURIComponent(kitId)+"/practice",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({action:"next_session"})});const d=await r.json();if(!r.ok)throw new Error(d.error?.message||"Could not start next session");setData(d);setRevealed(false)}catch(e){setError(friendlyError(e,"Could not start next session"))}finally{setLoading(false)}}
 async function answer(confidence:string){const id=data?.queue?.[Math.min(data.state.current_index,data.queue.length-1)];if(!id)return;setSubmitting(true);setError("");try{const r=await fetch(API+"/api/kits/"+encodeURIComponent(kitId)+"/practice",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({question_id:id,confidence})});const d=await r.json();if(!r.ok)throw new Error(d.error?.message||"Practice update failed");setData(d);setRevealed(false)}catch(e){setError(friendlyError(e,"Practice update failed"))}finally{setSubmitting(false)}}
 if(loading)return <section className="panel practice-panel" role="status" aria-live="polite"><div className="progress-banner"><span className="spinner"/> Loading your practice session…</div></section>;
 if(error)return <section className="panel practice-panel" role="alert"><div className="alert"><strong>Practice error.</strong><span>{error}</span></div></section>;
 if(!data)return null;
 const queue:string[]=data.queue||[],state=data.state,index=Math.min(state.current_index,Math.max(queue.length-1,0)),id=queue[index],q=questions.find(x=>x.id===id),progress=queue.length?Math.round(Math.min(state.current_index,queue.length)/queue.length*100):0;
 if(!queue.length)return <section className="panel practice-panel practice-empty"><h3>No questions to practice yet</h3><p>Add questions to your kit, then come back here.</p></section>;
 return <section className="panel practice-panel">
  <div className="practice-head"><div><p className="eyebrow">Practice session</p><h2>{state.completed?"Session complete":"One question at a time"}</h2></div><Badge>{state.completed?"Complete":"In progress"}</Badge></div>
  <div className="practice-progress" aria-label={"Practice progress "+progress+"%"}><span style={{width:progress+"%"}}/></div>
  {state.completed?<div className="practice-empty"><h3>Nice work. 🎉</h3><p>Low-confidence questions are prioritized for your next session.</p><button className="primary-small" onClick={nextSession}>Start next session</button></div>:!q?<div className="practice-empty"><h3>Question unavailable</h3><p>This question is no longer in the kit.</p></div>:<>
   <div className="question-meta"><Badge>Question {state.current_index+1} of {queue.length}</Badge><Badge>Difficulty {q.difficulty}/3</Badge></div>
   <h3 className="practice-question">{q.prompt}</h3>
   {!revealed?<button className="primary-small" onClick={()=>setRevealed(true)} disabled={submitting}>Reveal answer outline</button>:<div className="answer-card"><strong>Answer outline</strong><p>{q.answer_outline}</p></div>}
   {revealed&&<div className="confidence-row"><span className="field-label" style={{width:"100%"}}>How confident are you?</span>{["low","medium","high"].map(level=><button key={level} disabled={submitting} onClick={()=>answer(level)}>{level[0].toUpperCase()+level.slice(1)}</button>)}</div>}
  </>}
  <div style={{marginTop:24,paddingTop:14,borderTop:"1px solid #edf0f3",color:"#858c97",fontSize:11}}>Requirements practiced: <strong style={{color:"#30343b"}}>{data.coverage.covered_requirement_ids.length}/{data.coverage.covered_requirement_ids.length+data.coverage.uncovered_requirement_ids.length}</strong></div>
 </section>
}
