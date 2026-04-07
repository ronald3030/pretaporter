'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'

export interface WishlistItem {
  id: number
  productId: string
  name: string
  price: string
  priceNum: number
  bg: string
  image?: string
}

interface WishlistState {
  items: WishlistItem[]
  open: boolean
}

type WishlistAction =
  | { type: 'TOGGLE'; payload: WishlistItem }
  | { type: 'REMOVE'; payload: number }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }

function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case 'TOGGLE': {
      const exists = state.items.some((i) => i.id === action.payload.id)
      return {
        ...state,
        items: exists
          ? state.items.filter((i) => i.id !== action.payload.id)
          : [...state.items, action.payload],
      }
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => i.id !== action.payload) }
    case 'OPEN':
      return { ...state, open: true }
    case 'CLOSE':
      return { ...state, open: false }
    default:
      return state
  }
}

interface WishlistContextValue {
  items: WishlistItem[]
  open: boolean
  total: number
  isWishlisted: (id: number) => boolean
  toggle: (item: WishlistItem) => void
  remove: (id: number) => void
  openWishlist: () => void
  closeWishlist: () => void
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wishlistReducer, { items: [], open: false })

  const toggle = useCallback((item: WishlistItem) =>
    dispatch({ type: 'TOGGLE', payload: item }), [])
  const remove = useCallback((id: number) =>
    dispatch({ type: 'REMOVE', payload: id }), [])
  const openWishlist = useCallback(() => dispatch({ type: 'OPEN' }), [])
  const closeWishlist = useCallback(() => dispatch({ type: 'CLOSE' }), [])
  const isWishlisted = useCallback((id: number) =>
    state.items.some((i) => i.id === id), [state.items])

  return (
    <WishlistContext.Provider
      value={useMemo(
        () => ({ items: state.items, open: state.open, total: state.items.length, isWishlisted, toggle, remove, openWishlist, closeWishlist }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [state.items, state.open, isWishlisted, toggle, remove, openWishlist, closeWishlist]
      )}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
