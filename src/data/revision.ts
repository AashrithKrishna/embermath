// Self-written quick revision notes for the major topics of both courses.
// Bullets may contain inline $...$ LaTeX, rendered by MathDisplay.

export interface RevisionTopic {
  id: string
  title: string
  bullets: string[]
}

export const REVISION_NOTES: Record<"AA HL" | "AI HL", RevisionTopic[]> = {
  "AA HL": [
    {
      id: "sequences-series",
      title: "Sequences & series",
      bullets: [
        "Spot the type first: constant difference means arithmetic ($u_n = u_1 + (n-1)d$), constant ratio means geometric ($u_n = u_1 r^{n-1}$).",
        "For series sums use $S_n = \\frac{n}{2}(u_1 + u_n)$ when you know the last term, otherwise $S_n = \\frac{n}{2}(2u_1 + (n-1)d)$.",
        "An infinite geometric sum only exists when $|r| < 1$, with $S_\\infty = \\frac{u_1}{1-r}$.",
        "Binomial expansions use $\\binom{n}{r} = \\frac{n!}{r!(n-r)!}$; the term in $x^k$ of $(a+bx)^n$ is $\\binom{n}{k} a^{n-k} (bx)^k$.",
        "In induction proofs, always write the assumption $P(k)$ explicitly and show how it forces $P(k+1)$.",
      ],
    },
    {
      id: "functions-transformations",
      title: "Functions & transformations",
      bullets: [
        "In $y = a f(b(x-c)) + d$: stretch by $a$ vertically and $1/b$ horizontally, then shift $c$ right and $d$ up.",
        "The vertex of $ax^2 + bx + c$ sits at $x = -\\frac{b}{2a}$; the discriminant $b^2 - 4ac$ counts the real roots.",
        "Inverse functions swap domain and range; their graphs mirror in $y = x$.",
        "For $y = \\frac{p(x)}{q(x)}$: vertical asymptotes where $q(x) = 0$ (after canceling), horizontal ones by comparing degrees.",
        "Even functions satisfy $f(-x) = f(x)$, odd functions $f(-x) = -f(x)$ — check the symmetry before integrating.",
      ],
    },
    {
      id: "trigonometry",
      title: "Trigonometry",
      bullets: [
        "Work in radians for calculus: arc length $l = r\\theta$, sector area $A = \\frac{1}{2} r^2 \\theta$.",
        "Two sides + included angle → cosine rule $c^2 = a^2 + b^2 - 2ab\\cos C$; two angles + a side → sine rule.",
        "Everything derives from $\\sin^2\\theta + \\cos^2\\theta = 1$ — divide by $\\cos^2\\theta$ to get the $\\tan^2\\theta$ version.",
        "For $y = a\\sin(bx + c) + d$: amplitude $|a|$, period $\\frac{2\\pi}{b}$, shift $-\\frac{c}{b}$, center line $y = d$.",
        "General solutions add $2\\pi n$ for sine/cosine and $\\pi n$ for tangent; remember sine's second family $\\pi - \\alpha$.",
      ],
    },
    {
      id: "complex-numbers",
      title: "Complex numbers",
      bullets: [
        "Write $z = a + bi$ with $|z| = \\sqrt{a^2 + b^2}$; multiplying by the conjugate gives $zz^* = |z|^2$, which rationalizes denominators.",
        "Polar form $z = r(\\cos\\theta + i\\sin\\theta)$ turns multiplication into adding arguments and powers into de Moivre's theorem.",
        "Euler's form $re^{i\\theta}$ shortens proofs; roots of $z^n = 1$ are $n$ points evenly spaced on the unit circle.",
        "An equation with real coefficients has complex roots in conjugate pairs.",
        "For $n$-th roots, start from the general argument $\\theta + 2k\\pi$ before dividing by $n$ — never just $\\theta$.",
      ],
    },
    {
      id: "vectors",
      title: "Vectors",
      bullets: [
        "The dot product $\\mathbf{v} \\cdot \\mathbf{w} = |\\mathbf{v}||\\mathbf{w}|\\cos\\theta$ tests perpendicularity ($= 0$) and measures angles.",
        "A line needs a point and a direction: $\\mathbf{r} = \\mathbf{a} + t\\mathbf{b}$; parallel lines have proportional direction vectors.",
        "The cross product $\\mathbf{v} \\times \\mathbf{w}$ is perpendicular to both inputs, and its length is the parallelogram area.",
        "For a plane use $\\mathbf{r} \\cdot \\mathbf{n} = \\mathbf{a} \\cdot \\mathbf{n}$; the normal $\\mathbf{n}$ comes from crossing two in-plane directions.",
        "Shortest distance from a point to a line/plane: project the connecting vector onto the perpendicular direction.",
      ],
    },
    {
      id: "statistics-distributions",
      title: "Statistics & distributions",
      bullets: [
        "$\\binom{n}{r}$ counts selections (order irrelevant); multiply by $r!$ when order matters.",
        "Conditional probability flips the sample space: $P(A|B) = \\frac{P(A \\cap B)}{P(B)}$; independence means $P(A \\cap B) = P(A)P(B)$.",
        "For $X \\sim B(n, p)$: $E(X) = np$, $\\mathrm{Var}(X) = np(1-p)$ — write the calculator inputs (n, p, r) carefully.",
        "Standardize normals first: $Z = \\frac{X - \\mu}{\\sigma}$, then sketch the region you need.",
        "Correlation $r$ measures linear strength only — a strong curve can hide behind $r \\approx 0$.",
      ],
    },
    {
      id: "calculus-derivatives",
      title: "Calculus — limits & derivatives",
      bullets: [
        "The derivative is a limit of slopes: $f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$.",
        "Chain rule whenever a function sits inside another; product rule for two multiplied functions; quotient rule when dividing.",
        "Stationary points solve $f'(x) = 0$; use $f''$ (or a sign table) to classify maxima, minima, and points of inflection.",
        "L'Hôpital's rule applies to $\\frac{0}{0}$ and $\\frac{\\infty}{\\infty}$ forms — differentiate top and bottom, then retake the limit.",
        "Maclaurin series come from $f(x) = f(0) + f'(0)x + \\frac{f''(0)}{2!}x^2 + \\cdots$; memorize the series for $e^x$, $\\sin x$, $\\cos x$, $\\ln(1+x)$.",
      ],
    },
    {
      id: "calculus-integrals-kinematics",
      title: "Calculus — integrals & kinematics",
      bullets: [
        "Integrate term by term: $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$ (but $n \\neq -1$, where the answer is $\\ln|x|$).",
        "Substitution replaces the whole inner block, including its derivative; by parts follows $\\int u\\,dv = uv - \\int v\\,du$.",
        "Definite integrals compute signed area; use $\\int_a^b [f - g]\\,dx$ between curves and $\\pi \\int y^2 dx$ for volumes.",
        "Kinematics: differentiate displacement to get velocity and acceleration, integrate to go back — remember the $+C$ from initial conditions.",
        "Distance traveled needs $\\int |v(t)|\\,dt$; displacement alone is $\\int v(t)\\,dt$.",
      ],
    },
  ],
  "AI HL": [
    {
      id: "number-finance",
      title: "Number & finance skills",
      bullets: [
        "Standard form writes numbers as $a \\times 10^k$ with $1 \\leq a < 10$; the exponent $k$ sets the size class.",
        "Percentage error: $\\left|\\frac{v_A - v_E}{v_E}\\right| \\times 100\\%$ — approximation minus exact, over the exact.",
        "Compound interest multiplies by $\\left(1 + \\frac{r}{100}\\right)^n$ each period; depreciation uses a minus sign.",
        "For currency conversions, chain the rates and keep track of whether you multiply or divide.",
      ],
    },
    {
      id: "sequences-series",
      title: "Sequences & series",
      bullets: [
        "Arithmetic sequences add a constant difference: $u_n = u_1 + (n-1)d$, sum $S_n = \\frac{n}{2}(u_1 + u_n)$.",
        "Geometric sequences multiply by a ratio: $u_n = u_1 r^{n-1}$; the infinite sum converges only for $|r| < 1$.",
        "Model real growth with geometric sequences — savings, populations, and loans are usually geometric.",
        "Use the GDC's sequence mode to check a few terms before trusting a closed formula.",
      ],
    },
    {
      id: "functions-modeling",
      title: "Functions & modeling",
      bullets: [
        "Fit the model to the shape: linear for constant change, quadratic/cubic for turning points, exponential for percent growth, sinusoidal for cycles.",
        "Exponential models $f(x) = ka^x + c$ level off at the horizontal asymptote $y = c$.",
        "Sinusoidal models $y = a\\sin(bx+c)+d$ need amplitude, period $\\frac{2\\pi}{b}$, shift, and center line read from the data.",
        "Transformations: $y = a f(b(x-c)) + d$ — stretch first, then translate $c$ right and $d$ up.",
        "Extrapolating far outside the data range is risky; say so in your conclusion.",
      ],
    },
    {
      id: "geometry-trigonometry",
      title: "Geometry & trigonometry",
      bullets: [
        "Angles in radians for arcs ($l = r\\theta$) and sectors ($A = \\frac{1}{2}r^2\\theta$).",
        "Cosine rule when you know two sides and the included angle; sine rule with two angles or a side-angle pair.",
        "In 3D, project everything onto the right triangle — angle between a line and a plane uses the line and its projection.",
        "Surface area and volume of cones, cylinders, and spheres appear in optimization problems — differentiate the volume after substituting the constraint.",
      ],
    },
    {
      id: "matrices",
      title: "Matrices & linear systems",
      bullets: [
        "Matrix multiplication needs matching inner dimensions; $AB \\neq BA$ in general.",
        "The inverse of $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$ is $\\frac{1}{ad-bc}\\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}$ — undefined when the determinant is zero.",
        "Solve $A\\mathbf{x} = \\mathbf{b}$ with $\\mathbf{x} = A^{-1}\\mathbf{b}$, or row-reduce the augmented matrix.",
        "Zero determinant signals a problem: no unique solution (either none or infinitely many).",
        "Transition matrices act on state vectors: $\\mathbf{s}_{n+1} = T\\mathbf{s}_n$; the steady state solves $T\\mathbf{s} = \\mathbf{s}$ and columns of $T$ sum to 1.",
      ],
    },
    {
      id: "graph-theory",
      title: "Graph theory & networks",
      bullets: [
        "The degree sum equals twice the number of edges ($\\sum \\deg(v) = 2E$), so the number of odd-degree vertices is even.",
        "A connected graph has an Eulerian circuit iff every degree is even; exactly two odd vertices give an Eulerian trail.",
        "Trees have $V - 1$ edges; minimum spanning trees come from Kruskal (lightest edges, no cycles) or Prim (grow from a vertex).",
        "Dijkstra finds shortest paths with non-negative weights; the Chinese postman problem adds edges to pair up odd vertices.",
        "Adjacency matrix powers count walks: entry $(i, j)$ of $A^k$ is the number of $k$-step walks from $i$ to $j$.",
      ],
    },
    {
      id: "statistics-tests",
      title: "Statistics & hypothesis testing",
      bullets: [
        "Use the mean for symmetric data, the median for skewed data; report spread with IQR or standard deviation.",
        "The regression line $y = a + bx$ predicts, but correlation $r$ describes strength — and correlation is not causation.",
        "Spearman's rank handles monotone non-linear trends; use it when the scatterplot curves.",
        "A chi-squared test compares observed and expected counts: $\\chi^2 = \\sum \\frac{(f_o - f_e)^2}{f_e}$; check the degrees of freedom before the p-value.",
        "For t-tests, state $H_0$ and $H_1$, report the p-value, and conclude in context against the significance level.",
      ],
    },
    {
      id: "distributions",
      title: "Probability distributions",
      bullets: [
        "Binomial counts successes in $n$ trials with constant $p$: $E(X) = np$, $\\mathrm{Var}(X) = np(1-p)$.",
        "Poisson counts rare events in a fixed interval: $P(X = r) = \\frac{e^{-\\lambda}\\lambda^r}{r!}$, with mean and variance both $\\lambda$.",
        "Standardize normals with $Z = \\frac{X - \\mu}{\\sigma}$ before reading probabilities.",
        "A large binomial can be approximated by a normal with mean $np$ and variance $np(1-p)$.",
        "Confidence intervals for a mean: $\\bar{x} \\pm t^* \\frac{s}{\\sqrt{n}}$ — the margin shrinks as $n$ grows.",
      ],
    },
    {
      id: "calculus-odes",
      title: "Calculus & differential equations",
      bullets: [
        "Derivative basics: power rule $\\frac{d}{dx}x^n = nx^{n-1}$, plus product, quotient, and chain rules.",
        "Tangents use $y - y_1 = m(x - x_1)$ with $m = f'(x_1)$; the normal has slope $-1/m$.",
        "Separable equations: split the variables, integrate both sides, and solve for the constant from the initial condition.",
        "Euler's method steps along slopes: $y_{n+1} = y_n + h f(x_n, y_n)$ — smaller $h$ means better accuracy.",
        "Slope fields sketch whole families of solutions; pick the one through your initial point.",
        "The trapezoidal rule approximates areas: $\\int_a^b f\\,dx \\approx \\frac{h}{2}\\left(y_0 + 2y_1 + \\cdots + 2y_{n-1} + y_n\\right)$.",
      ],
    },
  ],
}

/** Returns the revision topics for a course, defaulting to AA HL. */
export function revisionFor(course: string): RevisionTopic[] {
  return REVISION_NOTES[course as "AA HL" | "AI HL"] ?? REVISION_NOTES["AA HL"]
}
