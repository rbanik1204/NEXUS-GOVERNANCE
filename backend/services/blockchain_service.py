"""
Blockchain Service for Government-Grade DAO Platform

This service handles all interactions with the Ethereum blockchain:
- Contract deployment and interaction
- Event listening and processing
- Transaction management
- State synchronization
"""

from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
import json
import os
from typing import Dict, Any, Optional, List
from pathlib import Path
import asyncio
from datetime import datetime


class BlockchainService:
    """Service for interacting with governance smart contracts"""
    
    def __init__(
        self,
        rpc_url: str,
        governance_core_address: str,
        proposal_manager_address: str,
        private_key: Optional[str] = None
    ):
        """
        Initialize blockchain service
        
        Args:
            rpc_url: Ethereum RPC endpoint
            governance_core_address: Address of GovernanceCore contract
            proposal_manager_address: Address of ProposalManager contract
            private_key: Private key for signing transactions (optional)
        """
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        # Add PoA middleware for testnets
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        # Verify connection
        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to {rpc_url}")
        
        # Load contract ABIs
        self.governance_core_abi = self._load_abi("GovernanceCore")
        self.proposal_manager_abi = self._load_abi("ProposalManager")
        
        # Initialize contracts
        self.governance_core = self.w3.eth.contract(
            address=Web3.to_checksum_address(governance_core_address),
            abi=self.governance_core_abi
        )
        
        self.proposal_manager = self.w3.eth.contract(
            address=Web3.to_checksum_address(proposal_manager_address),
            abi=self.proposal_manager_abi
        )
        
        # Set up account if private key provided
        self.account = None
        if private_key:
            self.account = Account.from_key(private_key)
    
    def _load_abi(self, contract_name: str) -> List[Dict]:
        """Load contract ABI from artifacts"""
        # Try multiple possible paths
        possible_paths = [
            Path(f"../contracts/artifacts/contracts/governance/{contract_name}.sol/{contract_name}.json"),
            Path(f"./contracts/abi/{contract_name}.json"),
            Path(f"./abi/{contract_name}.json"),
        ]
        
        for path in possible_paths:
            if path.exists():
                with open(path, 'r') as f:
                    artifact = json.load(f)
                    return artifact.get('abi', artifact)
        
        raise FileNotFoundError(f"ABI for {contract_name} not found")
    
    # ============ Governance Parameters ============
    
    def get_governance_params(self) -> Dict[str, Any]:
        """Get current governance parameters"""
        params = self.governance_core.functions.getGovernanceParams().call()
        return {
            'voting_period': params[0],
            'execution_delay': params[1],
            'quorum_percentage': params[2],
            'proposal_threshold': params[3]
        }
    
    def get_proposal_count(self) -> int:
        """Get total number of proposals"""
        return self.governance_core.functions.getProposalCount().call()
    
    # ============ Proposal Management ============
    
    def get_proposal(self, proposal_id: int) -> Optional[Dict[str, Any]]:
        """
        Fetch proposal details from blockchain
        
        Args:
            proposal_id: ID of the proposal
            
        Returns:
            Proposal data dictionary or None if not found
        """
        try:
            proposal = self.proposal_manager.functions.getProposal(proposal_id).call()
            
            return {
                'id': proposal[0],
                'proposer': proposal[1],
                'proposal_type': proposal[2],
                'state': proposal[3],
                'start_block': proposal[4],
                'end_block': proposal[5],
                'execution_time': proposal[6],
                'metadata_hash': proposal[7],
                'for_votes': str(proposal[8]),
                'against_votes': str(proposal[9]),
                'abstain_votes': str(proposal[10]),
                'created_at': proposal[11]
            }
        except Exception as e:
            print(f"Error fetching proposal {proposal_id}: {e}")
            return None
    
    def get_vote_counts(self, proposal_id: int) -> Dict[str, str]:
        """Get vote counts for a proposal"""
        try:
            votes = self.proposal_manager.functions.getVoteCounts(proposal_id).call()
            return {
                'for_votes': str(votes[0]),
                'against_votes': str(votes[1]),
                'abstain_votes': str(votes[2])
            }
        except Exception as e:
            print(f"Error fetching vote counts: {e}")
            return {'for_votes': '0', 'against_votes': '0', 'abstain_votes': '0'}
    
    def has_voted(self, proposal_id: int, voter_address: str) -> bool:
        """Check if an address has voted on a proposal"""
        try:
            return self.proposal_manager.functions.hasVotedOnProposal(
                proposal_id,
                Web3.to_checksum_address(voter_address)
            ).call()
        except Exception as e:
            print(f"Error checking vote status: {e}")
            return False
    
    # ============ Role Management ============
    
    def has_role(self, role_name: str, address: str) -> bool:
        """
        Check if an address has a specific role
        
        Args:
            role_name: Name of role (CITIZEN, DELEGATE, ADMINISTRATOR, etc.)
            address: Address to check
            
        Returns:
            True if address has the role
        """
        try:
            # Get role hash
            role_hash = getattr(self.governance_core.functions, f"{role_name}_ROLE")().call()
            
            return self.governance_core.functions.checkRole(
                role_hash,
                Web3.to_checksum_address(address)
            ).call()
        except Exception as e:
            print(f"Error checking role: {e}")
            return False
    
    def get_user_roles(self, address: str) -> List[str]:
        """Get all roles for an address"""
        roles = []
        role_names = ['CITIZEN', 'DELEGATE', 'ADMINISTRATOR', 'AUDITOR', 'GUARDIAN']
        
        for role_name in role_names:
            if self.has_role(role_name, address):
                roles.append(role_name)
        
        return roles
    
    # ============ Transaction Sending ============
    
    def create_proposal(
        self,
        proposal_type: int,
        metadata_hash: str,
        voting_period: int = 50400
    ) -> Optional[str]:
        """
        Create a new proposal on-chain
        
        Args:
            proposal_type: Type of proposal (0-5)
            metadata_hash: IPFS hash of proposal details
            voting_period: Voting period in blocks
            
        Returns:
            Transaction hash or None if failed
        """
        if not self.account:
            raise ValueError("No account configured for signing transactions")
        
        try:
            # Build transaction
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            
            txn = self.proposal_manager.functions.createProposal(
                proposal_type,
                metadata_hash,
                voting_period
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 500000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            # Sign and send
            signed_txn = self.w3.eth.account.sign_transaction(txn, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            return self.w3.to_hex(tx_hash)
        
        except Exception as e:
            print(f"Error creating proposal: {e}")
            return None
    
    def cast_vote(
        self,
        proposal_id: int,
        support: int,
        weight: int = 1
    ) -> Optional[str]:
        """
        Cast a vote on a proposal
        
        Args:
            proposal_id: ID of proposal
            support: 0=against, 1=for, 2=abstain
            weight: Vote weight
            
        Returns:
            Transaction hash or None if failed
        """
        if not self.account:
            raise ValueError("No account configured for signing transactions")
        
        try:
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            
            txn = self.proposal_manager.functions.castVote(
                proposal_id,
                support,
                weight
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            signed_txn = self.w3.eth.account.sign_transaction(txn, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            return self.w3.to_hex(tx_hash)
        
        except Exception as e:
            print(f"Error casting vote: {e}")
            return None
    
    # ============ Event Listening ============
    
    def listen_to_events(
        self,
        event_name: str,
        from_block: int = 0,
        to_block: str = 'latest'
    ):
        """
        Listen to contract events
        
        Args:
            event_name: Name of event to listen for
            from_block: Starting block number
            to_block: Ending block number or 'latest'
            
        Yields:
            Event data dictionaries
        """
        # Determine which contract has the event
        contract = None
        if hasattr(self.governance_core.events, event_name):
            contract = self.governance_core
        elif hasattr(self.proposal_manager.events, event_name):
            contract = self.proposal_manager
        else:
            raise ValueError(f"Event {event_name} not found in contracts")
        
        # Create event filter
        event_filter = getattr(contract.events, event_name).create_filter(
            fromBlock=from_block,
            toBlock=to_block
        )
        
        # Get all events
        for event in event_filter.get_all_entries():
            yield {
                'event': event_name,
                'block_number': event['blockNumber'],
                'transaction_hash': event['transactionHash'].hex(),
                'args': dict(event['args']),
                'timestamp': self._get_block_timestamp(event['blockNumber'])
            }
    
    def _get_block_timestamp(self, block_number: int) -> int:
        """Get timestamp for a block"""
        try:
            block = self.w3.eth.get_block(block_number)
            return block['timestamp']
        except:
            return 0
    
    # ============ Utilities ============
    
    def get_transaction_receipt(self, tx_hash: str) -> Optional[Dict]:
        """Get transaction receipt"""
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            return {
                'status': receipt['status'],
                'block_number': receipt['blockNumber'],
                'gas_used': receipt['gasUsed'],
                'transaction_hash': receipt['transactionHash'].hex()
            }
        except Exception as e:
            print(f"Error getting receipt: {e}")
            return None
    
    def wait_for_transaction(self, tx_hash: str, timeout: int = 120) -> bool:
        """Wait for transaction to be mined"""
        try:
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=timeout)
            return receipt['status'] == 1
        except Exception as e:
            print(f"Transaction failed or timed out: {e}")
            return False


# ============ Example Usage ============

if __name__ == "__main__":
    # Initialize service
    service = BlockchainService(
        rpc_url=os.getenv("RPC_URL", "http://localhost:8545"),
        governance_core_address=os.getenv("GOVERNANCE_CORE_ADDRESS"),
        proposal_manager_address=os.getenv("PROPOSAL_MANAGER_ADDRESS"),
        private_key=os.getenv("PRIVATE_KEY")
    )
    
    # Get governance parameters
    params = service.get_governance_params()
    print("Governance Parameters:", params)
    
    # Get proposal count
    count = service.get_proposal_count()
    print(f"Total Proposals: {count}")
    
    # Listen to ProposalCreated events
    print("\nListening to ProposalCreated events...")
    for event in service.listen_to_events("ProposalCreated", from_block=0):
        print(f"Proposal {event['args']['proposalId']} created by {event['args']['proposer']}")
