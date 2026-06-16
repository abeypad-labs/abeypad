import { CONTRACT_ADDRESSES } from "../contracts";

export const PresaleFactory = {
  address: CONTRACT_ADDRESSES.presaleFactory,
  abi: [
    { "type": "constructor", "inputs": [], "stateMutability": "nonpayable" },
    {
      "type": "function",
      "name": "allPresales",
      "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
      "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "createPresale",
      "inputs": [
        {
          "name": "params",
          "type": "tuple",
          "internalType": "struct PresaleFactory.CreateParams",
          "components": [
            {
              "name": "saleToken",
              "type": "address",
              "internalType": "address"
            },
            {
              "name": "paymentToken",
              "type": "address",
              "internalType": "address"
            },
            {
              "name": "config",
              "type": "tuple",
              "internalType": "struct PresaleConfig",
              "components": [
                {
                  "name": "startTime",
                  "type": "uint64",
                  "internalType": "uint64"
                },
                {
                  "name": "endTime",
                  "type": "uint64",
                  "internalType": "uint64"
                },
                {
                  "name": "rate",
                  "type": "uint256",
                  "internalType": "uint256"
                },
                {
                  "name": "softCap",
                  "type": "uint256",
                  "internalType": "uint256"
                },
                {
                  "name": "hardCap",
                  "type": "uint256",
                  "internalType": "uint256"
                },
                {
                  "name": "minContribution",
                  "type": "uint256",
                  "internalType": "uint256"
                },
                {
                  "name": "maxContribution",
                  "type": "uint256",
                  "internalType": "uint256"
                }
              ]
            },
            { "name": "owner", "type": "address", "internalType": "address" }
          ]
        }
      ],
      "outputs": [
        { "name": "presale", "type": "address", "internalType": "address" }
      ],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "factoryOwner",
      "inputs": [],
      "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "feeRecipient",
      "inputs": [],
      "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "presalesCreatedBy",
      "inputs": [
        { "name": "creator", "type": "address", "internalType": "address" }
      ],
      "outputs": [
        { "name": "", "type": "address[]", "internalType": "address[]" }
      ],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "setFeeRecipient",
      "inputs": [
        { "name": "newRecipient", "type": "address", "internalType": "address" }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "setWhitelistedCreator",
      "inputs": [
        { "name": "creator", "type": "address", "internalType": "address" },
        { "name": "whitelisted", "type": "bool", "internalType": "bool" }
      ],
      "outputs": [],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "totalPresales",
      "inputs": [],
      "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "whitelistedCreators",
      "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
      "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
      "stateMutability": "view"
    },
    {
      "type": "event",
      "name": "CreatorWhitelisted",
      "inputs": [
        {
          "name": "creator",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "whitelisted",
          "type": "bool",
          "indexed": false,
          "internalType": "bool"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "FeeRecipientUpdated",
      "inputs": [
        {
          "name": "newRecipient",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        }
      ],
      "anonymous": false
    },
    {
      "type": "event",
      "name": "PresaleCreated",
      "inputs": [
        {
          "name": "creator",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "presale",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "saleToken",
          "type": "address",
          "indexed": true,
          "internalType": "address"
        },
        {
          "name": "paymentToken",
          "type": "address",
          "indexed": false,
          "internalType": "address"
        }
      ],
      "anonymous": false
    }
  ] as const
} as const


export const PresaleFactoryContract = PresaleFactory;
