import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, HandCoins, LockKeyhole, Pause, Play, Search } from 'lucide-react'
import Button from '../ui/Button'
import { serviceSearchPath } from './landing-links'

const SLIDE_DURATION = 5600

/* Each slide pairs a photo with the job status a customer would see in AYOS at that step.
   `focus` is the photo's crop point as a full-bleed background (portrait photos on a wide hero), so faces stay in frame. */
const heroSlides: { image: string; alt: string; focus: string; step: string; status: string; tone: 'sky' | 'green' | 'orange'; title: string; detail: string }[] = [
  {
    image: '/images/hero/01-find-local-help.webp',
    focus: '70% 30%',
    alt: 'A homeowner reviewing a local technician on her phone',
    step: 'Find help',
    status: 'Searching near you',
    tone: 'sky',
    title: 'Start with what you need.',
    detail: 'Explore skilled home and tech services near you.',
  },
  {
    image: '/images/hero/02-describe-the-job.webp',
    focus: '70% 40%',
    alt: 'A homeowner taking a photo of a leaking pipe to explain a repair',
    step: 'Describe the job',
    status: 'Request sent',
    tone: 'sky',
    title: 'Show what needs fixing.',
    detail: 'A short note or a photo helps your provider come prepared.',
  },
  {
    image: '/images/hero/03-choose-with-confidence.webp',
    focus: '70% 35%',
    alt: 'A customer and family member reviewing service profiles together',
    step: 'Choose a pro',
    status: 'Accepted by provider',
    tone: 'green',
    title: 'Pick the right person.',
    detail: 'Compare services, coverage, and reviews from finished jobs.',
  },
  {
    image: '/images/hero/04-get-the-work-done.webp',
    focus: '70% 0%',
    alt: 'An air-conditioning technician carefully servicing a home unit',
    step: 'Get it done',
    status: 'Work in progress',
    tone: 'orange',
    title: 'Track it until it’s sorted.',
    detail: 'Follow each step, then confirm the work once it’s complete.',
  },
  {
    image: '/images/hero/05-offer-your-skills.webp',
    focus: '70% 6%',
    alt: 'A local electrician checking a service request at his workbench',
    step: 'For providers',
    status: 'New request nearby',
    tone: 'sky',
    title: 'Bring your skills to AYOS.',
    detail: 'Build a profile and meet customers who need what you do.',
  },
]

const popularSearches = [
  { label: 'Aircon cleaning', service: 'Aircon' },
  { label: 'Leaking pipe', service: 'Plumbing' },
  { label: 'Faulty wiring', service: 'Electrical' },
  { label: 'Cracked phone screen', service: 'Phone repair' },
]

const heroFacts = [
  { icon: BadgeCheck, title: 'Reviewed providers', detail: 'Checked before taking requests' },
  { icon: HandCoins, title: 'No booking fees', detail: 'Agree on the price directly' },
  { icon: LockKeyhole, title: 'Private contact', detail: 'Hidden until you book' },
]

const DEFAULT_PLACEHOLDER = 'What needs fixing? Try “aircon”'
const typedExamples = ['aircon cleaning', 'a leaking pipe', 'faulty wiring', 'a cracked phone screen', 'solar panels']

