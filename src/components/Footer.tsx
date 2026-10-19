import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Footer = () => {
  const { site_name: siteName } = useSiteSettings();
  return (
    <footer className="border-t border-white/10 mt-0 hidden md:block relative z-10 overflow-hidden" style={{ backgroundColor: '#05060a' }}>
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold bg-gradient-accent bg-clip-text text-transparent mb-4">
              {siteName}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md text-sm leading-relaxed">
              Your ultimate destination for the best donghua series. Stream thousands of episodes
              in HD quality with subtitles in multiple languages.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube" className="text-muted-foreground hover:text-primary transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/explore" className="text-muted-foreground hover:text-primary transition-colors">Browse All</Link></li>
              <li><Link to="/explore?sort=rating" className="text-muted-foreground hover:text-primary transition-colors">Popular</Link></li>
              <li><Link to="/calendar" className="text-muted-foreground hover:text-primary transition-colors">New Releases</Link></li>
              <li><Link to="/library?tab=Watch Later" className="text-muted-foreground hover:text-primary transition-colors">My Watchlist</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/dmca" className="text-muted-foreground hover:text-primary transition-colors">DMCA Notice</Link></li>
              <li><Link to="/disclaimer" className="text-muted-foreground hover:text-primary transition-colors">Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} {siteName}. All rights reserved. Made with ❤️ for donghua fans.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;