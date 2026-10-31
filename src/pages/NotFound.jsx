import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page not found — TOBOR'
  }, [])
  return (
    <div className="page">
      <div className="container narrow empty">
        <h1>We couldn’t find that page</h1>
        <p className="muted">The link may be old, or the product may have moved.</p>
        <div className="row-gap center">
          <Link className="btn" to="/">Go to the home page</Link>
          <Link className="btn btn-quiet" to="/shop">Browse the shop</Link>
        </div>
      </div>
    </div>
  )
}
