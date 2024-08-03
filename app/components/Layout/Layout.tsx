'use client';
import Footer from './Footer';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
  // Add any other props you expect here
}

function Layout(props: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mb-auto">{props.children}</main>
      <Footer />
    </div>
  );
}

export default Layout;
