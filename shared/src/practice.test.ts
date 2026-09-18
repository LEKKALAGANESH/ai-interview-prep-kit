import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPracticeQueue, practiceCoverage, recordPractice } from "./practice.js";
import type { Kit } from "./kit.js";

const kit = (): Kit => ({
 source:{company:"Example",company_url:"https://example.com",role:"Engineer",location:"",jd_chars:1,researched_at:"now",pages_used:["https://example.com"]},
 company_brief:{summary:"",what_they_do:"",sources:[]},
 role:{title:"Engineer",seniority:"junior",responsibilities:[],requirements:[
  {id:"r1",text:"React",kind:"technical",priority:"must"},{id:"r2",text:"Node",kind:"technical",priority:"nice"}]},
 questions:[
  {id:"q1",requirement_ids:["r1"],category:"technical",prompt:"Q1",answer_outline:"A1",difficulty:1},
  {id:"q2",requirement_ids:["r2"],category:"technical",prompt:"Q2",answer_outline:"A2",difficulty:2}],
 flashcards:[],
 schedule:{days_available:1,days:[{day:1,focus:"Practice",question_ids:["q1","q2"],minutes:20}]},
 coverage:{uncovered_requirement_ids:[],passes:1}
});

test("records confidence and completes after final question",()=>{
 const k=kit(); let state={current_index:0,results:[],completed:false};
 state=recordPractice(k,state,"q1","low","2026-01-01T00:00:00.000Z");
 assert.equal(state.results[0].confidence,"low");
 state=recordPractice(k,state,"q2","high","2026-01-01T00:01:00.000Z");
 assert.equal(state.completed,true);
});

test("low-confidence items are prioritized in the next queue",()=>{
 const k=kit(); const state={current_index:0,results:[{question_id:"q2",confidence:"low",practiced_at:"now"}],completed:false};
 assert.deepEqual(buildPracticeQueue(k,state),["q2","q1"]);
});

test("coverage reports requirements reached by practiced questions",()=>{
 const result=practiceCoverage(kit(),{current_index:1,results:[{question_id:"q1",confidence:"high",practiced_at:"now"}],completed:false});
 assert.deepEqual(result.covered_requirement_ids,["r1"]);
 assert.deepEqual(result.uncovered_requirement_ids,["r2"]);
});
