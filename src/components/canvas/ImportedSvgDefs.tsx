import { memo } from 'react'

import type {
  ImportedLinearGradient,
  ImportedRadialGradient,
  ImportedSvgDefs as ImportedSvgDefsType,
} from '@/editor/types'
import { importedGradientId } from '@/io/svg-gradients'
import { importedClipPathId } from '@/io/svg-clippaths'
import { importedMaskId } from '@/io/svg-masks'

type ImportedSvgDefsProps = {
  defs?: ImportedSvgDefsType
}

export const ImportedSvgDefs = memo(function ImportedSvgDefs({ defs }: ImportedSvgDefsProps) {
  const gradients = defs?.gradients ?? {}
  const masks = defs?.masks ?? {}
  const clipPaths = defs?.clipPaths ?? {}
  const hasGradients = Object.keys(gradients).length > 0
  const hasMasks = Object.keys(masks).length > 0
  const hasClipPaths = Object.keys(clipPaths).length > 0

  if (!hasGradients && !hasMasks && !hasClipPaths) {
    return null
  }

  return (
    <defs>
      {Object.values(gradients).map((gradient) => {
        if (gradient.kind === 'linear') {
          const linear = gradient as ImportedLinearGradient
          return (
            <linearGradient
              key={linear.id}
              id={importedGradientId(linear.id)}
              gradientUnits="userSpaceOnUse"
              x1={linear.x1}
              y1={linear.y1}
              x2={linear.x2}
              y2={linear.y2}
            >
              {linear.stops.map((stop, index) => (
                <stop key={`${linear.id}-${index}`} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
          )
        }

        const radial = gradient as ImportedRadialGradient
        return (
          <radialGradient
            key={radial.id}
            id={importedGradientId(radial.id)}
            gradientUnits="userSpaceOnUse"
            cx={radial.cx}
            cy={radial.cy}
            r={radial.r}
          >
            {radial.stops.map((stop, index) => (
              <stop key={`${radial.id}-${index}`} offset={stop.offset} stopColor={stop.color} />
            ))}
          </radialGradient>
        )
      })}
      {Object.values(masks).map((mask) => (
        <mask
          key={mask.id}
          id={importedMaskId(mask.id)}
          maskUnits="userSpaceOnUse"
          style={{ maskType: 'alpha' }}
        >
          <g dangerouslySetInnerHTML={{ __html: mask.markup }} />
        </mask>
      ))}
      {Object.values(clipPaths).map((clipPath) => (
        <clipPath
          key={clipPath.id}
          id={importedClipPathId(clipPath.id)}
          clipPathUnits="userSpaceOnUse"
        >
          <g dangerouslySetInnerHTML={{ __html: clipPath.markup }} />
        </clipPath>
      ))}
    </defs>
  )
})
