'use client';
import React, { useEffect, useState } from 'react';
import { Box, Button, Text } from '@chakra-ui/react';
import Image from 'next/image';

// Constants and Types
import {
  API_BASE_URL,
  //APP_BASE_URL,
  CLAIMED,
  LOADING,
  NO_POAP,
  STATES,
  UNCLAIMED,
} from '@app/lib/utils/context';

type State = 'NO_POAP' | 'NOT_VOTED' | 'LOADING' | 'UNCLAIMED' | 'CLAIMED';

interface Props {
  address: string;
  proposalId: string;
  snapshot: string;
}

// Utility function for API URL construction
const constructApiUrl = (path: string) => `${API_BASE_URL}/${path}`;


/**
 * Component for claiming POAP (Proof of Attendance Protocol) tokens.
 * 
 * @component
 * @example
 * // Usage
 * <ClaimPoap address="0x1234567890" proposalId="abc123" snapshot="xyz789" />
 * 
 * @param {string} address - The address of the user claiming the POAP token.
 * @param {string} proposalId - The ID of the proposal associated with the POAP token.
 * @param {string} snapshot - The snapshot ID associated with the POAP token.
 * 
 * @returns {JSX.Element} The ClaimPoap component.
 */
const ClaimPoap = ({ address, proposalId, snapshot }: Props) => {
  const [poapImg, setPoapImg] = useState<string>('');
  const [currentState, setCurrentState] = useState<State>(NO_POAP);
  const [loadButton, setLoadButton] = useState<boolean>(false);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const response = await fetch(constructApiUrl(`snapshot/proposal/${snapshot}`));
        if (!response.ok) throw new Error('Failed to fetch event');
        const { image_url, currentState }: { image_url: string; currentState: State } = await response.json();
        setPoapImg(image_url || '');
        setCurrentState(currentState);
      } catch (error) {
        console.error('Error fetching current state:', error);
      }
    };
    fetchState();
  }, [address, snapshot]);

  const action = async () => {
    if ([CLAIMED, UNCLAIMED].includes(currentState)) {
      setLoadButton(true);
      try {
        const newState = await claim(proposalId, address);
        setCurrentState(newState);
      } catch (error) {
        console.error('Error during claim action:', error);
      } finally {
        setLoadButton(false);
      }
    }
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
      <Image src={STATES[currentState].headerImage} alt="" width={125} height={125} />
      <Text marginBottom={2} fontWeight="semibold">
        {STATES[currentState].header}
      </Text>
      <Box>
        <Image
          src={poapImg || STATES[currentState].mainImage}
          alt="POAP"
          width={125}
          height={125}
          style={{ verticalAlign: 'middle' }}
        />
        {currentState !== NO_POAP && (
          <Button isLoading={currentState === LOADING || loadButton} onClick={action}>
            {STATES[currentState].buttonText}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ClaimPoap;

async function claim(proposalId: string, address: string): Promise<State> {
  try {
    const response = await fetch(constructApiUrl('claim/snapshot-proposal'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshotProposalHash: proposalId, address }),
    });
    if (!response.ok) throw new Error('Claim request failed');
    return 'LOADING'; // Assuming immediate transition to loading upon a successful claim request
  } catch (error) {
    console.error('Error claiming POAP:', error);
    return 'UNCLAIMED'; // Fallback state in case of error
  }
}