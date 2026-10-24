import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'
import Brand from '../common/Brand'
import Button from '../ui/Button'

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuToggleRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuToggleRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])
  const close = () => {
    setMenuOpen(false)
    menuToggleRef.current?.focus()
  }
  return <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
    <div className="nav-shell">
      <Brand />
      <nav className="desktop-nav" aria-label="Main navigation">
        <a href="/#services">Find services</a><a href="/#how-it-works">How it works</a><a href="/#providers">Become a provider</a><a href="/#about">About</a>
      </nav>
      <div className="nav-actions"><Link className="nav-login" to="/login">Log in</Link><Button href="/signup" className="nav-cta">Get started <ArrowRight size={16} aria-hidden="true" /></Button></div>
      <button ref={menuToggleRef} className="menu-toggle" aria-label="Open navigation menu" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(true)}><Menu /></button>
    </div>
    <div className={`mobile-nav-layer${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen} inert={!menuOpen}>
      <button className="mobile-nav-backdrop" type="button" aria-label="Close navigation menu" tabIndex={-1} onClick={close} />
      <aside id="mobile-navigation" ref={drawerRef} className="mobile-nav" role="dialog" aria-modal={menuOpen ? true : undefined} aria-label="Mobile navigation">
        <div className="mobile-nav-head">
          <Brand onClick={close} />
          <button ref={closeButtonRef} className="mobile-nav-close" type="button" aria-label="Close navigation menu" onClick={close}><X size={20} /></button>
        </div>
        <p className="mobile-nav-kicker">YOUR LOCAL SERVICE MARKETPLACE</p>
        <nav aria-label="Mobile navigation links">
          <a href="/#services" onClick={close}>Find services <ArrowRight size={17} aria-hidden="true" /></a>
          <a href="/#how-it-works" onClick={close}>How it works <ArrowRight size={17} aria-hidden="true" /></a>
          <a href="/#providers" onClick={close}>Become a provider <ArrowRight size={17} aria-hidden="true" /></a>
          <a href="/#about" onClick={close}>About AYOS <ArrowRight size={17} aria-hidden="true" /></a>
          <div className="mobile-nav-actions"><Link to="/login" onClick={close}>Log in <ArrowRight size={16} aria-hidden="true" /></Link><Button href="/signup" onClick={close}>Create an account <ArrowRight size={16} aria-hidden="true" /></Button></div>
        </nav>
        <p className="mobile-nav-signoff">Kailangan mo? <span>I-AYOS natin.</span></p>
      </aside>
    </div>
  </header>
}
