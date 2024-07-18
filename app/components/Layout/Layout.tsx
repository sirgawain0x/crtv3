import React from 'react';
import { Fragment } from 'react';
import Footer from './Footer';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
  // Add any other props you expect here
}

function Layout(props: LayoutProps) {
  return (
    <Fragment>
      <Navbar />
      <main>{props.children}</main>
      <Footer />
    </Fragment>
  );
}

export default Layout;
