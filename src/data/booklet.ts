// Inbuilt formula booklet, written in original wording. Standard
// public-domain mathematics arranged by course and by the five IB HL topic
// areas. LaTeX strings must be valid KaTeX without $ delimiters.

export interface BookletEntry {
  name: string
  latex: string
  note?: string
}

export interface BookletSection {
  id: string
  title: string
  entries: BookletEntry[]
}

export interface CourseBooklet {
  course: "AA HL" | "AI HL"
  sections: BookletSection[]
}

const arithmeticSequence: BookletEntry = {
  name: "Arithmetic sequence",
  latex: "u_n = u_1 + (n-1)d",
  note: "d is the common difference between consecutive terms.",
}

const arithmeticSeries: BookletEntry = {
  name: "Arithmetic series",
  latex: "S_n = \\frac{n}{2}(u_1 + u_n) = \\frac{n}{2}\\,(2u_1 + (n-1)d)",
  note: "Sum of the first n terms.",
}

const geometricSequence: BookletEntry = {
  name: "Geometric sequence",
  latex: "u_n = u_1 r^{\\,n-1}",
  note: "r is the common ratio.",
}

const geometricSeries: BookletEntry = {
  name: "Geometric series",
  latex: "S_n = \\frac{u_1(r^n - 1)}{r - 1}, \\quad r \\neq 1",
  note: "Sum of the first n terms.",
}

const infiniteSum: BookletEntry = {
  name: "Infinite geometric sum",
  latex: "S_{\\infty} = \\frac{u_1}{1 - r}, \\quad |r| < 1",
  note: "Only converges when the ratio sits strictly between −1 and 1.",
}

const exponentLaws: BookletEntry = {
  name: "Exponent laws",
  latex: "a^m a^n = a^{m+n}, \\qquad \\frac{a^m}{a^n} = a^{m-n}, \\qquad (a^m)^n = a^{mn}",
}

const fractionalPowers: BookletEntry = {
  name: "Fractional and negative powers",
  latex: "a^{\\frac{m}{n}} = \\sqrt[n]{a^m}, \\qquad a^{-n} = \\frac{1}{a^n}",
}

const logDefinition: BookletEntry = {
  name: "Logarithm definition",
  latex: "\\log_a x = y \\iff a^y = x",
  note: "a must be positive and not equal to 1.",
}

const logLaws: BookletEntry = {
  name: "Logarithm laws",
  latex:
    "\\log_a(xy) = \\log_a x + \\log_a y \\\\ \\log_a\\!\\left(\\frac{x}{y}\\right) = \\log_a x - \\log_a y \\\\ \\log_a x^p = p\\,\\log_a x",
}

const changeOfBase: BookletEntry = {
  name: "Change of base",
  latex: "\\log_a x = \\frac{\\log_b x}{\\log_b a}",
  note: "Special values: log of 1 is 0, log of the base is 1.",
}

const binomialTheorem: BookletEntry = {
  name: "Binomial theorem",
  latex: "(a+b)^n = \\sum_{r=0}^{n} \\binom{n}{r} a^{n-r} b^{r}",
  note: "Expansion written in descending powers of a.",
}

const binomialCoefficient: BookletEntry = {
  name: "Binomial coefficient",
  latex: "\\binom{n}{r} = \\frac{n!}{r!\\,(n-r)!}",
}

const complexCartesian: BookletEntry = {
  name: "Complex number basics",
  latex: "z = a + bi, \\qquad |z| = \\sqrt{a^2 + b^2}, \\qquad zz^* = |z|^2",
  note: "The conjugate z* = a − bi reflects across the real axis.",
}

const complexPolar: BookletEntry = {
  name: "Polar (modulus–argument) form",
  latex: "z = r(\\cos\\theta + i\\sin\\theta)",
  note: "r = |z| is the modulus and θ = arg z the argument.",
}

const deMoivre: BookletEntry = {
  name: "de Moivre's theorem",
  latex: "(\\cos\\theta + i\\sin\\theta)^n = \\cos(n\\theta) + i\\sin(n\\theta)",
  note: "For integer powers; a generalized form also covers rational powers.",
}

const eulerFormula: BookletEntry = {
  name: "Euler's formula",
  latex: "e^{i\\theta} = \\cos\\theta + i\\sin\\theta",
}

const nthRoots: BookletEntry = {
  name: "nth roots of a complex number",
  latex:
    "z^{\\frac{1}{n}} = r^{\\frac{1}{n}}\\left(\\cos\\frac{\\theta + 2k\\pi}{n} + i\\sin\\frac{\\theta + 2k\\pi}{n}\\right), \\quad k = 0, 1, \\dots, n-1",
  note: "The roots are evenly spaced around a circle of radius r^(1/n).",
}

const rootsOfUnity: BookletEntry = {
  name: "Roots of unity",
  latex: "z^n = 1 \\implies z = \\cos\\frac{2k\\pi}{n} + i\\sin\\frac{2k\\pi}{n}",
}

