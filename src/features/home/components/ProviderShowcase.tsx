import { ArrowUpRight, MapPin, Star } from 'lucide-react'
import { Link } from 'react-router-dom'

const demoProviders = [
  { name: 'Marco Dela Cruz', service: 'Electrical', detail: 'Home wiring · Lighting repair', area: 'Tanjay City', rating: '4.9', reviews: 28, image: '/images/demo-providers/provider-01.jpg' },
  { name: 'Ramon Villanueva', service: 'Plumbing', detail: 'Leaks · Fixtures · Drain repair', area: 'Tanjay City', rating: '4.8', reviews: 21, image: '/images/demo-providers/provider-02.jpg' },
  { name: 'Joel Mendoza', service: 'Carpentry', detail: 'Cabinets · Doors · Wood repair', area: 'Tanjay City', rating: '4.9', reviews: 17, image: '/images/demo-providers/provider-03.jpg' },
  { name: 'Paolo Reyes', service: 'Aircon', detail: 'Cleaning · Installation · Repair', area: 'Tanjay City', rating: '5.0', reviews: 32, image: '/images/demo-providers/provider-04.jpg' },
  { name: 'Noel Bautista', service: 'Appliance repair', detail: 'Washers · Refrigerators · Ovens', area: 'Tanjay City', rating: '4.7', reviews: 19, image: '/images/demo-providers/provider-05.jpg' },
  { name: 'Luis Garcia', service: 'Phone repair', detail: 'Screen · Battery · Diagnostics', area: 'Tanjay City', rating: '4.8', reviews: 24, image: '/images/demo-providers/provider-06.jpg' },
  { name: 'Andre Flores', service: 'Computer repair', detail: 'Laptop setup · Hardware · Support', area: 'Tanjay City', rating: '4.9', reviews: 16, image: '/images/demo-providers/provider-07.jpg' },
  { name: 'Eric Santos', service: 'Solar', detail: 'Panel installation · Maintenance', area: 'Tanjay City', rating: '4.8', reviews: 13, image: '/images/demo-providers/provider-08.jpg' },
  { name: 'Benjie Lim', service: 'CCTV', detail: 'Camera setup · System checks', area: 'Tanjay City', rating: '4.7', reviews: 12, image: '/images/demo-providers/provider-09.jpg' },
  { name: 'Carlo Aquino', service: 'Network & Wi-Fi', detail: 'Wi-Fi setup · Coverage · Cabling', area: 'Tanjay City', rating: '4.9', reviews: 20, image: '/images/demo-providers/provider-10.jpg' },
]

export default function ProviderShowcase() {
  return <section className="home-provider-showcase" aria-labelledby="provider-showcase-title">
    <div className="home-provider-showcase-heading">
      <div><span className="home-eyebrow">LOCAL SKILLS, READY TO HELP</span><h2 id="provider-showcase-title">Meet local service pros</h2><p>Explore examples of the providers you’ll find on AYOS.</p></div>
      <span className="home-sample-label">DEMO PROFILES</span>
    </div>
    <div className="home-provider-card-grid">
      {demoProviders.map((provider) => <article className="home-provider-card" key={provider.name}>
        <div className="home-provider-card-image">
          <img src={provider.image} alt={`${provider.name}, demo ${provider.service.toLowerCase()} provider`} loading="lazy" />
          <span>Demo profile</span>
        </div>
        <div className="home-provider-card-content">
          <span className="home-provider-card-service">{provider.service}</span>
          <h3>{provider.name}</h3>
          <p>{provider.detail}</p>
          <div className="home-provider-card-meta"><span><MapPin size={14} aria-hidden={true} />{provider.area}</span><span><Star size={14} fill="currentColor" aria-hidden={true} />{provider.rating} <small>({provider.reviews})</small></span></div>
          <Link to={`/services/search?${new URLSearchParams({ service: provider.service })}`} className="home-provider-card-link">Explore service <ArrowUpRight size={16} aria-hidden={true} /></Link>
        </div>
      </article>)}
    </div>
    <p className="home-provider-showcase-note">Demo profiles and ratings are illustrative. Provider listings will appear here as the AYOS marketplace grows.</p>
  </section>
}
