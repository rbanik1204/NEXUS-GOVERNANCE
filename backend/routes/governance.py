"""
Governance API Routes

Endpoints for interacting with the governance system:
- Proposals
- Voting
- Roles
- Parameters
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

router = APIRouter(prefix="/governance", tags=["governance"])


# ============ Models ============

class ProposalType(str, Enum):
    POLICY_DECISION = "POLICY_DECISION"
    BUDGET_ALLOCATION = "BUDGET_ALLOCATION"
    REGULATION_AMENDMENT = "REGULATION_AMENDMENT"
    ROLE_ASSIGNMENT = "ROLE_ASSIGNMENT"
    EMERGENCY_ACTION = "EMERGENCY_ACTION"
    PARAMETER_UPDATE = "PARAMETER_UPDATE"


class ProposalState(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    SUCCEEDED = "SUCCEEDED"
    DEFEATED = "DEFEATED"
    QUEUED = "QUEUED"
    EXECUTED = "EXECUTED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class ProposalCreate(BaseModel):
    proposal_type: ProposalType
    title: str = Field(..., min_length=10, max_length=200)
    description: str = Field(..., min_length=50)
    metadata_hash: str  # IPFS hash
    voting_period: int = Field(default=50400, ge=1000, le=100000)


class ProposalResponse(BaseModel):
    id: int
    proposer: str
    proposal_type: ProposalType
    state: ProposalState
    title: str
    description: str
    metadata_hash: str
    start_block: int
    end_block: int
    for_votes: str
    against_votes: str
    abstain_votes: str
    created_at: datetime
    updated_at: datetime


class VoteCreate(BaseModel):
    support: int = Field(..., ge=0, le=2)  # 0=against, 1=for, 2=abstain
    reason: Optional[str] = None


class VoteResponse(BaseModel):
    proposal_id: int
    voter: str
    support: int
    weight: str
    reason: Optional[str]
    transaction_hash: str
    timestamp: datetime


class GovernanceParams(BaseModel):
    voting_period: int
    execution_delay: int
    quorum_percentage: int
    proposal_threshold: str


class UserRoles(BaseModel):
    address: str
    roles: List[str]
    is_citizen: bool
    is_delegate: bool
    is_administrator: bool
    is_auditor: bool
    is_guardian: bool


# ============ Endpoints ============

@router.get("/params", response_model=GovernanceParams)
async def get_governance_parameters():
    """Get current governance parameters"""
    # TODO: Integrate with blockchain service
    return {
        "voting_period": 50400,
        "execution_delay": 172800,
        "quorum_percentage": 1000,
        "proposal_threshold": "100000000000000000000"
    }


@router.get("/proposals", response_model=List[ProposalResponse])
async def list_proposals(
    state: Optional[ProposalState] = None,
    proposer: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    """
    List all proposals with optional filtering
    
    - **state**: Filter by proposal state
    - **proposer**: Filter by proposer address
    - **skip**: Number of proposals to skip
    - **limit**: Maximum number of proposals to return
    """
    # TODO: Integrate with database and blockchain
    return []


@router.get("/proposals/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(proposal_id: int):
    """Get detailed information about a specific proposal"""
    # TODO: Integrate with blockchain service
    raise HTTPException(status_code=404, detail="Proposal not found")


@router.post("/proposals", response_model=ProposalResponse)
async def create_proposal(proposal: ProposalCreate):
    """
    Create a new governance proposal
    
    Requires DELEGATE_ROLE
    """
    # TODO: Integrate with blockchain service
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/proposals/{proposal_id}/vote", response_model=VoteResponse)
async def cast_vote(proposal_id: int, vote: VoteCreate):
    """
    Cast a vote on a proposal
    
    - **support**: 0 = against, 1 = for, 2 = abstain
    - **reason**: Optional explanation for the vote
    """
    # TODO: Integrate with blockchain service
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/proposals/{proposal_id}/votes", response_model=List[VoteResponse])
async def get_proposal_votes(proposal_id: int):
    """Get all votes for a specific proposal"""
    # TODO: Integrate with database
    return []


@router.delete("/proposals/{proposal_id}")
async def cancel_proposal(proposal_id: int):
    """
    Cancel a proposal
    
    Only the proposer or an administrator can cancel
    """
    # TODO: Integrate with blockchain service
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/users/{address}/roles", response_model=UserRoles)
async def get_user_roles(address: str):
    """Get all roles for a specific address"""
    # TODO: Integrate with blockchain service
    return {
        "address": address,
        "roles": [],
        "is_citizen": False,
        "is_delegate": False,
        "is_administrator": False,
        "is_auditor": False,
        "is_guardian": False
    }


@router.get("/users/{address}/proposals", response_model=List[ProposalResponse])
async def get_user_proposals(address: str):
    """Get all proposals created by a specific address"""
    # TODO: Integrate with database
    return []


@router.get("/users/{address}/votes", response_model=List[VoteResponse])
async def get_user_votes(address: str):
    """Get all votes cast by a specific address"""
    # TODO: Integrate with database
    return []


@router.get("/stats")
async def get_governance_stats():
    """Get governance statistics"""
    return {
        "total_proposals": 0,
        "active_proposals": 0,
        "total_votes": 0,
        "total_citizens": 0,
        "total_delegates": 0,
        "treasury_balance": "0"
    }


@router.get("/events")
async def get_governance_events(
    event_type: Optional[str] = None,
    from_block: int = 0,
    limit: int = 100
):
    """
    Get governance events from the blockchain
    
    - **event_type**: Filter by event type (ProposalCreated, VoteCast, etc.)
    - **from_block**: Starting block number
    - **limit**: Maximum number of events to return
    """
    # TODO: Integrate with blockchain service event listener
    return []