const modulusInequality: BookletEntry = {
  name: "Modulus inequality",
  latex: "|x - a| < b \\iff a - b < x < a + b",
  note: "Distance from a is less than b. Swap < for > to get the outside interval.",
}

const induction: BookletEntry = {
  name: "Proof by induction",
  latex:
    "P(1) \\text{ holds}; \\qquad P(k) \\Rightarrow P(k+1) \\implies P(n) \\ \\forall n",
  note: "Show the base case, assume the k-th case, then prove the (k+1)-th case.",
}

const standardForm: BookletEntry = {
  name: "Standard (scientific) form",
  latex: "a \\times 10^k, \\qquad 1 \\leq a < 10",
  note: "k is an integer; positive k for large numbers, negative for small ones.",
}

const percentageError: BookletEntry = {
  name: "Percentage error",
  latex:
    "\\text{percentage error} = \\left|\\frac{v_A - v_E}{v_E}\\right| \\times 100\\%",
  note: "v_A is the approximate value and v_E the exact value.",
}

const matrixMultiplication: BookletEntry = {
  name: "Matrix multiplication",
  latex: "(AB)_{ij} = \\sum_{k} a_{ik} b_{kj}",
  note: "A (m×n) times B (n×p) gives an m×p result; order matters.",
}

const matrixInverse2: BookletEntry = {
  name: "Inverse of a 2×2 matrix",
  latex:
    "A^{-1} = \\frac{1}{ad - bc}\\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}, \\qquad \\det A = ad - bc",
  note: "Invertible exactly when the determinant is non-zero.",
}

const matrixSolve: BookletEntry = {
  name: "Solving systems with matrices",
  latex: "A\\mathbf{x} = \\mathbf{b} \\implies \\mathbf{x} = A^{-1}\\mathbf{b}",
  note: "Reduced row-echelon form also reveals unique, infinite, or no solutions.",
}

const transitionMatrix: BookletEntry = {
  name: "Transition matrices",
  latex: "\\mathbf{s}_{n+1} = T\\mathbf{s}_n, \\qquad T\\mathbf{s} = \\mathbf{s}",
  note: "The steady state vector s is unchanged by one more transition.",
}

const quadraticVertex: BookletEntry = {
  name: "Quadratic in completed-square form",
  latex: "f(x) = ax^2 + bx + c = a(x - h)^2 + k, \\qquad h = -\\frac{b}{2a}",
  note: "(h, k) is the vertex — a minimum when a > 0, a maximum when a < 0.",
}

const discriminant: BookletEntry = {
  name: "Discriminant",
  latex: "\\Delta = b^2 - 4ac",
  note: "Δ > 0: two real roots. Δ = 0: one repeated root. Δ < 0: no real roots.",
}

const quadraticFormula: BookletEntry = {
  name: "Quadratic formula",
  latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
}

const sumProductRoots: BookletEntry = {
  name: "Sum and product of roots",
  latex: "\\alpha + \\beta = -\\frac{b}{a}, \\qquad \\alpha\\beta = \\frac{c}{a}",
}

const factorTheorem: BookletEntry = {
  name: "Factor theorem",
  latex: "f(a) = 0 \\iff (x - a) \\text{ is a factor of } f(x)",
}

const remainderTheorem: BookletEntry = {
  name: "Remainder theorem",
  latex: "f(x) \\div (x - a) \\text{ leaves remainder } f(a)",
}

const transformations: BookletEntry = {
  name: "Transformations of graphs",
  latex: "y = a\\,f(b(x - c)) + d",
  note: "Vertical stretch a, horizontal stretch 1/b, then translate c right and d up.",
}

const inverseFunction: BookletEntry = {
  name: "Inverse functions",
  latex: "f^{-1}(f(x)) = f(f^{-1}(x)) = x",
  note: "Graphs of f and f⁻¹ mirror each other in the line y = x.",
}

const compositeFunction: BookletEntry = {
  name: "Composite functions",
  latex: "(f \\circ g)(x) = f(g(x))",
  note: "The domain is restricted by the inside function g first.",
}

const oddEven: BookletEntry = {
  name: "Odd and even functions",
  latex: "f(-x) = f(x) \\text{ (even)}, \\qquad f(-x) = -f(x) \\text{ (odd)}",
  note: "Even: symmetry in the y-axis. Odd: rotational symmetry about the origin.",
}

const expLogInverse: BookletEntry = {
  name: "Exponentials and logs are inverses",
  latex: "\\ln e^x = x, \\qquad e^{\\ln x} = x",
}

const rationalAsymptotes: BookletEntry = {
  name: "Rational function asymptotes",
  latex: "y = \\frac{p(x)}{q(x)}",
  note: "Vertical asymptotes where q(x) = 0 (after canceling); horizontal ones from comparing degrees.",
}

