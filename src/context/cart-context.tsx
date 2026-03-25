'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'

export interface CartItem {
  id: number
  productId: string   // UUID real del producto en Supabase
  name: string
  price: string
  priceNum: number
  bg: string
  size?: string
  quantity: number
}

interface CartState {
  items: CartItem[]
  open: boolean
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: { id: number; size?: string } }
  | { type: 'UPDATE_QTY'; payload: { id: number; size?: string; qty: number } }
  | { type: 'CLEAR' }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }

function sameItem(
  a: { id: number; size?: string },
  b: { id: number; size?: string },
) {
  return a.id === b.id && a.size === b.size
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((i) => sameItem(i, action.payload))
      const items = existing
        ? state.items.map((i) =>
            sameItem(i, action.payload) ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [...state.items, { ...action.payload, quantity: 1 }]
      return { ...state, items, open: true }
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => !sameItem(i, action.payload)) }
    case 'UPDATE_QTY':
      return {
        ...state,
        items:
          action.payload.qty < 1
            ? state.items.filter((i) => !sameItem(i, action.payload))
            : state.items.map((i) =>
                sameItem(i, action.payload) ? { ...i, quantity: action.payload.qty } : i
              ),
      }
    case 'CLEAR':
      return { ...state, items: [] }
    case 'OPEN':
      return { ...state, open: true }
    case 'CLOSE':
      return { ...state, open: false }
    default:
      return state
  }
}

interface CartContextValue {
  items: CartItem[]
  open: boolean
  totalItems: number
  totalPrice: number
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: number, size?: string) => void
  updateQty: (id: number, size: string | undefined, qty: number) => void
  clear: () => void
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], open: false })

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) =>
    dispatch({ type: 'ADD_ITEM', payload: item }), [])
  const removeItem = useCallback((id: number, size?: string) =>
    dispatch({ type: 'REMOVE_ITEM', payload: { id, size } }), [])
  const updateQty = useCallback((id: number, size: string | undefined, qty: number) =>
    dispatch({ type: 'UPDATE_QTY', payload: { id, size, qty } }), [])
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [])
  const openCart = useCallback(() => dispatch({ type: 'OPEN' }), [])
  const closeCart = useCallback(() => dispatch({ type: 'CLOSE' }), [])

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = state.items.reduce((s, i) => s + i.priceNum * i.quantity, 0)

  return (
    <CartContext.Provider
      value={useMemo(
        () => ({ items: state.items, open: state.open, totalItems, totalPrice, addItem, removeItem, updateQty, clear, openCart, closeCart }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [state.items, state.open, totalItems, totalPrice, addItem, removeItem, updateQty, clear, openCart, closeCart]
      )}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
