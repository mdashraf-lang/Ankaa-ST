"use client"

import * as React from "react"
import { Eye, EyeSlash, EnvelopeSimple } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Star {
  angle: number; r: number; maxR: number
  speed: number; size: number; alpha: number
  phase: number; blue: boolean
}
interface Rocket {
  sx: number; sy: number; ex: number; ey: number
  t0: number; t1: number; sz: number
}

// ── Canvas helpers ────────────────────────────────────────────────────────────
function createStars(W: number, H: number): Star[] {
  const N = Math.min(260, Math.round((W * H) / 6400))
  return Array.from({ length: N }, () => {
    const d = Math.random()
    return {
      angle: Math.random() * 6.2832,
      r    : Math.random() * Math.hypot(W, H) * 0.58,
      maxR : Math.hypot(W, H) * 0.58,
      speed: 0.06 + d * 0.20,
      size : 0.6  + d * 2.2,
      alpha: 0.14 + d * 0.52,   // dark navy dots — visible on white
      phase: Math.random() * 6.2832,
      blue : Math.random() > 0.78,
    }
  })
}

function createRockets(W: number, H: number): Rocket[] {
  return [
    { sx: -90,        sy: H * 0.74, ex: W + 90,   ey: H * 0.05, t0: 200,  t1: 1900, sz: 28 },
    { sx: W + 90,     sy: H * 0.27, ex: -90,       ey: H * 0.84, t0: 500,  t1: 2100, sz: 24 },
    { sx: W * 0.08,   sy: -70,      ex: W * 0.92,  ey: H + 70,   t0: 100,  t1: 1700, sz: 20 },
  ]
}

