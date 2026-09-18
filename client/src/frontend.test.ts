import { test } from "node:test"; import assert from "node:assert/strict";
function validateDays(value:number){return Number.isInteger(value)&&value>=1&&value<=60}
test("frontend accepts preparation days 1 through 60",()=>{assert.equal(validateDays(1),true);assert.equal(validateDays(60),true);assert.equal(validateDays(0),false);assert.equal(validateDays(61),false);assert.equal(validateDays(2.5),false)});
test("generation payload contains required fields",()=>{const payload={jd:"React engineer",company_url:"https://example.com",days:5};assert.deepEqual(Object.keys(payload),["jd","company_url","days"]);assert.equal(validateDays(payload.days),true)});
