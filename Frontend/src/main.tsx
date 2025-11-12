import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Bỏ custom theme và ColorModeScript để tương thích với Chakra v2

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" toastOptions={{ duration: 2500 }} />
    </BrowserRouter>
  </StrictMode>,
)
