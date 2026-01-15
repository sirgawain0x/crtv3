import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Slash, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { PredictionDetails } from "@/components/predictions/PredictionDetails";
import { REALITY_ETH_DAPP_URL, REALITY_ETH_CHAIN_ID } from "@/context/context";
import { getRealityEthContractAddress } from "@/lib/sdk/reality-eth/reality-eth-client";

interface PredictionDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PredictionDetailsPage({
  params,
}: PredictionDetailsPageProps) {
  const { id } = await params;
  const contractAddress = getRealityEthContractAddress();
  const realityEthUrl = `${REALITY_ETH_DAPP_URL}#!/network/${REALITY_ETH_CHAIN_ID}/question/${contractAddress}-${id}`;

  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="my-5 mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">
                  <span role="img" aria-label="home">
                    🏠
                  </span>{" "}
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <Slash />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink href="/predict">Predict</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <Slash />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Prediction Details</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <Card className="p-6 mb-6">
          <div className="mb-4">
            <Link
              href={realityEthUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 underline font-mono text-sm"
            >
              View on Reality.eth
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <PredictionDetails questionId={id} />
        </Card>
      </div>
    </div>
  );
}
