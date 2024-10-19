import { TaskPhase } from 'livepeer/models/components';
import videoApi from '../axiosConfig';
import { handleAxiosError } from '../errorHandler';
import {
  AssetData,
  PlaybackPolicyType,
  UploadAssetData,
  SourceType,
  TemplateType,
  StorageStatusPhase,
  AssetType,
  CreatorIdType,
  AssetStatusPhase,
} from '@app/lib/types';
import { createAsset } from '@app/api/livepeer/actions';

const validateAssetData = (assets: AssetData[]): AssetData[] => {
  return assets.map((asset) => ({
    ...asset,
    video: asset.video || {
      // Ensure this matches the expected Asset type
      name: '',
      id: '',
      type: AssetType.Video,
      playbackUrl: '',
      downloadUrl: '',
      creatorId: { type: CreatorIdType.Unverified, value: '' },
      playbackId: '',
      storage: {
        status: {
          /* Ensure this matches the expected structure */
        },
      },
      // ... other properties as needed
    },
    // ... other properties
  }));
};

export const fetchAllAssets = async (): Promise<AssetData[]> => {
  try {
    const { data } = await videoApi.get<AssetData[]>('/asset');
    console.log('Fetched Assets:', data); // Log the response data
    return validateAssetData(data);
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

export const updateAssetById = async (
  id: string,
  data: AssetData,
): Promise<void> => {
  try {
    await videoApi.put(`/asset/${id}`, data);
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
};

export const fetchAssetViews = async (
  id: string,
): Promise<AssetData['views']> => {
  try {
    const response = await videoApi.get<AssetData['views']>(
      `/data/views/query/total/${id}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
};

export const uploadAssetByURL = async (
  name: string,
  url: string,
): Promise<UploadAssetData> => {
  try {
    const response = await videoApi.post<UploadAssetData>('/asset/upload/url', {
      name,
      url,
    });
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
