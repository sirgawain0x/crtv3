'use server';

import { fullLivepeer } from '@app/lib/sdk/livepeer/fullClient';
import { InputCreatorIdType } from 'livepeer/models/components';

export const getLivepeerUploadUrl = async (
  fileName: string,
  creatorAddress: string,
) => {
  //   const livepeerUpload = `${process.env.LIVEPEER_API_URL}/api/asset/request-upload`;
  //   const headers = {
  //     Authorization: `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`,
  //     ContentType: 'application/json',
  //   };
  //   const options = { headers  };
  //   const response = await fetch(livepeerUpload, options);
  const result = await fullLivepeer.asset.create({
    name: fileName,
    storage: {
      ipfs: true,
    },
    creatorId: {
      type: InputCreatorIdType?.Unverified,
      value: creatorAddress,
    },
  });

  return result.data;
};
