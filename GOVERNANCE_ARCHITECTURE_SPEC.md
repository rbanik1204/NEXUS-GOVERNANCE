# 🏛️ NEXUS DAO: GOVERNMENT-GRADE GOVERNANCE ARCHITECTURE SPECIFICATION

**Version**: 2.0 - Production Pipeline  
**Classification**: Public Digital Infrastructure  
**Network**: Sepolia Testnet (Mainnet-Ready Architecture)  
**Date**: 2026-01-18

---

## EXECUTIVE SUMMARY

This document specifies the complete, production-grade governance pipeline for NEXUS DAO, designed for government pilot demonstrations. Every component is architected to be:
- **Auditable**: Every action traceable to a blockchain transaction
- **Transparent**: No hidden admin powers
- **Rule-Based**: Smart contracts enforce all governance rules
- **Decentralized**: No single point of control

---

# PART 1: OPERATIONS & GOVERNANCE ADMIN PANEL

## 1.1 WHY THIS ADMIN SECTION IS NECESSARY

Government digital infrastructure requires **operational oversight** without **authoritarian control**. The Admin Panel serves three critical functions:

1. **Configuration Management**: Adjusting governance parameters (quorum, voting periods) through governed proposals, not direct edits
2. **Compliance Monitoring**: Real-time visibility into system health, pending actions, and audit trails
3. **Emergency Response**: Governed pause mechanisms for security incidents (logged, reversible, transparent)

**Critical Distinction**: This is a "Monitoring & Configuration Dashboard", NOT a "Control Panel".

---

## 1.2 ADMIN PANEL MODULES

### MODULE A: Governance Configuration (READ + PROPOSE ONLY)

**What Admins CAN Do:**
- VIEW current governance parameters
- PROPOSE changes to parameters via standard proposal flow
- MONITOR active parameter-change proposals

**What Admins CANNOT Do:**
- ❌ Directly change quorum percentage
- ❌ Directly change voting duration
- ❌ Bypass the proposal voting process

**UI Components:**
```
┌─────────────────────────────────────────────────────────────┐
│  GOVERNANCE PARAMETERS (Read-Only View)                     │
├─────────────────────────────────────────────────────────────┤
│  Quorum Required:        15% of total voting power          │
│  Voting Period:          7 days (604,800 seconds)           │
│  Execution Delay:        48 hours (Timelock)                │
│  Proposal Threshold:     1,000 governance tokens            │
│                                                             │
│  [PROPOSE CHANGE] → Opens standard proposal creation        │
└─────────────────────────────────────────────────────────────┘
```

**Smart Contract Interface:**
```solidity
// GovernanceCore.sol - View Functions (No Access Control)
function getGovernanceParams() external view returns (
    uint256 votingPeriod,
    uint256 executionDelay,
    uint256 quorumPercentage,
    uint256 proposalThreshold
);

// Parameter changes ONLY via proposal execution
function updateGovernanceParams(
    uint256 newVotingPeriod,
    uint256 newQuorum
) external onlyRole(EXECUTOR_ROLE); // EXECUTOR_ROLE = GovernanceCore itself
```

---

### MODULE B: Proposal Category Management

**Purpose**: Define valid proposal types for structured governance.

**Categories:**
| ID | Category | Execution Type | Required Quorum |
|----|----------|----------------|-----------------|
| 0 | GENERAL | No on-chain action | 10% |
| 1 | TREASURY | Funds transfer | 20% |
| 2 | PARAMETER | Governance config | 25% |
| 3 | EMERGENCY | Pause/Unpause | 30% |
| 4 | CONSTITUTIONAL | Core rules change | 50% |

**What Admins CAN Do:**
- VIEW category definitions
- PROPOSE new categories via governance

**What Admins CANNOT Do:**
- ❌ Create categories without a vote
- ❌ Delete existing categories unilaterally

---

### MODULE C: Role Assignment (Identity Management)

**Roles in NEXUS DAO:**
| Role | Permissions | Assignment Method |
|------|-------------|-------------------|
| CITIZEN | Vote on proposals | Approved via identity verification proposal |
| DELEGATE | Vote + Create proposals | Upgraded from CITIZEN via proposal |
| AUDITOR | Read-only access to all logs | Assigned by passed proposal |
| OPERATOR | Access to admin dashboard (read-only) | Multi-sig assignment |

**What Admins CAN Do:**
- VIEW current role assignments
- INITIATE identity verification requests
- PROPOSE role upgrades/downgrades

**What Admins CANNOT Do:**
- ❌ Grant CITIZEN status without identity verification
- ❌ Grant DELEGATE status without community vote
- ❌ Revoke roles without governance approval

