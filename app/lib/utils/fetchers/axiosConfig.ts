import axios from 'axios';


const videoApi = axios.create({
  baseURL: 'https://livepeer.studio/api',
  headers: {
    Authorization: `Bearer ${process.env.LIVEPEER_API_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export default videoApi;
