const { ethers } = require("hardhat");
const deploymentInfo = require('../deployment-testnet.json');

async function main() {
    try {
        console.log("🚀 Creazione prestito di test...\n");

        // Ottieni il wallet dall'environment
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
        console.log("Account utilizzato:", await signer.getAddress());

        // Ottieni il contratto
        const LoanManager = await ethers.getContractFactory("LoanManager");
        const loanManager = LoanManager.attach(deploymentInfo.loanManager);

        // Usa lo stesso account come lender e borrower per il test
        const lenderAddress = await signer.getAddress();
        const borrowerAddress = await signer.getAddress();

        console.log("\nIndirizzi:");
        console.log("- Lender:", lenderAddress);
        console.log("- Borrower:", borrowerAddress);

        // Importo del prestito
        const loanAmount = ethers.parseEther("0.01"); // 0.01 ETH per test
        
        console.log("\nCreazione prestito:");
        console.log("- Importo:", ethers.formatEther(loanAmount), "ETH");
        console.log("- Tasso interesse: 10%");
        console.log("- Durata: 30 giorni");

        // Crea il prestito
        const tx = await loanManager.connect(signer).createLoan(
            lenderAddress,
            loanAmount,
            10, // 10% interest rate
            30, // 30 days duration
            { value: loanAmount }
        );

        console.log("\n⏳ Transazione inviata, in attesa di conferma...");
        const receipt = await tx.wait();
        console.log("✅ Prestito creato con successo!");
        console.log("- Transaction hash:", receipt.hash);
        
        // Ottieni l'ID del prestito
        const loanId = await loanManager.getTotalLoans() - 1n;
        console.log("\nDettagli prestito creato:");
        console.log("- Loan ID:", loanId.toString());

        // Attendi 30 secondi e fai un pagamento
        console.log("\n⏳ Attendi 30 secondi per il pagamento...");
        await new Promise(resolve => setTimeout(resolve, 30000));

        // Effettua un pagamento
        const paymentAmount = ethers.parseEther("0.005"); // Pagamento parziale di 0.005 ETH
        console.log("\nEffettuo pagamento parziale:");
        console.log("- Importo:", ethers.formatEther(paymentAmount), "ETH");

        const payTx = await loanManager.connect(signer).makePartialPayment(
            loanId,
            { value: paymentAmount }
        );

        console.log("\n⏳ Pagamento inviato, in attesa di conferma...");
        const payReceipt = await payTx.wait();
        console.log("✅ Pagamento effettuato con successo!");
        console.log("- Transaction hash:", payReceipt.hash);

    } catch (error) {
        console.error("\n❌ Errore durante il test:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
