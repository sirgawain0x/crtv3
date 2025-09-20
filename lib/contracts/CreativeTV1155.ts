// Minimal ERC-1155 ABI required for minting and basic reads
// Extend as needed
export const creativeTv1155Abi = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    stateMutability: "view",
    name: "uri",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    stateMutability: "view",
    name: "balanceOf",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;


