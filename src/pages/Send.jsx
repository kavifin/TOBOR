import PhotoRequest from '../sections/PhotoRequest.jsx'

/** Opened from the QR code: a phone-first page for snapping and sending photos. */
export default function Send() {
  return (
    <div className="page send-page">
      <div className="container narrow">
        <header className="page-head">
          <h1>Send photos for a quote</h1>
          <p>Take 2 to 3 photos from different sides. We’ll reply on WhatsApp with a sample 3D model and a price, usually within 24 hours.</p>
        </header>
        <PhotoRequest source="qr" />
      </div>
    </div>
  )
}
