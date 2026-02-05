import { Loader2 } from 'lucide-react'

export default function GlobalLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  )
}
