import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Story from '../sections/Story.jsx'
import QuoteStudio from '../sections/QuoteStudio.jsx'
import DesignStudio, { DESIGN_HASHES } from '../sections/DesignStudio.jsx'
import CurvedShelf from '../sections/CurvedShelf.jsx'
import { Materials, Gallery, Faq } from '../sections/HomeExtras.jsx'
import { scrollToEl } from '../lib/smooth.js'

// Hashes that open a tab inside a section rather than naming the section itself.
const sectionFor = (hash) => (hash === 'photo' ? 'quote' : DESIGN_HASHES.includes(hash) ? 'design' : hash)

export default function Home() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const t = setTimeout(() => scrollToEl(document.getElementById(sectionFor(hash.slice(1)))), 300)
    return () => clearTimeout(t)
  }, [hash])

  return (
    <>
      <Story />
      <QuoteStudio />
      <DesignStudio />
      <CurvedShelf />
      <Gallery />
      <Materials />
      <Faq />
    </>
  )
}
