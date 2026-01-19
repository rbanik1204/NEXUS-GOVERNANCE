# 🚀 DEPLOYMENT GUIDE - Government-Grade DAO Platform

## 📋 Overview

This guide will walk you through deploying your government-grade DAO platform from start to finish.

---

## ✅ Prerequisites Checklist

Before starting, ensure you have:

- [ ] MetaMask wallet installed
- [ ] Sepolia testnet ETH (get from https://sepoliafaucet.com/)
- [ ] Alchemy account (for RPC) - https://www.alchemy.com/
- [ ] MongoDB running locally
- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed

---

## 🎯 OPTION 1: Deploy with Remix IDE (Easiest - 30 min)

### Step 1: Open Remix
1. Go to https://remix.ethereum.org
2. You'll see a default workspace

### Step 2: Create Contract Files
1. In the File Explorer (left sidebar), create folder: `contracts/governance/`
2. Create three files:
   - `GovernanceCore.sol`
   - `ProposalManager.sol`
   - `ExecutionModule.sol`

3. Copy the contract code from:
   - `c:\DAO\contracts\contracts\governance\GovernanceCore.sol`
   - `c:\DAO\contracts\contracts\governance\ProposalManager.sol`
   - `c:\DAO\contracts\contracts\governance\ExecutionModule.sol`

### Step 3: Install OpenZeppelin
1. In Remix, click the "Plugin Manager" (plug icon, left sidebar)
2. Activate "Solidity Compiler"
3. Activate "Deploy & Run Transactions"
4. The contracts import OpenZeppelin automatically via GitHub

### Step 4: Compile Contracts
1. Click "Solidity Compiler" tab
2. Select compiler version: **0.8.20**
3. Enable "Optimization" with 200 runs
4. Click "Compile GovernanceCore.sol"
5. Repeat for ProposalManager.sol and ExecutionModule.sol
6. ✅ You should see green checkmarks

### Step 5: Deploy GovernanceCore
1. Click "Deploy & Run Transactions" tab
2. Environment: Select "Injected Provider - MetaMask"
3. Connect MetaMask (Sepolia network)
4. Contract: Select "GovernanceCore"
5. Since it's upgradeable, you need to deploy via proxy:
   
   **Manual Proxy Deployment:**
   - First deploy the implementation
   - Then deploy a proxy pointing to it
   - Or use Remix's built-in proxy plugin

   **Simpler: Deploy without proxy for testing**
   - Just click "Deploy"
   - Constructor params:
     - `_admin`: Your MetaMask address
     - `_params`: 
       ```
       [50400, 172800, 1000, "100000000000000000000"]
       ```
   - Click "transact"
   - Confirm in MetaMask
   - ✅ Wait for confirmation

6. Copy the deployed contract address

### Step 6: Deploy ProposalManager
1. Contract: Select "ProposalManager"
2. Constructor params:
   - `_governanceCore`: Address from Step 5
   - `_proposalCooldown`: 604800 (7 days in seconds)
3. Click "Deploy"
4. Confirm in MetaMask
5. Copy the deployed contract address

### Step 7: Deploy ExecutionModule
1. Contract: Select "ExecutionModule"
2. Constructor params:
   - `_admin`: Your MetaMask address
   - `_minDelay`: 86400 (24 hours)
   - `_maxDelay`: 2592000 (30 days)
3. Click "Deploy"
4. Confirm in MetaMask
5. Copy the deployed contract address

### Step 8: Configure Roles
1. In Remix, under "Deployed Contracts", expand GovernanceCore
2. Call `grantRole`:
   - `role`: Get DELEGATE_ROLE hash by calling `DELEGATE_ROLE()` first
   - `account`: Your MetaMask address
3. Repeat for other roles as needed

### Step 9: Verify on Etherscan
1. Go to https://sepolia.etherscan.io/
2. Search for your contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Or use Remix's built-in verification:
   - Install "Etherscan - Contract Verification" plugin
   - Click the plugin
   - Enter your Etherscan API key
   - Click "Verify"

---

## 🎯 OPTION 2: Deploy with Foundry (Advanced - 1 hour)

### Step 1: Install Foundry
```powershell
# Install Foundry
irm https://github.com/foundry-rs/foundry/releases/latest/download/foundry_nightly_windows_amd64.zip -OutFile foundry.zip
Expand-Archive foundry.zip -DestinationPath $env:USERPROFILE\.foundry\bin
$env:PATH += ";$env:USERPROFILE\.foundry\bin"

# Verify installation
forge --version
```

### Step 2: Create Foundry Project
```powershell
cd c:\DAO
mkdir contracts-foundry
cd contracts-foundry
forge init --no-git
```

### Step 3: Install Dependencies
```powershell
forge install OpenZeppelin/openzeppelin-contracts-upgradeable --no-commit
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

### Step 4: Copy Contracts
```powershell
Copy-Item ..\contracts\contracts\governance\*.sol .\src\
```

### Step 5: Create Deployment Script
Create `script/Deploy.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GovernanceCore.sol";
import "../src/ProposalManager.sol";
import "../src/ExecutionModule.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy GovernanceCore
        GovernanceCore.GovernanceParams memory params = GovernanceCore.GovernanceParams({
            votingPeriod: 50400,
            executionDelay: 172800,
            quorumPercentage: 1000,
            proposalThreshold: 100 ether
        });
        
        GovernanceCore governance = new GovernanceCore();
        governance.initialize(deployer, params);
        
        // Deploy ProposalManager
        ProposalManager proposals = new ProposalManager();
        proposals.initialize(address(governance), 604800);
        
        // Deploy ExecutionModule
        ExecutionModule execution = new ExecutionModule();
        execution.initialize(deployer, 86400, 2592000);
        
        vm.stopBroadcast();
        
        console.log("GovernanceCore:", address(governance));
        console.log("ProposalManager:", address(proposals));
        console.log("ExecutionModule:", address(execution));
    }
}
```

### Step 6: Deploy
```powershell
# Set environment variables
$env:PRIVATE_KEY = "your_private_key"
$env:SEPOLIA_RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"

