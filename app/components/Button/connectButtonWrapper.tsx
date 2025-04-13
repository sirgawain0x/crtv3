'use client';
import { AccountKitConnectButton } from './AccountKitConnectButton';

export default function ConnectButtonWrapper() {
  return (
    <AccountKitConnectButton
      className="my-custom-class px-3 py-1 text-sm sm:px-4 sm:py-2 sm:text-base"
      style={{
        backgroundColor: '#EC407A',
        color: 'white',
        borderRadius: '10px',
      }}
    />
  );
}
