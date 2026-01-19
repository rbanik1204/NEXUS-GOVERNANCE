import { ethers } from 'ethers';

// Contract addresses from deployment
const CONTRACTS = {
    GOVERNANCE_CORE: process.env.REACT_APP_GOVERNANCE_CONTRACT || '0xd9145CCE52D386f254917e481eB44e9943F39138',
    PROPOSAL_MANAGER: process.env.REACT_APP_PROPOSAL_CONTRACT || '0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8',
    EXECUTION_MODULE: process.env.REACT_APP_EXECUTION_CONTRACT || '0xf8e81D47203A594245E36C48e151709F0C19fBe8',
    DID_REGISTRY: process.env.REACT_APP_DID_REGISTRY || '0xDA0bab807633f07f013f94DD0E6A4F96F8742B53',
    CITIZEN_REGISTRY: process.env.REACT_APP_CITIZEN_REGISTRY || '0x7EF2e0048f5bAeDe046f6BF797943daF4ED8CB47',
    VOTING_ENGINE: process.env.REACT_APP_VOTING_ENGINE || '0xd2a5bC10698FD955D1Fe6cb468a17809A08fd005',
    TREASURY_MANAGER: process.env.REACT_APP_TREASURY_MANAGER || '0x9D7f74d0C41E726EC95884E0e97Fa6129e3b5E99',
    COMPLIANCE_ENGINE: process.env.REACT_APP_COMPLIANCE_ENGINE || '0x358AA13c52544ECCEF6B0ADD0f801012ADAD5eE3',
    LEGAL_REGISTRY: process.env.REACT_APP_LEGAL_REGISTRY || '0xddaAd340b0f1Ef65169Ae5E41A8b10776a75482d',
};

const FALLBACK_RPCS = [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://rpc.ankr.com/eth_sepolia',
    'https://1rpc.io/sepolia',
    'https://sepolia.gateway.tenderly.co'
];

// Simplified ABIs (only the functions we need)
const GOVERNANCE_CORE_ABI = [
    'function getGovernanceParams() view returns (uint256 votingPeriod, uint256 executionDelay, uint256 quorumPercentage, uint256 proposalThreshold)',
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function DELEGATE_ROLE() view returns (bytes32)',
    'function ADMINISTRATOR_ROLE() view returns (bytes32)',
    'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description)',
];

const PROPOSAL_MANAGER_ABI = [
    'function getProposalCount() view returns (uint256)',
    'function proposals(uint256) view returns (uint256 id, address proposer, string description, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 startTime, uint256 endTime, uint8 status)',
    'function createProposal(string description, uint8 proposalType) returns (uint256)',
    'function castVote(uint256 proposalId, uint8 support)',
    'event ProposalCreated(uint256 indexed proposalId, address indexed proposer)',
    'event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight)',
];

const TREASURY_MANAGER_ABI = [
    'function getBalance(address token) view returns (uint256)',
    'function budgetCount() view returns (uint256)',
    'function transactionCount() view returns (uint256)',
    'event Deposit(address indexed token, address indexed from, uint256 amount, uint256 timestamp)',
];

const CITIZEN_REGISTRY_ABI = [
    'function getTotalCitizens() view returns (uint256)',
    'function isCitizen(address wallet) view returns (bool)',
    'function getEffectiveVotingPower(address wallet) view returns (uint256)',
];

