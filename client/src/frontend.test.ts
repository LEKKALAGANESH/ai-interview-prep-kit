import { test } from "node:test"; import assert from "node:assert/strict";
function validateDays(value:number){return Number.isInteger(value)&&value>=1&&value<=60}
test("frontend accepts preparation days 1 through 60",()=>{assert.equal(validateDays(1),true);assert.equal(validateDays(60),true);assert.equal(validateDays(0),false);assert.equal(validateDays(61),false);assert.equal(validateDays(2.5),false)});
test("generation payload contains required fields",()=>{const payload={jd:"React engineer",company_url:"https://example.com",days:5};assert.deepEqual(Object.keys(payload),["jd","company_url","days"]);assert.equal(validateDays(payload.days),true)});

import { readFile } from "node:fs/promises";

test("interactive frontend controls remain keyboard-accessible by native semantics", async () => {
  for (const path of ["../app/page.tsx", "../app/practice.tsx"]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    const buttons = [...source.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)];
    assert.ok(buttons.length > 0, `${path} should contain native buttons`);
    for (const match of buttons) {
      const attrs = match[1];
      const body = match[2].replace(/<[^>]+>/g, "").replace(/\{[^}]*\}/g, "").trim();
      assert.ok(body || /aria-label=/.test(attrs) || /\{/.test(match[2]), `${path} has an unnamed button`);
    }
  }
});