const modulusGraph: BookletEntry = {
  name: "Modulus graph",
  latex: "y = |f(x)|",
  note: "Reflect the parts of f below the x-axis upwards; keep the rest.",
}

const cubicFeatures: BookletEntry = {
  name: "Cubic features",
  latex: "f(x) = ax^3 + bx^2 + cx + d",
  note: "Up to 3 roots and 2 turning points; sign of a sets the end behavior.",
}

const exponentialModel: BookletEntry = {
  name: "Exponential model",
  latex: "f(x) = ka^x + c",
  note: "Horizontal asymptote y = c; growth for a > 1, decay for 0 < a < 1.",
}

const sinusoidalModel: BookletEntry = {
  name: "Sinusoidal model",
  latex: "y = a\\sin(bx + c) + d",
  note: "Amplitude |a|, period 2π/b, phase shift −c/b, vertical shift d.",
}

const linearEquation: BookletEntry = {
  name: "Linear function",
  latex: "y = mx + c, \\qquad m = \\frac{y_2 - y_1}{x_2 - x_1}",
}

const perpendicularSlopes: BookletEntry = {
  name: "Parallel and perpendicular lines",
  latex: "m_1 = m_2 \\text{ (parallel)}, \\qquad m_1 m_2 = -1 \\text{ (perpendicular)}",
}

const radians: BookletEntry = {
  name: "Radian measure",
  latex: "\\pi \\text{ rad} = 180^{\\circ}",
}

const arcLength: BookletEntry = {
  name: "Arc length",
  latex: "l = r\\theta",
  note: "θ in radians.",
}

const sectorArea: BookletEntry = {
  name: "Sector area",
  latex: "A = \\frac{1}{2}r^2\\theta",
  note: "θ in radians.",
}

const rightTriangle: BookletEntry = {
  name: "Right-triangle ratios",
  latex:
    "\\sin\\theta = \\frac{\\text{opposite}}{\\text{hypotenuse}}, \\quad \\cos\\theta = \\frac{\\text{adjacent}}{\\text{hypotenuse}}, \\quad \\tan\\theta = \\frac{\\text{opposite}}{\\text{adjacent}}",
}

const triangleArea: BookletEntry = {
  name: "Triangle area (two sides, included angle)",
  latex: "A = \\frac{1}{2}ab\\sin C",
}

const sineRule: BookletEntry = {
  name: "Sine rule",
  latex: "\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}",
  note: "Watch for the ambiguous case when solving for an angle.",
}

const cosineRule: BookletEntry = {
  name: "Cosine rule",
  latex: "c^2 = a^2 + b^2 - 2ab\\cos C",
}

const pythagoreanIdentity: BookletEntry = {
  name: "Pythagorean identity",
  latex: "\\sin^2\\theta + \\cos^2\\theta = 1",
}

const tanIdentity: BookletEntry = {
  name: "Tangent identities",
  latex: "\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}, \\qquad 1 + \\tan^2\\theta = \\sec^2\\theta",
}

const compoundSine: BookletEntry = {
  name: "Compound angle — sine",
  latex: "\\sin(A \\pm B) = \\sin A \\cos B \\pm \\cos A \\sin B",
}

const compoundCosine: BookletEntry = {
  name: "Compound angle — cosine",
  latex: "\\cos(A \\pm B) = \\cos A \\cos B \\mp \\sin A \\sin B",
}

const compoundTangent: BookletEntry = {
  name: "Compound angle — tangent",
  latex: "\\tan(A \\pm B) = \\frac{\\tan A \\pm \\tan B}{1 \\mp \\tan A \\tan B}",
}

const doubleAngle: BookletEntry = {
  name: "Double angle",
  latex:
    "\\sin 2\\theta = 2\\sin\\theta\\cos\\theta \\\\ \\cos 2\\theta = \\cos^2\\theta - \\sin^2\\theta = 2\\cos^2\\theta - 1 = 1 - 2\\sin^2\\theta",
}

const specialAngles: BookletEntry = {
  name: "Exact values of common angles",
  latex:
    "\\sin 0 = 0,\\ \\ \\sin\\frac{\\pi}{6} = \\frac{1}{2},\\ \\ \\sin\\frac{\\pi}{4} = \\frac{\\sqrt{2}}{2},\\ \\ \\sin\\frac{\\pi}{3} = \\frac{\\sqrt{3}}{2},\\ \\ \\sin\\frac{\\pi}{2} = 1",
  note: "Cosine runs the same row in reverse; tangent is sine over cosine.",
}

const trigGraph: BookletEntry = {
  name: "Trigonometric graph parameters",
  latex: "y = a\\sin(bx + c) + d",
  note: "Amplitude |a|, period 2π/b, horizontal shift −c/b, vertical shift d.",
}

