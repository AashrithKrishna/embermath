// British → American spelling for prose. Pure and deterministic.
//
// Rules are whole-word (or word-stem) regexes applied case-preservingly.
// Deliberately NOT converted: "tonne" (a different unit from "ton"),
// HTML/ARIA attributes such as aria-labelledby, URLs, and anything inside
// LaTeX command names (\text is untouched; words inside \text{} are prose
// and do get converted).

const RULES = [
  // -our → -or
  [/\b(behavi|col|fav|flav|harb|hon|hum|lab|neighb|od|rum|sav|vap|vig|arm|endeav|tum|vap)our(s|ed|ing|able|ite|ites|hood|ful|less)?\b/gi, "$1or$2"],
  // -tre → -ter
  [/\b(cent|met|lit|fib|theat|calib|lust|kilomet|centimet|millimet|decimet|millilit|centilit|decilit|spect|sab|meag)re(s|d)?\b/gi, "$1er$2"],
  // -ise / -isation → -ize / -ization (explicit stems to avoid "rise", "wise", "exercise", "promise", "premise", "precise", "concise", "otherwise", "surprise", "advertise", "compromise", "supervise", "revise", "expertise", "franchise")
  [
    /\b(visual|organ|recogn|summar|memor|minim|maxim|optim|normal|real|util|character|general|factor|rational|standard|random|special|parametr|digit|apolog|critic|emphas|categor|prior|symbol|harmon|synchron|theor|central|capital|final|initial|local|stabil|steril|subsid|summar|vapor|author|custom|familiar|global|hospital|immun|item|jeopard|legal|maxim|mobil|modern|monopol|neutral|optim|patron|penal|polar|popular|privat|publical|scrutin|sensit|serial|social|special|stabil|terror|tranquil|trivial|util|vandal|vocal|western|womanize|equal|fertil|human|ideal|ironize|magnet|motor|ostrac|pasteur|personal|plagiar|politic|radical|revolution|ritual|satir|scandal|stigmat|tantal|textur|vaporiz|verbal|victim|visual)is(e|es|ed|ing|ation|ations|able|er|ers)\b/gi,
    "$1iz$2",
  ],
  // -yse → -yze
  [/\b(anal|paral|catal|hydrol|dial)ys(e|es|ed|ing|er|ers)\b/gi, "$1yz$2"],
  // doubled l before suffix → single (travelled, modelling, labelled, cancelled, …)
  [/\b(trave|mode|labe|cance|fue|signa|tota|equa|dia|marve|jewe|leve|rive|tunne|channe|shove|counse|quarre|grove|swive|pane)ll(ed|ing|er|ers)\b/gi, "$1l$2"],
  // practise (verb) → practice
  [/\bpractis(e|es|ed|ing)\b/gi, (m, suf) => matchCase(m, `practic${suf}`)],
  // misc
  [/\bmaths\b/gi, "math"],
  [/\bgrey(s|ed|ish)?\b/gi, "gray$1"],
  [/\bcatalogue(s|d)?\b/gi, "catalog$1"],
  [/\bprogramme(s)?\b/gi, "program$1"],
  [/\bwhilst\b/gi, "while"],
  [/\baluminium\b/gi, "aluminum"],
  [/\bcosy\b/gi, "cozy"],
  [/\bjudgement(s)?\b/gi, "judgment$1"],
  [/\bdefence\b/gi, "defense"],
  [/\boffence(s)?\b/gi, "offense$1"],
  [/\blicence(s)?\b/gi, "license$1"],
  [/\benquir(y|ies|e|ed|es|ing)\b/gi, "inquir$1"],
  [/\bstorey(s)?\b/gi, (m, s) => matchCase(m, s ? "stories" : "story")],
  [/\bskilful(ly)?\b/gi, "skillful$1"],
  [/\bfulfil\b/gi, "fulfill"],
  [/\benrol(s)?\b/gi, "enroll$1"],
  [/\btyre(s)?\b/gi, "tire$1"],
  [/\bcheque(s)?\b/gi, "check$1"],
  [/\bmanoeuvre(s|d)?\b/gi, (m, s) => matchCase(m, `maneuver${s === "d" ? "ed" : s ?? ""}`)],
  [/\bsceptic(al|ism|s)?\b/gi, "skeptic$1"],
]

function matchCase(source, target) {
  if (source === source.toUpperCase() && source.length > 1) return target.toUpperCase()
  if (source[0] === source[0].toUpperCase()) return target[0].toUpperCase() + target.slice(1)
  return target
}

// Protect spans that must never change: URLs and aria-/data- attributes.
const PROTECT = /(https?:\/\/\S+|aria-[a-z]+|\\[a-zA-Z]+)/g

export function americanize(text) {
  if (typeof text !== "string" || !text) return text
  const parts = text.split(PROTECT)
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part
      let out = part
      for (const [re, rep] of RULES) {
        out = out.replace(re, (...args) => {
          const m = args[0]
          const groups = args.slice(1, -2).map((g) => g ?? "")
          const replaced =
            typeof rep === "function" ? rep(m, ...groups) : rep.replace(/\$(\d)/g, (_, n) => groups[Number(n) - 1] ?? "")
          return matchCase(m, replaced)
        })
      }
      return out
    })
    .join("")
}

/** Prose fields of a question record that may be converted. */
export const PROSE_FIELDS = ["statement", "markscheme", "tips", "topic", "subtopic", "latex"]
