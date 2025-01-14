import * as helpers from '@app/lib/helpers/helpers';
import type { Asset } from '@app/lib/types';
import type { Account } from 'thirdweb/wallets';
import Link from 'next/link';

type TUploadAssetProps = {
  idx: number;
  activeAccount: Account;
  asset: Asset;
};

export default function UploadAsset(props: TUploadAssetProps) {
  return (
    <tr key={props.asset.id} className="text-[16px] hover:bg-muted/50">
      <td className="border border-slate-700 px-4 py-1">{props.idx + 1}</td>
      <td className="border border-slate-700 px-4 py-1">
        <Link 
          href={`/discover/${props.asset.id}`}
          className="text-primary hover:text-primary/80 hover:underline"
        >
          {helpers.titleCase(
            props.asset.name.length > 12
              ? props.asset.name.slice(0, 9) + '...'
              : props.asset.name,
          )}
        </Link>
      </td>
      <td className="border border-slate-700 px-4 py-1">
        {helpers.parseTimestampToDate(Number(props.asset.createdAt))}
      </td>
      <td className="border border-slate-700 px-4 py-1">
        {helpers.parseTimestampToDate(props.asset.status?.updatedAt ?? 0)}
      </td>
    </tr>
  );
}
