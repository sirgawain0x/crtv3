import { AxiosError } from 'axios';

export const handleAxiosError = (error: unknown): string => {
  const axiosError = error as AxiosError;
  return axiosError.message;
};
