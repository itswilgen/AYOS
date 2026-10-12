import { ArrowUpRight, AirVent, BatteryCharging, Camera, Computer, Drill, Hammer, PlugZap, Smartphone, Wifi, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ComponentType } from 'react'
import type { ServiceCategory } from '../../../types/marketplace'

const icons: Record<ServiceCategory['icon'], ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  electrical: PlugZap,
  plumbing: Wrench,
  carpentry: Hammer,
  aircon: AirVent,
  appliance: Drill,
  phone: Smartphone,
  computer: Computer,
  solar: BatteryCharging,
  cctv: Camera,
  network: Wifi,
}

export default function ServiceCategories({ categories }: { categories: ServiceCategory[] }) {
  return <section className="home-section home-categories" id="services" aria-labelledby="categories-title">
    <div className="home-section-heading">
      <div><h2 id="categories-title">Our services</h2><p>Quick access to our core offerings.</p></div>
    </div>
    <div className="service-category-grid">
      {categories.map((category) => {
        const Icon = icons[category.icon]
        return <Link className="service-category-item" key={category.id} to={`/services/search?${new URLSearchParams({ service: category.name })}`}>
          <span className="service-category-icon"><Icon size={21} aria-hidden={true} /></span>
          <span className="service-category-content"><strong>{category.name}</strong><small>{category.shortDescription}</small></span>
          <ArrowUpRight className="service-category-arrow" size={16} aria-hidden="true" />
        </Link>
      })}
    </div>
  </section>
}
