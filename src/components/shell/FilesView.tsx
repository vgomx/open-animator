import { useEffect, useMemo, useState } from 'react'

import { AlertCircle, Download, FilePlus, FolderOpen, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { createDefaultProject } from '@/editor/scene'
import type { Project } from '@/editor/types'
import { downloadProject, openProjectFile } from '@/io/project'
import {
  formatRecentFileDate,
  getRecentFiles,
  loadRecentFileProject,
  removeRecentFile,
  type RecentFileEntry,
} from '@/io/recent-files'
import { cn } from '@/lib/utils'

type FilesViewProps = {
  activeRecentFileId: string | null
  onOpenProject: (project: Project, recentFileId: string) => void
  onStartNewProject: () => void
}

function RecentFileRow({
  entry,
  active,
  onOpen,
  onDownload,
  onRemove,
}: {
  entry: RecentFileEntry
  active: boolean
  onOpen: () => void
  onDownload: () => void
  onRemove: () => void
}) {
  const disabled = !entry.cached

  return (
    <li
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors',
        active ? 'border-primary/40 bg-accent/40' : 'border-border bg-muted/20',
        disabled && 'opacity-70',
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        className={cn(
          'min-w-0 flex-1 text-left outline-none',
          !disabled && 'focus-visible:ring-2 focus-visible:ring-ring/70',
          disabled && 'cursor-not-allowed',
        )}
      >
        <p className="truncate font-medium text-foreground">{entry.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {entry.layerCount} layer{entry.layerCount === 1 ? '' : 's'} · {entry.duration}s ·{' '}
          {formatRecentFileDate(entry.updatedAt)}
          {disabled ? ' · not cached' : ''}
        </p>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        {entry.cached ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Download ${entry.name}`}
            onClick={onDownload}
          >
            <Download />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`Remove ${entry.name}`}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}

export function FilesView({
  activeRecentFileId,
  onOpenProject,
  onStartNewProject,
}: FilesViewProps) {
  const [recentFiles, setRecentFiles] = useState<RecentFileEntry[]>(() => getRecentFiles())

  const refreshRecentFiles = () => {
    setRecentFiles(getRecentFiles())
  }

  useEffect(() => {
    refreshRecentFiles()
  }, [])

  const sortedFiles = useMemo(
    () => [...recentFiles].sort((left, right) => right.updatedAt - left.updatedAt),
    [recentFiles],
  )

  const handleOpenRecent = (entry: RecentFileEntry) => {
    const project = loadRecentFileProject(entry.id)
    if (!project) {
      return
    }

    onOpenProject(project, entry.id)
  }

  const handleOpenFromDisk = async () => {
    const project = await openProjectFile()
    if (!project) {
      return
    }

    onOpenProject(project, '')
  }

  return (
    <div className="editor-shell__files flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto w-full max-w-xl space-y-6">
          <header className="space-y-1">
            <h1 className="text-lg font-semibold text-foreground">Files</h1>
            <p className="text-sm text-muted-foreground">
              Open a recent project or start a new document.
            </p>
          </header>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onStartNewProject}
            >
              <FilePlus />
              New project
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleOpenFromDisk()}>
              <FolderOpen />
              Open from computer
            </Button>
          </div>

          <div className="space-y-2">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recent files
            </h2>

            {sortedFiles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                No recent files yet. Create a project and it will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {sortedFiles.map((entry) => (
                  <RecentFileRow
                    key={entry.id}
                    entry={entry}
                    active={entry.id === activeRecentFileId}
                    onOpen={() => handleOpenRecent(entry)}
                    onDownload={() =>
                      downloadProject(
                        loadRecentFileProject(entry.id) ?? createDefaultProject(),
                        `${entry.name.replace(/[^\w.-]+/g, '-').toLowerCase() || 'open-animator-project'}.json`,
                      )
                    }
                    onRemove={() => {
                      removeRecentFile(entry.id)
                      refreshRecentFiles()
                    }}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <p>
              Files are stored in your browser&apos;s local storage and may be cleared by the
              browser or when storage is full. For safety, we recommend keeping a local copy of
              your projects using Save project JSON.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
