import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Story from '../sections/Story.jsx'
import QuoteStudio from '../sections/QuoteStudio.jsx'
import CurvedShelf from '../sections/CurvedShelf.jsx'
import { Materials, Gallery, Faq } from '../sections/HomeExtras.jsx'
import { scrollToEl } from '../lib/smooth.js'

export default function Home() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const t = setTimeout(() => scrollToEl(document.getElementById(hash.slice(1) === 'photo' ? 'quote' : hash.slice(1))), 300)
    return () => clearTimeout(t)
  }, [hash])

  return (
    <>
      <Story />
      <QuoteStudio />
      <CurvedShelf />
      <Gallery />
      <Materials />
      <Faq />
    </>
  )
}
