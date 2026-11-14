import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { LEGAL_META, legalDocuments, privacyPolicy, termsOfService, type LegalBlock, type LegalDocument, type LegalSection } from './legal-content'
import './legal.css'

const number = (index: number) => String(index + 1).padStart(2, '0')
const updatedLabel = new Date(`${LEGAL_META.updated}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })

/** Highlights the table-of-contents entry for the last section whose heading has scrolled past the header. */
function useActiveSection(sections: LegalSection[]) {
  const [active, setActive] = useState(sections[0]?.id ?? '')
  useEffect(() => {
    const nodes = sections.map((section) => document.getElementById(section.id)).filter((node): node is HTMLElement => Boolean(node))
    // Cheap enough to run on every scroll: a dozen rect reads, and React skips unchanged state.
    const update = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      const passed = nodes.filter((node) => node.getBoundingClientRect().top <= 160)
      const current = atBottom ? nodes[nodes.length - 1] : passed[passed.length - 1] ?? nodes[0]
      if (current) setActive(current.id)
    }
    const initial = requestAnimationFrame(update)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(initial)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [sections])
  return active
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <p>{block}</p>
  return <ul>{block.list.map((item) => <li key={item}>{item}</li>)}</ul>
}

function Contents({ sections, active, onPick }: { sections: LegalSection[]; active: string; onPick?: () => void }) {
  return <ol className="legal-toc-list">
    {sections.map((section, index) => <li key={section.id}>
      <a href={`#${section.id}`} className={active === section.id ? 'is-active' : undefined} aria-current={active === section.id ? 'location' : undefined} onClick={onPick}>
        <span className="legal-toc-num">{number(index)}</span>{section.title}
      </a>
    </li>)}
  </ol>
}

export default function LegalPage() {
  const { pathname, hash } = useLocation()
  const doc = pathname === privacyPolicy.path ? privacyPolicy : termsOfService

  useEffect(() => {
    document.title = `${doc.title} · AYOS`
    if (!hash) { window.scrollTo(0, 0); return }
    // The page loads lazily, so the browser's own jump to a #section link happens too early.
    // Wait for web fonts too, since they change heading heights.
    let cancelled = false
    void document.fonts.ready.then(() => {
      if (!cancelled) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'instant' })
    })
    return () => { cancelled = true }
  }, [doc, hash])

  // Keyed so the active section and the mobile contents menu reset when switching documents.
  return <LegalDocumentView key={doc.slug} doc={doc} />
}

function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  const other = doc === termsOfService ? privacyPolicy : termsOfService
  const active = useActiveSection(doc.sections)
  const [tocOpen, setTocOpen] = useState(false)

  return <main id="main-content" className="legal-page">
    <header className="legal-hero container">
      <span className="eyebrow"><span className="eyebrow-dot" aria-hidden="true" />AYOS legal</span>
      <nav className="legal-switch" aria-label="Legal documents">
        {legalDocuments.map((item) => <Link key={item.slug} to={item.path} aria-current={item === doc ? 'page' : undefined}>{item.title}</Link>)}
      </nav>
      <h1>{doc.title}</h1>
      <p className="legal-intro">{doc.intro}</p>
      <p className="legal-meta"><span>{LEGAL_META.version}</span><span aria-hidden="true">·</span><span>Last updated <time dateTime={LEGAL_META.updated}>{updatedLabel}</time></span></p>
      {LEGAL_META.status === 'draft' && <aside className="legal-draft" aria-label="Draft notice">
        <strong>Draft for review.</strong> This document describes how AYOS works today. It still needs legal review and may change before AYOS opens to the public.
      </aside>}
    </header>

    <div className="legal-body container">
      <aside className="legal-toc" aria-label={`${doc.navLabel} contents`}>
        <details className="legal-toc-mobile" open={tocOpen} onToggle={(event) => setTocOpen(event.currentTarget.open)}>
          <summary>On this page</summary>
          <Contents sections={doc.sections} active={active} onPick={() => setTocOpen(false)} />
        </details>
        <div className="legal-toc-desktop">
          <p className="legal-toc-title">On this page</p>
          <Contents sections={doc.sections} active={active} />
        </div>
      </aside>

      <article className="legal-article">
        {doc.sections.map((section, index) => <section key={section.id} id={section.id} className="legal-section" aria-labelledby={`${section.id}-title`}>
          <span className="legal-section-num" aria-hidden="true">{number(index)}</span>
          <h2 id={`${section.id}-title`}>{section.title}</h2>
          <p className="legal-summary"><span>In short</span>{section.summary}</p>
          <div className="legal-text">{section.body.map((block, blockIndex) => <Block key={blockIndex} block={block} />)}</div>
        </section>)}

        <footer className="legal-end">
          <div>
            <h2>Questions about this {doc.slug === 'terms' ? 'agreement' : 'policy'}?</h2>
            <p>Write to us and the AYOS team will get back to you.</p>
          </div>
          <div className="legal-end-actions">
            <a className="legal-end-mail" href={`mailto:${LEGAL_META.contactEmail}`}><Mail size={17} aria-hidden="true" />{LEGAL_META.contactEmail}</a>
            <Link to={other.path}>Read the {other.title}</Link>
          </div>
        </footer>
      </article>
    </div>
  </main>
}
