import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseYear,
  parseSession,
  parseTimezone,
  parsePaper,
  parseDifficulty,
  parseMarks,
  inferDifficulty,
  humanize,
  htmlToStatement,
  extractDisplayLatex,
  fromApiRecord,
  fromDomRaw,
  isValid,
  dedupe,
  findQuestionArray,
} from "./normalize.mjs";
import { FIXTURE_QUESTIONS, FIXTURE_BANK } from "./fixtures/data.mjs";

test("parseYear pulls a 4-digit year out of noisy strings", () => {
  assert.equal(parseYear("May 2023 TZ1"), 2023);
  assert.equal(parseYear(2021), 2021);
  assert.equal(parseYear("no year here"), null);
});

test("parseSession normalizes May/November variants", () => {
  assert.equal(parseSession("May"), "May");
  assert.equal(parseSession("M/J"), "May");
  assert.equal(parseSession("November"), "November");
  assert.equal(parseSession("N/D 2022"), "November");
  assert.equal(parseSession("unknown"), null);
});

test("parseTimezone normalizes TZ variants", () => {
  assert.equal(parseTimezone("tz1"), "TZ1");
  assert.equal(parseTimezone("Time Zone 2"), "TZ2");
  assert.equal(parseTimezone("none"), null);
});

test("parsePaper handles 'Paper 2' and 'P2'", () => {
  assert.equal(parsePaper("Paper 3"), "Paper 3");
  assert.equal(parsePaper("P1"), "Paper 1");
  assert.equal(parsePaper("Paper 4"), null);
});

test("parseDifficulty reads integers and words", () => {
  assert.equal(parseDifficulty(4), 4);
  assert.equal(parseDifficulty("hard"), 4);
  assert.equal(parseDifficulty("easy"), 2);
  assert.equal(parseDifficulty("7"), null);
});

test("parseMarks extracts a positive mark count", () => {
  assert.equal(parseMarks("[8 marks]"), 8);
  assert.equal(parseMarks("12"), 12);
  assert.equal(parseMarks(0), null);
  assert.equal(parseMarks("no marks"), null);
});

test("inferDifficulty scales with mark weight and clamps to 1-5", () => {
  assert.equal(inferDifficulty(null), 3);
  assert.equal(inferDifficulty(2), 1);
  assert.equal(inferDifficulty(5), 2);
  assert.equal(inferDifficulty(8), 3);
  assert.equal(inferDifficulty(10), 4);
  assert.equal(inferDifficulty(15), 5);
});

test("fromApiRecord maps every fixture record into the target schema", () => {
  for (const rec of FIXTURE_QUESTIONS) {
    const q = fromApiRecord(rec);
    assert.ok(isValid(q), `invalid: ${JSON.stringify(q)}`);
    assert.equal(typeof q.year, "number");
    assert.ok(["May", "November"].includes(q.session));
    assert.ok(["TZ1", "TZ2"].includes(q.timezone));
    assert.ok(["Paper 1", "Paper 2", "Paper 3"].includes(q.paper));
    assert.ok(Number.isInteger(q.difficulty) && q.difficulty >= 1 && q.difficulty <= 5);
    assert.equal(q.marks, rec.marks);
    assert.equal(q.topic, rec.topic);
    assert.equal(q.subtopic, rec.subtopic);
    assert.ok(q.statement.length > 0);
    if (rec.tex) assert.equal(q.latex, rec.tex);
    if (rec.image) assert.equal(q.image_url, rec.image);
  }
});

test("fromApiRecord prefers latex over image and never emits both", () => {
  const q = fromApiRecord({ year: 2020, question: "x", tex: "a^2", image: "u.png", marks: 4 });
  assert.equal(q.latex, "a^2");
  assert.equal(q.image_url, undefined);
});

test("fromDomRaw parses a rendered card's raw fields", () => {
  const q = fromDomRaw({
    meta: "November 2022 · TZ2 · Paper 2",
    statement: "Find the vector equation of the plane.",
    topic: "Vectors",
    subtopic: "Planes",
    difficulty: "4",
    marks: "[9 marks]",
    latex: "\\mathbf{r}",
    imageUrl: "",
  });
  assert.equal(q.year, 2022);
  assert.equal(q.session, "November");
  assert.equal(q.timezone, "TZ2");
  assert.equal(q.paper, "Paper 2");
  assert.equal(q.marks, 9);
  assert.equal(q.difficulty, 4);
  assert.equal(q.latex, "\\mathbf{r}");
  assert.ok(isValid(q));
});

test("fromDomRaw infers difficulty when the card omits it", () => {
  const q = fromDomRaw({ meta: "May 2023 TZ1 Paper 1", statement: "x", marks: "[12 marks]" });
  assert.equal(q.difficulty, 5);
});

