import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppLogo } from '@/components/shell/AppLogo'
import { APP_AUTHOR, APP_AUTHOR_URL, APP_GITHUB_URL, APP_LICENSE, APP_NAME, APP_RELEASE_STAGE } from '@/lib/app'

type AboutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenAcknowledgments: () => void
}

function AuthorLink({ className }: { className?: string }) {
  return (
    <a
      href={APP_AUTHOR_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {APP_AUTHOR}
    </a>
  )
}

export function AboutDialog({ open, onOpenChange, onOpenAcknowledgments }: AboutDialogProps) {
  const year = new Date().getFullYear()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-xl border border-border/60 bg-muted/30">
            <AppLogo size={40} variant="accent" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-lg">{APP_NAME}</DialogTitle>
            <span className="inline-flex rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              {APP_RELEASE_STAGE}
            </span>
            <DialogDescription>
              by{' '}
              <AuthorLink className="font-medium text-foreground underline underline-offset-4 hover:text-primary" />
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            A browser-based SVG animator for authoring simple shape animations with keyframes.
            Built as an open source portfolio project.
          </p>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 font-medium text-foreground">{APP_LICENSE} License</p>
            <p>
              Copyright &copy; {year} {APP_AUTHOR}
            </p>
            <p className="mt-2">
              Permission is hereby granted, free of charge, to any person obtaining a copy of this
              software and associated documentation files, to deal in the Software without
              restriction, including without limitation the rights to use, copy, modify, merge,
              publish, distribute, sublicense, and/or sell copies of the Software, subject to the
              conditions in the full license text.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href={APP_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              View on GitHub
            </a>
            <button
              type="button"
              onClick={onOpenAcknowledgments}
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              Open source acknowledgments
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
