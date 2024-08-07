import HeroSection from '../../home-page/HeroSection';
import { TopChart } from '../../home-page/TopChart';
import FeaturedVideo from '@app/components/home-page/Featured';
import { TopVideos } from '../../home-page/TopVideos';
import { livepeer } from '@app/lib/sdk/livepeer/client';
import { LIVEPEER_HERO_PLAYBACK_ID } from '@app/lib/utils/context';

const NonLoggedInView = () => {
  return (
    <div>
      <HeroSection />
      <TopChart />
      <FeaturedVideo />
      <TopVideos />
    </div>
  );
};

export default NonLoggedInView;
