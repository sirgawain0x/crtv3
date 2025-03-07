export function generateUUID(): string {
  const hex = [...Array(32)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
