import { Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'

type DocumentTabBarProps = {
  className?: string
}

export function DocumentTabBar({ className }: DocumentTabBarProps) {
  const documentTabs = useEditorStore((state) => state.documentTabs)
  const activeDocumentTabId = useEditorStore((state) => state.activeDocumentTabId)
  const switchDocumentTab = useEditorStore((state) => state.switchDocumentTab)
  const closeDocumentTab = useEditorStore((state) => state.closeDocumentTab)
  const addDocumentTab = useEditorStore((state) => state.addDocumentTab)

  return (
    <div
      className={cn(
        'editor-shell__tabs flex h-7 shrink-0 items-stretch gap-0 overflow-x-auto border-b border-border bg-card/80 pr-1 pl-0',
        className,
      )}
    >
      {documentTabs.map((tab) => {
        const active = tab.id === activeDocumentTabId

        return (
          <div
            key={tab.id}
            className={cn(
              'group relative flex min-w-0 max-w-[11rem] shrink-0 items-stretch',
              active && 'z-10',
            )}
          >
            <button
              type="button"
              onClick={() => switchDocumentTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-1 items-center border border-b-0 py-0.5 text-left text-[10px] transition-colors outline-none',
                documentTabs.length > 1 ? 'pl-2 pr-6' : 'px-2',
                active
                  ? 'border-border bg-background text-foreground'
                  : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                'focus-visible:ring-2 focus-visible:ring-ring/70',
              )}
            >
              <span className="truncate font-medium leading-none">{tab.name}</span>
            </button>

            {documentTabs.length > 1 ? (
              <button
                type="button"
                aria-label={`Close ${tab.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  closeDocumentTab(tab.id)
                }}
                className={cn(
                  'absolute top-1/2 right-0.5 flex size-4 -translate-y-1/2 items-center justify-center text-muted-foreground opacity-0 transition-opacity outline-none group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/70',
                  active && 'opacity-100',
                )}
              >
                <X className="size-2.5" />
              </button>
            ) : null}
          </div>
        )
      })}

      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="size-6"
          aria-label="New document tab"
          onClick={addDocumentTab}
        >
          <Plus className="size-3" />
        </Button>
      </div>
    </div>
  )
}
