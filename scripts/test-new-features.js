const { ethers } = require("hardhat");

async function main() {
    console.log("\n🚀 Test Nuove Funzionalità LoanManager\n");

    try {
        // Deploy InterestLib
        console.log("Deploying InterestLib...");
        const InterestLib = await ethers.getContractFactory("InterestLib");
        const interestLib = await InterestLib.deploy();
        await interestLib.waitForDeployment();
        const interestLibAddress = await interestLib.getAddress();
        console.log("InterestLib deployed to:", interestLibAddress);

        // Deploy LoanManager with InterestLib address
        console.log("\nDeploying LoanManager...");
        const LoanManager = await ethers.getContractFactory("LoanManager");
        const loanManager = await LoanManager.deploy(interestLibAddress);
        await loanManager.waitForDeployment();
        const loanManagerAddress = await loanManager.getAddress();
        console.log("LoanManager deployed to:", loanManagerAddress);

        // Ottieni i signer
        const [owner, lender, borrower, staker1] = await ethers.getSigners();

        console.log("\n📍 Indirizzi:");
        console.log("- LoanManager:", loanManagerAddress);
        console.log("- InterestLib:", interestLibAddress);
        console.log("- Owner:", owner.address);
        console.log("- Lender:", lender.address);
        console.log("- Borrower:", borrower.address);
        console.log("- Staker:", staker1.address);

        console.log("\n1️⃣ Test Stake Management");
        // Aggiungi stake
        const stakeAmount = ethers.parseEther("2.0");
        await loanManager.connect(staker1).addStake({ value: stakeAmount });
        
        // Verifica stake balance
        const stakeBalance = await loanManager.getStakeBalance(staker1.address);
        console.log("- Stake aggiunto:", ethers.formatEther(stakeBalance), "ETH");
        
        // Verifica total staked
        const totalStaked = await loanManager.getTotalStaked();
        console.log("- Totale in stake:", ethers.formatEther(totalStaked), "ETH");

        console.log("\n2️⃣ Test Creazione Prestito");
        // Crea un prestito
        const loanAmount = ethers.parseEther("1.0");
        await loanManager.connect(borrower).createLoan(
            lender.address,
            loanAmount,
            10, // 10% interest
            30, // 30 days
            { value: loanAmount }
        );

        // Verifica dettagli prestito
        const basicDetails = await loanManager.getLoanBasicDetails(0);
        const extendedDetails = await loanManager.getLoanExtendedDetails(0);
        console.log("- Prestito creato:");
        console.log("  • Borrower:", basicDetails[0]);
        console.log("  • Lender:", basicDetails[1]);
        console.log("  • Importo:", ethers.formatEther(basicDetails[2]), "ETH");
        console.log("  • Tasso:", basicDetails[3].toString(), "%");
        console.log("  • Durata:", basicDetails[4].toString(), "giorni");
        console.log("  • Data Fine:", new Date(Number(extendedDetails[0]) * 1000).toLocaleDateString());
        console.log("  • Stato:", ["Active", "Repaid", "Defaulted", "Cancelled"][Number(extendedDetails[1])]);
        console.log("  • Importo Ripagato:", ethers.formatEther(extendedDetails[2]), "ETH");

        console.log("\n3️⃣ Test Governance");
        // Crea proposta
        await loanManager.connect(staker1).proposeRateChange(12);
        
        // Verifica dettagli proposta
        const proposal = await loanManager.getProposal(0);
        console.log("- Proposta creata:");
        console.log("  • ID:", proposal[0].toString());
        console.log("  • Nuovo tasso:", proposal[1].toString(), "%");
        
        // Verifica voto
        const hasVoted = await loanManager.hasVotedForProposal(0, staker1.address);
        console.log("- Staker ha votato:", hasVoted);

        console.log("\n4️⃣ Test Statistiche Generali");
        const totalLoans = await loanManager.getTotalLoans();
        const totalProposals = await loanManager.getTotalProposals();
        console.log("- Totale prestiti:", totalLoans.toString());
        console.log("- Totale proposte:", totalProposals.toString());

        console.log("\n5️⃣ Test Pagamento Parziale");
        // Effettua pagamento parziale
        const partialPayment = ethers.parseEther("0.3");
        await loanManager.connect(borrower).makePartialPayment(0, { value: partialPayment });
        
        // Verifica rimanente da pagare
        const remaining = await loanManager.getRemainingAmount(0);
        console.log("- Pagamento effettuato:", ethers.formatEther(partialPayment), "ETH");
        console.log("- Rimanente da pagare:", ethers.formatEther(remaining), "ETH");

        console.log("\n✅ Test completati con successo!");

    } catch (error) {
        console.error("\n❌ Errore durante i test:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
