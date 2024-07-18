'use client';
import * as React from 'react';
import Link from 'next/link';
import { cn } from '@app/lib/utils';
import Image from 'next/image';
import ConnectButtonWrapper from '../Button/connectButtonWrapper';
import { FaChevronDown } from 'react-icons/fa6';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@app/components/ui/navigation-menu';
import { SITE_LOGO } from '@app/lib/utils/context';

const components: { title: string; href: string; description: string }[] = [
  {
    title: 'Alert Dialog',
    href: '/docs/primitives/alert-dialog',
    description:
      'A modal dialog that interrupts the user with important content and expects a response.',
  },
  {
    title: 'Hover Card',
    href: '/docs/primitives/hover-card',
    description:
      'For sighted users to preview content available behind a link.',
  },
  {
    title: 'Progress',
    href: '/docs/primitives/progress',
    description:
      'Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.',
  },
  {
    title: 'Scroll-area',
    href: '/docs/primitives/scroll-area',
    description: 'Visually or semantically separates content.',
  },
  {
    title: 'Tabs',
    href: '/docs/primitives/tabs',
    description:
      'A set of layered sections of content—known as tab panels—that are displayed one at a time.',
  },
  {
    title: 'Tooltip',
    href: '/docs/primitives/tooltip',
    description:
      'A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.',
  },
];

export function Navbar() {
  return (
    <NavigationMenu>
      <NavigationMenuList className="mx-auto my-4">
        <NavigationMenuItem>
          <NavigationMenuTrigger>Community</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
              <li className="row-span-3">
                <NavigationMenuLink asChild>
                  <Link
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                    href="https://app.creativeplatform.xyz"
                  >
                    <FaChevronDown className="h-6 w-6" />
                    <div className="mb-2 mt-4 text-lg font-medium">
                      Return to Terminal
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      A retro terminal GUI with future AI capabilities, offering
                      a unique , type-driven interface to explore and engage
                      with the Creative Ecosystem seamlessly.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <ListItem
                href="https://app.charmverse.io/creative-like-brown-fowl"
                title="Dashboard"
              >
                This dashboard serves as a members-only central hub for
                innovation, collaboration, and growth.
              </ListItem>
              <ListItem
                href="https://news.creativeplatform.xyz"
                title="Dear Creative"
              >
                A vibrant newsletter delivering the lastetst in blockchain and
                entertainment innovation, tailored for creatives seeking to
                inspire and be inspired.
              </ListItem>
              <ListItem
                href="/docs/primitives/typography"
                title="Bugs/Feature Suggestions"
              >
                Suggest a feature to the Creative Community for the good of the
                platform.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Components</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
              {components.map((component) => (
                <ListItem
                  key={component.title}
                  title={component.title}
                  href={component.href}
                >
                  {component.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link href="/docs" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              Documentation
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
      <ConnectButtonWrapper />
    </NavigationMenu>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<'a'>,
  React.ComponentPropsWithoutRef<'a'>
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
            className,
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = 'ListItem';
