import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Building2,
  LayoutDashboard,
  Users,
  Zap,
  Smartphone,
  Search,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const features = [
  {
    icon: Building2,
    title: 'Your Own Subdomain',
    description: 'Get a professional website at yourname.platform.com with your branding front and center',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: LayoutDashboard,
    title: 'Property Management',
    description: 'Easy-to-use dashboard to add, edit, and manage all your property listings',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Users,
    title: 'Lead Management',
    description: 'Receive and manage inquiries from potential clients directly in your dashboard',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Zap,
    title: 'Instant Setup',
    description: 'Launch your website in minutes, no technical knowledge required',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Smartphone,
    title: 'Mobile Responsive',
    description: 'Beautiful on all devices - desktop, tablet, and mobile',
    color: 'bg-rose-100 text-rose-600',
  },
  {
    icon: Search,
    title: 'SEO Optimized',
    description: 'Built with best practices to help potential clients find your listings',
    color: 'bg-teal-100 text-teal-600',
  },
];

import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Footer } from '@/components/layout/Footer';

export default function Platform() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Blue Gradient Background */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80"
            alt="Background"
            className="w-full h-full object-cover opacity-40 blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/95 via-primary/90 to-primary/80 mix-blend-multiply" />
        </div>

        {/* Wave decoration at bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 mb-8">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-primary-foreground text-sm font-medium">
              Launch your real estate website in minutes
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight max-w-4xl mx-auto">
            Your Own Real Estate
            <br />
            <span className="text-accent">Website</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Create a professional branded website for your real estate business.
            Showcase properties, connect with clients, all under your own subdomain.
          </p>

          {/* CTA Button */}
          <div className="mt-10">
            <Button
              asChild
              size="xl"
              variant="hero"
            >
              <Link to="/register" className="gap-2">
                Create Your Website
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Everything you need to showcase properties
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete platform designed specifically for real estate brokers
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-card rounded-2xl p-6 border border-border hover:shadow-card-hover transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to grow your real estate business?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Join hundreds of brokers who trust our platform to showcase their properties
          </p>
          <Button asChild size="xl" variant="hero">
            <Link to="/register" className="gap-2">
              Get Started Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}