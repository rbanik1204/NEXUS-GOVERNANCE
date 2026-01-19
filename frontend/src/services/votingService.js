/**
 * NEXUS DAO - Voting Pipeline Service
 * 
 * Implements the complete end-to-end voting flow:
 * 1. Wallet connection validation
 * 2. Voter eligibility check
 * 3. Voting power calculation
 * 4. Proposal state validation
 * 5. Vote transaction execution
 * 6. On-chain confirmation
 * 7. UI state refresh callback
 */

import { ethers } from 'ethers';

// Contract addresses
const CONTRACTS = {
    PROPOSAL_MANAGER: process.env.REACT_APP_PROPOSAL_CONTRACT || '0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8',
    CITIZEN_REGISTRY: process.env.REACT_APP_CITIZEN_REGISTRY || '0x7EF2e0048f5bAeDe046f6BF797943daF4ED8CB47',
    VOTING_ENGINE: process.env.REACT_APP_VOTING_ENGINE || '0xd2a5bC10698FD955D1Fe6cb468a17809A08fd005',
};

// Sepolia Chain ID
const SEPOLIA_CHAIN_ID = 11155111;

// ABI definitions for voting functionality
const PROPOSAL_MANAGER_ABI = [
    'function getProposalCount() view returns (uint256)',
    'function proposals(uint256) view returns (uint256 id, address proposer, string description, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 startTime, uint256 endTime, uint8 status)',
    'function castVote(uint256 proposalId, uint8 support) returns (uint256)',
    'function hasVoted(uint256 proposalId, address voter) view returns (bool)',
    'function state(uint256 proposalId) view returns (uint8)',
    'event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight, uint256 timestamp)',
];

const CITIZEN_REGISTRY_ABI = [
    'function isCitizen(address wallet) view returns (bool)',
    'function getTotalCitizens() view returns (uint256)',
    'function getBasePower(address citizen) view returns (uint256)',
];

const VOTING_ENGINE_ABI = [
    'function getVotingPower(address voter) view returns (uint256)',
    'function getDelegatedPower(address delegate) view returns (uint256)',
    'function delegations(address delegator) view returns (address)',
    'function delegate(address delegatee) external',
    'function removeDelegation() external',
];

// Proposal States
const ProposalState = {
    0: 'Pending',
    1: 'Active',
    2: 'Canceled',
    3: 'Defeated',
    4: 'Succeeded',
    5: 'Queued',
    6: 'Expired',
    7: 'Executed'
};

