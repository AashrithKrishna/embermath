import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collapseEmptyDisplay,
  escapeCurrency,
  fixDollarGlyphs,
  repairField,
  restoreStrippedInline,
} from "./repair-latex.mjs";
import { lintText, splitMath } from "./lib/bank-lint.mjs";

test("escapeCurrency escapes money but keeps math", () => {
  assert.equal(escapeCurrency("It costs $12,000 into $x$"), "It costs \\$12,000 into $x$");
  assert.equal(escapeCurrency("pay 10000$ per year"), "pay 10000\\$ per year");
  assert.equal(escapeCurrency("$2, 3, 5$ and $5$"), "$2, 3, 5$ and $5$");
  assert.equal(escapeCurrency("Comparing $32nx$ with $96x$"), "Comparing $32nx$ with $96x$");
  assert.equal(escapeCurrency("costs $8.80. Find $c$."), "costs \\$8.80. Find $c$.");
});

test("collapseEmptyDisplay only collapses an empty opener", () => {
  assert.equal(collapseEmptyDisplay("$$a$$ $$b$$"), "$$a$$ $$b$$");
  assert.equal(collapseEmptyDisplay("so: $$ $$P(A)=1$$ next"), "so: $$P(A)=1$$ next");
});

test("fixDollarGlyphs handles ($) labels and $$$", () => {
  assert.equal(fixDollarGlyphs("$\\bar{x} = 5 \\ ($)$"), "$\\bar{x} = 5 \\ (\\$)$");
  assert.equal(fixDollarGlyphs("$$C = 1.13$$$"), "$$C = 1.13$$");
});

test("restoreStrippedInline rebuilds \\(..\\) whose backslashes were lost", () => {
  assert.equal(restoreStrippedInline("as (x \\to \\pm\\infty). c)"), "as $x \\to \\pm\\infty$. c)");
  assert.equal(restoreStrippedInline("f(x \\to 1)"), "f(x \\to 1)");
  assert.equal(restoreStrippedInline("(as shown \\to here)"), "(as shown \\to here)");
});

test("repairField leaves clean text untouched and fixes broken text", () => {
  const clean = "Find $x$ when $$x^2=4.$$";
  assert.equal(repairField(clean), clean);
  const broken = "Pay $10,000 then: \\begin{align*} y &= 1 \\end{align*} and &le; 3";
  const fixed = repairField(broken);
  assert.equal(lintText(fixed).length, 0);
  assert.match(fixed, /\$\$\\begin\{align\*\}/);
  assert.match(fixed, /≤ 3$/);
  assert.equal(splitMath(fixed).unclosed, -1);
  assert.equal(repairField(fixed), fixed); // idempotent
});
