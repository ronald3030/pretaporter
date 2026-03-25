export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-brand-ivory pt-20">
      <div className="py-10 px-4">
        <div className="max-w-lg mx-auto flex flex-col gap-4 animate-pulse">
          {/* Title */}
          <div className="h-10 bg-brand-border rounded-sm w-48 mx-auto mb-2" />

          {/* Card 1 */}
          <div className="bg-white rounded-sm border border-brand-border p-6 flex flex-col gap-3">
            <div className="h-3 bg-brand-border rounded w-32" />
            <div className="h-11 bg-brand-border/50 rounded-sm" />
            <div className="h-11 bg-brand-border/50 rounded-sm" />
          </div>

          {/* Card 2 - Map */}
          <div className="bg-white rounded-sm border border-brand-border p-6">
            <div className="h-6 bg-brand-border rounded w-56 mb-4" />
            <div className="h-64 bg-brand-border/50 rounded-sm mb-3" />
            <div className="h-11 bg-brand-border/50 rounded-sm" />
          </div>

          {/* Card 3 - Dates */}
          <div className="bg-white rounded-sm border border-brand-border p-6">
            <div className="h-3 bg-brand-border rounded w-32 mb-4" />
            <div className="flex gap-2">
              {(['d0','d1','d2','d3','d4']).map((key) => (
                <div key={key} className="flex-1 h-16 bg-brand-border/50 rounded-sm" />
              ))}
            </div>
          </div>

          {/* Card 4 - Payment */}
          <div className="bg-white rounded-sm border border-brand-border p-6">
            <div className="h-8 bg-brand-border/50 rounded w-40 ml-auto mb-6" />
            <div className="h-12 bg-brand-border/50 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  )
}
