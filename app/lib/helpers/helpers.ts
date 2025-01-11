import { NFT } from '@app/types/nft';
import {
  getCurrencyMetadata,
  GetCurrencyMetadataResult,
} from 'thirdweb/extensions/erc20';
import { NFTMetadata } from 'thirdweb/utils';
import { erc20Contract } from '../sdk/thirdweb/get-contract';
import { CONTRACT_ADDRESS } from '../utils/context';
import { ethers } from 'ethers';

/**
 * Converts a timestamp to a form input date string.
 * 
 * @param timestamp - A bigint representing the timestamp to be parsed
 * @returns A formatted date string in 'YYYY-MM-DDTHH:MM' format
 * 
 * @remarks
 * Handles timestamp conversion, ensuring zero-padded month, date, hour, and minute values.
 * 
 * @example
 * parseDate(1705420412000n) // Returns '2024-01-16T13:13'
 */
export function parseDate(timestamp: bigint) {
  const d = new Date(Number(timestamp));

  const hour = d.getHours();
  const minutes = d.getMinutes();
  const date = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  const dd = date > 10 ? date : `0${date}`;
  const mm = month > 10 ? month : `0${month + 1}`;
  const hh = hour > 10 ? hour : `0${hour}`;
  const min = minutes > 10 ? minutes : `0${minutes}`;

  // '2024-01-16T11:45'
  return `${year}-${mm}-${dd}T${hh}:${min}`;
}

/**
 * Converts a numeric timestamp to a human-readable date string.
 * 
 * @param ts - The timestamp in milliseconds since the Unix epoch
 * @returns A formatted date string or 'Not available' for non-positive timestamps
 * 
 * @remarks
 * Uses Intl.DateTimeFormat to create a localized date and time representation.
 * Returns a string in the format 'MM/DD/YYYY HH:MM AM/PM'.
 * 
 * @example
 * parseTimestampToDate(1706025600000) // Returns "Jan 24, 2024 12:00 PM"
 * parseTimestampToDate(0) // Returns "Not available"
 */
export function parseTimestampToDate(ts: number) {
  if (ts <= 0) {
    return 'Not available';
  }

  const d = new Date(ts);
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });

  const date = dateFormatter.format(d);
  const time = timeFormatter.format(d);

  return `${date} ${time}`;
}

/**
 * Converts a bigint timestamp to a formatted date string.
 * 
 * @param ts - The timestamp in bigint format representing the number of seconds since the Unix epoch
 * @returns A formatted date string in the 'DD/MM/YYYY, HH:MM:SS' format
 * 
 * @remarks
 * Uses the `dateObject` utility function to extract individual date components.
 * Handles non-positive timestamps by returning default values through `dateObject`.
 * 
 * @example
 * const formattedDate = timestampToDateString(1734801000n);
 * // Returns: "22/12/2024, 09:59:00"
 */
