# 🚀 Complete Deployment Guide - Remix + Firebase

## Part 1: Deploy Smart Contracts (Remix IDE)

### Step 1: Use Fixed Contracts (5 minutes)

I've created Remix-compatible versions with GitHub URLs:

**Use these files in Remix**:
- `c:\DAO\contracts\contracts\governance\GovernanceCore_Remix.sol`
- `c:\DAO\contracts\contracts\governance\ProposalManager_Remix.sol`

### Step 2: Deploy in Remix

1. **Open Remix**: https://remix.ethereum.org

2. **Upload Contracts**:
   - Right-click on `contracts` folder
   - Click "Upload Files"
   - Select `GovernanceCore_Remix.sol` and `ProposalManager_Remix.sol`

3. **Compile**:
   - Click "Solidity Compiler" tab
   - Select version: **0.8.20**
   - Enable "Optimization" (200 runs)
   - Click "Compile GovernanceCore_Remix.sol"
   - Click "Compile ProposalManager_Remix.sol"
   - ✅ Should compile without errors now!

4. **Deploy GovernanceCore**:
   - Click "Deploy & Run Transactions"
   - Environment: "Injected Provider - MetaMask"
   - Connect MetaMask (Sepolia network)
   - Contract: "GovernanceCore"
   - Constructor params:
     ```
     _admin: YOUR_METAMASK_ADDRESS
     _params: [50400, 172800, 1000, "100000000000000000000"]
     ```
   - Click "transact"
   - Confirm in MetaMask
   - **Copy the deployed address!**

5. **Deploy ProposalManager**:
   - Contract: "ProposalManager"
   - Constructor params:
     ```
     _governanceCore: <GOVERNANCE_CORE_ADDRESS>
     _proposalCooldown: 604800
     ```
   - Click "transact"
   - Confirm in MetaMask
   - **Copy the deployed address!**

6. **Grant Yourself Delegate Role**:
   - Under GovernanceCore, click `DELEGATE_ROLE()` - copy the hash
   - Click `grantRole`
   - Params:
     ```
     role: <DELEGATE_ROLE_HASH>
     account: YOUR_METAMASK_ADDRESS
     ```
   - Click "transact"

---

## Part 2: Deploy Frontend to Firebase

### Step 1: Install Firebase CLI

```powershell
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```powershell
firebase login
```

This will open your browser - login with your Google account.

### Step 3: Initialize Firebase (Already Done!)

I've created the configuration files:
- ✅ `firebase.json`
- ✅ `.firebaserc` (set to project: nexus-org)

### Step 4: Update Environment Variables

Create `c:\DAO\frontend\.env.production`:

```env
# API Backend
REACT_APP_API_URL=https://your-backend-url.com/api

# Smart Contracts (from Remix deployment)
REACT_APP_GOVERNANCE_CONTRACT=0x... # GovernanceCore address
REACT_APP_PROPOSAL_CONTRACT=0x... # ProposalManager address

# Blockchain
REACT_APP_CHAIN_ID=11155111
REACT_APP_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Firebase
REACT_APP_FIREBASE_API_KEY=AIzaSyCVegpROEyvUeoP1ghZ9hQT0rawQBtxM0Y
REACT_APP_FIREBASE_AUTH_DOMAIN=nexus-org.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=nexus-org
REACT_APP_FIREBASE_STORAGE_BUCKET=nexus-org.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=177924349427
REACT_APP_FIREBASE_APP_ID=1:177924349427:web:2add656d21cacb49ae0686
REACT_APP_FIREBASE_MEASUREMENT_ID=G-WLTC08FBL8
```

### Step 5: Build the Frontend

```powershell
cd c:\DAO\frontend
yarn build
```

This creates an optimized production build in the `build` folder.

### Step 6: Deploy to Firebase

```powershell
firebase deploy --only hosting
```

You'll see output like:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/nexus-org/overview
Hosting URL: https://nexus-org.web.app
```

---

## Part 3: Backend Deployment Options

### Option A: Firebase Functions (Recommended for Blaze Plan)

1. **Initialize Functions**:
```powershell
cd c:\DAO
firebase init functions
# Select Python
# Select existing project: nexus-org
```

2. **Convert FastAPI to Cloud Functions**:
Create `functions/main.py`:

```python
from firebase_functions import https_fn
from firebase_admin import initialize_app
from server import app

initialize_app()

@https_fn.on_request()
def api(req: https_fn.Request) -> https_fn.Response:
    return app(req)
```

3. **Deploy**:
```powershell
firebase deploy --only functions
```

### Option B: Deploy Backend Separately (Heroku/Railway/Render)

I can help you set this up if you prefer!

---

## Part 4: Update Frontend with Backend URL

After backend is deployed, update `.env.production`:

```env
REACT_APP_API_URL=https://your-backend-url.com/api
```

Then rebuild and redeploy:
```powershell
yarn build
firebase deploy --only hosting
```

---

## 📋 Deployment Checklist

### Smart Contracts
- [ ] GovernanceCore_Remix.sol compiled in Remix
- [ ] ProposalManager_Remix.sol compiled in Remix
- [ ] GovernanceCore deployed to Sepolia
- [ ] ProposalManager deployed to Sepolia
- [ ] Delegate role granted to your address
- [ ] Contract addresses saved

### Frontend
- [ ] Firebase CLI installed
- [ ] Logged into Firebase
- [ ] `.env.production` created with contract addresses
- [ ] `yarn build` completed successfully
- [ ] Deployed to Firebase Hosting
- [ ] Site accessible at https://nexus-org.web.app

### Backend
- [ ] Backend deployment method chosen
- [ ] Backend deployed and accessible
- [ ] Frontend updated with backend URL
- [ ] API endpoints tested

---

## 🎯 Quick Commands Reference

### Deploy Frontend
```powershell
cd c:\DAO\frontend
yarn build
firebase deploy --only hosting
```

### View Deployment
```powershell
firebase open hosting:site
```

### View Logs
```powershell
firebase hosting:channel:list
```

### Rollback Deployment
```powershell
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID TARGET_SITE_ID:live
```

---

## 🔧 Troubleshooting

### Remix Compilation Errors
- ✅ **Fixed!** Use `GovernanceCore_Remix.sol` and `ProposalManager_Remix.sol`
- These use GitHub URLs for imports

### Firebase Deploy Fails
- Check you're logged in: `firebase login`
- Check project is set: `firebase use nexus-org`
- Check build folder exists: `ls build`

### Site Not Loading
- Check `.env.production` has correct values
- Rebuild: `yarn build`
- Redeploy: `firebase deploy --only hosting`

---

## 🎉 Success!

After completing all steps:

1. **Smart Contracts**: Deployed on Sepolia testnet
2. **Frontend**: Live at https://nexus-org.web.app
3. **Backend**: Deployed and connected
4. **Full Stack**: Government-grade DAO platform live!

---

## 📞 Next Steps

1. Test the deployed site
2. Create a test proposal
3. Vote on the proposal
4. Monitor on Etherscan
5. Share with your team!

---

**Your DAO platform is going live!** 🚀