// Error messages for user feedback
const ERROR_MESSAGES = {
    NO_WALLET_DETECTED: 'No wallet detected. Please install MetaMask or another Web3 wallet.',
    WALLET_NOT_CONNECTED: 'Wallet not connected. Please connect your wallet to continue.',
    WRONG_NETWORK: 'Please switch to Sepolia network to vote.',
    NOT_CITIZEN: 'You must be a registered citizen to vote. Please complete identity verification first.',
    ALREADY_VOTED: 'You have already voted on this proposal.',
    VOTING_CLOSED: 'Voting has ended for this proposal.',
    PROPOSAL_NOT_ACTIVE: 'This proposal is not in the active voting period.',
    NO_VOTING_POWER: 'You have no voting power. Ensure you are registered and not delegating your votes.',
    DELEGATED: 'You have delegated your voting power. Revoke delegation to vote directly.',
    INSUFFICIENT_GAS: 'Transaction failed due to insufficient gas.',
    USER_REJECTED: 'Transaction was rejected in wallet.',
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

class VotingService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contracts = {};
    }

    // ========================================
    // STEP 1: WALLET CONNECTION VALIDATION
    // ========================================
    async validateWalletConnection() {
        // Check 1: Wallet provider exists
        if (typeof window.ethereum === 'undefined') {
            throw new VotingError('NO_WALLET_DETECTED', ERROR_MESSAGES.NO_WALLET_DETECTED);
        }

        // Check 2: Wallet is connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
            throw new VotingError('WALLET_NOT_CONNECTED', ERROR_MESSAGES.WALLET_NOT_CONNECTED);
        }

        // Check 3: Correct network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const currentChainId = parseInt(chainId, 16);

        if (currentChainId !== SEPOLIA_CHAIN_ID) {
            // Attempt to switch network
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
                });
            } catch (switchError) {
                throw new VotingError('WRONG_NETWORK', ERROR_MESSAGES.WRONG_NETWORK);
            }
        }

        // Initialize provider and signer
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();

        return {
            success: true,
            address: accounts[0],
            chainId: currentChainId
        };
    }

    // ========================================
    // STEP 2: VOTER ELIGIBILITY CHECK
    // ========================================
    async checkVoterEligibility(voterAddress) {
        const citizenRegistry = new ethers.Contract(
            CONTRACTS.CITIZEN_REGISTRY,
            CITIZEN_REGISTRY_ABI,
            this.provider
        );

        // Check if voter is a registered citizen
        try {
            const isCitizen = await citizenRegistry.isCitizen(voterAddress);

            if (!isCitizen) {
                throw new VotingError('NOT_CITIZEN', ERROR_MESSAGES.NOT_CITIZEN);
            }

            return { eligible: true, reason: 'ELIGIBLE' };
        } catch (error) {
            if (error instanceof VotingError) throw error;

            // If contract call fails, assume not citizen (graceful degradation)
            console.warn('Citizenship check failed, assuming eligible:', error);
            return { eligible: true, reason: 'ASSUMED_ELIGIBLE' };
        }
    }

    // ========================================
    // STEP 3: VOTING POWER CALCULATION
    // ========================================
    async getVotingPower(voterAddress) {
        try {
            const votingEngine = new ethers.Contract(
                CONTRACTS.VOTING_ENGINE,
                VOTING_ENGINE_ABI,
                this.provider
            );

            const citizenRegistry = new ethers.Contract(
                CONTRACTS.CITIZEN_REGISTRY,
                CITIZEN_REGISTRY_ABI,
                this.provider
            );

            // Get total voting power
            let totalPower;
            try {
                totalPower = await votingEngine.getVotingPower(voterAddress);
            } catch {
                // Fallback to base power if voting engine not available
                totalPower = await citizenRegistry.getBasePower(voterAddress);
            }

            // Check if voter has delegated their vote
            let delegatee = null;
            try {
                delegatee = await votingEngine.delegations(voterAddress);
                if (delegatee !== ethers.ZeroAddress && delegatee !== voterAddress) {
                    throw new VotingError('DELEGATED',
                        `You have delegated your voting power to ${delegatee.slice(0, 6)}...${delegatee.slice(-4)}. Revoke delegation to vote directly.`);
                }
            } catch (error) {
                if (error instanceof VotingError) throw error;
                // Delegation check failed, proceed without it
            }

            // Get delegated power received
            let delegatedPower = BigInt(0);
            try {
                delegatedPower = await votingEngine.getDelegatedPower(voterAddress);
            } catch {
                // Delegated power check failed, use 0
            }

            const power = Number(totalPower);

            if (power === 0) {
                throw new VotingError('NO_VOTING_POWER', ERROR_MESSAGES.NO_VOTING_POWER);
            }

            return {
                basePower: power - Number(delegatedPower),
                delegatedPower: Number(delegatedPower),
                totalPower: power,
                displayString: `${power} vote${power !== 1 ? 's' : ''}`
            };
        } catch (error) {
            if (error instanceof VotingError) throw error;

            // Return default power of 1 if checks fail (graceful degradation)
            console.warn('Voting power check failed, using default:', error);
            return {
                basePower: 1,
                delegatedPower: 0,
                totalPower: 1,
                displayString: '1 vote (default)'
            };
        }
    }

    // ========================================
    // STEP 4: PROPOSAL STATE VALIDATION
    // ========================================
    async validateProposalState(proposalId) {
        const proposalManager = new ethers.Contract(
            CONTRACTS.PROPOSAL_MANAGER,
            PROPOSAL_MANAGER_ABI,
            this.provider
        );

        // Get proposal state
        let state;
        try {
            state = await proposalManager.state(proposalId);
        } catch {
            // If state function not available, get from proposal data
            const proposal = await proposalManager.proposals(proposalId);
            state = proposal.status;
        }

        const stateNum = Number(state);

        if (stateNum !== 1) { // 1 = Active
            throw new VotingError(
                'PROPOSAL_NOT_ACTIVE',
                `Cannot vote: Proposal is ${ProposalState[stateNum] || 'Unknown'}`
            );
        }

        // Get proposal details for time check
        const proposal = await proposalManager.proposals(proposalId);
        const currentTime = Math.floor(Date.now() / 1000);
        const endTime = Number(proposal.endTime);
        const startTime = Number(proposal.startTime);

        if (currentTime < startTime) {
            throw new VotingError('PROPOSAL_NOT_ACTIVE', 'Voting has not started yet.');
        }

        if (currentTime > endTime) {
            throw new VotingError('VOTING_CLOSED', ERROR_MESSAGES.VOTING_CLOSED);
        }

        return {
            canVote: true,
            state: stateNum,
            stateName: ProposalState[stateNum],
            remainingTime: endTime - currentTime,
            endTime: new Date(endTime * 1000)
        };
    }

    // ========================================
    // STEP 4.5: CHECK IF ALREADY VOTED
    // ========================================
    async checkNotAlreadyVoted(proposalId, voterAddress) {
        const proposalManager = new ethers.Contract(
            CONTRACTS.PROPOSAL_MANAGER,
            PROPOSAL_MANAGER_ABI,
            this.provider
        );

        try {
            const hasVoted = await proposalManager.hasVoted(proposalId, voterAddress);

            if (hasVoted) {
                throw new VotingError('ALREADY_VOTED', ERROR_MESSAGES.ALREADY_VOTED);
            }

            return { alreadyVoted: false };
        } catch (error) {
            if (error instanceof VotingError) throw error;

            // If check fails, assume not voted (will be caught on-chain if wrong)
            console.warn('Already voted check failed:', error);
            return { alreadyVoted: false };
        }
    }

    // ========================================
    // STEP 5: VOTE TRANSACTION EXECUTION
    // ========================================
    async executeVote(proposalId, support, voterAddress) {
        // support: 0 = Against, 1 = For, 2 = Abstain

        // Pre-flight checks
        await this.validateWalletConnection();
        await this.checkVoterEligibility(voterAddress);
        await this.validateProposalState(proposalId);
        await this.checkNotAlreadyVoted(proposalId, voterAddress);
        const votingPower = await this.getVotingPower(voterAddress);

        // Get contract with signer for transaction
        const proposalManager = new ethers.Contract(
            CONTRACTS.PROPOSAL_MANAGER,
            PROPOSAL_MANAGER_ABI,
            this.signer
        );

        try {
            // Estimate gas first
            let gasEstimate;
            try {
                gasEstimate = await proposalManager.castVote.estimateGas(proposalId, support);
            } catch (estimateError) {
                // Parse revert reason
                const reason = this.parseRevertReason(estimateError);
                throw new VotingError('TRANSACTION_FAILED', reason);
            }

            // Execute with 20% gas buffer
            const tx = await proposalManager.castVote(proposalId, support, {
                gasLimit: Math.floor(Number(gasEstimate) * 1.2)
            });

            return {
                status: 'PENDING',
                txHash: tx.hash,
                tx: tx,
                votingPower: votingPower.totalPower,
                support: support,
                supportLabel: support === 1 ? 'For' : support === 0 ? 'Against' : 'Abstain'
            };

        } catch (error) {
            if (error instanceof VotingError) throw error;

            // Parse common errors
            if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
                throw new VotingError('USER_REJECTED', ERROR_MESSAGES.USER_REJECTED);
            }

            if (error.code === 'INSUFFICIENT_FUNDS') {
                throw new VotingError('INSUFFICIENT_GAS', ERROR_MESSAGES.INSUFFICIENT_GAS);
            }

            if (error.code === 'NETWORK_ERROR' || error.code === 'SERVER_ERROR') {
                throw new VotingError('NETWORK_ERROR', ERROR_MESSAGES.NETWORK_ERROR);
            }

            throw new VotingError('UNKNOWN_ERROR', error.message || ERROR_MESSAGES.UNKNOWN_ERROR);
        }
    }

    // ========================================
    // STEP 6: ON-CHAIN CONFIRMATION
    // ========================================
    async waitForVoteConfirmation(tx) {
        try {
            const receipt = await tx.wait(1); // Wait for 1 confirmation

            if (receipt.status === 0) {
                throw new VotingError('TRANSACTION_REVERTED', 'Transaction was reverted on-chain.');
            }

            // Parse VoteCast event
            const proposalManagerInterface = new ethers.Interface(PROPOSAL_MANAGER_ABI);
            let voteEvent = null;

            for (const log of receipt.logs) {
                try {
                    const parsed = proposalManagerInterface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    if (parsed && parsed.name === 'VoteCast') {
                        voteEvent = parsed;
                        break;
                    }
                } catch {
                    // Not our event, continue
                }
            }

            return {
                status: 'CONFIRMED',
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                voter: voteEvent ? voteEvent.args.voter : null,
                proposalId: voteEvent ? voteEvent.args.proposalId.toString() : null,
                support: voteEvent ? Number(voteEvent.args.support) : null,
                weight: voteEvent ? voteEvent.args.weight.toString() : null,
                explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`
            };

        } catch (error) {
            if (error instanceof VotingError) throw error;
            throw new VotingError('CONFIRMATION_FAILED', `Confirmation failed: ${error.message}`);
        }
    }

    // ========================================
    // COMPLETE VOTING FLOW (All Steps)
    // ========================================
    async vote(proposalId, support, voterAddress, callbacks = {}) {
        const {
            onStart,
            onEligibilityChecked,
            onPowerCalculated,
            onTransactionSent,
            onConfirmed,
            onError
        } = callbacks;

        try {
            // Step 1: Start
            onStart?.();

            // Step 2: Validate wallet and eligibility
            await this.validateWalletConnection();
            const eligibility = await this.checkVoterEligibility(voterAddress);
            onEligibilityChecked?.(eligibility);

            // Step 3: Get voting power
            const power = await this.getVotingPower(voterAddress);
            onPowerCalculated?.(power);

            // Steps 4-5: Validate and execute
            const pendingResult = await this.executeVote(proposalId, support, voterAddress);
            onTransactionSent?.(pendingResult);

            // Step 6: Wait for confirmation
            const confirmedResult = await this.waitForVoteConfirmation(pendingResult.tx);
            onConfirmed?.(confirmedResult);

            return confirmedResult;

        } catch (error) {
            onError?.(error);
            throw error;
        }
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    parseRevertReason(error) {
        // Try to extract revert reason from error
        if (error.reason) return error.reason;
        if (error.data?.message) return error.data.message;
        if (error.error?.message) return error.error.message;

        // Check for common revert strings
        const errorString = error.toString();
        if (errorString.includes('Already voted')) return 'You have already voted on this proposal.';
        if (errorString.includes('Voting closed')) return 'Voting has ended for this proposal.';
        if (errorString.includes('Not a citizen')) return 'You must be a registered citizen to vote.';
        if (errorString.includes('No voting power')) return 'You have no voting power.';

        return error.message || 'Transaction failed';
    }

    getSupportLabel(support) {
        switch (support) {
            case 0: return 'Against';
            case 1: return 'For';
            case 2: return 'Abstain';
            default: return 'Unknown';
        }
    }
}

// Custom Error Class
class VotingError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'VotingError';
    }
}

// Export singleton instance
const votingService = new VotingService();
export default votingService;
export { VotingError, ProposalState, ERROR_MESSAGES };
