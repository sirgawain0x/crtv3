import axios, { AxiosError } from 'axios';
import { AssetData } from '@app/lib/types';

export const videoApi = axios.create({
  baseURL: 'https://livepeer.studio/api/data/views/query/total/',
  headers: {
    Authorization: `Bearer ${process.env.LIVEPEER_API_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const fetchVideoViews = async (playbackId: string) => {
  const response = await videoApi.get<AssetData['views']>(`${playbackId}`);
  try {
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    throw new Error(axiosError.message);
  }
};
