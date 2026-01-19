# PHASE 1: GOVERNANCE ENGINE - Technical Specification

## 🎯 Objective
Build a production-ready, modular governance smart contract system that enforces democratic processes, prevents power concentration, and ensures full auditability.

---

## 📐 Smart Contract Architecture

### Contract Structure (Modular Design)

```
GovernanceCore.sol          - Main governance logic
├── ProposalManager.sol     - Proposal lifecycle management
├── RoleManager.sol         - Role-based access control
├── VotingEngine.sol        - Voting logic (pluggable strategies)
├── ExecutionModule.sol     - Time-locked execution
└── EmergencyModule.sol     - Pause/unpause functionality
```

---

## 🔧 TODO LIST: Smart Contracts

### ✅ 1. GovernanceCore Contract

**What to Build:**
- Central governance contract that coordinates all modules
- Stores governance parameters (quorum, voting period, etc.)
- Emits events for all governance actions
- Upgradeable via transparent proxy pattern

**Implementation Steps:**
```solidity
// File: contracts/governance/GovernanceCore.sol

1. Define governance parameters struct:
   - votingPeriod (e.g., 7 days)
   - executionDelay (e.g., 48 hours)
   - quorumPercentage (e.g., 10%)
   - proposalThreshold (min tokens to create proposal)

2. Implement module registry:
   - addModule(address module, bytes4 moduleId)
   - removeModule(bytes4 moduleId)
   - Only callable via governance

3. Add parameter update functions:
   - updateVotingPeriod(uint256 newPeriod)
   - updateQuorum(uint256 newQuorum)
   - All updates require governance approval

4. Implement event logging:
   - event ProposalCreated(uint256 proposalId, address proposer)
   - event VoteCast(uint256 proposalId, address voter, uint256 weight)
   - event ProposalExecuted(uint256 proposalId)
```

**Why (Government Context):**
- Governments require transparent, auditable decision-making
- Parameters must be adjustable as needs evolve
- Modular design allows upgrades without full redeployment

**Acceptance Criteria:**
- ✓ All governance parameters are on-chain and publicly readable
- ✓ Parameter changes require governance approval
- ✓ Events emitted for every state change
- ✓ Contract is upgradeable via governance only

---

### ✅ 2. ProposalManager Contract

**What to Build:**
- Proposal creation, validation, and lifecycle management
- Support for multiple proposal types
- Proposal metadata storage (IPFS hash)
- State machine enforcement

**Implementation Steps:**
```solidity
// File: contracts/governance/ProposalManager.sol

1. Define Proposal struct:
   struct Proposal {
       uint256 id;
       address proposer;
       ProposalType proposalType;
       ProposalState state;
       uint256 startBlock;
       uint256 endBlock;
       uint256 executionTime;
       string metadataHash; // IPFS hash
       uint256 forVotes;
       uint256 againstVotes;
       uint256 abstainVotes;
       mapping(address => bool) hasVoted;
   }

2. Define ProposalType enum:
   - POLICY_DECISION
   - BUDGET_ALLOCATION
   - REGULATION_AMENDMENT
   - ROLE_ASSIGNMENT
   - EMERGENCY_ACTION
   - PARAMETER_UPDATE

3. Define ProposalState enum:
   - DRAFT (not yet active)
   - ACTIVE (voting in progress)
   - SUCCEEDED (passed quorum and majority)
   - DEFEATED (failed)
   - QUEUED (awaiting execution delay)
   - EXECUTED (completed)
   - CANCELLED (cancelled by proposer or admin)
   - EXPIRED (voting period ended without quorum)

4. Implement createProposal():
   - Validate proposer has sufficient tokens/role
   - Check rate limiting (max 1 proposal per user per week)
   - Store proposal metadata hash
   - Emit ProposalCreated event

5. Implement state transition functions:
   - activateProposal(uint256 proposalId)
   - queueProposal(uint256 proposalId)
   - executeProposal(uint256 proposalId)
   - cancelProposal(uint256 proposalId)
   - Each transition validates current state

6. Add proposal validation:
   - validateProposalType(ProposalType type, bytes calldata data)
   - Ensure proposal data matches type requirements
```

