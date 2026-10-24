const steps = [
  {
    number: '01',
    title: 'Describe the job',
    text: 'Pick a service, add a short note or a photo, and choose a time that works for you.',
    image: '/images/how-steps/step-01-request',
    alt: 'A service request preview with an electrical service selected.',
  },
  {
    number: '02',
    title: 'Choose a local pro',
    text: 'Compare nearby providers by the services they offer, the areas they cover, and their reviews.',
    image: '/images/how-steps/step-02-discover',
    alt: 'A customer and local service professional looking through job details together.',
  },
  {
    number: '03',
    title: 'Track it to done',
    text: 'Your provider accepts, schedules the visit, and updates the job as the work moves along.',
    image: '/images/how-steps/step-03-connect',
    alt: 'A customer and plumbing professional discussing a leaking tap through a message preview.',
  },
  {
    number: '04',
    title: 'Confirm and review',
    text: 'Mark the work complete, then leave an honest review to help your neighbors choose.',
    image: '/images/how-steps/step-04-feedback',
    alt: 'A feedback form with unselected stars and an empty comment field.',
  },
]

export default function HowItWorks() {
  return <section id="how-it-works" className="lp-section lp-how" aria-labelledby="how-title">
    <div className="lp-container">
      <header className="lp-section-head lp-reveal">
        <p className="lp-kicker">A simpler way to get it sorted</p>
        <h2 id="how-title" className="lp-title">From “may sira” to <em>AYOS.</em></h2>
        <p className="lp-lede">Four clear steps from something broken to something fixed, with every update kept in one place.</p>
      </header>
      <ol className="lp-steps">
        {steps.map(({ number, title, text, image, alt }, index) => <li className="lp-step" key={number}>
          <picture className="lp-step-media">
            <source media="(prefers-reduced-motion: no-preference)" srcSet={`${image}.gif`} type="image/gif" />
            <img src={`${image}.webp`} alt={alt} width="480" height="308" loading="lazy" decoding="async" />
          </picture>
          <div className="lp-step-track" aria-hidden="true">
            <span className="lp-step-node">{number}</span>
            {index < steps.length - 1 && <span className="lp-step-line"><span className="lp-step-line-fill" /></span>}
          </div>
          <h3 className="lp-step-title"><span className="sr-only">Step {index + 1}: </span>{title}</h3>
          <p className="lp-step-text">{text}</p>
        </li>)}
      </ol>
    </div>
  </section>
}
