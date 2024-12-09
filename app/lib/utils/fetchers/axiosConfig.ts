import axios from 'axios';

function getVideoApiConfig() {
  const apiKey = process.env.LIVEPEER_FULL_API_KEY;

  if (!apiKey && process.env.NODE_ENV === 'production')
    throw new Error('LIVEPEER_FULL_API_KEY is required in production');

  return {
    baseURL: 'https://livepeer.studio/api',
    headers: {
      Authorization: apiKey ? `Bearer ${apiKey}` : '',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };
}

const videoApi = axios.create(getVideoApiConfig());

export default videoApi;
