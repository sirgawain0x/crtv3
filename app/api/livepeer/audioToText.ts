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
                'Authorization': `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`
            }
        };

        // console.log({ options });

        const result = await fetch(`${livepeerApiUrl}/audio-to-text`, options);

        // console.log({ result });

        const data = await result.json();

        console.log({ audioToTextResponse: data });

        return data;
    } catch (error: any) {
        console.error('Error generating text from audio:', error);
        throw new Error(error.message || 'Failed to generate text from audio');
    }
};