const generalSolution: BookletEntry = {
  name: "General solutions",
  latex:
    "\\sin x = k \\Rightarrow x = \\alpha + 2\\pi n \\text{ or } \\pi - \\alpha + 2\\pi n \\\\ \\cos x = k \\Rightarrow x = \\pm\\alpha + 2\\pi n \\\\ \\tan x = k \\Rightarrow x = \\alpha + \\pi n",
  note: "α is the principal value from the inverse function; n any integer.",
}

const vectorMagnitude: BookletEntry = {
  name: "Vector magnitude",
  latex: "|\\mathbf{v}| = \\sqrt{v_1^{2} + v_2^{2} + v_3^{2}}",
}

const dotProduct: BookletEntry = {
  name: "Scalar (dot) product",
  latex:
    "\\mathbf{v} \\cdot \\mathbf{w} = v_1 w_1 + v_2 w_2 + v_3 w_3 = |\\mathbf{v}|\\,|\\mathbf{w}|\\cos\\theta",
}

const perpendicularVectors: BookletEntry = {
  name: "Perpendicular vectors",
  latex: "\\mathbf{v} \\perp \\mathbf{w} \\iff \\mathbf{v} \\cdot \\mathbf{w} = 0",
}

const vectorLine: BookletEntry = {
  name: "Vector equation of a line",
  latex: "\\mathbf{r} = \\mathbf{a} + t\\,\\mathbf{b}",
  note: "a fixes a point on the line; b gives its direction.",
}

const angleBetweenLines: BookletEntry = {
  name: "Angle between lines",
  latex: "\\cos\\theta = \\frac{|\\mathbf{b}_1 \\cdot \\mathbf{b}_2|}{|\\mathbf{b}_1|\\,|\\mathbf{b}_2|}",
  note: "Uses the direction vectors; absolute value gives the acute angle.",
}

const crossProduct: BookletEntry = {
  name: "Vector (cross) product",
  latex:
    "\\mathbf{v} \\times \\mathbf{w} = \\begin{pmatrix} v_2w_3 - v_3w_2 \\\\ v_3w_1 - v_1w_3 \\\\ v_1w_2 - v_2w_1 \\end{pmatrix}",
  note: "Perpendicular to both inputs; its length |v||w| sin θ is the parallelogram area.",
}

const planeEquation: BookletEntry = {
  name: "Plane equation",
  latex: "\\mathbf{r} \\cdot \\mathbf{n} = \\mathbf{a} \\cdot \\mathbf{n}, \\qquad ax + by + cz = d",
  note: "n is a vector perpendicular to the plane.",
}

const pointPlaneDistance: BookletEntry = {
  name: "Distance from a point to a plane",
  latex: "D = \\frac{|ax_0 + by_0 + cz_0 - d|}{\\sqrt{a^2 + b^2 + c^2}}",
}

const distance3d: BookletEntry = {
  name: "Distance between points in space",
  latex: "|AB| = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2 + (z_2 - z_1)^2}",
}

const midpoint3d: BookletEntry = {
  name: "Midpoint in space",
  latex: "M = \\left(\\frac{x_1 + x_2}{2},\\ \\frac{y_1 + y_2}{2},\\ \\frac{z_1 + z_2}{2}\\right)",
}

const sphere: BookletEntry = {
  name: "Sphere",
  latex: "V = \\frac{4}{3}\\pi r^3, \\qquad S = 4\\pi r^2",
}

const cone: BookletEntry = {
  name: "Cone",
  latex: "V = \\frac{1}{3}\\pi r^2 h",
  note: "Slant height l satisfies l² = r² + h²; curved surface area πrl.",
}

const cylinder: BookletEntry = {
  name: "Cylinder",
  latex: "V = \\pi r^2 h, \\qquad S = 2\\pi r^2 + 2\\pi rh",
}

const voronoiBisector: BookletEntry = {
  name: "Voronoi edge (perpendicular bisector)",
  latex: "|XA| = |XB|",
  note: "Points on the edge are equidistant from sites A and B.",
}

const voronoiCell: BookletEntry = {
  name: "Voronoi cell",
  latex: "V(A) = \\{ X : |XA| \\leq |XP| \\text{ for every other site } P \\}",
  note: "The cell holds all points closer to A than to any other site.",
}

const handshakeLemma: BookletEntry = {
  name: "Handshake lemma",
  latex: "\\sum \\deg(v) = 2E",
  note: "The degree sum counts each edge twice — so it is always even.",
}

const eulerian: BookletEntry = {
  name: "Eulerian circuits and trails",
  latex: "\\text{circuit: all even degrees} \\qquad \\text{trail: exactly two odd degrees}",
  note: "The graph must be connected; a trail starts at one odd vertex and ends at the other.",
}

const hamiltonian: BookletEntry = {
  name: "Hamiltonian cycles",
  latex: "\\text{visits every vertex exactly once}",
  note: "Unlike Eulerian circuits there is no simple necessary-and-sufficient test.",
}

