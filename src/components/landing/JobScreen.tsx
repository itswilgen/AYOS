import { BadgeCheck, Camera, Check, MapPin, Star } from 'lucide-react'

/**
 * One job, four moments: the same kitchen-sink request as it moves through "How it works".
 * Drawn in AYOS's own UI language, so visitors see the real product instead of a stock GIF.
 * The markup is the finished state of each moment; src/animations/jobScreens.ts plays it in.
 * Each screen is a picture to assistive tech (role="img"), described by the step's `label`.
 */
export default function JobScreen({ step, label }: { step: 1 | 2 | 3 | 4; label: string }) {
  return <div className="lp-job" role="img" aria-label={label} data-job-screen={step}>
    <div className="lp-job-phone" aria-hidden="true">
      <span className="lp-job-speaker" />
      <div className="lp-job-screen">
        {step === 1 && <RequestScreen />}
        {step === 2 && <ChooseScreen />}
        {step === 3 && <TrackScreen />}
        {step === 4 && <ReviewScreen />}
      </div>
    </div>
  </div>
}

function RequestScreen() {
  return <>
    <p className="lp-job-heading">New request</p>
    <div className="lp-job-chips">
      <span className="lp-job-chip is-picked" data-job="pick">Plumbing</span>
      <span className="lp-job-chip">Electrical</span>
    </div>
    <div className="lp-job-field">
      <span className="lp-job-typed" data-job="typed">Kitchen sink leaks</span>
    </div>
    <div className="lp-job-photo-row">
      <span className="lp-job-photo" data-job="photo"><Camera size={13} /></span>
      <span className="lp-job-muted" data-job="photo-note">1 photo added</span>
    </div>
    <span className="lp-job-button" data-job="press">Send request</span>
  </>
}

function ChooseScreen() {
  return <>
    <p className="lp-job-heading">Plumbers near you</p>
    <div className="lp-job-pro is-picked" data-job="row">
      <span className="lp-job-avatar">JR</span>
      <span className="lp-job-pro-text">
        <strong>Jun Reyes Plumbing</strong>
        <small><Star size={9} fill="currentColor" /> 4.8 · From ₱650</small>
      </span>
      <span className="lp-job-check" data-job="check"><Check size={10} strokeWidth={3} /></span>
    </div>
    <div className="lp-job-pro" data-job="row">
      <span className="lp-job-avatar">TP</span>
      <span className="lp-job-pro-text">
        <strong>Tanjay Pipe Works</strong>
        <small><Star size={9} fill="currentColor" /> 4.6 · From ₱700</small>
      </span>
    </div>
    <span className="lp-job-button" data-job="press">Request Jun</span>
  </>
}

const TRACK = ['Sent', 'Accepted', 'Scheduled', 'In progress', 'Done']

function TrackScreen() {
  return <>
    <p className="lp-job-heading">Kitchen sink leak</p>
    <p className="lp-job-muted"><MapPin size={10} /> with Jun Reyes Plumbing</p>
    <ol className="lp-job-track">
      {/* Sent, Accepted, Scheduled, In progress lit; Done still ahead. */}
      {TRACK.map((label, index) => <li key={label} className={index < 4 ? 'is-on' : undefined}><span data-job={index < 4 ? 'dot' : undefined} /></li>)}
    </ol>
    <span className="lp-job-status" data-job="status">Work in progress</span>
    <p className="lp-job-bubble" data-job="bubble">On my way. About 10 minutes.</p>
  </>
}

function ReviewScreen() {
  return <>
    <span className="lp-job-status is-done"><BadgeCheck size={11} /> Ready for your check</span>
    <span className="lp-job-button is-confirmed" data-job="press">
      <span className="lp-job-label-before" data-job="before">Confirm work done</span>
      <span className="lp-job-label-after" data-job="after"><Check size={11} strokeWidth={3} /> Work confirmed</span>
    </span>
    <div className="lp-job-stars">
      {[1, 2, 3, 4, 5].map((star) => <span key={star} className="lp-job-star">
        <Star size={15} />
        <Star size={15} fill="currentColor" className="lp-job-star-fill" data-job="star" />
      </span>)}
      <span className="lp-job-word" data-job="word">Excellent</span>
    </div>
    <p className="lp-job-muted" data-job="thanks">Thanks, Lea! Your review helps neighbours choose.</p>
  </>
}
