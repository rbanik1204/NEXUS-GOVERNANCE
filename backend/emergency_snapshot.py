import json
import os
from web3 import Web3
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Configuration
RPC_URL = os.getenv("RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com")
w3 = Web3(Web3.HTTPProvider(RPC_URL))

# Contract Addresses
CONTRACTS = {
    "ProposalManager": os.getenv("PROPOSAL_MANAGER_ADDRESS", "0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8"),
    "CitizenRegistry": os.getenv("CITIZEN_REGISTRY_ADDRESS", "0x7EF2e0048f5bAeDe046f6BF797943daF4ED8CB47"),
    "TreasuryManager": os.getenv("TREASURY_MANAGER_ADDRESS", "0x9D7f74d0C41E726EC95884E0e97Fa6129e3b5E99")
}

# Minimal ABIs
ABIS = {
    "ProposalManager": [
        {"inputs": [], "name": "getProposalCount", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
        {"inputs": [{"type": "uint256"}], "name": "proposals", "outputs": [
            {"name": "id", "type": "uint256"},
            {"name": "proposer", "type": "address"},
            {"name": "description", "type": "string"},
            {"name": "forVotes", "type": "uint256"},
            {"name": "againstVotes", "type": "uint256"},
            {"name": "abstainVotes", "type": "uint256"},
            {"name": "startTime", "type": "uint256"},
            {"name": "endTime", "type": "uint256"},
            {"name": "status", "type": "uint8"}
        ], "stateMutability": "view", "type": "function"}
    ],
    "CitizenRegistry": [
        {"inputs": [], "name": "getTotalCitizens", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"}
    ]
}

def export_snapshot():
    print(f"🚀 Starting Emergency DAO Snapshot ({datetime.now()})")
    snapshot = {
        "timestamp": datetime.now().isoformat(),
        "network": "sepolia",
        "contracts": CONTRACTS,
        "data": {
            "proposals": [],
            "citizens_count": 0,
            "treasury_balance": 0
        }
    }

    try:
        # Get Proposals
        pm = w3.eth.contract(address=CONTRACTS["ProposalManager"], abi=ABIS["ProposalManager"])
        count = pm.functions.getProposalCount().call()
        print(f"📦 Exporting {count} proposals...")
        for i in range(1, count + 1):
            prop = pm.functions.proposals(i).call()
            snapshot["data"]["proposals"].append({
                "id": prop[0],
                "proposer": prop[1],
                "description": prop[2],
                "votes": {"for": prop[3], "against": prop[4], "abstain": prop[5]},
                "timeline": {"start": prop[6], "end": prop[7]},
                "status": prop[8]
            })

        # Get Citizens
        cr = w3.eth.contract(address=CONTRACTS["CitizenRegistry"], abi=ABIS["CitizenRegistry"])
        snapshot["data"]["citizens_count"] = cr.functions.getTotalCitizens().call()

        # Get Treasury Balance
        snapshot["data"]["treasury_balance"] = w3.eth.get_balance(CONTRACTS["TreasuryManager"])

        # Save to file
        filename = f"emergency_snapshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, "w") as f:
            json.dump(snapshot, f, indent=4)
        
        print(f"✅ Snapshot saved successfully to {filename}")
        return filename

    except Exception as e:
        print(f"❌ Snapshot failed: {e}")
        return None

if __name__ == "__main__":
    export_snapshot()
