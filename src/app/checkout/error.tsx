'use client'

export default function CheckoutError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string }
  reset: () => void
}>) {
  return (
    <div className="min-h-screen bg-brand-ivory pt-20 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h2 className="font-heading text-3xl text-brand-deep mb-3">Algo salió mal</h2>
        <p className="text-sm text-brand-muted font-sans mb-6">
          Ocurrió un error en el proceso de pago. Tu tarjeta no fue cobrada.
        </p>
        {error.digest && (
          <p className="text-[10px] text-brand-muted font-sans mb-4 opacity-60">
            Ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="text-xs tracking-[0.12em] uppercase font-sans text-brand-primary underline underline-offset-4 hover:text-brand-deep transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
