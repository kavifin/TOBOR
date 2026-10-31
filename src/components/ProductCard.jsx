import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import Thumb from './Thumb.jsx'
import { money } from '../lib/format.js'
import { useCart } from '../lib/cart.jsx'
import { byId, COLORS } from '../../shared/pricing.js'
import { CATEGORIES } from '../../shared/products.js'

export default function ProductCard({ product }) {
  const { add } = useCart()
  return (
    <article className="product-card">
      <Link to={`/shop/${product.slug}`} className="product-card-link">
        <div className="product-card-media">
          <Thumb product={product} alt={`${product.name}, 3D printed`} />
          {product.tags.includes('bestseller') && <span className="tag">Bestseller</span>}
          {product.tags.includes('new') && <span className="tag tag-new">New</span>}
        </div>
        <div className="product-card-body">
          <p className="product-card-cat">{byId(CATEGORIES, product.category).name}</p>
          <h3>{product.name}</h3>
          <p className="product-card-sum">{product.summary}</p>
        </div>
      </Link>
      <div className="product-card-foot">
        <span className="price">{money(product.price)}</span>
        <span className="swatches" aria-label={`Available in ${product.colors.length} colours`}>
          {product.colors.slice(0, 4).map((c) => <i key={c} className="dot" style={{ background: byId(COLORS, c).hex }} />)}
        </span>
        <button className="icon-btn add-btn" onClick={() => add({ kind: 'product', productId: product.id, color: product.color, qty: 1 })} aria-label={`Add ${product.name} to cart`}>
          <ShoppingBag size={18} aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}
