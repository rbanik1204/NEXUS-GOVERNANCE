import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("GovernanceCore", function () {
    let GovernanceCore;
    let governance;
    let admin, delegate, citizen, guardian, auditor;

    const defaultParams = {
        votingPeriod: 50400, // ~7 days in blocks (12s per block)
        executionDelay: 172800, // 48 hours in seconds
        quorumPercentage: 1000, // 10% (basis points)
        proposalThreshold: ethers.parseEther("100")
    };

    beforeEach(async function () {
        [admin, delegate, citizen, guardian, auditor] = await ethers.getSigners();

        GovernanceCore = await ethers.getContractFactory("GovernanceCore");
        governance = await upgrades.deployProxy(
            GovernanceCore,
            [admin.address, defaultParams],
            { initializer: "initialize" }
        );
        await governance.waitForDeployment();
    });

    describe("Initialization", function () {
        it("Should initialize with correct parameters", async function () {
            const params = await governance.params();
            expect(params.votingPeriod).to.equal(defaultParams.votingPeriod);
            expect(params.executionDelay).to.equal(defaultParams.executionDelay);
            expect(params.quorumPercentage).to.equal(defaultParams.quorumPercentage);
            expect(params.proposalThreshold).to.equal(defaultParams.proposalThreshold);
        });

        it("Should grant admin roles correctly", async function () {
            const ADMIN_ROLE = await governance.DEFAULT_ADMIN_ROLE();
            const ADMINISTRATOR_ROLE = await governance.ADMINISTRATOR_ROLE();
            const UPGRADER_ROLE = await governance.UPGRADER_ROLE();

            expect(await governance.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
            expect(await governance.hasRole(ADMINISTRATOR_ROLE, admin.address)).to.be.true;
            expect(await governance.hasRole(UPGRADER_ROLE, admin.address)).to.be.true;
        });

        it("Should start with zero proposals", async function () {
            expect(await governance.proposalCount()).to.equal(0);
        });
    });

    describe("Governance Parameters", function () {
        it("Should allow admin to update parameters", async function () {
            const newParams = {
                votingPeriod: 100000,
                executionDelay: 86400,
                quorumPercentage: 2000,
                proposalThreshold: ethers.parseEther("200")
            };

            await governance.connect(admin).updateGovernanceParams(newParams);

            const params = await governance.params();
            expect(params.votingPeriod).to.equal(newParams.votingPeriod);
            expect(params.executionDelay).to.equal(newParams.executionDelay);
            expect(params.quorumPercentage).to.equal(newParams.quorumPercentage);
            expect(params.proposalThreshold).to.equal(newParams.proposalThreshold);
        });

        it("Should reject invalid voting period", async function () {
            const invalidParams = { ...defaultParams, votingPeriod: 0 };
            await expect(
                governance.connect(admin).updateGovernanceParams(invalidParams)
            ).to.be.revertedWithCustomError(governance, "InvalidVotingPeriod");
        });

        it("Should reject invalid quorum percentage", async function () {
            const invalidParams = { ...defaultParams, quorumPercentage: 10001 };
            await expect(
                governance.connect(admin).updateGovernanceParams(invalidParams)
            ).to.be.revertedWithCustomError(governance, "InvalidQuorumPercentage");
        });

        it("Should prevent non-admin from updating parameters", async function () {
            await expect(
                governance.connect(citizen).updateGovernanceParams(defaultParams)
            ).to.be.reverted;
        });
    });

    describe("Role Management", function () {
        it("Should allow admin to grant delegate role", async function () {
            const DELEGATE_ROLE = await governance.DELEGATE_ROLE();

            await governance.connect(admin).grantRole(DELEGATE_ROLE, delegate.address);

            expect(await governance.hasRole(DELEGATE_ROLE, delegate.address)).to.be.true;
        });

        it("Should allow admin to grant guardian role", async function () {
            const GUARDIAN_ROLE = await governance.GUARDIAN_ROLE();

            await governance.connect(admin).grantRole(GUARDIAN_ROLE, guardian.address);

            expect(await governance.hasRole(GUARDIAN_ROLE, guardian.address)).to.be.true;
        });

        it("Should check roles correctly", async function () {
            const CITIZEN_ROLE = await governance.CITIZEN_ROLE();

            await governance.connect(admin).grantRole(CITIZEN_ROLE, citizen.address);

            expect(await governance.checkRole(CITIZEN_ROLE, citizen.address)).to.be.true;
            expect(await governance.checkRole(CITIZEN_ROLE, delegate.address)).to.be.false;
        });
    });

    describe("Proposal Creation", function () {
        beforeEach(async function () {
            const DELEGATE_ROLE = await governance.DELEGATE_ROLE();
            await governance.connect(admin).grantRole(DELEGATE_ROLE, delegate.address);
        });

        it("Should allow delegate to create proposal", async function () {
            await expect(governance.connect(delegate).createProposal())
                .to.emit(governance, "ProposalCreated")
                .withArgs(1, delegate.address);

            expect(await governance.proposalCount()).to.equal(1);
        });

        it("Should increment proposal count", async function () {
            await governance.connect(delegate).createProposal();
            await governance.connect(delegate).createProposal();

            expect(await governance.proposalCount()).to.equal(2);
        });

        it("Should prevent non-delegate from creating proposal", async function () {
            await expect(
                governance.connect(citizen).createProposal()
            ).to.be.revertedWithCustomError(governance, "NotDelegate");
        });

        it("Should prevent proposal creation when paused", async function () {
            const GUARDIAN_ROLE = await governance.GUARDIAN_ROLE();
            await governance.connect(admin).grantRole(GUARDIAN_ROLE, guardian.address);

            await governance.connect(guardian).pause();

            await expect(
                governance.connect(delegate).createProposal()
            ).to.be.reverted;
        });
    });

    describe("Emergency Controls", function () {
        beforeEach(async function () {
            const GUARDIAN_ROLE = await governance.GUARDIAN_ROLE();
            await governance.connect(admin).grantRole(GUARDIAN_ROLE, guardian.address);
        });

        it("Should allow guardian to pause", async function () {
            await expect(governance.connect(guardian).pause())
                .to.emit(governance, "EmergencyPaused")
                .withArgs(guardian.address);

            expect(await governance.paused()).to.be.true;
        });

        it("Should allow guardian to unpause", async function () {
            await governance.connect(guardian).pause();

            await expect(governance.connect(guardian).unpause())
                .to.emit(governance, "EmergencyUnpaused")
                .withArgs(guardian.address);

            expect(await governance.paused()).to.be.false;
        });

        it("Should prevent non-guardian from pausing", async function () {
            await expect(governance.connect(citizen).pause()).to.be.reverted;
        });
    });

    describe("Module Management", function () {
        const moduleId = ethers.id("TEST_MODULE").slice(0, 10); // bytes4
        const moduleAddress = "0x1234567890123456789012345678901234567890";

        it("Should allow admin to register module", async function () {
            await expect(governance.connect(admin).registerModule(moduleId, moduleAddress))
                .to.emit(governance, "ModuleRegistered")
                .withArgs(moduleId, moduleAddress);

            expect(await governance.getModule(moduleId)).to.equal(moduleAddress);
        });

        it("Should prevent duplicate module registration", async function () {
            await governance.connect(admin).registerModule(moduleId, moduleAddress);

            await expect(
                governance.connect(admin).registerModule(moduleId, moduleAddress)
            ).to.be.revertedWithCustomError(governance, "ModuleAlreadyRegistered");
        });

        it("Should allow admin to remove module", async function () {
            await governance.connect(admin).registerModule(moduleId, moduleAddress);

            await expect(governance.connect(admin).removeModule(moduleId))
                .to.emit(governance, "ModuleRemoved")
                .withArgs(moduleId);

            expect(await governance.getModule(moduleId)).to.equal(ethers.ZeroAddress);
        });

        it("Should prevent non-admin from managing modules", async function () {
            await expect(
                governance.connect(citizen).registerModule(moduleId, moduleAddress)
            ).to.be.reverted;
        });
    });

    describe("View Functions", function () {
        it("Should return governance parameters", async function () {
            const params = await governance.getGovernanceParams();
            expect(params.votingPeriod).to.equal(defaultParams.votingPeriod);
        });

        it("Should return proposal count", async function () {
            expect(await governance.getProposalCount()).to.equal(0);
        });
    });
});
