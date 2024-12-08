'use server';

type AudioToTextParams = {
    formData: FormData;
    modelId?: string;
    returnTimestamps?: string;
};

export const getLivepeerAudioToText = async (
  params: AudioToTextParams,
) => {
    try {
        const file: File | null = params.formData.get('audio') as unknown as File;

        if (!file) throw new Error('No file uploaded');

        const blob = new Blob([file], { type: 'video/mp4' });

        if (params.modelId) params.formData.append('model_id', params.modelId);
        if (params.returnTimestamps) params.formData.append('return_timestamps', params.returnTimestamps);

        const livepeerApiUrl = process.env.LIVEPEER_API_URL || 'https://dream-gateway.livepeer.cloud';

        const options = {
            method: 'POST',
            body: params.formData,
            headers: {
                'Authorization': `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`,
                'Accept': 'application/json'
            }
        };

        // console.log({ options });

        const result = await fetch(`${livepeerApiUrl}/audio-to-text`, options);

        if (!result.ok) {
            const errorText = await result.text();
            console.error('Livepeer API Error:', {
                status: result.status,
                statusText: result.statusText,
                response: errorText
            });
            throw new Error(`API request failed: ${result.status} ${result.statusText}`);
        }

        const contentType = result.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await result.text();
            console.error('Unexpected response type:', contentType, text);
            throw new Error('API returned non-JSON response');
        }

        const data = await result.json();

        console.log({ audioToTextResponse: data });

        return data;
    } catch (error: any) {
        console.error('Error generating text from audio:', error);
        throw new Error(error.message || 'Failed to generate text from audio');
    }
};
