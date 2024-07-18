import React from 'react';
import { signSmartContractData } from '@wert-io/widget-sc-signer';
import WertWidget from '@wert-io/widget-initializer';
import type { Options } from '@wert-io/widget-initializer/types';
import { Button } from '@chakra-ui/react';
import { MdOutlineShoppingCartCheckout } from 'react-icons/md';
import { CREATIVE_ADDRESS, ROLES } from '@app/lib/utils/context';
import { useActiveAccount } from 'thirdweb/react';
import { toWei } from 'thirdweb';
import { v4 as uuidv4 } from 'uuid';
import { encodeFunctionData } from 'viem';
import creatorContract from '@app/lib/utils/contracts/creatorContract';
import Unlock from '@app/lib/utils/Unlock.json';


const WertPurchaseNFT = () => {
  const activeAccount = useActiveAccount();

  if (activeAccount) {
    const data = encodeFunctionData({
      abi: Unlock.abi,
      functionName: 'purchase',
      args: [
        [toWei('0.01')],
        [activeAccount?.address],
        [CREATIVE_ADDRESS],
        [CREATIVE_ADDRESS],
        ['0x'],
      ],
    });

    // WERT SIGNER HELPER
    const signedData = signSmartContractData(
      {
        address: activeAccount?.address,
        commodity: 'ETH',
        network: 'sepolia',
        commodity_amount: 0.01,
        sc_address: '0xbc20b339c0dc2793ab4ecece98567f65632015b7',
        sc_input_data: data,
      },
      `${process.env.WERT_PRIVATE_KEY}`,
    );

    const wertOptions: Options = {
      partner_id: '01FGKYK638SV618KZHAVEY7P79',
      click_id: uuidv4(),
      origin: 'https://sandbox.wert.io',
      color_buttons: '#EC407A',
      lang: 'en',
      skip_init_navigation: false,
    };

    const nftOptions = {
      extra: {
        item_info: {
          author_image_url:
            'https://bafkreiehm3yedt4cmtckelgfwqtgfvp6bolvk5nx2esle4tnwe7mi5q43q.ipfs.nftstorage.link/',
          author: 'Creative Org DAO',
          image_url:
            'https://locksmith.unlock-protocol.com/lock/0x9a9280897C123B165E23f77cf4c58292D6aB378d/icon',
          name: 'The BETA Membership',
          seller: 'Creative Organization DAO',
        },
      },
    };

    const wertWidget = new WertWidget({
      ...signedData,
      ...wertOptions,
      ...nftOptions,
    });

    return (
      <>
        <Button
          leftIcon={<MdOutlineShoppingCartCheckout />}
          onClick={() => wertWidget.open()}
        >
          Buy with Debit/Credit
        </Button>
      </>
    );
  }
  return (
    <>
      <Button
        leftIcon={<MdOutlineShoppingCartCheckout />}
        onClick={() => alert('Enter email to purchase a membership')}
      >
        Not Connected
      </Button>
    </>
  );
};

export default WertPurchaseNFT;
