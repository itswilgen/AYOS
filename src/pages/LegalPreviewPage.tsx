import { Link, useLocation } from 'react-router-dom'

export default function LegalPreviewPage() {
  const isPrivacy = useLocation().pathname === '/privacy'
  const title = isPrivacy ? 'Privacy notice' : 'Terms of Service'
  return <main id="main-content" className="legal-preview container">
    <span className="eyebrow">AYOS launch preview</span>
    <h1>{title}</h1>
    {isPrivacy
      ? <p>AYOS account forms are a visual preview and do not submit or store the information entered. The full privacy notice will be published before account creation is enabled.</p>
      : <p>The AYOS Terms of Service are being prepared for launch. Account creation is not active in this preview, and submitting a form here does not create an account.</p>}
    <Link to="/">Back to AYOS</Link>
  </main>
}
