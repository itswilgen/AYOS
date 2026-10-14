import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search, Wrench } from 'lucide-react'
import { findServiceCategories } from '../../../services/home.service'
import type { ServiceCategory, ServiceLocationSummary } from '../../../types/marketplace'

type Props = {
  categories: ServiceCategory[]
  locations: ServiceLocationSummary[]
}

export default function HomeSearch({ categories, locations }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const suggestions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return []
    return findServiceCategories(categories, normalized).slice(0, 5)
  }, [categories, query])

  const selectedLocation = locations.find((location) => location.is_default) ?? locations[0]
  const locationLabel = selectedLocation
    ? `${selectedLocation.city_municipality.name}, ${selectedLocation.province?.name ?? selectedLocation.region.name}`
    : ''

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const search = query.trim()
    if (!search) return
    const params = new URLSearchParams({ service: search })
    if (selectedLocation) {
      params.set('location', locationLabel)
      params.set('locationId', String(selectedLocation.id))
    }
    navigate(`/services/search?${params.toString()}`)
    setOpen(false)
  }

  const chooseSuggestion = (category: ServiceCategory) => {
    setQuery(category.name)
    setOpen(false)
  }

  return <section className="home-search-section" id="service-search" aria-labelledby="home-search-title">
    <div className="home-search-layout">
      <div className="home-search-main">
        <div className="home-search-copy">
          <span className="home-eyebrow"><span className="home-eyebrow-dot" /> LOCAL HELP, MADE EASIER</span>
          <h1 id="home-search-title">What do you need help with today?</h1>
          <p>Find trusted local skills for repairs, installations and everyday home services.</p>
        </div>
        <div className="home-hero-art">
          <img src="/images/home/home-services-3d.webp" alt="A home with tools for repair and maintenance" width="1374" height="1145" decoding="async" />
        </div>
        <form className="home-search-form" onSubmit={submit}>
          <div className="home-search-field-wrap">
            <label className="sr-only" htmlFor="service-search-input">What service do you need?</label>
            <Wrench size={19} aria-hidden="true" />
            <input
              id="service-search-input"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open && suggestions.length > 0}
              aria-controls="service-suggestions"
              placeholder="Try aircon cleaning or electrical repair"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
              autoComplete="off"
            />
            {open && suggestions.length > 0 && <ul className="home-search-suggestions" id="service-suggestions" role="listbox" aria-label="Service suggestions">
              {suggestions.map((category) => <li key={category.id}>
                <button type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSuggestion(category)}>
                  <span className="home-suggestion-icon"><Wrench size={17} aria-hidden="true" /></span>
                  <span><strong>{category.name}</strong><small>{category.shortDescription}</small></span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </li>)}
            </ul>}
          </div>
          <button className="home-search-submit" type="submit" disabled={!query.trim()}>
            <Search size={21} aria-hidden="true" /><span className="sr-only">Search services</span>
          </button>
        </form>
      </div>
    </div>
  </section>
}
