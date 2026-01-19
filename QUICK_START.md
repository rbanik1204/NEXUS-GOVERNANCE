# Quick Start: Building Government-Grade DAO Platform

## 🎯 Purpose
This guide provides immediate, actionable steps to start transforming your DAO UI into a production-ready governance platform.

---

## 📋 Prerequisites

### Required Tools
- Node.js 18+ and Yarn
- Python 3.11+
- Hardhat (Ethereum development)
- MongoDB (already configured)
- MetaMask or similar Web3 wallet

### Required Accounts
- Alchemy/Infura account (RPC provider)
- Pinata/IPFS account (metadata storage)
- Etherscan API key (contract verification)

---

## 🚀 IMMEDIATE ACTION PLAN (Week 1)

### Day 1-2: Smart Contract Foundation

#### Step 1: Initialize Hardhat Project
```bash
# Create contracts directory
cd c:\DAO
mkdir contracts
cd contracts

# Initialize Hardhat
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
# Select: "Create a TypeScript project"

# Install OpenZeppelin contracts
npm install @openzeppelin/contracts @openzeppelin/contracts-upgradeable
```

#### Step 2: Create Governance Core Contract
```bash
# Create contract file
mkdir contracts/governance
```

Create `contracts/governance/GovernanceCore.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

contract GovernanceCore is 
    Initializable, 
    AccessControlUpgradeable, 
    PausableUpgradeable 
{
    // Roles
    bytes32 public constant CITIZEN_ROLE = keccak256("CITIZEN_ROLE");
    bytes32 public constant DELEGATE_ROLE = keccak256("DELEGATE_ROLE");
    bytes32 public constant ADMINISTRATOR_ROLE = keccak256("ADMINISTRATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    // Governance Parameters
    struct GovernanceParams {
        uint256 votingPeriod;        // in blocks
        uint256 executionDelay;      // in seconds
        uint256 quorumPercentage;    // basis points (100 = 1%)
        uint256 proposalThreshold;   // min tokens to create proposal
    }

    GovernanceParams public params;
    uint256 public proposalCount;

    // Events
    event GovernanceParamsUpdated(GovernanceParams newParams);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        GovernanceParams memory _params
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMINISTRATOR_ROLE, _admin);
        
        params = _params;
    }

    function updateGovernanceParams(
        GovernanceParams memory _newParams
    ) external onlyRole(ADMINISTRATOR_ROLE) {
        params = _newParams;
        emit GovernanceParamsUpdated(_newParams);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
    }

    // Placeholder for proposal creation (to be implemented)
    function createProposal() external whenNotPaused returns (uint256) {
        require(hasRole(DELEGATE_ROLE, msg.sender), "Not a delegate");
        proposalCount++;
        emit ProposalCreated(proposalCount, msg.sender);
        return proposalCount;
    }
}
```

#### Step 3: Write Basic Tests
Create `test/GovernanceCore.test.ts`:
```typescript
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("GovernanceCore", function () {
  it("Should initialize with correct parameters", async function () {
    const [admin] = await ethers.getSigners();
    
    const GovernanceCore = await ethers.getContractFactory("GovernanceCore");
    const governance = await upgrades.deployProxy(GovernanceCore, [
      admin.address,
      {
        votingPeriod: 50400, // ~7 days in blocks
        executionDelay: 172800, // 48 hours in seconds
        quorumPercentage: 1000, // 10%
        proposalThreshold: ethers.parseEther("100")
      }
    ]);

    const params = await governance.params();
    expect(params.votingPeriod).to.equal(50400);
  });
});
```

#### Step 4: Run Tests
```bash
npx hardhat test
```

---

### Day 3-4: Backend Blockchain Integration

#### Step 1: Install Web3 Dependencies
```bash
cd c:\DAO\backend
pip install web3 eth-account python-dotenv redis
```

