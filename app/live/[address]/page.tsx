import { connection } from "next/server";
import { frameworksReplayEnabled, resolveVideoProviderId } from "@/lib/video-provider/config";
import LiveStudio from "./LiveStudio";

export default async function LivePage() {
  await connection();
  return <LiveStudio replayAvailable={resolveVideoProviderId() !== "frameworks" || frameworksReplayEnabled()} />;
}
