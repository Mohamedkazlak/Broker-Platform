import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedProperties } from '@/components/home/FeaturedProperties';
import { ServicesSection } from '@/components/home/ServicesSection';
import { CTASection } from '@/components/home/CTASection';

export default function Index() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturedProperties />
        <ServicesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
