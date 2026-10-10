import { Link } from 'react-router-dom'

export default function Brand({ light = false, onClick }: { light?: boolean; onClick?: () => void }) {
  return <Link className={`brand${light ? ' brand-light' : ''}`} to="/" aria-label="AYOS home" onClick={onClick}>
    <span className="brand-mark" aria-hidden="true"><span /></span><span>ayos</span>
  </Link>
}
