import JobScreen from './JobScreen'

const steps = [
  {
    number: '01',
    title: 'Describe the job',
    text: 'Pick a service, add a short note or a photo, and choose a time that works for you.',
    screen: 'A new request on a phone: Plumbing is picked, the note says the kitchen sink leaks, a photo is added, and Send request is tapped.',
  },
  {
    number: '02',
    title: 'Choose a local pro',
    text: 'Compare nearby providers by the services they offer, the areas they cover, and their reviews.',
    screen: 'Plumbers near you on a phone: Jun Reyes Plumbing, rated 4.8 and from ₱650, is chosen, and Request Jun is tapped.',
  },
  {
    number: '03',
    title: 'Track it to done',
    text: 'Your provider accepts, schedules the visit, and updates the job as the work moves along.',
    screen: 'The kitchen sink request on a phone moves from Sent to Accepted, Scheduled and Working, and Jun writes: On my way. About 10 minutes.',
  },
  {
    number: '04',
    title: 'Confirm and review',
    text: 'Mark the work complete, then leave an honest review to help your neighbors choose.',
    screen: 'The finished job on a phone: Confirm work done is tapped, five stars are given, and AYOS thanks Lea for the review.',
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
        {steps.map(({ number, title, text, screen }, index) => <li className="lp-step" key={number}>
          {/* The same job in every step: one kitchen-sink request, from first note to five stars. */}
          <div className="lp-step-media"><JobScreen step={(index + 1) as 1 | 2 | 3 | 4} label={screen} /></div>
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
