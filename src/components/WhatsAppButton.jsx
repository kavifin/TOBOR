import { useLocation } from 'react-router-dom'
import { WhatsAppIcon } from './Icons.jsx'
import { waLink } from '../lib/config.js'

export default function WhatsAppButton() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/admin')) return null
  const text = pathname.startsWith('/shop/')
    ? `Hi TOBOR, I have a question about this product: ${window.location.href}`
    : 'Hi TOBOR, I have a question about 3D printing.'
  return (
    <a className="wa-float" href={waLink(text)} target="_blank" rel="noopener noreferrer" aria-label="Chat with TOBOR on WhatsApp">
      <WhatsAppIcon size={28} />
      <span className="wa-float-label">Chat with us</span>
    </a>
  )
}
