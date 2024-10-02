import HeroSection from '../../home-page/HeroSection';
import { TopChart } from '../../home-page/TopChart';
import FeaturedVideo from '@app/components/home-page/Featured';
import { TopVideos } from '../../home-page/TopVideos';
import FileUpload from '@app/components/Upload/FileUpload';

const NonLoggedInView = () => {
  return (
    <div>
      <HeroSection />
      <TopChart />
      <FeaturedVideo />
      <TopVideos />
      <FileUpload/>
    </div>
  );
};

export default NonLoggedInView;
