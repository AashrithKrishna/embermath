import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { scrapeUrl, crawlHub } from "./scrape.mjs";
import { startFixtureServer } from "./fixtures/server.mjs";
import { isValid } from "./normalize.mjs";

let fixture;
before(async () => {
  fixture = await startFixtureServer();
});
after(async () => {
  if (fixture) await fixture.close();
});

test("network strategy intercepts the JSON API and maps all records", { timeout: 60000 }, async () => {
  const result = await scrapeUrl(`${fixture.url}/`, { strategy: "network" });
  assert.equal(result.strategy, "network");
  assert.equal(result.count, 6);
  for (const q of result.questions) assert.ok(isValid(q));
});

test("dom strategy parses static cards when no JSON API is present", { timeout: 60000 }, async () => {
  const result = await scrapeUrl(`${fixture.url}/dom-only`, { strategy: "dom" });
  assert.equal(result.strategy, "dom");
  assert.equal(result.count, 6);
  const plane = result.questions.find((q) => q.subtopic === "Planes");
  assert.ok(plane, "expected the Vectors/Planes card");
  assert.equal(plane.year, 2022);
  assert.equal(plane.session, "November");
  assert.equal(plane.timezone, "TZ2");
  assert.equal(plane.paper, "Paper 2");
  assert.equal(plane.marks, 9);
  assert.ok(plane.latex.includes("pmatrix"));
});

test("auto strategy prefers network when available, falls back to dom otherwise", { timeout: 60000 }, async () => {
  const api = await scrapeUrl(`${fixture.url}/`, { strategy: "auto" });
  assert.equal(api.strategy, "network");
  const dom = await scrapeUrl(`${fixture.url}/dom-only`, { strategy: "auto" });
  assert.equal(dom.strategy, "dom");
});

test("crawlHub discovers sub-topic links and aggregates their API questions", { timeout: 90000 }, async () => {
  const result = await crawlHub(`${fixture.url}/hub/`, { delay: 50, apiTimeout: 8000 });
  // hub itself has no questions; 3 sub-topic pages each serve chapter records.
  assert.equal(result.pages, 4);
  assert.equal(result.results[0].strategy, "none");
  assert.equal(result.count, 4);
  for (const q of result.questions) assert.ok(isValid(q));
  const topics = new Set(result.questions.map((q) => q.topic));
  assert.ok(topics.has("Differential Calculus"));
  assert.ok(topics.has("Integral Calculus"));
  assert.ok(topics.has("Vectors"));
  // utility/nav links must not be crawled
  assert.ok(result.results.every((r) => !/account|math-aa-sl/.test(r.url)));
});

test("crawlHub respects maxPages and no-crawl", { timeout: 90000 }, async () => {
  const capped = await crawlHub(`${fixture.url}/hub/`, { delay: 50, maxPages: 2 });
  assert.equal(capped.pages, 2);
  const single = await crawlHub(`${fixture.url}/hub/`, { delay: 50, crawl: false });
  assert.equal(single.pages, 1);
  assert.equal(single.count, 0);
});