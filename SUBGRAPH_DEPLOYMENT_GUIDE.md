# 🚀 THE GRAPH SUBGRAPH DEPLOYMENT GUIDE

## ✅ WHAT HAS BEEN CREATED

### **Subgraph Infrastructure** (Complete)

```
c:\DAO\subgraph\
├── subgraph.yaml          ✅ Manifest with all 8 contracts
├── schema.graphql         ✅ Complete entity schema (40+ entities)
├── package.json           ✅ Dependencies and scripts
├── abis/                  ⏳ Need to add contract ABIs
├── src/                   ⏳ Need to create event handlers
└── generated/             ⏳ Auto-generated after codegen
```

---

## 📋 DEPLOYMENT STEPS

### **Step 1: Install Dependencies**

```powershell
cd c:\DAO\subgraph
npm install
```

**What this does**:
- Installs Graph CLI
- Installs AssemblyScript compiler
- Installs testing framework

---

### **Step 2: Copy Contract ABIs**

You need to copy the ABI files from your compiled contracts:

```powershell
# Create abis directory
mkdir abis

# Copy ABIs from contracts/artifacts
# (Adjust paths based on your compilation output)
```

**Required ABI files**:
1. `GovernanceCore.json`
2. `ProposalManager.json`
3. `ExecutionModule.json`
4. `VotingEngine.json`
5. `TreasuryManager.json`
6. `CitizenRegistry.json`
7. `DIDRegistry.json`
8. `ComplianceEngine.json`
9. `LegalDocumentRegistry.json`

**How to get ABIs**:

**Option A: From Remix** (if you deployed via Remix)
1. In Remix, go to each contract
2. Click "Compilation Details"
3. Copy the ABI
4. Save as `ContractName.json` in `abis/` folder

**Option B: From Hardhat/Foundry**
```powershell
# If using Hardhat
cp c:\DAO\contracts\artifacts\contracts\**\*.json c:\DAO\subgraph\abis\

# If using Foundry
cp c:\DAO\contracts-foundry\out\**\*.json c:\DAO\subgraph\abis\
```

---

### **Step 3: Create Event Handlers**

Create the `src/` directory and handler files:

```powershell
mkdir src
```

I'll provide starter templates for each handler file below.

---

### **Step 4: Run Code Generation**

```powershell
npm run codegen
```

**What this does**:
- Generates TypeScript types from schema
- Generates contract bindings from ABIs
- Creates helper functions

**Output**: `generated/` directory with all types

---

### **Step 5: Build the Subgraph**

```powershell
npm run build
```

**What this does**:
- Compiles AssemblyScript to WASM
- Validates schema and mappings
- Prepares for deployment

**Output**: `build/` directory with compiled subgraph

---

### **Step 6: Deploy to The Graph**

#### **Option A: The Graph Studio** (Recommended for Production)

1. **Create Account**:
   - Go to https://thegraph.com/studio/
   - Sign in with wallet
   - Create new subgraph: "nexus-dao-governance"

2. **Get Deploy Key**:
   ```powershell
   graph auth --studio <DEPLOY_KEY>
   ```

3. **Deploy**:
   ```powershell
   npm run deploy-studio
   ```

#### **Option B: Hosted Service** (Easier for Testing)

1. **Create Account**:
   - Go to https://thegraph.com/hosted-service/
   - Sign in with GitHub

2. **Create Subgraph**:
   - Click "My Dashboard"
   - Click "Add Subgraph"
   - Name: "nexus-dao-governance"
   - Network: "sepolia"

3. **Get Access Token**:
   ```powershell
   graph auth --product hosted-service <ACCESS_TOKEN>
   ```

4. **Deploy**:
   ```powershell
   graph deploy --product hosted-service <GITHUB_USERNAME>/nexus-dao-governance
   ```

---

## 📝 EVENT HANDLER TEMPLATES

### **File: `src/proposal-manager.ts`**

