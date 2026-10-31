import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, PenTool, IndianRupee, Layers, Truck, ArrowDown, Check } from 'lucide-react'
import { ScrollTrigger, prefersReducedMotion, scrollToY, scrollToEl } from '../lib/smooth.js'
import { Film, filmPace } from '../three/film.js'
import { logosReady } from '../lib/brand.js'
import { WhatsAppIcon } from '../components/Icons.jsx'
import Wordmark from '../components/Wordmark.jsx'

// Scroll budget: a short hold on the opening shot for the hero, the film, then a short hold at the end.
const HOLD_START = 0.07
const HOLD_END = 0.06
const FILM = 1 - HOLD_START - HOLD_END
const VIDEO_SECONDS = 10
const LAYERS = 250

// Chapter timings, in seconds of a 10-second film (see src/three/film.js for what happens when).
const STEPS = [
  { id: 'send', from: 0, to: 1.9, icon: Camera, chip: 'Photos received for TB-R1042', title: 'Send us a photo', body: 'Scan our QR code or upload from the site. Add your name and WhatsApp number, and that’s it.' },
  { id: 'model', from: 1.9, to: 4.0, icon: PenTool, chip: 'Modelled on our studio PC, sent to the printer', title: 'We build the 3D model', body: 'Our designers turn your photos into a print-ready model on the studio PC, then send it straight to the printer.' },
  { id: 'pay', from: 4.0, to: 5.3, icon: IndianRupee, chip: 'Payment confirmed by UPI', title: 'Pay in seconds', body: 'UPI, card or net banking. Pick the filament and quantity, and your job joins the print queue.' },
  { id: 'print', from: 5.3, to: 7.4, icon: Layers, chip: 'print', title: 'We print it, layer by layer', body: 'PLA+, PETG and more, printed in the quality and quantity you chose, then cleaned and checked.' },
  { id: 'done', from: 7.4, to: 8.4, icon: WhatsAppIcon, chip: 'WhatsApp sent: print complete', title: 'You get a WhatsApp message', body: 'The moment it’s done, your phone and your order page both show the print as complete.' },
  { id: 'ship', from: 8.4, to: 10, icon: Truck, chip: 'Out for delivery, AWB 7281993011', title: 'Out for delivery', body: 'Packed and handed to our courier partner. The tracking number lands on your WhatsApp.' },
]
// Each moment of the film gets scroll in proportion to how far the camera moves, so the whole
// film plays at one steady, slow pace (see filmPace in src/three/film.js).
const { toFilm, toScroll } = filmPace()
const toP = (seconds) => HOLD_START + toScroll(seconds / VIDEO_SECONDS) * FILM
const clamp01 = (x) => Math.min(1, Math.max(0, x))

