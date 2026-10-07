import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/inter/wght.css'
import './index.css'
import App from './App'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './components/Toast'
import './lib/zodTr'
import { applySavedTextSize } from './lib/textSize'
import { applySavedUiMode } from './lib/uiMode'
import { errorMessage, isTransientError, LOAD_ERROR_EVENT } from './api/client'
import { ServerStatusBanner } from './components/ServerStatus'

applySavedTextSize()
applySavedUiMode()

const queryClient = new QueryClient({
  // Kalıcı yükleme hataları ekranın üstündeki şeritte gösterilir; geçici hatalarda "sunucu açılıyor" şeridi görünür.
  queryCache: new QueryCache({
    onError: (err, query) => {
      // Öneri listeleri gibi "sessiz" sorgular hata şeridi göstermez (alan onlarsız da çalışır).
      if (query.meta?.silent) return
      if (!isTransientError(err)) window.dispatchEvent(new CustomEvent(LOAD_ERROR_EVENT, { detail: errorMessage(err) }))
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      // Ücretsiz sunucu uykudan yaklaşık yarım dakikada uyanır: geçici hatalarda ~1 dakika boyunca artan aralıklarla tekrar dene.
      retry: (count, err) => (isTransientError(err) ? count < 8 : count < 1),
      retryDelay: (count) => Math.min(1000 * 2 ** count, 10_000),
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <ServerStatusBanner />
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

// Paneli telefona uygulama gibi kurabilmek için (önbellek tutmayan) service worker.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => undefined) })
}
