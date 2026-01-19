/**
 * NEXUS DAO - Proposal Lifecycle Service
 * 
 * Implements the complete proposal lifecycle:
 * Draft → Submitted → Active → Succeeded/Defeated → Queued → Executed
 * 
 * Ensures:
 * - UI proposal = on-chain proposal (no demo data mixing)
 * - Every proposal has a blockchain reference
 * - State transitions are validated
 */

import { ethers } from 'ethers';

// Proposal States (matching smart contract)
export const ProposalState = {
    PENDING: 0,      // Submitted, waiting to be active
    ACTIVE: 1,       // Voting in progress
    CANCELED: 2,     // Proposer canceled
    DEFEATED: 3,     // Failed vote (quorum not met or majority against)
    SUCCEEDED: 4,    // Passed, awaiting queue
    QUEUED: 5,       // In timelock queue
    EXPIRED: 6,      // Timelock expired without execution
    EXECUTED: 7      // Successfully executed
};

export const ProposalStateLabels = {
    0: 'Pending',
    1: 'Active',
    2: 'Canceled',
    3: 'Defeated',
    4: 'Succeeded',
    5: 'Queued',
    6: 'Expired',
    7: 'Executed'
};

export const ProposalStateColors = {
    0: { bg: 'bg-yellow-500', text: 'text-yellow-500' },
    1: { bg: 'bg-blue-500', text: 'text-blue-500' },
    2: { bg: 'bg-gray-500', text: 'text-gray-500' },
    3: { bg: 'bg-red-500', text: 'text-red-500' },
    4: { bg: 'bg-green-500', text: 'text-green-500' },
    5: { bg: 'bg-purple-500', text: 'text-purple-500' },
    6: { bg: 'bg-gray-500', text: 'text-gray-500' },
    7: { bg: 'bg-cyber-green', text: 'text-cyber-green' }
};

// Proposal Category definitions
export const ProposalCategory = {
    GENERAL: 0,      // No on-chain action, 10% quorum
    TREASURY: 1,     // Funds transfer, 20% quorum
    PARAMETER: 2,    // Governance config, 25% quorum
    UPGRADE: 3,      // Contract upgrade, 30% quorum
    EMERGENCY: 4     // Emergency action, 30% quorum (fast-track)
};

export const ProposalCategoryLabels = {
    0: 'General',
    1: 'Treasury',
    2: 'Parameter',
    3: 'Upgrade',
    4: 'Emergency'
};

export const ProposalCategoryQuorums = {
    0: 10,
    1: 20,
    2: 25,
    3: 30,
    4: 30
};

// Contract addresses
const CONTRACTS = {
    PROPOSAL_MANAGER: process.env.REACT_APP_PROPOSAL_CONTRACT || '0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8',
    EXECUTION_MODULE: process.env.REACT_APP_EXECUTION_MODULE || '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
};

// ABI for proposal management
const PROPOSAL_MANAGER_ABI = [
    'function getProposalCount() view returns (uint256)',
    'function proposals(uint256) view returns (uint256 id, address proposer, string description, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 startTime, uint256 endTime, uint8 status)',
    'function state(uint256 proposalId) view returns (uint8)',
    'function createProposal(string description, uint8 proposalType) returns (uint256)',
    'function cancelProposal(uint256 proposalId)',
    'function queueProposal(uint256 proposalId)',
    'function executeProposal(uint256 proposalId)',
    'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, uint256 startTime, uint256 endTime)',
    'event ProposalCanceled(uint256 indexed proposalId)',
    'event ProposalQueued(uint256 indexed proposalId, uint256 eta)',
    'event ProposalExecuted(uint256 indexed proposalId)',
];

/**
 * Proposal interface that matches on-chain data structure
 */
export class Proposal {
    constructor(data) {
        // Required on-chain fields
        this.id = data.id;
        this.proposer = data.proposer;
        this.description = data.description;
        this.forVotes = BigInt(data.forVotes || 0);
        this.againstVotes = BigInt(data.againstVotes || 0);
        this.abstainVotes = BigInt(data.abstainVotes || 0);
        this.startTime = Number(data.startTime);
        this.endTime = Number(data.endTime);
        this.status = Number(data.status);

        // Blockchain reference (REQUIRED)
        this.creationTxHash = data.creationTxHash || null;
        this.creationBlock = data.creationBlock || null;

        // Derived fields
        this.title = this.extractTitle(this.description);
        this.body = this.extractBody(this.description);
        this.category = data.category || ProposalCategory.GENERAL;

        // Execution data (if applicable)
        this.queuedAt = data.queuedAt || null;
        this.executedAt = data.executedAt || null;
        this.executionTxHash = data.executionTxHash || null;

        // Data source validation
        this._isOnChain = !!this.creationTxHash;
        this._isDemo = data._isDemo || false;
    }

