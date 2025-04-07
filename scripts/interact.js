const hre = require("hardhat");
const fs = require("fs");

async function displayBalances(loanManager, addresses) {
    console.log("\n=== Balances ===");
    for (const [name, address] of Object.entries(addresses)) {
        const balance = await hre.ethers.provider.getBalance(address);
        console.log(`${name} balance: ${hre.ethers.formatEther(balance)} ETH`);
    }
}

async function main() {
    const deployedAddresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    
    // Contract instances
    const LoanManager = await hre.ethers.getContractFactory("LoanManager");
    const InterestLib = await hre.ethers.getContractFactory("InterestLib");
    
    const loanManager = await LoanManager.attach(deployedAddresses.LoanManager);
    const interestLib = await InterestLib.attach(deployedAddresses.InterestLib);

    // Get signers
    const [owner, lender, borrower] = await hre.ethers.getSigners();

    const addresses = {
        Owner: owner.address,
        Lender: lender.address,
        Borrower: borrower.address,
        LoanManager: deployedAddresses.LoanManager,
        InterestLib: deployedAddresses.InterestLib
    };

    console.log("\n=== Contract Addresses ===");
    Object.entries(addresses).forEach(([name, address]) => {
        console.log(`${name}: ${address}`);
    });

    await displayBalances(loanManager, addresses);

    try {
        // 1. Create Loan
        console.log("\n=== Creating Loan ===");
        const loanAmount = hre.ethers.parseEther("1.0");
        const interestRate = 10;
        const durationInDays = 30;

        const createLoanTx = await loanManager.connect(borrower).createLoan(
            lender.address,
            loanAmount,
            interestRate,
            durationInDays,
            { value: loanAmount }
        );
        await createLoanTx.wait();
        console.log("Loan created successfully!");

        // 2. Add Stake
        console.log("\n=== Adding Stake ===");
        const stakingAmount = hre.ethers.parseEther("0.5");
        const addStakeTx = await loanManager.connect(lender).addStake({ value: stakingAmount });
        await addStakeTx.wait();
        console.log("Stake added successfully!");

        // Verify stake balance
        const stakeBalance = await loanManager.getStakeBalance(lender.address);
        console.log("Stake Balance:", hre.ethers.formatEther(stakeBalance), "ETH");

        // 3. Create Proposal
        console.log("\n=== Creating Proposal ===");
        const proposeTx = await loanManager.connect(lender).proposeRateChange(12);
        await proposeTx.wait();
        console.log("Proposal created successfully!");

        // Verify proposal
        const proposal = await loanManager.getProposal(0);
        console.log("Proposal Status:", proposal.state);

        // 4. Partial Payment
        console.log("\n=== Making Partial Payment ===");
        const partialAmount = hre.ethers.parseEther("0.3");
        const partialPaymentTx = await loanManager.connect(borrower).makePartialPayment(0, { value: partialAmount });
        await partialPaymentTx.wait();
        console.log("Partial payment made successfully!");

        // 5. Extend Duration
        console.log("\n=== Extending Loan Duration ===");
        const extensionTx = await loanManager.connect(borrower).extendLoanDuration(0, 15);
        await extensionTx.wait();
        console.log("Loan duration extended successfully!");

        // Get loan details
        const loan = await loanManager.loans(0);
        console.log("\n=== Loan Details ===");
        console.log("Borrower:", loan.borrower);
        console.log("Lender:", loan.lender);
        console.log("Amount:", hre.ethers.formatEther(loan.amount), "ETH");
        console.log("Interest Rate:", loan.interestRate.toString(), "%");
        console.log("Duration:", loan.duration.toString(), "days");
        console.log("Repaid Amount:", hre.ethers.formatEther(loan.repaidAmount), "ETH");

        // Additional checks
        console.log("\n=== Additional Checks ===");
        const loanState = await loanManager.getLoanState(0);
        console.log("Loan State:", loanState);

        const remainingAmount = await loanManager.getRemainingAmount(0);
        console.log("Remaining Amount:", hre.ethers.formatEther(remainingAmount), "ETH");

        // Test error scenarios
        console.log("\n=== Testing Error Scenarios ===");
        try {
            await loanManager.connect(borrower).makePartialPayment(0, { value: hre.ethers.parseEther("2.0") });
        } catch (error) {
            console.log("Expected error on overpayment:", error.message);
        }

        await displayBalances(loanManager, addresses);

    } catch (error) {
        console.error("\nError during interaction:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
