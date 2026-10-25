import type { CoverLayout } from '../../types/marketplace'
import type { ServiceCover } from '../../types/provider'

/** Unsaved cover changes for the service being edited: a new image, a new position, or removal. */
export type CoverDraft = { file: File | null; previewUrl: string | null; layout: CoverLayout; remove: boolean }

export const coverDraftFor = (cover: ServiceCover | null = null): CoverDraft => ({
  file: null, previewUrl: null, remove: false,
  layout: cover ? { fit: cover.fit, focusX: cover.focusX, focusY: cover.focusY } : { fit: 'cover', focusX: 50, focusY: 50 },
})
