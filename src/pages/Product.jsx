import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Ruler, Clock, Package, Truck, ShoppingBag } from 'lucide-react'
import Viewer from '../three/Viewer.jsx'
import { buildShape } from '../three/shapes.js'
import QtyStepper from '../components/QtyStepper.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { WhatsAppIcon } from '../components/Icons.jsx'
import { productBySlug, PRODUCTS, CATEGORIES } from '../../shared/products.js'
import { byId, COLORS, MATERIALS } from '../../shared/pricing.js'
import { useCart } from '../lib/cart.jsx'
import { money } from '../lib/format.js'
import { waLink } from '../lib/config.js'
import NotFound from './NotFound.jsx'

export default function Product() {
  const { slug } = useParams()
  const product = productBySlug(slug)
  const [color, setColor] = useState(product?.color)
  const [qty, setQty] = useState(1)
  const { add } = useCart()
  const navigate = useNavigate()
  const hex = byId(COLORS, color ?? product?.color)?.hex
  const object = useMemo(() => product && buildShape(product.shape, byId(COLORS, product.color).hex), [product])
  useEffect(() => {
    document.title = product ? `${product.name} — TOBOR` : 'Not found — TOBOR'
    setColor(product?.color)
    setQty(1)
  }, [product])

  if (!product) return <NotFound />
  const activeColor = product.colors.includes(color) ? color : product.color
  const line = { kind: 'product', productId: product.id, color: activeColor, qty }
  const related = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3)

  return (
    <div className="page product-page">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/shop"><ChevronLeft size={16} aria-hidden="true" /> Shop</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/shop?cat=${product.category}`}>{byId(CATEGORIES, product.category).name}</Link>
        </nav>

        <div className="product-layout">
          <div className="product-stage">
            <Viewer object={object} color={hex} label={`3D model of the ${product.name} in ${byId(COLORS, activeColor).name}`} />
            <p className="stage-hint muted small">Drag to turn it around. This is the actual model we print.</p>
          </div>

          <div className="product-info">
            <h1>{product.name}</h1>
            <p className="product-price">{money(product.price)}</p>
            <p className="product-summary">{product.summary}</p>

            <div className="field">
              <span className="label" id="pc-label">Colour: {byId(COLORS, activeColor).name}</span>
              <div className="swatch-row" role="radiogroup" aria-labelledby="pc-label">
                {product.colors.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={activeColor === c} aria-label={byId(COLORS, c).name} className="swatch swatch-lg" style={{ '--c': byId(COLORS, c).hex }} onClick={() => setColor(c)} />
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label">Quantity</span>
              <QtyStepper value={qty} onChange={setQty} label={`Quantity of ${product.name}`} />
            </div>

            <div className="buy-row">
              <button className="btn btn-quiet" onClick={() => add(line)}><ShoppingBag size={18} aria-hidden="true" /> Add to cart</button>
              <button className="btn btn-hot" onClick={() => { add(line, { open: false }); navigate('/checkout') }}>Buy now</button>
            </div>
            <a className="wa-ask" href={waLink(`Hi TOBOR, I have a question about the ${product.name}.`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18} /> Ask about this product on WhatsApp</a>

            <dl className="spec-list">
              <div><dt><Ruler size={16} aria-hidden="true" /> Size</dt><dd>{product.size}</dd></div>
              <div><dt><Package size={16} aria-hidden="true" /> Material</dt><dd>{byId(MATERIALS, product.material).name}</dd></div>
              <div><dt><Clock size={16} aria-hidden="true" /> Print time</dt><dd>About {product.printHours} hours</dd></div>
              <div><dt><Truck size={16} aria-hidden="true" /> Delivery</dt><dd>Ships in 2–4 working days. Free over ₹999.</dd></div>
            </dl>
            <p className="product-desc">{product.description}</p>
          </div>
        </div>

        {related.length > 0 && (
          <section className="related" aria-labelledby="rel-title">
            <h2 id="rel-title">More from {byId(CATEGORIES, product.category).name.toLowerCase()}</h2>
            <div className="product-grid">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </section>
        )}
      </div>
    </div>
  )
}
