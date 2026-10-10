import { useCallback, useEffect, useRef, useState } from 'react'
import { Cable, ChevronLeft, ChevronRight, Hammer, Laptop, Refrigerator, Snowflake, Smartphone, Sun, Video, Waves } from 'lucide-react'

const services = [
  {
    name: 'Electrical',
    detail: 'Help with lighting, outlets, wiring, and common electrical repairs.',
    image: '/images/services/electrical.webp',
    alt: 'Electrician repairing an outlet in a home',
    icon: Cable,
    tone: 'service-card-blue',
  },
  {
    name: 'Plumbing',
    detail: 'Leaks, faucets, pipes, and water flow problems around the home.',
    image: '/images/services/plumbing.webp',
    alt: 'Plumber tightening a pipe below a kitchen sink',
    icon: Waves,
    tone: 'service-card-orange',
  },
  {
    name: 'Carpentry',
    detail: 'Cabinet, door, fixture, and everyday woodwork repairs.',
    image: '/images/services/carpentry.webp',
    alt: 'Carpenter measuring a wooden cabinet panel',
    icon: Hammer,
    tone: 'service-card-neutral',
  },
  {
    name: 'Aircon service',
    detail: 'Cleaning and repair for split-type air-conditioning units.',
    image: '/images/services/aircon.webp',
    alt: 'Technician cleaning a wall-mounted air-conditioning unit',
    icon: Snowflake,
    tone: 'service-card-blue',
  },
  {
    name: 'Appliance repair',
    detail: 'Diagnosis and repair for the appliances your home relies on.',
    image: '/images/services/appliance-repair.webp',
    alt: 'Technician diagnosing a refrigerator in a home kitchen',
    icon: Refrigerator,
    tone: 'service-card-neutral',
  },
  {
    name: 'Phone repair',
    detail: 'Screen, battery, and other common smartphone repairs.',
    image: '/images/services/phone-repair.webp',
    alt: 'Phone technician repairing a smartphone at a workbench',
    icon: Smartphone,
    tone: 'service-card-orange',
  },
  {
    name: 'Computer repair',
    detail: 'Troubleshooting and repair for laptops and desktop computers.',
    image: '/images/services/computer-repair.webp',
    alt: 'Computer technician repairing an open laptop',
    icon: Laptop,
    tone: 'service-card-neutral',
  },
  {
    name: 'Solar installation',
    detail: 'Residential solar panel planning and installation services.',
    image: '/images/services/solar-installation.webp',
    alt: 'Solar installer securing a panel on a residential rooftop',
    icon: Sun,
    tone: 'service-card-blue',
  },
  {
    name: 'CCTV installation',
    detail: 'Camera installation and setup for homes and small businesses.',
    image: '/images/services/cctv-installation.webp',
    alt: 'Installer fitting a security camera beside a home entrance',
    icon: Video,
    tone: 'service-card-neutral',
  },
]

