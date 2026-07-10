import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { APP_AUTHOR, APP_GITHUB_URL, APP_LICENSE, APP_NAME } from '@/lib/app'

type AboutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenAcknowledgments: () => void
}

export function AboutDialog({ open, onOpenChange, onOpenAcknowledgments }: AboutDialogProps) {
  const year = new Date().getFullYear()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center gap-4 text-center">
          <div
            aria-hidden
            className="flex size-16 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Logo
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-lg">{APP_NAME}</DialogTitle>
            <DialogDescription>by {APP_AUTHOR}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            A browser-based SVG animator for authoring simple shape animations with keyframes.
            Built as an open source portfolio project.
          </p>

          <a
            href={APP_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            View on GitHub
          </a>

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

          <button
            type="button"
            onClick={onOpenAcknowledgments}
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Open source acknowledgments
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
