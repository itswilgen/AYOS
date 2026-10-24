import { useLayoutEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText)

const once = (trigger: gsap.DOMTarget, start = 'top 82%'): ScrollTrigger.Vars => ({ trigger, start, once: true })

/** Landing-page choreography. Every effect is skipped under reduced motion, leaving the final static layout. */
export function usePageMotion() {
  useLayoutEffect(() => {
    const motion = gsap.matchMedia()
    motion.add({ animate: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 861px)' }, (context) => {
      const { animate, wide } = context.conditions as { animate: boolean; wide: boolean }
      if (!animate) return

      // The headline's accessible name lives on the <h1>, so the split letters stay hidden from assistive tech.
      const headline = SplitText.create('.lp-hero-title .lp-line > span', { type: 'words,chars', aria: 'none' })
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .fromTo('.lp-hero-curtain', { autoAlpha: 1, xPercent: 0 }, { xPercent: 101, duration: 1.05, ease: 'expo.inOut' }, 0.1)
        .from('.lp-hero-media', { scale: 1.14, duration: 1.7 }, 0.1)
        .fromTo('.lp-hero-kicker', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut', clearProps: 'clipPath' }, 0)
        .from(headline.chars, { yPercent: 118, rotate: 9, transformOrigin: '0% 100%', duration: 1, stagger: 0.022 }, 0.12)
        .fromTo('.lp-highlight', { '--sweep': 0 }, { '--sweep': 1, duration: 0.75, ease: 'expo.inOut' }, 0.85)
        .from('.lp-hero-reveal', { y: 14, autoAlpha: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out' }, 0.45)
        .from('.lp-ticket-wrap', { y: 28, autoAlpha: 0, duration: 0.85 }, 0.9)

      // Section titles rise line by line from a mask; the rest of each block follows.
      gsap.utils.toArray<HTMLElement>('.lp-title, .lp-cta-title').forEach((title) => {
        SplitText.create(title, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (split) => gsap.from(split.lines, { yPercent: 108, duration: 1, stagger: 0.11, ease: 'expo.out', scrollTrigger: once(title, 'top 86%') }),
        })
      })
      gsap.utils.toArray<HTMLElement>('.lp-reveal').forEach((block) => {
        const title = block.querySelector('.lp-title, .lp-cta-title')
        const parts = Array.from(block.children)
          .flatMap((child) => (title && child !== title && child.contains(title) ? Array.from(child.children) : [child]))
          .filter((child) => child !== title)
        gsap.from(parts, { y: 16, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, delay: 0.12, scrollTrigger: once(block) })
      })

      gsap.from('.lp-service', {
        y: 28, autoAlpha: 0, duration: 0.8, ease: 'expo.out',
        stagger: { each: 0.06, grid: 'auto', from: 'start' },
        scrollTrigger: once('.lp-service-grid'),
      })

      gsap.from('.lp-step', { y: 20, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1, scrollTrigger: once('.lp-steps') })
      const nodes = gsap.utils.toArray<HTMLElement>('.lp-step-node')
      const fills = gsap.utils.toArray<HTMLElement>('.lp-step-line-fill')
      gsap.set(nodes.slice(1), { '--on': 0 })
      gsap.set(fills, { '--fill': 0 })
      const rail = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.lp-steps', start: wide ? 'top 62%' : 'top 70%', end: wide ? 'bottom 72%' : 'bottom 62%', scrub: 0.6 },
      })
      fills.forEach((fill, index) => {
        rail.to(fill, { '--fill': 1, duration: 1 }).to(nodes[index + 1], { '--on': 1, duration: 0.18 })
      })

      gsap.from('.lp-trust-item', { y: 18, autoAlpha: 0, duration: 0.75, ease: 'power3.out', stagger: 0.08, scrollTrigger: once('.lp-trust-list') })

      gsap.timeline({ scrollTrigger: once('.lp-map', 'top 76%') })
        .from('.lp-map', { y: 24, autoAlpha: 0, duration: 0.8, ease: 'power3.out' })
        .from('.lp-map-ring', { scale: 0.2, autoAlpha: 0, duration: 1.2, ease: 'expo.out' }, 0.35)
        .from('.lp-map-pin-card', { y: -28, autoAlpha: 0, duration: 0.7, ease: 'back.out(2.4)' }, 0.45)
        .from('.lp-map-chip', { y: 14, autoAlpha: 0, duration: 0.6, ease: 'power3.out', stagger: 0.12 }, 0.75)

      gsap.timeline({ scrollTrigger: once('.lp-providers-panel', 'top 78%') })
        .from('.lp-providers-panel', { y: 24, autoAlpha: 0, duration: 0.8, ease: 'power3.out' })
        .from('.lp-providers-panel img', { yPercent: 10, autoAlpha: 0, duration: 1, ease: 'expo.out' }, 0.2)
    })
    return () => motion.revert()
  }, [])
}
