import { videoContract } from '@app/lib/sdk/thirdweb/get-contract';
import { NFT, ResolvedReturnType } from '@app/types/nft';
import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { getClaimConditions } from 'thirdweb/extensions/erc1155';
import { useReadContract } from 'thirdweb/react';
import ListClaimConditions from '../ListClaimConditions/ListClaimConditions';
import SetClaimConditions from '../SetClaimConditions/SetClaimConditions';
import ClaimVideoNFT from '../claim-vidoe-nft/ClaimVideoNFT';

type ConfigureMintedAssetProps = {
  nft: NFT;
  toggleModal: () => void;
  setAddClaimPhase: (arg: boolean) => void;
  addClaimPhase: boolean;
};

export default function ConfigureMintedAsset(props: ConfigureMintedAssetProps) {
  const tabList = ['Details', 'Claim Conditions', 'Claim'];
  const [tabIndex, setTabIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(tabList[0]);

  const [claimConditions, setClaimConditions] = useState<
    ResolvedReturnType<ReturnType<typeof getClaimConditions>>
  >([]);

  const [processingClaimConditions, setProcessingClaimConditions] =
    useState(false);

  const { data: activeClaimConditionId, error: activeClaimError } =
    useReadContract({
      contract: videoContract,
      method:
        'function getActiveClaimConditionId(uint256 _tokenId) view returns (uint256)',
      params: [props.nft.id],
    });

  // console.log({ activeClaimConditionId });

  const handleTabsChange = (idx: number) => {
    setTabIndex(idx);
  };

  useEffect(() => {
    const getClaimConditionsById = async (tokenId: bigint) => {
      setProcessingClaimConditions(true);

      try {
        // fetch all existing claim conditions
        const cc = await getClaimConditions({
          contract: videoContract,
          tokenId,
        });

        if (cc && cc?.length > 0) {
          setProcessingClaimConditions(false);

          setClaimConditions([...cc]);
        }
      } catch (err) {
        setProcessingClaimConditions(false);
        console.error(err);
      }
    };

    getClaimConditionsById(props.nft.id);
  }, [props.nft.id]);

  const noActiveClaim = (label: string) => {
    return (
      label === tabList[tabList.length - 1] &&
      activeClaimConditionId === undefined
    );
  };
  return (
    <div className="fixed inset-0 top-0 h-screen overflow-y-auto bg-black bg-opacity-90">
      <div className="relative top-44 mx-auto w-full max-w-2xl rounded-lg bg-white p-8 shadow dark:bg-slate-800">
        <button
          onClick={() => {
            props.setAddClaimPhase(false);
            props.toggleModal();
          }}
          className="absolute right-4 top-4 mb-4 text-gray-500 hover:text-gray-600 focus:outline-none dark:hover:text-gray-200"
        >
          <p className="font-semibold" style={{ fontSize: 28 }}>
            &times;
          </p>
        </button>

        <Tabs index={tabIndex} onChange={handleTabsChange}>
          <TabList className="my-2 gap-1">
            {tabList.length > 0 &&
              tabList.map((label, i) => (
                <Tab
                  key={i}
                  name={label}
                  // disabled={noActiveClaim(label)}
                  className={`min-w-12 rounded-sm px-4 py-2 ${noActiveClaim(label) ? `` : `hover:bg-slate-400`} ${noActiveClaim(label) ? `` : ` hover:text-slate-800 `}${label === activeTab ? `text-slate-800` : `text-slate-500`} ${noActiveClaim(label) ? `hover:cursor-not-allowed` : `hover:cursor-pointer`} ${
                    label === activeTab
                      ? `bg-slate-400`
                      : noActiveClaim(label)
                        ? `bg-slate-600`
                        : ``
                  }`}
                  onClick={(e) => {
                    if (!noActiveClaim(label)) {
                      setActiveTab(label);
                    } else {
                      e.preventDefault();
                    }
                  }}
                >
                  {label}
                </Tab>
              ))}
          </TabList>

          <TabPanels>
            <TabPanel>
              <div className="my-8 flex flex-col gap-2 font-medium text-slate-400">
                <p className="flex">
                  <span className="min-w-28">Token ID:</span>
                  <span className="text-slate-300">
                    {props.nft.id.toString()}
                  </span>
                </p>
                <p className="flex">
                  <span className="min-w-28"> Token Name: </span>
                  <span className="text-slate-300">
                    {props.nft.metadata.name}
                  </span>
                </p>
                <p className="flex">
                  <span className="min-w-28"> Token Type: </span>
                  <span className="text-slate-300">{props.nft.type}</span>
                </p>

                <p className="flex">
                  <span className="min-w-28">Suppy:</span>
                  <span className="text-slate-300">
                    {props.nft.supply.toString()}
                  </span>
                </p>
              </div>
            </TabPanel>

            <TabPanel>
              <VStack spacing={0} alignItems={'flex-start'}>
                <ListClaimConditions
                  processingClaimConditions={processingClaimConditions}
                  nftContract={videoContract}
                  nft={props.nft!}
                  claimConditions={claimConditions}
                  addClaimPhase={props.addClaimPhase}
                  setAddClaimPhase={props.setAddClaimPhase}
                />
              </VStack>
            </TabPanel>

            <TabPanel>
              <ClaimVideoNFT videoContract={videoContract} usage="owner" />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}
