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
            <PowerIcon className="mx-auto mb-2 h-6 w-6" />
            <span>Exit dApp</span>
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

function PowerIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="800px"
      height="800px"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 3V12M18.3611 5.64001C19.6195 6.8988 20.4764 8.50246 20.8234 10.2482C21.1704 11.994 20.992 13.8034 20.3107 15.4478C19.6295 17.0921 18.4759 18.4976 16.9959 19.4864C15.5159 20.4752 13.776 21.0029 11.9961 21.0029C10.2162 21.0029 8.47625 20.4752 6.99627 19.4864C5.51629 18.4976 4.36274 17.0921 3.68146 15.4478C3.00019 13.8034 2.82179 11.994 3.16882 10.2482C3.51584 8.50246 4.37272 6.8988 5.6311 5.64001"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
