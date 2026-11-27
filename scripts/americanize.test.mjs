import assert from "node:assert/strict"
import { test } from "node:test"
import { americanize } from "./lib/americanize.mjs"

test("converts common British spellings, preserving case", () => {
  assert.equal(americanize("The centre of the circle is 5 metres away."), "The center of the circle is 5 meters away.")
  assert.equal(americanize("Modelling the travelled distance"), "Modeling the traveled distance")
  assert.equal(americanize("Factorise fully and summarise; the colour is grey."), "Factorize fully and summarize; the color is gray.")
  assert.equal(americanize("Analyse the behaviour of maths students"), "Analyze the behavior of math students")
  assert.equal(americanize("Practise daily. Practising helps."), "Practice daily. Practicing helps.")
  assert.equal(americanize("A 3 litre tank in the neighbourhood"), "A 3 liter tank in the neighborhood")
})

test("leaves look-alike words alone", () => {
  for (const s of ["rise", "otherwise", "exercise", "precise", "promise", "surprise", "revise", "advertise", "a 5 tonne truck", "concise"]) {
    assert.equal(americanize(s), s)
  }
})

test("never touches URLs, aria attributes or LaTeX commands", () => {
  const url = "https://ik.imagekit.io/x/Centre%20Of%20Mass/colour.png"
  assert.equal(americanize(url), url)
  assert.equal(americanize('aria-labelledby="t"'), 'aria-labelledby="t"')
  assert.equal(americanize("$\\text{ metres}$"), "$\\text{ meters}$")
  assert.equal(americanize("\\centre"), "\\centre")
})