**Why (Government Context):**
- Different decisions require different approval processes
- State machine prevents invalid transitions
- Metadata on IPFS keeps detailed proposals off-chain (cost-effective)

**Acceptance Criteria:**
- ✓ Proposals cannot skip states (e.g., DRAFT → EXECUTED)
- ✓ Each proposal type has specific validation rules
- ✓ Proposal metadata is immutable once created
- ✓ Rate limiting prevents spam

---

### ✅ 3. RoleManager Contract

**What to Build:**
- Role-based access control (RBAC) system
- Role assignment and revocation
- Permission checking for all governance actions
- Role hierarchy and delegation

**Implementation Steps:**
```solidity
// File: contracts/governance/RoleManager.sol

1. Define roles using OpenZeppelin AccessControl:
   - CITIZEN_ROLE (default for verified users)
   - DELEGATE_ROLE (can create proposals)
   - ADMINISTRATOR_ROLE (can execute approved actions)
   - AUDITOR_ROLE (read-only, can flag issues)
   - GUARDIAN_ROLE (emergency pause, time-limited)

2. Implement role assignment:
   - grantRole(bytes32 role, address account)
   - revokeRole(bytes32 role, address account)
   - Only ADMINISTRATOR_ROLE can assign roles
   - Emit RoleGranted/RoleRevoked events

3. Add role verification:
   - hasRole(bytes32 role, address account) returns bool
   - requireRole(bytes32 role, address account) reverts if false

4. Implement time-limited roles:
   - grantTemporaryRole(bytes32 role, address account, uint256 duration)
   - Automatically revoke after expiration
   - Used for GUARDIAN_ROLE (e.g., 30-day emergency authority)

5. Add role delegation:
   - delegateRole(bytes32 role, address delegate)
   - Allows CITIZEN to delegate voting to DELEGATE
   - Revocable at any time
```

**Why (Government Context):**
- Separation of powers prevents abuse
- Auditors provide oversight without execution power
- Time-limited emergency roles prevent permanent power concentration

**Acceptance Criteria:**
- ✓ No single role can perform all actions
- ✓ Role changes are logged and auditable
- ✓ Time-limited roles auto-expire
- ✓ Role delegation is transparent

---

### ✅ 4. ExecutionModule Contract

**What to Build:**
- Time-locked execution of approved proposals
- Multi-step execution for complex proposals
- Automatic reversion on failed execution
- Execution queue management

**Implementation Steps:**
```solidity
// File: contracts/governance/ExecutionModule.sol

1. Implement Timelock:
   - Minimum delay: 24 hours (configurable)
   - Maximum delay: 30 days
   - Delay starts after proposal succeeds

2. Create execution queue:
   - queueTransaction(uint256 proposalId, bytes calldata data)
   - Store: target, value, signature, data, eta (execution time)
   - Emit QueuedTransaction event

3. Implement executeTransaction():
   - Verify timelock has passed
   - Verify proposal is in QUEUED state
   - Execute transaction via low-level call
   - Handle success/failure
   - Emit ExecutedTransaction event

4. Add cancellation:
   - cancelTransaction(uint256 proposalId)
   - Only callable by proposer or ADMINISTRATOR
   - Only before execution

5. Implement batch execution:
   - executeBatch(uint256[] proposalIds)
   - For proposals with multiple actions
   - All-or-nothing execution (atomic)
```

**Why (Government Context):**
- Time delay allows community to review before execution
- Prevents rushed or malicious actions
- Batch execution ensures consistency

**Acceptance Criteria:**
- ✓ No execution before timelock expires
- ✓ Failed executions don't change state
- ✓ Batch executions are atomic
- ✓ Execution can be cancelled before timelock

---

### ✅ 5. EmergencyModule Contract

**What to Build:**
- Circuit breaker for emergency situations
- Pause/unpause functionality
- Guardian role with time-limited authority
- Emergency action logging

