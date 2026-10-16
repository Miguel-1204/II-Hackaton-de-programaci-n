import { ToastProvider } from './context/ToastContext'
import Home from './pages/Home'

function App() {
  return (
    <ToastProvider>
      <Home />
    </ToastProvider>
  )
}

export default App
