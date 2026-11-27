import test from "node:test";
import assert from "node:assert/strict";

import {
  mapSymbol,
  classifyFont,
  buildLines,
  insertSpaces,
  latexifyLine,
  isQuestionHeader,
  parseQuestionHeader,
  SCRIPT_SIZE_RATIO,
} from "./pdfmath.mjs";

// ---------------------------------------------------------------------------
// mapSymbol: PUA (Symbol-font) codes and already-decoded Unicode both map to
// LaTeX. Unknown input passes through untouched so nothing is silently lost.
// ---------------------------------------------------------------------------
test("mapSymbol maps PUA operator codes to LaTeX", () => {
  assert.equal(mapSymbol("\uf03d"), "="); // =
  assert.equal(mapSymbol("\uf02d"), "-"); // minus
  assert.equal(mapSymbol("\uf02b"), "+"); // plus
  assert.equal(mapSymbol("\uf0b3"), "\\geq");
  assert.equal(mapSymbol("\uf0a3"), "\\leq");
  assert.equal(mapSymbol("\uf0b9"), "\\neq");
  assert.equal(mapSymbol("\uf0b4"), "\\times");
  assert.equal(mapSymbol("\uf0b8"), "\\div");
  assert.equal(mapSymbol("\uf0b1"), "\\pm");
  assert.equal(mapSymbol("\uf0a5"), "\\infty");
  assert.equal(mapSymbol("\uf0ae"), "\\rightarrow");
  assert.equal(mapSymbol("\uf0de"), "\\Rightarrow");
  assert.equal(mapSymbol("\uf0db"), "\\Leftrightarrow");
  assert.equal(mapSymbol("\uf0d6"), "\\sqrt");
});

test("mapSymbol maps Symbol Greek letter codes to LaTeX", () => {
  assert.equal(mapSymbol("\uf061"), "\\alpha");
  assert.equal(mapSymbol("\uf062"), "\\beta");
  assert.equal(mapSymbol("\uf071"), "\\theta");
  assert.equal(mapSymbol("\uf067"), "\\gamma");
  assert.equal(mapSymbol("\uf070"), "\\pi");
  assert.equal(mapSymbol("\uf06d"), "\\mu");
  assert.equal(mapSymbol("\uf044"), "\\Delta");
});

test("mapSymbol maps decoded Unicode math glyphs", () => {
  assert.equal(mapSymbol("\u2265"), "\\geq");
  assert.equal(mapSymbol("\u2264"), "\\leq");
  assert.equal(mapSymbol("\u00d7"), "\\times");
  assert.equal(mapSymbol("\u00f7"), "\\div");
  assert.equal(mapSymbol("\u21d2"), "\\Rightarrow");
  assert.equal(mapSymbol("\u21d4"), "\\Leftrightarrow");
  assert.equal(mapSymbol("\u222b"), "\\int");
  assert.equal(mapSymbol("\u03c0"), "\\pi");
  assert.equal(mapSymbol("\u00b0"), "\\degree");
});

test("mapSymbol passes through plain letters and digits", () => {
  assert.equal(mapSymbol("s"), "s");
  assert.equal(mapSymbol("6"), "6");
  assert.equal(mapSymbol("("), "(");
  assert.equal(mapSymbol("\u0000"), "\u0000"); // unknown survives for QA scan
});

// ---------------------------------------------------------------------------
// classifyFont
// ---------------------------------------------------------------------------
test("classifyFont buckets fonts into body / math / symbol / other", () => {
  assert.equal(classifyFont("RRTVUI+Arial"), "body");
  assert.equal(classifyFont("RABYKY+Arial,Bold"), "body");
  assert.equal(classifyFont("GBGOAU+TimesNewRoman"), "math");
  assert.equal(classifyFont("JBEEIF+TimesNewRoman,Italic"), "math");
  assert.equal(classifyFont("TWPWAV+Symbol"), "symbol");
  assert.equal(classifyFont("ABCDEF+MTExtra"), "other");
  assert.equal(classifyFont(""), "other");
});

