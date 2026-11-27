// Tiny schematic previews shown in dock hover cards (216×64 viewBox).
const W = 216
const H = 64
const ink = "rgba(230,234,240,0.18)"
const accent = "#f06a2a"
const slate = "#a8bab7"

export function ModuleArt({ kind }: { kind: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-16 w-full" aria-hidden="true">
      {kind === "landing" ? (
        <>
          {Array.from({ length: 18 }, (_, i) => (
            <circle key={i} cx={12 + ((i * 47) % 196)} cy={10 + ((i * 29) % 48)} r={1 + (i % 3) * 0.6} fill={i % 4 ? accent : slate} opacity={0.35 + (i % 5) * 0.12} />
          ))}
          <text x="108" y="38" textAnchor="middle" fill="#e6efee" fontSize="14" fontWeight="600" fontFamily="Geist Variable, sans-serif">
            EmberMath
          </text>
        </>
      ) : null}
      {kind === "home" ? (
        <g transform="translate(14 8)">
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 10 }, (_, c) => {
              const v = ((r * 7 + c * 3) % 9) / 9
              return <rect key={`${r}-${c}`} x={c * 19} y={r * 12} width="16" height="9" rx="2" fill={accent} opacity={0.1 + v * 0.75} />
            }),
          )}
        </g>
      ) : null}
      {kind === "bank" ? (
        <g transform="translate(12 8)">
          {[0, 1, 2, 3].map((r) => (
            <g key={r} transform={`translate(0 ${r * 13})`}>
              <rect width="18" height="8" rx="2" fill="none" stroke={slate} opacity="0.7" />
              <rect x="26" y="1" width={110 - r * 14} height="6" rx="2" fill={ink} />
              <rect x="170" y="1" width="20" height="6" rx="2" fill={r === 1 ? accent : ink} />
            </g>
          ))}
        </g>
      ) : null}
      {kind === "practice" ? (
        <g>
          <rect x="40" y="8" width="136" height="48" rx="6" fill="none" stroke={ink} />
          <rect x="52" y="18" width="90" height="5" rx="2" fill={ink} />
          <rect x="52" y="28" width="70" height="5" rx="2" fill={ink} />
          <rect x="52" y="42" width="26" height="7" rx="2" fill="#10b981" opacity="0.6" />
          <rect x="82" y="42" width="26" height="7" rx="2" fill="#d5b629" opacity="0.6" />
          <path d="M186 32 l10 0 m-4 -4 l4 4 l-4 4" stroke={accent} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M30 32 l-10 0 m4 -4 l-4 4 l4 4" stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      ) : null}
      {kind === "exam" ? (
        <g>
          <circle cx="44" cy="32" r="20" fill="none" stroke={ink} strokeWidth="4" />
          <circle cx="44" cy="32" r="20" fill="none" stroke={accent} strokeWidth="4" strokeDasharray="88 200" transform="rotate(-90 44 32)" strokeLinecap="round" />
          <g transform="translate(84 12)">
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x={(i % 6) * 20} y={Math.floor(i / 6) * 22} width="16" height="16" rx="3" fill={i === 3 ? accent : "none"} stroke={i < 3 ? slate : ink} opacity={i < 3 ? 0.8 : 1} />
            ))}
          </g>
        </g>
      ) : null}
      {kind === "cheatsheets" ? (
        <g>
          <path d={Array.from({ length: 50 }, (_, i) => `${i ? "L" : "M"}${8 + i * 4} ${32 - 18 * Math.sin(i / 5)}`).join(" ")} fill="none" stroke={ink} strokeWidth="2" />
          <path d={Array.from({ length: 30 }, (_, i) => { const x = i / 5 - 3; return `${i ? "L" : "M"}${8 + i * 4 + 40} ${32 - 18 * (x - x ** 3 / 6)}` }).join(" ")} fill="none" stroke={accent} strokeWidth="2" />
        </g>
      ) : null}
      {kind === "desmos" ? (
        <g>
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`v${i}`} x1={8 + i * 20} y1="0" x2={8 + i * 20} y2={H} stroke={ink} strokeWidth="0.5" />
          ))}
          <line x1="0" y1="40" x2={W} y2="40" stroke={ink} />
          <path d={Array.from({ length: 60 }, (_, i) => { const x = (i - 30) / 10; return `${i ? "L" : "M"}${108 + x * 34} ${40 - x * x * 6}` }).join(" ")} fill="none" stroke={slate} strokeWidth="2" />
          <path d={`M8 52 L208 12`} stroke={accent} strokeWidth="2" />
        </g>
      ) : null}
      {kind === "booklet" ? (
        <g>
          <rect x="14" y="10" width="86" height="44" rx="4" fill="none" stroke={ink} />
          <rect x="116" y="10" width="86" height="44" rx="4" fill="none" stroke={accent} opacity="0.7" />
          <text x="57" y="37" textAnchor="middle" fill="#e6efee" fontSize="12" fontStyle="italic" fontFamily="KaTeX_Main, serif">
            Sₙ = n⁄2(a+l)
          </text>
          <text x="159" y="37" textAnchor="middle" fill="#f06a2a" fontSize="12" fontStyle="italic" fontFamily="KaTeX_Main, serif">
            eⁱᶿ = cos θ + i sin θ
          </text>
        </g>
      ) : null}
    </svg>
  )
}
