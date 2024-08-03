import Link from 'next/link';
import Image from 'next/image';
import { SITE_LOGO } from '@app/lib/utils/context';

export default function Component() {
  // 👇️ Get current Year
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted py-6 md:py-8">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <Link href="/" className="flex items-center gap-2" prefetch={false}>
          <Image src={SITE_LOGO} alt="Creative Logo" width={40} height={40} />
          <span className="text-sm font-medium">CREATIVE</span>
        </Link>
        <nav className="mx-auto flex items-center gap-4">
          <Link
            href="https://app.creativeplatform.xyz"
            className="text-sm font-medium hover:underline"
            prefetch={false}
          >
            Exit dApp
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          &copy; {currentYear} Creative Organization DAO. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function MountainIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}

function XIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
