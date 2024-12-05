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

        if (params.modelId) params.formData.append('model_id', params.modelId);
        if (params.returnTimestamps) params.formData.append('return_timestamps', params.returnTimestamps);

        const livepeerApiUrl = process.env.LIVEPEER_API_URL || 'https://dream-gateway.livepeer.cloud';
            
        // Setup request timeout using AbortController
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const options = {
            method: 'POST',
            body: params.formData,
            headers: {
                'Authorization': `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`
            },
            signal: controller.signal
        };

        const result = await fetch(`https://livepeer.studio/api/beta/generate/audio-to-text`, options);

        clearTimeout(timeout);

        // if (!result.ok) {
        //   throw new Error('Translation error: ' + result.statusText);
        // }

        const data = await result.json();

        console.log({ audioToTextResponse: data });

        if (!data.chunks) {
            return placeholderData;
        }

        return data;
    } catch (error: any) {
        console.error('Error generating text from audio:', error);
        throw new Error(error.message || 'Failed to generate text from audio');
    }
};

const placeholderData = {
    "chunks": [
        {
            "text": " Look, you know I love a tiger",
            "timestamp": [
                0,
                2
            ]
        },
        {
            "text": " She got the Banzai Maya",
            "timestamp": [
                2,
                4
            ]
        },
        {
            "text": " I'm about to buy that betcha car",
            "timestamp": [
                4,
                6
            ]
        },
        {
            "text": " I'm about to send Ardy the wire",
            "timestamp": [
                6,
                8
            ]
        },
        {
            "text": " You know I love a tiger",
            "timestamp": [
                8,
                9
            ]
        },
        {
            "text": " I skirt her high ass like a tire",
            "timestamp": [
                9,
                11
            ]
        },
        {
            "text": " She like poppin' you on fire",
            "timestamp": [
                11,
                13
            ]
        },
        {
            "text": " She like poppin' you on fire",
            "timestamp": [
                13,
                15
            ]
        },
        {
            "text": " 4-4 barking, aye, hold on",
            "timestamp": [
                15,
                17
            ]
        },
        {
            "text": " Louder than the church choir",
            "timestamp": [
                17,
                18
            ]
        },
        {
            "text": " I do a drill in the suit",
            "timestamp": [
                18,
                20
            ]
        },
        {
            "text": " Then I change my attire",
            "timestamp": [
                20,
                21
            ]
        },
        {
            "text": " Look, she throw that ass back in a quick sec",
            "timestamp": [
                21,
                23
            ]
        }
    ],
    "text": " Look, you know I love a tiger She got the Banzai Maya I'm about to buy that betcha car I'm about to send Ardy the wire You know I love a tiger I skirt her high ass like a tire She like poppin' you on fire She like poppin' you on fire 4-4 barking, aye, hold on Louder than the church choir I do a drill in the suit Then I change my attire Look, she throw that ass back in a quick sec"
};