'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'

const WA_URL = 'https://wa.me/18091234567?text=' + encodeURIComponent('Hola, me interesa saber más sobre sus piezas 🌸')

export function WhatsAppFloat() {
  const [visible, setVisible] = useState(false)
  const [tooltip, setTooltip] = useState(false)

  // Appear after 2 s so it doesn't distract on first load
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 2000)
    // Auto-show tooltip briefly on all devices (especially useful on mobile where hover doesn't fire)
    const t2 = setTimeout(() => setTooltip(true), 3000)
    const t3 = setTimeout(() => setTooltip(false), 7000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-2">
          {/* Tooltip bubble */}
          <AnimatePresence>
            {tooltip && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="bg-white rounded-2xl shadow-lg shadow-brand-deep/10 px-4 py-3 mr-1 max-w-[200px] border border-brand-border"
              >
                <button
                  onClick={() => setTooltip(false)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-brand-muted/20 rounded-full flex items-center justify-center hover:bg-brand-muted/40 transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={10} className="text-brand-deep" />
                </button>
                <p className="text-[12px] font-heading text-brand-deep leading-snug">
                  ¿Necesitas ayuda?
                </p>
                <p className="text-[11px] text-brand-muted font-sans mt-0.5">
                  Escríbenos por WhatsApp
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.05 }}
            className="relative"
          >
            {/* Pulse ring */}
            <motion.span
              className="absolute inset-0 rounded-full bg-brand-primary/25 pointer-events-none"
              animate={{ scale: [1, 1.55], opacity: [0.5, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contactar por WhatsApp"
              onMouseEnter={() => setTooltip(true)}
              onMouseLeave={() => setTooltip(false)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="relative w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center shadow-xl shadow-brand-primary/35 text-white"
            >
              <MessageCircle size={24} strokeWidth={1.8} />
            </motion.a>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
