import { useEffect, useState } from 'react'
import ServiceCoverCard from '../../../components/common/ServiceCoverCard'
import { featuredServicesService } from '../../../services/home.service'
import type { FeaturedService, ServiceLocationSummary } from '../../../types/marketplace'

type Props = {
  location?: ServiceLocationSummary
  /** False until saved locations load, so the first request already uses the customer's city. */
  ready: boolean
}


/** Reviewed photos and posters from providers who serve the customer's city. Hidden when there are none. */
export default function FeaturedServices({ location, ready }: Props) {
  const [items, setItems] = useState<FeaturedService[]>([])
  const cityCode = location?.city_municipality.code

  useEffect(() => {
    if (!ready) return
    let active = true
    featuredServicesService.getFeatured(cityCode).then(
      (result) => { if (active) setItems(result) },
      () => { if (active) setItems([]) },
    )
    return () => { active = false }
  }, [ready, cityCode])

  if (!items.length) return null
  const city = location?.city_municipality.name

  return <section className="home-section" aria-labelledby="featured-title">
    <header className="home-section-head">
      <div><p className="home-kicker">Featured near you</p><h2 id="featured-title" className="home-title">{city ? `Featured in ${city}` : 'Featured services'}</h2></div>
      <p className="home-lede">Photos and posters from local providers. AYOS reviews each one before it appears here.</p>
    </header>
    <ul className="home-featured-grid">
      {items.map((item) => <li key={item.id}><ServiceCoverCard service={item} to={`/providers/${item.providerId}`} linkLabel="View provider" /></li>)}
    </ul>
  </section>
}
