# NEXUS DAO - Decentralized Governance Platform

A government-grade DAO governance system built for transparency, auditability, and decentralization.

## 🏛️ Project Status

**Current Phase**: Recovery from UI Mockup → Real DAO  
**Network**: Sepolia Testnet  
**Frontend**: https://nexus-org.web.app

### ⚠️ Important Notice

This project has undergone a critical audit and recovery process:
- **Phase 1**: Core governance contracts ready for deployment
- **Phase 2**: All fake demo data removed from UI ✅
- **Next**: Deploy contracts to Sepolia and verify

See `RECOVERY_PLAN_STATUS.md` for complete details.

---

## 📁 Repository Structure

```
c:\DAO\
├── contracts/              # Smart contracts
│   ├── governance/
│   │   ├── GovernanceCore_Deployable.sol    ⭐ Ready to deploy
│   │   └── ProposalManager_Deployable.sol   ⭐ Ready to deploy
│   ├── treasury/
│   ├── identity/
│   └── legal/
├── frontend/              # React UI
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── contexts/
│   └── build/            # Production build
├── backend/              # Python monitoring service
├── subgraph/             # The Graph indexing
└── docs/                 # Documentation
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MetaMask with Sepolia ETH
- Firebase CLI (for deployment)

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Deploy Contracts (CRITICAL FIRST STEP)
See `PHASE1_DEPLOYMENT_GUIDE.md` for detailed instructions.

---

## 📋 Key Documents

| Document | Purpose |
|----------|---------|
| `PHASE1_DEPLOYMENT_GUIDE.md` | Step-by-step contract deployment |
| `RECOVERY_PLAN_STATUS.md` | Current project status |
| `GOVERNANCE_ARCHITECTURE_SPEC.md` | Complete system architecture |
| `ACCEPTANCE_CRITERIA.md` | Testing and verification criteria |
| `SECURITY_AUDIT_READINESS.md` | Security measures |

---

## 🔧 Technology Stack

- **Smart Contracts**: Solidity 0.8.20
- **Frontend**: React, ethers.js, wagmi, viem
- **Styling**: Tailwind CSS, shadcn/ui
- **Deployment**: Firebase Hosting
- **Network**: Sepolia Testnet
- **Indexing**: The Graph (subgraph)

---

## ✅ What's Working (After Phase 2)

- ✅ Wallet connection (MetaMask/WalletConnect)
- ✅ Network detection (Sepolia)
- ✅ UI shows real blockchain data (no fake metrics)
- ✅ Professional neo-brutalist design
- ✅ Demo mode disabled by default

## ⏳ What Needs Deployment

- ⏳ GovernanceCore contract
- ⏳ ProposalManager contract
- ⏳ Proposal creation (will work after deployment)
- ⏳ Voting (will work after deployment)

---

## 🎯 Deployment Checklist

- [ ] Deploy GovernanceCore to Sepolia
- [ ] Deploy ProposalManager to Sepolia
- [ ] Verify contracts on Etherscan
- [ ] Test: Create proposal
- [ ] Test: Cast vote
- [ ] Update frontend contract addresses
- [ ] Rebuild and deploy frontend

---

## 🔐 Security

- OpenZeppelin contracts
- Role-based access control
- Timelock on critical operations
- Multi-sig for treasury (planned)
- Emergency pause functionality

---

## 📊 Governance Parameters

| Parameter | Value (Testing) | Value (Production) |
|-----------|----------------|-------------------|
| Voting Period | 5 minutes | 7 days |
| Execution Delay | 1 minute | 48 hours |
| Quorum | 10% | 15% |
| Proposal Threshold | 0 | TBD |

---

## 🤝 Contributing

This is a government pilot project. External contributions are not currently accepted.

---

## 📄 License

MIT License - See LICENSE file

---

## 📞 Support

For government pilot inquiries, see project documentation.

---

## 🔄 Recent Changes

### 2026-01-19: Phase 1-2 Recovery
- Created deployable GovernanceCore contract
- Created deployable ProposalManager contract
- Removed all fake demo data from UI
- Changed default mode from Demo to Live
- Updated Hero, Treasury, Analytics to show real data
- Deployed honest UI to Firebase

### Previous: Audit Findings
- Identified non-existent core contracts
- Documented fake data contamination
- Created recovery plan

---

**Built for transparency. Governed by the people.** 🏛️
