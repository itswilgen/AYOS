import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { ServiceCategory, ServiceLocationSummary } from '../../../types/marketplace'
import { serviceSearchPath } from '../home-links'
import { serviceIcons, servicePhotos } from '../service-visuals'

type Props = {
  categories: ServiceCategory[]
  location?: ServiceLocationSummary
}

export default function ServiceCategories({ categories, location }: Props) {
  const city = location?.city_municipality.name
  return <section className="home-section" id="services" aria-labelledby="services-title">
    <header className="home-section-head">
      <div><p className="home-kicker">Browse by trade</p><h2 id="services-title" className="home-title">{city ? `Services in ${city}` : 'Services near you'}</h2></div>
      <p className="home-lede">{city ? `Pick a trade to see providers who serve ${city}.` : 'Pick a trade to see who offers it on AYOS.'}</p>
    </header>
    <ul className="home-service-grid">
      {categories.map((category, index) => {
        const Icon = serviceIcons[category.icon]
        const photo = servicePhotos[category.slug]
        return <li key={category.id} style={{ '--i': index } as CSSProperties}>
          <Link className="home-service" to={serviceSearchPath(category.name, location)}>
            <span className={photo ? 'home-service-media' : 'home-service-media is-icon'}>
              {photo ? <img src={photo} alt="" width="960" height="720" loading="lazy" decoding="async" /> : <Icon size={30} aria-hidden="true" />}
            </span>
            <span className="home-service-text"><strong>{category.name}</strong><small>{category.shortDescription}</small></span>
            <ArrowUpRight className="home-service-go" size={16} aria-hidden="true" />
          </Link>
        </li>
      })}
    </ul>
  </section>
}