test("isValid requires content but treats exam year as optional", () => {
  assert.equal(isValid({ year: 2023, statement: "x" }), true);
  assert.equal(isValid({ year: null, statement: "x" }), true);
  assert.equal(isValid({ latex: "a^2" }), true);
  assert.equal(isValid({ year: 2023 }), false);
  assert.equal(isValid(null), false);
});

test("dedupe removes records with identical identity", () => {
  const a = { year: 2023, session: "May", timezone: "TZ1", paper: "Paper 1", statement: "x" };
  const b = { ...a };
  const c = { ...a, statement: "y" };
  assert.equal(dedupe([a, b, c]).length, 2);
});

test("findQuestionArray locates records nested in an API envelope", () => {
  const arr = findQuestionArray({ data: { questions: FIXTURE_QUESTIONS } });
  assert.ok(Array.isArray(arr));
  assert.equal(arr.length, FIXTURE_QUESTIONS.length);
});

test("findQuestionArray returns null for unrelated payloads", () => {
  assert.equal(findQuestionArray({ user: { name: "x" } }), null);
  assert.equal(findQuestionArray([1, 2, 3]), null);
});

test("humanize formats slugs and single words but preserves readable labels", () => {
  assert.equal(humanize("differential-calculus"), "Differential Calculus");
  assert.equal(humanize("differentiation"), "Differentiation");
  assert.equal(humanize("Differential calculus"), "Differential calculus");
  assert.equal(humanize(""), "");
});

test("htmlToStatement strips tags and keeps KaTeX-friendly math delimiters", () => {
  const html = String.raw`<p>Consider <span class="math">\(y = x^2\)</span>.</p> <p class="question">a) Find \(\frac{dy}{dx}\).</p>`;
  const s = htmlToStatement(html);
  assert.equal(s, String.raw`Consider $y = x^2$. a) Find $\frac{dy}{dx}$.`);
});

test("extractDisplayLatex pulls display blocks and ignores inline math", () => {
  assert.equal(extractDisplayLatex(String.raw`<p>\[ \int_0^1 x\,dx \]</p>`), String.raw`\int_0^1 x\,dx`);
  assert.equal(extractDisplayLatex(String.raw`inline \(x^2\) only`), null);
});

test("fromApiRecord maps Edunade-shaped records (chapter, HTML math, no year)", () => {
  for (const rec of FIXTURE_BANK) {
    const q = fromApiRecord(rec);
    assert.ok(isValid(q), `invalid: ${JSON.stringify(q)}`);
    assert.equal(q.year, null);
    assert.equal(q.session, null);
    assert.equal(q.timezone, null);
    assert.equal(q.paper, rec.paper === "paper1" ? "Paper 1" : "Paper 2");
    assert.equal(q.marks, Number(rec.marks));
    assert.ok(Number.isInteger(q.difficulty) && q.difficulty >= 1 && q.difficulty <= 5);
    assert.ok(q.statement.length > 0 && !q.statement.includes("<p>"));
    assert.ok(q.topic, "expected a topic derived from chapter");
  }
  const easy = fromApiRecord(FIXTURE_BANK[0]);
  assert.equal(easy.difficulty, 2);
  assert.equal(easy.topic, "Differentiation");
  const display = fromApiRecord(FIXTURE_BANK[2]);
  assert.ok(display.latex && display.latex.includes("int_"));
});

test("fromApiRecord uses crawl context for topic and chapter for subtopic", () => {
  const q = fromApiRecord(FIXTURE_BANK[0], { topic: "Differential Calculus" });
  assert.equal(q.topic, "Differential Calculus");
  assert.equal(q.subtopic, "Differentiation");
});

test("findQuestionArray recognizes chapter-organized records without a year", () => {
  const arr = findQuestionArray({ questions: FIXTURE_BANK, metadata: {} });
  assert.ok(Array.isArray(arr));
  assert.equal(arr.length, FIXTURE_BANK.length);
});

test("fromApiRecord captures the answer field as a markscheme", () => {
  const rec = {
    question: "<p>Find \\( u_5 \\)</p>",
    answer: '<p class="answers-ms"><strong>a)</strong></p><p><span class="math">\\[ u_5 = 15*(\\frac{1}{3})^4 \\]</span></p>',
    marks: "7",
    chapter: "sequences",
  };
  const out = fromApiRecord(rec, { topic: "Sequences" });
  assert.ok(out.markscheme, "markscheme should be present");
  assert.ok(!/<[a-z]/i.test(out.markscheme), "no HTML tags");
  assert.ok(out.markscheme.includes("$$"), "display math converted to $$");
});

test("fromApiRecord omits markscheme when no answer is present", () => {
  const out = fromApiRecord({ question: "Plain question", marks: "3" }, {});
  assert.equal(out.markscheme, undefined);
});