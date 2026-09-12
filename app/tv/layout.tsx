import type { Metadata } from "next";
import { TVRemoteHandler } from "@/components/tv/TVRemoteHandler";
import "@/components/tv/tv.css";

export const metadata: Metadata = {
  title: "Creative TV — Living Room",
  description: "Watch Creative TV on the big screen.",
};

export default function TVLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tv-shell" data-tv-mode="living-room">
      <TVRemoteHandler />
      {children}
    </div>
  );
}
