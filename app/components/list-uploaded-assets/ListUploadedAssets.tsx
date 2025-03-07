'use client';
import { fetchAllAssets } from '@app/api/livepeer/actions';
import { Asset } from '@app/lib/types';
import { Box } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { Account } from 'thirdweb/wallets';
import UploadAsset from './UploadedAsset';

type ListUploadedAssetsProps = {
  activeAccount: Account;
};

export default function ListUploadedAssets(props: ListUploadedAssetsProps) {
  const [assets, setAssets] = useState<Asset[] | {}>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    const fetchUploadedAssets = async () => {
      try {
        setIsLoading(true);

        const ast = await fetchAllAssets();
        setAssets(ast);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUploadedAssets();
  }, []);

  const filteredCreatorAssets: Asset[] = useMemo(() => {
    return Array.isArray(assets)
      ? assets.filter(
          (ast: Asset) =>
            ast.creatorId &&
            ast.creatorId.value.toLowerCase() ===
              props.activeAccount.address.toLowerCase(),
        )
      : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, props.activeAccount.address]);

  if (error) {
    return (
      <Box mb={24}>
        <p>Error loading assets</p>{' '}
      </Box>
    );
  }

  return (
    <div className="mx-0 flex flex-col">
      {isLoading && filteredCreatorAssets.length === 0 && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground">Loading assets...</p>
        </div>
      )}

      {!isLoading && filteredCreatorAssets.length === 0 && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-muted-foreground">No videos uploaded yet</p>
        </div>
      )}

      {filteredCreatorAssets.length > 0 && (
        <div className="relative overflow-x-auto rounded-lg border">
          <table
            className="w-full table-auto divide-y divide-border"
            role="grid"
            aria-label="Uploaded Assets"
          >
            <thead>
              <tr className="bg-muted/50">
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  S/No.
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Created
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCreatorAssets.map((video, i) => (
                <UploadAsset
                  activeAccount={props.activeAccount}
                  asset={video}
                  idx={i}
                  key={`${video.id}-${video.createdAt}`}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
