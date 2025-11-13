import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import WaveViz from './components/WaveViz'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
const C = 299792458 // m/s

function clampRange(val, min, max) { return Math.min(max, Math.max(min, val)) }

function energyColorFromFreq(hz) {
  // Map 1e3..1e21 to red..violet
  const t = (Math.log10(hz) - 3) / (21 - 3)
  const stops = [
    { t: 0, color: [239, 68, 68] },      // red-500
    { t: 0.2, color: [249, 115, 22] },   // orange-500
    { t: 0.4, color: [234, 179, 8] },    // yellow-500
    { t: 0.6, color: [34, 197, 94] },    // green-500
    { t: 0.8, color: [59, 130, 246] },   // blue-500
    { t: 1.0, color: [139, 92, 246] },   // violet-500
  ]
  for (let i = 0; i < stops.length - 1; i++) {
    if (t <= stops[i + 1].t) {
      const a = stops[i], b = stops[i + 1]
      const u = (t - a.t) / (b.t - a.t)
      const c = a.color.map((ac, idx) => Math.round(ac + u * (b.color[idx] - ac)))
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
    }
  }
  const c = stops[stops.length - 1].color
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

function categorize(hz) {
  const bands = [
    { key: 'radio', min: 3e3, max: 3e9 },
    { key: 'microwave', min: 3e9, max: 3e11 },
    { key: 'infrared', min: 3e11, max: 4e14 },
    { key: 'visible', min: 4e14, max: 7.5e14 },
    { key: 'ultraviolet', min: 7.5e14, max: 3e16 },
    { key: 'xray', min: 3e16, max: 3e19 },
    { key: 'gamma', min: 3e19, max: 1e23 },
  ]
  return bands.find(b => hz >= b.min && hz < b.max)?.key || 'radio'
}

export default function App() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [token, setToken] = useState(null)

  // Physics state: we primary control frequency, derive wavelength
  const [frequency, setFrequency] = useState(1e9) // Hz
  const wavelength = useMemo(() => C / frequency, [frequency])
  const energyColor = useMemo(() => energyColorFromFreq(frequency), [frequency])
  const band = useMemo(() => categorize(frequency), [frequency])

  // Load wave content from backend
  const [content, setContent] = useState([])
  useEffect(() => {
    fetch(`${BACKEND}/content/waves`).then(r => r.json()).then(setContent).catch(() => {})
  }, [])

  const visibleContent = useMemo(() => content.find(c => c.key === band), [content, band])

  async function handleSignup(e) {
    e.preventDefault()
    const res = await fetch(`${BACKEND}/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    if (res.ok) { alert('Signed up! Please log in.') } else { alert('Signup failed') }
  }

  async function handleLogin(e) {
    e.preventDefault()
    const form = new URLSearchParams({ username: email, password })
    const res = await fetch(`${BACKEND}/auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
    if (res.ok) { const data = await res.json(); setToken(data.access_token) } else { alert('Login failed') }
  }

  async function savePreferences() {
    if (!token) return
    await fetch(`${BACKEND}/preferences`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ last_frequency_hz: frequency, last_wavelength_m: wavelength })
    })
  }

  useEffect(() => { if (token) savePreferences() }, [token])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(180deg, ${energyColor} 0%, #0b1020 100%)` }}>
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 bg-black/30 backdrop-blur text-white">
        <h1 className="text-xl font-semibold">EM Waves Lab</h1>
        <nav className="flex gap-4 text-sm">
          <a href="#home" className="hover:underline">Home</a>
          <a href="#about" className="hover:underline">About</a>
          <a href="#types" className="hover:underline">Wave Types</a>
          <Link to="/test" className="hover:underline">System</Link>
        </nav>
        <div className="flex items-center gap-2">
          {token ? (
            <button onClick={() => setToken(null)} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20">Logout</button>
          ) : (
            <>
              <button onClick={() => document.getElementById('auth').showModal()} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20">Login / Sign up</button>
            </>
          )}
        </div>
      </header>

      {/* Main interactive area */}
      <main className="flex-1 grid md:grid-cols-2 gap-6 p-6">
        <section className="space-y-4 text-white">
          <h2 className="text-2xl font-semibold">Interactive Controls</h2>
          <div className="bg-white/10 rounded-lg p-4">
            <label className="block text-sm mb-1">Frequency (Hz)</label>
            <input
              type="range" min={3e3} max={1e21} step={1e6}
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs opacity-80">
              <span>1e3</span><span>1e21</span>
            </div>
            <div className="mt-3 text-sm">
              <div>Frequency: <span className="font-mono">{frequency.toExponential(2)} Hz</span></div>
              <div>Wavelength: <span className="font-mono">{wavelength.toExponential(2)} m</span></div>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Current Band: {visibleContent?.label || band}</h3>
            <div className="text-sm opacity-90 space-y-1">
              {visibleContent?.uses?.length ? (
                <p><span className="font-semibold">Uses:</span> {visibleContent.uses.join(', ')}</p>
              ) : null}
              {visibleContent?.warnings?.length ? (
                <p><span className="font-semibold">Safety:</span> {visibleContent.warnings.join(' • ')}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <WaveViz freqHz={frequency} wavelengthM={wavelength} />
          <div className="text-white/90 text-sm">Drag the slider to see the wave compress or expand. The background shifts from red to violet as energy increases.</div>
        </section>
      </main>

      <footer id="about" className="text-white/70 text-xs p-6">
        Speed of light assumed constant (c = 299,792,458 m/s). E = h f, so energy increases with frequency. Values shown are approximate for education.
      </footer>

      {/* Auth dialog */}
      <dialog id="auth" className="bg-white/95 rounded-xl p-0 w-full max-w-md">
        <form method="dialog">
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-semibold">Welcome</h3>
            <p className="text-sm text-gray-600">Create an account or log in to save your preferences.</p>

            <div className="grid gap-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="border rounded px-3 py-2" />
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="border rounded px-3 py-2" />
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="border rounded px-3 py-2" />
            </div>

            <div className="flex gap-2">
              <button onClick={handleSignup} className="px-3 py-2 rounded bg-black text-white">Sign up</button>
              <button onClick={handleLogin} className="px-3 py-2 rounded bg-gray-800 text-white">Log in</button>
              <button className="px-3 py-2 rounded border" onClick={() => document.getElementById('auth').close()}>Close</button>
            </div>
          </div>
        </form>
      </dialog>
    </div>
  )
}
