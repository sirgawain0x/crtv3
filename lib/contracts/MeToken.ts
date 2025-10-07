import { Address } from 'viem';

export const METOKEN_ABI = [
  {
    "type": "constructor",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "firstController"
      },
      {
        "type": "address",
        "name": "diamondCutFacet"
      }
    ]
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "name": "DiamondCut",
    "type": "event",
    "inputs": [
      {
        "type": "tuple[]",
        "name": "diamondCut",
        "components": [
          {
            "type": "bytes4[]",
            "name": "functionSelectors"
          },
          {
            "type": "address",
            "name": "facetAddress"
          },
          {
            "type": "uint8",
            "name": "action"
          }
        ]
      },
      {
        "type": "address",
        "name": "init"
      },
      {
        "type": "bytes",
        "name": "data"
      }
    ]
  },
  {
    "name": "diamondCut",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "tuple[]",
        "name": "cut",
        "components": [
          {
            "type": "bytes4[]",
            "name": "functionSelectors"
          },
          {
            "type": "address",
            "name": "facetAddress"
          },
          {
            "type": "uint8",
            "name": "action"
          }
        ]
      },
      {
        "type": "address",
        "name": "init"
      },
      {
        "type": "bytes",
        "name": "data"
      }
    ],
    "outputs": []
  },
  {
    "name": "CancelUpdate",
    "type": "event",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      }
    ]
  },
  {
    "name": "Deactivate",
    "type": "event",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      }
    ]
  },
  {
    "name": "FinishUpdate",
    "type": "event",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      }
    ]
  },
  {
    "name": "InitUpdate",
    "type": "event",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      },
      {
        "type": "uint256",
        "name": "targetRefundRatio"
      },
      {
        "type": "uint32",
        "name": "targetReserveWeight"
      },
      {
        "type": "bool",
        "name": "reconfigure"
      },
      {
        "type": "uint256",
        "name": "startTime"
      },
      {
        "type": "uint256",
        "name": "endTime"
      },
      {
        "type": "uint256",
        "name": "endCooldown"
      }
    ]
  },
  {
    "name": "Register",
    "type": "event",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      },
      {
        "type": "address",
        "name": "owner"
      },
      {
        "type": "address",
        "name": "asset"
      },
      {
        "type": "address",
        "name": "vault"
      },
      {
        "type": "uint256",
        "name": "refundRatio"
      },
      {
        "type": "uint256",
        "name": "baseY"
      },
      {
        "type": "uint32",
        "name": "reserveWeight"
      },
      {
        "type": "bytes",
        "name": "encodedVaultArgs"
      }
    ]
  },
  {
    "name": "TransferHubOwnership",
    "type": "event",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      },
      {
        "type": "address",
        "name": "newOwner"
      }
    ]
  },
  {
    "name": "cancelUpdate",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      }
    ],
    "outputs": []
  },
  {
    "name": "count",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "deactivate",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      }
    ],
    "outputs": []
  },
  {
    "name": "finishUpdate",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      }
    ],
    "outputs": []
  },
  {
    "name": "getBasicHubInfo",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "refundRatio"
      },
      {
        "type": "address",
        "name": "owner"
      },
      {
        "type": "address",
        "name": "vault"
      },
      {
        "type": "address",
        "name": "asset"
      },
      {
        "type": "bool",
        "name": "updating"
      },
      {
        "type": "bool",
        "name": "active"
      }
    ]
  },
  {
    "name": "getHubInfo",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      }
    ],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "type": "uint256",
            "name": "startTime"
          },
          {
            "type": "uint256",
            "name": "endTime"
          },
          {
            "type": "uint256",
            "name": "endCooldown"
          },
          {
            "type": "uint256",
            "name": "refundRatio"
          },
          {
            "type": "uint256",
            "name": "targetRefundRatio"
          },
          {
            "type": "address",
            "name": "owner"
          },
          {
            "type": "address",
            "name": "vault"
          },
          {
            "type": "address",
            "name": "asset"
          },
          {
            "type": "bool",
            "name": "updating"
          },
          {
            "type": "bool",
            "name": "reconfigure"
          },
          {
            "type": "bool",
            "name": "active"
          }
        ]
      }
    ]
  },
  {
    "name": "hubCooldown",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "hubDuration",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "hubWarmup",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "initUpdate",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      },
      {
        "type": "uint256",
        "name": "targetRefundRatio"
      },
      {
        "type": "uint32",
        "name": "targetReserveWeight"
      }
    ],
    "outputs": []
  },
  {
    "name": "register",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "owner"
      },
      {
        "type": "address",
        "name": "asset"
      },
      {
        "type": "address",
        "name": "vault"
      },
      {
        "type": "uint256",
        "name": "refundRatio"
      },
      {
        "type": "uint256",
        "name": "baseY"
      },
      {
        "type": "uint32",
        "name": "reserveWeight"
      },
      {
        "type": "bytes",
        "name": "encodedVaultArgs"
      }
    ],
    "outputs": []
  },
  {
    "name": "setHubCooldown",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "period"
      }
    ],
    "outputs": []
  },
  {
    "name": "setHubDuration",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "period"
      }
    ],
    "outputs": []
  },
  {
    "name": "setHubWarmup",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "period"
      }
    ],
    "outputs": []
  },
  {
    "name": "transferHubOwnership",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "id"
      },
      {
        "type": "address",
        "name": "newOwner"
      }
    ],
    "outputs": []
  },
  {
    "name": "Burn",
    "type": "event",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "address",
        "name": "asset"
      },
      {
        "type": "address",
        "name": "burner"
      },
      {
        "type": "address",
        "name": "recipient"
      },
      {
        "type": "uint256",
        "name": "meTokensBurned"
      },
      {
        "type": "uint256",
        "name": "assetsReturned"
      }
    ]
  },
  {
    "name": "Donate",
    "type": "event",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "address",
        "name": "asset"
      },
      {
        "type": "address",
        "name": "donor"
      },
      {
        "type": "uint256",
        "name": "assetsDeposited"
      }
    ]
  },
  {
    "name": "Mint",
    "type": "event",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "address",
        "name": "asset"
      },
      {
        "type": "address",
        "name": "depositor"
      },
      {
        "type": "address",
        "name": "recipient"
      },
      {
        "type": "uint256",
        "name": "assetsDeposited"
      },
      {
        "type": "uint256",
        "name": "meTokensMinted"
      }
    ]
  },
  {
    "name": "burn",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "uint256",
        "name": "meTokensBurned"
      },
      {
        "type": "address",
        "name": "recipient"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "assetsReturned"
      }
    ]
  },
  {
    "name": "calculateAssetsReturned",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "uint256",
        "name": "meTokensBurned"
      },
      {
        "type": "address",
        "name": "sender"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "assetsReturned"
      }
    ]
  },
  {
    "name": "calculateMeTokensMinted",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "uint256",
        "name": "assetsDeposited"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "meTokensMinted"
      }
    ]
  },
  {
    "name": "donate",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "uint256",
        "name": "assetsDeposited"
      }
    ],
    "outputs": []
  },
  {
    "name": "mint",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "uint256",
        "name": "assetsDeposited"
      },
      {
        "type": "address",
        "name": "recipient"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "meTokensMinted"
      }
    ]
  },
  {
    "name": "mintWithPermit",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "uint256",
        "name": "assetsDeposited"
      },
      {
        "type": "address",
        "name": "recipient"
      },
      {
        "type": "uint256",
        "name": "deadline"
      },
      {
        "type": "uint8",
        "name": "vSig"
      },
      {
        "type": "bytes32",
        "name": "rSig"
      },
      {
        "type": "bytes32",
        "name": "sSig"
      }
    ],
    "outputs": [
      {
        "type": "uint256",
        "name": "meTokensMinted"
      }
    ]
  },
  {
    "name": "getCurveInfo",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "hubId"
      }
    ],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "type": "uint256",
            "name": "baseY"
          },
          {
            "type": "uint256",
            "name": "targetBaseY"
          },
          {
            "type": "uint32",
            "name": "reserveWeight"
          },
          {
            "type": "uint32",
            "name": "targetReserveWeight"
          }
        ]
      }
    ]
  },
  {
    "name": "viewAssetsReturned",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "meTokensBurned"
      },
      {
        "type": "uint256",
        "name": "hubId"
      },
      {
        "type": "uint256",
        "name": "supply"
      },
      {
        "type": "uint256",
        "name": "balancePooled"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "viewMeTokensMinted",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "assetsDeposited"
      },
      {
        "type": "uint256",
        "name": "hubId"
      },
      {
        "type": "uint256",
        "name": "supply"
      },
      {
        "type": "uint256",
        "name": "balancePooled"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "viewTargetAssetsReturned",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "meTokensBurned"
      },
      {
        "type": "uint256",
        "name": "hubId"
      },
      {
        "type": "uint256",
        "name": "supply"
      },
      {
        "type": "uint256",
        "name": "balancePooled"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "viewTargetMeTokensMinted",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "uint256",
        "name": "assetsDeposited"
      },
      {
        "type": "uint256",
        "name": "hubId"
      },
      {
        "type": "uint256",
        "name": "supply"
      },
      {
        "type": "uint256",
        "name": "balancePooled"
      }
    ],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "SetBurnBuyerFee",
    "type": "event",
    "inputs": [
      {
        "type": "uint256",
        "name": "rate"
      }
    ]
  },
  {
    "name": "SetBurnOwnerFee",
    "type": "event",
    "inputs": [
      {
        "type": "uint256",
        "name": "rate"
      }
    ]
  },
  {
    "name": "SetMintFee",
    "type": "event",
    "inputs": [
      {
        "type": "uint256",
        "name": "rate"
      }
    ]
  },
  {
    "name": "burnBuyerFee",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "burnOwnerFee",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "mintFee",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "setBurnBuyerFee",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "rate"
      }
    ],
    "outputs": []
  },
  {
    "name": "setBurnOwnerFee",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "rate"
      }
    ],
    "outputs": []
  },
  {
    "name": "setMintFee",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "rate"
      }
    ],
    "outputs": []
  },
  {
    "name": "CancelResubscribe",
    "type": "event",
    "inputs": [
      {
        "type": "address",
        "name": "meToken",
        "indexed": true
      }
    ]
  },
  {
    "name": "CancelTransferMeTokenOwnership",
    "type": "event",
    "inputs": [
      {
        "type": "address",
        "name": "from"
      },
      {
        "type": "address",
        "name": "meToken"
      }
    ]
  },
  {
    "name": "ClaimMeTokenOwnership",
    "type": "event",
    "inputs": [
      {
        "type": "address",
        "name": "from"
      },
      {
        "type": "address",
        "name": "to"
      },
      {
        "type": "address",
        "name": "meToken"
      }
    ]
  },
  {
    "name": "FinishResubscribe",
    "type": "event",
    "inputs": [
      {
        "type": "address",
        "name": "meToken",
        "indexed": true
      }
    ]
  },
  {
    "name": "InitResubscribe",
    "type": "event",
    "inputs": [
      {
        "type": "address",
        "name": "meToken",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "targetHubId"
      },
      {
        "type": "address",
        "name": "migration"
      },
      {
        "type": "bytes",
        "name": "encodedMigrationArgs"
      }
    ]
  },
  {
    "name": "Subscribe",
    "type": "event",
    "inputs": [
      {
        "type": "address",
        "name": "meToken",
        "indexed": true
      },
      {
        "type": "address",
        "name": "owner",
        "indexed": true
      },
      {
        "type": "uint256",
        "name": "minted"
      },
      {
        "type": "address",
        "name": "asset"
      },
      {
        "type": "uint256",
        "name": "assetsDeposited"
      },
      {
        "type": "string",
        "name": "name"
      },
      {
        "type": "string",
        "name": "symbol"
      },
      {
        "type": "uint256",
        "name": "hubId"
      }
    ]
  },
  {
    "name": "TransferMeTokenOwnership",
    "type": "event",
    "inputs": [
      {
        "type": "address",
        "name": "from"
      },
      {
        "type": "address",
        "name": "to"
      },
      {
        "type": "address",
        "name": "meToken"
      }
    ]
  },
  {
    "name": "UpdateBalanceLocked",
    "type": "event",
    "inputs": [
      {
        "type": "bool",
        "name": "add"
      },
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "uint256",
        "name": "amount"
      }
    ]
  },
  {
    "name": "UpdateBalancePooled",
    "type": "event",
    "inputs": [
      {
        "type": "bool",
        "name": "add"
      },
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "uint256",
        "name": "amount"
      }
    ]
  },
  {
    "name": "UpdateBalances",
    "type": "event",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "uint256",
        "name": "newBalance"
      }
    ]
  },
  {
    "name": "cancelResubscribe",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      }
    ],
    "outputs": []
  },
  {
    "name": "cancelTransferMeTokenOwnership",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [],
    "outputs": []
  },
  {
    "name": "claimMeTokenOwnership",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "oldOwner"
      }
    ],
    "outputs": []
  },
  {
    "name": "finishResubscribe",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      }
    ],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "type": "address",
            "name": "owner"
          },
          {
            "type": "uint256",
            "name": "hubId"
          },
          {
            "type": "uint256",
            "name": "balancePooled"
          },
          {
            "type": "uint256",
            "name": "balanceLocked"
          },
          {
            "type": "uint256",
            "name": "startTime"
          },
          {
            "type": "uint256",
            "name": "endTime"
          },
          {
            "type": "uint256",
            "name": "targetHubId"
          },
          {
            "type": "address",
            "name": "migration"
          }
        ]
      }
    ]
  },
  {
    "name": "getBasicMeTokenInfo",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      }
    ],
    "outputs": [
      {
        "type": "address",
        "name": "owner"
      },
      {
        "type": "uint256",
        "name": "hubId"
      },
      {
        "type": "uint256",
        "name": "balancePooled"
      },
      {
        "type": "uint256",
        "name": "balanceLocked"
      },
      {
        "type": "address",
        "name": "migration"
      }
    ]
  },
  {
    "name": "getMeTokenInfo",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      }
    ],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          {
            "type": "address",
            "name": "owner"
          },
          {
            "type": "uint256",
            "name": "hubId"
          },
          {
            "type": "uint256",
            "name": "balancePooled"
          },
          {
            "type": "uint256",
            "name": "balanceLocked"
          },
          {
            "type": "uint256",
            "name": "startTime"
          },
          {
            "type": "uint256",
            "name": "endTime"
          },
          {
            "type": "uint256",
            "name": "targetHubId"
          },
          {
            "type": "address",
            "name": "migration"
          }
        ]
      }
    ]
  },
  {
    "name": "getOwnerMeToken",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "owner"
      }
    ],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "getPendingOwner",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "oldOwner"
      }
    ],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "initResubscribe",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "uint256",
        "name": "targetHubId"
      },
      {
        "type": "address",
        "name": "migration"
      },
      {
        "type": "bytes",
        "name": "encodedMigrationArgs"
      }
    ],
    "outputs": []
  },
  {
    "name": "isOwner",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "owner"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "name": "meTokenDuration",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "meTokenWarmup",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "uint256"
      }
    ]
  },
  {
    "name": "setMeTokenDuration",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "period"
      }
    ],
    "outputs": []
  },
  {
    "name": "setMeTokenWarmup",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "uint256",
        "name": "period"
      }
    ],
    "outputs": []
  },
  {
    "name": "subscribe",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "string",
        "name": "name"
      },
      {
        "type": "string",
        "name": "symbol"
      },
      {
        "type": "uint256",
        "name": "hubId"
      },
      {
        "type": "uint256",
        "name": "assetsDeposited"
      }
    ],
    "outputs": []
  },
  {
    "name": "transferMeTokenOwnership",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "newOwner"
      }
    ],
    "outputs": []
  },
  {
    "name": "updateBalances",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "meToken"
      },
      {
        "type": "uint256",
        "name": "newBalance"
      }
    ],
    "outputs": []
  },
  {
    "name": "facetAddress",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "bytes4",
        "name": "functionSelector"
      }
    ],
    "outputs": [
      {
        "type": "address",
        "name": "facetAddress_"
      }
    ]
  },
  {
    "name": "facetAddresses",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address[]",
        "name": "facetAddresses_"
      }
    ]
  },
  {
    "name": "facetFunctionSelectors",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "address",
        "name": "facet"
      }
    ],
    "outputs": [
      {
        "type": "bytes4[]",
        "name": "facetFunctionSelectors_"
      }
    ]
  },
  {
    "name": "facets",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "tuple[]",
        "name": "facets_",
        "components": [
          {
            "type": "address",
            "name": "facetAddress"
          },
          {
            "type": "bytes4[]",
            "name": "functionSelectors"
          }
        ]
      }
    ]
  },
  {
    "name": "supportsInterface",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {
        "type": "bytes4",
        "name": "interfaceId"
      }
    ],
    "outputs": [
      {
        "type": "bool"
      }
    ]
  },
  {
    "name": "deactivateController",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "diamondController",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "durationsController",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "feesController",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "registerController",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "name": "setDeactivateController",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "newController"
      }
    ],
    "outputs": []
  },
  {
    "name": "setDiamondController",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "newController"
      }
    ],
    "outputs": []
  },
  {
    "name": "setDurationsController",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "newController"
      }
    ],
    "outputs": []
  },
  {
    "name": "setFeesController",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "newController"
      }
    ],
    "outputs": []
  },
  {
    "name": "setRegisterController",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "newController"
      }
    ],
    "outputs": []
  },
  {
    "name": "setTrustedForwarder",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "type": "address",
        "name": "forwarder"
      }
    ],
    "outputs": []
  },
  {
    "name": "trustedForwarder",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "type": "address"
      }
    ]
  },
  {
    "type": "fallback"
  }
] as const;

export const getMeTokenContract = (address: Address) => ({
  address,
  abi: METOKEN_ABI,
});

export type MeTokenContract = ReturnType<typeof getMeTokenContract>;
