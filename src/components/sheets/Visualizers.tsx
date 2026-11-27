import { useMemo, useState } from "react"
import { Tex } from "@/components/math/MathRenderer"
import { Segmented } from "@/components/app/primitives"

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display: string
}) {
  return (
    <label className="grid grid-cols-[72px_minmax(0,1fr)_56px] items-center gap-3 text-[12px] text-ink-muted">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-accent"
      />
      <span className="num text-right text-ink">{display}</span>
    </label>
  )
}

/** Powers and roots of z = re^{iθ} on the Argand plane. */
export function DeMoivreVisualizer() {
  const [r, setR] = useState(1.08)
  const [deg, setDeg] = useState(40)
  const [n, setN] = useState(5)
  const [mode, setMode] = useState<"powers" | "roots">("powers")
  const size = 300
  const scale = 82
  const c = size / 2
  const theta = (deg * Math.PI) / 180

  const points = useMemo(() => {
    if (mode === "powers") {
      return Array.from({ length: n }, (_, k) => {
        const m = Math.pow(r, k + 1)
        const a = theta * (k + 1)
        return { x: m * Math.cos(a), y: m * Math.sin(a), label: `z^{${k + 1}}` }
      })
    }
    const m = Math.pow(r, 1 / n)
    return Array.from({ length: n }, (_, k) => {
      const a = (theta + 2 * Math.PI * k) / n
      return { x: m * Math.cos(a), y: m * Math.sin(a), label: `w_{${k}}` }
    })
  }, [mode, n, r, theta])

  const clampPt = (p: { x: number; y: number }) => {
    const len = Math.hypot(p.x, p.y)
    const max = 1.75
    return len > max ? { x: (p.x / len) * max, y: (p.y / len) * max, clipped: true } : { ...p, clipped: false }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px] rounded-lg border border-line bg-page" role="img" aria-label="Argand diagram">
        <line x1={0} y1={c} x2={size} y2={c} stroke="rgba(255,255,255,0.12)" />
        <line x1={c} y1={0} x2={c} y2={size} stroke="rgba(255,255,255,0.12)" />
        <circle cx={c} cy={c} r={scale} fill="none" stroke="rgba(168,186,183,0.3)" strokeDasharray="3 4" />
        {mode === "roots" ? (
          <polygon
            points={points.map((p) => `${c + p.x * scale},${c - p.y * scale}`).join(" ")}
            fill="rgba(240,106,42,0.12)"
            stroke="rgba(240,106,42,0.6)"
          />
        ) : (
          <polyline
            points={[{ x: 0, y: 0 }, ...points].map((p) => {
              const q = clampPt(p)
              return `${c + q.x * scale},${c - q.y * scale}`
            }).join(" ")}
            fill="none"
            stroke="rgba(240,106,42,0.35)"
          />
        )}
        {points.map((p, i) => {
          const q = clampPt(p)
          return (
            <g key={i}>
              <circle cx={c + q.x * scale} cy={c - q.y * scale} r={i === 0 ? 4.5 : 3.5} fill={q.clipped ? "#ef4444" : i === 0 ? "#e6efee" : "#f06a2a"} />
              <text x={c + q.x * scale + 7} y={c - q.y * scale - 6} fill="#a8bab7" fontSize="10" fontFamily="JetBrains Mono Variable, monospace">
                {mode === "powers" ? `z${i + 1 > 1 ? `^${i + 1}` : ""}` : `w${i}`}
              </text>
            </g>
          )
        })}
        <text x={size - 14} y={c - 6} fill="#7e918e" fontSize="10">Re</text>
        <text x={c + 6} y={12} fill="#7e918e" fontSize="10">Im</text>
      </svg>
      <div className="flex flex-col gap-3">
        <Segmented
          label="Visualizer mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "powers", label: "Powers zⁿ" },
            { value: "roots", label: "n-th roots" },
          ]}
        />
        <Slider label="|z| = r" value={r} min={0.7} max={1.3} step={0.01} onChange={setR} display={r.toFixed(2)} />
        <Slider label="arg z" value={deg} min={0} max={360} step={1} onChange={setDeg} display={`${deg}°`} />
        <Slider label="n" value={n} min={2} max={10} step={1} onChange={setN} display={String(n)} />
        <div className="rounded-lg border border-line bg-page p-3 text-[13px]">
          {mode === "powers" ? (
            <Tex
              display
              tex={`z^{${n}} = ${r.toFixed(2)}^{${n}}e^{i\\cdot ${n}\\cdot ${deg}^\\circ} = ${Math.pow(r, n).toFixed(3)}\\,e^{i\\,${((deg * n) % 360).toFixed(0)}^\\circ}`}
            />
          ) : (
            <Tex
              display
              tex={`w_k = ${Math.pow(r, 1 / n).toFixed(3)}\\,e^{i\\left(\\frac{${deg}^\\circ + 360^\\circ k}{${n}}\\right)},\\ k = 0,\\ldots,${n - 1}`}
            />
          )}
          <p className="mt-2 text-[12px] text-ink-faint">
            {mode === "powers"
              ? "Each power rotates by arg z and scales by r: the points spiral out when r > 1 and in when r < 1. Red points lie off the plot."
              : "The roots sit on a circle of radius r^(1/n), spaced 360°/n apart, forming a regular polygon whose vertices sum to zero."}
          </p>
        </div>
      </div>
    </div>
  )
}

