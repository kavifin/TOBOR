import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Pause, Play } from 'lucide-react'
import Thumb from '../components/Thumb.jsx'
import { useCart } from '../lib/cart.jsx'
import { money } from '../lib/format.js'
import { prefersReducedMotion } from '../lib/smooth.js'
import { PRODUCTS } from '../../shared/products.js'
import { byId, COLORS } from '../../shared/pricing.js'

// Geometry in frame units (u). Desktop frame is 1440u wide, phones 860u.
// Cards sit on the inside of a cylinder: centre cards are upright, edge cards grow taller,
// with their outer edge taller than the inner one, and get pushed outward to keep the gaps even.
const PITCH = 236
const CARD_W = 205
const CARD_W_GROW = 58
const CARD_H = 330
const CARD_H_GROW = 110
const BAND_H = 470
const RADIUS = 18
const DRIFT = 46 // u per second, right → left
const DECAY = 0.05 // velocity keeps 5% per second after a fling

function quadPath(w, tl, tr, br, bl, r) {
  const k = r / w
  return `path('M 0 ${tl + r} Q 0 ${tl} ${r} ${tl + (tr - tl) * k} L ${w - r} ${tr - (tr - tl) * k} Q ${w} ${tr} ${w} ${tr + r} L ${w} ${br - r} Q ${w} ${br} ${w - r} ${br - (br - bl) * k} L ${r} ${bl + (br - bl) * k} Q 0 ${bl} 0 ${bl - r} Z')`
}

