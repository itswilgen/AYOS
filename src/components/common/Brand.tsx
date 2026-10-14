import { Link } from 'react-router-dom'

export default function Brand({ light = false, onClick, to = '/' }: { light?: boolean; onClick?: () => void; to?: string }) {
  return <Link className={`brand${light ? ' brand-light' : ''}`} to={to} aria-label={to === '/provider' ? 'Provider overview' : 'AYOS home'} onClick={onClick}>
    <img className="brand-logo" src="/images/logo/AYOSLogo.png" alt="" />
  </Link>
}