const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000]

const SERIES = {
  sin: {
    label: "sin x",
    f: Math.sin,
    term: (k: number, x: number) => ((k % 2 ? -1 : 1) * Math.pow(x, 2 * k + 1)) / FACT[2 * k + 1],
    tex: (n: number) => Array.from({ length: n }, (_, k) => `${k ? (k % 2 ? "-" : "+") : ""}\\frac{x^{${2 * k + 1}}}{${2 * k + 1}!}`).join(""),
    domain: [-7, 7] as [number, number],
  },
  cos: {
    label: "cos x",
    f: Math.cos,
    term: (k: number, x: number) => ((k % 2 ? -1 : 1) * Math.pow(x, 2 * k)) / FACT[2 * k],
    tex: (n: number) => Array.from({ length: n }, (_, k) => (k === 0 ? "1" : `${k % 2 ? "-" : "+"}\\frac{x^{${2 * k}}}{${2 * k}!}`)).join(""),
    domain: [-7, 7] as [number, number],
  },
  exp: {
    label: "eˣ",
    f: Math.exp,
    term: (k: number, x: number) => Math.pow(x, k) / FACT[k],
    tex: (n: number) => Array.from({ length: n }, (_, k) => (k === 0 ? "1" : k === 1 ? "+x" : `+\\frac{x^{${k}}}{${k}!}`)).join(""),
    domain: [-4, 3] as [number, number],
  },
  ln: {
    label: "ln(1+x)",
    f: (x: number) => Math.log(1 + x),
    term: (k: number, x: number) => ((k % 2 ? -1 : 1) * Math.pow(x, k + 1)) / (k + 1),
    tex: (n: number) => Array.from({ length: n }, (_, k) => (k === 0 ? "x" : `${k % 2 ? "-" : "+"}\\frac{x^{${k + 1}}}{${k + 1}}`)).join(""),
    domain: [-0.95, 2] as [number, number],
  },
}
type SeriesKey = keyof typeof SERIES

/** Partial sums of a Maclaurin series against the true function. */
export function MaclaurinVisualizer() {
  const [key, setKey] = useState<SeriesKey>("sin")
  const [terms, setTerms] = useState(3)
  const s = SERIES[key]
  const W = 520
  const H = 260
  const [x0, x1] = s.domain
  const yRange = key === "exp" ? [-1, 12] : key === "ln" ? [-3, 2] : [-2.2, 2.2]
  const sx = (x: number) => ((x - x0) / (x1 - x0)) * W
  const sy = (y: number) => H - ((y - yRange[0]) / (yRange[1] - yRange[0])) * H

  const path = (fn: (x: number) => number) => {
    const pts: string[] = []
    for (let i = 0; i <= 260; i += 1) {
      const x = x0 + ((x1 - x0) * i) / 260
      const y = Math.max(yRange[0] - 5, Math.min(yRange[1] + 5, fn(x)))
      if (!Number.isFinite(y)) continue
      pts.push(`${pts.length ? "L" : "M"}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`)
    }
    return pts.join(" ")
  }
  const approx = (x: number) => {
    let sum = 0
    for (let k = 0; k < terms; k += 1) sum += s.term(k, x)
    return sum
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Function"
          value={key}
          onChange={setKey}
          options={(Object.keys(SERIES) as SeriesKey[]).map((k) => ({ value: k, label: SERIES[k].label }))}
        />
        <div className="min-w-[240px] flex-1">
          <Slider label="Terms" value={terms} min={1} max={7} step={1} onChange={setTerms} display={String(terms)} />
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border border-line bg-page" role="img" aria-label={`Maclaurin approximation of ${s.label} with ${terms} terms`}>
        <defs>
          <clipPath id="plot">
            <rect width={W} height={H} />
          </clipPath>
        </defs>
        <line x1={0} y1={sy(0)} x2={W} y2={sy(0)} stroke="rgba(255,255,255,0.12)" />
        <line x1={sx(0)} y1={0} x2={sx(0)} y2={H} stroke="rgba(255,255,255,0.12)" />
        {key === "ln" ? <line x1={sx(1)} y1={0} x2={sx(1)} y2={H} stroke="rgba(213,182,41,0.35)" strokeDasharray="4 4" /> : null}
        <g clipPath="url(#plot)">
          <path d={path(s.f)} fill="none" stroke="rgba(230,234,240,0.55)" strokeWidth={2} />
          <path d={path(approx)} fill="none" stroke="#f06a2a" strokeWidth={2} />
        </g>
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-ink/60" /> {s.label}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-accent" /> partial sum
        </span>
        {key === "ln" ? <span className="text-medium">The dashed line marks x = 1, the edge of convergence.</span> : null}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-page p-3 text-[13px]">
        <Tex display tex={`${s.label.replace("eˣ", "e^x")} \\approx ${s.tex(terms)}`} />
      </div>
    </div>
  )
}
