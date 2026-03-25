'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

// Instagram SVG icon (lucide Instagram is deprecated)
function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

const POSTS = [
  {
    id: 'DLnrXz3PW32',
    embedSrc: 'https://www.instagram.com/reel/DLnrXz3PW32/embed/',
    permalink: 'https://www.instagram.com/pretaporter_rd/reel/DLnrXz3PW32/',
  },
  {
    id: 'DOuhaC5DCYW',
    embedSrc: 'https://www.instagram.com/p/DOuhaC5DCYW/embed/',
    permalink: 'https://www.instagram.com/pretaporter_rd/p/DOuhaC5DCYW/',
  },
  {
    id: 'DPbsczYAMGK',
    embedSrc: 'https://www.instagram.com/p/DPbsczYAMGK/embed/',
    permalink: 'https://www.instagram.com/pretaporter_rd/p/DPbsczYAMGK/',
  },
  {
    id: 'DWMQQ6vAJ3q',
    embedSrc: 'https://www.instagram.com/reel/DWMQQ6vAJ3q/embed/',
    permalink: 'https://www.instagram.com/pretaporter_rd/reel/DWMQQ6vAJ3q/',
  },
  {
    id: 'DWIDqKxkQ22',
    embedSrc: 'https://www.instagram.com/reel/DWIDqKxkQ22/embed/',
    permalink: 'https://www.instagram.com/pretaporter_rd/reel/DWIDqKxkQ22/',
  },
  {
    id: 'DWFUKKTkbBu',
    embedSrc: 'https://www.instagram.com/reel/DWFUKKTkbBu/embed/',
    permalink: 'https://www.instagram.com/pretaporter_rd/reel/DWFUKKTkbBu/',
  },
]

export function InstagramGrid() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <>
      <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {POSTS.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: i * 0.12 }}
            className="flex justify-center"
          >
            <iframe
              src={post.embedSrc}
              width="400"
              height="540"
              frameBorder="0"
              scrolling="no"
              loading="lazy"
              title={`Publicación de Instagram ${post.id}`}
              className="w-full max-w-[400px] rounded-sm"
            />
          </motion.div>
        ))}
      </div>

      {/* Follow CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-center"
      >
        <a
          href="https://www.instagram.com/pretaporter_rd/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 px-8 py-3.5 border border-brand-deep text-brand-deep text-sm tracking-[0.1em] uppercase font-sans hover:bg-brand-deep hover:text-brand-ivory transition-colors duration-300 rounded-sm"
        >
          <InstagramIcon size={16} />
          Seguir en Instagram
        </a>
      </motion.div>
    </>
  )
}