export default function CurvedShelf() {
  const band = useRef(null)
  const cards = useRef([])
  const section = useRef(null)
  const ctrl = useRef({ offset: 0, v: 0, paused: false, focus: null, dragging: false })
  const [paused, setPaused] = useState(false)
  const [entered, setEntered] = useState(false)
  const { add } = useCart()
  const items = PRODUCTS

  useEffect(() => {
    const reduced = prefersReducedMotion()
    const c = ctrl.current
    c.paused = reduced
    setPaused(reduced)
    const el = band.current
    const L = items.length * PITCH
    let u = 1
    let frameW = 1440
    let cx = 720
    let halfW = 706
    let visible = false

    const measure = () => {
      const w = el.clientWidth
      const phone = w <= 820
      u = phone ? w / 860 : Math.min(w / 1440, 1.2)
      frameW = w / u
      cx = frameW / 2
      halfW = cx - 14
      el.style.height = `${BAND_H * u}px`
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)

    // drag with momentum
    let lastX = 0
    let lastT = 0
    let moved = 0
    let captured = false
    const down = (e) => {
      if (e.button !== undefined && e.button !== 0) return
      c.dragging = true
      c.v = 0
      lastX = e.clientX
      lastT = performance.now()
      moved = 0
      captured = false
      el.classList.add('is-grabbing')
    }
    const move = (e) => {
      if (!c.dragging) return
      // capture only once it is clearly a drag, so plain taps still click the card
      if (!captured && moved > 6) {
        el.setPointerCapture(e.pointerId)
        captured = true
      }
      const now = performance.now()
      const dx = (e.clientX - lastX) / u
      c.offset += dx
      moved += Math.abs(dx)
      const dt = Math.max(1, now - lastT) / 1000
      c.v = c.v * 0.6 + (dx / dt) * 0.4
      lastX = e.clientX
      lastT = now
    }
    const up = () => {
      if (!c.dragging) return
      c.dragging = false
      el.classList.remove('is-grabbing')
      if (performance.now() - lastT > 80) c.v = 0
    }
    // a drag is not a click
    const click = (e) => {
      if (moved > 6) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('click', click, true)

    // page scroll pushes the shelf: scrolling down sends it left, up sends it right
    let lastY = window.scrollY
    const onScroll = () => {
      const dy = window.scrollY - lastY
      lastY = window.scrollY
      if (!reduced && visible) c.offset -= Math.max(-60, Math.min(60, dy)) * 0.45 / u
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        if (visible) setEntered(true)
      },
      { threshold: 0.2 },
    )
    io.observe(section.current)

    let raf
    let prev = performance.now()
    const loop = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (visible) {
        if (c.focus !== null) {
          // bring the focused card to the centre, along the shortest way round
          let want = -c.focus * PITCH
          want += Math.round((c.offset - want) / L) * L
          c.offset += (want - c.offset) * Math.min(1, dt * 8)
          c.v = 0
        } else if (!c.dragging) {
          c.offset += (c.v + (c.paused ? 0 : -DRIFT)) * dt
          c.v *= Math.pow(DECAY, dt)
        }
        for (let i = 0; i < items.length; i++) {
          const card = cards.current[i]
          if (!card) continue
          let t = (((i * PITCH + c.offset) % L) + L) % L
          if (t >= L / 2) t -= L
          const xc = cx + t * (1 + 0.083 * (t / halfW) ** 2)
          const d = Math.min(1.4, Math.abs(xc - cx) / halfW)
          const w = CARD_W + CARD_W_GROW * d * d
          const xl = xc - w / 2
          const xr = xc + w / 2
          if (xr < -40 || xl > frameW + 40) {
            card.style.visibility = 'hidden'
            continue
          }
          const edge = (x) => CARD_H + CARD_H_GROW * Math.min(1.4, Math.abs(x - cx) / halfW) ** 2.6
          const hl = edge(xl)
          const hr = edge(xr)
          const vc = BAND_H / 2 - 12 * d * d
          const top = vc - Math.max(hl, hr) / 2
          const height = Math.max(hl, hr)
          const tl = vc - hl / 2 - top
          const tr = vc - hr / 2 - top
          const bl = tl + hl
          const br = tr + hr
          card.style.visibility = 'visible'
          card.style.transform = `translate(${xl * u}px, ${top * u}px)`
          card.style.width = `${w * u}px`
          card.style.height = `${height * u}px`
          card.style.clipPath = quadPath(w * u, tl * u, tr * u, br * u, bl * u, RADIUS * u)
          card.style.setProperty('--lean', ((hr - hl) / height).toFixed(3))
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('click', click, true)
    }
  }, [items.length])

  const togglePause = () => {
    ctrl.current.paused = !ctrl.current.paused
    setPaused(ctrl.current.paused)
  }

  return (
    <section ref={section} className={`shelf ${entered ? 'is-in' : ''}`} aria-labelledby="shelf-title">
      <div className="shelf-head container">
        <h2 id="shelf-title" className="shelf-title">
          <span>Ready to print,</span>
          <span>ready to ship</span>
        </h2>
        <p className="shelf-sub">Designs we’ve tested and printed hundreds of times. Pick a colour: we print it to order and ship it in 2 to 4 days.</p>

        <svg className="doodle doodle-slash" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M14 8 L6 32 M30 8 L22 32" />
        </svg>
        <p className="note note-drag" aria-hidden="true">Drag to<br />browse</p>
        <svg className="doodle doodle-arrow" viewBox="0 0 120 160" aria-hidden="true">
          <path d="M20 8 C 70 20, 96 60, 72 100 C 60 120, 40 128, 44 150" />
          <path d="M34 140 L44 152 L54 138" />
        </svg>
      </div>

      <div
        ref={band}
        className="shelf-band"
        role="group"
        aria-roledescription="carousel"
        aria-label="Ready-made products"
      >
        {items.map((p, i) => {
          const tint = byId(COLORS, p.color).hex
          return (
            <article
              key={p.id}
              ref={(el) => (cards.current[i] = el)}
              className="shelf-card"
              style={{ '--tint': tint }}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}: ${p.name}`}
            >
              <Link
                to={`/shop/${p.slug}`}
                className="shelf-link"
                draggable="false"
                onFocus={() => (ctrl.current.focus = i)}
                onBlur={() => (ctrl.current.focus = null)}
              >
                <Thumb product={p} alt="" className="shelf-thumb" />
                <span className="shelf-info">
                  <span className="shelf-name">{p.name}</span>
                  <span className="shelf-price">{money(p.price)}</span>
                </span>
              </Link>
              <button
                className="shelf-add"
                onClick={() => add({ kind: 'product', productId: p.id, color: p.color, qty: 1 })}
                onFocus={() => (ctrl.current.focus = i)}
                onBlur={() => (ctrl.current.focus = null)}
                aria-label={`Add ${p.name} to cart, ${money(p.price)}`}
              >
                <ShoppingBag size={16} aria-hidden="true" />
              </button>
            </article>
          )
        })}
      </div>

      <div className="shelf-foot">
        <button className="shelf-pause" onClick={togglePause} aria-pressed={paused} aria-label={paused ? 'Play the product shelf' : 'Pause the product shelf'}>
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
        <span className="shelf-ring">
          <Link className="btn btn-lg btn-hot" to="/shop">See all {items.length} products</Link>
        </span>
        <p className="note note-free" aria-hidden="true">Free delivery<br />over ₹999</p>
        <svg className="doodle doodle-small" viewBox="0 0 60 40" aria-hidden="true">
          <path d="M56 30 C 40 34, 20 30, 8 16" />
          <path d="M6 28 L8 15 L20 18" />
        </svg>
      </div>
    </section>
  )
}
