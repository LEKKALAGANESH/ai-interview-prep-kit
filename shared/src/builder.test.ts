import { test } from "node:test";
import assert from "node:assert/strict";
import { applyBuilderEdit, regenerateScopedQuestions, reorderQuestion } from "./builder.js";
import type { Kit } from "./kit.js";

function kit(): Kit {
  return {
    source:{company:"Example",company_url:"https://example.com/",role:"Engineer",location:"",jd_chars:1,researched_at:"now",pages_used:["https://example.com/"]},
    company_brief:{summary:"Example",what_they_do:"Example",sources:["https://example.com/"]},
    role:{title:"Engineer",seniority:"junior",responsibilities:[],requirements:[{id:"r1",text:"React",kind:"technical",priority:"must"}]},
    questions:[
      {id:"q1",requirement_ids:["r1"],category:"technical",prompt:"Q1",answer_outline:"A1",difficulty:1},
      {id:"q2",requirement_ids:["r1"],category:"technical",prompt:"Q2",answer_outline:"A2",difficulty:2}
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
  assert.equal(result.schedule.days[1].minutes,20);
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
