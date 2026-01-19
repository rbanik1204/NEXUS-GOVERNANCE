import { ethers, upgrades } from "hardhat";

async function main() {
    console.log("🚀 Deploying Government-Grade DAO Platform...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // ============ Deploy GovernanceCore ============
    console.log("📜 Deploying GovernanceCore...");

    const GovernanceCore = await ethers.getContractFactory("GovernanceCore");

    const governanceParams = {
        votingPeriod: 50400,              // ~7 days (12s blocks)
        executionDelay: 172800,           // 48 hours
        quorumPercentage: 1000,           // 10%
        proposalThreshold: ethers.parseEther("100")
    };

    const governanceCore = await upgrades.deployProxy(
        GovernanceCore,
        [deployer.address, governanceParams],
        { initializer: "initialize" }
    );
    await governanceCore.waitForDeployment();

    const governanceCoreAddress = await governanceCore.getAddress();
    console.log("✅ GovernanceCore deployed to:", governanceCoreAddress);

    // ============ Deploy ProposalManager ============
    console.log("\n📜 Deploying ProposalManager...");

    const ProposalManager = await ethers.getContractFactory("ProposalManager");

    const proposalManager = await upgrades.deployProxy(
        ProposalManager,
        [governanceCoreAddress, 604800], // 7 day cooldown
        { initializer: "initialize" }
    );
    await proposalManager.waitForDeployment();

    const proposalManagerAddress = await proposalManager.getAddress();
    console.log("✅ ProposalManager deployed to:", proposalManagerAddress);

    // ============ Configure Roles ============
    console.log("\n🔐 Configuring roles...");

    const DELEGATE_ROLE = await governanceCore.DELEGATE_ROLE();
    const EXECUTOR_ROLE = await proposalManager.EXECUTOR_ROLE();

    // Grant deployer delegate role for testing
    await governanceCore.grantRole(DELEGATE_ROLE, deployer.address);
    console.log("✅ Granted DELEGATE_ROLE to deployer");

    // Grant proposal manager executor role
    await proposalManager.grantRole(EXECUTOR_ROLE, deployer.address);
    console.log("✅ Granted EXECUTOR_ROLE to deployer");

    // ============ Register Module ============
    console.log("\n🔌 Registering ProposalManager module...");

    const moduleId = ethers.id("PROPOSAL_MANAGER").slice(0, 10);
    await governanceCore.registerModule(moduleId, proposalManagerAddress);
    console.log("✅ ProposalManager registered as module");

    // ============ Summary ============
    console.log("\n" + "=".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("GovernanceCore:   ", governanceCoreAddress);
    console.log("ProposalManager:  ", proposalManagerAddress);
    console.log("=".repeat(60));
    console.log("\n💾 Save these addresses to your .env file:");
    console.log(`GOVERNANCE_CORE_ADDRESS=${governanceCoreAddress}`);
    console.log(`PROPOSAL_MANAGER_ADDRESS=${proposalManagerAddress}`);
    console.log("\n✅ Deployment complete!\n");

    // ============ Verification Instructions ============
    console.log("📝 To verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network <network> ${governanceCoreAddress}`);
    console.log(`npx hardhat verify --network <network> ${proposalManagerAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
