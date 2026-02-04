import { HeroSection } from '@/components/HeroSection';
import { TodayMatches } from '@/components/TodayMatches';

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <TodayMatches />
    </div>
  );
}
