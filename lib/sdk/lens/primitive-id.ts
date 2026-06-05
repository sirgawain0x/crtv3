const EVM_ADDRESS_PATTERN = /\b0x[a-fA-F0-9]{40}\b/;

export function extractLensContractAddress(
  value: string | null | undefined,
): `0x${string}` | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const match = trimmed.match(EVM_ADDRESS_PATTERN);
  return match ? (match[0].toLowerCase() as `0x${string}`) : null;
}

export function normalizeLensPrimitiveId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  return extractLensContractAddress(trimmed);
}

export function getLensContractAddressError(
  value: string | null | undefined,
  label = 'Lens contract ID',
): string | null {
  if (!value || extractLensContractAddress(value)) return null;

  return `${label} must include a 0x contract address. Paste the Lens Feed contract address or a Lens contract ID that contains it.`;
}
