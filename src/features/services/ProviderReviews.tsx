import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star } from 'lucide-react'
import { providerProfileService } from '../../services/messages.service'
import type { ProviderReviewPage, PublicProviderProfile } from '../../types/messages'
import { initials, monthYear, plural } from './profile-format'

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return <span className="pp-stars" role="img" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((value) => <Star key={value} size={size} fill={value <= Math.round(rating) ? 'currentColor' : 'none'} aria-hidden="true" />)}
  </span>
}

type Props = Pick<PublicProviderProfile, 'id' | 'rating' | 'reviewCount' | 'ratingBreakdown' | 'reviews'> & {
  name: string
  /** Where to book this provider; left out when they are not taking requests. */
  requestPath?: string
}

/** Rating summary with per-star bars that double as filters, beside the newest reviews. */
export default function ProviderReviews({ id, rating, reviewCount, ratingBreakdown, reviews: firstPage, name, requestPath }: Props) {
  const [filter, setFilter] = useState<number | null>(null)
  const [page, setPage] = useState<ProviderReviewPage>(firstPage)
  const [status, setStatus] = useState<'idle' | 'loading' | 'more' | 'error'>('idle')
  const request = useRef(0)
  const lastAppend = useRef(false)

  const load = async (stars: number | null, append: boolean) => {
    const ticket = ++request.current
    lastAppend.current = append
    setStatus(append ? 'more' : 'loading')
    try {
      const next = await providerProfileService.getReviews(id, { rating: stars, before: append ? page.data.at(-1)?.id : undefined })
      if (ticket !== request.current) return
      setPage((current) => append ? { data: [...current.data, ...next.data], hasMore: next.hasMore } : next)
      setStatus('idle')
    } catch {
      if (ticket !== request.current) return
      if (!append) setPage({ data: [], hasMore: false })
      setStatus('error')
    }
  }

  const choose = (stars: number | null) => {
    const next = stars === filter ? null : stars
    setFilter(next)
    if (next === null) { request.current++; setPage(firstPage); setStatus('idle'); return }
    void load(next, false)
  }

  if (reviewCount === 0 || rating === null) {
    return <NoReviewsYet name={name} requestPath={requestPath} />
  }

  return <div className="pp-reviews-layout">
    <div className="pp-rating-summary">
      <p className="pp-rating-score"><strong>{rating.toFixed(1)}</strong><span>out of 5</span></p>
      <Stars rating={rating} size={18} />
      <p className="pp-rating-count">{plural(reviewCount, 'review')}</p>
      <ul className="pp-rating-bars" aria-label="Filter reviews by rating">{ratingBreakdown.map((row) => <li key={row.stars}>
        <button type="button" onClick={() => choose(row.stars)} aria-pressed={filter === row.stars} disabled={row.count === 0}
          aria-label={`${row.stars} star: ${plural(row.count, 'review')}${filter === row.stars ? ', showing' : ''}`}>
          <span>{row.stars}<Star size={11} fill="currentColor" aria-hidden="true" /></span>
          <span className="pp-rating-track"><span style={{ width: `${(row.count / reviewCount) * 100}%` }} /></span>
          <span>{row.count}</span>
        </button>
      </li>)}</ul>
    </div>

    <div className="pp-review-feed" aria-busy={status === 'loading'}>
      {filter !== null && <p className="pp-filter-note">Showing {filter}-star reviews <button type="button" className="pp-text-button" onClick={() => choose(null)}>Show all</button></p>}
      {status === 'loading' ? <ul className="pp-review-list">{[0, 1].map((key) => <li key={key} className="pp-review-skeleton"><span className="pp-skeleton pp-skeleton-line is-short" /><span className="pp-skeleton pp-skeleton-line" /></li>)}</ul>
        : <ul className="pp-review-list">{page.data.map((review) => <li key={review.id} className="pp-review">
          <span className="pp-review-avatar" aria-hidden="true">{initials(review.customerName)}</span>
          <div>
            <p className="pp-review-head"><strong>{review.customerName}</strong><Stars rating={review.rating} /></p>
            <p className="pp-review-meta">{review.service} · {monthYear(review.date)}</p>
            {review.comment ? <p className="pp-review-body">{review.comment}</p> : <p className="pp-review-body is-quiet">Rated without a comment.</p>}
          </div>
        </li>)}</ul>}
      {status === 'error' && <p className="pp-action-error" role="alert">Reviews didn’t load. <button type="button" className="pp-text-button" onClick={() => void load(filter, lastAppend.current)}>Try again</button></p>}
      {status !== 'loading' && page.hasMore && <button type="button" className="pp-more-button" onClick={() => void load(filter, true)} disabled={status === 'more'}>{status === 'more' ? 'Loading…' : 'Show more reviews'}</button>}
    </div>
  </div>
}

/**
 * A provider with no reviews yet: an honest "New" rating card beside the path a real review takes,
 * so a first customer sees why the list is empty and how to start it.
 */
function NoReviewsYet({ name, requestPath }: { name: string; requestPath?: string }) {
  return <div className="pp-reviews-layout">
    <div className="pp-rating-summary is-new">
      <p className="pp-rating-score"><strong>New</strong></p>
      <span className="pp-stars is-empty" aria-hidden="true">{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={18} />)}</span>
      <p className="pp-rating-count">No reviews yet</p>
      <p className="pp-rating-new-note">Ratings show here once customers confirm a finished job.</p>
    </div>

    <div className="pp-reviews-how">
      <h3>How a review gets here</h3>
      <ol className="pp-review-steps">
        <li><span className="pp-step-dot" aria-hidden="true">1</span><div><strong>A customer books {name}</strong><p>The request goes straight to them, with photos of the problem.</p></div></li>
        <li><span className="pp-step-dot" aria-hidden="true">2</span><div><strong>{name} finishes the job</strong><p>They mark the work done in AYOS.</p></div></li>
        <li><span className="pp-step-dot is-review" aria-hidden="true"><Star size={14} fill="currentColor" /></span><div><strong>The customer confirms, then rates</strong><p>No confirmed job, no review. That keeps every rating real.</p></div></li>
      </ol>
      {requestPath && <Link className="pp-more-button pp-first-review" to={requestPath}>Book and be the first to review <ArrowRight size={16} aria-hidden="true" /></Link>}
    </div>
  </div>
}
