import { useMemo } from 'react'
import * as d3 from 'd3'

// Helper to compute y points for a sine wave
function generateWavePoints({ width, height, frequency, amplitude = 0.4 }) {
  const points = []
  const A = amplitude * height
  const k = 2 * Math.PI * frequency // "frequency" here is waves per width unit for drawing
  const baseline = height / 2
  const samples = Math.max(200, Math.floor(width / 3))
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * width
    const y = baseline + A * Math.sin((k * x) / width)
    points.push([x, y])
  }
  return points
}

export default function WaveViz({ width = 800, height = 240, freqHz, wavelengthM }) {
  // Map physics to drawing frequency: more Hz or shorter wavelength -> tighter cycles
  const drawFrequency = useMemo(() => {
    // Normalize frequency from radio..gamma (~1e3..1e21) into 0.5..12 cycles across width
    const hz = Math.max(1e3, Math.min(1e21, freqHz || (3e8 / Math.max(1e-16, wavelengthM))))
    const t = (Math.log10(hz) - 3) / (21 - 3)
    return 0.5 + t * (12 - 0.5)
  }, [freqHz, wavelengthM])

  const points = useMemo(() => generateWavePoints({ width, height, frequency: drawFrequency }), [width, height, drawFrequency])

  const pathD = useMemo(() => d3.line()(points), [points])

  return (
    <svg width={width} height={height} className="rounded-lg">
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor="white" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} rx="12" fill="rgba(255,255,255,0.08)" />
      <path d={pathD || ''} fill="none" stroke="url(#waveGrad)" strokeWidth="4" />
      {/* Reference objects for scale (icons as rectangles) */}
      <g opacity="0.7">
        <rect x="16" y={height - 40} width="20" height="20" fill="#fff" opacity="0.4" />
        <rect x="44" y={height - 48} width="28" height="28" fill="#fff" opacity="0.4" />
        <rect x="80" y={height - 56} width="36" height="36" fill="#fff" opacity="0.4" />
      </g>
    </svg>
  )
}
