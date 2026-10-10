import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ShieldCheck } from 'lucide-react'
import { gsap } from 'gsap'
import Button from '../ui/Button'

const heroSlides = [
  {
    image: '/images/hero/01-find-local-help.webp',
    alt: 'A homeowner reviewing a local technician on her phone',
    step: '01 · FIND HELP',
    title: 'Start with what you need.',
    detail: 'Explore skilled home and tech services through AYOS.',
  },
  {
    image: '/images/hero/02-describe-the-job.webp',
    alt: 'A homeowner taking a photo of a leaking pipe to explain a repair',
    step: '02 · DESCRIBE THE JOB',
    title: 'Show us what needs fixing.',
    detail: 'A short note or photo can help explain the work.',
  },
  {
    image: '/images/hero/03-choose-with-confidence.webp',
    alt: 'A customer and family member reviewing service profiles together',
    step: '03 · REVIEW PROFILES',
    title: 'Choose the right person.',
    detail: 'Review provider profiles and service details before you connect.',
  },
  {
    image: '/images/hero/04-get-the-work-done.webp',
    alt: 'An air-conditioning technician carefully servicing a home unit',
    step: '04 · GET IT DONE',
    title: 'Take the next step.',
    detail: 'Connect with your chosen provider and arrange the work.',
  },
  {
    image: '/images/hero/05-offer-your-skills.webp',
    alt: 'A local electrician checking a service request at his workbench',
    step: 'FOR SERVICE PROVIDERS',
    title: 'Bring your skills to AYOS.',
    detail: 'Build a professional profile and meet customers looking for your skills.',
  },
]

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [hasFocus, setHasFocus] = useState(false)
  const [motionAllowed, setMotionAllowed] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !document.hidden)
  const carouselRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)
  const isInitialSlide = useRef(true)
  const activeSlide = heroSlides[activeIndex]

  useEffect(() => {
    const nextSlide = new Image()
    nextSlide.src = heroSlides[(activeIndex + 1) % heroSlides.length].image
  }, [activeIndex])

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
    if (!motionAllowed || isHovered || hasFocus) return

    const intervalId = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % heroSlides.length)
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [activeIndex, hasFocus, isHovered, motionAllowed])

  useLayoutEffect(() => {
    if (isInitialSlide.current) {
      isInitialSlide.current = false
      return
    }

    const motion = gsap.matchMedia(carouselRef)
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      if (imageRef.current) {
        gsap.fromTo(imageRef.current, { autoAlpha: 0.45, scale: 1.025 }, { autoAlpha: 1, scale: 1, duration: 0.56, ease: 'power2.out' })
      }
      if (captionRef.current) {
        gsap.fromTo(captionRef.current, { y: 9, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.38, ease: 'power2.out', delay: 0.08 })
      }
    })

    return () => motion.revert()
  }, [activeIndex])

  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-inner container">
      <div className="hero-copy motion-hero">
        <span className="eyebrow"><span className="eyebrow-dot" /> Skilled help, close to home</span>
        <h1 id="hero-title">The right help,<br /><span>right around you.</span></h1>
        <p>From a leaking tap to a laptop that won’t start, find skilled people in your community who can help get it sorted.</p>
        <div className="hero-actions"><Button href="#services">Find a service <ArrowRight size={17} aria-hidden="true" /></Button><Button href="#providers" variant="text">I offer a service <ArrowRight size={16} aria-hidden="true" /></Button></div>
        <div className="hero-assurance"><span className="assurance-icon"><ShieldCheck size={17} aria-hidden="true" /></span><span>Local know-how. Clear provider profiles.</span></div>
      </div>

      <div className="hero-visual motion-hero" ref={carouselRef} role="region" aria-roledescription="carousel" aria-label="How AYOS works and how providers can join" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onFocusCapture={() => setHasFocus(true)} onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHasFocus(false)
      }}>
        <div className="hero-slide-frame" aria-live="polite" aria-atomic="true">
          <img ref={imageRef} src={activeSlide.image} alt={activeSlide.alt} width="1200" height="1500" fetchPriority={activeIndex === 0 ? 'high' : 'auto'} decoding="async" />
          <div className="hero-carousel-topline" aria-hidden="true"><span>THE AYOS WAY</span><span>{String(activeIndex + 1).padStart(2, '0')} / 05</span></div>
          <div className="hero-slide-caption" ref={captionRef}>
            <span>{activeSlide.step}</span>
            <h2>{activeSlide.title}</h2>
            <p>{activeSlide.detail}</p>
          </div>
        </div>
        <div className="hero-carousel-nav">
          <div className="hero-carousel-dots" role="group" aria-label="Choose a hero slide">
            {heroSlides.map((slide, index) => <button className={index === activeIndex ? 'is-active' : ''} type="button" key={slide.step} aria-label={`Show slide ${index + 1}: ${slide.title}`} aria-current={index === activeIndex ? 'true' : undefined} onClick={() => setActiveIndex(index)}><span /></button>)}
          </div>
        </div>
      </div>
    </div>
    <a href="#services" className="hero-scroll container" aria-label="Scroll to service categories"><ArrowDown size={15} aria-hidden="true" /> Explore services</a>
  </section>
}
