import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import WhatsAppButton from './components/WhatsAppButton.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import { startSmoothScroll, scrollToY, ScrollTrigger } from './lib/smooth.js'

const Shop = lazy(() => import('./pages/Shop.jsx'))
const Product = lazy(() => import('./pages/Product.jsx'))
const Cart = lazy(() => import('./pages/Cart.jsx'))
const Checkout = lazy(() => import('./pages/Checkout.jsx'))
const Track = lazy(() => import('./pages/Track.jsx'))
const Send = lazy(() => import('./pages/Send.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))

const TITLES = { '/': 'TOBOR: 3D printing from a photo', '/shop': 'Shop | TOBOR', '/cart': 'Cart | TOBOR', '/checkout': 'Checkout | TOBOR', '/track': 'Track your order | TOBOR', '/send': 'Send photos | TOBOR', '/admin': 'Team dashboard | TOBOR' }

export default function App() {
  const { pathname, hash } = useLocation()

  useEffect(() => startSmoothScroll(), [])

  useEffect(() => {
    if (TITLES[pathname]) document.title = TITLES[pathname]
    if (!hash) scrollToY(0, true)
    const t = setTimeout(() => ScrollTrigger.refresh(), 100)
    return () => clearTimeout(t)
  }, [pathname, hash])

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Suspense fallback={<div className="page" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:slug" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/track" element={<Track />} />
          <Route path="/send" element={<Send />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      {pathname !== '/admin' && <Footer />}
      <CartDrawer />
      <WhatsAppButton />
    </>
  )
}
