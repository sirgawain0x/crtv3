import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "@app/lib/sdk/thirdweb/components";
import { TokenGateProvider } from 'collabland-tokengate-react-context';
import { Providers } from "./providers";
import Layout from "./ui/components/Layout/Layout";
import { ApolloWrapper } from "./lib/utils/ApolloWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Creative TV",
  description: "The way content should be",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ApolloWrapper>
          <Providers>
            <ThirdwebProvider>
              <TokenGateProvider>
                <Layout>
                  {children}
                </Layout>
              </TokenGateProvider>
            </ThirdwebProvider>
          </Providers>
        </ApolloWrapper>
      </body>
    </html>
  );
}