# Deploy
forge script script/Deploy.s.sol --rpc-url $env:SEPOLIA_RPC_URL --broadcast --verify
```

---

## 🔧 Backend Configuration

### Step 1: Update .env
Create `c:\DAO\backend\.env`:

```env
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=dao_governance

# Blockchain
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
GOVERNANCE_CORE_ADDRESS=0x... # From deployment
PROPOSAL_MANAGER_ADDRESS=0x... # From deployment
EXECUTION_MODULE_ADDRESS=0x... # From deployment

# CORS
CORS_ORIGINS=http://localhost:3000

# Optional: For transaction signing
PRIVATE_KEY=your_private_key_here
```

### Step 2: Install Dependencies
```powershell
cd c:\DAO\backend
pip install -r requirements.txt
```

### Step 3: Test Blockchain Service
Create `test_blockchain.py`:

```python
from services.blockchain_service import BlockchainService
import os
from dotenv import load_dotenv

load_dotenv()

service = BlockchainService(
    rpc_url=os.getenv("RPC_URL"),
    governance_core_address=os.getenv("GOVERNANCE_CORE_ADDRESS"),
    proposal_manager_address=os.getenv("PROPOSAL_MANAGER_ADDRESS")
)

# Test connection
params = service.get_governance_params()
print("Governance Parameters:", params)

count = service.get_proposal_count()
print(f"Proposal Count: {count}")
```

Run:
```powershell
python test_blockchain.py
```

### Step 4: Start Backend
```powershell
uvicorn server:app --reload
```

Visit: http://localhost:8000/docs

---

## 🎨 Frontend Configuration

### Step 1: Install Web3 Dependencies
```powershell
cd c:\DAO\frontend
yarn add ethers@^6.10.0 wagmi@^2.5.0 viem@^2.7.0 @tanstack/react-query@^5.0.0
```

### Step 2: Create .env
Create `c:\DAO\frontend\.env`:

```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_GOVERNANCE_CONTRACT=0x... # GovernanceCore address
REACT_APP_PROPOSAL_CONTRACT=0x... # ProposalManager address
REACT_APP_CHAIN_ID=11155111
REACT_APP_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### Step 3: Create Web3 Provider
Already created in `QUICK_START.md` - follow those instructions.

### Step 4: Start Frontend
```powershell
yarn start
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Contracts deployed to Sepolia
- [ ] Contracts verified on Etherscan
- [ ] Backend can connect to contracts
- [ ] Backend API returns governance params
- [ ] Frontend can connect wallet
- [ ] Frontend shows contract data
- [ ] Can create proposal (if delegate)
- [ ] Can vote on proposal

---

## 🐛 Troubleshooting

### Contract won't compile in Remix
- Check Solidity version is 0.8.20
- Enable optimization
- Make sure OpenZeppelin imports work

### Backend can't connect to contracts
- Verify RPC_URL is correct
- Check contract addresses are correct
- Ensure contracts are deployed

### Frontend can't connect wallet
- Check MetaMask is on Sepolia network
- Verify REACT_APP_CHAIN_ID matches
- Check contract addresses in .env

### Transactions fail
- Ensure you have Sepolia ETH
- Check gas price isn't too low
- Verify you have required role

---

## 📊 Post-Deployment Tasks

1. **Grant Roles**
   - Grant DELEGATE_ROLE to test users
   - Grant GUARDIAN_ROLE for emergency controls
   - Grant AUDITOR_ROLE for oversight

2. **Create Test Proposal**
   - Use Remix or frontend
   - Test full proposal lifecycle

3. **Test Voting**
   - Vote on test proposal
   - Verify vote counts update

4. **Monitor Events**
   - Check backend event listener
   - Verify events are logged

5. **Update Documentation**
   - Document contract addresses
   - Update API documentation
   - Create user guides

---

## 🎯 Success Criteria

You're successful when:
- ✅ All 3 contracts deployed
- ✅ Backend connects successfully
- ✅ Frontend shows live data
- ✅ Can create and vote on proposals
- ✅ All events are captured
- ✅ Roles work correctly

---

## 📞 Next Steps

After successful deployment:

1. **Phase 2**: Build Identity & Citizen Management
2. **Phase 3**: Implement advanced voting mechanisms
3. **Phase 4**: Integrate treasury management
4. **Phase 5**: Add legal compliance layer

---

**You're almost there! Deploy and test!** 🚀
