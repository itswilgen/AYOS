import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ProviderWorkItem } from '../../types/messages'
import { monthYear } from './profile-format'

const PREVIEW_COUNT = 6

/** Photos of finished jobs. A grid of the latest work; tapping one opens it full size with next and previous. */
export default function ProviderWorkGallery({ items }: { items: ProviderWorkItem[] }) {
  const [expanded, setExpanded] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT)

  return <>
    <ul className="pp-work-grid">{visible.map((item, index) => <li key={item.id}>
      <button type="button" className="pp-work-tile" onClick={() => setOpen(index)} aria-label={`Open photo: ${item.title}`}>
        <img src={item.image} alt="" loading="lazy" />
      </button>
      <p className="pp-work-caption"><strong>{item.title}</strong><span>{item.category}{item.date && ` · ${monthYear(item.date)}`}</span></p>
    </li>)}</ul>
    {items.length > PREVIEW_COUNT && <button type="button" className="pp-text-button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
      {expanded ? 'Show fewer photos' : `See all ${items.length} photos`}
    </button>}
    {open !== null && <WorkLightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
  </>
}

function WorkLightbox({ items, index, onIndex, onClose }: { items: ProviderWorkItem[]; index: number; onIndex: (index: number) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const item = items[index]
  const step = (delta: number) => onIndex((index + delta + items.length) % items.length)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') step(1)
    if (event.key === 'ArrowLeft') step(-1)
  }

  return <dialog ref={dialog} className="pp-lightbox" aria-label={`Work photo ${index + 1} of ${items.length}`} onClose={onClose} onCancel={onClose} onKeyDown={onKeyDown}
    onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="pp-lightbox-frame">
      <button type="button" className="pp-lightbox-close" onClick={onClose} aria-label="Close" autoFocus><X size={20} aria-hidden="true" /></button>
      <img key={item.id} src={item.image} alt={item.title} />
      <div className="pp-lightbox-bar">
        <p><strong>{item.title}</strong><span>{item.category}{item.date && ` · ${monthYear(item.date)}`}</span></p>
        {items.length > 1 && <div className="pp-lightbox-nav">
          <button type="button" onClick={() => step(-1)} aria-label="Previous photo"><ChevronLeft size={20} aria-hidden="true" /></button>
          <span aria-live="polite">{index + 1} / {items.length}</span>
          <button type="button" onClick={() => step(1)} aria-label="Next photo"><ChevronRight size={20} aria-hidden="true" /></button>
        </div>}
      </div>
    </div>
  </dialog>
}
