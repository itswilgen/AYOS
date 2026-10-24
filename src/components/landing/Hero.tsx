import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Pause, Play, Search, ShieldCheck } from 'lucide-react'
import Button from '../ui/Button'
import { useAuth } from '../../lib/auth/useAuth'
import { serviceSearchPath } from './landing-links'

const SLIDE_DURATION = 5600

const heroSlides = [
  {
    image: '/images/hero/01-find-local-help.webp',
    alt: 'A homeowner reviewing a local technician on her phone',
    step: 'Find help',
    title: 'Start with what you need.',
    detail: 'Explore skilled home and tech services near you.',
  },
  {
    image: '/images/hero/02-describe-the-job.webp',
    alt: 'A homeowner taking a photo of a leaking pipe to explain a repair',
    step: 'Describe the job',
    title: 'Show what needs fixing.',
    detail: 'A short note or a photo helps your provider come prepared.',
  },
  {
    image: '/images/hero/03-choose-with-confidence.webp',
    alt: 'A customer and family member reviewing service profiles together',
    step: 'Choose a pro',
    title: 'Pick the right person.',
    detail: 'Compare services, coverage, and reviews from finished jobs.',
  },
  {
    image: '/images/hero/04-get-the-work-done.webp',
    alt: 'An air-conditioning technician carefully servicing a home unit',
    step: 'Get it done',
    title: 'Track it until it’s sorted.',
    detail: 'Follow each step, then confirm the work once it’s complete.',
  },
  {
    image: '/images/hero/05-offer-your-skills.webp',
    alt: 'A local electrician checking a service request at his workbench',
    step: 'For providers',
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

const DEFAULT_PLACEHOLDER = 'What needs fixing? Try “aircon”'
const typedExamples = ['aircon cleaning', 'a leaking pipe', 'faulty wiring', 'a cracked phone screen', 'solar panels']

const pad = (value: number) => String(value).padStart(2, '0')
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Hero() {
  const navigate = useNavigate()
  const { user } = useAuth()
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
    <div className="lp-container lp-hero-inner">
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

        <p className="lp-hero-assurance lp-hero-reveal"><ShieldCheck size={18} aria-hidden="true" /> {!user && 'Free to join. '}Every provider is reviewed before they can take requests.</p>
      </div>
    </div>

    <div className="lp-hero-visual" role="region" aria-roledescription="carousel" aria-label="How AYOS works" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onFocusCapture={() => setHasFocus(true)} onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHasFocus(false)
    }}>
      <div className="lp-hero-frame">
        <div className="lp-hero-media">{heroSlides.map((slide, index) => (carousel.visited.includes(index) || index === nextIndex) && <img
          key={slide.image}
          className={index === activeIndex ? 'is-active' : undefined}
          src={slide.image}
          alt={index === activeIndex ? slide.alt : ''}
          aria-hidden={index === activeIndex ? undefined : true}
          width="1200"
          height="1500"
          fetchPriority={index === 0 ? 'high' : 'low'}
          decoding="async"
        />)}</div>
        <span className="lp-hero-curtain" aria-hidden="true" />
      </div>

      <div className="lp-ticket-wrap">
        <div className="lp-ticket">
          <div className="lp-ticket-body">
            <div className="lp-ticket-head"><span>{pad(activeIndex + 1)} · {activeSlide.step}</span><span className="lp-ticket-count">{pad(activeIndex + 1)}<span> / {pad(heroSlides.length)}</span></span></div>
            <div className="lp-ticket-copy" key={activeIndex} aria-live={autoplay ? 'off' : 'polite'} aria-atomic="true">
              <h2>{activeSlide.title.split(' ').map((word, index) => <Fragment key={`${word}-${index}`}>{index > 0 && ' '}<span className="lp-word" style={{ animationDelay: `${index * 55}ms` }}>{word}</span></Fragment>)}</h2>
              <p>{activeSlide.detail}</p>
            </div>
          </div>
          <div className="lp-ticket-foot">
            <div className="lp-ticket-dots" role="group" aria-label="Choose a slide">
              {heroSlides.map((slide, index) => <button type="button" key={slide.step} className={index === activeIndex ? 'is-active' : undefined} aria-label={`Show slide ${index + 1}: ${slide.title}`} aria-current={index === activeIndex ? 'true' : undefined} onClick={() => showSlide(index)}><span /></button>)}
            </div>
            {motionAllowed && <button type="button" className="lp-ticket-toggle" aria-label={userPaused ? 'Play slideshow' : 'Pause slideshow'} onClick={() => setUserPaused((paused) => !paused)}>
              {userPaused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
            </button>}
          </div>
          {autoplay && <span className="lp-ticket-progress" key={activeIndex} style={{ animationDuration: `${SLIDE_DURATION}ms` }} aria-hidden="true" />}
        </div>
      </div>
    </div>
  </section>
}
