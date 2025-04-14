'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';

export default function ThemeToggleComponent() {
  const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    setIsDarkMode(savedTheme === 'dark');
  }, []);

  useEffect(() => {
    if (isDarkMode !== null) {
      const root = window.document.documentElement;
      if (isDarkMode) {
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        root.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  if (isDarkMode === null) {
    // Render nothing or a loading spinner
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        onClick={toggleDarkMode}
        className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          isDarkMode
            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            : 'bg-gray-800 text-white hover:bg-gray-600'
        }`}
      >
        {isDarkMode ? (
          <SunIcon className="mr-2 h-5 w-5" />
        ) : (
          <MoonIcon className="mr-2 h-5 w-5" />
        )}
        {isDarkMode ? 'Light' : 'Dark'}
      </Button>
    </div>
  );
}

function MoonIcon(props: any) {
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
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function SunIcon(props: any) {
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}
