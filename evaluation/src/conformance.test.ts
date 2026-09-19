import test from "node:test";
import assert from "node:assert/strict";
import { auditKit, auditEvaluation } from "./conformance.js";

test("rejects Appendix A question references to unknown requirements", () => {
 const result = auditKit({source:{company:"Example",company_url:"https://example.com/",role:"Engineer",location:"",jd_chars:1,researched_at:"2026-09-19T00:00:00Z",pages_used:[]},company_brief:{summary:"",what_they_do:"",sources:[]},role:{title:"Engineer",seniority:"Junior",responsibilities:[],requirements:[{id:"r1",text:"React",kind:"technical",priority:"must"}]},questions:[{id:"q1",requirement_ids:["missing"],category:"technical",prompt:"React?",answer_outline:"Answer",difficulty:2}],flashcards:[],schedule:{days_available:1,days:[{day:1,focus:"React",question_ids:["q1"],minutes:10}]},coverage:{uncovered_requirement_ids:["r1"],passes:1}});
 assert.equal(result.valid,false);
});
test("accepts a structurally valid Appendix B envelope", () => assert.equal(auditEvaluation({version:"1.0",generated_at:"2026-09-19T00:00:00Z",kits:[]}).valid,true));
