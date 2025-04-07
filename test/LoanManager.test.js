const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LoanManager Extended Features", function () {
    let interestLib;
    let loanManager;
    let owner;
    let lender;
    let borrower;
    let staker1;
    let staker2;
    let staker3;
    let oneEther;
    let initialLoanId;

    beforeEach(async function () {
        [owner, lender, borrower, staker1, staker2, staker3] = await ethers.getSigners();
        oneEther = ethers.parseEther("1");

        // Deploy InterestLib
        const InterestLib = await ethers.getContractFactory("InterestLib");
        interestLib = await InterestLib.deploy();

        // Deploy LoanManager
        const LoanManager = await ethers.getContractFactory("LoanManager");
        loanManager = await LoanManager.deploy(await interestLib.getAddress());

        // Create initial loan for testing
        await loanManager.connect(borrower).createLoan(
            lender.address,
            oneEther,
            10, // 10% interest
            30, // 30 days
            { value: oneEther }
        );
        initialLoanId = 0;
    });

    describe("Emergency Pause", function () {
        it("Should allow owner to pause and unpause", async function () {
            await expect(loanManager.connect(owner).togglePause())
                .to.emit(loanManager, "ContractPaused")
                .withArgs(true);

            await expect(
                loanManager.connect(borrower).createLoan(
                    lender.address,
                    oneEther,
                    10,
                    30,
                    { value: oneEther }
                )
            ).to.be.revertedWith("Contract is paused");

            await expect(loanManager.connect(owner).togglePause())
                .to.emit(loanManager, "ContractPaused")
                .withArgs(false);
        });

        it("Should not allow non-owner to pause", async function () {
            await expect(
                loanManager.connect(borrower).togglePause()
            ).to.be.revertedWith("Only owner can call this function");
        });
    });

    describe("Staking System", function () {
        it("Should allow users to stake and withdraw", async function () {
            await expect(
                loanManager.connect(staker1).addStake({ value: oneEther })
            ).to.emit(loanManager, "StakeAdded")
                .withArgs(staker1.address, oneEther);

            expect(await loanManager.stakingBalances(staker1.address))
                .to.equal(oneEther);

            await expect(
                loanManager.connect(staker1).withdrawStake(oneEther)
            ).to.emit(loanManager, "StakeWithdrawn")
                .withArgs(staker1.address, oneEther);
        });
    });

    describe("Partial Payments", function () {
        it("Should accept partial payments", async function () {
            const halfEther = oneEther / BigInt(2);
            
            await expect(
                loanManager.connect(borrower).makePartialPayment(initialLoanId, { value: halfEther })
            ).to.emit(loanManager, "PartialPayment")
                .withArgs(initialLoanId, halfEther);

            const loan = await loanManager.loans(initialLoanId);
            expect(loan.repaidAmount).to.equal(halfEther);
        });
    });

    describe("Loan Extension", function () {
        it("Should allow extending loan duration", async function () {
            await expect(
                loanManager.connect(borrower).extendLoanDuration(initialLoanId, 15)
            ).to.emit(loanManager, "LoanExtended");

            const loan = await loanManager.loans(initialLoanId);
            expect(loan.duration).to.equal(45); // 30 + 15 days
        });
    });

    describe("Interest Rate Renegotiation", function () {
        it("Should allow interest rate changes", async function () {
            await expect(
                loanManager.connect(borrower).renegotiateInterestRate(initialLoanId, 8)
            ).to.emit(loanManager, "InterestRateChanged")
                .withArgs(initialLoanId, 10, 8);

            const loan = await loanManager.loans(initialLoanId);
            expect(loan.interestRate).to.equal(8);
        });
    });

    describe("Governance", function () {
        beforeEach(async function () {
            // Add stakes for voting
            await loanManager.connect(staker1).addStake({ value: oneEther });
            await loanManager.connect(staker2).addStake({ value: oneEther });
            await loanManager.connect(staker3).addStake({ value: oneEther });
        });

        it("Should create and process proposals", async function () {
            // Create proposal
            await expect(
                loanManager.connect(staker1).proposeRateChange(12)
            ).to.emit(loanManager, "ProposalCreated");

            // Vote
            await loanManager.connect(staker1).vote(0, true);
            await loanManager.connect(staker2).vote(0, true);
            await loanManager.connect(staker3).vote(0, false);

            // Advance time
            await time.increase(time.duration.days(4));

            // Finalize proposal
            await expect(
                loanManager.connect(staker1).finalizeProposal(0)
            ).to.emit(loanManager, "ProposalCompleted");

            expect(await loanManager.defaultInterestRate()).to.equal(12);
        });

        it("Should prevent double voting", async function () {
            await loanManager.connect(staker1).proposeRateChange(12);
            await loanManager.connect(staker1).vote(0, true);
            
            await expect(
                loanManager.connect(staker1).vote(0, true)
            ).to.be.revertedWith("Already voted");
        });
    });

    describe("Borrower Limits", function () {
        it("Should enforce borrower limits", async function () {
            await loanManager.connect(owner).setBorrowerLimit(borrower.address, ethers.parseEther("0.5"));

            await expect(
                loanManager.connect(borrower).createLoan(
                    lender.address,
                    oneEther,
                    10,
                    30,
                    { value: oneEther }
                )
            ).to.be.revertedWith("Amount exceeds borrower limit");
        });
    });

    describe("Authorized Lenders", function () {
        it("Should manage authorized lenders", async function () {
            await loanManager.connect(owner).setAuthorizedLender(lender.address, true);
            expect(await loanManager.authorizedLenders(lender.address)).to.be.true;

            await loanManager.connect(owner).setAuthorizedLender(lender.address, false);
            expect(await loanManager.authorizedLenders(lender.address)).to.be.false;
        });
    });
});
