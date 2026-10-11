import { ArrowRight, Check, Search, UserRound, Wrench } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Tell us what you need",
    text: "Choose a service, then describe the job in a few details.",
    image: "/images/how-steps/step-01-request",
    alt: "A service request preview with an electrical service selected.",
  },
  {
    number: "02",
    icon: UserRound,
    title: "Explore local help",
    text: "Explore provider profiles and check which service areas they cover.",
    image: "/images/how-steps/step-02-discover",
    alt: "A customer and local service professional looking through job details together.",
  },
  {
    number: "03",
    icon: Wrench,
    title: "Get the job done",
    text: "Contact a provider, explain what you need, and agree on next steps.",
    image: "/images/how-steps/step-03-connect",
    alt: "A customer and plumbing professional discussing a leaking tap through a message preview.",
  },
  {
    number: "04",
    icon: Check,
    title: "Share your experience",
    text: "After the service, leave an honest review to help the community decide.",
    image: "/images/how-steps/step-04-feedback",
    alt: "A feedback form with unselected stars and an empty comment field.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section how-section">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">A simpler way to get it sorted</span>
          <h2>
            From “may sira” to <span>AYOS.</span>
          </h2>
          <p>Finding help should feel straightforward. Here’s how it works.</p>
        </div>
        <div className="steps-list">
          {steps.map(({ number, icon: Icon, title, text, image, alt }, index) => (
            <article className="step-row" key={number}>
              <div className="step-number">{number}</div>
              <div className="step-visual">
                <span>
                  <Icon size={21} strokeWidth={1.8} />
                </span>
                {index < steps.length - 1 && <i />}
              </div>
              <div className="step-content">
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <picture className="step-image">
                <source media="(prefers-reduced-motion: no-preference)" srcSet={`${image}.gif`} type="image/gif" />
                <img
                  src={`${image}.webp`}
                  alt={alt}
                  width="480"
                  height="308"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <ArrowRight className="step-arrow" size={18} aria-hidden="true" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
