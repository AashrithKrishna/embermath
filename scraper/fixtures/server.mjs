// Local fixture question bank used to validate both extraction strategies end to end.
// Route "/" is a JSON-backed site (fetches /api/questions) to exercise network interception.
// Route "/dom-only" is static server-rendered HTML with no JSON API to exercise the DOM fallback.
// Route "/hub/" mirrors Edunade: a hub linking to "/hub/<slug>/" sub-topic pages, each of
// which fetches "/api/bank-questions/?chapter=<chapter>" — used to exercise crawling.
import { createServer } from "node:http";
import { FIXTURE_QUESTIONS, FIXTURE_BANK, FIXTURE_TOPICS } from "./data.mjs";

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

function cardHtml(q) {
  const meta = `${q.session} ${q.exam_year} · ${q.tz} · ${q.paper}`;
  const content = q.tex
    ? `<span class="katex"><annotation encoding="application/x-tex">${esc(q.tex)}</annotation></span>`
    : `<img class="question-image" src="${esc(q.image)}" alt="diagram">`;
  return `
    <article class="question-card" data-question>
      <div class="question-meta">${esc(meta)}</div>
      <div class="tags">
        <span class="topic">${esc(q.topic)}</span>
        <span class="subtopic">${esc(q.subtopic)}</span>
      </div>
      <div class="difficulty" data-level="${q.difficulty}">Difficulty ${q.difficulty}/5</div>
      <p class="statement">${esc(q.question)}</p>
      <div class="math">${content}</div>
      <div class="marks">[${q.marks} marks]</div>
    </article>`;
}

const jsonSite = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Community AA HL Bank</title></head>
<body>
  <h1>IB Math AA HL — Question Bank</h1>
  <main id="questions">Loading…</main>
  <script>
    fetch("/api/questions")
      .then((r) => r.json())
      .then((data) => {
        document.getElementById("questions").innerHTML = data.questions
          .map((q) => '<article class="question-card"><p>' + q.question + '</p></article>')
          .join("");
      });
  </script>
</body></html>`;

const domSite = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>AA HL Past Papers (static)</title></head>
<body>
  <h1>IB Math AA HL — Past Paper Archive</h1>
  <main id="questions">${FIXTURE_QUESTIONS.map(cardHtml).join("")}</main>
</body></html>`;

const hubSite = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>AA HL Hub</title></head>
<body>
  <h1>IB Math AA HL — Topics</h1>
  <nav>
    ${FIXTURE_TOPICS.map((t) => `<a href="/hub/${t.slug}/">${t.slug}</a>`).join("\n    ")}
    <a href="/account/">Account</a>
    <a href="/ib-hub/math-aa-sl/">Math AA SL</a>
  </nav>
</body></html>`;

const topicSite = (chapter) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(chapter)}</title></head>
<body>
  <h1>${esc(chapter)}</h1>
  <main id="questionsContainer">Loading…</main>
  <script>
    fetch("/api/bank-questions/?chapter=${encodeURIComponent(chapter)}")
      .then((r) => r.json())
      .then((data) => {
        document.getElementById("questionsContainer").innerHTML = (data.questions || [])
          .map((q) => '<div class="card question-card" data-question-id="' + q.id + '">' + q.question + '</div>')
          .join("");
      });
  </script>
</body></html>`;

export function startFixtureServer({ port = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/api/questions") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ count: FIXTURE_QUESTIONS.length, questions: FIXTURE_QUESTIONS }));
        return;
      }
      if (url.pathname === "/api/bank-questions/") {
        const chapter = url.searchParams.get("chapter") || "";
        const questions = FIXTURE_BANK.filter((q) => q.chapter === chapter);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            questions,
            metadata: { available_papers: ["paper1", "paper2"], available_difficulties: ["Easy", "Medium", "Hard"] },
          })
        );
        return;
      }
      if (url.pathname === "/dom-only") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(domSite);
        return;
      }
      if (url.pathname === "/hub/" || url.pathname === "/hub") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(hubSite);
        return;
      }
      const topicMatch = url.pathname.match(/^\/hub\/([^/]+)\/?$/);
      if (topicMatch) {
        const topic = FIXTURE_TOPICS.find((t) => t.slug === topicMatch[1]);
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(topic ? topicSite(topic.chapter) : "<!doctype html><title>Not found</title>");
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(jsonSite);
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}