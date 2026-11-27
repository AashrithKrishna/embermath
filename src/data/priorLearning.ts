import type { BookletSection } from "./booklet"

// Prior-learning formulas (self-written), shared by both HL courses.
export const PRIOR_LEARNING: BookletSection = {
  id: "prior-learning",
  title: "Prior learning",
  entries: [
    { name: "Area of a parallelogram", latex: "A = bh", note: "b base, h perpendicular height." },
    { name: "Area of a triangle", latex: "A = \\tfrac{1}{2}bh" },
    { name: "Area of a trapezoid", latex: "A = \\tfrac{1}{2}(a+b)h" },
    { name: "Area of a circle", latex: "A = \\pi r^2" },
    { name: "Circumference of a circle", latex: "C = 2\\pi r" },
    { name: "Volume of a cuboid", latex: "V = lwh" },
    { name: "Volume of a cylinder", latex: "V = \\pi r^2 h" },
    { name: "Volume of a prism", latex: "V = Ah", note: "A is the cross-sectional area." },
    { name: "Curved surface area of a cylinder", latex: "A = 2\\pi r h" },
    { name: "Distance between two points", latex: "d = \\sqrt{(x_1-x_2)^2 + (y_1-y_2)^2}" },
    { name: "Midpoint of a segment", latex: "\\left(\\frac{x_1+x_2}{2},\\ \\frac{y_1+y_2}{2}\\right)" },
    { name: "Solutions of a quadratic", latex: "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a},\\quad a \\neq 0" },
  ],
}

export const TOPIC_PREFIX: Record<string, string> = {
  "numbers-algebra": "Topic 1",
  functions: "Topic 2",
  "geometry-trigonometry": "Topic 3",
  "statistics-probability": "Topic 4",
  calculus: "Topic 5",
}