// ---------------------------------------------------------------------------
// buildLines: group chars into visual lines by vertical overlap, then sort by
// x. Fixture chars are the real geometry of the formula line "s = 6t - t^2,
// t >= 0 (in meters)" from page 0 of the Nikolaidis kinematics PDF.
// ---------------------------------------------------------------------------
const FORMULA_CHARS = [
  { x0: 237.59, x1: 243.1, top: 292.08, bottom: 303.24, size: 11.16, fontname: "JBEEIF+TimesNewRoman,Itali", text: "s" },
  { x0: 244.92, x1: 250.5, top: 290.58, bottom: 301.74, size: 11.16, fontname: "TWPWAV+Symbol", text: "\uf03d" },
  { x0: 253.56, x1: 259.1, top: 292.06, bottom: 303.22, size: 11.16, fontname: "GBGOAU+TimesNewRoman", text: "6" },
  { x0: 259.08, x1: 264.6, top: 292.08, bottom: 303.24, size: 11.16, fontname: "JBEEIF+TimesNewRoman,Itali", text: "t" },
  { x0: 264.72, x1: 270.3, top: 290.58, bottom: 301.74, size: 11.16, fontname: "TWPWAV+Symbol", text: "\uf02d" },
  { x0: 272.64, x1: 278.2, top: 292.08, bottom: 303.24, size: 11.16, fontname: "JBEEIF+TimesNewRoman,Itali", text: "t" },
  { x0: 276.72, x1: 280.3, top: 290.72, bottom: 297.17, size: 6.45, fontname: "GBGOAU+TimesNewRoman", text: "2" },
  { x0: 282.0, x1: 284.4, top: 292.52, bottom: 302.9, size: 10.38, fontname: "RRTVUI+Arial", text: "," },
  { x0: 285.0, x1: 287.7, top: 292.52, bottom: 302.9, size: 10.38, fontname: "RRTVUI+Arial", text: " " },
  { x0: 287.76, x1: 290.5, top: 292.52, bottom: 302.9, size: 10.38, fontname: "RRTVUI+Arial", text: " " },
  { x0: 290.77, x1: 293.5, top: 292.52, bottom: 302.9, size: 10.38, fontname: "RRTVUI+Arial", text: " " },
  { x0: 294.96, x1: 300.5, top: 292.12, bottom: 303.23, size: 11.11, fontname: "JBEEIF+TimesNewRoman,Itali", text: "t" },
  { x0: 301.56, x1: 307.1, top: 290.63, bottom: 301.74, size: 11.11, fontname: "TWPWAV+Symbol", text: "\uf0b3" },
  { x0: 310.56, x1: 316.1, top: 292.1, bottom: 303.21, size: 11.11, fontname: "GBGOAU+TimesNewRoman", text: "0" },
  { x0: 318.12, x1: 320.8, top: 292.52, bottom: 302.9, size: 10.38, fontname: "LRMSER+Arial,Italic", text: " " },
  { x0: 321.12, x1: 323.8, top: 292.52, bottom: 302.9, size: 10.38, fontname: "LRMSER+Arial,Italic", text: " " },
  { x0: 323.88, x1: 326.5, top: 292.52, bottom: 302.9, size: 10.38, fontname: "LRMSER+Arial,Italic", text: "(" },
  { x0: 330.36, x1: 333.1, top: 292.52, bottom: 302.9, size: 10.38, fontname: "LRMSER+Arial,Italic", text: "i" },
  { x0: 332.52, x1: 338.3, top: 292.52, bottom: 302.9, size: 10.38, fontname: "LRMSER+Arial,Italic", text: "n" },
  { x0: 338.28, x1: 340.9, top: 292.52, bottom: 302.9, size: 10.38, fontname: "LRMSER+Arial,Italic", text: " " },
  { x0: 341.16, x1: 349.8, top: 292.52, bottom: 302.9, size: 10.38, fontname: "LRMSER+Arial,Italic", text: "m" },
  { x0: 349.8, x1: 355.4, top: 292.52, bottom: 302.9, size: 10.38, fontname: "LRMSER+Arial,Italic", text: "e" },
  { x0: 355.44, x1: 358.4, top: 292.52, bottom: 302.9, size: 10.38, fontname: "LRMSER+Arial,Italic", text: "t" },
  { x0: 358.44, x1: 361.4, top: 292.52, bottom: 302.9, size: 10.38, fontname: "LRMSER+Arial,Italic", text: "e" },
  { x0: 364.2, x1: 367.7, top: 292.52, bottom: 302.9, size: 10.38, fontname: "LRMSER+Arial,Italic", text: "r" },
  { x0: 367.68, x1: 370.4, top: 292.52, bottom: 302.9, size: 10.38, fontname: "RRTVUI+Arial", text: "s" },
];

