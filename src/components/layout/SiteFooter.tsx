import { Link } from 'react-router-dom'
import Brand from '../common/Brand'

export default function SiteFooter() {
  return <footer id="about" className="site-footer">
    <div className="footer-main container">
      <div className="footer-brand"><Brand /><p>Good work starts with good people.<br />Find local help, the AYOS way.</p></div>
      <div className="footer-column"><h3>Services</h3><a href="/#services">Home services</a><a href="/#services">Repair services</a><a href="/#services">Installation</a><a href="/#services">Technical services</a></div>
      <div className="footer-column"><h3>Platform</h3><a href="/#services">Find services</a><a href="/#providers">Become a provider</a><a href="/#how-it-works">How AYOS works</a></div>
      <div className="footer-column"><h3>Company</h3><a href="/#about">About AYOS</a><a href="mailto:hello@ayos.ph">Contact</a><a href="mailto:hello@ayos.ph">Help</a></div>
      <div className="footer-column"><h3>Legal</h3><Link to="/terms">Terms of Service</Link><Link to="/privacy">Privacy Policy</Link></div>
    </div>
    <div className="footer-bottom container"><span>© {new Date().getFullYear()} AYOS. Made for the communities we call home.</span><span className="footer-note">A better way to get things done.</span></div>
  </footer>
}
