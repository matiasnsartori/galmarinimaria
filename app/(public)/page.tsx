import { Hero } from '@/components/sections/Hero';
import { TallerSection } from '@/components/sections/TallerSection';
import { ConsultasSection } from '@/components/sections/ConsultasSection';
import { TrustSection } from '@/components/sections/TrustSection';
import { TestimoniosSection } from '@/components/sections/TestimoniosSection';
import { CtaSection } from '@/components/sections/CtaSection';

export default function HomePage() {
  return (
    <>
      <Hero />
      <TallerSection />
      <ConsultasSection />
      <TrustSection />
      <TestimoniosSection />
      <CtaSection />
    </>
  );
}