test("buildLines keeps the superscript 2 on the same line as its base", () => {
  const lines = buildLines(FORMULA_CHARS);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].chars.length, FORMULA_CHARS.length);
});

test("buildLines splits vertically separated text into separate lines", () => {
  const other = FORMULA_CHARS.map((c) => ({ ...c, top: c.top + 40, bottom: c.bottom + 40 }));
  const lines = buildLines([...FORMULA_CHARS, ...other]);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].chars.length, FORMULA_CHARS.length);
  assert.equal(lines[1].chars.length, other.length);
});

test("buildLines orders chars within a line by x0", () => {
  const shuffled = [...FORMULA_CHARS].reverse();
  const [line] = buildLines(shuffled);
  const text = line.chars.map((c) => c.text).join("");
  assert.equal(text, "s\uf03d6t\uf02dt2,   t\uf0b30  (in meters");
});

// ---------------------------------------------------------------------------
// insertSpaces: word gaps without an explicit space glyph get one inserted,
// but the overlapping superscript stays attached to its base.
// ---------------------------------------------------------------------------
test("insertSpaces adds a space on a wide gap and none before a superscript", () => {
  const chars = [
    { x0: 0, x1: 10, text: "a", size: 10 },
    { x0: 25, x1: 35, text: "b", size: 10 }, // gap 15 -> space
    { x0: 35.5, x1: 39, text: "2", size: 6 }, // overlapping superscript -> none
  ];
  assert.equal(insertSpaces(chars).map((c) => c.text).join(""), "a b2");
});

test("insertSpaces does not duplicate an explicit space glyph", () => {
  const chars = [
    { x0: 0, x1: 10, text: "a", size: 10 },
    { x0: 14, x1: 18, text: " ", size: 10 },
    { x0: 22, x1: 32, text: "b", size: 10 },
  ];
  assert.equal(insertSpaces(chars).map((c) => c.text).join(""), "a b");
});

// ---------------------------------------------------------------------------
// latexifyLine: mixed body/math segmentation with script attachment and a
// single-line fraction.
// ---------------------------------------------------------------------------
test("latexifyLine converts the kinematics formula line to inline LaTeX", () => {
  const [line] = buildLines(FORMULA_CHARS);
  const out = latexifyLine(line);
  assert.equal(out, "$s=6t-t^{2}$, $t\\geq 0$ (in meters");
});