const completeGraph: BookletEntry = {
  name: "Complete graph Kₙ",
  latex: "E = \\frac{n(n-1)}{2}",
}

const treeEdges: BookletEntry = {
  name: "Trees",
  latex: "E = V - 1",
  note: "A tree is connected with no cycles; removing any edge disconnects it.",
}

const kruskal: BookletEntry = {
  name: "Minimum spanning tree — Kruskal",
  latex: "\\text{sort edges by weight; add the lightest edge that avoids a cycle}",
  note: "Repeat until V − 1 edges are chosen.",
}

const prim: BookletEntry = {
  name: "Minimum spanning tree — Prim",
  latex: "\\text{grow from one vertex; always add the cheapest outgoing edge}",
}

const dijkstra: BookletEntry = {
  name: "Shortest path — Dijkstra",
  latex: "\\text{relax edges from the nearest unsettled vertex until done}",
  note: "Requires non-negative weights.",
}

const chinesePostman: BookletEntry = {
  name: "Chinese postman problem",
  latex: "\\text{traverse every edge at least once, minimizing total weight}",
  note: "Pair up odd vertices with cheapest paths and duplicate those edges.",
}

const adjacencyMatrix: BookletEntry = {
  name: "Adjacency matrices and walks",
  latex: "A^k_{ij} = \\text{number of walks of length } k \\text{ from } i \\text{ to } j",
}

const permutations: BookletEntry = {
  name: "Permutations",
  latex: "{}^n P_r = \\frac{n!}{(n-r)!}",
  note: "Arrangements where order matters.",
}

const combinations: BookletEntry = {
  name: "Combinations",
  latex: "\\binom{n}{r} = \\frac{n!}{r!\\,(n-r)!}",
  note: "Selections where order does not matter.",
}

const additionRule: BookletEntry = {
  name: "Addition rule",
  latex: "P(A \\cup B) = P(A) + P(B) - P(A \\cap B)",
}

const mutuallyExclusive: BookletEntry = {
  name: "Mutually exclusive events",
  latex: "A \\cap B = \\emptyset \\implies P(A \\cup B) = P(A) + P(B)",
}

const conditional: BookletEntry = {
  name: "Conditional probability",
  latex: "P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}",
}

const independence: BookletEntry = {
  name: "Independent events",
  latex: "P(A \\cap B) = P(A)\\,P(B), \\qquad P(A \\mid B) = P(A)",
}

const bayes: BookletEntry = {
  name: "Bayes' theorem",
  latex: "P(A \\mid B) = \\frac{P(B \\mid A)\\,P(A)}{P(B)}",
  note: "Tree diagrams and two-way tables give the same answer with less algebra.",
}

const complementRule: BookletEntry = {
  name: "Complement rule",
  latex: "P(A') = 1 - P(A)",
}

const expectation: BookletEntry = {
  name: "Expected value",
  latex: "E(X) = \\sum x\\,P(X = x)",
}

const variance: BookletEntry = {
  name: "Variance",
  latex: "\\mathrm{Var}(X) = E(X^2) - [E(X)]^2",
}

const sampleMean: BookletEntry = {
  name: "Sample mean",
  latex: "\\bar{x} = \\frac{\\sum x_i}{n}",
}

const sampleVariance: BookletEntry = {
  name: "Sample variance",
  latex: "s^2 = \\frac{\\sum (x_i - \\bar{x})^2}{n - 1}",
  note: "Divide by n for a population variance, n − 1 for a sample.",
}

const outliers: BookletEntry = {
  name: "Quartiles and outliers",
  latex: "\\text{outlier if } x < Q_1 - 1.5\\,\\mathrm{IQR} \\ \\text{ or } \\ x > Q_3 + 1.5\\,\\mathrm{IQR}",
  note: "IQR = Q₃ − Q₁, the middle 50% of the data.",
}

const regressionLine: BookletEntry = {
  name: "Least-squares regression line",
  latex: "y = a + bx, \\qquad b = \\frac{S_{xy}}{S_{xx}}, \\qquad a = \\bar{y} - b\\bar{x}",
}

const pearsonR: BookletEntry = {
  name: "Pearson correlation",
  latex: "r = \\frac{S_{xy}}{\\sqrt{S_{xx}\\,S_{yy}}}",
  note: "Between −1 and 1; measures linear association only.",
}

const spearman: BookletEntry = {
  name: "Spearman's rank correlation",
  latex: "r_s = 1 - \\frac{6\\sum d^2}{n(n^2 - 1)}",
  note: "d is the difference in ranks — use for monotone but non-linear trends.",
}

const binomialPmf: BookletEntry = {
  name: "Binomial probability",
  latex: "X \\sim B(n, p): \\qquad P(X = r) = \\binom{n}{r} p^{r}(1-p)^{n-r}",
}

const binomialParams: BookletEntry = {
  name: "Binomial parameters",
  latex: "E(X) = np, \\qquad \\mathrm{Var}(X) = np(1-p)",
}

