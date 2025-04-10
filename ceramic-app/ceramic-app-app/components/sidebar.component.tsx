import Image from 'next/image';
import Link from 'next/link';
import { FaHome } from 'react-icons/fa/index.js';
import { FaUser } from 'react-icons/fa/index.js';
import { FaHashtag } from 'react-icons/fa/index.js';
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
            <FaHome /> Home
          </a>
        </Link>
        <Link href={`/profile`}>
          <a>
            <FaUser /> Profile
          </a>
        </Link>
        <Link href="/explore">
          <a>
            <FaHashtag /> Explore
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
