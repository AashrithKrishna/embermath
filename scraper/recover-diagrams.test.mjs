import { test } from "node:test";
import assert from "node:assert/strict";
import katex from "katex";
import {
  arrayFromCells,
  cellToLatex,
  decodeEntities,
  extractImages,
  figureSatisfiedInline,
  htmlToStatementV2,
  jaccard,
  locateCells,
  matchRecords,
  normalizeForMatch,
  parseHubLinks,
  parseTopicPage,
  replaceMangledTables,
  tableToArray,
  tokens,
} from "./edunadeHtml.mjs";
import { htmlToStatement } from "./normalize.mjs";
import { detectMissingFigure } from "./figureHeuristic.mjs";

const TABLE =
  "<table><tr><th>Menu</th><th>Price ($)</th></tr><tr><td>Normal</td><td>5</td></tr><tr><td>Maxi</td><td>8</td></tr></table>";

test("extractImages returns every <img> src in order, deduplicated", () => {
  const html =
    '<p>See</p><img class="medium_question" src="https://ik.imagekit.io/a/1.png"><img src=\'https://x.io/2.svg\' alt=""><img src="https://ik.imagekit.io/a/1.png"><img src="data:image/png;base64,AAA">';
  assert.deepEqual(extractImages(html), [
    "https://ik.imagekit.io/a/1.png",
    "https://x.io/2.svg",
    "data:image/png;base64,AAA",
  ]);
  assert.deepEqual(extractImages(""), []);
  assert.deepEqual(extractImages('<img src="/relative.png">'), []);
});

test("decodeEntities handles text and math modes", () => {
  assert.equal(decodeEntities("a &lt; b &amp; c&nbsp;d"), "a < b & c d");
  assert.equal(decodeEntities("x &le; 3", true), "x \\le  3");
  assert.equal(decodeEntities("&#8804;"), "≤");
});

test("tableToArray builds a KaTeX-valid hlined array", () => {
  const arr = tableToArray(TABLE);
  assert.match(arr, /^\$\$\\begin\{array\}\{\|c\|c\|\}\\hline /);
  assert.match(arr, /\\text\{Price \(\\\$\)\}/);
  assert.doesNotThrow(() => katex.renderToString(arr.slice(2, -2), { throwOnError: true, displayMode: true }));
});

test("cellToLatex keeps numbers and single variables as math, prose as \\text", () => {
  assert.equal(cellToLatex("12"), "12");
  assert.equal(cellToLatex("a"), "a");
  assert.equal(cellToLatex("\\( 0 \\leq x < 10 \\)"), "0 \\leq x < 10");
  assert.equal(cellToLatex("Rate (%)"), "\\text{Rate (\\%)}");
  assert.equal(cellToLatex(""), "");
});

test("htmlToStatementV2 keeps '<' inside math and converts tables", () => {
  const html = "<p>Solve \\(x<3\\) and \\[ |x|&lt;1 \\]</p>" + TABLE + '<img src="https://a/b.png">';
  const out = htmlToStatementV2(html);
  assert.match(out, /\$x<3\$/);
  assert.match(out, /\$\$\|x\|<1\$\$/);
  assert.match(out, /\\begin\{array\}/);
  assert.doesNotMatch(out, /<img/);
  // v1 flattener loses the "<" (the bug we fix).
  assert.doesNotMatch(htmlToStatement("<p>Solve \\(x<3\\) and \\(y>2\\)</p>"), /x<3/);
});

test("normalizeForMatch strips html, latex delimiters, commands and case", () => {
  assert.equal(normalizeForMatch("<p>Find \\(\\frac{1}{2}x\\)!</p>"), "find 1 2 x");
  assert.equal(normalizeForMatch("Find $\\frac{1}{2}x$!"), "find 1 2 x");
});

test("jaccard / tokens", () => {
  assert.equal(jaccard(tokens("the cat sat"), tokens("the cat sat")), 1);
  assert.equal(jaccard(new Set(), new Set()), 1);
  assert.ok(jaccard(tokens("alpha beta gamma"), tokens("alpha beta delta")) === 0.5);
});