**Identity Hash System (No PII On-Chain):**
```
┌─────────────────────────────────────────────────────────────┐
│  IDENTITY VERIFICATION QUEUE                                │
├─────────────────────────────────────────────────────────────┤
│  Wallet: 0x7a3F...9c2D                                      │
│  Identity Hash: keccak256(name + DOB + national_id)         │
│  Verification Status: PENDING_APPROVAL                      │
│  Submitted: 2026-01-15 14:30 UTC                            │
│                                                             │
│  [CREATE APPROVAL PROPOSAL] → Requires community vote       │
└─────────────────────────────────────────────────────────────┘
```

**Smart Contract:**
```solidity
// CitizenRegistry.sol
mapping(bytes32 => address) public identityHashToWallet;
mapping(address => bool) public isCitizen;

// Registration requires proposal execution
function registerCitizen(
    address wallet,
    bytes32 identityHash
) external onlyRole(EXECUTOR_ROLE) {
    require(!isCitizen[wallet], "Already registered");
    identityHashToWallet[identityHash] = wallet;
    isCitizen[wallet] = true;
    emit CitizenRegistered(wallet, identityHash, block.timestamp);
}
```

---

### MODULE D: Treasury Safety Configuration

**What Admins CAN Do:**
- VIEW current treasury limits
- VIEW pending treasury proposals
- PROPOSE changes to safety thresholds

**What Admins CANNOT Do:**
- ❌ Move any funds directly
- ❌ Approve withdrawals without passed proposal
- ❌ Override multi-sig requirements

**Safety Parameters:**
```
┌─────────────────────────────────────────────────────────────┐
│  TREASURY SAFETY CONFIGURATION                              │
├─────────────────────────────────────────────────────────────┤
│  Daily Withdrawal Limit:       5 ETH                        │
│  Single Transaction Limit:     2 ETH                        │
│  Multi-Sig Threshold:          3 of 5 signers               │
│  Timelock Delay:               48 hours                     │
│  Emergency Freeze:             INACTIVE                     │
│                                                             │
│  [PROPOSE LIMIT CHANGE] → Standard proposal flow            │
└─────────────────────────────────────────────────────────────┘
```

---

### MODULE E: Emergency Pause (Governed)

**Purpose**: Halt critical operations during security incidents.

**Trigger Conditions:**
1. Security vulnerability detected
2. Malicious proposal identified
3. Network-wide emergency

**What Admins CAN Do:**
- INITIATE emergency pause proposal (fast-track: 24-hour vote)
- VIEW pause status and history

**What Admins CANNOT Do:**
- ❌ Pause system without governance approval
- ❌ Unpause without governance approval
- ❌ Hide pause actions from audit log

**Emergency Pause Flow:**
```
Incident Detected
       ↓
Operator Creates Emergency Proposal (Type: EMERGENCY)
       ↓
Fast-Track Voting (24 hours, 30% quorum)
       ↓
If PASSED → System Paused → All proposals frozen
       ↓
Resolution Proposal Created
       ↓
If PASSED → System Unpaused → Operations resume
       ↓
Full incident logged to audit trail
```

---

### MODULE F: System Health & Logs

**Real-Time Metrics:**
- Active proposals count
- Pending executions
- Treasury balance
- Voter participation rate (30-day rolling)
- Average proposal success rate
- Subgraph sync status

**Audit Log Viewer:**
- Every parameter change
- Every role assignment
- Every treasury movement
- Every emergency action
- All actions linked to transaction hashes

---

## 1.3 EXPLICIT ADMIN RESTRICTIONS

| Action | Allowed? | Enforcement |
|--------|----------|-------------|
| View governance parameters | ✅ YES | Public view functions |
| Change governance parameters directly | ❌ NO | Requires EXECUTOR_ROLE (contract only) |
| Move treasury funds | ❌ NO | Requires passed proposal + timelock |
| Grant citizen status | ❌ NO | Requires passed verification proposal |
| Override vote results | ❌ NO | No function exists in contract |
| Delete proposals | ❌ NO | Proposals are immutable on-chain |
| Access user private keys | ❌ NO | Keys never touch backend |
| Pause system without vote | ❌ NO | Requires emergency proposal |

---

# PART 2: VOTING PIPELINE - END-TO-END SPECIFICATION

