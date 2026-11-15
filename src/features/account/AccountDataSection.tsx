import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Download, Trash2 } from 'lucide-react'
import FormField from '../../components/auth/FormField'
import PasswordField from '../../components/auth/PasswordField'
import Button from '../../components/ui/Button'
import { ApiError, apiRequest } from '../../lib/api/client'
import { useAuth } from '../../lib/auth/useAuth'

type DeletionCheck = { blockers: string[]; confirmWith: 'password' | 'email' }

type DeleteState =
  | { step: 'closed' }
  | { step: 'checking' }
  | { step: 'blocked'; blockers: string[] }
  | { step: 'confirm'; confirmWith: 'password' | 'email' }

function fieldError(error: unknown, field: string): string {
  if (!(error instanceof ApiError) || typeof error.details !== 'object' || error.details === null || !('errors' in error.details)) return ''
  const errors = (error.details as { errors?: Record<string, unknown> }).errors
  const first = errors?.[field]
  return Array.isArray(first) && typeof first[0] === 'string' ? first[0] : ''
}

/** "Your data" on the security page: download everything AYOS holds, or delete the account (Data Privacy Act rights). */
export default function AccountDataSection() {
  const { refreshUser } = useAuth()
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [remove, setRemove] = useState<DeleteState>({ step: 'closed' })
  const [understood, setUnderstood] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [confirmError, setConfirmError] = useState('')

  const download = async () => {
    setDownloading(true)
    setDownloadError('')
    try {
      const data = await apiRequest<unknown>('/account/export')
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `ayos-my-data-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (reason) {
      setDownloadError(reason instanceof Error ? reason.message : 'We couldn’t prepare your data. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const startDelete = async () => {
    setRemove({ step: 'checking' })
    setDeleteError('')
    try {
      const check = await apiRequest<DeletionCheck>('/account/deletion-check')
      setRemove(check.blockers.length ? { step: 'blocked', blockers: check.blockers } : { step: 'confirm', confirmWith: check.confirmWith })
    } catch (reason) {
      setRemove({ step: 'closed' })
      setDeleteError(reason instanceof Error ? reason.message : 'We couldn’t check your account. Please try again.')
    }
  }

  const confirmDelete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (remove.step !== 'confirm') return
    const value = String(new FormData(event.currentTarget).get('confirm') ?? '')
    setDeleting(true)
    setConfirmError('')
    setDeleteError('')
    try {
      await apiRequest('/account', { method: 'DELETE', body: JSON.stringify({ [remove.confirmWith]: value }) })
      await refreshUser()
      navigate('/login', { replace: true, state: { notice: 'Your AYOS account has been deleted. Thank you for using AYOS.' } })
    } catch (reason) {
      const message = fieldError(reason, remove.confirmWith)
      if (message) setConfirmError(message)
      else if (reason instanceof ApiError && reason.status === 409 && typeof reason.details === 'object' && reason.details && 'blockers' in reason.details) {
        setRemove({ step: 'blocked', blockers: (reason.details as { blockers: string[] }).blockers })
      } else setDeleteError(reason instanceof Error ? reason.message : 'We couldn’t delete your account. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const close = () => { setRemove({ step: 'closed' }); setUnderstood(false); setConfirmError('') }

  return <section className="security-section account-data" aria-labelledby="account-data-title">
    <div className="security-section-heading"><span className="account-summary-icon"><Download size={18} /></span><div><h2 id="account-data-title">Your data</h2><p>Download what AYOS holds about you, or delete your account.</p></div></div>

    <div className="account-data-row">
      <div><strong>Download my data</strong><p>A file with your profile, addresses, requests, messages you sent, reviews and security history.</p></div>
      <Button type="button" variant="secondary" className="phase2-secondary" loading={downloading} disabled={downloading} onClick={() => void download()}>
        {downloading ? 'Preparing…' : <><Download size={16} aria-hidden="true" /> Download</>}
      </Button>
    </div>
    {downloadError && <p className="form-notice security-error" role="alert">{downloadError}</p>}

    <div className="account-data-danger">
      <div className="account-data-row">
        <div><strong>Delete my account</strong><p>Erases your personal details and signs you out everywhere. This can’t be undone.</p></div>
        {remove.step === 'closed' && <Button type="button" className="phase2-danger" onClick={() => void startDelete()}><Trash2 size={16} aria-hidden="true" /> Delete account</Button>}
      </div>
      {deleteError && <p className="form-notice security-error" role="alert">{deleteError}</p>}

      {remove.step === 'checking' && <p className="account-data-status" role="status">Checking your account…</p>}

      {remove.step === 'blocked' && <div className="account-data-panel" role="alert">
        <p className="account-data-warning"><AlertTriangle size={16} aria-hidden="true" /> Finish these first:</p>
        <ul>{remove.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
        <Button type="button" variant="secondary" className="phase2-secondary" onClick={close}>OK</Button>
      </div>}

      {remove.step === 'confirm' && <form className="account-data-panel" onSubmit={(event) => void confirmDelete(event)} noValidate>
        <p><strong>What happens:</strong></p>
        <ul>
          <li>Your name, email, phone, addresses and messages you sent are erased.</li>
          <li>If you are a provider, your profile, photos and ID documents are removed.</li>
          <li>Finished jobs and reviews stay without your name, so the other person keeps their records.</li>
        </ul>
        {remove.confirmWith === 'password'
          ? <PasswordField label="Enter your password to confirm" name="confirm" autoComplete="current-password" required error={confirmError} />
          : <FormField label="Type your email address to confirm" name="confirm" type="email" autoComplete="off" required error={confirmError} />}
        <label className="check-label"><input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} /> <span>I understand this can’t be undone.</span></label>
        <div className="security-actions">
          <Button type="submit" className="phase2-danger" disabled={!understood || deleting} loading={deleting}>{deleting ? 'Deleting…' : 'Delete my account'}</Button>
          <Button type="button" variant="secondary" className="phase2-secondary" onClick={close} disabled={deleting}>Cancel</Button>
        </div>
      </form>}
    </div>
  </section>
}
