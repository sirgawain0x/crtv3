import axios from 'axios';
import { LIVEPEER_API_KEY } from '../env';

const videoApi = axios.create({
  baseURL: 'https://livepeer.studio/api',
  headers: {
    Authorization: `Bearer ${LIVEPEER_API_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export default videoApi;
