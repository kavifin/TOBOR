import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingBag, Menu, X } from 'lucide-react'
import Wordmark from './Wordmark.jsx'
import { useCart } from '../lib/cart.jsx'
import { scrollToEl, scrollToY } from '../lib/smooth.js'

export default function Header() {
  const { count, openDrawer } = useCart()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    setMenu(false)
  }, [pathname])

  const toQuote = (e) => {
    e.preventDefault()
    setMenu(false)
    const el = document.getElementById('quote')
    if (el) scrollToEl(el)
    else navigate('/#quote')
  }

  // Already home: glide back to the start of the scroll story instead of reloading the page.
  const toHome = (e) => {
    setMenu(false)
    if (pathname !== '/') return
    e.preventDefault()
    if (window.location.hash) navigate('/', { replace: true })
    scrollToY(0)
  }

  const links = (
    <>
      <NavLink to="/" end onClick={toHome}>Home</NavLink>
      <a href="/#quote" onClick={toQuote}>Print my part</a>
      <NavLink to="/shop">Shop</NavLink>
      <NavLink to="/track">Track order</NavLink>
    </>
  )

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="header-logo" aria-label="TOBOR home" onClick={toHome}>
          <Wordmark size="sm" />
        </Link>
        <nav className="header-nav" aria-label="Main">{links}</nav>
        <div className="header-actions">
          <button className="icon-btn cart-btn" onClick={openDrawer} aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}>
            <ShoppingBag size={22} aria-hidden="true" />
            {count > 0 && <span className="badge" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
          </button>
          <button className="icon-btn menu-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="mobile-nav" aria-label={menu ? 'Close menu' : 'Open menu'}>
            {menu ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {menu && (
        <nav id="mobile-nav" className="mobile-nav" aria-label="Main">
          {links}
        </nav>
      )}
    </header>
  )
}
