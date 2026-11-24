import { notFound } from "next/navigation";
import { channelMigrationEnvironment } from "@/lib/video-provider/migration/stream-replacement-server";
import ChannelOperator from "./operator";
export const dynamic = "force-dynamic";
export default function Page() {
  if (!channelMigrationEnvironment()) notFound();
  return <ChannelOperator />;
}
