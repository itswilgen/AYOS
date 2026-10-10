import { useLayoutEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function usePageMotion() {
  useLayoutEffect(() => {
    const motion = gsap.matchMedia()
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
        intro.from('.hero-copy .eyebrow', { y: 12, opacity: 0, duration: 0.42 })
          .from('.hero-copy h1', { y: 22, opacity: 0, duration: 0.58 }, '-=0.2')
          .from('.hero-copy > p', { y: 12, opacity: 0, duration: 0.42 }, '-=0.28')
          .from('.hero-actions > *', { y: 10, opacity: 0, duration: 0.38, stagger: 0.08 }, '-=0.2')
          .from('.hero-assurance', { y: 8, opacity: 0, duration: 0.34 }, '-=0.18')
          .from('.hero-visual', { x: 22, opacity: 0, duration: 0.76 }, '-=0.62')
          .from('.hero-visual img', { scale: 1.055, duration: 1.05, ease: 'power2.out' }, '<')
          .from('.hero-carousel-topline', { y: -8, opacity: 0, duration: 0.36 }, '-=0.56')
          .from('.hero-slide-caption', { y: 12, opacity: 0, duration: 0.42 }, '-=0.32')
          .from('.hero-carousel-nav', { y: 8, opacity: 0, duration: 0.36 }, '-=0.22')

        const revealGroup = (selector: string, trigger: string, distance = 18) => {
          const items = gsap.utils.toArray<HTMLElement>(selector)
          if (!items.length) return
          gsap.fromTo(items,
            { y: distance, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.55,
              stagger: 0.07,
              ease: 'power2.out',
              clearProps: 'transform,opacity,visibility',
              scrollTrigger: { trigger, start: 'top 83%', once: true },
            },
          )
        }

        revealGroup('.services-section .section-heading', '.services-section')
        revealGroup('.service-card:not(.service-card-clone)', '.service-carousel', 14)
        revealGroup('.how-section .section-heading, .step-row', '.how-section', 16)
        revealGroup('.trust-intro, .trust-item', '.trust-section', 16)
        revealGroup('.location-copy', '.location-section')
        revealGroup('.provider-sign, .provider-copy', '.provider-section')
        revealGroup('.final-cta-inner', '.final-cta', 14)
      })
      return () => context.revert()
    })
    return () => motion.revert()
  }, [])
}
