import { Home, Key, TrendingUp, Shield, Users, Award } from 'lucide-react';

const services = [
  {
    icon: Home,
    title: 'Property Sales',
    description: 'Expert guidance through every step of buying or selling your property.',
  },
  {
    icon: Key,
    title: 'Rental Services',
    description: 'Find the perfect rental property with our curated selection.',
  },
  {
    icon: TrendingUp,
    title: 'Market Analysis',
    description: 'Stay informed with our comprehensive market insights and valuations.',
  },
  {
    icon: Shield,
    title: 'Secure Transactions',
    description: 'Safe and transparent dealings with verified legal documentation.',
  },
  {
    icon: Users,
    title: 'Expert Agents',
    description: 'Work with experienced professionals who know the local market.',
  },
  {
    icon: Award,
    title: 'Premium Listings',
    description: 'Access to exclusive properties not available elsewhere.',
  },
];

export function ServicesSection() {
  return (
    <section className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-accent font-medium text-sm uppercase tracking-wider">
            What We Offer
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2">
            Comprehensive Real Estate Services
          </h2>
          <p className="text-muted-foreground mt-4">
            From finding your dream home to securing the best investment, 
            we provide end-to-end real estate solutions.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="group p-8 bg-card rounded-2xl border border-border/50 shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl gradient-hero flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {service.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
