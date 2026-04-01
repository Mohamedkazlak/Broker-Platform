import { CheckCircle, Users, Award, Shield } from 'lucide-react';

import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useBroker } from '@/contexts/BrokerContext';

import { PublicNavbar } from '@/components/layout/PublicNavbar';

export default function About() {
  const { broker } = useBroker();

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative gradient-hero overflow-hidden pt-16">
        {/* Hero Content */}
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            About <span className="text-accent">{broker?.platform_name || 'MyFlat'}</span>
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Empowering real estate brokers with cutting-edge tools.
            We provide the platform you need to showcase properties and grow your business.
          </p>
        </div>
      </section>

      <main>

        {/* Story */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="text-accent font-medium text-sm uppercase tracking-wider">
                  Our Story
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 mb-6">
                  Empowering Brokers to Succeed Online
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Founded with a vision to revolutionize real estate technology,
                    Broker Platform provides dedicated digital solutions designed specifically for property professionals.
                  </p>
                  <p>
                    Our expert team brings together deep knowledge in software engineering and real estate market dynamics. We understand
                    that establishing a strong online presence is crucial for modern brokerages to thrive.
                  </p>
                  <p>
                    That's why we are committed to delivering an intuitive, reliable, and highly customizable
                    platform that puts your brand front and center, helping you turn leads into lasting client relationships.
                  </p>
                </div>
              </div>
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80"
                  alt="Real estate team"
                  className="rounded-2xl shadow-xl"
                />
                <div className="absolute -bottom-8 -left-8 bg-card rounded-xl p-6 shadow-lg border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                      <Award className="w-8 h-8 text-accent" />
                    </div>
                    <div>
                      <p className="font-display text-2xl font-bold text-foreground">10+</p>
                      <p className="text-sm text-muted-foreground">Years of Excellence</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24 bg-secondary/50">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-accent font-medium text-sm uppercase tracking-wider">
                Our Values
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">
                What Sets Us Apart
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: Shield,
                  title: 'Trust & Reliability',
                  description: 'Secure, high-uptime infrastructure you can depend on daily.',
                },
                {
                  icon: Users,
                  title: 'Broker First',
                  description: 'Your growth is our priority. We continuously evolve to meet your needs.',
                },
                {
                  icon: Award,
                  title: 'Innovation',
                  description: 'We deliver cutting-edge technology to keep you ahead of the competition.',
                },
                {
                  icon: CheckCircle,
                  title: 'Seamless Experience',
                  description: 'An intuitive platform that saves you time and simplifies management.',
                },
              ].map((value) => (
                <div
                  key={value.title}
                  className="bg-card rounded-2xl p-8 text-center border border-border shadow-card"
                >
                  <div className="w-16 h-16 mx-auto rounded-xl gradient-hero flex items-center justify-center mb-6">
                    <value.icon className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { value: '500+', label: 'Active Brokers' },
                { value: '50k+', label: 'Properties Listed' },
                { value: '99.9%', label: 'Platform Uptime' },
                { value: '24/7', label: 'Dedicated Support' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-display text-4xl md:text-5xl font-bold text-primary mb-2">
                    {stat.value}
                  </p>
                  <p className="text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
