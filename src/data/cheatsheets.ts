// Self-written revision cheatsheets. Bodies are prose with $..$ / $$..$$ KaTeX.

export type CourseCode = "AA HL" | "AI HL"

export interface SheetItem {
  title: string
  body: string
}

export interface Cheatsheet {
  id: string
  title: string
  summary: string
  courses: CourseCode[]
  kind: "shortcut" | "method" | "gdc" | "traps"
  visualizer?: "demoivre" | "maclaurin"
  items: SheetItem[]
}

export const CHEATSHEETS: Cheatsheet[] = [
  {
    id: "maclaurin",
    title: "Maclaurin series shortcuts",
    summary: "Build new series from five known ones instead of differentiating from scratch.",
    courses: ["AA HL"],
    kind: "shortcut",
    visualizer: "maclaurin",
    items: [
      {
        title: "The five to memorize",
        body: "$$e^x = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\cdots$$ $$\\sin x = x - \\frac{x^3}{3!} + \\frac{x^5}{5!} - \\cdots \\qquad \\cos x = 1 - \\frac{x^2}{2!} + \\frac{x^4}{4!} - \\cdots$$ $$\\ln(1+x) = x - \\frac{x^2}{2} + \\frac{x^3}{3} - \\cdots,\\ -1 < x \\le 1 \\qquad (1+x)^p = 1 + px + \\frac{p(p-1)}{2!}x^2 + \\cdots,\\ |x|<1$$",
      },
      {
        title: "Substitute, don't differentiate",
        body: "For $e^{-x^2}$ replace $x$ with $-x^2$ in the series for $e^x$: $e^{-x^2} = 1 - x^2 + \\frac{x^4}{2} - \\cdots$. The validity interval transforms with the substitution.",
      },
      {
        title: "Multiply truncated series",
        body: "For $e^x \\sin x$ up to $x^3$: multiply $\\left(1 + x + \\frac{x^2}{2}\\right)\\left(x - \\frac{x^3}{6}\\right)$ and keep terms of degree $\\le 3$, giving $x + x^2 + \\frac{x^3}{3}$.",
      },
      {
        title: "Differentiate or integrate term by term",
        body: "$\\frac{d}{dx}\\ln(1+x) = \\frac{1}{1+x}$, so integrating $1 - x + x^2 - \\cdots$ recovers the log series. Integrating $\\frac{1}{1+x^2} = 1 - x^2 + x^4 - \\cdots$ gives $\\arctan x = x - \\frac{x^3}{3} + \\frac{x^5}{5} - \\cdots$.",
      },
      {
        title: "Limits with series",
        body: "Replace each function by its first non-zero terms: $\\lim_{x\\to0}\\frac{x - \\sin x}{x^3} = \\lim_{x\\to0}\\frac{x^3/6 - \\cdots}{x^3} = \\frac{1}{6}$. Often quicker and safer than applying l'Hôpital three times.",
      },
    ],
  },
  {
    id: "ibp-tabular",
    title: "Integration by parts: tabular method",
    summary: "The DI table turns repeated integration by parts into a mechanical routine.",
    courses: ["AA HL"],
    kind: "method",
    items: [
      {
        title: "Choosing u — LIATE",
        body: "Differentiate the first function on the list: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential. The formula is $\\int u\\,dv = uv - \\int v\\,du$.",
      },
      {
        title: "The D–I table",
        body: "Column D: keep differentiating $u$ until it reaches $0$. Column I: keep integrating $dv$. Multiply diagonally with alternating signs $+,-,+,\\ldots$. For $\\int x^2 e^{3x}dx$: $$\\begin{array}{c|c|c} \\text{sign} & D & I \\\\ \\hline + & x^2 & e^{3x} \\\\ - & 2x & \\tfrac13 e^{3x} \\\\ + & 2 & \\tfrac19 e^{3x} \\\\ & 0 & \\tfrac1{27}e^{3x} \\end{array}$$ giving $e^{3x}\\left(\\frac{x^2}{3} - \\frac{2x}{9} + \\frac{2}{27}\\right) + C$.",
      },
      {
        title: "Cyclic integrals",
        body: "For $I = \\int e^x \\sin x\\,dx$ stop after two rows when the original integral reappears: $I = e^x\\sin x - e^x\\cos x - I$, so $I = \\frac{e^x}{2}(\\sin x - \\cos x) + C$.",
      },
      {
        title: "Lone logs and inverse trig",
        body: "Write $\\int \\ln x\\,dx$ as $\\int \\ln x \\cdot 1\\,dx$ with $u = \\ln x$, $dv = dx$: result $x\\ln x - x + C$. The same trick works for $\\arctan x$ and $\\arcsin x$.",
      },
    ],
  },
  {
    id: "complex",
    title: "Complex numbers: Euler and De Moivre",
    summary: "Polar form turns powers and roots into rotations and scalings.",
    courses: ["AA HL", "AI HL"],
    kind: "method",
    visualizer: "demoivre",
    items: [
      {
        title: "Three forms",
        body: "$z = a + bi = r(\\cos\\theta + i\\sin\\theta) = re^{i\\theta}$ with $r = \\sqrt{a^2+b^2}$ and $\\theta = \\arg z$. Check the quadrant before trusting $\\arctan\\frac{b}{a}$.",
      },
      {
        title: "De Moivre's theorem",
        body: "$\\left(re^{i\\theta}\\right)^n = r^n e^{in\\theta}$. Multiplying multiplies moduli and adds arguments; dividing divides moduli and subtracts arguments.",
      },
      {
        title: "n-th roots",
        body: "The solutions of $z^n = re^{i\\theta}$ are $z_k = r^{1/n}e^{i(\\theta + 2\\pi k)/n}$ for $k = 0,1,\\ldots,n-1$: equally spaced on a circle of radius $r^{1/n}$, and they sum to $0$ for $n \\ge 2$.",
      },
      {
        title: "Trig identities from De Moivre",
        body: "Expand $(\\cos\\theta + i\\sin\\theta)^3$ binomially and compare real parts: $\\cos 3\\theta = 4\\cos^3\\theta - 3\\cos\\theta$. For powers of $\\cos$ use $2\\cos\\theta = z + z^{-1}$ with $z = e^{i\\theta}$.",
      },
      {
        title: "Conjugate pairs",
        body: "A polynomial with real coefficients has non-real roots in conjugate pairs, so $(z - w)(z - \\bar w) = z^2 - 2\\operatorname{Re}(w)z + |w|^2$ is a real quadratic factor.",
      },
    ],
  },
  {
    id: "vectors",
    title: "Vectors and the cross product",
    summary: "Which product answers which geometry question.",
    courses: ["AA HL", "AI HL"],
    kind: "method",
    items: [
      {
        title: "Dot product: angles and perpendicularity",
        body: "$\\mathbf a\\cdot\\mathbf b = |\\mathbf a||\\mathbf b|\\cos\\theta$. Zero dot product means perpendicular. Use it for the angle between lines (direction vectors) and between a line and a plane ($90^\\circ$ minus the angle with the normal).",
      },
      {
        title: "Cross product: normals and areas",
        body: "$\\mathbf a\\times\\mathbf b$ is perpendicular to both, with $|\\mathbf a\\times\\mathbf b| = |\\mathbf a||\\mathbf b|\\sin\\theta$ = area of the parallelogram. Triangle area is half that. $$\\mathbf a\\times\\mathbf b = \\begin{pmatrix} a_2b_3 - a_3b_2 \\\\ a_3b_1 - a_1b_3 \\\\ a_1b_2 - a_2b_1 \\end{pmatrix}$$",
      },
      {
        title: "Plane through three points",
        body: "Normal $\\mathbf n = \\overrightarrow{AB}\\times\\overrightarrow{AC}$, then $\\mathbf r\\cdot\\mathbf n = \\mathbf a\\cdot\\mathbf n$ gives $n_1x + n_2y + n_3z = d$.",
      },
      {
        title: "Shortest distances",
        body: "Point to plane: $\\dfrac{|n_1x_0 + n_2y_0 + n_3z_0 - d|}{|\\mathbf n|}$. Skew lines: project $\\overrightarrow{AB}$ onto $\\mathbf n = \\mathbf d_1\\times\\mathbf d_2$, distance $\\dfrac{|\\overrightarrow{AB}\\cdot\\mathbf n|}{|\\mathbf n|}$.",
      },
      {
        title: "Intersecting, parallel or skew?",
        body: "Parallel if direction vectors are multiples. Otherwise equate components, solve two equations for the parameters and test the third: consistent means they intersect, inconsistent means skew.",
      },
    ],
  },
  {
    id: "des",
    title: "Differential equations",
    summary: "Recognize the type first; the method follows.",
    courses: ["AA HL", "AI HL"],
    kind: "method",
    items: [
      {
        title: "Separable",
        body: "$\\frac{dy}{dx} = f(x)g(y) \\Rightarrow \\int\\frac{dy}{g(y)} = \\int f(x)\\,dx$. Add the constant once, then use the initial condition before rearranging.",
      },
      {
        title: "Homogeneous (AA)",
        body: "If $\\frac{dy}{dx} = F\\!\\left(\\frac{y}{x}\\right)$ substitute $y = vx$, so $\\frac{dy}{dx} = v + x\\frac{dv}{dx}$, which separates.",
      },
      {
        title: "Integrating factor (AA)",
        body: "For $\\frac{dy}{dx} + P(x)y = Q(x)$ multiply by $I = e^{\\int P\\,dx}$: then $\\frac{d}{dx}(Iy) = IQ$ and $y = \\frac{1}{I}\\int IQ\\,dx$.",
      },
      {
        title: "Euler's method",
        body: "$x_{n+1} = x_n + h$, $y_{n+1} = y_n + h f(x_n, y_n)$. Smaller $h$ gives better accuracy; for a concave-up solution Euler underestimates. Tabulate in the GDC rather than by hand.",
      },
      {
        title: "Coupled systems (AI)",
        body: "$\\dot{\\mathbf x} = M\\mathbf x$ has solution $\\mathbf x = Ae^{\\lambda_1 t}\\mathbf p_1 + Be^{\\lambda_2 t}\\mathbf p_2$ with eigenvalues $\\lambda_i$ and eigenvectors $\\mathbf p_i$. Both eigenvalues negative: stable node; opposite signs: saddle; complex with negative real part: stable spiral.",
      },
      {
        title: "Second order via a system (AI)",
        body: "Write $\\ddot x + a\\dot x + bx = 0$ as $\\dot x = y$, $\\dot y = -bx - ay$, then apply Euler's method to both equations with the same step.",
      },
    ],
  },
  {
    id: "hypothesis",
    title: "Hypothesis testing",
    summary: "Pick the test from the data type, then state, compute, compare, conclude.",
    courses: ["AI HL"],
    kind: "method",
    items: [
      {
        title: "Four-line structure",
        body: "1. $H_0$ and $H_1$ in context, with the parameter. 2. Test and significance level. 3. $p$-value from the GDC. 4. Compare with $\\alpha$ and conclude in context: “insufficient evidence to reject $H_0$”, never “accept $H_0$”.",
      },
      {
        title: "Choosing the test",
        body: "Mean of one normal sample: $t$-test (or $z$ if $\\sigma$ known). Two independent means: two-sample $t$. Categorical counts against a model: $\\chi^2$ goodness of fit. Two categorical variables: $\\chi^2$ independence. Correlation: test $\\rho = 0$ with Pearson's $r$.",
      },
      {
        title: "χ² details",
        body: "Expected counts must be at least $5$; merge cells if not. Degrees of freedom: $(r-1)(c-1)$ for independence, $n - 1 - (\\text{parameters estimated})$ for goodness of fit.",
      },
      {
        title: "Errors",
        body: "Type I: rejecting a true $H_0$, probability $\\alpha$. Type II: not rejecting a false $H_0$. For a binomial or Poisson test, find the critical region first, then the actual significance level.",
      },
    ],
  },
  {
    id: "markov",
    title: "Matrices and Markov chains",
    summary: "Transition matrices, steady states and diagonalisation.",
    courses: ["AI HL"],
    kind: "method",
    items: [
      {
        title: "Set-up",
        body: "Columns are “from”, rows are “to”, and each column sums to $1$. The state after $n$ steps is $\\mathbf s_n = T^n\\mathbf s_0$.",
      },
      {
        title: "Steady state",
        body: "Solve $T\\mathbf s = \\mathbf s$ with entries summing to $1$ — the eigenvector for $\\lambda = 1$. On the GDC, raising $T$ to a large power shows identical columns equal to the steady state.",
      },
      {
        title: "Diagonalisation",
        body: "$T = PDP^{-1}$ with eigenvectors in $P$ and eigenvalues in $D$, so $T^n = PD^nP^{-1}$. Terms with $|\\lambda| < 1$ vanish as $n\\to\\infty$.",
      },
    ],
  },
  {
    id: "gdc",
    title: "GDC keystroke guide",
    summary: "The sequences that save the most time on Papers 2 and 3.",
    courses: ["AI HL", "AA HL"],
    kind: "gdc",
    items: [
      {
        title: "Solve an equation numerically",
        body: "TI-84 Plus CE: graph both sides, then 2nd TRACE (CALC) → 5: intersect, Enter three times. Casio fx-CG50: MENU Graph, F5 G-Solve → F5 ISCT. Write the answer to 3 significant figures unless told otherwise.",
      },
      {
        title: "Normal and inverse normal",
        body: "TI: 2nd VARS → normalcdf(lower, upper, μ, σ); invNorm(area, μ, σ, LEFT/CENTER/RIGHT). Casio: MENU Statistics → F5 DIST → F1 NORM → Ncd / InvN. Use $\\pm 10^{99}$ for infinite bounds.",
      },
      {
        title: "Binomial and Poisson",
        body: "binompdf(n, p, x) for $P(X = x)$, binomcdf(n, p, x) for $P(X \\le x)$. For $P(X \\ge x)$ use $1 - $ binomcdf(n, p, x − 1). Poisson works the same way with poissonpdf / poissoncdf.",
      },
      {
        title: "Regression and correlation",
        body: "TI: enter data in L1, L2; STAT → CALC → 4: LinReg(ax+b) with DiagnosticOn to show $r$. Casio: MENU Statistics → F2 CALC → F3 REG. Quote $r$, not $r^2$, when asked about correlation strength.",
      },
      {
        title: "Hypothesis tests",
        body: "TI: STAT → TESTS → T-Test, 2-SampTTest, χ²-Test (matrix A observed), χ²GOF-Test. Casio: Statistics → F3 TEST. Record the $p$-value and test statistic in your working.",
      },
      {
        title: "Numerical integration and derivative",
        body: "TI: MATH → 9: fnInt( and MATH → 8: nDeriv(. Casio: in RUN, OPTN → F4 CALC → ∫dx or d/dx. Use these to check exact answers on Paper 2.",
      },
      {
        title: "Finance (TVM)",
        body: "TI: APPS → Finance → TVM Solver; Casio: MENU Financial → Compound Interest. Money paid out is negative. Set P/Y and C/Y to the compounding frequency in the question.",
      },
    ],
  },
  {
    id: "induction",
    title: "Proof by induction template",
    summary: "The structure examiners award marks for, step by step.",
    courses: ["AA HL"],
    kind: "method",
    items: [
      {
        title: "Base case",
        body: "Show $P(1)$ explicitly: compute both sides and state they are equal. “LHS = RHS so $P(1)$ is true.”",
      },
      {
        title: "Assumption",
        body: "“Assume $P(k)$ is true for some $k \\in \\mathbb Z^+$”, and write $P(k)$ out in full.",
      },
      {
        title: "Inductive step",
        body: "Start from one side of $P(k+1)$, substitute the assumption at the point marked, and manipulate to the other side. For divisibility, write $f(k+1) - f(k)$ or $f(k+1)$ in terms of $f(k)$.",
      },
      {
        title: "Conclusion",
        body: "“Since $P(1)$ is true, and $P(k)$ true implies $P(k+1)$ true, $P(n)$ is true for all $n \\in \\mathbb Z^+$ by mathematical induction.” This sentence carries a reasoning mark on its own.",
      },
    ],
  },
  {
    id: "traps",
    title: "Common examiner traps",
    summary: "Where marks are most often thrown away.",
    courses: ["AA HL", "AI HL"],
    kind: "traps",
    items: [
      { title: "Radians versus degrees", body: "Calculus with trig functions needs radians. Check the GDC mode before every Paper 2 trig question." },
      {
        title: "Accuracy",
        body: "Give exact answers when asked; otherwise 3 significant figures. Keep full calculator values in intermediate steps — rounding early can lose the final A1.",
      },
      {
        title: "“Hence” means use the previous part",
        body: "“Hence or otherwise” allows another method but the previous result is usually the fast route. “Show that” answers must reach the printed result with every step visible.",
      },
      { title: "Lost constant", body: "Indefinite integrals need $+C$. In differential equations, apply the initial condition before rearranging for $y$." },
      {
        title: "Domain and range",
        body: "Inverse functions need the domain restricted to make the function one-to-one. State the domain of $f^{-1}$ as the range of $f$.",
      },
      {
        title: "Modulus inequalities",
        body: "$|x - a| < b$ means $a - b < x < a + b$. Squaring both sides is safe only when both are non-negative.",
      },
      {
        title: "Conditional probability",
        body: "$P(A\\mid B) = \\frac{P(A\\cap B)}{P(B)}$ — the denominator is the given event. Independence means $P(A\\cap B) = P(A)P(B)$, not mutually exclusive.",
      },
      { title: "Units and context", body: "Final answers in applied questions need units, and conclusions in statistics must be written in the context of the question." },
    ],
  },
]
