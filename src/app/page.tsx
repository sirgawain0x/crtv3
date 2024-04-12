import Head from "next/head";
import Content from "../../components/Content/Content";
import Header from "../../components/Layout/Header";
import Footer from "../../components/Layout/Footer";

export default function Home() {
   
  return (
    <div>
      <Head>
        <title>Creative TV</title>
        <meta name="description" content="The way content should be" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <main className="p-4 pb-10 min-h-[100vh] flex items-center justify-center container max-w-screen-xl mx-auto">
        <div className="py-20">
          <Content />
        </div>
      </main>
      <Footer />
    </div>
  );
}