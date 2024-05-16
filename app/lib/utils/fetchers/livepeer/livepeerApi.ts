import videoApi from '../axiosConfig';
import { handleAxiosError } from '../errorHandler';
import { AssetData, UploadAssetData } from '@app/lib/types';


export const fetchAllAssets = async (): Promise<AssetData[]> => {
  try {
    const response = await videoApi.get<AssetData[]>('/asset');
    return response.data;
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
};

export const fetchAssetById = async (id: string): Promise<AssetData> => {
    try {
      const response = await videoApi.get<AssetData>(`/data/video/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(handleAxiosError(error));
    }
};

export const deleteAssetById = async (id: string): Promise<void> => {
    try {
      await videoApi.delete(`/asset/${id}`);
    } catch (error) {
      throw new Error(handleAxiosError(error));
    }
};

export const updateAssetById = async (id: string, data: AssetData): Promise<void> => {
    try {
      await videoApi.put(`/asset/${id}`, data);
    } catch (error) {
      throw new Error(handleAxiosError(error));
    }
};

export const fetchAssetViews = async (id: string): Promise<AssetData['views']> => {
  try {
    const response = await videoApi.get<AssetData['views']>(`/data/views/query/total/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
};


// export const uploadAssetByURL = async (name: string): Promise<UploadAssetData> => {
//   try {
//     const response = await videoApi.post<AssetData>('/asset/upload/url', { 
//         name,

//     });
//     return response.data;
//   } catch (error) {
//     throw new Error(handleAxiosError(error));
//   }
// };




