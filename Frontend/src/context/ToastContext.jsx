/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const showMessage = useCallback((text) => {
    const id = ++idRef.current
    console.log('Acción: ', text)

    setToasts((prev) => [...prev, { id, text }])

    // Eliminar el mensaje después de 3 segundos
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
      )

      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
      }, 500) // Tiempo que dura la animación de salida
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showMessage }}>
      {children}

      {/* Contenedor para notificaciones */}
      <div id="toast-container" className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`bg-cacao-700 text-white px-6 py-3 rounded-lg shadow-lg font-medium text-sm border-l-4 border-mazorca-400 flex items-center gap-2 ${
              toast.leaving ? 'toast-exit' : 'toast-enter'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}