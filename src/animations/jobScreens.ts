import { gsap } from 'gsap'

/**
 * "Follow one job": each How-it-works screen plays its moment once, from the empty state into the finished
 * state that JobScreen.tsx draws. Timelines are created paused; `from` values apply at once, so a screen
 * waits empty until its turn. Only called when motion is allowed: otherwise the finished screens stay still.
 */

/** A quick tap: the button dips and comes back, like a finger press. */
const tap = (target: Element[]) => ({ targets: target, vars: { scale: 0.94, duration: 0.11, yoyo: true, repeat: 1, ease: 'power1.inOut' } })

const beats: Record<string, (q: (selector: string) => Element[], tl: gsap.core.Timeline) => void> = {
  // 01 Describe the job: pick Plumbing, type the note, add a photo, send.
  1: (q, tl) => {
    const press = tap(q('[data-job="press"]'))
    tl.fromTo(q('[data-job="pick"]'), { '--pick': 0 }, { '--pick': 1, duration: 0.25 }, 0.45)
      .fromTo(q('[data-job="typed"]'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'steps(18)' }, 0.8)
      .from(q('[data-job="photo"]'), { scale: 0.4, autoAlpha: 0, duration: 0.4, ease: 'back.out(2.2)' }, 1.8)
      .from(q('[data-job="photo-note"]'), { x: -6, autoAlpha: 0, duration: 0.3 }, 1.95)
      .to(press.targets, press.vars, 2.4)
  },
  // 02 Choose a local pro: providers arrive, Jun is chosen, request sent.
  2: (q, tl) => {
    const press = tap(q('[data-job="press"]'))
    tl.from(q('[data-job="row"]'), { y: 10, autoAlpha: 0, duration: 0.45, stagger: 0.12, ease: 'power3.out' }, 0.4)
      .fromTo(q('.lp-job-pro.is-picked'), { '--pick': 0 }, { '--pick': 1, duration: 0.3 }, 1.15)
      .from(q('[data-job="check"]'), { scale: 0, duration: 0.35, ease: 'back.out(3)' }, 1.25)
      .to(press.targets, press.vars, 1.8)
  },
  // 03 Track it to done: the ticket moves Sent → Accepted → Scheduled → In progress; Jun writes.
  3: (q, tl) => {
    tl.from(q('[data-job="dot"]'), { scaleX: 0, duration: 0.3, stagger: 0.32, ease: 'power2.inOut' }, 0.45)
      .from(q('[data-job="status"]'), { y: 4, autoAlpha: 0, duration: 0.3 }, 1.6)
      .from(q('[data-job="bubble"]'), { y: 10, scale: 0.9, autoAlpha: 0, transformOrigin: '0% 100%', duration: 0.45, ease: 'back.out(2)' }, 1.95)
  },
  // 04 Confirm and review: confirm the work, give five stars.
  4: (q, tl) => {
    const press = tap(q('[data-job="press"]'))
    tl.to(press.targets, press.vars, 0.55)
      .fromTo(q('.lp-job-button.is-confirmed'), { '--done': 0 }, { '--done': 1, duration: 0.3 }, 0.78)
      .fromTo(q('[data-job="before"]'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.2 }, 0.78)
      .from(q('[data-job="after"]'), { autoAlpha: 0, y: 4, duration: 0.25 }, 0.88)
      .from(q('[data-job="star"]'), { scale: 0, duration: 0.3, stagger: 0.1, ease: 'back.out(3)' }, 1.25)
      .from(q('[data-job="word"]'), { autoAlpha: 0, x: -6, duration: 0.3 }, 1.8)
      .from(q('[data-job="thanks"]'), { autoAlpha: 0, duration: 0.4 }, 2)
  },
}

/** The paused moment for one screen (an element with data-job-screen="1".."4"). */
export function jobScreenTimeline(screen: HTMLElement): gsap.core.Timeline {
  const q = gsap.utils.selector(screen)
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } })
  // The phone rises into its card first, so each moment starts with "here is the next screen".
  tl.from(q('.lp-job-phone'), { yPercent: 14, duration: 0.6, ease: 'expo.out' }, 0)
  beats[screen.dataset.jobScreen ?? '']?.(q, tl)
  return tl
}

/** Plays a moment the first time only: scrolling back up never replays or rewinds it. */
export function playOnce(tl: gsap.core.Timeline | undefined) {
  if (tl && tl.progress() === 0 && !tl.isActive()) tl.play()
}
