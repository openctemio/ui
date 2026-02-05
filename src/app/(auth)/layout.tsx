import { Logo } from '@/assets/logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Exploop'

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="container grid h-svh max-w-none items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-2 px-4 py-6 sm:w-[480px] sm:px-8 sm:py-8">
        <div className="mb-4 flex items-center justify-center">
          <Logo className="me-2" />
          <h1 className="text-xl font-medium">{appName}</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
