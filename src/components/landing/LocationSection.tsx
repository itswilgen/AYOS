import { useLayoutEffect, useRef } from 'react'
import { ArrowRight, MapPin, MapPinned, Wrench } from 'lucide-react'
import { gsap } from 'gsap'
import Button from '../ui/Button'

export default function LocationSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const motion = gsap.matchMedia(section)
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        const cards = gsap.utils.toArray<HTMLElement>('.area-label, .area-chip')
        const reveal = gsap.timeline({
          scrollTrigger: { trigger: section, start: 'top 78%', once: true },
          onComplete: () => context.add(() => {
            cards.forEach((card, index) => {
              gsap.to(card, {
                y: index === 1 ? 4 : -4,
                duration: 2.5 + index * 0.25,
                delay: index * 0.16,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
              })
            })
          }),
        })

        cards.forEach((card, index) => {
          const fromRight = index === 1
          reveal.fromTo(card,
            { x: fromRight ? 20 : -16, y: 18, autoAlpha: 0, scale: 0.96, rotation: fromRight ? 1 : -1 },
            {
              x: 0,
              y: 0,
              autoAlpha: 1,
              scale: 1,
              rotation: 0,
              duration: 0.68,
              ease: 'power3.out',
              clearProps: 'transform,opacity,visibility',
            },
            index * 0.14,
          )
        })
      }, section)

      return () => context.revert()
    })

    return () => motion.revert()
  }, [])

  return <section ref={sectionRef} className="location-section">
    <div className="container location-layout">
      <div className="location-copy">
        <span className="eyebrow">Closer is more useful</span>
        <h2>Find help that serves <em>your area.</em></h2>
        <p>AYOS is being built around local service areas—so you can look for the skills you need in the places providers actually cover.</p>
        <Button href="/signup" variant="secondary">Get started <ArrowRight size={16} aria-hidden="true" /></Button>
      </div>

      <div className="area-art" role="group" aria-label="Illustrative service discovery map">
        <div className="area-label"><MapPin size={16} fill="currentColor" aria-hidden="true" /><span>Tanjay City</span><small>Example location</small></div>
        <div className="area-chip area-chip-one"><span><Wrench size={15} aria-hidden="true" /></span><div className="area-chip-copy"><span>Electricians</span><small>Service category</small></div></div>
        <div className="area-chip area-chip-two"><span><MapPinned size={15} aria-hidden="true" /></span><div className="area-chip-copy"><span>Local providers</span><small>Declared service areas</small></div></div>
      </div>
    </div>
  </section>
}
