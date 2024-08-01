'use client';
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';

export function TopChart() {
  return (
    <div className="mx-auto w-full max-w-6xl py-8">
      <div className="mb-8 text-center">
        <h2 className="flex items-center justify-center gap-2 text-3xl font-bold">
          <TrophyIcon className="h-6 w-6 text-yellow-500" />
          Top Creatives
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <ul className="space-y-4">
          <li className="flex items-center space-x-2">
            <span>1.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>P</AvatarFallback>
            </Avatar>
            <span>plantarcowboy</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>2.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>M</AvatarFallback>
            </Avatar>
            <span>maliciousnorth</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>3.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
            <span>thingmanager</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>4.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>F</AvatarFallback>
            </Avatar>
            <span>feastpizza</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>5.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>F</AvatarFallback>
            </Avatar>
            <span>fennelidentical</span>
          </li>
        </ul>
        <ul className="space-y-4">
          <li className="flex items-center space-x-2">
            <span>6.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>H</AvatarFallback>
            </Avatar>
            <span>hutdaily</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>7.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>D</AvatarFallback>
            </Avatar>
            <span>decimalgingery</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>8.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>N</AvatarFallback>
            </Avatar>
            <span>notionmoan</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>9.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
            <span>tatteredvast</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>10.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>S</AvatarFallback>
            </Avatar>
            <span>spanbesides</span>
          </li>
        </ul>
        <ul className="space-y-4">
          <li className="flex items-center space-x-2">
            <span>11.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <span>userkooky</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>12.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <span>arrangesquawk</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>13.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>B</AvatarFallback>
            </Avatar>
            <span>beaverumpire</span>
          </li>
          <li className="flex items-center space-x-2">
            <span>14.</span>
            <Avatar>
              <AvatarImage src="/placeholder-user.jpg" />
              <AvatarFallback>F</AvatarFallback>
            </Avatar>
            <span>fifthmainstay</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function TrophyIcon(props: any) {
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
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
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
