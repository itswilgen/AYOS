import { ArrowRight, Check, Search, UserRound, Wrench } from "lucide-react";
const steps = [
  {
    number: "01",
    icon: Search,
    title: "Tell us what you need",
    text: "Choose a service and add a few details about the job.",
  },
  {
    number: "02",
    icon: UserRound,
    title: "Explore local help",
    text: "Review provider profiles, service areas, and customer feedback.",
  },
  {
    number: "03",
    icon: Wrench,
    title: "Get the job done",
    text: "Connect with a provider and agree on the next steps.",
  },
  {
    number: "04",
    icon: Check,
    title: "Share your experience",
    text: "When your service is complete, let the community know how it went.",
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
          {steps.map(({ number, icon: Icon, title, text }, index) => (
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
              <ArrowRight className="step-arrow" size={18} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
