import React from 'react';
import HeroSection from '../../home-page/HeroSection';
import { TopChart } from '../../home-page/TopChart';
import FeaturedVideo from '@app/components/home-page/Featured';
import { TopVideos } from '../../home-page/TopVideos';

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