export default function Story() {
  const section = useRef(null)
  const canvas = useRef(null)
  const chipText = useRef(null)
  const [active, setActive] = useState(-1)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Wait for the logo so the phone screen, box label and van livery are painted with it.
    let stop = () => {}
    let cancelled = false
    logosReady.then(() => {
      if (!cancelled) stop = startFilm()
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  function startFilm() {
    const reduced = prefersReducedMotion()
    const cv = canvas.current
    let film
    try {
      film = new Film(cv)
      if (import.meta.env.DEV) window.__film = film // handy for debugging the scene
    } catch {
      setReady(false)
      return () => {}
    }

    function resize() {
      const r = cv.getBoundingClientRect()
      const small = r.width < 820
      film.resize(r.width, r.height, Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75))
    }

    let target = 0
    let current = 0
    const st = ScrollTrigger.create({
      trigger: section.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => (target = self.progress),
    })
    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    resize()

    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(section.current)

    let lastStep = -2
    let lastChip = ''
    let first = true
    let raf
    let prev = performance.now()
    const loop = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (visible) {
        current = reduced ? target : current + (target - current) * Math.min(1, dt * 3.5)
        if (Math.abs(target - current) < 0.00005) current = target
        const t = toFilm(clamp01((current - HOLD_START) / FILM)) * VIDEO_SECONDS
        film.update(t / VIDEO_SECONDS, dt, reduced)
        if (first) {
          first = false
          setReady(true)
        }
        const step = current < HOLD_START * 0.8 ? -1 : STEPS.findIndex((s) => t < s.to || s.id === 'ship')
        const s = STEPS[Math.max(0, step)]
        if (step !== lastStep) {
          lastStep = step
          setActive(step)
        }
        if (chipText.current) {
          let chip = s.chip
          if (s.id === 'print') {
            const layer = Math.round(clamp01((t - 5.6) / (7.1 - 5.6)) * LAYERS)
            chip = layer >= LAYERS ? 'Print finished, quality checked' : layer === 0 ? 'Heating the nozzle' : `Printing layer ${layer} of ${LAYERS}`
          }
          if (chip !== lastChip) {
            chipText.current.textContent = chip
            lastChip = chip
          }
        }
        section.current.style.setProperty('--hero-out', clamp01(current / (HOLD_START * 0.9)).toFixed(3))
        section.current.style.setProperty('--pay-in', (clamp01((t - 4.4) / 0.25) * (1 - clamp01((t - 5.15) / 0.2))).toFixed(3))
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      st.kill()
      ro.disconnect()
      io.disconnect()
      film.dispose()
    }
  }

  const jumpTo = (i) => {
    const el = section.current
    const span = el.offsetHeight - window.innerHeight
    const s = STEPS[i]
    scrollToY(el.offsetTop + span * toP(s.from + (s.to - s.from) * 0.5))
  }

  const step = STEPS[active]
  const ChipIcon = (step ?? STEPS[0]).icon

  return (
    <section ref={section} className={`story ${ready ? 'is-ready' : ''}`} aria-label="How TOBOR works, from photo to delivery">
      <div className="story-sticky">
        <canvas ref={canvas} className="story-canvas" aria-hidden="true" />
        <div className="story-shade" aria-hidden="true" />

        <div className="story-hero">
          <div className="hero-card glass">
            <h1 className="story-title">
              <Wordmark size="hero" />
              <span className="sr-only">TOBOR 3D printing</span>
            </h1>
            <p className="story-lede">Send a photo of anything. We model it, print it and deliver it to your door.</p>
            <div className="story-actions">
              <button className="btn btn-lg" onClick={() => scrollToEl(document.getElementById('quote'))}>Get a free quote</button>
              <Link className="btn btn-lg btn-glass" to="/shop">Shop ready-made prints</Link>
            </div>
          </div>
          <p className="story-cue glass">
            <ArrowDown size={16} aria-hidden="true" /> Scroll to follow one print from photo to doorstep
          </p>
        </div>

        {/* in-scene glass cards, like floating UI in the film */}
        <div className="film-card film-pay glass" aria-hidden="true">
          <p className="film-paid"><span className="tick"><Check size={18} /></span> Payment confirmed</p>
          <dl>
            <div><dt>Quantity</dt><dd>Batch of 6</dd></div>
            <div><dt>Filament</dt><dd>Premium PLA+ / PETG</dd></div>
            <div><dt>Paid by</dt><dd>UPI</dd></div>
          </dl>
        </div>

        <p className={`story-chip glass ${step ? 'is-on' : ''}`} aria-hidden="true">
          <span className="chip-icon"><ChipIcon size={16} /></span>
          <span ref={chipText} />
        </p>

        <div className={`story-caption glass ${step ? 'is-on' : ''}`} aria-live="polite">
          <ol className="story-rail" aria-label="Steps">
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <button className={i === active ? 'is-active' : i < active ? 'is-done' : ''} onClick={() => jumpTo(i)} aria-current={i === active ? 'step' : undefined} aria-label={`Step ${i + 1}: ${s.title}`} />
              </li>
            ))}
          </ol>
          {step && (
            <div className="story-step" key={step.id}>
              <p className="step-count">Step {active + 1} of {STEPS.length}</p>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
              {step.id === 'ship' && (
                <div className="story-actions">
                  <button className="btn" onClick={() => scrollToEl(document.getElementById('quote'))}>Send us a photo</button>
                  <Link className="btn btn-glass" to="/shop">Shop ready-made</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
