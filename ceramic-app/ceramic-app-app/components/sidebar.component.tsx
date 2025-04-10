import Image from 'next/image';
import Link from 'next/link';
import { Home, User, Hash } from 'lucide-react';
import { SidebarProps } from '../types';

export const Sidebar = ({ name, username, id }: SidebarProps) => {
  return (
    <div className="sidebar">
      <div className="top">
        <div className="logoContainer">
          <Image
            src="/creative_logo_only.png"
            alt="Creative Logo"
            width={150}
            height={150}
          />
        </div>
        <Link href="/">
          <a>
            <Home className="h-4 w-4" /> Home
          </a>
        </Link>
        <Link href={`/profile`}>
          <a>
            <User className="h-4 w-4" /> Profile
          </a>
        </Link>
        <Link href="/explore">
          <a>
            <Hash className="h-4 w-4" /> Explore
          </a>
        </Link>
      </div>
      <div className="bottom">
        {name !== undefined ? (
          <div className="you">
            <b>{name}</b> <br />
            <Link href={`user/${id}`}>
              <a>@{username}</a>
            </Link>
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};