test("matchRecords: exact, prefix and similarity passes; one api question per seed", () => {
  const api = [
    { question: "<p>Find \\(x\\) when \\(2x=4\\).</p>", answer: "x=2" },
    { question: "<p>A long question about a geometric sequence with first term three and ratio two, find the sum.</p>", answer: "s" },
    { question: "<p>Completely different text about vectors and planes in space today</p>", answer: "v" },
    { question: "<p>Find \\(x\\) when \\(2x=4\\).</p>", answer: "x=2 again" },
  ];
  const seeds = [
    { statement: "Find $x$ when $2x=4$.", markscheme: "x=2" },
    { statement: "A long question about a geometric sequence with first term three and ratio two, find the sum. Extra seed-only tail", markscheme: "" },
    { statement: "Completely different words about vectors and planes in space today", markscheme: "v" },
    { statement: "Find $x$ when $2x=4$.", markscheme: "x=2 again" },
    { statement: "Nothing like anything", markscheme: "" },
  ];
  const m = matchRecords(seeds, api);
  assert.equal(m.get(0).apiIndex, 0);
  assert.equal(m.get(0).method, "exact");
  assert.equal(m.get(3).apiIndex, 3);
  assert.equal(m.get(1).method, "prefix");
  assert.equal(m.get(1).apiIndex, 1);
  assert.equal(m.get(2).method, "similarity");
  assert.equal(m.has(4), false);
});

test("parseTopicPage and parseHubLinks", () => {
  const page = "params.append('chapter', 'vectors'); const url = `/api/math-aa-hl-questions/?${p}`;";
  assert.deepEqual(parseTopicPage(page), { chapters: ["vectors"], api: "math-aa-hl-questions" });
  const hub = '<a href="/ib-hub/math-aa-hl/">x</a><a href="/ib-hub/math-aa-hl/vectors/">v</a><a href="/ib-hub/math-aa-hl/vectors/">v</a>';
  assert.deepEqual(parseHubLinks(hub, "/ib-hub/math-aa-hl/"), ["/ib-hub/math-aa-hl/vectors/"]);
});

test("replaceMangledTables swaps the flattened table run for an array", () => {
  const seed = "The prices are shown in the following table. Menu Price ($) Normal 5 Maxi 8 a) Find the cost.";
  const { text, replaced } = replaceMangledTables(seed, `<p>x</p>${TABLE}`, htmlToStatement);
  assert.equal(replaced, 1);
  assert.match(text, /^The prices are shown in the following table\. \$\$\\begin\{array\}/);
  assert.match(text, /\$\$ a\) Find the cost\.$/);
});

test("locateCells tolerates hand-corrected math cells; arrayFromCells rebuilds", () => {
  const text = "Data: Score Frequency $0 \\leq x \\leq 10$ 2 end";
  const span = locateCells(text, ["Score", "Frequency", "$0 \\leq x < 10$", "2"]);
  assert.ok(span);
  assert.equal(text.slice(span[0], span[1]), "Score Frequency $0 \\leq x \\leq 10$ 2");
  const arr = arrayFromCells(span[2], [2, 2]);
  assert.match(arr, /0 \\leq x \\leq 10 & 2/);
  assert.equal(arrayFromCells(["a"], [2]), "");
});

test("figureSatisfiedInline: table data inline satisfies a table reference only", () => {
  const withTable = "The results are shown in the table below: $$\\begin{array}{|c|}\\hline 1\\\\ \\hline\\end{array}$$ Find the mean.";
  assert.equal(detectMissingFigure(withTable), true);
  assert.equal(figureSatisfiedInline(withTable, detectMissingFigure), true);
  const withGraph = "The graph of $f$ is shown in the diagram below. $$y=x^2$$";
  assert.equal(figureSatisfiedInline(withGraph, detectMissingFigure), false);
  assert.equal(figureSatisfiedInline("The table below shows x.", detectMissingFigure), false);
});