const pad = (value: number) => String(value).padStart(2, '0')
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Hero() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [carousel, setCarousel] = useState({ index: 0, visited: [0] })
  const [userPaused, setUserPaused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [hasFocus, setHasFocus] = useState(false)
  const [motionAllowed, setMotionAllowed] = useState(() => !prefersReducedMotion() && !document.hidden)
  const autoplay = motionAllowed && !userPaused && !isHovered && !hasFocus
  const activeIndex = carousel.index
  const activeSlide = heroSlides[activeIndex]
  const nextIndex = (activeIndex + 1) % heroSlides.length

  const showSlide = (index: number) => setCarousel((current) => ({
    index,
    visited: current.visited.includes(index) ? current.visited : [...current.visited, index],
  }))

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => setMotionAllowed(!reducedMotionQuery.matches && !document.hidden)
    reducedMotionQuery.addEventListener('change', updateMotionPreference)
    document.addEventListener('visibilitychange', updateMotionPreference)
    return () => {
      reducedMotionQuery.removeEventListener('change', updateMotionPreference)
      document.removeEventListener('visibilitychange', updateMotionPreference)
    }
  }, [])

  useEffect(() => {
    if (!autoplay) return
    const timeoutId = window.setTimeout(() => {
      setCarousel((current) => {
        const index = (current.index + 1) % heroSlides.length
        return { index, visited: current.visited.includes(index) ? current.visited : [...current.visited, index] }
      })
    }, SLIDE_DURATION)
    return () => window.clearTimeout(timeoutId)
  }, [autoplay, activeIndex])

  /* Types real example searches into the placeholder. Written to the DOM directly so the hero doesn't re-render per keystroke. */
  const typePlaceholder = motionAllowed && !inputFocused && !query
  useEffect(() => {
    const input = inputRef.current
    if (!typePlaceholder || !input) return
    let timeoutId = 0
    let example = 0
    let length = 0
    let deleting = false
    const tick = () => {
      const phrase = typedExamples[example]
      length += deleting ? -1 : 1
      input.placeholder = length > 0 ? `Try “${phrase.slice(0, length)}”` : 'What needs fixing?'
      let delay = deleting ? 26 : 64
      if (!deleting && length === phrase.length) {
        deleting = true
        delay = 1700
      } else if (deleting && length === 0) {
        deleting = false
        example = (example + 1) % typedExamples.length
        delay = 700
      }
      timeoutId = window.setTimeout(tick, delay)
    }
    timeoutId = window.setTimeout(tick, 2600)
    return () => {
      window.clearTimeout(timeoutId)
      input.placeholder = DEFAULT_PLACEHOLDER
    }
  }, [typePlaceholder])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const service = query.trim()
    if (service) {
      navigate(serviceSearchPath(service))
      return
    }
    document.getElementById('services')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }

  return <section className="lp-hero" aria-labelledby="hero-title">
    {/* The slideshow fills the whole hero; a light gradient from the left keeps the copy readable. */}
    <div className="lp-hero-scene">
      <div className="lp-hero-media">{heroSlides.map((slide, index) => (carousel.visited.includes(index) || index === nextIndex) && <img
        key={slide.image}
        className={index === activeIndex ? 'is-active' : undefined}
        src={slide.image}
        style={{ objectPosition: slide.focus }}
        alt={index === activeIndex ? slide.alt : ''}
        aria-hidden={index === activeIndex ? undefined : true}
        width="1200"
        height="1500"
        fetchPriority={index === 0 ? 'high' : 'low'}
        decoding="async"
      />)}</div>
      <span className="lp-hero-shade" aria-hidden="true" />
    </div>

    <div className="lp-container lp-hero-grid">
      <div className="lp-hero-copy">
        <p className="lp-kicker lp-hero-kicker">Skilled help, close to home</p>
        <h1 id="hero-title" className="lp-hero-title" aria-label="The right help, right around you.">
          <span className="lp-line" aria-hidden="true"><span>The right help,</span></span>
          <span className="lp-line lp-line-accent" aria-hidden="true"><span className="lp-highlight">right around you.</span></span>
        </h1>
        <p className="lp-hero-lede lp-hero-reveal">From a leaking tap to a laptop that won’t start, find skilled people in your community who can get it sorted.</p>

        <form className="lp-search lp-hero-reveal" role="search" aria-label="Find a service" onSubmit={submit}>
          <Search size={20} aria-hidden="true" />
          <label className="sr-only" htmlFor="hero-service">What needs fixing?</label>
          <input ref={inputRef} id="hero-service" type="search" autoComplete="off" enterKeyHint="search" placeholder={DEFAULT_PLACEHOLDER} value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)} />
          <Button type="submit">Find help <ArrowRight size={17} aria-hidden="true" /></Button>
        </form>

        <div className="lp-popular lp-hero-reveal">
          <span className="lp-popular-label" id="popular-label">Popular</span>
          <ul aria-labelledby="popular-label">
            {popularSearches.map((item) => <li key={item.label}><Link className="lp-chip" to={serviceSearchPath(item.service)}>{item.label}</Link></li>)}
          </ul>
        </div>

        <ul className="lp-hero-facts lp-hero-reveal" aria-label="Why use AYOS">
          {heroFacts.map(({ icon: Icon, title, detail }) => <li key={title}>
            <Icon size={18} aria-hidden="true" />
            <span><strong>{title}</strong>{detail}</span>
          </li>)}
        </ul>
      </div>

      <div className="lp-hero-visual" role="region" aria-roledescription="carousel" aria-label="How AYOS works" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onFocusCapture={() => setHasFocus(true)} onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHasFocus(false)
      }}>
        <p className={`lp-hero-status is-${activeSlide.tone}`} key={`status-${activeIndex}`} aria-hidden="true">
          <span className="lp-hero-status-dot" />{activeSlide.status}
        </p>
        <div className="lp-hero-card">
          <div className="lp-hero-caption" key={`caption-${activeIndex}`} aria-live={autoplay ? 'off' : 'polite'} aria-atomic="true">
            <span className="lp-hero-caption-step">{pad(activeIndex + 1)} — {activeSlide.step}</span>
            <h2>{activeSlide.title.split(' ').map((word, index) => <Fragment key={`${word}-${index}`}>{index > 0 && ' '}<span className="lp-word" style={{ animationDelay: `${index * 55}ms` }}>{word}</span></Fragment>)}</h2>
            <p>{activeSlide.detail}</p>
          </div>
          <div className="lp-hero-rail">
            <ol role="group" aria-label="Choose a slide">
              {heroSlides.map((slide, index) => <li key={slide.step}>
                <button type="button" className={index === activeIndex ? 'is-active' : index < activeIndex ? 'is-past' : undefined} aria-label={`Show slide ${index + 1}: ${slide.title}`} aria-current={index === activeIndex ? 'true' : undefined} onClick={() => showSlide(index)}>
                  <span className="lp-rail-track" aria-hidden="true">
                    {index === activeIndex && <span className={`lp-rail-fill${autoplay ? ' is-running' : ''}`} key={`fill-${activeIndex}-${autoplay}`} style={autoplay ? { animationDuration: `${SLIDE_DURATION}ms` } : undefined} />}
                  </span>
                  <span className="lp-rail-num" aria-hidden="true">{pad(index + 1)}</span>
                </button>
              </li>)}
            </ol>
            {motionAllowed && <button type="button" className="lp-rail-toggle" aria-label={userPaused ? 'Play slideshow' : 'Pause slideshow'} onClick={() => setUserPaused((paused) => !paused)}>
              {userPaused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
            </button>}
          </div>
        </div>
      </div>
    </div>
  </section>
}