test("latexifyLine attaches subscripts and superscripts in reading order", () => {
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const chars = [
    { ...mk(0, 11, 300, "y"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(5, 11, 300, "=", "TWPWAV+Symbol"),
    { ...mk(10, 11, 300, "x"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(15, 6.5, 304, "1"), // subscript (lowered)
    mk(19, 6.5, 295, "2"), // superscript (raised)
    mk(24, 11, 300, "+", "TWPWAV+Symbol"),
    { ...mk(29, 11, 300, "z"), fontname: "JBEEIF+TimesNewRoman,Itali" },
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$y=x_{1}^{2}+z$");
});

test("latexifyLine converts a stacked digit pair into \\frac", () => {
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const chars = [
    { ...mk(0, 11, 300, "s"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(5, 11, 300, "=", "TWPWAV+Symbol"),
    { ...mk(10, 11, 300, "t"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(15, 11, 295, "1"), // numerator (raised, full-size)
    mk(18, 11, 304.1, "2"), // denominator (lowered, full-size), overlapping x
    { ...mk(22, 11, 300, "t"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(27, 11, 300, "+", "TWPWAV+Symbol"),
    mk(32, 11, 300, "3"),
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$s=t\\frac{1}{2}t+3$");
});

test("latexifyLine groups interleaved stacked chars into a multi-char \\frac", () => {
  // Real x-order for ds/dt: numerator chars and denominator chars interleave.
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const chars = [
    { ...mk(0, 11, 300, "v"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(5, 11, 300, "=", "TWPWAV+Symbol"),
    mk(10, 11, 295, "d"), // numerator char 1 (raised, full-size)
    mk(10.5, 11, 304.1, "d"), // denominator char 1 (lowered, full-size)
    mk(14, 11, 295, "s"), // numerator char 2 (raised, full-size)
    mk(14.5, 11, 304.1, "t"), // denominator char 2 (lowered, full-size)
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$v=\\frac{ds}{dt}$");
});

test("latexifyLine groups consecutive lowered scripts into one subscript", () => {
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const chars = [
    { ...mk(0, 11, 300, "s"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(5, 6.5, 304.5, "m"),
    mk(9, 6.5, 304.5, "a"),
    mk(13, 6.5, 304.5, "x"),
    mk(18, 11, 300, "=", "TWPWAV+Symbol"),
    mk(23, 11, 300, "1"),
    mk(27, 11, 300, "6"),
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$s_{max}=16$");
});

test("latexifyLine treats lines whose dominant size is the small one as plain text", () => {
  // Mirrors solution 5 in the kinematics PDF: one full-size glyph, everything
  // else at the smaller size on the same baseline.
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 2, top: bottom - size, bottom, size, fontname, text,
  });
  const chars = [
    mk(0, 11.16, 304, "5"),
    mk(7, 6.45, 302, "."),
    mk(10, 6.45, 302, "("),
    mk(13, 6.45, 302, "a"),
    mk(16, 6.45, 302, ")"),
    { ...mk(19, 6.45, 302, "v"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(22, 6.45, 302, "=", "TWPWAV+Symbol"),
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$5.(a)v=$");
});

test("latexifyLine solutions mode wraps word runs in \\text", () => {
  // Solutions PDFs set body words at a smaller Times size than math symbols.
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const body = (x0, text) => mk(x0, 10.38, 314.2, text);
  const math = (x0, text, fontname = "GBGOAU+TimesNewRoman") => mk(x0, 11.12, 316.9, text, fontname);
  const chars = [
    body(0, "v"), body(4, "e"), body(8, "l"), body(12, "o"),
    body(16, "c"), body(20, "i"), body(24, "t"), body(28, "y"),
    body(32, " "),
    body(36, "o"), body(40, "f"),
    body(44, " "),
    body(48, "b"), body(52, "o"), body(56, "d"), body(60, "y"),
    body(64, " "),
    body(68, "a"), body(72, "t"),
    body(76, " "),
    math(80, "t", "JBEEIF+TimesNewRoman,Itali"),
    math(84, "=", "TWPWAV+Symbol"),
    math(88, "2"),
    math(92, "s", "JBEEIF+TimesNewRoman,Itali"),
  ];
  const [line] = buildLines(chars);
  assert.equal(
    latexifyLine(line, { solutions: true }),
    "$\\text{velocity} \\text{of} \\text{body} \\text{at} t=2s$"
  );
});

test("latexifyLine solutions mode leaves math-size letter pairs as math", () => {
  // "gt" is g times t (math size), not the English word "gt".
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const math = (x0, text, fontname = "GBGOAU+TimesNewRoman") =>
    mk(x0, 11.12, 316.9, text, fontname);
  const chars = [
    math(0, "1"),
    math(4, "2"),
    math(8, "g", "JBEEIF+TimesNewRoman,Itali"),
    math(12, "t", "JBEEIF+TimesNewRoman,Itali"),
    math(16, "2"),
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line, { solutions: true }), "$12gt2$");
});

test("latexifyLine detects subscripts by top displacement", () => {
  // Real geometry of "s=v0t": the subscript 0 is small but drops well below
  // the base's top while its bottom barely clears the base's bottom.
  const mk = (x0, size, top, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top, bottom: top + size, size, fontname, text,
  });
  const chars = [
    { ...mk(0, 11.15, 623.6, "s"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(5, 11.15, 623.6, "=", "TWPWAV+Symbol"),
    { ...mk(10, 11.15, 623.6, "v"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(15, 6.44, 630.2, "0"),
    { ...mk(19, 11.15, 623.6, "t"), fontname: "JBEEIF+TimesNewRoman,Itali" },
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$s=v_{0}t$");
});

test("latexifyLine detects full-size stacked digits as \\frac", () => {
  // The 1/2 fractions in these PDFs use FULL-SIZE digits, raised and lowered.
  const mk = (x0, size, top, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top, bottom: top + size, size, fontname, text,
  });
  const chars = [
    { ...mk(0, 11.15, 623.6, "s"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(5, 11.15, 623.6, "=", "TWPWAV+Symbol"),
    { ...mk(10, 11.15, 623.6, "v"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(15, 11.15, 616.7, "1"), // numerator (full-size, raised)
    mk(18.6, 11.15, 632.4, "2"), // denominator (full-size, lowered)
    { ...mk(23, 11.15, 623.6, "g"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    { ...mk(27, 11.15, 623.6, "t"), fontname: "JBEEIF+TimesNewRoman,Itali" },
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$s=v\\frac{1}{2}gt$");
});

test("latexifyLine maps Symbol operators inside math runs", () => {
  const mk = (x0, bottom, text, fontname = "TWPWAV+Symbol") => ({
    x0, x1: x0 + 5, top: bottom - 11, bottom, size: 11, fontname, text,
  });
  const chars = [
    { ...mk(0, 300, "a"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(6, 300, "\uf0b3"),
    { ...mk(12, 300, "0"), fontname: "GBGOAU+TimesNewRoman" },
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$a\\geq 0$");
});

// ---------------------------------------------------------------------------
// Question-header parsing (from the questions PDFs).
// ---------------------------------------------------------------------------
test("isQuestionHeader recognizes numbered [Maximum mark: N] lines", () => {
  assert.equal(isQuestionHeader("1. [Maximum mark: 12] [without GDC]"), true);
  assert.equal(isQuestionHeader("23. [Maximum mark: 6]"), true);
  assert.equal(isQuestionHeader("O. Practice questions"), false);
  assert.equal(isQuestionHeader("The displacement of a moving body"), false);
  assert.equal(isQuestionHeader("(a) Find the velocity"), false);
});

test("parseQuestionHeader extracts number and marks", () => {
  assert.deepEqual(parseQuestionHeader("1. [Maximum mark: 12] [without GDC]"), { number: 1, marks: 12, gdc: false });
  assert.deepEqual(parseQuestionHeader("23. [Maximum mark: 6]"), { number: 23, marks: 6, gdc: true });
  assert.deepEqual(parseQuestionHeader("41. [Maximum mark: 11] [with GDC]"), { number: 41, marks: 11, gdc: true });
});

test("mapSymbol maps comparison signs, prime and dash glyphs", () => {
  assert.equal(mapSymbol("\uf03c"), "<");
  assert.equal(mapSymbol("\uf03e"), ">");
  assert.equal(mapSymbol("\uf0a2"), "'");
  assert.equal(mapSymbol("\u2013"), "-");
});

// ---------------------------------------------------------------------------
// Real-geometry regressions from the kinematics QA pass.
// ---------------------------------------------------------------------------
test("insertSpaces adds a space on a moderate letter gap (sin t)", () => {
  const chars = [
    { x0: 0, x1: 8, text: "n", size: 11 },
    { x0: 11, x1: 16, text: "t", size: 11 }, // gap 3 = 0.27 x size
  ];
  assert.equal(insertSpaces(chars).map((c) => c.text).join(""), "n t");
});

test("latexifyLine maps non-italic letter runs to function commands", () => {
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const chars = [
    mk(0, 11, 300, "s"), mk(4, 11, 300, "i"), mk(7, 11, 300, "n"),
    mk(11, 11, 300, "2"),
    { ...mk(15, 11, 300, "t"), fontname: "JBEEIF+TimesNewRoman,Itali" },
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$\\sin 2t$");
});

test("latexifyLine leaves italic letter runs as plain variables", () => {
  const mk = (x0, size, bottom, text, fontname = "JBEEIF+TimesNewRoman,Itali") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const chars = [mk(0, 11, 300, "c"), mk(4, 11, 300, "o"), mk(8, 11, 300, "s")];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$cos$");
});

test("latexifyLine collapses growing-paren pieces into \\left( \\right)", () => {
  // Real geometry of "cos(2t + pi/4)" with a 3-piece Symbol paren.
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const chars = [
    mk(0, 11, 300, "c"), mk(3, 11, 300, "o"), mk(6, 11, 300, "s"),
    mk(9, 6.5, 292, "\uf0e6"), // paren top piece (raised)
    mk(10.5, 6.5, 300, "\uf0e7"), // paren extender
    mk(12, 6.5, 308, "\uf0e8"), // paren bottom piece (lowered)
    mk(13, 11, 300, "2"),
    { ...mk(17, 11, 300, "t"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(21, 11, 300, "\uf02b", "TWPWAV+Symbol"),
    mk(25, 11, 293, "\uf070", "TWPWAV+Symbol"), // pi raised (fraction numerator)
    mk(26, 11, 307, "4"), // fraction denominator (full-size, lowered)
    mk(29, 6.5, 290, "\uf0f6"), // paren top piece (right)
    mk(30, 6.5, 305, "\uf0f8"), // paren bottom piece (right)
    mk(31, 6.5, 300, "\uf0f7"), // paren extender (right)
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$\\cos\\left(2t+\\frac{\\pi}{4}\\right)$");
});

test("latexifyLine converts a raised caret over a letter into \\hat", () => {
  // Real geometry of "AO^B" (angle notation): the caret overlaps O, raised.
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const chars = [
    mk(0, 10.3, 300, "A"), mk(6, 10.3, 300, "O"),
    { ...mk(9.5, 10.3, 297, "\u02c6"), x1: 13.5 }, // overlaps O, raised
    mk(14, 10.3, 300, "B"),
    mk(20, 11, 300, "\uf03d", "TWPWAV+Symbol"),
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$A\\hat{O}B=$");
});

test("latexifyLine pairs a raised digit after a lowered digit into \\frac", () => {
  // Real geometry of "t < pi/4": the denominator digit precedes the numerator.
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const chars = [
    { ...mk(0, 11, 300, "t"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(6, 11, 300, "\uf03c", "TWPWAV+Symbol"),
    mk(12, 10.3, 307, "4"), // denominator (lowered, full-size)
    mk(12.5, 10.3, 293, "\uf070", "TWPWAV+Symbol"), // numerator (raised, full-size)
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$t<\\frac{\\pi}{4}$");
});

test("latexifyLine keeps script-sized stacked pairs as subscript then superscript", () => {
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const chars = [
    { ...mk(0, 11, 300, "v"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(5, 6.5, 304, "0"), // subscript (script size)
    mk(6, 6.5, 295, "2"), // superscript (script size), overlaps the 0
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$v_{0}^{2}$");
});

test("latexifyLine renders widely spaced lone labels as plain spaced text", () => {
  // Diagram letter rows (e.g. points A, T, P, B on a sketch) are not formulas.
  const mk = (x0, size, bottom, text) => ({
    x0, x1: x0 + 6, top: bottom - size, bottom, size,
    fontname: "GBGOAU+TimesNewRoman", text,
  });
  const chars = [
    mk(0, 10.3, 300, "A"), mk(130, 10.3, 308, "T"),
    mk(260, 10.3, 292, "P"), mk(390, 10.3, 300, "B"),
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$A T P B$");
});

test("latexifyLine keeps a superscript minus with its exponent", () => {
  // Real geometry of "v = e^(-t) sin t": the Symbol en-dash has wide side
  // bearings, so the gap to the exponent letter is larger than usual.
  const mk = (x0, size, bottom, text, fontname = "GBGOAU+TimesNewRoman") => ({
    x0, x1: x0 + 4, top: bottom - size, bottom, size, fontname, text,
  });
  const chars = [
    { ...mk(0, 11, 300, "v"), fontname: "JBEEIF+TimesNewRoman,Itali" },
    mk(6, 11, 300, "\uf03d", "TWPWAV+Symbol"),
    mk(14, 11, 300, "e"),
    { ...mk(20, 6.6, 295, "\u2013"), x1: 24 }, // superscript minus
    mk(28.4, 6.6, 295, "t"), // exponent letter, gap 4.4 = 0.67 x script size
    mk(34, 11, 300, "s"), mk(37, 11, 300, "i"), mk(40, 11, 300, "n"),
    { ...mk(45, 11, 300, "t"), fontname: "JBEEIF+TimesNewRoman,Itali" },
  ];
  const [line] = buildLines(chars);
  assert.equal(latexifyLine(line), "$v=e^{-t}\\sin t$");
});

test("SCRIPT_SIZE_RATIO is below 1 (script chars are smaller)", () => {
  assert.ok(SCRIPT_SIZE_RATIO < 1);
});
