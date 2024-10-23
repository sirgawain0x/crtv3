'use server';

import type { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, model_id } = req.body;

    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append('Authorization', `Bearer ${process.env.LIVEPEER_API_KEY}`);

    const raw = JSON.stringify({
      prompt,
      model_id,
    });

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
    };

    const response = await fetch(
      'https://dream-gateway.livepeer.cloud/text-to-image',
      requestOptions,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in textToImage API:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Internal Server Error' });
  }
};

export default handler;