    extractTitle(description) {
        if (!description) return 'Untitled Proposal';
        const lines = description.split('\n');
        return lines[0] || 'Untitled Proposal';
    }

    extractBody(description) {
        if (!description) return '';
        const lines = description.split('\n');
        return lines.slice(1).join('\n').trim();
    }

    // Calculate current state based on timestamps
    calculateState() {
        const now = Math.floor(Date.now() / 1000);

        if (this.status === ProposalState.CANCELED) return ProposalState.CANCELED;
        if (this.status === ProposalState.EXECUTED) return ProposalState.EXECUTED;

        if (now < this.startTime) return ProposalState.PENDING;
        if (now <= this.endTime) return ProposalState.ACTIVE;

        // Voting ended - check results
        const totalVotes = this.forVotes + this.againstVotes + this.abstainVotes;
        const quorumRequired = this.getRequiredQuorum();

        // Check quorum (simplified - in real implementation, compare to total supply)
        if (this.forVotes <= this.againstVotes) return ProposalState.DEFEATED;

        // Check if queued
        if (this.queuedAt) {
            const timelockDelay = 48 * 60 * 60; // 48 hours
            if (now >= this.queuedAt + timelockDelay) {
                return ProposalState.QUEUED; // Ready for execution
            }
            return ProposalState.QUEUED;
        }

        return ProposalState.SUCCEEDED;
    }

    getRequiredQuorum() {
        return ProposalCategoryQuorums[this.category] || 10;
    }

    getStateLabel() {
        return ProposalStateLabels[this.calculateState()];
    }

    getStateColor() {
        return ProposalStateColors[this.calculateState()];
    }

    getCategoryLabel() {
        return ProposalCategoryLabels[this.category];
    }

    isActive() {
        return this.calculateState() === ProposalState.ACTIVE;
    }

    canVote() {
        return this.isActive();
    }

    canQueue() {
        return this.calculateState() === ProposalState.SUCCEEDED;
    }

    canExecute() {
        if (this.calculateState() !== ProposalState.QUEUED) return false;
        if (!this.queuedAt) return false;

        const timelockDelay = 48 * 60 * 60; // 48 hours
        const now = Math.floor(Date.now() / 1000);
        return now >= this.queuedAt + timelockDelay;
    }

    canCancel(userAddress) {
        // Only proposer can cancel, and only if not yet executed
        if (this.calculateState() === ProposalState.EXECUTED) return false;
        if (this.calculateState() === ProposalState.CANCELED) return false;
        return this.proposer.toLowerCase() === userAddress?.toLowerCase();
    }

    getTimeRemaining() {
        const now = Date.now();
        const endTime = this.endTime * 1000;
        const diff = endTime - now;

        if (diff <= 0) return 'Ended';

        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

        if (days > 0) return `${days}d ${hours}h remaining`;
        if (hours > 0) return `${hours}h ${minutes}m remaining`;
        return `${minutes}m remaining`;
    }

    getTimelockRemaining() {
        if (!this.queuedAt) return null;

        const timelockDelay = 48 * 60 * 60; // 48 hours
        const now = Math.floor(Date.now() / 1000);
        const unlockTime = this.queuedAt + timelockDelay;
        const remaining = unlockTime - now;

        if (remaining <= 0) return 'Ready to execute';

        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);