## 2.1 COMPLETE VOTING FLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    VOTING PIPELINE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [1] WALLET CONNECTION                                      │
│       ↓                                                     │
│  [2] VOTER ELIGIBILITY CHECK                                │
│       ↓                                                     │
│  [3] VOTING POWER CALCULATION                               │
│       ↓                                                     │
│  [4] PROPOSAL STATE VALIDATION                              │
│       ↓                                                     │
│  [5] VOTE TRANSACTION EXECUTION                             │
│       ↓                                                     │
│  [6] ON-CHAIN CONFIRMATION                                  │
│       ↓                                                     │
│  [7] UI STATE REFRESH                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2.2 STEP-BY-STEP IMPLEMENTATION

### STEP 1: Wallet Connection Validation

**Frontend Checks:**
```javascript
async function validateWalletConnection() {
    // Check 1: Wallet provider exists
    if (!window.ethereum) {
        throw new Error("NO_WALLET_DETECTED");
    }
    
    // Check 2: Wallet is connected
    const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
    });
    if (accounts.length === 0) {
        throw new Error("WALLET_NOT_CONNECTED");
    }
    
    // Check 3: Correct network
    const chainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
    });
    if (chainId !== '0xaa36a7') { // Sepolia
        throw new Error("WRONG_NETWORK");
    }
    
    return { 
        success: true, 
        address: accounts[0],
        chainId: chainId
    };
}
```

**Error Handling:**
| Error Code | User Message | UI Action |
|------------|--------------|-----------|
| NO_WALLET_DETECTED | "Please install MetaMask" | Show install link |
| WALLET_NOT_CONNECTED | "Please connect your wallet" | Show connect button |
| WRONG_NETWORK | "Please switch to Sepolia" | Auto-switch prompt |

---

### STEP 2: Voter Eligibility Check

**Smart Contract Function:**
```solidity
// CitizenRegistry.sol
function canVote(address voter) external view returns (bool eligible, string memory reason) {
    if (!isCitizen[voter]) {
        return (false, "NOT_REGISTERED_CITIZEN");
    }
    if (isRevoked[voter]) {
        return (false, "CITIZENSHIP_REVOKED");
    }
    if (block.timestamp < registrationTimestamp[voter] + VOTING_DELAY) {
        return (false, "REGISTRATION_TOO_RECENT");
    }
    return (true, "ELIGIBLE");
}
```

**Frontend Implementation:**
```javascript
async function checkVoterEligibility(voterAddress) {
    const citizenRegistry = await getContract('CitizenRegistry');
    const [eligible, reason] = await citizenRegistry.canVote(voterAddress);
    
    if (!eligible) {
        const errorMessages = {
            "NOT_REGISTERED_CITIZEN": "You must be a registered citizen to vote",
            "CITIZENSHIP_REVOKED": "Your voting rights have been suspended",
            "REGISTRATION_TOO_RECENT": "New citizens must wait 24 hours before voting"
        };
        throw new Error(errorMessages[reason] || reason);
    }
    
    return true;
}
```

---

### STEP 3: Voting Power Calculation

**Smart Contract Function:**
```solidity
// VotingEngine.sol
function getVotingPower(address voter) external view returns (uint256) {
    uint256 basePower = citizenRegistry.getBasePower(voter);
    uint256 delegatedPower = getDelegatedPower(voter);
    uint256 totalPower = basePower + delegatedPower;
    
    // Apply any modifiers (reputation, stake duration, etc.)
    return applyModifiers(voter, totalPower);
}

function getDelegatedPower(address delegate) public view returns (uint256) {
    uint256 total = 0;
    address[] memory delegators = delegatorsOf[delegate];
    for (uint i = 0; i < delegators.length; i++) {
        if (delegations[delegators[i]] == delegate) {
            total += citizenRegistry.getBasePower(delegators[i]);
        }
    }
    return total;
}
```

**Frontend Display:**
```javascript
async function displayVotingPower(voterAddress) {
    const votingEngine = await getContract('VotingEngine');
    const power = await votingEngine.getVotingPower(voterAddress);
    
    return {
        basePower: await citizenRegistry.getBasePower(voterAddress),
        delegatedPower: await votingEngine.getDelegatedPower(voterAddress),
        totalPower: power,
        displayString: `${power} votes`
    };
}
```

---

### STEP 4: Proposal State Validation