class Web3Service {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contracts = {};
        this.fallbackProvider = null;
        this.currentRpcIndex = 0;
        this.chainId = parseInt(process.env.REACT_APP_CHAIN_ID || '11155111'); // Sepolia
    }

    async initialize() {
        // Initialize fallback provider first (Read-only redundancy)
        await this.initFallbackProvider();

        if (typeof window.ethereum !== 'undefined') {
            this.provider = new ethers.BrowserProvider(window.ethereum);
            try {
                await this.checkNetwork();
                return true;
            } catch (e) {
                console.warn('Metamask connected but network incorrect. Using fallback for read-only.');
            }
        }
        return !!this.fallbackProvider;
    }

    async initFallbackProvider() {
        for (let i = 0; i < FALLBACK_RPCS.length; i++) {
            try {
                const p = new ethers.JsonRpcProvider(FALLBACK_RPCS[this.currentRpcIndex]);
                await p.getNetwork();
                this.fallbackProvider = p;
                console.log(`Connected to fallback RPC: ${FALLBACK_RPCS[this.currentRpcIndex]}`);
                return;
            } catch (e) {
                console.warn(`RPC ${FALLBACK_RPCS[this.currentRpcIndex]} failed, trying next...`);
                this.currentRpcIndex = (this.currentRpcIndex + 1) % FALLBACK_RPCS.length;
            }
        }
    }

    async getReadProvider() {
        // Prefer Metamask if on correct network, otherwise fallback
        if (this.provider) {
            try {
                const network = await this.provider.getNetwork();
                if (Number(network.chainId) === this.chainId) return this.provider;
            } catch (e) { }
        }

        if (!this.fallbackProvider) await this.initFallbackProvider();
        return this.fallbackProvider;
    }

    async getContract(address, abi, withSigner = false) {
        const provider = await this.getReadProvider();
        if (withSigner && this.signer) {
            return new ethers.Contract(address, abi, this.signer);
        }
        return new ethers.Contract(address, abi, provider);
    }

    async checkNetwork() {
        const network = await this.provider.getNetwork();
        if (Number(network.chainId) !== this.chainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${this.chainId.toString(16)}` }],
                });
            } catch (error) {
                console.error('Failed to switch network:', error);
                throw new Error('Please switch to Sepolia network');
            }
        }
    }

    async connectWallet() {
        if (!this.provider) {
            await this.initialize();
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.signer = await this.provider.getSigner();
        return accounts[0];
    }

    // Governance functions
    async getGovernanceParams() {
        try {
            const contract = await this.getContract(CONTRACTS.GOVERNANCE_CORE, GOVERNANCE_CORE_ABI);
            const params = await contract.getGovernanceParams();
            return {
                votingPeriod: Number(params.votingPeriod),
                executionDelay: Number(params.executionDelay),
                quorumPercentage: Number(params.quorumPercentage) / 100, // Convert from basis points
                proposalThreshold: ethers.formatEther(params.proposalThreshold),
            };
        } catch (error) {
            console.error('Error getting governance params:', error);
            return null;
        }
    }

    async hasRole(role, address) {
        try {
            const contract = await this.getContract(CONTRACTS.GOVERNANCE_CORE, GOVERNANCE_CORE_ABI);
            return await contract.hasRole(role, address);
        } catch (error) {
            console.error('Error checking role:', error);
            return false;
        }
    }

    // Proposal functions
    async getProposalCount() {
        try {
            const contract = await this.getContract(CONTRACTS.PROPOSAL_MANAGER, PROPOSAL_MANAGER_ABI);
            const count = await contract.getProposalCount();
            return Number(count);
        } catch (error) {
            console.error('Error getting proposal count:', error);
            return 0;
        }
    }

    async getProposal(proposalId) {
        try {
            const contract = await this.getContract(CONTRACTS.PROPOSAL_MANAGER, PROPOSAL_MANAGER_ABI);
            const proposal = await contract.proposals(proposalId);
            return {
                id: Number(proposal.id),
                proposer: proposal.proposer,
                description: proposal.description,
                forVotes: Number(proposal.forVotes),
                againstVotes: Number(proposal.againstVotes),
                abstainVotes: Number(proposal.abstainVotes),
                startTime: Number(proposal.startTime),
                endTime: Number(proposal.endTime),
                status: Number(proposal.status),
            };
        } catch (error) {
            console.error('Error getting proposal:', error);
            return null;
        }
    }

    async createProposal(description, proposalType = 0) {
        try {
            const contract = await this.getContract(CONTRACTS.PROPOSAL_MANAGER, PROPOSAL_MANAGER_ABI, true);
            const tx = await contract.createProposal(description, proposalType);
            const receipt = await tx.wait();
            return receipt;
        } catch (error) {
            console.error('Error creating proposal:', error);
            throw error;
        }
    }

    async castVote(proposalId, support) {
        try {
            const contract = await this.getContract(CONTRACTS.PROPOSAL_MANAGER, PROPOSAL_MANAGER_ABI, true);
            const tx = await contract.castVote(proposalId, support);
            const receipt = await tx.wait();
            return receipt;
        } catch (error) {
            console.error('Error casting vote:', error);
            throw error;
        }
    }

    // Treasury functions
    async getTreasuryBalance(tokenAddress = ethers.ZeroAddress) {
        try {
            const contract = await this.getContract(CONTRACTS.TREASURY_MANAGER, TREASURY_MANAGER_ABI);
            const balance = await contract.getBalance(tokenAddress);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Error getting treasury balance:', error);
            return '0';
        }
    }

    async getBudgetCount() {
        try {
            const contract = await this.getContract(CONTRACTS.TREASURY_MANAGER, TREASURY_MANAGER_ABI);
            const count = await contract.budgetCount();
            return Number(count);
        } catch (error) {
            console.error('Error getting budget count:', error);
            return 0;
        }
    }

    // Citizen functions
    async getTotalCitizens() {
        try {
            const contract = await this.getContract(CONTRACTS.CITIZEN_REGISTRY, CITIZEN_REGISTRY_ABI);
            const count = await contract.getTotalCitizens();
            return Number(count);
        } catch (error) {
            console.error('Error getting total citizens:', error);
            return 0;
        }
    }

    async isCitizen(address) {
        try {
            const contract = await this.getContract(CONTRACTS.CITIZEN_REGISTRY, CITIZEN_REGISTRY_ABI);
            return await contract.isCitizen(address);
        } catch (error) {
            console.error('Error checking citizen status:', error);
            return false;
        }
    }

    async getVotingPower(address) {
        try {
            const contract = await this.getContract(CONTRACTS.CITIZEN_REGISTRY, CITIZEN_REGISTRY_ABI);
            const power = await contract.getEffectiveVotingPower(address);
            return Number(power);
        } catch (error) {
            console.error('Error getting voting power:', error);
            return 0;
        }
    }

    // Utility functions
    getContractAddresses() {
        return CONTRACTS;
    }

    formatAddress(address) {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    async getBlockTimestamp() {
        const provider = await this.getReadProvider();
        const block = await provider.getBlock('latest');
        return block.timestamp;
    }
}

export default new Web3Service();
