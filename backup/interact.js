const hre = require("hardhat");

async function main() {
    // Recupera gli indirizzi dal file di deployment
    const fs = require('fs');
    const deployedAddresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
    
    const loanManagerAddress = deployedAddresses.LoanManager;
    const interestLibAddress = deployedAddresses.InterestLib;

    // Ottieni le istanze dei contratti
    const LoanManager = await hre.ethers.getContractFactory("LoanManager");
    const InterestLib = await hre.ethers.getContractFactory("InterestLib");
    
    const loanManager = await LoanManager.attach(loanManagerAddress);
    const interestLib = await InterestLib.attach(interestLibAddress);

    // Ottieni i signer
    const [owner, lender, borrower] = await hre.ethers.getSigners();

    console.log("Interacting with contracts:");
    console.log("LoanManager address:", loanManagerAddress);
    console.log("InterestLib address:", interestLibAddress);
    console.log("Owner address:", owner.address);
    console.log("Lender address:", lender.address);
    console.log("Borrower address:", borrower.address);

    try {
        // 1. Crea un nuovo prestito
        const loanAmount = hre.ethers.parseEther("1.0");
        const interestRate = 10; // 10%
        const durationInDays = 30;

        console.log("\nCreating new loan...");
        const createLoanTx = await loanManager.connect(borrower).createLoan(
            lender.address,
            loanAmount,
            interestRate,
            durationInDays,
            { value: loanAmount }
        );
        await createLoanTx.wait();
        console.log("Loan created successfully!");

        // 2. Aggiungi stake per la governance
        console.log("\nAdding stake...");
        const stakingAmount = hre.ethers.parseEther("0.5");
        const addStakeTx = await loanManager.connect(lender).addStake({ value: stakingAmount });
        await addStakeTx.wait();
        console.log("Stake added successfully!");

        // 3. Crea una proposta
        console.log("\nCreating proposal...");
        const proposeTx = await loanManager.connect(lender).proposeRateChange(12); // Proponi nuovo tasso 12%
        await proposeTx.wait();
        console.log("Proposal created successfully!");

        // 4. Effettua un pagamento parziale
        console.log("\nMaking partial payment...");
        const partialAmount = hre.ethers.parseEther("0.3");
        const partialPaymentTx = await loanManager.connect(borrower).makePartialPayment(0, { value: partialAmount });
        await partialPaymentTx.wait();
        console.log("Partial payment made successfully!");

        // 5. Estendi la durata del prestito
        console.log("\nExtending loan duration...");
        const extensionTx = await loanManager.connect(borrower).extendLoanDuration(0, 15); // Estendi di 15 giorni
        await extensionTx.wait();
        console.log("Loan duration extended successfully!");

        // 6. Recupera e mostra i dettagli del prestito
        const loan = await loanManager.loans(0);
        console.log("\nLoan details:");
        console.log("Borrower:", loan.borrower);
        console.log("Lender:", loan.lender);
        console.log("Amount:", hre.ethers.formatEther(loan.amount), "ETH");
        console.log("Interest Rate:", loan.interestRate.toString(), "%");
        console.log("Duration:", loan.duration.toString(), "days");
        console.log("Repaid Amount:", hre.ethers.formatEther(loan.repaidAmount), "ETH");

    } catch (error) {
        console.error("Error during interaction:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