#### Step 2: Create Blockchain Service
Create `backend/services/blockchain_service.py`:
```python
from web3 import Web3
from web3.middleware import geth_poa_middleware
import json
import os
from typing import Dict, Any, Optional

class BlockchainService:
    def __init__(self, rpc_url: str, contract_address: str, abi_path: str):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        with open(abi_path, 'r') as f:
            contract_abi = json.load(f)
        
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=contract_abi
        )
    
    def get_proposal(self, proposal_id: int) -> Optional[Dict[str, Any]]:
        """Fetch proposal from smart contract"""
        try:
            # This will be implemented once ProposalManager is deployed
            proposal = self.contract.functions.getProposal(proposal_id).call()
            return {
                'id': proposal_id,
                'proposer': proposal[0],
                'state': proposal[1],
                # ... more fields
            }
        except Exception as e:
            print(f"Error fetching proposal: {e}")
            return None
    
    def create_proposal(
        self, 
        proposer_address: str, 
        private_key: str,
        metadata_hash: str
    ) -> Optional[str]:
        """Create a new proposal on-chain"""
        try:
            nonce = self.w3.eth.get_transaction_count(proposer_address)
            
            txn = self.contract.functions.createProposal(
                metadata_hash
            ).build_transaction({
                'from': proposer_address,
                'nonce': nonce,
                'gas': 500000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            signed_txn = self.w3.eth.account.sign_transaction(txn, private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            return self.w3.to_hex(tx_hash)
        except Exception as e:
            print(f"Error creating proposal: {e}")
            return None
    
    def listen_to_events(self, event_name: str, from_block: int = 0):
        """Listen to contract events"""
        event_filter = getattr(self.contract.events, event_name).create_filter(
            fromBlock=from_block
        )
        
        for event in event_filter.get_all_entries():
            yield {
                'event': event_name,
                'block': event['blockNumber'],
                'tx_hash': event['transactionHash'].hex(),
                'args': dict(event['args'])
            }

# Usage
if __name__ == "__main__":
    service = BlockchainService(
        rpc_url=os.getenv("RPC_URL"),
        contract_address=os.getenv("GOVERNANCE_CONTRACT_ADDRESS"),
        abi_path="./contracts/abi/GovernanceCore.json"
    )
```

#### Step 3: Add API Endpoints
Update `backend/server.py`:
```python
from services.blockchain_service import BlockchainService

# Initialize blockchain service
blockchain = BlockchainService(
    rpc_url=os.environ.get('RPC_URL'),
    contract_address=os.environ.get('GOVERNANCE_CONTRACT_ADDRESS'),
    abi_path='./contracts/abi/GovernanceCore.json'
)

@api_router.get("/proposals/{proposal_id}")
async def get_proposal(proposal_id: int):
    # Try to get from database first (cached)
    cached = await db.proposals.find_one({"proposalId": proposal_id})
    if cached:
        return cached
    
    # Fetch from blockchain
    proposal = blockchain.get_proposal(proposal_id)
    if proposal:
        # Cache in database
        await db.proposals.insert_one(proposal)
        return proposal
    
    return {"error": "Proposal not found"}

@api_router.post("/proposals/create")
async def create_proposal(
    proposer: str,
    metadata_hash: str,
    private_key: str  # In production, use secure key management!
):
    tx_hash = blockchain.create_proposal(proposer, private_key, metadata_hash)
    return {"transaction_hash": tx_hash}
```

---

### Day 5-7: Frontend Web3 Integration

#### Step 1: Install Web3 Dependencies
```bash
cd c:\DAO\frontend
yarn add ethers wagmi viem @tanstack/react-query
```

#### Step 2: Create Web3 Provider
Create `frontend/src/providers/Web3Provider.jsx`:
```javascript
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { sepolia, polygonMumbai } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';

const { chains, publicClient } = configureChains(
  [sepolia, polygonMumbai],
  [publicProvider()]
);

const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID,
      },
    }),
  ],
  publicClient,
});

export function Web3Provider({ children }) {
  return <WagmiConfig config={config}>{children}</WagmiConfig>;
}
```

