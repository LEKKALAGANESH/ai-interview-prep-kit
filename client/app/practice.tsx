"use client";
import { useEffect, useState } from "react";

type Question={id:string;prompt:string;answer_outline:string;difficulty:number};
type Props={kitId:string;questions:Question[]};
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";

export default function PracticeSection({kitId,questions}:Props){
 const [data,setData]=useState<any>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[revealed,setRevealed]=useState(false),[submitting,setSubmitting]=useState(false);
 async function load(){setLoading(true);setError("");try{const r=await fetch(API+"/api/kits/"+encodeURIComponent(kitId)+"/practice");const d=await r.json();if(!r.ok)throw new Error(d.error?.message||"Practice load failed");setData(d)}catch(e){setError(e instanceof Error?e.message:"Practice load failed")}finally{setLoading(false)}}
 useEffect(()=>{void load()},[kitId]);
 async function nextSession(){setLoading(true);setError("");try{const r=await fetch(API+"/api/kits/"+encodeURIComponent(kitId)+"/practice",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"next_session"})});const d=await r.json();if(!r.ok)throw new Error(d.error?.message||"Could not start next session");setData(d);setRevealed(false)}catch(e){setError(e instanceof Error?e.message:"Could not start next session")}finally{setLoading(false)}}
 async function answer(confidence:string){const id=data?.queue?.[Math.min(data.state.current_index,data.queue.length-1)];if(!id)return;setSubmitting(true);setError("");try{const r=await fetch(API+"/api/kits/"+encodeURIComponent(kitId)+"/practice",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({question_id:id,confidence})});const d=await r.json();if(!r.ok)throw new Error(d.error?.message||"Practice update failed");setData(d);setRevealed(false)}catch(e){setError(e instanceof Error?e.message:"Practice update failed")}finally{setSubmitting(false)}}
 if(loading)return <div className="card">Loading practice...</div>;
 if(error)return <div role="alert" className="error">{error}</div>;
 if(!data)return null;
 const queue:string[]=data.queue||[], state=data.state, index=Math.min(state.current_index,Math.max(queue.length-1,0)), id=queue[index], q=questions.find(x=>x.id===id);
 return <div className="card practice"><h2>Practice Mode</h2>{!queue.length?<p>No questions are available for practice.</p>:state.completed?<><p>Practice session complete. 🎉</p><p>Low-confidence questions are prioritized for your next session.</p><button onClick={nextSession}>Start next session</button></>:!q?<p>Question unavailable.</p>:<><p className="progress">Question {state.current_index+1} of {queue.length}</p><h3>{q.prompt}</h3>{revealed&&<div className="answer"><strong>Answer outline</strong><p>{q.answer_outline}</p></div>}<button onClick={()=>setRevealed(true)} disabled={revealed||submitting}>Reveal answer</button>{revealed&&<div className="confidence"><p>How confident are you?</p>{["low","medium","high"].map(level=><button key={level} disabled={submitting} onClick={()=>answer(level)}>{level}</button>)}</div>}</>}<div className="practice-coverage"><strong>Requirements practiced:</strong> {data.coverage.covered_requirement_ids.length}/{data.coverage.covered_requirement_ids.length+data.coverage.uncovered_requirement_ids.length}</div></div>
}
