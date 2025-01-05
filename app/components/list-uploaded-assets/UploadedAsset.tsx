import * as helpers from '@app/lib/helpers/helpers';
import { Asset } from '@app/lib/types';
import { Account } from 'thirdweb/wallets';

type TUploadAssetProps = {
  idx: number;
  activeAccount: Account;
  asset: Asset;
};

export default function UploadAsset(props: TUploadAssetProps) {
  return (
    <tr key={props.asset.id} className="text-[16px]">
      <td className="border border-slate-700 px-4 py-1">{props.idx + 1}</td>
      <td className="border border-slate-700 px-4 py-1">
        {helpers.titleCase(
          props.asset.name.length > 12
            ? props.asset.name.slice(0, 9) + '...'
            : props.asset.name,
        )}
      </td>
      <td className="border border-slate-700 px-4 py-1">
        {helpers.parseTimestampToDate(Number(props.asset.createdAt))}
      </td>
      <td className="border border-slate-700 px-4 py-1">
        {helpers.parseTimestampToDate(props.asset.status?.updatedAt)}
      </td>
    </tr>
  );
}
