import { useState, type ReactNode } from 'react'

import { Plus } from 'lucide-react'

import { WelcomeHero } from '@/components/shell/WelcomeHero'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { APP_AUTHOR, APP_LICENSE, APP_NAME } from '@/lib/app'
import { cn } from '@/lib/utils'

export type WelcomeDismissAction = 'new' | 'resume'

type WelcomeDialogProps = {
  open: boolean
  resumeDocumentName: string
  onDismiss: (action: WelcomeDismissAction, dontShowAgain: boolean) => void
  onOpenAbout: () => void
}

type WelcomeEntryBlockProps = {
  title: string
  description: string
  onClick: () => void
  children: ReactNode
}

function WelcomeShellChrome({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-border shadow-sm">
      <div className="flex h-5 items-center gap-1 border-b border-border/60 bg-card px-2">
        <span className="h-1.5 w-10 rounded-full bg-muted" />
        <span className="h-1.5 w-4 rounded-full bg-muted/70" />
        <span className="h-1.5 w-4 rounded-full bg-muted/50" />
      </div>

      <div className="canvas-backdrop relative p-3">
        <div className="relative aspect-[5/3]">{children}</div>
      </div>

      <div className="h-4 border-t border-border/60 bg-card/90">
        <div className="mx-2 mt-1 h-1 rounded-full bg-muted/80" />
      </div>
    </div>
  )
}

function WelcomeEntryBlock({ title, description, onClick, children }: WelcomeEntryBlockProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col gap-2 rounded-lg text-left outline-none transition-transform',
        'focus-visible:ring-2 focus-visible:ring-ring/70',
        'hover:-translate-y-0.5',
      )}
    >
      <div
        className={cn(
          'transition-shadow',
          'group-hover:shadow-md group-focus-visible:shadow-md',
          'group-hover:ring-2 group-hover:ring-primary/20 group-focus-visible:ring-2 group-focus-visible:ring-primary/25',
          'rounded-md',
        )}
      >
        <WelcomeShellChrome>{children}</WelcomeShellChrome>
      </div>

      <div className="px-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}

function ResumeArtboardPreview() {
  return (
    <div className="artboard-surface absolute inset-0 overflow-hidden rounded-sm border border-border/70 shadow-sm">
      <div
        className="absolute top-[28%] left-[18%] h-[34%] w-[42%] rounded-sm"
        style={{ backgroundColor: 'var(--primary)' }}
      />
      <div
        className="absolute top-[22%] right-[16%] h-[28%] w-[28%] rounded-full"
        style={{ backgroundColor: '#E07A55' }}
      />
      <svg
        className="absolute inset-0 size-full text-primary/80"
        viewBox="0 0 100 60"
        fill="none"
        aria-hidden
      >
        <path
          d="M 18 42 C 18 28, 30 18, 52 18"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="18" cy="42" r="3" fill="currentColor" />
        <circle cx="52" cy="18" r="3" fill="currentColor" />
      </svg>
    </div>
  )
}

function NewArtboardPreview() {
  return (
    <div className="artboard-surface absolute inset-0 flex items-center justify-center rounded-sm border border-dashed border-border/80">
      <div className="flex size-10 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground shadow-sm">
        <Plus className="size-5" strokeWidth={2} />
      </div>
    </div>
  )
}

export function WelcomeDialog({
  open,
  resumeDocumentName,
  onDismiss,
  onOpenAbout,
}: WelcomeDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const year = new Date().getFullYear()

  const dismiss = (action: WelcomeDismissAction) => {
    onDismiss(action, dontShowAgain)
    setDontShowAgain(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          dismiss('resume')
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <div className="border-b border-border/60 bg-muted/20">
          <WelcomeHero />
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-1">
            <DialogTitle>Welcome to {APP_NAME}</DialogTitle>
            <DialogDescription>
              Start a new animation or pick up where you left off.
            </DialogDescription>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <WelcomeEntryBlock
              title="Resume"
              description={resumeDocumentName}
              onClick={() => dismiss('resume')}
            >
              <ResumeArtboardPreview />
            </WelcomeEntryBlock>

            <WelcomeEntryBlock
              title="New document"
              description="Blank artboard"
              onClick={() => dismiss('new')}
            >
              <NewArtboardPreview />
            </WelcomeEntryBlock>
          </div>

          <label
            htmlFor="welcome-skip"
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground',
            )}
          >
            <input
              id="welcome-skip"
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              className="size-3.5 shrink-0 accent-primary"
            />
            <Label htmlFor="welcome-skip" className="cursor-pointer font-normal">
              Don&apos;t show this again
            </Label>
          </label>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            &copy; {year} {APP_AUTHOR}. {APP_LICENSE} License.{' '}
            <button
              type="button"
              onClick={onOpenAbout}
              className="font-medium text-foreground underline underline-offset-2 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              About
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
