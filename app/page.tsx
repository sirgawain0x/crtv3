import { Metadata } from "next";
import Content from "@app/ui/components/Content/Content";
import { Box, Container } from "@chakra-ui/react";

export const metadata: Metadata = {
  title: "Creative TV",
  description: "The way content should be",
  metadataBase: new URL('https://creativeplatform.xyz'),
  openGraph: {
    title: "Creative TV",
    description: "The way content should be",
    type: "website",
    url: "https://tv.creativeplatform.xyz",
    images: [
      {
        url: 'https://bafkreicsmowyquojavdt6lyq7a6mgub3ae7fseprt3dcwqk2asqth4nm6y.ipfs.nftstorage.link/',
        width: 875,
        height: 875,
        alt: 'Creative Membership',
      },
    ],
    locale: "en_US",
  },

}

export default function Home() {
   
  return (
    <Container maxW='7xl' centerContent>
        <Box py={10}>
          <Content />
        </Box>
    </Container>
  );
}