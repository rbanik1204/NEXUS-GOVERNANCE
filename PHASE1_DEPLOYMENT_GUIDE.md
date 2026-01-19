# 🚨 PHASE 1: CRITICAL CONTRACT DEPLOYMENT GUIDE

## ⚠️ MUST READ BEFORE PROCEEDING

This guide deploys **REAL** governance contracts to Sepolia.  
After deployment, update the frontend to use these addresses.

---

## 📋 PRE-DEPLOYMENT CHECKLIST

- [ ] MetaMask installed with Sepolia ETH (get from https://sepoliafaucet.com/)
- [ ] At least 0.1 Sepolia ETH in deployer wallet
- [ ] Remix IDE open (https://remix.ethereum.org/)

---

## 🔧 STEP 1: Deploy GovernanceCore

### 1.1 Open Remix
Go to https://remix.ethereum.org/

### 1.2 Create File
- Click "File Explorer" (left icon)
- Right-click on `contracts` folder → "New File"
- Name: `GovernanceCore_Deployable.sol`
- Paste contents from:
  `c:\DAO\contracts\contracts\governance\GovernanceCore_Deployable.sol`

### 1.3 Compile
- Click "Solidity Compiler" (left sidebar)
- Select compiler version: `0.8.20`
- Click "Compile GovernanceCore_Deployable.sol"
- ✅ Should show green checkmark

### 1.4 Deploy
- Click "Deploy & Run Transactions" (left sidebar)
- Environment: **Injected Provider - MetaMask**
- Connect MetaMask to **Sepolia** network
- Contract: Select `GovernanceCore`
- Constructor Parameters:
  ```
  _votingPeriod: 300       (5 minutes for testing, use 604800 for 7 days in production)
  _executionDelay: 60      (1 minute for testing, use 172800 for 48 hours in production)
  _quorumPercentage: 1000  (10% in basis points)
  _proposalThreshold: 0    (no minimum for testing)
  ```
- Click "Deploy"
- Confirm in MetaMask
- ⏳ Wait for confirmation

### 1.5 Record Address
After deployment, copy the contract address:
```
GOVERNANCE_CORE_ADDRESS = 0x_________________
```

### 1.6 Verify on Etherscan
- Go to: https://sepolia.etherscan.io/address/YOUR_ADDRESS
- Click "Contract" → "Verify and Publish"
- Compiler: 0.8.20
- Optimization: No
- Paste source code
- Verify

---

## 🔧 STEP 2: Deploy ProposalManager

### 2.1 Create File
- In Remix, create new file: `ProposalManager_Deployable.sol`
- Paste contents from:
  `c:\DAO\contracts\contracts\governance\ProposalManager_Deployable.sol`

### 2.2 Compile
- Select compiler version: `0.8.20`
- Click "Compile ProposalManager_Deployable.sol"

### 2.3 Deploy
- Contract: Select `ProposalManager`
- Constructor Parameters:
  ```
  _governanceCore: [PASTE GOVERNANCE_CORE_ADDRESS FROM STEP 1.5]
  ```
- Click "Deploy"
- Confirm in MetaMask

### 2.4 Record Address
```
PROPOSAL_MANAGER_ADDRESS = 0x_________________
```

### 2.5 Verify on Etherscan
Same process as Step 1.6

---

## 🧪 STEP 3: TEST THE CONTRACTS (CRITICAL)

### 3.1 Create a Proposal
In Remix, with ProposalManager selected:
- Find `createProposal` function
- Enter: `"Test Proposal - First governance action"`
- Click "transact"
- Confirm in MetaMask
- ✅ **Record Transaction Hash**: `0x_________________`

### 3.2 Cast a Vote
- Find `castVote` function
- Enter:
  - proposalId: `1`
  - support: `1` (for)
- Click "transact"
- Confirm in MetaMask
- ✅ **Record Transaction Hash**: `0x_________________`

### 3.3 Verify on Etherscan
1. Go to your transaction on Sepolia Etherscan
2. Click "Logs" tab
3. You should see:
   - `VoteCast` event with your address, proposalId, support, weight

**If you see the VoteCast event → Phase 1 is COMPLETE** ✅

---

## 🔄 STEP 4: UPDATE FRONTEND

### 4.1 Update Environment Variables
Edit `c:\DAO\frontend\.env`:
```env
REACT_APP_GOVERNANCE_CONTRACT=0x[YOUR_GOVERNANCE_CORE_ADDRESS]
REACT_APP_PROPOSAL_CONTRACT=0x[YOUR_PROPOSAL_MANAGER_ADDRESS]
REACT_APP_CHAIN_ID=11155111
```

### 4.2 Update web3Service.js
Edit `c:\DAO\frontend\src\services\web3Service.js`:

Replace the CONTRACTS object (lines 4-14) with your new addresses.

### 4.3 Update votingService.js
Edit `c:\DAO\frontend\src\services\votingService.js`:

Replace the CONTRACTS object (lines 17-21) with your new addresses.

### 4.4 Rebuild and Deploy
```bash
cd c:\DAO\frontend
npm run build
firebase deploy --only hosting
```

---

## ✅ ACCEPTANCE CHECKLIST

After completing all steps, verify:

| Test | Status |
|------|--------|
| GovernanceCore deployed | ⬜ |
| GovernanceCore verified on Etherscan | ⬜ |
| ProposalManager deployed | ⬜ |
| ProposalManager verified on Etherscan | ⬜ |
| Proposal #1 created with tx hash | ⬜ |
| Vote cast with tx hash | ⬜ |
| VoteCast event visible on Etherscan | ⬜ |
| Frontend updated with new addresses | ⬜ |
| Frontend deployed to Firebase | ⬜ |

---

## 📝 POST-DEPLOYMENT: WHAT TO SAY

Once all above is complete, you can honestly say:

> "We have deployed and verified real governance contracts on Sepolia.
> Here are the Etherscan links showing:
> 1. Contract verification: [link]
> 2. First proposal creation: [tx hash]
> 3. First vote cast: [tx hash]
> 4. VoteCast event: [logs]
> 
> This is a functional governance system, not a UI mockup."

---

## 🚫 KNOWN LIMITATIONS (Be Honest)

After Phase 1, the following are still NOT functional:
- Treasury movements
- Delegation
- Historical analytics
- Role-based voting power (everyone has 1 vote)

These will be addressed in Phases 2-6.

---

## 📞 IF DEPLOYMENT FAILS

Common issues:
1. **"Not enough ETH"** → Get more from faucet
2. **"Contract not verified"** → Check compiler version matches
3. **"Transaction reverted"** → Check you're on Sepolia network

---

*Document created: 2026-01-18*
*Status: READY FOR DEPLOYMENT*