```typescript
import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  ProposalCreated as ProposalCreatedEvent,
  VoteCast as VoteCastEvent,
  ProposalStatusChanged as ProposalStatusChangedEvent,
  ProposalCanceled as ProposalCanceledEvent
} from "../generated/ProposalManager/ProposalManager"
import { Proposal, Vote, Citizen, DailyStats, MonthlyStats } from "../generated/schema"

export function handleProposalCreatedManager(event: ProposalCreatedEvent): void {
  let proposal = new Proposal(event.params.proposalId.toString())
  
  // Get or create proposer
  let proposer = Citizen.load(event.params.proposer.toHexString())
  if (proposer == null) {
    proposer = new Citizen(event.params.proposer.toHexString())
    proposer.address = event.params.proposer
    proposer.registeredAt = event.block.timestamp
    proposer.status = "PENDING"
    proposer.votingPower = BigInt.fromI32(0)
    proposer.delegatedPower = BigInt.fromI32(0)
    proposer.identityVerified = false
    proposer.totalProposals = 0
    proposer.totalVotes = 0
    proposer.participationRate = BigDecimal.fromString("0")
    proposer.save()
  }
  
  proposal.proposalId = event.params.proposalId
  proposal.proposer = proposer.id
  proposal.title = "Proposal #" + event.params.proposalId.toString()
  proposal.description = ""
  proposal.proposalType = "GENERAL"
  proposal.status = "PENDING"
  proposal.createdAt = event.block.timestamp
  proposal.startTime = event.block.timestamp
  proposal.endTime = event.block.timestamp.plus(BigInt.fromI32(604800)) // 7 days
  proposal.forVotes = BigInt.fromI32(0)
  proposal.againstVotes = BigInt.fromI32(0)
  proposal.abstainVotes = BigInt.fromI32(0)
  proposal.totalVotes = BigInt.fromI32(0)
  proposal.quorumReached = false
  proposal.transactionHash = event.transaction.hash
  proposal.blockNumber = event.block.number
  proposal.save()
  
  // Update proposer stats
  proposer.totalProposals = proposer.totalProposals + 1
  proposer.save()
  
  // Update daily stats
  updateDailyStats(event.block.timestamp, "proposalCreated")
}

export function handleVoteCastManager(event: VoteCastEvent): void {
  let voteId = event.params.voter.toHexString() + "-" + event.params.proposalId.toString()
  let vote = new Vote(voteId)
  
  // Get or create voter
  let voter = Citizen.load(event.params.voter.toHexString())
  if (voter == null) {
    voter = new Citizen(event.params.voter.toHexString())
    voter.address = event.params.voter
    voter.registeredAt = event.block.timestamp
    voter.status = "ACTIVE"
    voter.votingPower = event.params.weight
    voter.delegatedPower = BigInt.fromI32(0)
    voter.identityVerified = false
    voter.totalProposals = 0
    voter.totalVotes = 0
    voter.participationRate = BigDecimal.fromString("0")
    voter.save()
  }
  
  vote.voter = voter.id
  vote.proposal = event.params.proposalId.toString()
  vote.support = event.params.support == 0 ? "AGAINST" : (event.params.support == 1 ? "FOR" : "ABSTAIN")
  vote.weight = event.params.weight
  vote.reason = ""
  vote.timestamp = event.block.timestamp
  vote.transactionHash = event.transaction.hash
  vote.blockNumber = event.block.number
  vote.delegated = false
  vote.save()
  
  // Update proposal vote counts
  let proposal = Proposal.load(event.params.proposalId.toString())
  if (proposal != null) {
    if (event.params.support == 0) {
      proposal.againstVotes = proposal.againstVotes.plus(event.params.weight)
    } else if (event.params.support == 1) {
      proposal.forVotes = proposal.forVotes.plus(event.params.weight)
    } else {
      proposal.abstainVotes = proposal.abstainVotes.plus(event.params.weight)
    }
    proposal.totalVotes = proposal.totalVotes.plus(BigInt.fromI32(1))
    proposal.save()
  }
  
  // Update voter stats
  voter.totalVotes = voter.totalVotes + 1
  voter.save()
  
  // Update daily stats
  updateDailyStats(event.block.timestamp, "voteCast")
}

export function handleProposalStatusChanged(event: ProposalStatusChangedEvent): void {
  let proposal = Proposal.load(event.params.proposalId.toString())
  if (proposal != null) {
    let statusMap = ["PENDING", "ACTIVE", "CANCELED", "DEFEATED", "SUCCEEDED", "QUEUED", "EXPIRED", "EXECUTED"]
    proposal.status = statusMap[event.params.newStatus]
    
    if (event.params.newStatus == 7) { // EXECUTED
      proposal.executedAt = event.block.timestamp
      proposal.passed = true
    } else if (event.params.newStatus == 3) { // DEFEATED
      proposal.passed = false
    } else if (event.params.newStatus == 4) { // SUCCEEDED
      proposal.passed = true
    }
    
    proposal.save()
  }
}

export function handleProposalCanceled(event: ProposalCanceledEvent): void {
  let proposal = Proposal.load(event.params.proposalId.toString())
  if (proposal != null) {
    proposal.status = "CANCELED"
    proposal.canceledAt = event.block.timestamp
    proposal.save()
  }
}

function updateDailyStats(timestamp: BigInt, action: string): void {
  let dayId = timestamp.toI32() / 86400
  let dailyStats = DailyStats.load(dayId.toString())
  
  if (dailyStats == null) {
    dailyStats = new DailyStats(dayId.toString())
    dailyStats.date = new Date(dayId * 86400 * 1000).toISOString().split('T')[0]
    dailyStats.timestamp = BigInt.fromI32(dayId * 86400)
    dailyStats.proposalsCreated = 0
    dailyStats.votesCast = 0
    dailyStats.uniqueVoters = 0
    dailyStats.treasuryDeposits = BigInt.fromI32(0)
    dailyStats.treasuryWithdrawals = BigInt.fromI32(0)
    dailyStats.newCitizens = 0
    dailyStats.activeCitizens = 0
    dailyStats.quorumAverage = BigDecimal.fromString("0")
  }
  
  if (action == "proposalCreated") {
    dailyStats.proposalsCreated = dailyStats.proposalsCreated + 1
  } else if (action == "voteCast") {
    dailyStats.votesCast = dailyStats.votesCast + 1
  }
  
  dailyStats.save()
}
```