**Valid Voting States:**
```solidity
enum ProposalState {
    Pending,    // 0 - Not yet active
    Active,     // 1 - Voting in progress ← ONLY THIS STATE ALLOWS VOTING
    Canceled,   // 2 - Proposer canceled
    Defeated,   // 3 - Quorum not met or majority against
    Succeeded,  // 4 - Passed, awaiting execution
    Queued,     // 5 - In timelock queue
    Expired,    // 6 - Timelock expired without execution
    Executed    // 7 - Successfully executed
}

function state(uint256 proposalId) public view returns (ProposalState) {
    Proposal storage proposal = proposals[proposalId];
    
    if (proposal.canceled) return ProposalState.Canceled;
    if (block.timestamp < proposal.startTime) return ProposalState.Pending;
    if (block.timestamp <= proposal.endTime) return ProposalState.Active;
    if (!quorumReached(proposalId)) return ProposalState.Defeated;
    if (proposal.forVotes <= proposal.againstVotes) return ProposalState.Defeated;
    if (proposal.executed) return ProposalState.Executed;
    if (proposal.queued) return ProposalState.Queued;
    if (block.timestamp > proposal.endTime + GRACE_PERIOD) return ProposalState.Expired;
    
    return ProposalState.Succeeded;
}
```

**Frontend Validation:**
```javascript
async function validateProposalState(proposalId) {
    const proposalManager = await getContract('ProposalManager');
    const state = await proposalManager.state(proposalId);
    
    if (state !== 1) { // 1 = Active
        const stateNames = ['Pending', 'Active', 'Canceled', 'Defeated', 
                           'Succeeded', 'Queued', 'Expired', 'Executed'];
        throw new Error(`Cannot vote: Proposal is ${stateNames[state]}`);
    }
    
    // Additional time check
    const proposal = await proposalManager.proposals(proposalId);
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = Number(proposal.endTime) - currentTime;
    
    return {
        canVote: true,
        remainingTime: remainingTime,
        endTime: new Date(Number(proposal.endTime) * 1000)
    };
}
```

---

### STEP 5: Vote Transaction Execution

**Smart Contract Function:**
```solidity
// ProposalManager.sol
function castVote(
    uint256 proposalId, 
    uint8 support // 0 = Against, 1 = For, 2 = Abstain
) external returns (uint256 weight) {
    address voter = msg.sender;
    Proposal storage proposal = proposals[proposalId];
    
    // Validation
    require(state(proposalId) == ProposalState.Active, "Voting closed");
    require(!hasVoted[proposalId][voter], "Already voted");
    require(citizenRegistry.isCitizen(voter), "Not a citizen");
    
    // Get voting power
    weight = votingEngine.getVotingPower(voter);
    require(weight > 0, "No voting power");
    
    // Record vote
    hasVoted[proposalId][voter] = true;
    votes[proposalId][voter] = Vote({
        support: support,
        weight: weight,
        timestamp: block.timestamp
    });
    
    // Update tallies
    if (support == 0) {
        proposal.againstVotes += weight;
    } else if (support == 1) {
        proposal.forVotes += weight;
    } else {
        proposal.abstainVotes += weight;
    }
    
    proposal.totalVotes += weight;
    
    emit VoteCast(voter, proposalId, support, weight, block.timestamp);
    
    return weight;
}
```

**Frontend Execution:**
```javascript
async function executeVote(proposalId, support) {
    // Pre-flight checks
    await validateWalletConnection();
    await checkVoterEligibility(walletAddress);
    await validateProposalState(proposalId);
    await checkNotAlreadyVoted(proposalId, walletAddress);
    
    // Execute transaction
    const proposalManager = await getContract('ProposalManager', true); // with signer
    
    try {
        // Estimate gas first
        const gasEstimate = await proposalManager.estimateGas.castVote(proposalId, support);
        
        // Execute with 20% buffer
        const tx = await proposalManager.castVote(proposalId, support, {
            gasLimit: Math.floor(gasEstimate * 1.2)
        });
        
        // Return pending transaction
        return {
            status: 'PENDING',
            txHash: tx.hash,
            tx: tx
        };
    } catch (error) {
        // Parse revert reason
        const reason = parseRevertReason(error);
        throw new Error(reason);
    }
}
```

---

### STEP 6: On-Chain Confirmation

**Frontend Waiting Logic:**
```javascript
async function waitForVoteConfirmation(tx) {
    const receipt = await tx.wait(1); // Wait for 1 confirmation
    
    if (receipt.status === 0) {
        throw new Error("Transaction reverted on-chain");
    }
    
    // Parse VoteCast event
    const voteCastEvent = receipt.logs.find(log => {
        try {
            const parsed = proposalManagerInterface.parseLog(log);
            return parsed.name === 'VoteCast';
        } catch { return false; }
    });
    
    if (!voteCastEvent) {
        throw new Error("Vote event not found in transaction");
    }
    
    const parsed = proposalManagerInterface.parseLog(voteCastEvent);
    
    return {
        status: 'CONFIRMED',
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        voter: parsed.args.voter,
        proposalId: parsed.args.proposalId.toString(),
        support: parsed.args.support,
        weight: parsed.args.weight.toString(),
        gasUsed: receipt.gasUsed.toString()
    };
}
```

