import { useId, useState } from 'react'
import { Star } from 'lucide-react'

const WORDS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'] as const

/**
 * Tap-to-rate stars for a review. Built on real radio buttons, so arrow keys and screen readers
 * work like any other choice; hovering previews a rating before the tap.
 */
export default function StarRating({ value, onChange, legend = 'Rating' }: { value: number; onChange: (value: number) => void; legend?: string }) {
  const name = useId()
  const [preview, setPreview] = useState<number | null>(null)
  const shown = preview ?? value

  return <fieldset className="star-rating">
    <legend>{legend}</legend>
    <div className="star-rating-row">
      <div className="star-rating-stars" onMouseLeave={() => setPreview(null)}>
        {WORDS.map((word, index) => {
          const rating = index + 1
          const id = `${name}-${rating}`
          return <span key={rating} className="star-rating-option">
            <input className="star-rating-input" type="radio" id={id} name={name} value={rating}
              checked={value === rating} onChange={() => { setPreview(null); onChange(rating) }} aria-label={`${rating} of 5 stars, ${word}`} />
            <label htmlFor={id} className={rating <= shown ? 'is-on' : undefined} onMouseEnter={() => setPreview(rating)}>
              <Star size={30} strokeWidth={1.75} fill={rating <= shown ? 'currentColor' : 'none'} aria-hidden="true" />
            </label>
          </span>
        })}
      </div>
      <span className="star-rating-word" aria-hidden="true">{WORDS[shown - 1]}</span>
    </div>
  </fieldset>
}