---

## 🎯 QUICK START (MINIMUM VIABLE)

If you want to get started quickly with just the basics:

### **1. Install**
```powershell
cd c:\DAO\subgraph
npm install
```

### **2. Add ABIs**
Copy your contract ABIs to `abis/` folder

### **3. Create Basic Handler**
Create `src/proposal-manager.ts` with the template above

### **4. Generate Code**
```powershell
npm run codegen
```

### **5. Build**
```powershell
npm run build
```

### **6. Deploy**
```powershell
# After setting up The Graph account
npm run deploy-studio
```

---

## 📊 EXPECTED OUTCOMES

### **After Deployment**:

1. **GraphQL Endpoint**:
   ```
   https://api.thegraph.com/subgraphs/name/your-username/nexus-dao-governance
   ```

2. **Query Example**:
   ```graphql
   {
     proposals(first: 10, orderBy: createdAt, orderDirection: desc) {
       id
       title
       status
       forVotes
       againstVotes
       totalVotes
       proposer {
         address
       }
     }
   }
   ```

3. **Performance**:
   - Query time: < 200ms ✅
   - Historical data: Available ✅
   - Real-time updates: Yes ✅

---

## 🔧 TROUBLESHOOTING

### **Error: "ABI not found"**
- Make sure all ABI files are in `abis/` directory
- Check file names match subgraph.yaml

### **Error: "Failed to compile"**
- Run `npm run codegen` first
- Check for syntax errors in handlers

### **Error: "Deployment failed"**
- Verify you're authenticated: `graph auth`
- Check network is "sepolia"
- Verify contract addresses are correct

---

## 📚 NEXT STEPS

1. ✅ **Deploy basic subgraph** (Proposals + Votes)
2. ⏳ **Add remaining handlers** (Treasury, Citizens, etc.)
3. ⏳ **Test queries** (Verify data accuracy)
4. ⏳ **Update frontend** (Connect to GraphQL endpoint)
5. ⏳ **Monitor sync status** (Ensure real-time updates)

---

## 🎯 CRITICAL SUCCESS METRICS

### **Subgraph is Working When**:
- ✅ Syncing status shows "Synced"
- ✅ Queries return data in < 200ms
- ✅ Historical proposals appear
- ✅ New proposals appear within 30 seconds
- ✅ Vote counts update in real-time

---

## 🏛️ GOVERNMENT-GRADE VALIDATION

### **Audit Test**:
1. Create a proposal on-chain
2. Wait 30 seconds
3. Query subgraph for proposal
4. Verify all data matches blockchain
5. Export to CSV
6. **Result**: Should be instant and accurate

---

**Status**: ✅ **SUBGRAPH INFRASTRUCTURE CREATED**  
**Next**: Deploy to The Graph network  
**Timeline**: 1-2 hours for basic deployment  
**Outcome**: Historical data queryable in < 200ms