**Implementation Steps:**
```solidity
// File: contracts/governance/EmergencyModule.sol

1. Implement Pausable pattern:
   - Use OpenZeppelin Pausable
   - pause() - stops all governance actions
   - unpause() - resumes operations
   - Only GUARDIAN_ROLE can pause

2. Add emergency actions:
   - emergencyWithdraw(address token, uint256 amount)
   - emergencyUpgrade(address newImplementation)
   - Require multi-sig approval (3-of-5 guardians)

3. Implement automatic unpause:
   - Maximum pause duration: 7 days
   - Automatically unpause after duration
   - Prevents permanent lockup

4. Add emergency proposal fast-track:
   - createEmergencyProposal(bytes calldata data)
   - Reduced voting period (24 hours)
   - Higher quorum requirement (30%)
   - Only for critical security issues
```

**Why (Government Context):**
- Governments need emergency response capability
- Time limits prevent abuse of emergency powers
- Multi-sig ensures no single guardian can act alone

**Acceptance Criteria:**
- ✓ Pause prevents all state changes
- ✓ Automatic unpause after max duration
- ✓ Emergency actions require multi-sig
- ✓ All emergency actions are logged

---

## 🗄️ TODO LIST: Backend Integration

### ✅ 6. Blockchain Service Layer

**What to Build:**
- Python/FastAPI service to interact with smart contracts
- Event listener for on-chain events
- Transaction signing and submission
- Contract state caching

**Implementation Steps:**
```python
# File: backend/services/blockchain_service.py

1. Install dependencies:
   - web3.py (Ethereum interaction)
   - eth-account (wallet management)
   - python-dotenv (environment variables)

2. Create BlockchainService class:
   - __init__(rpc_url, contract_addresses)
   - Load contract ABIs
   - Initialize Web3 provider

3. Implement contract interaction methods:
   - create_proposal(proposer, proposal_type, metadata_hash)
   - cast_vote(proposal_id, voter, support)
   - execute_proposal(proposal_id)
   - get_proposal(proposal_id) -> Proposal

4. Add event listener:
   - listen_to_events(event_name, callback)
   - Store events in MongoDB for quick access
   - Handle blockchain reorganizations

5. Implement caching:
   - Cache proposal states in Redis
   - Invalidate cache on state changes
   - Reduce RPC calls
```

**Acceptance Criteria:**
- ✓ All contract interactions are error-handled
- ✓ Events are stored in database within 1 block
- ✓ Cache is always consistent with blockchain
- ✓ Failed transactions are retried with exponential backoff

---

### ✅ 7. Database Schema for Governance

**What to Build:**
- MongoDB collections for off-chain governance data
- Indexes for fast queries
- Data validation schemas

**Implementation Steps:**
```javascript
// MongoDB Collections

1. proposals collection:
   {
     _id: ObjectId,
     proposalId: Number (on-chain ID),
     proposer: String (address),
     proposalType: String,
     state: String,
     title: String,
     description: String,
     metadataHash: String (IPFS),
     startBlock: Number,
     endBlock: Number,
     forVotes: String (BigNumber),
     againstVotes: String,
     abstainVotes: String,
     createdAt: Date,
     updatedAt: Date
   }
   Indexes: proposalId, proposer, state, createdAt

2. votes collection:
   {
     _id: ObjectId,
     proposalId: Number,
     voter: String (address),
     support: Number (0=against, 1=for, 2=abstain),
     weight: String (BigNumber),
     reason: String (optional),
     transactionHash: String,
     blockNumber: Number,
     timestamp: Date
   }
   Indexes: proposalId, voter, timestamp

3. roles collection:
   {
     _id: ObjectId,
     address: String,
     role: String,
     grantedBy: String (address),
     grantedAt: Date,
     expiresAt: Date (null if permanent),
     isActive: Boolean
   }
   Indexes: address, role, isActive

4. governance_events collection:
   {
     _id: ObjectId,
     eventName: String,
     proposalId: Number (if applicable),
     transactionHash: String,
     blockNumber: Number,
     data: Object (event-specific data),
     timestamp: Date
   }
   Indexes: eventName, proposalId, blockNumber
```

**Acceptance Criteria:**
- ✓ All on-chain data is mirrored off-chain
- ✓ Queries are fast (<100ms for common queries)
- ✓ Data is validated before insertion
- ✓ Indexes cover all common query patterns

