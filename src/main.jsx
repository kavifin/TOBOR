import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { CartProvider } from './lib/cart.jsx'
import './styles/tokens.css'
import './styles/base.css'
import './styles/story.css'
import './styles/sections.css'
import './styles/shelf.css'
import './styles/pages.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <CartProvider>
      <App />
    </CartProvider>
  </BrowserRouter>,
)
