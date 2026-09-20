import { test } from "node:test";
import assert from "node:assert/strict";
import { applyBuilderEdit, regenerateCategory, regenerateScopedQuestions, reorderQuestion } from "./builder.js";
import type { Kit } from "./kit.js";

function kit(): Kit {
  return {
    source:{company:"Example",company_url:"https://example.com/",role:"Engineer",location:"",jd_chars:1,researched_at:"now",pages_used:["https://example.com/"]},
    company_brief:{summary:"Example",what_they_do:"Example",sources:["https://example.com/"]},
    role:{title:"Engineer",seniority:"junior",responsibilities:[],requirements:[{id:"r1",text:"React",kind:"technical",priority:"must"},{id:"r2",text:"Node",kind:"technical",priority:"nice"}]},
    questions:[
      {id:"q1",requirement_ids:["r1"],category:"technical",prompt:"Q1",answer_outline:"A1",difficulty:1},
      {id:"q2",requirement_ids:["r2"],category:"technical",prompt:"Q2",answer_outline:"A2",difficulty:2}
    ],
    flashcards:[],
    schedule:{days_available:2,days:[
      {day:1,focus:"React",question_ids:["q1"],minutes:10},
      {day:2,focus:"React",question_ids:["q2"],minutes:10}
    ]},
    coverage:{uncovered_requirement_ids:[],passes:1}
  };
}

test("edits question without changing IDs",()=> {
  const result=applyBuilderEdit(kit(),{type:"edit_question",question_id:"q1",prompt:"Edited",answer_outline:"Edited answer"});
  assert.equal(result.questions[0].prompt,"Edited");
  assert.equal(result.questions[0].id,"q1");
});

test("reorders and moves questions while keeping valid schedule",()=> {
  const result=reorderQuestion(kit(),"q1",2,0);
  assert.deepEqual(result.schedule.days[0].question_ids,[]);
  assert.deepEqual(result.schedule.days[1].question_ids,["q1","q2"]);
  assert.equal(result.schedule.days[1].minutes,25);
});

test("adds and deletes questions",()=> {
  const added=applyBuilderEdit(kit(),{type:"add_question",day:1,question:{id:"q3",requirement_ids:["r1"],category:"technical",prompt:"Q3",answer_outline:"A3",difficulty:1}});
  assert.deepEqual(added.schedule.days[0].question_ids,["q1","q3"]);
  const deleted=applyBuilderEdit(added,{type:"delete_question",question_id:"q1"});
  assert.equal(deleted.questions.some(q=>q.id==="q1"),false);
  assert.deepEqual(deleted.schedule.days[0].question_ids,["q3"]);
});

test("scoped regeneration preserves non-scoped questions",()=> {
  const result=regenerateScopedQuestions(kit(),["q2"],[{id:"q2",requirement_ids:["r1"],category:"technical",prompt:"Regenerated",answer_outline:"New",difficulty:3}]);
  assert.equal(result.questions[0].prompt,"Q1");
  assert.equal(result.questions[1].prompt,"Regenerated");
  assert.equal(result.questions[1].difficulty,3);
});


test("recalculates coverage after deleting the only covered question",()=> {
  const result=applyBuilderEdit(kit(),{type:"delete_question",question_id:"q1"});
  assert.deepEqual(result.coverage.uncovered_requirement_ids,["r1"]);
});


test("edits flashcard content and preserves its stable ID",()=> {
  const base=kit();
  base.flashcards=[{id:"fc_q1",front:"Q1",back:"A1",requirement_ids:["r1"]}];
  const result=applyBuilderEdit(base,{type:"edit_flashcard",flashcard_id:"fc_q1",front:"Edited front",back:"Edited back"});
  assert.deepEqual(result.flashcards[0],{id:"fc_q1",front:"Edited front",back:"Edited back",requirement_ids:["r1"],origin:"edited"});
  assert.equal(result.questions[0].prompt,"Q1");
});

test("edits company brief fields without changing questions or flashcards",()=> {
  const base=kit();
  base.flashcards=[{id:"fc_q1",front:"Q1",back:"A1",requirement_ids:["r1"]}];
  const result=applyBuilderEdit(base,{
    type:"edit_company_brief",
    summary:"Updated summary",
    what_they_do:"Updated description",
    sources:["https://example.com/about"]
  });
  assert.deepEqual(result.company_brief,{summary:"Updated summary",what_they_do:"Updated description",sources:["https://example.com/about"]});
  assert.deepEqual(result.questions,base.questions);
  assert.deepEqual(result.flashcards,base.flashcards);
});