---

## 🎨 TODO LIST: Frontend Integration

### ✅ 8. Update Frontend Components

**What to Build:**
- Connect existing UI to smart contracts
- Add wallet integration (MetaMask, WalletConnect)
- Real-time updates via WebSocket
- Transaction status tracking

**Implementation Steps:**
```javascript
// File: frontend/src/services/web3Service.js

1. Install dependencies:
   - ethers.js (v6)
   - wagmi (React hooks for Ethereum)
   - viem (lightweight alternative)

2. Create Web3Provider component:
   - Wrap app with WagmiConfig
   - Configure supported chains
   - Add wallet connectors (MetaMask, WalletConnect, Coinbase)

3. Update ProposalsList component:
   - Fetch proposals from backend API
   - Display real-time vote counts
   - Add "Create Proposal" button (for DELEGATE_ROLE)
   - Show proposal state with visual indicators

4. Create VoteButton component:
   - Check if user has voted
   - Display vote options (For, Against, Abstain)
   - Show transaction confirmation dialog
   - Handle transaction status (pending, success, error)

5. Update GovernanceDashboard:
   - Show user's role badges
   - Display active proposals count
   - Show treasury balance
   - Add governance statistics

6. Add TransactionMonitor component:
   - Track pending transactions
   - Show toast notifications on success/failure
   - Provide transaction hash link to block explorer
```

**Files to Update:**
- `frontend/src/components/ProposalsList.jsx`
- `frontend/src/components/GovernanceDashboard.jsx`
- `frontend/src/components/Header.jsx` (add role badges)
- `frontend/src/services/web3Service.js` (new file)
- `frontend/src/hooks/useGovernance.js` (new file)

**Acceptance Criteria:**
- ✓ Users can connect wallet in <3 clicks
- ✓ Proposals load in <2 seconds
- ✓ Vote transactions show clear status
- ✓ Real-time updates without page refresh

---

## 🧪 TODO LIST: Testing

### ✅ 9. Smart Contract Tests

**What to Build:**
- Comprehensive test suite for all contracts
- Edge case testing
- Gas optimization tests
- Upgrade testing

**Implementation Steps:**
```javascript
// File: contracts/test/GovernanceCore.test.js (using Hardhat)

1. Setup test environment:
   - Deploy all contracts
   - Create test accounts (proposer, voter, admin, auditor)
   - Mint test tokens

2. Test proposal lifecycle:
   - Create proposal
   - Activate proposal
   - Cast votes
   - Queue proposal
   - Execute proposal
   - Verify state transitions

3. Test access control:
   - Verify only DELEGATE can create proposals
   - Verify only ADMINISTRATOR can execute
   - Verify AUDITOR cannot execute
   - Test role assignment/revocation

4. Test edge cases:
   - Proposal with 0 votes
   - Proposal that fails quorum
   - Execution before timelock
   - Double voting attempt
   - Reentrancy attack

5. Test emergency functions:
   - Pause contract
   - Attempt actions while paused
   - Unpause contract
   - Emergency proposal fast-track

6. Gas optimization tests:
   - Measure gas for each function
   - Optimize high-gas functions
   - Target: <500k gas per transaction
```

**Acceptance Criteria:**
- ✓ 100% code coverage
- ✓ All edge cases tested
- ✓ No security vulnerabilities
- ✓ Gas costs are optimized

---

## 📊 Success Metrics

- **Security**: 0 critical vulnerabilities in audit
- **Performance**: <2 second proposal load time
- **Usability**: 90%+ user task completion rate
- **Reliability**: 99.9% uptime
- **Transparency**: 100% of actions logged on-chain

---

## 🚀 Deployment Checklist

- [ ] Deploy contracts to testnet (Sepolia/Mumbai)
- [ ] Run full test suite
- [ ] Conduct internal security review
- [ ] Deploy to mainnet
- [ ] Verify contracts on Etherscan
- [ ] Initialize governance parameters
- [ ] Assign initial roles
- [ ] Transfer ownership to governance

---

**Next Phase**: [PHASE 2: Identity & Citizen Management](./PHASE2_IDENTITY_MANAGEMENT.md)
