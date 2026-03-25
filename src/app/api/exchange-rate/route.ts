import { NextResponse } from 'next/server'

const FALLBACK_DOP_PER_USD = 60.5

export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 }, // cache 1 hour
    })
    if (!res.ok) throw new Error('Exchange rate fetch failed')

    const data = (await res.json()) as { rates?: Record<string, number> }
    const dopPerUsd = data.rates?.['DOP']

    if (!dopPerUsd || dopPerUsd <= 0) throw new Error('DOP rate missing')

    return NextResponse.json({ dopPerUsd })
  } catch {
    // Return fallback silently — pricing will still work
    return NextResponse.json({ dopPerUsd: FALLBACK_DOP_PER_USD })
  }
}