const normalStandardisation: BookletEntry = {
  name: "Normal distribution",
  latex: "X \\sim N(\\mu, \\sigma^2), \\qquad Z = \\frac{X - \\mu}{\\sigma}",
  note: "Standardize before reading the table or using the GDC.",
}

const normalApproxBinomial: BookletEntry = {
  name: "Normal approximation to the binomial",
  latex: "B(n, p) \\approx N\\big(np,\\ np(1-p)\\big)",
  note: "Reasonable when np and n(1−p) are both comfortably above 5.",
}

const poissonPmf: BookletEntry = {
  name: "Poisson probability",
  latex: "X \\sim \\mathrm{Po}(\\lambda): \\qquad P(X = r) = \\frac{e^{-\\lambda}\\lambda^{r}}{r!}",
}

const poissonParams: BookletEntry = {
  name: "Poisson parameters",
  latex: "E(X) = \\lambda, \\qquad \\mathrm{Var}(X) = \\lambda",
}

const chiSquared: BookletEntry = {
  name: "Chi-squared statistic",
  latex: "\\chi^2 = \\sum \\frac{(f_o - f_e)^2}{f_e}",
  note: "Goodness of fit: degrees of freedom n − 1; independence: (rows − 1)(columns − 1).",
}

const tTest: BookletEntry = {
  name: "t-test statistic",
  latex: "t = \\frac{\\bar{x} - \\mu}{s / \\sqrt{n}}, \\qquad \\text{df} = n - 1",
}

const confidenceInterval: BookletEntry = {
  name: "Confidence interval for a mean",
  latex: "\\bar{x} \\pm t^* \\frac{s}{\\sqrt{n}}",
  note: "t* comes from the t-distribution at the chosen confidence level.",
}

const firstPrinciples: BookletEntry = {
  name: "Derivative from first principles",
  latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}",
}

const powerRule: BookletEntry = {
  name: "Power rule",
  latex: "\\frac{d}{dx} x^n = n x^{n-1}",
}

const linearityOfDerivative: BookletEntry = {
  name: "Linearity of the derivative",
  latex:
    "\\frac{d}{dx}\\,[kf] = kf', \\qquad \\frac{d}{dx}\\,[f + g] = f' + g'",
}

const productRule: BookletEntry = {
  name: "Product rule",
  latex: "\\frac{d}{dx}(uv) = u'v + uv'",
}

const quotientRule: BookletEntry = {
  name: "Quotient rule",
  latex: "\\frac{d}{dx}\\!\\left(\\frac{u}{v}\\right) = \\frac{u'v - uv'}{v^2}",
}

const chainRule: BookletEntry = {
  name: "Chain rule",
  latex: "\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}",
}

const expLogDerivatives: BookletEntry = {
  name: "Exponential and log derivatives",
  latex: "\\frac{d}{dx} e^x = e^x, \\qquad \\frac{d}{dx} \\ln x = \\frac{1}{x}",
}

const trigDerivatives: BookletEntry = {
  name: "Trigonometric derivatives",
  latex:
    "\\frac{d}{dx} \\sin x = \\cos x, \\qquad \\frac{d}{dx} \\cos x = -\\sin x, \\qquad \\frac{d}{dx} \\tan x = \\sec^2 x",
}

const stationaryPoints: BookletEntry = {
  name: "Stationary points",
  latex: "f'(x) = 0",
  note: "Second-derivative test: f″ > 0 minimum, f″ < 0 maximum, f″ = 0 check the sign change.",
}

const lHopital: BookletEntry = {
  name: "L'Hôpital's rule",
  latex: "\\lim \\frac{f(x)}{g(x)} = \\lim \\frac{f'(x)}{g'(x)}",
  note: "Applies to 0/0 and ∞/∞ forms; repeat if the limit stays indeterminate.",
}

const maclaurin: BookletEntry = {
  name: "Maclaurin series",
  latex: "f(x) = f(0) + f'(0)\\,x + \\frac{f''(0)}{2!}x^2 + \\cdots",
}

const maclaurinExp: BookletEntry = {
  name: "Maclaurin series of eˣ",
  latex: "e^x = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\cdots",
}

const maclaurinTrig: BookletEntry = {
  name: "Maclaurin series of sin and cos",
  latex:
    "\\sin x = x - \\frac{x^3}{3!} + \\frac{x^5}{5!} - \\cdots \\\\ \\cos x = 1 - \\frac{x^2}{2!} + \\frac{x^4}{4!} - \\cdots",
}

const maclaurinLn: BookletEntry = {
  name: "Maclaurin series of ln(1 + x)",
  latex: "\\ln(1 + x) = x - \\frac{x^2}{2} + \\frac{x^3}{3} - \\cdots, \\qquad |x| < 1",
}

const powerIntegral: BookletEntry = {
  name: "Power rule for integration",
  latex: "\\int x^n\\, dx = \\frac{x^{n+1}}{n+1} + C, \\qquad n \\neq -1",
}

