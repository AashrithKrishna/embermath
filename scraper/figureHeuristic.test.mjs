import { test } from "node:test";
import assert from "node:assert/strict";
import { detectMissingFigure } from "./figureHeuristic.mjs";

test("flags statements that depend on a shown figure", () => {
  const cases = [
    "The graph of y = f(x) is shown in the diagram below.",
    "In the figure, the angle ABC is 40 degrees.",
    "The gradient of the line is as shown above.",
    "The curve shown below passes through the point (0, 1).",
    "The following diagram shows the graph of y = g(x).",
    "The graph of g is shown below. (a) Sketch g' on the same axes.",
    "A quadrilateral ABCD is shown on the diagram below.",
    "The diagram below shows quadrilateral PQRS.",
    "The figure below shows a sector of a circle with radius 10 cm.",
    "Two can sizes, Normal and Mini, as depicted below. Units are in cm.",
    "Part of the graph of g(x) is sketched below for the interval -10 <= x <= 10.",
    "The data is illustrated in the box-and-whisker diagram shown below.",
    "Points A and B on the Argand diagram represent z and iz.",
    "A branching coral pattern is shown on the following Argand diagrams.",
    "The following cumulative frequency diagram shows the time taken.",
    "Part of this function was shaded, which can be seen from the figure below.",
    "All points were plotted on the diagram below.",
    "Another function is drawn with an equation p(x) = x^2 - 3.",
    "Their locations are shown on the coordinate grid below.",
    "The following graph shows the number of customers entering the shop.",
    "Consider the function f(x) presented on the graph below.",
    "The four fourth roots of z are represented on an Argand diagram.",
    "The results are shown in the table below.",
    "The diagram is not drawn to scale. Find the angle.",
    "A public park has designed a garden with the following pattern.",
    "The students presented it in the form of a tree diagram. a) Find the value of a.",
  ];
  for (const statement of cases) {
    assert.equal(
      detectMissingFigure(statement),
      true,
      `expected flag for: ${statement}`,
    );
  }
});

test("does not flag pure sketch/draw/plot instructions", () => {
  const cases = [
    "Sketch the graph of y = f(x).",
    "Draw the graph of g.",
    "On the same set of axes, sketch the graph of g'.",
    "Plot the points on the grid.",
    "Copy and complete the table.",
    "a) Draw a tree diagram representing the possible outcomes.",
    "Draw the tree diagram of the possible outcomes.",
    "Plot z on the Argand diagram.",
    "For each question, represent all three complex numbers on a diagram.",
    "Shade the region enclosed by the curves.",
    "Draw a diagram of the situation.",
    "Sketch a normal distribution curve.",
    "a) Plot the data in the form of a scatterplot.",
    "Calculate 3 + 4.",
    "A participant draws three balls from the bag.",
    "Two candy are drawn from the bag without replacement.",
    "Give your answer correct to 3 significant figures.",
    "A gym is trying to figure out its target audience.",
    "Let f(x) = x^2. Find f(3).",
    "The data shows: sum t_i = 412 and sum t_i^2 = 7246.5.",
    "Find the gradient of the line passing through (1, 2) and (3, 4).",
  ];
  for (const statement of cases) {
    assert.equal(
      detectMissingFigure(statement),
      false,
      `expected no flag for: ${statement}`,
    );
  }
});

test("returns false for empty or null statements", () => {
  assert.equal(detectMissingFigure(""), false);
  assert.equal(detectMissingFigure("   "), false);
  assert.equal(detectMissingFigure(null), false);
  assert.equal(detectMissingFigure(undefined), false);
});

test("figure reference wins over a sketch instruction elsewhere", () => {
  // A shown figure plus a separate sketch instruction must still flag.
  assert.equal(
    detectMissingFigure("The graph of f is shown below. (a) Sketch the graph of f' on the same axes."),
    true,
  );
});
