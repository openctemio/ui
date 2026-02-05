import { SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSearch } from '@/context/search-provider'
import { Button } from './ui/button'

type SearchProps = {
  className?: string
  type?: React.HTMLInputTypeAttribute
  placeholder?: string
}

export function Search({
  className = '',
  placeholder = 'Search',
}: SearchProps) {
  const { setOpen } = useSearch()
  return (
    <Button
      variant='outline'
      className={cn(
        'bg-muted/25 group text-muted-foreground hover:bg-accent relative h-8 rounded-md text-sm font-normal shadow-none',
        // Mobile: icon only
        'w-8 justify-center p-0',
        // Small screens and up: show full search bar
        'sm:w-40 sm:justify-start sm:px-3 sm:pe-12',
        'md:flex-none lg:w-52 xl:w-64',
        className
      )}
      onClick={() => setOpen(true)}
    >
      <SearchIcon
        aria-hidden='true'
        className='sm:absolute sm:start-1.5 sm:top-1/2 sm:-translate-y-1/2'
        size={16}
      />
      <span className='ms-4 hidden truncate sm:inline'>{placeholder}</span>
      <kbd className='bg-muted group-hover:bg-accent pointer-events-none absolute end-[0.3rem] top-[0.3rem] hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex'>
        <span className='text-xs'>⌘</span>K
      </kbd>
    </Button>
  )
}
