// Representative IB Math AA HL records used by the local fixture question bank.
// Statements are original placeholders, not verbatim copyrighted exam text.
export const FIXTURE_QUESTIONS = [
  {
    exam_year: 2023, session: "May", tz: "TZ1", paper: "Paper 1",
    topic: "Calculus", subtopic: "Differential calculus", difficulty: 4, marks: 8,
    question: "Differentiate the given quotient with respect to x, simplifying your answer.",
    tex: String.raw`\frac{d}{dx}\left(\frac{e^{2x}}{\sin x}\right)`,
  },
  {
    exam_year: 2023, session: "May", tz: "TZ2", paper: "Paper 2",
    topic: "Calculus", subtopic: "Integration by parts", difficulty: 5, marks: 12,
    question: "Evaluate the definite integral using integration by parts.",
    tex: String.raw`\int_{0}^{\pi/2} x\cos x \, dx`,
  },
  {
    exam_year: 2022, session: "November", tz: "TZ1", paper: "Paper 1",
    topic: "Algebra", subtopic: "Logarithms", difficulty: 3, marks: 6,
    question: "Solve the logarithmic equation for x.",
    tex: String.raw`\log_2(x+3) + \log_2(x-1) = 3`,
  },
  {
    exam_year: 2022, session: "November", tz: "TZ2", paper: "Paper 2",
    topic: "Vectors", subtopic: "Planes", difficulty: 4, marks: 9,
    question: "Find the vector equation of the plane through the given point.",
    tex: String.raw`\mathbf{r} = \begin{pmatrix}1\\2\\3\end{pmatrix} + \lambda\begin{pmatrix}2\\-1\\1\end{pmatrix}`,
  },
  {
    exam_year: 2021, session: "May", tz: "TZ1", paper: "Paper 1",
    topic: "Algebra", subtopic: "Sequences and series", difficulty: 2, marks: 5,
    question: "Find the sum to infinity of the geometric series.",
    tex: String.raw`\sum_{k=1}^{\infty} \frac{3}{4^k}`,
  },
  {
    exam_year: 2021, session: "May", tz: "TZ2", paper: "Paper 3",
    topic: "Vectors", subtopic: "Scalar product", difficulty: 2, marks: 6,
    question: "Use the scalar product to find the angle between the two vectors.",
    image: "https://example.org/img/vectors-angle.png",
  },
];

// Edunade-shaped records: chapter-organized, HTML + MathJax question text, word
// difficulty, "paperN" papers, string marks, and NO exam year/session/timezone.
// Statements are original placeholders, not verbatim copyrighted exam text.
export const FIXTURE_TOPICS = [
  { slug: "differential-calculus", chapter: "differentiation" },
  { slug: "integral-calculus", chapter: "integration" },
  { slug: "vectors", chapter: "vectors" },
];

export const FIXTURE_BANK = [
  {
    id: 551,
    question: String.raw`<p>Consider the curve <span class="math">\(y = \frac{1}{2}x^2 + 11x - 3\)</span>.</p> <p class="question">a) Find \( \frac{dy}{dx} \).</p> <p class="question">b) The gradient of the tangent at point \( P \) is 10. Find the coordinates of \( P \).</p>`,
    answer: "<p>mark scheme</p>",
    difficulty: "Easy", paper: "paper1", video: "none",
    chapter: "differentiation", chapter2: "", chapter3: "", marks: "7", type: "free",
  },
  {
    id: 552,
    question: String.raw`<p>Differentiate <span class="math">\(f(x) = 3x^3 + x^2 - 2\)</span>.</p>`,
    answer: "<p>mark scheme</p>",
    difficulty: "Medium", paper: "paper1", video: "none",
    chapter: "differentiation", chapter2: "", chapter3: "", marks: "4", type: "free",
  },
  {
    id: 610,
    question: String.raw`<p>Evaluate the definite integral.</p> <p><span class="math">\[ \int_{0}^{\pi/2} x\cos x \, dx \]</span></p>`,
    answer: "<p>mark scheme</p>",
    difficulty: "Hard", paper: "paper2", video: "none",
    chapter: "integration", chapter2: "", chapter3: "", marks: "12", type: "premium",
  },
  {
    id: 700,
    question: String.raw`<p>Find the vector equation of the plane through the point.</p> <p><span class="math">\[ \mathbf{r} = \begin{pmatrix}1\\2\\3\end{pmatrix} + \lambda\begin{pmatrix}2\\-1\\1\end{pmatrix} \]</span></p>`,
    answer: "<p>mark scheme</p>",
    difficulty: "Medium", paper: "paper2", video: "none",
    chapter: "vectors", chapter2: "planes", chapter3: "", marks: "9", type: "free",
  },
];