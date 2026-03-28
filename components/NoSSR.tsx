import dynamic from 'next/dynamic';
import React from 'react';

const NoSSR = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
);

// This tells Next.js: "Do not render this on the server. Wait for the client."
export default dynamic(() => Promise.resolve(NoSSR), {
    ssr: false
});
