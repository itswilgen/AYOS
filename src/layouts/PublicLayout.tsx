import { Outlet } from 'react-router-dom'
import SiteHeader from '../components/navigation/SiteHeader'
import SiteFooter from '../components/layout/SiteFooter'
export default function PublicLayout() { return <><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader /><Outlet /><SiteFooter /></> }
