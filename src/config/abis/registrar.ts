import { CONTRACT_ADDRESSES } from "../contracts";

export const Registrar = {
    address: CONTRACT_ADDRESSES.registrar,
    abi: [
        {
            "type": "constructor",
            "inputs": [
                {
                    "name": "registry_",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "resolver_",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "receive",
            "stateMutability": "payable"
        },
        {
            "type": "function",
            "name": "DEFAULT_TTL",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint64",
                    "internalType": "uint64"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "GRACE_PERIOD",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "MAX_NAME_LENGTH",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "MIN_DURATION",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "MIN_NAME_LENGTH",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "abeyNode",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ],
            "stateMutability": "pure"
        },
        {
            "type": "function",
            "name": "annualFeeFor",
            "inputs": [
                {
                    "name": "name_",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "available",
            "inputs": [
                {
                    "name": "name_",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "expiries",
            "inputs": [
                {
                    "name": "",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "expiryOf",
            "inputs": [
                {
                    "name": "name_",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "feeFor",
            "inputs": [
                {
                    "name": "name_",
                    "type": "string",
                    "internalType": "string"
                },
                {
                    "name": "duration",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "gracePeriodEnd",
            "inputs": [
                {
                    "name": "name_",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "owner",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "register",
            "inputs": [
                {
                    "name": "name_",
                    "type": "string",
                    "internalType": "string"
                },
                {
                    "name": "duration",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "resolver_",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "node",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ],
            "stateMutability": "payable"
        },
        {
            "type": "function",
            "name": "registry",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract ANSRegistry"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "release",
            "inputs": [
                {
                    "name": "name_",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "renew",
            "inputs": [
                {
                    "name": "name_",
                    "type": "string",
                    "internalType": "string"
                },
                {
                    "name": "duration",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [],
            "stateMutability": "payable"
        },
        {
            "type": "function",
            "name": "resolver",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract ANSResolver"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "setTestMode",
            "inputs": [
                {
                    "name": "enabled",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "testMode",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "transferOwnership",
            "inputs": [
                {
                    "name": "newOwner",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "withdraw",
            "inputs": [
                {
                    "name": "to",
                    "type": "address",
                    "internalType": "address payable"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "event",
            "name": "NameRegistered",
            "inputs": [
                {
                    "name": "name",
                    "type": "string",
                    "indexed": false,
                    "internalType": "string"
                },
                {
                    "name": "node",
                    "type": "bytes32",
                    "indexed": true,
                    "internalType": "bytes32"
                },
                {
                    "name": "registrant",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "expires",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "NameReleased",
            "inputs": [
                {
                    "name": "name",
                    "type": "string",
                    "indexed": false,
                    "internalType": "string"
                },
                {
                    "name": "node",
                    "type": "bytes32",
                    "indexed": true,
                    "internalType": "bytes32"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "NameRenewed",
            "inputs": [
                {
                    "name": "name",
                    "type": "string",
                    "indexed": false,
                    "internalType": "string"
                },
                {
                    "name": "node",
                    "type": "bytes32",
                    "indexed": true,
                    "internalType": "bytes32"
                },
                {
                    "name": "newExpiry",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "OwnershipTransferred",
            "inputs": [
                {
                    "name": "prev",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "next",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "TestModeSet",
            "inputs": [
                {
                    "name": "enabled",
                    "type": "bool",
                    "indexed": false,
                    "internalType": "bool"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "Withdrawal",
            "inputs": [
                {
                    "name": "to",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "error",
            "name": "DurationTooShort",
            "inputs": [
                {
                    "name": "duration",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "min",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "GracePeriodActive",
            "inputs": [
                {
                    "name": "node",
                    "type": "bytes32",
                    "internalType": "bytes32"
                },
                {
                    "name": "gracePeriodEnd",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "HyphenAtBoundary",
            "inputs": []
        },
        {
            "type": "error",
            "name": "InsufficientFee",
            "inputs": [
                {
                    "name": "sent",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "required",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "InvalidCharacter",
            "inputs": [
                {
                    "name": "position",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "NameNotAvailable",
            "inputs": [
                {
                    "name": "node",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ]
        },
        {
            "type": "error",
            "name": "NameNotExpired",
            "inputs": [
                {
                    "name": "node",
                    "type": "bytes32",
                    "internalType": "bytes32"
                },
                {
                    "name": "expiry",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "NameNotRegistered",
            "inputs": [
                {
                    "name": "node",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ]
        },
        {
            "type": "error",
            "name": "NameTooLong",
            "inputs": [
                {
                    "name": "length",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "max",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "NameTooShort",
            "inputs": [
                {
                    "name": "length",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "min",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "NotOwner",
            "inputs": [
                {
                    "name": "caller",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "NothingToWithdraw",
            "inputs": []
        },
        {
            "type": "error",
            "name": "RefundFailed",
            "inputs": []
        },
        {
            "type": "error",
            "name": "StillInGracePeriod",
            "inputs": [
                {
                    "name": "node",
                    "type": "bytes32",
                    "internalType": "bytes32"
                },
                {
                    "name": "gracePeriodEnd",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ]
        },
        {
            "type": "error",
            "name": "WithdrawFailed",
            "inputs": []
        },
        {
            "type": "error",
            "name": "ZeroAddress",
            "inputs": []
        }
    ]
}

