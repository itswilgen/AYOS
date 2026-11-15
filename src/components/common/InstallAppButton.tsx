import { useRef } from 'react'
import { Check, Download, EllipsisVertical, Share, SquarePlus, X } from 'lucide-react'
import Button from '../ui/Button'
import { promptInstall, useInstallState } from '../../lib/install/installPrompt'
import './install-app.css'

/**
 * "Install app": the browser's own install dialog when it offers one, otherwise short steps for adding AYOS
 * to the home screen (iPhone/iPad Safari, or any browser's menu). Hidden once AYOS runs as an installed app.
 */
export default function InstallAppButton({ className = '' }: { className?: string }) {
  const state = useInstallState()
  const dialogRef = useRef<HTMLDialogElement>(null)

  if (state === 'installed') return null

  const install = async () => {
    if (state === 'prompt' && await promptInstall()) return
    dialogRef.current?.showModal()
  }

  return <>
    <Button type="button" variant="secondary" className={className} onClick={() => void install()}>
      <Download size={17} aria-hidden="true" /> Install app
    </Button>

    <dialog ref={dialogRef} className="install-help" aria-labelledby="install-help-title">
      <div className="install-help-head">
        <h2 id="install-help-title">Install AYOS</h2>
        <button type="button" className="install-help-close" aria-label="Close" onClick={() => dialogRef.current?.close()}><X size={18} aria-hidden="true" /></button>
      </div>
      <p className="install-help-lede">Add AYOS to your home screen so it opens like an app.</p>
      {state === 'ios'
        ? <ol className="install-help-steps">
          <li><span className="install-help-icon" aria-hidden="true"><Share size={16} /></span><span>Tap <strong>Share</strong> in Safari’s toolbar.</span></li>
          <li><span className="install-help-icon" aria-hidden="true"><SquarePlus size={16} /></span><span>Choose <strong>Add to Home Screen</strong>.</span></li>
          <li><span className="install-help-icon" aria-hidden="true"><Check size={16} /></span><span>Tap <strong>Add</strong>. AYOS appears on your home screen.</span></li>
        </ol>
        : <ol className="install-help-steps">
          <li><span className="install-help-icon" aria-hidden="true"><EllipsisVertical size={16} /></span><span>Open your browser’s menu.</span></li>
          <li><span className="install-help-icon" aria-hidden="true"><SquarePlus size={16} /></span><span>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span></li>
          <li><span className="install-help-icon" aria-hidden="true"><Check size={16} /></span><span>Confirm. AYOS opens from your home screen or desktop.</span></li>
        </ol>}
      <Button type="button" className="install-help-done" onClick={() => dialogRef.current?.close()}>Got it</Button>
    </dialog>
  </>
}