#### Step 3: Create Governance Hook
Create `frontend/src/hooks/useGovernance.js`:
```javascript
import { useContractRead, useContractWrite, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import GovernanceCoreABI from '../contracts/GovernanceCore.json';

const GOVERNANCE_ADDRESS = process.env.REACT_APP_GOVERNANCE_CONTRACT;

export function useGovernance() {
  const { address } = useAccount();

  // Read governance parameters
  const { data: params } = useContractRead({
    address: GOVERNANCE_ADDRESS,
    abi: GovernanceCoreABI,
    functionName: 'params',
  });

  // Create proposal
  const { write: createProposal, isLoading } = useContractWrite({
    address: GOVERNANCE_ADDRESS,
    abi: GovernanceCoreABI,
    functionName: 'createProposal',
  });

  // Check if user has delegate role
  const { data: isDelegate } = useContractRead({
    address: GOVERNANCE_ADDRESS,
    abi: GovernanceCoreABI,
    functionName: 'hasRole',
    args: [
      '0x...' // DELEGATE_ROLE hash
      address
    ],
  });

  return {
    params,
    createProposal,
    isLoading,
    isDelegate,
  };
}
```

#### Step 4: Update Header Component
Update `frontend/src/components/Header.jsx`:
```javascript
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useGovernance } from '../hooks/useGovernance';

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { isDelegate } = useGovernance();

  return (
    <header className="glass brutal-card">
      {/* Existing header content */}
      
      {isConnected ? (
        <div className="flex items-center gap-4">
          {isDelegate && (
            <span className="badge bg-primary text-primary-foreground">
              Delegate
            </span>
          )}
          <span className="text-sm">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          <button onClick={() => disconnect()}>Disconnect</button>
        </div>
      ) : (
        <button onClick={() => connect({ connector: connectors[0] })}>
          Connect Wallet
        </button>
      )}
    </header>
  );
}
```

---

## 📝 Environment Variables Setup

Create `contracts/.env`:
```env
# Blockchain
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_deployer_private_key
ETHERSCAN_API_KEY=your_etherscan_key

# Contract Addresses (after deployment)
GOVERNANCE_CONTRACT_ADDRESS=
```

Create `backend/.env`:
```env
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=dao_governance

# Blockchain
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
GOVERNANCE_CONTRACT_ADDRESS=

# CORS
CORS_ORIGINS=http://localhost:3000
```

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_GOVERNANCE_CONTRACT=
REACT_APP_WALLETCONNECT_PROJECT_ID=
REACT_APP_CHAIN_ID=11155111
```

---

## 🧪 Testing the Integration

### Test 1: Deploy Contract
```bash
cd c:\DAO\contracts
npx hardhat run scripts/deploy.ts --network sepolia
```

### Test 2: Start Backend
```bash
cd c:\DAO\backend
uvicorn server:app --reload
```

### Test 3: Start Frontend
```bash
cd c:\DAO\frontend
yarn start
```

### Test 4: Connect Wallet
1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Approve MetaMask connection
4. Verify address shows in header

---

## ✅ Week 1 Success Criteria

- [ ] Smart contracts compile without errors
- [ ] Tests pass (at least 1 test)
- [ ] Backend can read from contract
- [ ] Frontend can connect wallet
- [ ] User can see their role (if assigned)

---

## 📚 Next Steps (Week 2)

1. Implement ProposalManager contract
2. Add proposal creation UI
3. Build voting mechanism
4. Create proposal detail page
5. Add IPFS integration for metadata

---

## 🆘 Troubleshooting

### Contract won't compile
- Check Solidity version in hardhat.config.ts
- Ensure OpenZeppelin version matches (^5.0.0)

### Frontend can't connect to wallet
- Check MetaMask is on correct network (Sepolia)
- Verify REACT_APP_CHAIN_ID matches network

### Backend can't read contract
- Verify RPC_URL is correct
- Check contract address is deployed
- Ensure ABI file exists

---

## 📖 Documentation References

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Wagmi Documentation](https://wagmi.sh/)
- [Web3.py Documentation](https://web3py.readthedocs.io/)

---

**Ready to start? Run the Day 1 commands and let's build!** 🚀