test("invalid flashcard and company brief edits are rejected",()=> {
  const base=kit();
  base.flashcards=[{id:"fc_q1",front:"Q1",back:"A1",requirement_ids:["r1"]}];
  assert.throws(()=>applyBuilderEdit(base,{type:"edit_flashcard",flashcard_id:"fc_q1",front:""}));
  assert.throws(()=>applyBuilderEdit(base,{type:"edit_company_brief",sources:["not-a-url"]}));
});

function richKit(): Kit {
  const base = kit();
  base.questions = [
    {id:"q1",requirement_ids:["r1"],category:"technical",prompt:"Q1",answer_outline:"A1",difficulty:1},
    {id:"q2",requirement_ids:["r1"],category:"technical",prompt:"Q2",answer_outline:"A2",difficulty:2},
    {id:"q3",requirement_ids:["r2"],category:"technical",prompt:"Q3",answer_outline:"A3",difficulty:2},
    {id:"q4",requirement_ids:["r2"],category:"behavioural",prompt:"Q4",answer_outline:"A4",difficulty:2},
  ];
  base.schedule.days = [
    {day:1,focus:"a",question_ids:["q1","q3"],minutes:20},
    {day:2,focus:"b",question_ids:["q2","q4"],minutes:20},
  ];
  return base;
}

test("edit, add and pin set origin and pinned",()=> {
  let k = applyBuilderEdit(richKit(),{type:"edit_question",question_id:"q1",prompt:"Mine"});
  assert.equal(k.questions[0].origin,"edited");
  k = applyBuilderEdit(k,{type:"add_question",day:1,question:{id:"m1",requirement_ids:["r1"],category:"technical",prompt:"M",answer_outline:"M",difficulty:1}});
  assert.equal(k.questions.find(q=>q.id==="m1")?.origin,"manual");
  k = applyBuilderEdit(k,{type:"pin_question",question_id:"q2"});
  assert.equal(k.questions.find(q=>q.id==="q2")?.pinned,true);
  assert.equal(applyBuilderEdit(k,{type:"pin_question",question_id:"q2"}).questions.find(q=>q.id==="q2")?.pinned,false);
});

test("category regeneration keeps edited, manual and pinned questions and other categories",()=> {
  let k = applyBuilderEdit(richKit(),{type:"edit_question",question_id:"q1",prompt:"Mine"});
  k = applyBuilderEdit(k,{type:"add_question",day:1,question:{id:"m1",requirement_ids:["r1"],category:"technical",prompt:"M",answer_outline:"M",difficulty:1}});
  k = applyBuilderEdit(k,{type:"pin_question",question_id:"q2"});
  const out = regenerateCategory(k,"technical",[
    {id:"q1",requirement_ids:["r1"],category:"technical",prompt:"clobber",answer_outline:"x",difficulty:1},
    {id:"q3",requirement_ids:["r2"],category:"technical",prompt:"Fresh",answer_outline:"F",difficulty:3},
    {id:"q9",requirement_ids:["r2"],category:"technical",prompt:"New",answer_outline:"N",difficulty:1},
  ]);
  const byId = (id:string)=>out.questions.find(q=>q.id===id);
  assert.equal(byId("q1")?.prompt,"Mine");
  assert.equal(byId("m1")?.origin,"manual");
  assert.equal(byId("q2")?.pinned,true);
  assert.equal(byId("q3")?.prompt,"Fresh");
  assert.equal(byId("q4")?.prompt,"Q4");
  assert.ok(out.schedule.days.flatMap(d=>d.question_ids).includes("q9"));
  assert.deepEqual(out.schedule.days.flatMap(d=>d.question_ids).filter(id=>!out.questions.some(q=>q.id===id)),[]);
});

test("schedule regeneration keeps pinned questions on their day",()=> {
  const k = applyBuilderEdit(richKit(),{type:"pin_question",question_id:"q4"});
  const out = applyBuilderEdit(k,{type:"regenerate_schedule"});
  assert.equal(out.schedule.days.length,2);
  assert.ok(out.schedule.days[1].question_ids.includes("q4"));
  assert.equal(out.schedule.days.flatMap(d=>d.question_ids).length,4);
});
