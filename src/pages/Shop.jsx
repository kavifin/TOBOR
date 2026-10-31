import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import ProductCard from '../components/ProductCard.jsx'
import { PRODUCTS, CATEGORIES } from '../../shared/products.js'

const SORTS = [
  { id: 'popular', name: 'Most popular' },
  { id: 'price-asc', name: 'Price, low to high' },
  { id: 'price-desc', name: 'Price, high to low' },
  { id: 'new', name: 'Newest' },
]

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const cat = params.get('cat') ?? 'all'
  const sort = params.get('sort') ?? 'popular'
  const q = params.get('q') ?? ''
  const update = (k, v) => {
    const next = new URLSearchParams(params)
    if (!v || v === 'all' || (k === 'sort' && v === 'popular')) next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true })
  }

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    let l = PRODUCTS.filter((p) => (cat === 'all' || p.category === cat) && (!term || `${p.name} ${p.summary}`.toLowerCase().includes(term)))
    const rank = (p) => (p.tags.includes('bestseller') ? 0 : p.tags.includes('new') ? 1 : 2)
    if (sort === 'price-asc') l = [...l].sort((a, b) => a.price - b.price)
    else if (sort === 'price-desc') l = [...l].sort((a, b) => b.price - a.price)
    else if (sort === 'new') l = [...l].sort((a, b) => (b.tags.includes('new') ? 1 : 0) - (a.tags.includes('new') ? 1 : 0))
    else l = [...l].sort((a, b) => rank(a) - rank(b))
    return l
  }, [cat, sort, q])

  return (
    <div className="page shop-page">
      <div className="container">
        <header className="page-head">
          <h1>Shop</h1>
          <p>Ready-made 3D printed products, printed to order in the colour you choose. Every product has a live 3D preview.</p>
        </header>

        <div className="shop-bar">
          <div className="chips" role="group" aria-label="Filter by category">
            {[{ id: 'all', name: 'Everything' }, ...CATEGORIES].map((c) => (
              <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => update('cat', c.id)}>{c.name}</button>
            ))}
          </div>
          <div className="shop-tools">
            <label className="search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search products</span>
              <input type="search" placeholder="Search products" value={q} onChange={(e) => update('q', e.target.value)} />
            </label>
            <label className="sort">
              <span className="sr-only">Sort by</span>
              <select value={sort} onChange={(e) => update('sort', e.target.value)}>
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>
        </div>

        <p className="muted small" aria-live="polite">{list.length} {list.length === 1 ? 'product' : 'products'}</p>
        {list.length ? (
          <div className="product-grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        ) : (
          <div className="empty">
            <p><strong>No products match “{q}”.</strong></p>
            <p className="muted">Try another word, or send us a photo and we’ll print exactly what you need.</p>
            <button className="btn btn-quiet" onClick={() => setParams({})}>Clear search</button>
          </div>
        )}
      </div>
    </div>
  )
}