const reciprocalIntegral: BookletEntry = {
  name: "Reciprocal integral",
  latex: "\\int \\frac{1}{x}\\, dx = \\ln|x| + C",
}

const standardIntegrals: BookletEntry = {
  name: "Standard integrals",
  latex:
    "\\int e^x dx = e^x + C \\\\ \\int \\sin x\\, dx = -\\cos x + C \\\\ \\int \\cos x\\, dx = \\sin x + C",
}

const fundamentalTheorem: BookletEntry = {
  name: "Fundamental theorem of calculus",
  latex: "\\int_a^b f(x)\\, dx = F(b) - F(a)",
  note: "F is any antiderivative of f.",
}

const substitution: BookletEntry = {
  name: "Integration by substitution",
  latex: "\\int f(g(x))\\,g'(x)\\, dx = \\int f(u)\\, du, \\qquad u = g(x)",
}

const integrationByParts: BookletEntry = {
  name: "Integration by parts",
  latex: "\\int u\\, dv = uv - \\int v\\, du",
}

const areaBetweenCurves: BookletEntry = {
  name: "Area between curves",
  latex: "A = \\int_a^b \\big(f(x) - g(x)\\big)\\, dx",
  note: "Use the upper curve minus the lower curve over the intersection interval.",
}

const volumeOfRevolution: BookletEntry = {
  name: "Volume of revolution",
  latex: "V = \\pi \\int_a^b y^2\\, dx",
  note: "Rotating the region under y = f(x) around the x-axis.",
}

const trapezoidalRule: BookletEntry = {
  name: "Trapezoidal rule",
  latex:
    "\\int_a^b f(x)\\, dx \\approx \\frac{h}{2}\\big(y_0 + 2(y_1 + \\cdots + y_{n-1}) + y_n\\big), \\qquad h = \\frac{b-a}{n}",
}

const separableOde: BookletEntry = {
  name: "Separable differential equations",
  latex:
    "\\frac{dy}{dx} = f(x)\\,g(y) \\implies \\int \\frac{1}{g(y)}\\, dy = \\int f(x)\\, dx",
}

const integratingFactor: BookletEntry = {
  name: "Integrating factor",
  latex:
    "\\frac{dy}{dx} + P(x)\\,y = Q(x) \\implies y\\,e^{\\int P dx} = \\int Q\\,e^{\\int P dx}\\, dx",
}

const eulerMethod: BookletEntry = {
  name: "Euler's method",
  latex: "y_{n+1} = y_n + h\\,f(x_n, y_n)",
  note: "Step along the slope field with step size h to approximate the solution curve.",
}

const slopeField: BookletEntry = {
  name: "Slope fields",
  latex: "\\frac{dy}{dx} = f(x, y)",
  note: "Short segments of slope f(x, y) trace the shape of solution curves.",
}

const growthModel: BookletEntry = {
  name: "Growth and decay models",
  latex: "\\frac{dP}{dt} = kP \\implies P = P_0 e^{kt}",
  note: "k > 0 growth, k < 0 decay; the logistic model caps growth at a carrying capacity.",
}

const kinematics: BookletEntry = {
  name: "Kinematics",
  latex:
    "v = \\frac{ds}{dt}, \\qquad a = \\frac{dv}{dt} = \\frac{d^2s}{dt^2}, \\qquad s = \\int v\\, dt, \\qquad v = \\int a\\, dt",
  note: "Distance traveled is ∫|v| dt; displacement is ∫ v dt.",
}

const tangentLine: BookletEntry = {
  name: "Tangent and normal lines",
  latex: "y - y_1 = m(x - x_1)",
  note: "Tangent slope m = f′(x₁); the normal has slope −1/m.",
}