export function timestampToDateString(ts: bigint) {
  const { day, hours, minutes, month, seconds, year } = dateObject(ts);

  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

/**
 * Converts a bigint timestamp to a formatted date string suitable for input fields.
 * 
 * @param ts - The timestamp in bigint format
 * @returns A date string formatted as 'YYYY-MM-DDTHH:MM:SS'
 * 
 * @remarks
 * Uses the `dateObject` function to extract date components from the timestamp.
 * Useful for populating date input fields in forms or interfaces.
 */
export function timestampToInputDateString(ts: bigint) {
  const { day, hours, minutes, month, seconds, year } = dateObject(ts);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

type DateObjectType = {
  day: string;
  month: string;
  year: number;
  hours: string;
  minutes: string;
  seconds: string;
};
/**
 * Converts a timestamp to a structured date object with formatted components.
 *
 * @param ts - A bigint timestamp representing seconds since the Unix epoch
 * @returns An object containing formatted date and time components
 *
 * @remarks
 * - Handles non-positive timestamps by returning default zero values
 * - Converts timestamp to milliseconds by multiplying by 1000
 * - Ensures two-digit formatting for day, month, hours, minutes, and seconds
 * - Returns zero/padded values for invalid or zero timestamps
 *
 * @example
 * ```typescript
 * const dateInfo = dateObject(1672531200n);
 * // Returns: { day: '01', month: '01', year: 2023, hours: '00', minutes: '00', seconds: '00' }
 * 
 * const invalidDate = dateObject(0n);
 * // Returns: { day: '00', month: '00', year: 0, hours: '00', minutes: '00', seconds: '00' }
 * ```
 */
function dateObject(ts: bigint): DateObjectType {
  const tsNumber = Number(ts);
  if (tsNumber <= 0) {
    return {
      day: '00',
      month: '00',
      year: 0,
      hours: '00',
      minutes: '00',
      seconds: '00',
    };
  }

  const date = new Date(tsNumber * 1000);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return { day, month, year, hours, minutes, seconds };
}

/**
 * The function wrap a sentence at particular length of characters
 * @param txt The sentence body
 * @param wrapAfter The number of characters to start
 * @returns The wrapped sentence
 */
export const wordWrap = (txt: string, wrapAfter: number) => {
  txt = txt.trim();

  if (txt.length < wrapAfter) {
    throw new Error(
      `String lenght of ${txt.length} is shorter than wrapAfter of ${wrapAfter}`,
    );
  }

  if (txt.length > wrapAfter) {
    return txt.slice(0, wrapAfter) + '...';
  }

  return txt;
};

export const titleCase = (txt: string) => {
  if (typeof txt !== 'string') {
    throw new Error(`The argument ${txt} is not a string`);
  }
  if (txt === '') throw new Error('Can not parse empty string');

  return txt.slice(0, 1).toUpperCase() + txt.slice(1);
};

export const claimConditionsOptions = {
  phase: {
    'Select phase': '',
    'Phase 1': 'Phase 1',
  },
  waitInSecondsOptions: {
    'Select period': '',
    '5 mins': 60 * 5,
    '15 mins': 60 * 15,
    '30 mins': 60 * 30,
    '1 hr': 60 * 60 * 1,
    '3 hrs': 60 * 60 * 3,
    '6 hrs': 60 * 60 * 6,
    '9 hrs': 60 * 60 * 9,
    '12 hrs': 60 * 60 * 12,
    '24 hrs': 60 * 60 * 24,
    '48 hrs': 60 * 60 * 24 * 2,
    '72 hrs': 60 * 60 * 24 * 3,
    '96 hrs': 60 * 60 * 24 * 4,
    '120 hrs': 60 * 60 * 24 * 5,
  },
  currency: {
    // The tokens accepted for payment by the buyer
    USDC: CONTRACT_ADDRESS.erc20.USDC.chain.polygon.amoy,
    POL: CONTRACT_ADDRESS.erc20.POL.chain.polygon.amoy,
  },
};

/**
 * Extracts the Content Identifier (CID) from an IPFS URI.
 *
 * @param ipfsUri - The IPFS URI from which to extract the CID
 * @returns The CID portion of the IPFS URI
 *
 * @remarks
 * This function assumes the IPFS URI follows the format 'ipfs://[CID]' and splits the URI to return the CID.
 *
 * @example
 * ```typescript
 * const cid = extractCID('ipfs://QmXYZ123456'); // Returns 'QmXYZ123456'
 * ```
 */
function extractCID(ipfsUri: string) {
  return ipfsUri.split(/\/\//g)[1];
}

/**
 * Processes an array of NFTs by fetching and transforming their metadata from IPFS.
 *
 * @remarks
 * This function iterates through an array of NFTs, retrieves their metadata from an IPFS gateway,
 * and updates the animation and image URLs to point to the full IPFS resource.
 *
 * @param arr - An array of NFT objects to process
 * @returns A new array of NFTs with updated metadata
 *
 * @throws {Error} If metadata fetching or parsing fails
 *
 * @beta
 */
export async function parseMetadata2(arr: NFT[]) {
  const ast: NFT[] = [];
  const delimiter = 'ipfs/';

  for (let i = 0; i < arr.length; i++) {
    const cid = arr[i].metadata.uri.split(delimiter)[1].substring(0, 59);

    if (cid !== undefined) {
      const res = await fetch(
        `https://ipfs.livepeer.studio/${delimiter}${cid}`,
      );

      const mtd: NFTMetadata = await res.json();

      if (mtd.animation_url != undefined || mtd.animation_url !== '') {
        mtd.animation_url = `https://ipfs.livepeer.studio/${delimiter}${extractCID(mtd.animation_url ?? '')}`;
      }

      if (mtd.image != undefined || mtd.image !== '') {
        mtd.image = `https://ipfs.livepeer.studio/${delimiter}${extractCID(mtd.image ?? '')}`;
      }

      // arr[i].metadata = {
      //   ...mtd,
      // };
    }

    ast.push(arr[i]);
  }

  return ast;
}

/**
 * Fetches metadata from an IPFS URI with error handling and timeout.
 *
 * @param uri - The IPFS URI from which to fetch metadata
 * @returns A promise resolving to the parsed metadata
 * @throws {Error} If the URI is invalid, fetch fails, or metadata cannot be parsed
 *
 * @remarks
 * - Uses Livepeer IPFS gateway for metadata retrieval
 * - Implements a 5-second timeout for the fetch operation
 * - Handles HTTP errors and network-related issues
 */
export function fetchMetadata(uri: string) {
  const delimiter = '/';

  const cid = uri.split(delimiter)[2];

  if (cid === undefined) {
    throw new Error('Invalid URI format.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  return fetch(`https://ipfs.livepeer.studio/ipfs/${cid}`, {
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      return res.json();
    })
    .then(async (data) => {
      return await data.json();
    })
    .catch((err) => {
      throw new Error(`Failed to fetch metadata: ${err.message}`);
    })
    .finally(() => {
      clearTimeout(timeoutId);
    });
}

/**
 * Converts an IPFS URI to a full gateway URL.
 *
 * @param uri - The IPFS URI to be converted
 * @param baseURIGateway - The base IPFS gateway URL (defaults to Livepeer studio gateway)
 * @returns A fully resolved IPFS gateway URL for the given URI
 *
 * @remarks
 * This function transforms an IPFS URI from the compact 'ipfs://' format 
 * to a full HTTP gateway URL that can be directly accessed.
 *
 * @example
 * ```typescript
 * const gatewayUrl = parseIpfsUri('ipfs://QmXYZ123...');
 * // Returns 'https://ipfs.livepeer.studio/ipfs/QmXYZ123...'
 * ```
 */
export function parseIpfsUri(
  uri: string,
  baseURIGateway = 'https://ipfs.livepeer.studio/',
) {
  const delimiter = 'ipfs://';
  const cid = uri.split(delimiter)[1];
  const itemUri = baseURIGateway + 'ipfs/' + cid;

  return itemUri;
}

/**
 * Retrieves metadata for an ERC20 token by its contract address.
 *
 * @param address - The contract address of the ERC20 token
 * @returns A promise resolving to the token's metadata
 * @throws {Error} If there is an issue fetching the token's metadata
 *
 * @remarks
 * This function uses the `getCurrencyMetadata` method to fetch token details.
 * Any errors during metadata retrieval are logged and re-thrown with a descriptive message.
 */
export function getERC20Metadata(
  address: string,
): Promise<GetCurrencyMetadataResult> {
  return getCurrencyMetadata({
    contract: erc20Contract(address),
  }).catch((err) => {
    console.error(err);
    throw new Error(`Error fetching currency metatdat: ${err.message}`);
  });
}

/**
 * Function to parse currency decimals
 * @param price The price of the nft
 * @param decimals The decimal point of the currency
 * @returns price in decimal format
 */
export const priceInHumanReadable = (price: bigint, decimals: number) => {
  if (decimals < 0) {
    throw new Error('Decimals must be non-negative');
  }

  return ethers.formatUnits(price, decimals);
};