---

### STEP 7: UI State Refresh

**Post-Vote UI Updates:**
```javascript
async function refreshUIAfterVote(proposalId, voteResult) {
    // 1. Update local state immediately (optimistic)
    setUserVote({
        proposalId: proposalId,
        vote: voteResult.support,
        weight: voteResult.weight,
        confirmed: true
    });
    
    // 2. Refresh proposal data from chain
    const updatedProposal = await fetchProposalFromChain(proposalId);
    updateProposalInState(updatedProposal);
    
    // 3. Refresh user's voting status
    const hasVoted = await proposalManager.hasVoted(proposalId, walletAddress);
    setHasVotedOnProposal(proposalId, hasVoted);
    
    // 4. Show success notification
    showNotification({
        type: 'success',
        title: 'Vote Recorded',
        message: `Your vote of ${voteResult.weight} voting power has been recorded on-chain.`,
        txHash: voteResult.txHash
    });
    
    // 5. Trigger subgraph refresh (if using The Graph)
    await triggerSubgraphRefresh();
}
```

---

## 2.3 DOUBLE VOTING PREVENTION

**On-Chain Enforcement:**
```solidity
mapping(uint256 => mapping(address => bool)) public hasVoted;

modifier preventDoubleVote(uint256 proposalId) {
    require(!hasVoted[proposalId][msg.sender], "Already voted on this proposal");
    _;
}
```

**Frontend Check:**
```javascript
async function checkNotAlreadyVoted(proposalId, voterAddress) {
    const hasVoted = await proposalManager.hasVoted(proposalId, voterAddress);
    if (hasVoted) {
        throw new Error("You have already voted on this proposal");
    }
}
```

**UI Indication:**
- If user has voted: Hide vote buttons, show "You voted: FOR/AGAINST/ABSTAIN"
- Display user's vote weight contribution
- Link to their vote transaction

---

## 2.4 DELEGATION EFFECTS ON VOTING

**Delegation Rules:**
1. Delegated power transfers to delegate
2. Delegator cannot vote if delegated
3. Delegation can be revoked before proposal ends
4. Revocation affects only future votes

**Smart Contract Logic:**
```solidity
function delegate(address delegatee) external {
    require(delegatee != address(0), "Cannot delegate to zero");
    require(delegatee != msg.sender, "Cannot self-delegate");
    require(isCitizen[msg.sender], "Must be citizen");
    require(isCitizen[delegatee], "Delegatee must be citizen");
    
    // Remove from previous delegate if any
    if (delegations[msg.sender] != address(0)) {
        _removeDelegator(delegations[msg.sender], msg.sender);
    }
    
    delegations[msg.sender] = delegatee;
    delegatorsOf[delegatee].push(msg.sender);
    
    emit DelegateChanged(msg.sender, delegatee);
}

// Voting check
function castVote(uint256 proposalId, uint8 support) external {
    require(delegations[msg.sender] == address(0), "You have delegated your vote");
    // ... rest of voting logic
}
```

---

## 2.5 ERROR STATES AND USER FEEDBACK

| Error | User Message | UI Behavior |
|-------|--------------|-------------|
| NOT_REGISTERED_CITIZEN | "You must be a registered citizen to vote" | Show registration link |
| ALREADY_VOTED | "You have already voted on this proposal" | Show existing vote |
| VOTING_CLOSED | "Voting has ended for this proposal" | Disable vote buttons |
| NO_VOTING_POWER | "You have no voting power" | Show delegation info |
| DELEGATED | "You have delegated your vote to [address]" | Show revoke option |
| INSUFFICIENT_GAS | "Transaction failed - insufficient gas" | Retry with higher gas |
| USER_REJECTED | "Transaction was rejected in wallet" | Show retry button |
| NETWORK_ERROR | "Network error - please try again" | Show retry button |

---

# PART 3: PROPOSAL LIFECYCLE (NO DEMO DATA)

## 3.1 LIFECYCLE STATES

