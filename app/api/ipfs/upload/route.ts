import { NextRequest, NextResponse } from 'next/server';
import { ipfsService } from '@/lib/sdk/ipfs/service';
import { serverLogger } from '@/lib/utils/logger';
import { rateLimiters } from '@/lib/middleware/rateLimit';

export async function POST(request: NextRequest) {
    const rl = await rateLimiters.standard(request);
    if (rl) return rl;

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // Upload to IPFS (Helia -> Storacha Backup)
        const result = await ipfsService.uploadFile(file, {
            pin: true, // This triggers the backup logic inside service if keys are present
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || 'Upload failed' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            url: result.url,
            hash: result.hash,
        });
    } catch (error) {
        serverLogger.error('API IPFS Upload Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
