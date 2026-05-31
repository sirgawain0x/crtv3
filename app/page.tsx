import NonLoggedInView from '@/components/home-page/NonLoggedInView';
import { getSongchainConfig } from '@/lib/songchain/config';

export const dynamic = 'force-dynamic';

export default function Home() {
  const { enabled: songchainEnabled } = getSongchainConfig();

  return (
    <main className="flex min-h-screen flex-col">
      <NonLoggedInView songchainEnabled={songchainEnabled} />
    </main>
  );
}