function drawRocket(ctx: CanvasRenderingContext2D, r: Rocket, p: number, opa: number) {
  const x  = r.sx + (r.ex - r.sx) * p
  const y  = r.sy + (r.ey - r.sy) * p
  const ag = Math.atan2(r.ey - r.sy, r.ex - r.sx)
  const sz = r.sz
  ctx.save()
  ctx.globalAlpha *= opa
  ctx.translate(x, y)
  ctx.rotate(ag)

  const tL  = sz * 5.5
  const tGr = ctx.createLinearGradient(-tL, 0, 0, 0)
  tGr.addColorStop(0,    'rgba(255,80,0,0)')
  tGr.addColorStop(0.35, 'rgba(255,140,20,.42)')
  tGr.addColorStop(0.78, 'rgba(255,210,60,.78)')
  tGr.addColorStop(1,    'rgba(255,248,180,.98)')
  ctx.beginPath()
  ctx.moveTo(0, -sz * .26); ctx.lineTo(-tL, 0); ctx.lineTo(0, sz * .26)
  ctx.closePath(); ctx.fillStyle = tGr; ctx.fill()

  const wGr = ctx.createLinearGradient(-tL * 1.35, 0, 0, 0)
  wGr.addColorStop(0, 'rgba(255,110,0,0)'); wGr.addColorStop(1, 'rgba(255,180,50,.20)')
  ctx.beginPath()
  ctx.moveTo(0, -sz * .12); ctx.lineTo(-tL * 1.35, 0); ctx.lineTo(0, sz * .12)
  ctx.closePath(); ctx.fillStyle = wGr; ctx.fill()

  ctx.beginPath(); ctx.ellipse(sz * .12, 0, sz * .9, sz * .28, 0, 0, 6.2832)
  ctx.fillStyle = '#a8c4e0'; ctx.fill()

  ctx.beginPath(); ctx.ellipse(sz * .55, -sz * .07, sz * .37, sz * .13, -.22, 0, 6.2832)
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill()

  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(-sz * .15, 0); ctx.lineTo(-sz * .68, s * sz * .62); ctx.lineTo(-sz * .08, s * sz * .30)
    ctx.closePath(); ctx.fillStyle = '#6a92b8'; ctx.fill()
  }

  const eg = ctx.createRadialGradient(-sz * .78, 0, 0, -sz * .78, 0, sz * .52)
  eg.addColorStop(0,    'rgba(255,200,60,.98)')
  eg.addColorStop(0.45, 'rgba(255,100,20,.6)')
  eg.addColorStop(1,    'rgba(255,40,0,0)')
  ctx.beginPath(); ctx.arc(-sz * .78, 0, sz * .52, 0, 6.2832)
  ctx.fillStyle = eg; ctx.fill()

  ctx.restore()
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()

  // Canvas refs
  const canvasRef      = React.useRef<HTMLCanvasElement>(null)
  const starsRef       = React.useRef<Star[]>([])
  const rocketsRef     = React.useRef<Rocket[]>([])
  const introPhaseRef  = React.useRef(true)
  const startTimeRef   = React.useRef(0)
  const rafRef         = React.useRef<number>(0)

  // Zoom refs
  const textWrapRef = React.useRef<HTMLDivElement>(null)
  const oLetterRef  = React.useRef<HTMLSpanElement>(null)

  // Animation state
  const [titleIn,   setTitleIn]   = React.useState(false)
  const [scanIn,    setScanIn]    = React.useState(false)
  const [subIn,     setSubIn]     = React.useState(false)
  const [zooming,   setZooming]   = React.useState(false)
  const [introOut,  setIntroOut]  = React.useState(false)
  const [loginBgIn, setLoginBgIn] = React.useState(false)
  const [loginIn,   setLoginIn]   = React.useState(false)

  // Form state
  const [showPw,     setShowPw]     = React.useState(false)
  const [email,      setEmail]      = React.useState('')
  const [password,   setPassword]   = React.useState('')
  const [rememberMe, setRememberMe] = React.useState(false)
  const [loading,    setLoading]    = React.useState(false)
  const [errors,     setErrors]     = React.useState<{ email?: string; password?: string; server?: string }>({})

  // ── Canvas ───────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    function resize() {
      canvas!.width  = window.innerWidth
      canvas!.height = window.innerHeight
      starsRef.current   = createStars(canvas!.width, canvas!.height)
      rocketsRef.current = createRockets(canvas!.width, canvas!.height)
    }
    resize()
    window.addEventListener('resize', resize)
    startTimeRef.current = performance.now()

    function tick() {
      rafRef.current = requestAnimationFrame(tick)
      const W  = canvas!.width
      const H  = canvas!.height
      const CX = W / 2
      const CY = H / 2
      const ms = performance.now() - startTimeRef.current

      ctx.clearRect(0, 0, W, H)

      // Canvas fades from 1 → 0.12 between 2.48 s and 2.9 s
      let cOpa = 1
      if (ms > 2480) cOpa = Math.max(0.12, 1 - ((ms - 2480) / 420) * 0.88)
      ctx.globalAlpha = cOpa

      // Dark navy particles on white background
      for (const s of starsRef.current) {
        s.r += s.speed
        if (s.r > s.maxR) { s.r = 1; s.angle = Math.random() * 6.2832 }
        const tw = 0.68 + 0.32 * Math.sin(ms * 0.0018 + s.phase)
        ctx.beginPath()
        ctx.arc(CX + Math.cos(s.angle) * s.r, CY + Math.sin(s.angle) * s.r, s.size, 0, 6.2832)
        ctx.fillStyle = s.blue
          ? `rgba(37,99,235,${s.alpha * tw})`       // blue particles
          : `rgba(15,30,90,${s.alpha * tw})`         // navy particles
        ctx.fill()
      }

      if (introPhaseRef.current) {
        for (const r of rocketsRef.current) {
          if (ms < r.t0 || ms > r.t1 + 100) continue
          const p   = Math.max(0, Math.min(1, (ms - r.t0) / (r.t1 - r.t0)))
          const opa = p < 0.12 ? p / 0.12 : p > 0.88 ? (1 - p) / 0.12 : 1
          drawRocket(ctx, r, p, opa)
        }
      }

      ctx.globalAlpha = 1
    }
    tick()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // ── Timeline — total 3.5 s ────────────────────────────────────────────────────
  React.useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = []

    ids.push(setTimeout(() => setTitleIn(true),   100))   // 0.10 s — title materialises
    ids.push(setTimeout(() => setScanIn(true),    160))   // 0.16 s — scan line
    ids.push(setTimeout(() => setSubIn(true),     420))   // 0.42 s — subtitle rises

    // 2.18 s — pin "O" origin just before zoom
    ids.push(setTimeout(() => {
      if (textWrapRef.current && oLetterRef.current) {
        const oR = oLetterRef.current.getBoundingClientRect()
        const wR = textWrapRef.current.getBoundingClientRect()
        const ox = (oR.left + oR.width  * 0.5) - wR.left
        const oy = (oR.top  + oR.height * 0.5) - wR.top
        textWrapRef.current.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`
      }
    }, 2180))

    ids.push(setTimeout(() => setZooming(true),   2200))  // 2.20 s — zoom into O (0.56 s)
    ids.push(setTimeout(() => setIntroOut(true),  2480))  // 2.48 s — intro fades  (0.32 s)
    ids.push(setTimeout(() => setLoginBgIn(true), 2560))  // 2.56 s — bg rises
    ids.push(setTimeout(() => {                            // 2.65 s — login card in (0.44 s → done ~3.1 s)
      setLoginIn(true)
      introPhaseRef.current = false
    }, 2650))

    return () => ids.forEach(clearTimeout)
  }, [])

  // ── Form ─────────────────────────────────────────────────────────────────────
  const validate = () => {
    const e: { email?: string; password?: string } = {}
    if (!email) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email'
    if (!password) e.password = 'Password is required'
    else if (password.length < 6) e.password = 'Password must be at least 6 characters'
    return e
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setErrors({ server: err instanceof Error ? err.message : 'Login failed' })
    } finally {
      setLoading(false)
    }
  }

  // ── Inline CSS (keyframes only) ───────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Tomorrow:wght@400;500;600;700;900&display=swap');
    @keyframes scan-sweep {
      from { top: 0%;   opacity: 1; }
      to   { top: 100%; opacity: 0; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse-dot {
      0%,100% { opacity:1;   box-shadow:0 0 6px #22c55e; }
      50%     { opacity:.5;  box-shadow:0 0 14px #22c55e; }
    }
    .sheen-btn::before {
      content:''; position:absolute; top:0; left:-100%; width:100%; height:100%;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);
      transition:left 380ms ease-out;
    }
    .sheen-btn:hover::before { left:100%; }
  `

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Canvas — always fullscreen */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block' }} />

      {/* Soft vignette — light version */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 28%, rgba(226,236,255,.55) 100%)',
      }} />

      {/* Login backdrop — light blue wash */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 38%, rgba(214,231,255,.70) 0%, rgba(239,246,255,.96) 100%)',
        opacity: loginBgIn ? 1 : 0,
        transition: 'opacity 500ms ease-in-out',
      }} />

      {/* ══ SCREEN 1 — INTRO ══ */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        opacity: introOut ? 0 : 1,
        transition: introOut ? 'opacity 320ms ease-in' : 'none',
        pointerEvents: loginIn ? 'none' : 'auto',
      }}>

        {/* Scan line */}
        {scanIn && (
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 2, top: 0, zIndex: 20,
            background: 'linear-gradient(90deg,transparent,rgba(27,42,94,.55),transparent)',
            animation: 'scan-sweep 540ms ease-in-out forwards',
          }} />
        )}

        {/* Zoomable text block */}
        <div
          ref={textWrapRef}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 'clamp(8px,1.4vw,22px)',
            willChange: 'transform',
            transform: zooming ? 'scale(55)' : 'scale(1)',
            transition: zooming ? 'transform 560ms cubic-bezier(0.9,0,1,1)' : 'none',
          }}
        >
          {/* Main title */}
          <h1
            style={{
              fontFamily: "'Tomorrow', 'Trebuchet MS', sans-serif",
              fontWeight: 500,
              fontSize: 'clamp(48px,9vw,144px)',
              letterSpacing: '0.07em',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              /* Dark navy gradient — legible on white */
              background: 'linear-gradient(155deg, #0f1e5a 0%, #1d4ed8 32%, #1b2a5e 58%, #2563eb 82%, #0f1e5a 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              opacity: titleIn ? 1 : 0,
              transition: titleIn ? 'opacity 460ms ease-out' : 'none',
              position: 'relative',
            }}
          >
            {/* Soft blue bloom */}
            <span style={{
              position: 'absolute', inset: 0,
              fontFamily: 'inherit', fontWeight: 'inherit',
              fontSize: 'inherit', letterSpacing: 'inherit',
              background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'blur(18px)', opacity: 0.18,
              pointerEvents: 'none', zIndex: -1,
            }} aria-hidden>ANKAA.OM</span>

            ANKAA.<span ref={oLetterRef} style={{ display: 'inline' }}>O</span>M
          </h1>

          {/* Tagline */}
          <p style={{
            fontFamily: "'Tomorrow', 'Trebuchet MS', sans-serif",
            fontWeight: 400,
            fontSize: 'clamp(9px,1.25vw,15px)',
            letterSpacing: '0.28em',
            color: 'rgba(27,42,94,.60)',
            textTransform: 'uppercase',
            opacity: subIn ? 1 : 0,
            transform: subIn ? 'translateY(0)' : 'translateY(16px)',
            transition: subIn ? 'opacity 420ms ease-out, transform 420ms ease-out' : 'none',
          }}>
            Empowering Tomorrow, Today
          </p>
        </div>
      </div>

      {/* ══ SCREEN 2 — LOGIN ══ */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: loginIn ? 1 : 0,
        transform: loginIn ? 'translateY(0)' : 'translateY(32px)',
        transition: loginIn ? 'opacity 460ms ease-out, transform 460ms ease-out' : 'none',
        pointerEvents: loginIn ? 'auto' : 'none',
      }}>

        {/* White glass card */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: 'min(420px, calc(100vw - 32px))',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(32px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
          border: '1px solid rgba(27,42,94,.10)',
          borderRadius: 20,
          padding: '38px 34px 32px',
          boxShadow: [
            '0 1px 3px rgba(27,42,94,.06)',
            '0 8px 24px rgba(27,42,94,.08)',
            '0 32px 80px rgba(27,42,94,.10)',
          ].join(', '),
        }}>

          {/* Top-edge highlight */}
          <div style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
            background: 'linear-gradient(90deg,transparent,rgba(27,42,94,.22),transparent)',
            borderRadius: 999,
          }} />

          {/* Logo */}
          <div style={{
            fontFamily: "'Tomorrow', 'Trebuchet MS', sans-serif",
            fontWeight: 500, fontSize: 26, letterSpacing: '0.08em',
            background: 'linear-gradient(135deg, #0f1e5a 10%, #1d4ed8 55%, #1b2a5e 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center', marginBottom: 5,
          }}>
            ANKAA.OM
          </div>

          <div style={{
            fontFamily: "'Tomorrow', 'Trebuchet MS', sans-serif",
            fontSize: 9, fontWeight: 400, letterSpacing: '0.28em', textTransform: 'uppercase',
            color: 'rgba(27,42,94,.40)', textAlign: 'center', marginBottom: 24,
          }}>
            Empowering Tomorrow, Today
          </div>

          <div style={{
            height: 1, marginBottom: 22,
            background: 'linear-gradient(90deg,transparent,rgba(27,42,94,.12),transparent)',
          }} />

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@ankaa.om"
                  autoComplete="email"
                  style={{
                    ...inputSt,
                    borderColor: errors.email ? 'rgba(220,38,38,.45)' : 'rgba(27,42,94,.14)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(37,99,235,.55)'
                    e.currentTarget.style.background   = '#fff'
                    e.currentTarget.style.boxShadow    = '0 0 0 3px rgba(37,99,235,.10)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = errors.email ? 'rgba(220,38,38,.45)' : 'rgba(27,42,94,.14)'
                    e.currentTarget.style.background   = 'rgba(241,245,249,.85)'
                    e.currentTarget.style.boxShadow    = 'none'
                  }}
                />
                <span style={iconSt}><EnvelopeSimple size={15} /></span>
              </div>
              {errors.email && <p style={errSt}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelSt}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{
                    ...inputSt,
                    borderColor: errors.password ? 'rgba(220,38,38,.45)' : 'rgba(27,42,94,.14)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(37,99,235,.55)'
                    e.currentTarget.style.background   = '#fff'
                    e.currentTarget.style.boxShadow    = '0 0 0 3px rgba(37,99,235,.10)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = errors.password ? 'rgba(220,38,38,.45)' : 'rgba(27,42,94,.14)'
                    e.currentTarget.style.background   = 'rgba(241,245,249,.85)'
                    e.currentTarget.style.boxShadow    = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(27,42,94,.40)', display: 'flex', alignItems: 'center',
                    padding: 5, borderRadius: 6,
                    transition: 'color 150ms ease-out',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(27,42,94,.85)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(27,42,94,.40)')}
                >
                  {showPw ? <EyeSlash size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p style={errSt}>{errors.password}</p>}
            </div>

            {/* Remember + Forgot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#1d4ed8', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: 'rgba(27,42,94,.55)', userSelect: 'none' }}>
                  Remember this device
                </span>
              </label>
              <button
                type="button"
                style={{
                  fontSize: 12, fontWeight: 500, color: '#1d4ed8',
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'color 150ms ease-out',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#1b2a5e')}
                onMouseLeave={e => (e.currentTarget.style.color = '#1d4ed8')}
              >
                Forgot password?
              </button>
            </div>

            {/* Server error */}
            {errors.server && (
              <p style={{
                fontSize: 12, color: '#dc2626', textAlign: 'center', marginBottom: 14,
                padding: '8px 12px', background: 'rgba(220,38,38,.05)',
                border: '1px solid rgba(220,38,38,.18)', borderRadius: 10,
              }}>
                {errors.server}
              </p>
            )}

            {/* Sign In */}
            <button
              type="submit"
              disabled={loading}
              className="sheen-btn"
              style={{
                width: '100%', height: 48, border: 'none', borderRadius: 11,
                background: 'linear-gradient(135deg, #1b2a5e 0%, #1d4ed8 52%, #2563eb 100%)',
                color: '#fff',
                fontFamily: "'Tomorrow','Trebuchet MS',sans-serif",
                fontSize: 13, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.72 : 1,
                position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 18px rgba(27,42,94,.28), inset 0 1px 0 rgba(255,255,255,.14)',
                transition: 'transform 150ms ease-out, box-shadow 200ms ease-out, opacity 150ms ease-out',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.transform  = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow  = '0 8px 28px rgba(27,42,94,.36), inset 0 1px 0 rgba(255,255,255,.16)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(27,42,94,.28), inset 0 1px 0 rgba(255,255,255,.14)'
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {loading ? (
                <span style={{
                  width: 16, height: 16,
                  border: '2px solid rgba(255,255,255,.30)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'block',
                }} />
              ) : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#22c55e', boxShadow: '0 0 6px #22c55e', flexShrink: 0,
                animation: 'pulse-dot 2.2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 10.5, color: 'rgba(27,42,94,.38)' }}>All systems operational</span>
            </div>
            <p style={{ fontSize: 10, color: 'rgba(27,42,94,.25)', textAlign: 'center' }}>
              &copy; 2026 Ankaa Science &amp; Technology. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Shared style objects ──────────────────────────────────────────────────────
const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 10.5, fontWeight: 600,
  letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'rgba(27,42,94,.55)', marginBottom: 7,
}

const inputSt: React.CSSProperties = {
  width: '100%', height: 45,
  background: 'rgba(241,245,249,.85)',
  border: '1px solid rgba(27,42,94,.14)',
  borderRadius: 10, padding: '0 42px 0 14px',
  fontSize: 14, color: '#0f172a',
  fontFamily: "'Inter',system-ui,sans-serif",
  outline: 'none',
  transition: 'border-color 180ms ease-out, background 180ms ease-out, box-shadow 180ms ease-out',
}

const iconSt: React.CSSProperties = {
  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
  color: 'rgba(27,42,94,.35)', pointerEvents: 'none',
  display: 'flex', alignItems: 'center',
}

const errSt: React.CSSProperties = {
  fontSize: 11, color: '#dc2626', marginTop: 5,
}
