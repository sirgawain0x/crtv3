/// <reference types="vitest" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectWallet } from '../connect-wallet';
import { useAccount } from 'wagmi';
import { authenticate } from '../../../actions/auth';
import { toast } from 'sonner';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}));

vi.mock('../../../actions/auth', () => ({
  authenticate: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('ConnectWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should disable connect button when wallet is not connected', () => {
    vi.mocked(useAccount).mockReturnValue({
      address: undefined,
      chainId: undefined,
      isConnected: false,
    } as any);

    render(<ConnectWallet />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should handle successful authentication', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockChainId = 1;

    vi.mocked(useAccount).mockReturnValue({
      address: mockAddress,
      chainId: mockChainId,
      isConnected: true,
    } as any);

    vi.mocked(authenticate).mockResolvedValue({
      success: true,
      data: { address: mockAddress },
    });

    render(<ConnectWallet />);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(authenticate).toHaveBeenCalledWith({
      address: mockAddress,
      chainId: mockChainId,
    });
    expect(toast.success).toHaveBeenCalledWith('Successfully connected wallet');
  });

  it('should show error toast for invalid address format', async () => {
    const mockAddress = '0x1234';
    const mockChainId = 1;

    vi.mocked(useAccount).mockReturnValue({
      address: mockAddress,
      chainId: mockChainId,
      isConnected: true,
    } as any);

    vi.mocked(authenticate).mockResolvedValue({
      success: false,
      error: 'Invalid Ethereum address format',
    });

    render(<ConnectWallet />);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(toast.error).toHaveBeenCalledWith('Invalid Ethereum address format');
  });

  it('should show error toast for authentication failure', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockChainId = 1;

    vi.mocked(useAccount).mockReturnValue({
      address: mockAddress,
      chainId: mockChainId,
      isConnected: true,
    } as any);

    vi.mocked(authenticate).mockResolvedValue({
      success: false,
      error: 'Authentication failed',
    });

    render(<ConnectWallet />);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(toast.error).toHaveBeenCalledWith('Authentication failed');
  });
});
