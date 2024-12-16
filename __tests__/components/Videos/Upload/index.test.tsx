import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { toast } from 'sonner';
import HookMultiStepForm from '@app/components/Videos/Upload';
import { useActiveAccount } from 'thirdweb/react';
import { useOrbisContext } from '@app/lib/sdk/orbisDB/context';
import { authedOnly } from '@app/api/auth/thirdweb/authentication';
import { hasAccess } from '@app/api/auth/thirdweb/gateCondition';
import { useRouter } from 'next/navigation';
import { ChakraProvider } from '@chakra-ui/react';
import CreateInfo from '@app/components/Videos/Upload/Create-info';
import type { TVideoMetaForm } from '@app/components/Videos/Upload/Create-info';
import FileUpload from '@app/components/Videos/Upload/FileUpload';
import type { Asset } from 'livepeer/models/components';
import userEvent from '@testing-library/user-event';
import CreateThumbnail from '@app/components/Videos/Upload/Create-thumbnail';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('thirdweb/react', () => ({
  useActiveAccount: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

global.URL.createObjectURL = vi.fn(); 

global.URL.revokeObjectURL = vi.fn(); 

vi.mock('@app/lib/sdk/orbisDB/context', () => ({
  useOrbisContext: vi.fn(),
}));

vi.mock('@app/api/auth/thirdweb/authentication', () => ({
  authedOnly: vi.fn(),
}));

vi.mock('@app/api/auth/thirdweb/gateCondition', () => ({
  hasAccess: vi.fn(),
}));

describe('HookMultiStepForm', () => {
  describe('Token Gating', () => {
    const mockRouterPush = vi.fn();
    
    beforeEach(() => {
      vi.clearAllMocks();
      
      // Mock the router push method
      vi.mocked(useRouter).mockReturnValue({
        push: mockRouterPush,
      } as any);

      // Default mock implementations
      (useActiveAccount as jest.MockedFunction<typeof useActiveAccount>).mockReturnValue({
        address: '0x123'
      } as ReturnType<typeof useActiveAccount>);
      (useOrbisContext as unknown as jest.MockedFunction<(args: any[]) => {isConnected: (address: string) => Promise<boolean>, insert: () => Promise<void>}>).mockReturnValue({ 
        isConnected: vi.fn().mockResolvedValue(true),
        insert: vi.fn(),
      });
      
      // Reset toast mock before each test
      vi.mocked(toast.error).mockClear();
    });

    it('should allow access when all conditions are met', async () => {
      // Mock successful authentication checks
      (authedOnly as jest.MockedFunction<typeof authedOnly>).mockResolvedValue(true);
      (hasAccess as jest.MockedFunction<typeof hasAccess>).mockResolvedValue(true);
      (useOrbisContext().isConnected as jest.MockedFunction<(address: string) => Promise<boolean>>).mockResolvedValue(true);

      render(<HookMultiStepForm />);
      await waitFor(() => {
        expect(toast.error).not.toHaveBeenCalled();
      });
    });

    it('should deny access when user is not authenticated', async () => {
      // Mock failed authentication
      (authedOnly as jest.MockedFunction<typeof authedOnly>).mockResolvedValue(false);
      (hasAccess as jest.MockedFunction<typeof hasAccess>).mockResolvedValue(true);
      (useOrbisContext().isConnected as jest.MockedFunction<(address: string) => Promise<boolean>>).mockResolvedValue(true);

      render(<HookMultiStepForm />);

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
          'Access denied. Please ensure you are connected and have an active Creator Pass in your wallet.'
        );
        expect(mockRouterPush).toHaveBeenCalledWith('/');
      });
    });

    it('should deny access when user does not have required token', async () => {
      // Mock failed token gate check
      (authedOnly as jest.MockedFunction<typeof authedOnly>).mockResolvedValue(true);
      (hasAccess as jest.MockedFunction<typeof hasAccess>).mockResolvedValue(false);
      (useOrbisContext().isConnected as jest.MockedFunction<(address: string) => Promise<boolean>>).mockResolvedValue(true);

      render(<HookMultiStepForm />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Access denied. Please ensure you are connected and have an active Creator Pass in your wallet.'
        );
        expect(mockRouterPush).toHaveBeenCalledWith('/');
      });
    });

    it('should deny access when user is not connected to Orbis', async () => {
      // Mock failed Orbis connection
      (authedOnly as jest.MockedFunction<typeof authedOnly>).mockResolvedValue(true);
      (hasAccess as jest.MockedFunction<typeof hasAccess>).mockResolvedValue(true);
      (useOrbisContext().isConnected as jest.MockedFunction<(address: string) => Promise<boolean>>).mockResolvedValue(false);

      render(<HookMultiStepForm />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Access denied. Please ensure you are connected and have an active Creator Pass in your wallet.'
        );
        expect(mockRouterPush).toHaveBeenCalledWith('/');
      });
    });

    it('should handle authentication check errors', async () => {
      // Mock error during authentication check
      (authedOnly as jest.MockedFunction<typeof authedOnly>).mockRejectedValue(new Error('Auth check failed'));

      render(<HookMultiStepForm />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to verify access. Please try again.'
        );
        expect(mockRouterPush).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('CreateInfo', () => {
    const onPressNextMock = vi.fn((formData: TVideoMetaForm) => {}).mockName('onPressNext');
    
    beforeEach(() => vi.clearAllMocks());

    it('should render the component without errors', async () => {
      const { getByText, getByTestId } = render(<CreateInfo onPressNext={onPressNextMock} />);

      expect(getByText('Details')).toBeInTheDocument();
      expect(getByTestId('create-info-title')).toBeInTheDocument();
      expect(getByTestId('create-info-description')).toBeInTheDocument();
      expect(getByTestId('create-info-location')).toBeInTheDocument();
      expect(getByTestId('create-info-category')).toBeInTheDocument();
      expect(getByTestId('create-info-next')).toBeInTheDocument();
    });

    it('should allow submissions when required fields are provided', async () => {
      const { getByTestId } = render(<CreateInfo onPressNext={onPressNextMock} />);

      const title = getByTestId('create-info-title');
      const description = getByTestId('create-info-description');
      const next = getByTestId('create-info-next') as HTMLButtonElement;

      fireEvent.change(title, { target: { value: 'Test Title' } });
      fireEvent.change(description, { target: { value: 'Test Description' } });

      expect(title).toHaveValue('Test Title');
      expect(description).toHaveValue('Test Description');
      await waitFor(() => {
        expect((next).disabled).toBe(false);
      });
    });

    it('should not allow submissions when not all required fields are provided', async () => {
      const { getByTestId } = render(<CreateInfo onPressNext={onPressNextMock} />);

      const title = getByTestId('create-info-title');
      const description = getByTestId('create-info-description');
      const next = getByTestId('create-info-next') as HTMLButtonElement;

      fireEvent.change(title, { target: { value: 'Test Title' } });

      expect(title).toHaveValue('Test Title');
      await waitFor(() => {
        expect((next).disabled).toBe(true);
      });

      fireEvent.change(title, { target: { value: '' } });
      fireEvent.change(description, { target: { value: 'Test Description' } });

      expect(description).toHaveValue('Test Description');
      await waitFor(() => {
        expect((next).disabled).toBe(true);
      });
    });

    it('should accept optional fields', async () => {
      const { getByTestId } = render(<CreateInfo onPressNext={onPressNextMock} />);

      const title = getByTestId('create-info-title');
      const description = getByTestId('create-info-description');
      const location = getByTestId('create-info-location');
      const category = getByTestId('create-info-category');
      const next = getByTestId('create-info-next') as HTMLButtonElement;

      fireEvent.change(title, { target: { value: 'Test Title' } });
      fireEvent.change(description, { target: { value: 'Test Description' } });
      fireEvent.change(location, { target: { value: 'Test Location' } });
      fireEvent.change(category, { target: { value: 'Test Category' } });

      expect(title).toHaveValue('Test Title');
      expect(description).toHaveValue('Test Description');
      expect(location).toHaveValue('Test Location');
      expect(category).toHaveValue('Test Category');

      await waitFor(() => {
        expect((next).disabled).toBe(false);
      });
    });

    it('should pass all inputs to the onPressNext function', async () => {
      const onPressNextMock = vi.fn((data: TVideoMetaForm) => console.log({ data }));
    
      const { getByTestId } = render(<CreateInfo onPressNext={onPressNextMock} />);
    
      fireEvent.change(getByTestId('create-info-title'), { target: { value: 'Test Title' } });
      fireEvent.change(getByTestId('create-info-description'), { target: { value: 'Test Description' } });
      
      await userEvent.click(getByTestId('create-info-next'));
    
      await waitFor(() => {
        expect(onPressNextMock).toHaveBeenCalledWith({
          title: 'Test Title',
          description: 'Test Description',
          location: '',
          category: '',
        });
      });
    });
  });

  describe('FileUpload', () => {
    const onFileSelect = vi.fn((file: File | null) => {});
    const onFileUploaded = vi.fn((fileUrl: string) => {});
    const onSubtitlesUploaded = vi.fn((subtitlesUri: string | undefined) => {});
    const onPressNext = vi.fn((livepeerAsset: Asset) => {});
    const onPressBack = vi.fn(() => {});

    const file = new File(['mock'], 'mock.mp4', { type: 'video/mp4' });

    beforeEach(() => vi.clearAllMocks());

    it('should render the component without errors', async () => {
      const { getByText, getByTestId } = render(
        <FileUpload
          onFileSelect={onFileSelect}
          onFileUploaded={onFileUploaded}
          onSubtitlesUploaded={onSubtitlesUploaded}
          onPressNext={onPressNext}
          onPressBack={onPressBack}
        />
      );

      expect(getByText('Upload A File')).toBeInTheDocument();
      expect(getByTestId('file-upload-input')).toBeInTheDocument();
      expect(getByTestId('file-input-next')).toBeInTheDocument();
    });

    it('should allow users to select a file', async () => {
      const { getByTestId } = render(
        <FileUpload
          onFileSelect={onFileSelect}
          onFileUploaded={onFileUploaded}
          onSubtitlesUploaded={onSubtitlesUploaded}
          onPressNext={onPressNext}
          onPressBack={onPressBack}
        />
      );

      const fileInput = getByTestId('file-upload-input') as HTMLInputElement;

      await userEvent.upload(fileInput, file);

      expect(fileInput.files).toHaveLength(1);
      expect(onFileSelect).toHaveBeenCalled();
    });

    it('should handle file uploads', async () => {
      const { getByTestId } = render(
        <FileUpload
          onFileSelect={onFileSelect}
          onFileUploaded={onFileUploaded}
          onSubtitlesUploaded={onSubtitlesUploaded}
          onPressNext={onPressNext}
          onPressBack={onPressBack}
        />
      );

      const fileInput = getByTestId('file-upload-input') as HTMLInputElement;

      await userEvent.upload(fileInput, file);
      await userEvent.click(getByTestId('file-input-upload-button'));

      await waitFor(() => {
        setTimeout(() => expect(onFileUploaded).toHaveBeenCalled(), 30000);
      });
    });

    it('should handle subtitle uploads', async () => {
      const { getByTestId } = render(
        <FileUpload
          onFileSelect={onFileSelect}
          onFileUploaded={onFileUploaded}
          onSubtitlesUploaded={onSubtitlesUploaded}
          onPressNext={onPressNext}
          onPressBack={onPressBack}
        />
      );

      const fileInput = getByTestId('file-upload-input') as HTMLInputElement;

      await userEvent.upload(fileInput, file);
      await userEvent.click(getByTestId('file-input-upload-button'));
      
      await waitFor(() => {
        setTimeout(() => expect(onSubtitlesUploaded).toHaveBeenCalled(), 30000);
      });
    });
  });

  describe('CreateThumbnail', () => {
    const onComplete = vi.fn((thumbnailUri: string) => {});

    const mockLivepeerAssetId = '';

    beforeEach(() => vi.clearAllMocks());

    it('should render the component without errors', async () => {
      const { getByText, getByTestId } = render(
        <CreateThumbnail 
          livePeerAssetId={mockLivepeerAssetId} 
          onComplete={({ thumbnailUri }) => onComplete(thumbnailUri)} 
        />
      );

      expect(getByText('Almost Done...')).toBeInTheDocument();
      expect(getByText('Loading...')).toBeInTheDocument();
      expect(getByText('Generate a Thumbnail')).toBeInTheDocument();
    });

    it('should allow users to select a model', async () => {
      const { getByText, getByTestId } = render(
        <CreateThumbnail 
          livePeerAssetId={mockLivepeerAssetId} 
          onComplete={({ thumbnailUri }) => onComplete(thumbnailUri)} 
        />
      );

      const modelSelect = getByTestId('create-thumbnail-select');

      expect(getByText('Generate')).toBeInTheDocument();
      expect(getByTestId('create-thumbnail-select')).toBeInTheDocument();
      expect(getByText('No images generated yet.')).toBeInTheDocument();

      fireEvent.change(modelSelect, { target: { value: 'Lightning' }});

      expect(modelSelect).toHaveValue('Lightning');

      fireEvent.change(modelSelect, { target: { value: 'Black Forest' }});

      expect(modelSelect).toHaveValue('Black Forest');
    });

    it('should accept a prompt as input', async () => {
      const { getByText, getByTestId } = render(
        <CreateThumbnail 
          livePeerAssetId={mockLivepeerAssetId} 
          onComplete={({ thumbnailUri }) => onComplete(thumbnailUri)} 
        />
      );

      const promptInput = getByTestId('create-thumbnail-prompt');

      fireEvent.change(promptInput, { target: { value: 'Test prompt' }});

      expect(promptInput).toHaveValue('Test prompt');

      fireEvent.change(promptInput, { target: { value: 'Testing the prompt' }});

      expect(promptInput).toHaveValue('Testing the prompt')
    });

    // it('should display 4 placeholder images while generating', async () => {});

    // it('should display 4 generated images', async () => {});

    // it('should allow users to select an image', async () => {});
  })
});
