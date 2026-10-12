import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, MapPin, Search, Wrench } from 'lucide-react'
import { findServiceCategories } from '../../../services/home.service'
import type { ServiceCategory, ServiceLocationSummary } from '../../../types/marketplace'

type Props = {
  categories: ServiceCategory[]
  locations: ServiceLocationSummary[]
}

export default function HomeSearch({ categories, locations }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [locationOverride, setLocationOverride] = useState('')
  const [open, setOpen] = useState(false)

  const selectedLocationId = locations.some((location) => String(location.id) === locationOverride)
    ? locationOverride
    : String((locations.find((item) => item.is_default) ?? locations[0])?.id ?? '')

  const suggestions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return []
    return findServiceCategories(categories, normalized).slice(0, 5)
  }, [categories, query])

  const selectedLocation = locations.find((location) => String(location.id) === selectedLocationId)
  const locationLabel = selectedLocation
    ? `${selectedLocation.city_municipality.name}, ${selectedLocation.province?.name ?? selectedLocation.region.name}`
    : ''

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const search = query.trim()
    if (!search || !selectedLocation) return
    const params = new URLSearchParams({ service: search, location: locationLabel, locationId: String(selectedLocation.id) })
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
          {locations.length > 0 ? <div className="home-search-location">
            <MapPin size={19} aria-hidden="true" />
            <label className="sr-only" htmlFor="search-location">Choose a service location</label>
            <select id="search-location" value={selectedLocationId} onChange={(event) => setLocationOverride(event.target.value)}>
              {locations.map((location) => <option value={location.id} key={location.id}>
                {location.label} · {location.city_municipality.name}
              </option>)}
            </select>
          </div> : <Link className="home-search-location home-search-location-empty" to="/account/locations"><MapPin size={19} aria-hidden="true" /><span>Add a service location</span><ArrowRight size={16} aria-hidden="true" /></Link>}
          <button className="home-search-submit" type="submit" disabled={!query.trim() || !selectedLocation}>
            <Search size={18} aria-hidden="true" /><span>Search services</span><ArrowRight size={17} aria-hidden="true" />
          </button>
        </form>
        <div className="home-search-footer">
          <span>Popular:</span>
          {['Aircon', 'Electrical', 'Plumbing'].map((term) => <button key={term} type="button" onClick={() => { setQuery(term); document.getElementById('service-search-input')?.focus() }}>{term}</button>)}
          {locations.length > 0 && <Link to="/account/locations">Change location</Link>}
        </div>
      </div>
    </div>
  </section>
}
