/**
 * Pure heuristic: does a question statement depend on an external figure
 * (graph / diagram / picture) that the statement itself does not contain?
 *
 * The original scrape of the seed files lost all images, so a question whose
 * statement references "the diagram below" but has no image attached is
 * broken content and must be flagged (diagram_missing) in the UI.
 *
 * Conservative bias: prefer true when uncertain — the missing flag is
 * visible in the UI, while a false negative silently hides broken content.
 * The one class we must NOT flag is pure sketch/draw/plot instructions,
 * which are plentiful and require no provided figure.
 */

// Imperative verbs that mean "the student creates the drawing themselves".
const CREATION_VERB =
  /\b(draw|sketch|plot|construct|copy|complete|make|build)\b/;

// A sentence/part-label terminator: the "did the student draw this?" window
// never crosses one of these.
const CLAUSE_BOUNDARY = /[.;:?!]\s*/;

/**
 * @param {string} statement
 * @returns {boolean}
 */
export function detectMissingFigure(statement) {
  if (statement === null || statement === undefined) return false;
  const text = String(statement).replace(/\s+/g, " ").trim().toLowerCase();
  if (!text) return false;

  return (
    hasDiagramReference(text) ||
    hasFigureReference(text) ||
    hasShownReference(text) ||
    hasObjectReference(text) ||
    hasDepictedReference(text) ||
    hasDrawnReference(text) ||
    hasPresentedReference(text)
  );
}

/**
 * Words immediately before a token, not crossing a clause boundary.
 */
function clauseWindow(text, tokenIndex) {
  const before = text.slice(0, tokenIndex);
  const boundary = before.search(/[.;:?!][^.;:?!]*$/);
  return boundary === -1 ? before : before.slice(boundary + 1);
}

/**
 * True when "diagram" is used referentially ("the diagram below", "in the
 * diagram", "diagram shows ...") rather than instructionally ("draw a tree
 * diagram", "plot z on the Argand diagram").
 */
function hasDiagramReference(text) {
  let index = text.indexOf("diagram");
  while (index !== -1) {
    const window = clauseWindow(text, index);

    // "a diagram" / "a tree diagram": an indefinite diagram is drawn by the
    // student, not provided by the paper.
    if (/\ba\s+([\w-]+\s+)?diagram$/.test(window)) {
      index = text.indexOf("diagram", index + 1);
      continue;
    }
    // "diagram representing/to show/of the possible outcomes": describing a
    // diagram the student is asked to produce.
    if (/\bdiagram\s+(representing|to\s+(show|represent|illustrate|scale))\b/.test(text.slice(index))) {
      index = text.indexOf("diagram", index + 1);
      continue;
    }
    // Creation verb in the same clause: "draw the tree diagram", "plot z on
    // the Argand diagram" — unless a strong location marker pins it to a
    // provided figure ("sketch f on the diagram below" is a provided one).
    if (CREATION_VERB.test(window)) {
      const after = text.slice(index + "diagram".length, index + 40);
      const hasMarker =
        /\b(below|above|alongside|shown|shows|depicts|represents|illustrates|following|given)\b/.test(
          after + " " + window,
        );
      if (!hasMarker) {
        index = text.indexOf("diagram", index + 1);
        continue;
      }
    }
    // Referential uses.
    if (
      /\b(in|on|from|using|by)\s+(the|this|an)\s+([\w-]+\s+)?diagram\b/.test(text) ||
      /\b(the|this|following|given|shown|provided|accompanying|above|below)\s+([\w-]+\s+)?diagram\b/.test(text) ||
      /\bdiagram\s+(below|above|alongside|shown|shows?|depicts?|represents?|illustrates?)\b/.test(text)
    ) {
      return true;
    }
    index = text.indexOf("diagram", index + 1);
  }
  return false;
}

/**
 * True when "figure" refers to a provided figure. "significant figures" is
 * numerical rounding terminology and "figure out" is an idiom; neither is a
 * picture.
 */
function hasFigureReference(text) {
  const scrubbed = text.replace(/significant\s+figures?/g, " ");
  let index = scrubbed.indexOf("figure");
  while (index !== -1) {
    if (/\bfigure\s+out\b/.test(scrubbed.slice(index))) {
      index = scrubbed.indexOf("figure", index + 1);
      continue;
    }
    const window = clauseWindow(scrubbed, index);
    if (CREATION_VERB.test(window) || /\ba\s+figure\b/.test(window)) {
      index = scrubbed.indexOf("figure", index + 1);
      continue;
    }
    return true;
  }
  return false;
}

/**
 * "is/are/was/as shown (below|above|in|on ...)": the statement leans on
 * something rendered outside the text.
 */
function hasShownReference(text) {
  return (
    /\b(is|are|was|were|has been|have been|being|as)\s+shown\b/.test(text) ||
    /\bshown\s+(below|above|in|on|by|at)\b/.test(text)
  );
}

/**
 * A named visual object located or describing content:
 * "the graph below", "graph shows", "the table below", "coordinate grid
 * below". Includes tables: a lost table image is just as broken as a lost
 * graph (conservative bias).
 */
function hasObjectReference(text) {
  const objects =
    "(graph|curve|chart|plot|histogram|image|picture|photo|table|scatter\\s+(diagram|graph|plot)|coordinate\\s+grid|box\\s*(and|&)\\s*whisker\\s+diagram)";
  return (
    new RegExp(`${objects}\\s+(below|above)\\b`).test(text) ||
    new RegExp(`${objects}\\s+(shows?|depicts?|represents?)\\b`).test(text)
  );
}

/** "as depicted below/in the diagram" */
function hasDepictedReference(text) {
  return (
    /\bdepicted\s+(below|above|in|on)\b/.test(text) ||
    /\billustrated\s+(below|above|in|on|by)\b/.test(text)
  );
}

/**
 * Past participles describing a provided drawing: "is sketched below",
 * "points were plotted on the diagram below", "is drawn with an equation".
 * "drawn from the bag" (cards/candy) is not a figure.
 */
function hasDrawnReference(text) {
  return (
    /\b(sketched|plotted|drawn)\s+(below|above|in|on)\b/.test(text) ||
    /\b(is|are|was|were|has been|have been|being)\s+sketched\b/.test(text) ||
    /\b(is|was|has been|have been|being)\s+drawn\b(?!\s+from)/.test(text)
  );
}

/**
 * Content handed over to a provided rendering: "a garden with the following
 * pattern", "presented it in the form of a tree diagram". A leading
 * draw/plot instruction ("plot the data in the form of a scatterplot") is
 * the student's own work, not a provided figure.
 */
function hasPresentedReference(text) {
  return (
    /\bthe following pattern\b/.test(text) ||
    /\b(presented|given|shown|represented)\s+(it|them|the data|the results|the information)?\s*in the form of\b/.test(
      text,
    )
  );
}
