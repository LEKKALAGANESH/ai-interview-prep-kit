import test from "node:test";
import assert from "node:assert/strict";
import { cleanHtml } from "./clean-html.js";

test("removes non-content elements and decodes common entities", () => {
  const page = cleanHtml('<title>  Example  </title><script>alert(1)</script><style>x{}</style><h1>Hello&nbsp;&amp; welcome</h1><noscript>hidden</noscript>');
  assert.equal(page.title, "Example");
  assert.equal(page.text, "Hello & welcome");
});

test("extracts unique non-fragment links", () => {
  const page = cleanHtml('<a href="/careers">Careers</a><a href="/careers">Again</a><a href="#team">Team</a>');
  assert.deepEqual(page.links, ["/careers"]);
});