```
┌──────────────────────────────────────────────────────────────────────┐
│                    PROPOSAL LIFECYCLE                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [DRAFT] → [SUBMITTED] → [ACTIVE] → [SUCCEEDED/DEFEATED]             │
│                             ↓              ↓                          │
│                         [CANCELED]    [QUEUED] → [EXECUTED]           │
│                                           ↓                           │
│                                      [EXPIRED]                        │
│                                                                       │
│  Final States: EXECUTED, DEFEATED, CANCELED, EXPIRED                  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## 3.2 STATE DEFINITIONS

| State | On-Chain Status | Duration | Actions Available |
|-------|-----------------|----------|-------------------|
| DRAFT | Not submitted | Unlimited | Edit, Delete, Submit |
| SUBMITTED | Pending (pre-vote) | 24 hours | Cancel (proposer only) |
| ACTIVE | Voting open | 7 days | Vote, Cancel (proposer) |
| SUCCEEDED | Majority FOR + Quorum | - | Queue for execution |
| DEFEATED | Failed vote | - | None (archived) |
| QUEUED | In timelock | 48 hours | Execute after delay |
| EXECUTED | Actions performed | - | None (archived) |
| EXPIRED | Timelock grace exceeded | - | None (archived) |
| CANCELED | Proposer canceled | - | None (archived) |

## 3.3 NO DEMO DATA MIXING

**Data Source Hierarchy:**
```javascript
async function fetchProposals() {
    // ALWAYS fetch from blockchain/subgraph in production
    if (!demoMode) {
        // Primary: Subgraph (indexed)
        const subgraphData = await querySubgraph(GET_ALL_PROPOSALS);
        
        // Fallback: Direct RPC calls
        if (!subgraphData) {
            const proposalCount = await proposalManager.getProposalCount();
            const proposals = [];
            for (let i = 1; i <= proposalCount; i++) {
                proposals.push(await proposalManager.proposals(i));
            }
            return proposals;
        }
        
        return subgraphData.proposals;
    }
    
    // Demo mode: Use clearly marked mock data
    return DEMO_PROPOSALS.map(p => ({
        ...p,
        _isDemo: true,
        _demoWarning: "This is demonstration data"
    }));
}
```

**UI Enforcement:**
- Every proposal displays its blockchain transaction hash
- Proposals without on-chain reference show "PENDING SUBMISSION"
- Demo data shows prominent "DEMO DATA" banner

---

## 3.4 BLOCKCHAIN REFERENCE REQUIREMENTS

**Proposal Data Structure:**
```typescript
interface Proposal {
    // On-Chain Fields (Required)
    id: number;                    // Contract proposal ID
    proposer: string;              // Address
    creationTxHash: string;        // Transaction that created it
    creationBlock: number;         // Block number
    
    // Voting Data (From Chain)
    forVotes: bigint;
    againstVotes: bigint;
    abstainVotes: bigint;
    startTime: number;
    endTime: number;
    state: ProposalState;
    
    // Optional Metadata (IPFS)
    descriptionHash: string;       // IPFS CID for full description
    category: number;
    
    // Execution (If Treasury Proposal)
    targets: string[];
    values: bigint[];
    calldatas: string[];
    
    // Timestamps
    queuedAt?: number;
    executedAt?: number;
    executionTxHash?: string;
}
```

---

# PART 4: TREASURY GOVERNANCE LINK

## 4.1 TREASURY ACTION REQUIREMENTS

**Mandatory Conditions for ANY Treasury Movement:**
1. ✅ Passed governance proposal (Type: TREASURY)
2. ✅ Timelock delay completed (48 hours minimum)
3. ✅ Multi-sig execution (3 of 5 signers)
4. ✅ Within daily/single transaction limits
5. ✅ Full audit trail

## 4.2 TREASURY EXECUTION FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                 TREASURY EXECUTION PIPELINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [1] Treasury Proposal Created                                   │
│      - Amount, recipient, purpose specified                      │
│      ↓                                                           │
│  [2] Voting Period (7 days)                                      │
│      - Quorum: 20% required for treasury actions                 │
│      ↓                                                           │
│  [3] Proposal SUCCEEDED                                          │
│      - Majority FOR + Quorum met                                 │
│      ↓                                                           │
│  [4] Queue in Timelock                                           │
│      - Proposal queued with execution timestamp                  │
│      - 48-hour delay begins                                      │
│      ↓                                                           │
│  [5] Multi-Sig Approval                                          │
│      - 3 of 5 designated signers must approve                    │
│      - Each approval is a separate transaction                   │
│      ↓                                                           │
│  [6] Execution                                                   │
│      - Funds transferred                                         │
│      - Event emitted with full details                           │
│      ↓                                                           │
│  [7] Audit Log Updated                                           │
│      - Visible in UI within 30 seconds                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4.3 SMART CONTRACT ENFORCEMENT

```solidity
// TreasuryManager.sol
function executeWithdrawal(
    uint256 proposalId,
    address token,
    address recipient,
    uint256 amount
) external {
    // Check 1: Proposal must be in QUEUED state
    require(proposalManager.state(proposalId) == ProposalState.Queued, "Not queued");
    
    // Check 2: Timelock delay must have passed
    Proposal storage proposal = proposalManager.proposals(proposalId);
    require(block.timestamp >= proposal.queuedAt + TIMELOCK_DELAY, "Timelock active");
    
    // Check 3: Multi-sig threshold met
    require(approvalCount[proposalId] >= MULTISIG_THRESHOLD, "Insufficient approvals");
    
    // Check 4: Within limits
    require(amount <= singleTransactionLimit, "Exceeds single limit");
    require(dailyWithdrawals[today()] + amount <= dailyLimit, "Exceeds daily limit");
    
    // Check 5: Matches proposal specification
    require(
        keccak256(abi.encode(token, recipient, amount)) == proposal.executionHash,
        "Parameters mismatch"
    );
    
    // Execute transfer
    if (token == address(0)) {
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "ETH transfer failed");
    } else {
        IERC20(token).safeTransfer(recipient, amount);
    }
    
    // Update state
    dailyWithdrawals[today()] += amount;
    proposalManager.markExecuted(proposalId);
    
    emit TreasuryWithdrawal(proposalId, token, recipient, amount, block.timestamp);
}
```

## 4.4 UI VISIBILITY

**Treasury Dashboard Requirements:**
- Show all pending treasury proposals
- Display timelock countdown for queued proposals
- Show multi-sig approval progress (e.g., "2/5 approvals")
- Real-time balance updates
- Complete transaction history with etherscan links

---

# PART 5: DEMO / LIVE MODE TOGGLE

## 5.1 IMPLEMENTATION

```javascript
// DemoModeContext.jsx - Enhanced
const DemoModeContext = createContext();