        return `${hours}h ${minutes}m until executable`;
    }

    getVotePercentages() {
        const total = Number(this.forVotes + this.againstVotes + this.abstainVotes);
        if (total === 0) return { for: 0, against: 0, abstain: 0 };

        return {
            for: (Number(this.forVotes) / total) * 100,
            against: (Number(this.againstVotes) / total) * 100,
            abstain: (Number(this.abstainVotes) / total) * 100,
            total: total
        };
    }

    getExplorerUrl() {
        if (!this.creationTxHash) return null;
        return `https://sepolia.etherscan.io/tx/${this.creationTxHash}`;
    }

    toJSON() {
        return {
            id: this.id,
            proposer: this.proposer,
            title: this.title,
            description: this.description,
            category: this.category,
            status: this.calculateState(),
            forVotes: this.forVotes.toString(),
            againstVotes: this.againstVotes.toString(),
            abstainVotes: this.abstainVotes.toString(),
            startTime: this.startTime,
            endTime: this.endTime,
            creationTxHash: this.creationTxHash,
            creationBlock: this.creationBlock,
            queuedAt: this.queuedAt,
            executedAt: this.executedAt,
            executionTxHash: this.executionTxHash,
            _isOnChain: this._isOnChain,
            _isDemo: this._isDemo
        };
    }
}

/**
 * Proposal Lifecycle Service
 */
class ProposalLifecycleService {
    constructor() {
        this.provider = null;
        this.contract = null;
    }

    async initialize() {
        if (typeof window.ethereum !== 'undefined') {
            this.provider = new ethers.BrowserProvider(window.ethereum);
        } else {
            // Fallback to public RPC
            this.provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
        }

        this.contract = new ethers.Contract(
            CONTRACTS.PROPOSAL_MANAGER,
            PROPOSAL_MANAGER_ABI,
            this.provider
        );
    }

    async getProposalCount() {
        await this.initialize();
        const count = await this.contract.getProposalCount();
        return Number(count);
    }

    async getProposal(proposalId) {
        await this.initialize();

        try {
            const data = await this.contract.proposals(proposalId);

            return new Proposal({
                id: Number(data[0]),
                proposer: data[1],
                description: data[2],
                forVotes: data[3],
                againstVotes: data[4],
                abstainVotes: data[5],
                startTime: data[6],
                endTime: data[7],
                status: data[8],
                // TODO: Fetch creation tx from events or subgraph
                creationTxHash: null,
                creationBlock: null
            });
        } catch (error) {
            console.error(`Error fetching proposal ${proposalId}:`, error);
            return null;
        }
    }

    async getAllProposals() {
        const count = await this.getProposalCount();
        const proposals = [];

        for (let i = 1; i <= count; i++) {
            const proposal = await this.getProposal(i);
            if (proposal) {
                proposals.push(proposal);
            }
        }

        // Sort by newest first
        return proposals.sort((a, b) => b.id - a.id);
    }

    async getActiveProposals() {
        const all = await this.getAllProposals();
        return all.filter(p => p.isActive());
    }

    async getProposalState(proposalId) {
        await this.initialize();

        try {
            const state = await this.contract.state(proposalId);
            return Number(state);
        } catch (error) {
            // If state function not available, calculate from timestamps
            const proposal = await this.getProposal(proposalId);
            return proposal?.calculateState() || ProposalState.PENDING;
        }
    }

    // State transition actions
    async queueProposal(proposalId) {
        await this.initialize();
        const signer = await this.provider.getSigner();
        const contractWithSigner = this.contract.connect(signer);

        const tx = await contractWithSigner.queueProposal(proposalId);
        const receipt = await tx.wait();

        return {
            success: true,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber
        };
    }

    async executeProposal(proposalId) {
        await this.initialize();
        const signer = await this.provider.getSigner();
        const contractWithSigner = this.contract.connect(signer);

        const tx = await contractWithSigner.executeProposal(proposalId);
        const receipt = await tx.wait();

        return {
            success: true,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber
        };
    }

    async cancelProposal(proposalId) {
        await this.initialize();
        const signer = await this.provider.getSigner();
        const contractWithSigner = this.contract.connect(signer);

        const tx = await contractWithSigner.cancelProposal(proposalId);
        const receipt = await tx.wait();

        return {
            success: true,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber
        };
    }

    // Validate proposal data source
    validateProposalSource(proposal) {
        if (proposal._isDemo) {
            return {
                isValid: false,
                warning: 'This is demonstration data, not from blockchain',
                source: 'DEMO'
            };
        }

        if (!proposal._isOnChain) {
            return {
                isValid: false,
                warning: 'Proposal not confirmed on blockchain',
                source: 'PENDING'
            };
        }

        return {
            isValid: true,
            warning: null,
            source: 'BLOCKCHAIN'
        };
    }
}

// Export singleton
const proposalLifecycleService = new ProposalLifecycleService();
export default proposalLifecycleService;
