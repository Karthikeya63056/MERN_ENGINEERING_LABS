import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import Navbar from '../components/Navbar'
import ProductCard from '../components/ProductCard'

function ProductDetails() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      setErr('')
      setRelated([])
      try {
        const response = await api.get(`/products/${id}`)
        setProduct(response.data.product)
      } catch (error) {
        console.log(error)
        if (error.response?.status === 404) {
          setErr('Product not found.')
        } else {
          setErr('Something went wrong while loading products.')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id])

  // Same aisle, minus this one — the classic "pairs well with" shelf.
  useEffect(() => {
    if (!product) return
    let live = true
    api.get('/products', { params: { category: product.category } })
      .then((res) => {
        if (!live) return
        setRelated((res.data.products || []).filter((p) => p._id !== product._id).slice(0, 4))
      })
      .catch(() => {})
    return () => { live = false }
  }, [product])

  return (
    <div>
      <Navbar />
      <main className="shop">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/products">Shelves</Link>
          <span aria-hidden="true">/</span>
          {product && !err
            ? <span>{product.name}</span>
            : <span>Details</span>}
        </nav>

        {loading && <p className="loading">Loading products...</p>}

        {!loading && err && <p className="error">{err}</p>}

        {!loading && !err && product && (
          <div className="details">
            <img src={product.image} alt={product.name} className="details-image" />
            <div className="details-body">
              <p className="eyebrow left">{product.category} · In-store now</p>
              <h1 className="details-name">{product.name}</h1>
              <div className="details-rating">Rated 4.6 by shoppers · 2,000+ bought this month</div>
              <p className="details-price">₹{product.price.toLocaleString('en-IN')}</p>
              <p className="details-desc">{product.description}</p>
              <p className={product.stock === 0 ? 'product-stock empty' : 'product-stock'}>
                <span className="stock-dot" aria-hidden="true" />
                {product.stock === 0 ? 'Currently unavailable' : `${product.stock} units left in stock — order soon`}
              </p>
              {product.stock > 0 && (
                <div className="stock-meter" aria-hidden="true">
                  <div
                    className={product.stock <= 5 ? 'stock-fill low' : 'stock-fill'}
                    style={{ width: `${Math.min(100, Math.max(6, (product.stock / 30) * 100))}%` }}
                  />
                </div>
              )}
              <button type="button" className="btn btn-primary details-cta" disabled={product.stock === 0}>
                Add to Cart
              </button>
              <p className="assurance left">Free delivery over ₹999 · Easy 7-day returns</p>
            </div>
          </div>
        )}

        {!loading && !err && related.length > 0 && (
          <section className="related">
            <div className="related-head">
              <h2>Pairs well with</h2>
              <Link to="/products" className="switch-link">View all →</Link>
            </div>
            <div className="product-grid">
              {related.map((p, i) => (
                <ProductCard key={p._id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default ProductDetails