export function DemoModeProvider({ children }) {
    const [demoMode, setDemoMode] = useState(true);
    const { isConnected, address } = useAccount();
    
    // Auto-switch to live when wallet connected
    useEffect(() => {
        if (isConnected && address) {
            // Prompt user to switch to live mode
            showPrompt("Switch to Live Mode?", {
                message: "Wallet connected. View real blockchain data?",
                onConfirm: () => setDemoMode(false),
                onCancel: () => {} // Stay in demo
            });
        }
    }, [isConnected]);
    
    return (
        <DemoModeContext.Provider value={{ 
            demoMode, 
            setDemoMode,
            isLiveMode: !demoMode,
            modeLabel: demoMode ? "DEMO" : "LIVE"
        }}>
            {children}
        </DemoModeContext.Provider>
    );
}
```

## 5.2 VISUAL INDICATORS

**Demo Mode Banner:**
```jsx
{demoMode && (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black 
                    py-2 px-4 text-center font-bold z-50 animate-pulse">
        ⚠️ DEMO MODE - Displaying simulated data for demonstration purposes only
    </div>
)}
```

**Live Mode Indicator:**
```jsx
{!demoMode && (
    <Badge className="bg-cyber-green text-black font-bold">
        🔴 LIVE - Connected to Sepolia Network
    </Badge>
)}
```

## 5.3 AUDITOR CLARITY

**Data Source Labels:**
- Every data card shows source: "Source: Subgraph v0.0.2" or "Source: Demo Data"
- Transaction hashes link to block explorer in live mode
- Demo data shows "N/A" for transaction hashes
- Timestamp shows generation time for demo, block time for live

---

# PART 6: ACCEPTANCE CRITERIA

## 6.1 VOTING MODULE

### Definition of DONE:
- [ ] Wallet connection flow handles all error states
- [ ] Eligibility check runs before vote button enabled
- [ ] Voting power displays correctly with delegation
- [ ] Vote transaction executes and confirms
- [ ] UI updates within 5 seconds of confirmation
- [ ] Double-voting prevented on-chain
- [ ] All votes visible in audit trail

### Failure Scenarios:
| Scenario | Expected Behavior | Verification |
|----------|-------------------|--------------|
| User not citizen | Vote button disabled, message shown | Test with non-citizen wallet |
| Already voted | Vote button hidden, existing vote shown | Test double-vote attempt |
| Proposal expired | Vote button disabled, "Voting closed" | Test after end time |
| Transaction reverted | Error message, retry available | Force revert via gas limit |
| Network disconnected | Reconnection prompt | Disconnect during vote |

### Audit Verification:
1. Query subgraph for all votes on a proposal
2. Sum should match on-chain tallies exactly
3. Each vote has corresponding VoteCast event
4. No voter appears twice for same proposal

---

## 6.2 ADMIN MODULE

### Definition of DONE:
- [ ] All views display current on-chain state
- [ ] No direct mutation functions exposed
- [ ] All "change" actions route to proposal creation
- [ ] Emergency pause requires proposal approval
- [ ] Role assignments visible and traced
- [ ] Audit log shows all admin view accesses

### Failure Scenarios:
| Scenario | Expected Behavior | Verification |
|----------|-------------------|--------------|
| Admin tries direct parameter change | No function available | Code review |
| Admin tries fund transfer | No function available | Code review |
| Unauthorized role access | Access denied error | Test with non-admin wallet |
| Emergency pause without vote | System remains active | Test pause flow |

### Audit Verification:
1. Review GovernanceCore contract - no admin-callable mutators
2. Review TreasuryManager - no direct transfer functions
3. All parameter changes have associated proposal IDs
4. Emergency actions logged with timestamps

---

## 6.3 TREASURY MODULE

### Definition of DONE:
- [ ] All withdrawals require passed proposals
- [ ] Timelock delay enforced on-chain
- [ ] Multi-sig threshold configurable via governance
- [ ] Daily/single limits enforced
- [ ] All transactions visible in real-time
- [ ] Balance updates within 1 block

### Failure Scenarios:
| Scenario | Expected Behavior | Verification |
|----------|-------------------|--------------|
| Direct withdrawal attempt | Transaction reverts | Test unauthorized call |
| Skip timelock | Transaction reverts | Test early execution |
| Exceed daily limit | Transaction reverts | Test multiple withdrawals |
| Insufficient multi-sig | Transaction reverts | Test with 2/5 approvals |

### Audit Verification:
1. Every treasury outflow has matching proposal ID
2. Timelock delay verified via block timestamps
3. Multi-sig approvals logged separately
4. Balance changes match transaction amounts exactly

---

# IMPLEMENTATION TASK LIST

## Phase 1: Smart Contract Fixes (Priority: CRITICAL)
- [ ] Update ProposalManager.castVote with comprehensive checks
- [ ] Add VotingEngine.getVotingPower with delegation support
- [ ] Verify CitizenRegistry.canVote function exists
- [ ] Add ProposalState enum and state() function
- [ ] Test on local Hardhat fork

## Phase 2: Frontend Voting Pipeline (Priority: CRITICAL)
- [ ] Implement validateWalletConnection()
- [ ] Implement checkVoterEligibility()
- [ ] Implement validateProposalState()
- [ ] Implement executeVote() with error handling
- [ ] Implement waitForVoteConfirmation()
- [ ] Implement refreshUIAfterVote()

## Phase 3: Admin Dashboard (Priority: HIGH)
- [ ] Create OperationsPanel component
- [ ] Implement read-only governance parameter display
- [ ] Add "Propose Change" button routing
- [ ] Implement role viewer
- [ ] Add system health metrics

## Phase 4: Treasury Integration (Priority: HIGH)
- [ ] Verify TreasuryManager timelock logic
- [ ] Implement multi-sig approval UI
- [ ] Add withdrawal tracking dashboard
- [ ] Connect treasury proposals to execution queue

## Phase 5: Demo Mode Refinement (Priority: MEDIUM)
- [ ] Add prominent demo mode banner
- [ ] Ensure data source labels on all cards
- [ ] Implement auditor-friendly mode toggle
- [ ] Add "Switch to Live" confirmation dialog

---

# APPENDIX A: SMART CONTRACT INTERFACE SUMMARY

```solidity
// Required Functions for Voting Pipeline

interface IProposalManager {
    function getProposalCount() external view returns (uint256);
    function proposals(uint256 id) external view returns (Proposal memory);
    function state(uint256 proposalId) external view returns (ProposalState);
    function castVote(uint256 proposalId, uint8 support) external returns (uint256 weight);
    function hasVoted(uint256 proposalId, address voter) external view returns (bool);
}

interface ICitizenRegistry {
    function isCitizen(address wallet) external view returns (bool);
    function canVote(address voter) external view returns (bool eligible, string memory reason);
    function getBasePower(address citizen) external view returns (uint256);
}

interface IVotingEngine {
    function getVotingPower(address voter) external view returns (uint256);
    function getDelegatedPower(address delegate) external view returns (uint256);
    function delegations(address delegator) external view returns (address delegatee);
}

interface ITreasuryManager {
    function getBalance(address token) external view returns (uint256);
    function queueWithdrawal(uint256 proposalId) external;
    function approveExecution(uint256 proposalId) external;
    function executeWithdrawal(uint256 proposalId, address token, address to, uint256 amount) external;
}
```

---

**END OF SPECIFICATION**

This document serves as the authoritative reference for NEXUS DAO governance implementation. All development must adhere to these specifications to ensure government-grade compliance and auditability.
