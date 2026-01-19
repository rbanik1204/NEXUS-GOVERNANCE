import time
import json
import requests
from web3 import Web3
from eth_abi import decode
import os
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
RPC_URL = os.getenv("RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Thresholds
LARGE_WITHDRAWAL_THRESHOLD = Web3.to_wei(1, 'ether') # threshold for alerting

# Smart Contract Addresses (from your deployment)
PROPOSAL_MANAGER_ADDR = "0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8"
TREASURY_MANAGER_ADDR = "0x9D7f74d0C41E726EC95884E0e97Fa6129e3b5E99"
GOVERNANCE_CORE_ADDR = "0xd9145CCE52D386f254917e481eB44e9943F39138"

# ABIs (Minimal for events)
PROPOSAL_MANAGER_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "proposalId", "type": "uint256"},
            {"indexed": True, "name": "proposer", "type": "address"},
            {"indexed": False, "name": "description", "type": "string"}
        ],
        "name": "ProposalCreated",
        "type": "event"
    }
]

TREASURY_MANAGER_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "token", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": False, "name": "amount", "type": "uint256"},
            {"indexed": False, "name": "timestamp", "type": "uint256"}
        ],
        "name": "Withdrawal",
        "type": "event"
    }
]

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))

def send_alert(message):
    print(f"🚨 ALERT: {message}")
    
    # Slack
    if SLACK_WEBHOOK_URL:
        try:
            requests.post(SLACK_WEBHOOK_URL, json={"text": message})
        except Exception as e:
            print(f"Failed to send Slack alert: {e}")
            
    # Telegram (optional)
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        try:
            # Basic sanitization for Chat ID if user accidentally pasted URL
            clean_chat_id = TELEGRAM_CHAT_ID.strip()
            if "t.me/" in clean_chat_id:
                clean_chat_id = clean_chat_id.split("/")[-1]
            
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
            requests.post(url, data={"chat_id": clean_chat_id, "text": message})
        except Exception as e:
            print(f"Failed to send Telegram alert: {e}")

def monitor_events():
    print(f"📡 Monitoring Nexus Org Events on {RPC_URL}...")
    
    # Contract objects
    proposal_manager = w3.eth.contract(address=PROPOSAL_MANAGER_ADDR, abi=PROPOSAL_MANAGER_ABI)
    treasury_manager = w3.eth.contract(address=TREASURY_MANAGER_ADDR, abi=TREASURY_MANAGER_ABI)
    
    # Define keywords for "Malicious" proposals
    MALICIOUS_KEYWORDS = ["hack", "steal", "malicious", "exploit", "drain", "backdoor"]

    # Start from latest block
    latest_block = w3.eth.block_number

    while True:
        try:
            current_block = w3.eth.block_number
            if current_block > latest_block:
                print(f"Scanning blocks {latest_block + 1} to {current_block}...")
                
                # Scan ProposalCreated
                proposal_events = proposal_manager.events.ProposalCreated.get_logs(from_block=latest_block + 1, to_block=current_block)
                for event in proposal_events:
                    desc = event['args']['description'].lower()
                    proposer = event['args']['proposer']
                    prop_id = event['args']['proposalId']
                    
                    if any(kw in desc for kw in MALICIOUS_KEYWORDS):
                        send_alert(f"⚠️ POTENTIAL MALICIOUS PROPOSAL DETECTED!\nID: {prop_id}\nProposer: {proposer}\nDescription Snippet: {desc[:100]}")
                    else:
                        print(f"New proposal {prop_id} detected (Safe description)")

                # Scan Withdrawal
                withdrawal_events = treasury_manager.events.Withdrawal.get_logs(from_block=latest_block + 1, to_block=current_block)
                for event in withdrawal_events:
                    amount = event['args']['amount']
                    recipient = event['args']['to']
                    
                    if amount >= LARGE_WITHDRAWAL_THRESHOLD:
                        amt_eth = w3.from_wei(amount, 'ether')
                        send_alert(f"🚩 LARGE WITHDRAWAL DETECTED!\nAmount: {amt_eth} ETH\nTo: {recipient}\nTx: {event['transactionHash'].hex()}")
                    else:
                        print(f"Normal withdrawal detected ({w3.from_wei(amount, 'ether')} ETH)")

                latest_block = current_block

            time.sleep(15) # Scan every 15 seconds (typical block time)
            
        except Exception as e:
            print(f"Monitoring error: {e}")
            time.sleep(30) # Wait before retry

if __name__ == "__main__":
    monitor_events()
