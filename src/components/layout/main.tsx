/**
 * Main Content Wrapper Component
 *
 * Generic main content container with flexible layout options
 * - Supports fixed and fluid layouts
 * - Handles overflow and flex-grow
 * - Can be used across different routes
 *
 * A page has exactly one `main` landmark. Layouts that already render it
 * (the dashboard shell, through <MainRegion>) tell <Main> so through context,
 * and <Main> then renders a plain <div>. Outside such a layout (auth pages,
 * the admin console, onboarding) <Main> is the landmark itself.
 */

'use client'

import { createContext, forwardRef, useContext, type HTMLAttributes, type Ref } from 'react'
import { cn } from '@/lib/utils'

const InsideMainLandmark = createContext(false)

interface MainProps extends HTMLAttributes<HTMLElement> {
  /**
   * Whether the main content should have fixed height
   * @default false
   */
  fixed?: boolean

  /**
   * Whether to use full width (no max-width constraint)
   * @default false
   */
  fluid?: boolean
}

export const Main = forwardRef<HTMLElement, MainProps>(
  ({ fixed, className, fluid, ...props }, ref) => {
    const nested = useContext(InsideMainLandmark)
    const Tag = nested ? 'div' : 'main'
    const content = (
      <Tag
        ref={ref as Ref<HTMLDivElement>}
        data-layout={fixed ? 'fixed' : 'auto'}
        className={cn(
          // overflow-x: clip, not hidden — hidden forces overflow-y to auto,
          // which made <Main> a (never-scrolling) scroll container and broke
          // position: sticky for everything inside a page.
          'px-4 py-6 overflow-x-clip sm:px-6 lg:px-8',
          fixed && 'flex flex-col flex-grow overflow-hidden',
          !fluid && 'w-full mx-auto',
          className
        )}
        {...props}
      />
    )
    // A <Main> that is the landmark makes everything inside it "nested".
    return nested ? (
      content
    ) : (
      <InsideMainLandmark.Provider value={true}>{content}</InsideMainLandmark.Provider>
    )
  }
)

Main.displayName = 'Main'

/**
 * The layout-level `main` landmark and skip-link target (`#content`).
 * Every <Main> rendered inside it is a plain container.
 */
export const MainRegion = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ id = 'content', ...props }, ref) => (
    <InsideMainLandmark.Provider value={true}>
      <main ref={ref} id={id} {...props} />
    </InsideMainLandmark.Provider>
  )
)

MainRegion.displayName = 'MainRegion'
