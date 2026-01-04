"use client";

import React from "react";
import HeroSection from "./HeroSection";
// import { TopChart } from "./TopChart";
// import FeaturedVideo from './Featured';
import { TopVideos } from "./TopVideos";
import { useAuthStateMonitor } from '@/lib/hooks/accountkit/useAuthStateMonitor';
import DearCreativePublications from "./DearCreativePublications";

const NonLoggedInView: React.FC = () => {
  // Monitor auth state for logout/timeout scenarios
  useAuthStateMonitor();

  return (
    <div>
      <HeroSection />
      {/* <TopChart /> */}
      {/* <FeaturedVideo /> */}
      <TopVideos />
      <DearCreativePublications />
    </div>
  );
};

export default NonLoggedInView;
