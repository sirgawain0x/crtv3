'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ConnectButtonWrapper from '../Button/connectButtonWrapper';
import { SITE_LOGO } from '@app/lib/utils/context';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@app/components/ui/sheet';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@app/components/ui/button';
import { useActiveAccount } from 'thirdweb/react';
import ThemeToggleComponent from '../ThemeToggle/toggleComponent';
import Unlock from '@app/lib/utils/Unlock.json';
import { client } from '@app/lib/sdk/thirdweb/client';
import { useReadContract } from 'thirdweb/react';
import { polygon } from 'thirdweb/chains';
import { getContract } from 'thirdweb';
import ClaimLockButton from '@app/components/Paywall/ClaimLock';
import CRTVConnectButton from '../Button/connectButton';

export function Navbar() {
  const activeAccount = useActiveAccount();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  /*******  CONTRACT READING ********/
  // const unlockContract = getContract({
  //   client: client,
  //   chain: polygon,
  //   address: '0x9a9280897c123b165e23f77cf4c58292d6ab378d',
  //   abi: Unlock.abi,
  // });

  // const { data: result, isLoading } = useReadContract({
  //   contract: unlockContract,
  //   method: 'getHasValidKey',
  //   params: [activeAccount?.address],
  // });

  // const [subscribed, setSubscribed] = useState(false);

  // useEffect(() => {
  //   if (!activeAccount || !Unlock.abi) return;

  //   if (result !== undefined) {
  //     console.log('Is your membership valid?', result);
  //     setSubscribed(result);
  //   }
  // }, [activeAccount, result]);

  return (
    <header className="flex h-20 w-full shrink-0 items-center bg-muted px-4 md:px-6">
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <MenuIcon className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>
              <VisuallyHidden.Root>Menu</VisuallyHidden.Root>
            </SheetTitle>
            <SheetDescription>
              <VisuallyHidden.Root>The stage is yours.</VisuallyHidden.Root>
            </SheetDescription>
          </SheetHeader>
          <div onClick={handleLinkClick}>
            <Link href="/" className="mr-6 lg:flex" prefetch={false} passHref>
              <Image
                style={{
                  width: 'auto',
                  height: 'auto',
                  marginBottom: '0.25rem',
                }}
                src={SITE_LOGO}
                alt="Creative Logo"
                width={80}
                height={80}
                priority
              />
              <span className="mx-auto my-auto">
                <h1
                  className="text-lg"
                  style={{ fontFamily: 'ConthraxSb-Regular , sans-serif' }}
                >
                  CREATIVE{' '}
                  <span
                    className="ml-1 text-xl font-bold text-red-500"
                    style={{ fontFamily: 'sans-serif' }}
                  >
                    TV
                  </span>
                </h1>
              </span>
            </Link>
          </div>
          <div className="grid gap-2 py-6">
            <Link
              href="/discover"
              className="flex w-full items-center py-2 text-lg font-semibold"
              prefetch={false}
              onClick={handleLinkClick}
            >
              Discover
            </Link>
            <Link
              href="/vote"
              className="flex w-full items-center py-2 text-lg font-semibold"
              prefetch={false}
              onClick={handleLinkClick}
            >
              Vote
            </Link>
          </div>
          <hr />
          <div className="grid gap-2 py-6">
            <div>
              <ThemeToggleComponent />
            </div>
            {/* <CRTVConnectButton /> */}
            <ConnectButtonWrapper />
            {activeAccount && (
              <div className="mt-5">
                <ClaimLockButton closeMenu={() => setIsMenuOpen(false)} />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <Link href="/" className="mr-6 hidden lg:flex" prefetch={false} passHref>
        <Image
          src={SITE_LOGO}
          alt="Creative Logo"
          width={80}
          height={80}
          priority
        />
        <span className="mx-auto my-auto">
          <h1
            className="text-lg"
            style={{ fontFamily: 'ConthraxSb-Regular , sans-serif' }}
          >
            CREATIVE
            <span
              className="ml-1 text-xl font-bold text-red-500"
              style={{ fontFamily: 'sans-serif' }}
            >
              TV
            </span>
          </h1>
        </span>
      </Link>
      <nav className="ml-auto hidden gap-6 lg:flex">
        <Link
          href="/discover"
          className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-gray-100/50 data-[state=open]:bg-gray-100/50 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus:bg-gray-800 dark:focus:text-gray-50 dark:data-[active]:bg-gray-800/50 dark:data-[state=open]:bg-gray-800/50"
          prefetch={false}
        >
          Discover
        </Link>
        <Link
          href="/vote"
          className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-gray-100/50 data-[state=open]:bg-gray-100/50 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus:bg-gray-800 dark:focus:text-gray-50 dark:data-[active]:bg-gray-800/50 dark:data-[state=open]:bg-gray-800/50"
          prefetch={false}
        >
          Vote
        </Link>
      </nav>
      <div className=" ml-auto hidden lg:flex">
        <div className="my-auto mr-4">
          <ThemeToggleComponent />
        </div>
        <div className="mr-5">
          {/* <CRTVConnectButton /* onLoginLogout={() => { setIsLoggedIn(!isLoggedIn) }} */ /> */}
          <ConnectButtonWrapper />
        </div>
        {activeAccount && (
          <ClaimLockButton closeMenu={() => setIsMenuOpen(false)} />
        )}
      </div>
    </header>
  );
}

function MenuIcon(props: any) {
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
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}
