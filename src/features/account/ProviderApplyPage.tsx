import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness } from 'lucide-react'
import { providerWorkspaceService } from '../../services/provider.service'
import '../provider/provider.css'

export default function ProviderApplyPage() {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [yearsExperience, setYearsExperience] = useState('0')
  const [documents, setDocuments] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (documents.length) {
        await providerWorkspaceService.applyWithDocuments({ displayName, bio, yearsExperience: Number(yearsExperience) }, documents)
      } else {
        await providerWorkspaceService.apply({ displayName, bio, yearsExperience: Number(yearsExperience) })
      }
      navigate('/provider', { replace: true })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We couldn’t submit your application.') }
    finally { setBusy(false) }
  }
  const selectDocuments = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    if (selected.length > 5) { setError('Choose up to five identity or qualification documents.'); event.target.value = ''; return }
    if (selected.some(file => !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError('Documents must be PDF, JPG or PNG files under 5 MB each.'); event.target.value = ''; return
    }
    setError(''); setDocuments(selected); event.target.value = ''
  }
  return <main className="provider-apply-page">
    <section className="provider-apply-card" aria-labelledby="provider-apply-title">
      <span className="provider-apply-icon"><BriefcaseBusiness size={24} aria-hidden="true" /></span>
      <span className="provider-eyebrow">BECOME A PROVIDER</span>
      <h1 id="provider-apply-title">Offer your skills on AYOS</h1>
      <p className="provider-apply-intro">Tell us about your work. Your customer account will stay available while your application is reviewed.</p>
      <form className="provider-form" onSubmit={(event) => void submit(event)}>
        <label>Provider display name<input required minLength={2} maxLength={80} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name or business name" /></label>
        <label>Professional bio<textarea maxLength={500} rows={5} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Describe the services you offer" /></label>
        <label>Years of experience<input required type="number" min={0} max={70} inputMode="numeric" value={yearsExperience} onChange={(event) => setYearsExperience(event.target.value)} /></label>
        <label>Verification documents <span className="provider-muted">Optional · up to 5 files</span><input type="file" accept="application/pdf,image/jpeg,image/png" multiple onChange={selectDocuments} /><small className="provider-muted">PDF, JPG or PNG · 5 MB max per file. Stored privately and visible only to authorized reviewers.</small></label>
        {documents.length > 0 && <p className="provider-muted">Selected: {documents.map(file => file.name).join(', ')}</p>}
        {error && <p role="alert" className="provider-inline-warning">{error}</p>}
        <div className="provider-apply-actions"><Link className="provider-button" to="/home">Cancel</Link><button className="provider-button provider-button-primary" disabled={busy} type="submit">{busy ? 'Submitting…' : 'Submit application'} {!busy && <ArrowRight size={16} aria-hidden="true" />}</button></div>
      </form>
    </section>
  </main>
}
