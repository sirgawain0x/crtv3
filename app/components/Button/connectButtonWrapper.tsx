'use client';
import { EnhancedConnectButton } from './EnhancedConnectButton';
import { WalletConnectDetails } from './WalletConnectDetails';
import { useAccount } from 'wagmi';

export default function ConnectButtonWrapper() {
  const { isConnected } = useAccount();

  if (isConnected) {
    return <WalletConnectDetails />;
  }

  return (
    <EnhancedConnectButton
      className="my-custom-class px-3 py-1 text-sm sm:px-4 sm:py-2 sm:text-base"
      style={{
        backgroundColor: '#EC407A',
        color: 'white',
        borderRadius: '10px',
      }}
    />
  );
}
