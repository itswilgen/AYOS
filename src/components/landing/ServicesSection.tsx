import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { serviceSearchPath } from './landing-links'

const services = [
  {
    name: 'Electrical',
    query: 'Electrical',
    detail: 'Lighting, outlets, wiring, and the repairs that keep the power on safely.',
    image: '/images/services/electrical.webp',
    alt: 'Electrician repairing an outlet in a home',
  },
  { name: 'Plumbing', query: 'Plumbing', detail: 'Leaks · pipes · faucets', image: '/images/services/plumbing.webp', alt: 'Plumber tightening a pipe below a kitchen sink' },
  { name: 'Aircon service', query: 'Aircon', detail: 'Cleaning · repair · split-type', image: '/images/services/aircon.webp', alt: 'Technician cleaning a wall-mounted air-conditioning unit' },
  { name: 'Carpentry', query: 'Carpentry', detail: 'Doors · cabinets · fixtures', image: '/images/services/carpentry.webp', alt: 'Carpenter measuring a wooden cabinet panel' },
  { name: 'Appliance repair', query: 'Appliance repair', detail: 'Refrigerators · washers · fans', image: '/images/services/appliance-repair.webp', alt: 'Technician diagnosing a refrigerator in a home kitchen' },
  { name: 'Phone repair', query: 'Phone repair', detail: 'Screens · batteries · ports', image: '/images/services/phone-repair.webp', alt: 'Phone technician repairing a smartphone at a workbench' },
  { name: 'Computer repair', query: 'Computer repair', detail: 'Laptops · desktops · setup', image: '/images/services/computer-repair.webp', alt: 'Computer technician repairing an open laptop' },
  { name: 'Solar installation', query: 'Solar', detail: 'Panels · planning · installs', image: '/images/services/solar-installation.webp', alt: 'Solar installer securing a panel on a residential rooftop' },
  { name: 'CCTV installation', query: 'CCTV', detail: 'Homes · shops · camera setup', image: '/images/services/cctv-installation.webp', alt: 'Installer fitting a security camera beside a home entrance' },
]

export default function ServicesSection() {
  return <section id="services" className="lp-section lp-services" aria-labelledby="services-title">
    <div className="lp-container">
      <header className="lp-section-head lp-section-head-split lp-reveal">
        <div><p className="lp-kicker">A hand for the everyday</p><h2 id="services-title" className="lp-title">What needs doing?</h2></div>
        <p className="lp-lede">Practical help for home repairs, device troubles, and the projects you’ve been meaning to finish. Pick a trade to see who serves your area.</p>
      </header>
      <ul className="lp-service-grid">
        {services.map(({ name, query, detail, image, alt }, index) => <li className="lp-service" key={name}>
          <Link className="lp-service-link" to={serviceSearchPath(query)}>
            <img src={image} alt={alt} width="960" height="720" loading="lazy" decoding="async" />
            <span className="lp-service-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className="lp-service-go" aria-hidden="true"><ArrowUpRight size={18} /></span>
            <span className="lp-service-body">
              <h3 className="lp-service-name">{name}</h3>
              <span className="lp-service-detail">{detail}</span>
            </span>
          </Link>
        </li>)}
      </ul>
      <p className="lp-services-note">Also available: network and Wi-Fi setup. More trades are on the way.</p>
    </div>
  </section>
}
