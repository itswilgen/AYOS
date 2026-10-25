import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, MapPin, Star } from 'lucide-react'
import type { FeaturedService } from '../../types/marketplace'
import './service-cover-card.css'

export type CoverCardService = Pick<FeaturedService, 'providerName' | 'category' | 'description' | 'cover' | 'rating' | 'reviewCount' | 'completedServices' | 'verified' | 'areaLabel'>

type Props = {
  service: CoverCardService
  /** Where the card leads. Without it the card renders as a non-interactive preview. */
  to?: string
  /** Text of the card's action. */
  linkLabel?: string
}

/** A provider's own photo or poster as customers see it on Home. Providers see the same card as a live preview. */
export default function ServiceCoverCard({ service, to, linkLabel = 'Request service' }: Props) {
  const { cover } = service
  const imageStyle: CSSProperties = { objectPosition: `${cover.focusX}% ${cover.focusY}%` }

  return <article className={to ? 'cover-card is-link' : 'cover-card'}>
    <div className={`cover-card-media is-${cover.fit}`}>
      {cover.fit === 'contain' && <img className="cover-card-backdrop" src={cover.image} alt="" aria-hidden="true" />}
      <img className="cover-card-image" src={cover.image} alt={`${service.category} by ${service.providerName}`} style={imageStyle} loading="lazy" decoding="async" />
    </div>
    <div className="cover-card-body">
      <div className="cover-card-info">
        <p className="cover-card-trade">{service.category}</p>
        <h3>{service.providerName}</h3>
        {service.description && <p className="cover-card-description">{service.description}</p>}
        <p className="cover-card-meta">
          {service.rating !== null
            ? <span className="cover-card-rating"><Star size={14} fill="currentColor" aria-hidden="true" /><strong>{service.rating.toFixed(1)}</strong> ({service.reviewCount})</span>
            : <span>New on AYOS</span>}
          {service.completedServices > 0 && <span>{service.completedServices} jobs done</span>}
        </p>
        <p className="cover-card-meta">
          {service.areaLabel && <span><MapPin size={14} aria-hidden="true" /> {service.areaLabel}</span>}
          {service.verified && <span className="cover-card-verified"><BadgeCheck size={15} aria-hidden="true" /> Identity checked</span>}
        </p>
      </div>
      {to
        ? <Link className="cover-card-link" to={to} aria-label={`${linkLabel}: ${service.category.toLowerCase()} by ${service.providerName}`}>{linkLabel} <ArrowRight size={16} aria-hidden="true" /></Link>
        : <span className="cover-card-link" aria-hidden="true">{linkLabel} <ArrowRight size={16} /></span>}
    </div>
  </article>
}
