import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, RotateCw } from 'lucide-react'
import { serviceSearchPath } from '../../features/home/home-links'
import { serviceIcons } from '../../features/home/service-visuals'
import { locationsService } from '../../services/locations.service'
import { servicesService } from '../../services/home.service'
import type { ServiceCategory, ServiceLocationSummary } from '../../types/marketplace'

type MenuData =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'ready'; categories: ServiceCategory[]; location?: ServiceLocationSummary }

/**
 * "Services" in the signed-in header: a dropdown of every service category, each opening the search
 * for the customer's default saved address. Data loads on first open, so the header costs nothing until used.
 */
export default function ServicesMenu() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<MenuData>({ status: 'idle' })
  const anchorRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const load = () => {
    setData({ status: 'loading' })
    Promise.allSettled([servicesService.getCategories(), locationsService.getSavedLocations()]).then(([categories, locations]) => {
      if (categories.status === 'rejected') {
        setData({ status: 'error' })
        return
      }
      const saved = locations.status === 'fulfilled' ? locations.value : []
      setData({ status: 'ready', categories: categories.value, location: saved.find((item) => item.is_default) ?? saved[0] })
    })
  }

  const toggle = () => {
    if (!open && data.status === 'idle') load()
    setOpen((current) => !current)
  }

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: PointerEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  // Active only while browsing or requesting a service, so it never shares the underline with Home.
  const active = pathname.startsWith('/services')

  return <div className="app-popover-anchor app-services-anchor" ref={anchorRef}>
    <button
      ref={buttonRef}
      type="button"
      className={`app-nav-trigger${active ? ' active' : ''}${open ? ' is-open' : ''}`}
      aria-expanded={open}
      aria-controls="services-menu"
      onClick={toggle}
    >
      Services <ChevronDown size={15} aria-hidden="true" />
    </button>

    {open && <section className="app-popover app-services-menu" id="services-menu" aria-label="All services">
      <div className="app-popover-heading">
        <div><strong>All services</strong>{data.status === 'ready' && data.location && <span>Near {data.location.city_municipality.name}</span>}</div>
      </div>

      {(data.status === 'loading' || data.status === 'idle') && <p className="app-popover-empty" role="status">Loading services…</p>}

      {data.status === 'error' && <div className="app-popover-empty" role="alert">
        <p>Services didn’t load. Check your connection, then try again.</p>
        <button type="button" className="app-services-retry" onClick={load}><RotateCw size={15} aria-hidden="true" /> Try again</button>
      </div>}

      {data.status === 'ready' && (data.categories.length
        ? <ul className="app-services-list">
          {data.categories.map((category) => {
            const Icon = serviceIcons[category.icon]
            return <li key={category.id}>
              <Link to={serviceSearchPath(category.name, data.location)} onClick={() => setOpen(false)}>
                <span className="app-services-icon" aria-hidden="true"><Icon size={18} /></span>
                <span className="app-services-text"><strong>{category.name}</strong><small>{category.shortDescription}</small></span>
              </Link>
            </li>
          })}
        </ul>
        : <p className="app-popover-empty">No services are available yet.</p>)}
    </section>}
  </div>
}