export const BOOKLETS: CourseBooklet[] = [
  {
    course: "AA HL",
    sections: [
      {
        id: "numbers-algebra",
        title: "Numbers & Algebra",
        entries: [
          binomialTheorem,
          binomialCoefficient,
          arithmeticSequence,
          arithmeticSeries,
          geometricSequence,
          geometricSeries,
          infiniteSum,
          exponentLaws,
          fractionalPowers,
          logDefinition,
          logLaws,
          changeOfBase,
          complexCartesian,
          complexPolar,
          eulerFormula,
          deMoivre,
          nthRoots,
          rootsOfUnity,
          modulusInequality,
          induction,
        ],
      },
      {
        id: "functions",
        title: "Functions",
        entries: [
          quadraticVertex,
          discriminant,
          quadraticFormula,
          sumProductRoots,
          factorTheorem,
          remainderTheorem,
          transformations,
          inverseFunction,
          compositeFunction,
          oddEven,
          expLogInverse,
          rationalAsymptotes,
          modulusGraph,
        ],
      },
      {
        id: "geometry-trigonometry",
        title: "Geometry & Trigonometry",
        entries: [
          radians,
          arcLength,
          sectorArea,
          rightTriangle,
          triangleArea,
          sineRule,
          cosineRule,
          pythagoreanIdentity,
          tanIdentity,
          compoundSine,
          compoundCosine,
          compoundTangent,
          doubleAngle,
          specialAngles,
          trigGraph,
          generalSolution,
          vectorMagnitude,
          dotProduct,
          perpendicularVectors,
          vectorLine,
          angleBetweenLines,
          crossProduct,
          planeEquation,
          pointPlaneDistance,
          distance3d,
        ],
      },
      {
        id: "statistics-probability",
        title: "Statistics & Probability",
        entries: [
          permutations,
          combinations,
          additionRule,
          mutuallyExclusive,
          conditional,
          independence,
          bayes,
          complementRule,
          expectation,
          variance,
          sampleMean,
          sampleVariance,
          regressionLine,
          pearsonR,
          binomialPmf,
          binomialParams,
          normalStandardisation,
        ],
      },
      {
        id: "calculus",
        title: "Calculus",
        entries: [
          firstPrinciples,
          powerRule,
          linearityOfDerivative,
          productRule,
          quotientRule,
          chainRule,
          expLogDerivatives,
          trigDerivatives,
          stationaryPoints,
          lHopital,
          maclaurin,
          maclaurinExp,
          maclaurinTrig,
          maclaurinLn,
          powerIntegral,
          reciprocalIntegral,
          standardIntegrals,
          fundamentalTheorem,
          substitution,
          integrationByParts,
          areaBetweenCurves,
          volumeOfRevolution,
          separableOde,
          integratingFactor,
          kinematics,
        ],
      },
    ],
  },
  {
    course: "AI HL",
    sections: [
      {
        id: "numbers-algebra",
        title: "Numbers & Algebra",
        entries: [
          standardForm,
          percentageError,
          arithmeticSequence,
          arithmeticSeries,
          geometricSequence,
          geometricSeries,
          infiniteSum,
          exponentLaws,
          logDefinition,
          logLaws,
          changeOfBase,
          complexCartesian,
          complexPolar,
          deMoivre,
          matrixMultiplication,
          matrixInverse2,
          matrixSolve,
          transitionMatrix,
        ],
      },
      {
        id: "functions",
        title: "Functions",
        entries: [
          linearEquation,
          perpendicularSlopes,
          quadraticVertex,
          discriminant,
          quadraticFormula,
          cubicFeatures,
          exponentialModel,
          sinusoidalModel,
          transformations,
          inverseFunction,
          compositeFunction,
          modulusGraph,
        ],
      },
      {
        id: "geometry-trigonometry",
        title: "Geometry & Trigonometry",
        entries: [
          radians,
          arcLength,
          sectorArea,
          rightTriangle,
          triangleArea,
          sineRule,
          cosineRule,
          pythagoreanIdentity,
          tanIdentity,
          doubleAngle,
          trigGraph,
          distance3d,
          midpoint3d,
          sphere,
          cone,
          cylinder,
          vectorMagnitude,
          dotProduct,
          perpendicularVectors,
          vectorLine,
          angleBetweenLines,
          planeEquation,
          voronoiBisector,
          voronoiCell,
          handshakeLemma,
          eulerian,
          hamiltonian,
          completeGraph,
          treeEdges,
          kruskal,
          prim,
          dijkstra,
          chinesePostman,
          adjacencyMatrix,
        ],
      },
      {
        id: "statistics-probability",
        title: "Statistics & Probability",
        entries: [
          permutations,
          combinations,
          additionRule,
          conditional,
          independence,
          bayes,
          complementRule,
          expectation,
          variance,
          sampleMean,
          sampleVariance,
          outliers,
          regressionLine,
          pearsonR,
          spearman,
          binomialPmf,
          binomialParams,
          normalStandardisation,
          normalApproxBinomial,
          poissonPmf,
          poissonParams,
          chiSquared,
          tTest,
          confidenceInterval,
        ],
      },
      {
        id: "calculus",
        title: "Calculus",
        entries: [
          firstPrinciples,
          powerRule,
          productRule,
          quotientRule,
          chainRule,
          expLogDerivatives,
          trigDerivatives,
          tangentLine,
          stationaryPoints,
          powerIntegral,
          reciprocalIntegral,
          standardIntegrals,
          fundamentalTheorem,
          substitution,
          areaBetweenCurves,
          volumeOfRevolution,
          trapezoidalRule,
          separableOde,
          slopeField,
          eulerMethod,
          growthModel,
          kinematics,
        ],
      },
    ],
  },
]

/** Returns the booklet sections for a course, defaulting to AA HL. */
export function bookletFor(course: string): BookletSection[] {
  return (
    BOOKLETS.find((booklet) => booklet.course === course)?.sections ??
    BOOKLETS[0]?.sections ??
    []
  )
}
