import { LogoFull } from '@/assets/logo'

/** Console sign-in: the same centered frame as the tenant auth pages. */
export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-stretch px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:items-center sm:justify-center sm:py-12">
      <div className="mx-auto flex w-full max-w-md flex-col space-y-2 sm:w-[440px]">
        <div className="mb-4 flex items-center justify-center text-foreground sm:mb-8">
          <LogoFull className="h-12 w-auto sm:h-16" />
        </div>
        {children}
      </div>
    </div>
  )
}