export default function ServicesSection() {
  const carouselRef = useRef<HTMLDivElement>(null)
  const interactionTimerRef = useRef<number | null>(null)
  const [canScrollBack, setCanScrollBack] = useState(false)
  const [canScrollForward, setCanScrollForward] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const [isInView, setIsInView] = useState(false)

  const updateControls = useCallback(() => {
    const carousel = carouselRef.current
    if (!carousel) return
    const maxScroll = carousel.scrollWidth - carousel.clientWidth
    setCanScrollBack(carousel.scrollLeft > 1)
    setCanScrollForward(carousel.scrollLeft < maxScroll - 1)
    const carouselCenter = carousel.getBoundingClientRect().left + carousel.clientWidth / 2
    const cards = Array.from(carousel.querySelectorAll<HTMLElement>('.service-card')).filter((card) => card.getClientRects().length > 0)
    const nearestIndex = cards.reduce((nearest, card, index) => {
      const cardCenter = card.getBoundingClientRect().left + card.offsetWidth / 2
      const nearestCenter = cards[nearest].getBoundingClientRect().left + cards[nearest].offsetWidth / 2
      return Math.abs(cardCenter - carouselCenter) < Math.abs(nearestCenter - carouselCenter) ? index : nearest
    }, 0)
    const serviceIndex = nearestIndex % services.length
    setActiveIndex((current) => current === serviceIndex ? current : serviceIndex)
  }, [])

  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return
    const resizeObserver = new ResizeObserver(updateControls)
    const intersectionObserver = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { threshold: 0.15 })
    resizeObserver.observe(carousel)
    intersectionObserver.observe(carousel)
    carousel.addEventListener('scroll', updateControls, { passive: true })
    updateControls()
    return () => {
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      carousel.removeEventListener('scroll', updateControls)
    }
  }, [updateControls])

  const moveCarousel = useCallback((direction: -1 | 1) => {
    const carousel = carouselRef.current
    const firstCard = carousel?.querySelector<HTMLElement>('.service-card')
    if (!carousel || !firstCard) return
    const gap = Number.parseFloat(getComputedStyle(carousel).columnGap) || 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    carousel.scrollBy({ left: direction * (firstCard.offsetWidth + gap), behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [])

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 600px)')
    const desktopQuery = window.matchMedia('(min-width: 1101px)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let intervalId = 0
    let frameId = 0

    const resetInterval = () => {
      window.clearInterval(intervalId)
      window.cancelAnimationFrame(frameId)
      if (!isInView || isHovered || isFocused || isInteracting || reducedMotionQuery.matches || document.visibilityState !== 'visible') return

      if (desktopQuery.matches) {
        const carousel = carouselRef.current
        if (!carousel) return
        let previousTime = 0
        const glide = (time: number) => {
          if (document.visibilityState !== 'visible') {
            previousTime = 0
            return
          }
          if (previousTime === 0) previousTime = time
          const delta = Math.min(time - previousTime, 50)
          carousel.scrollLeft += delta * 0.018
          previousTime = time

          const firstCard = carousel.querySelector<HTMLElement>('.service-card:not(.service-card-clone)')
          const firstClone = carousel.querySelector<HTMLElement>('.service-card-clone')
          if (firstCard && firstClone) {
            const loopDistance = firstClone.offsetLeft - firstCard.offsetLeft
            if (loopDistance > 0 && carousel.scrollLeft >= loopDistance) {
              carousel.scrollLeft -= loopDistance
            }
          }
          frameId = window.requestAnimationFrame(glide)
        }
        frameId = window.requestAnimationFrame(glide)
        return
      }

      intervalId = window.setInterval(() => {
        if (document.visibilityState !== 'visible') return
        const carousel = carouselRef.current
        if (!carousel) return
        const maxScroll = carousel.scrollWidth - carousel.clientWidth
        if (carousel.scrollLeft >= maxScroll - 1) {
          carousel.scrollTo({ left: 0, behavior: 'smooth' })
        } else {
          moveCarousel(1)
        }
      }, mobileQuery.matches ? 3000 : 7000)
    }

    resetInterval()
    mobileQuery.addEventListener('change', resetInterval)
    desktopQuery.addEventListener('change', resetInterval)
    reducedMotionQuery.addEventListener('change', resetInterval)
    document.addEventListener('visibilitychange', resetInterval)
    return () => {
      window.clearInterval(intervalId)
      window.cancelAnimationFrame(frameId)
      mobileQuery.removeEventListener('change', resetInterval)
      desktopQuery.removeEventListener('change', resetInterval)
      reducedMotionQuery.removeEventListener('change', resetInterval)
      document.removeEventListener('visibilitychange', resetInterval)
    }
  }, [isFocused, isHovered, isInView, isInteracting, moveCarousel])

  useEffect(() => () => {
    if (interactionTimerRef.current !== null) window.clearTimeout(interactionTimerRef.current)
  }, [])

  const handleCarouselPointerDown = () => {
    setIsInteracting(true)
    if (interactionTimerRef.current !== null) window.clearTimeout(interactionTimerRef.current)
  }

  const handleCarouselPointerUp = () => {
    if (interactionTimerRef.current !== null) window.clearTimeout(interactionTimerRef.current)
    interactionTimerRef.current = window.setTimeout(() => setIsInteracting(false), 4500)
  }

  return <section id="services" className="section services-section" onFocusCapture={() => setIsFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocused(false) }}>
    <div className="container">
      <div className="section-heading section-heading-row">
        <div><span className="eyebrow">A hand for the everyday</span><h2>What needs doing?</h2></div>
        <div className="service-heading-aside">
          <p>Find practical help for home repairs, device troubles, and the projects you’ve been meaning to finish.</p>
        </div>
      </div>
      <div className="service-carousel-frame">
        <div className="service-carousel-controls" role="group" aria-label="Service carousel controls">
          <button className="service-carousel-previous" type="button" aria-label="Previous services" aria-controls="service-cards" disabled={!canScrollBack} onClick={() => moveCarousel(-1)}><ChevronLeft size={22} aria-hidden="true" /></button>
          <button className="service-carousel-next" type="button" aria-label="Next services" aria-controls="service-cards" disabled={!canScrollForward} onClick={() => moveCarousel(1)}><ChevronRight size={22} aria-hidden="true" /></button>
        </div>
        <div id="service-cards" ref={carouselRef} className="service-carousel" role="region" aria-roledescription="carousel" aria-label="AYOS service categories" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onPointerDown={handleCarouselPointerDown} onPointerUp={handleCarouselPointerUp} onPointerCancel={handleCarouselPointerUp}>
          {[...services, ...services].map(({ name, detail, image, alt, icon: Icon, tone }, position) => {
            const index = position % services.length
            const isClone = position >= services.length
            const titleId = `service-title-${index}`
            return <article className={`service-card ${tone}${activeIndex === index ? ' is-active' : ''}${isClone ? ' service-card-clone' : ''}`} key={`${name}-${isClone ? 'clone' : 'original'}`} aria-hidden={isClone} aria-labelledby={isClone ? undefined : titleId}>
              <img src={image} alt={isClone ? '' : alt} width="960" height="720" loading="lazy" decoding="async" />
              <span className="service-card-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <span className="service-card-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.8} /></span>
              <div className="service-card-caption">
                <h3 id={isClone ? undefined : titleId}>{name}</h3>
                <p>{detail}</p>
              </div>
            </article>
          })}
        </div>
      </div>
      <p className="service-note">More skilled services are on the way.</p>
    </div>
  </section>
}
