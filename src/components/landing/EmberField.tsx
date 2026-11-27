import { useEffect, useRef } from "react"

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number
  max: number
  hue: "ember" | "slate"
}

/**
 * Full-bleed canvas: a faint coordinate grid, a glowing curve that draws
 * itself, and embers rising through it that lean toward the cursor.
 * Static (single frame) under prefers-reduced-motion.
 */
export function EmberField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let w = 0
    let h = 0
    let raf = 0
    let t = 0
    const mouse = { x: -9999, y: -9999 }
    const sparks: Spark[] = []

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * ratio
      canvas.height = h * ratio
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const spawn = (): Spark => {
      const max = 240 + Math.random() * 320
      return {
        x: Math.random() * w,
        y: h + 10 + Math.random() * 40,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.35 + Math.random() * 0.9),
        r: 0.6 + Math.random() * 1.9,
        life: 0,
        max,
        hue: Math.random() < 0.78 ? "ember" : "slate",
      }
    }
    const count = Math.round(Math.min(150, (w * h) / 9000))
    for (let i = 0; i < count; i += 1) {
      const s = spawn()
      s.y = Math.random() * h
      s.life = Math.random() * s.max
      sparks.push(s)
    }

    const curve = (x: number) => {
      // y = e^{-x/9}·sin(x) scaled across the canvas
      const u = (x / w) * 22 - 2
      return h * 0.58 - Math.exp(-u / 9) * Math.sin(u) * h * 0.16
    }

    const frame = () => {
      t += 1
      ctx.clearRect(0, 0, w, h)

      // grid
      const step = 48
      ctx.lineWidth = 1
      for (let x = (w / 2) % step; x < w; x += step) {
        ctx.strokeStyle = "rgba(168,186,183,0.055)"
        ctx.beginPath()
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, h)
        ctx.stroke()
      }
      for (let y = (h * 0.58) % step; y < h; y += step) {
        ctx.strokeStyle = "rgba(168,186,183,0.055)"
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(w, y + 0.5)
        ctx.stroke()
      }
      ctx.strokeStyle = "rgba(230,234,240,0.08)"
      ctx.beginPath()
      ctx.moveTo(0, h * 0.58)
      ctx.lineTo(w, h * 0.58)
      ctx.stroke()

      // self-drawing curve with a hot leading point
      const progress = reduced ? 1 : Math.min(1, t / 260)
      const end = w * progress
      ctx.lineWidth = 2
      ctx.shadowColor = "rgba(240,106,42,0.6)"
      ctx.shadowBlur = 14
      ctx.strokeStyle = "rgba(240,106,42,0.8)"
      ctx.beginPath()
      for (let x = 0; x <= end; x += 3) {
        const y = curve(x)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.shadowBlur = 0
      if (progress < 1) {
        ctx.fillStyle = "#ff7d3f"
        ctx.beginPath()
        ctx.arc(end, curve(end), 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // embers
      for (const s of sparks) {
        if (!reduced) {
          const dx = mouse.x - s.x
          const dy = mouse.y - s.y
          const d2 = dx * dx + dy * dy
          if (d2 < 160 * 160) {
            s.vx += (dx / Math.sqrt(d2 + 1)) * 0.012
          }
          s.vx += Math.sin((s.y + t) * 0.01) * 0.004
          s.vx *= 0.985
          s.x += s.vx
          s.y += s.vy
          s.life += 1
        }
        const fade = Math.sin((s.life / s.max) * Math.PI)
        const flicker = 0.75 + 0.25 * Math.sin(t * 0.2 + s.x)
        const a = Math.max(0, fade * flicker)
        const color = s.hue === "ember" ? (s.r > 1.6 ? "255,125,63" : "240,106,42") : "148,163,184"
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5)
        g.addColorStop(0, `rgba(${color},${0.9 * a})`)
        g.addColorStop(1, `rgba(${color},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2)
        ctx.fill()
        if (s.life > s.max || s.y < -20) Object.assign(s, spawn())
      }

      if (!reduced) raf = requestAnimationFrame(frame)
    }
    frame()

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
    }
    window.addEventListener("pointermove", onMove)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener("pointermove", onMove)
    }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
