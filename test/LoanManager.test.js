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

    describe("Basic Loan Operations", function () {
        it("Should create a loan correctly", async function () {
            const loanAmount = ethers.parseEther("1.0");
            const tx = await loanManager.connect(borrower).createLoan(
                lender.address,
                loanAmount,
                10, // 10% interest
                30, // 30 days
                { value: loanAmount }
            );
            
            const receipt = await tx.wait();
            const loanId = await loanManager.loanIdCounter() - BigInt(1);
            
            const loan = await loanManager.loans(loanId);
            
            expect(loan.borrower).to.equal(borrower.address);
            expect(loan.lender).to.equal(lender.address);
            expect(loan.amount).to.equal(loanAmount);
            expect(loan.state).to.equal(0); // LoanState.Active
        });
    
        it("Should complete full loan repayment successfully", async function () {
            // Create a new loan
            const loanAmount = ethers.parseEther("1.0");
            await loanManager.connect(borrower).createLoan(
                lender.address,
                loanAmount,
                10,
                30,
                { value: loanAmount }
            );
            
            const loanId = await loanManager.loanIdCounter() - BigInt(1);
            
            // Calculate total due
            const totalDue = await loanManager.calculateTotalDue(loanId);
            
            // Make full repayment
            await loanManager.connect(borrower).makePartialPayment(
                loanId, 
                { value: totalDue }
            );
            
            const loan = await loanManager.loans(loanId);
            expect(loan.state).to.equal(1); // LoanState.Repaid
            expect(loan.repaidAmount).to.equal(totalDue);
        });
    
        it("Should fail when non-borrower tries to repay", async function () {
            const loanId = 0;
            const amount = ethers.parseEther("0.5");
            
            await expect(
                loanManager.connect(staker1).makePartialPayment(
                    loanId, 
                    { value: amount }
                )
            ).to.be.revertedWith("Only borrower can repay");
        });
    
        it("Should track loan state changes correctly", async function () {
            const loanId = 0;
            const loan = await loanManager.loans(loanId);
            
            // Verifica stato iniziale
            expect(loan.state).to.equal(0); // Active
            
            // Advance time past loan duration
            await time.increase(time.duration.days(40));
            
            // Verify loan can still be repaid with penalties
            const totalDue = await loanManager.calculateTotalDue(loanId);
            await loanManager.connect(borrower).makePartialPayment(
                loanId, 
                { value: totalDue }
            );
            
            const updatedLoan = await loanManager.loans(loanId);
            expect(updatedLoan.state).to.equal(1); // Repaid
        });
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
            await expect(
                loanManager.connect(staker1).proposeRateChange(12)
            ).to.emit(loanManager, "ProposalCreated");

            await loanManager.connect(staker1).vote(0, true);
            await loanManager.connect(staker2).vote(0, true);
            await loanManager.connect(staker3).vote(0, false);

            await time.increase(time.duration.days(4));

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

    describe("Penalty System", function () {
        let loanId;
        const LOAN_AMOUNT = ethers.parseEther("1.0");
        const INTEREST_RATE = 10; // 10%
        const DURATION_DAYS = 30;
    
        beforeEach(async function () {
            const tx = await loanManager.connect(borrower).createLoan(
                lender.address,
                LOAN_AMOUNT,
                INTEREST_RATE,
                DURATION_DAYS,
                { value: LOAN_AMOUNT }
            );
            const receipt = await tx.wait();
            loanId = await loanManager.loanIdCounter() - BigInt(1);
        });
    
        it("Should not apply penalties for on-time payments", async function () {
            // Get the total due amount directly from the contract
            const totalDue = await loanManager.calculateTotalDue(loanId);
            
            // Make the payment using the exact amount calculated by the contract
            await loanManager.connect(borrower).makePartialPayment(loanId, { value: totalDue });
    
            // Get the loan details after payment
            const loan = await loanManager.loans(loanId);
            
            // Verify no penalties were applied
            expect(loan.paidPenalties).to.equal(0);
            
            // Verify the repaid amount matches exactly what was calculated by the contract
            expect(loan.repaidAmount).to.equal(totalDue);
        });
    
        it("Should apply penalties for late payments", async function () {
            await time.increase(time.duration.days(DURATION_DAYS + 5));
    
            const totalDue = await loanManager.calculateTotalDue(loanId);
            await loanManager.connect(borrower).makePartialPayment(loanId, { value: totalDue });
    
            const loan = await loanManager.loans(loanId);
            expect(loan.paidPenalties).to.be.gt(0);
        });
    
        it("Should calculate penalties correctly", async function () {
            const DAYS_LATE = 10;
            await time.increase(time.duration.days(DURATION_DAYS + DAYS_LATE));
    
            const [totalDue, principalDue, interestDue, penaltyDue] = await loanManager.calculateDetailedAmounts(loanId);
            
            // Calculate expected penalty (1% per day late)
            const expectedPenalty = (LOAN_AMOUNT * BigInt(DAYS_LATE)) / BigInt(100);
            expect(penaltyDue).to.equal(expectedPenalty);
        });
    
        // Nuovo test per verificare il calcolo degli interessi
        it("Should calculate interest correctly for the loan duration", async function () {
            const [totalDue, principalDue, interestDue, ] = await loanManager.calculateDetailedAmounts(loanId);
            
            // Calculate expected interest: (principal * rate * days) / (365 * 100)
            const expectedInterest = (LOAN_AMOUNT * BigInt(INTEREST_RATE) * BigInt(DURATION_DAYS)) / BigInt(36500);
            const expectedTotal = LOAN_AMOUNT + expectedInterest;
            
            expect(interestDue).to.equal(expectedInterest);
            expect(totalDue).to.equal(expectedTotal);
        });
    });    
});
