import test from "node:test";
import assert from "node:assert/strict";

import {
  splitQuestions,
  parseSolutionBlocks,
  alignSolutions,
  stripQuestionHeader,
  isNoiseLine,
  SECTION_RE,
} from "./pdfq.mjs";

test("SECTION_RE matches O/A/B section headers", () => {
  assert.match("O. Practice questions", SECTION_RE);
  assert.match("A. Exam style questions (SHORT)", SECTION_RE);
  assert.match("B. Exam style questions (LONG)", SECTION_RE);
  assert.doesNotMatch("1. [Maximum mark: 12]", SECTION_RE);
});

test("stripQuestionHeader removes the numbered marks header", () => {
  assert.equal(stripQuestionHeader("1. [Maximum mark: 12] [without GDC]"), "");
  assert.equal(
    stripQuestionHeader("3. [Maximum mark: 6] Find the velocity"),
    "Find the velocity"
  );
  assert.equal(stripQuestionHeader("The displacement of a body"), "The displacement of a body");
});

test("isNoiseLine drops page numbers, titles and blanks", () => {
  assert.equal(isNoiseLine("1"), true);
  assert.equal(isNoiseLine("41"), true);
  assert.equal(isNoiseLine("Page 1"), true);
  assert.equal(isNoiseLine("KINEMATICS"), true);
  assert.equal(isNoiseLine("Compiled by Christos Nikolaidis"), true);
  assert.equal(isNoiseLine("$[Math-AA 5.12] KINEMATICS$"), true);
  assert.equal(isNoiseLine("The displacement of a moving body"), false);
  assert.equal(isNoiseLine("1. [Maximum mark: 12] [without GDC]"), false);
});

test("splitQuestions extracts questions with section tracking", () => {
  const lines = [
    "INTERNATIONAL BACCALAUREATE",
    "O. Practice questions",
    "1. [Maximum mark: 12] [without GDC]",
    "The displacement of moving body is given by $s=6t-t^{2}$",
    "(a) Find the velocity.",
    "2. [Maximum mark: 4] [without GDC]",
    "A body moves on a straight line.",
    "A. Exam style questions (SHORT)",
    "1. [Maximum mark: 6]",
    "Short question one.",
  ];
  const questions = splitQuestions(lines);
  assert.equal(questions.length, 3);
  assert.deepEqual(
    questions.map((q) => ({ n: q.number, s: q.section, gdc: q.gdc, marks: q.marks })),
    [
      { n: 1, s: "O", gdc: false, marks: 12 },
      { n: 2, s: "O", gdc: false, marks: 4 },
      { n: 1, s: "A", gdc: true, marks: 6 },
    ]
  );
  assert.equal(questions[0].lines[0], "The displacement of moving body is given by $s=6t-t^{2}$");
  assert.equal(questions[0].lines.length, 2);
});

test("splitQuestions skips past-paper sections", () => {
  const lines = [
    "O. Practice questions",
    "1. [Maximum mark: 4]",
    "Practice question.",
    "A. Past paper questions",
    "2. [Maximum mark: 9]",
    "IBO-derived question.",
    "B. Exam style questions (LONG)",
    "3. [Maximum mark: 11]",
    "Long question.",
  ];
  const questions = splitQuestions(lines);
  assert.equal(questions.length, 2);
  assert.deepEqual(questions.map((q) => q.number), [1, 3]);
});

test("splitQuestions drops questions with no content lines", () => {
  const lines = [
    "O. Practice questions",
    "1. [Maximum mark: 4]",
    "2. [Maximum mark: 6]",
    "Real content.",
  ];
  const questions = splitQuestions(lines);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].number, 2);
});

test("parseSolutionBlocks extracts numbered solution blocks", () => {
  const lines = [
    "O. Practice questions",
    "1. s=6t-t^{2}",
    "velocity of the body at any time t; v=6-2t",
    "2. (a) For t=0,s=2m",
    "(b) velocity is positive",
    "A. Exam style questions (SHORT)",
    "1. answer one",
  ];
  const blocks = parseSolutionBlocks(lines);
  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks.map((b) => ({ n: b.number, s: b.section })), [
    { n: 1, s: "O" },
    { n: 2, s: "O" },
    { n: 1, s: "A" },
  ]);
  assert.equal(blocks[0].lines[0], "s=6t-t^{2}");
  assert.equal(blocks[1].lines.length, 2);
});

test("parseSolutionBlocks does not treat decimal titles as question numbers", () => {
  const lines = ["[Math-AA 5.12] KINEMATICS", "1. s=6t-t^{2}"];
  const blocks = parseSolutionBlocks(lines);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].number, 1);
});

test("alignSolutions matches by section then number", () => {
  const questions = [
    { number: 1, section: "O", lines: ["q"] },
    { number: 1, section: "A", lines: ["q"] },
  ];
  const solutions = [
    { number: 1, section: "A", lines: ["sol A"] },
    { number: 2, section: "A", lines: ["sol A2"] },
  ];
  const out = alignSolutions(questions, solutions);
  assert.equal(out[0].solution, null);
  assert.equal(out[1].solution, "sol A");
  assert.equal(out[0].number, 1);
});

test("alignSolutions falls back to global number when sections differ", () => {
  const questions = [{ number: 5, section: "O", lines: ["q"] }];
  const solutions = [{ number: 5, section: null, lines: ["sol"] }];
  const out = alignSolutions(questions, solutions);
  assert.equal(out[0].solution, "sol");
});
