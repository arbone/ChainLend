const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    try {
        // Leggi gli indirizzi dal file deployment-testnet.json
        const deploymentPath = path.join(__dirname, "../deployment-testnet.json");
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
        
        const interestLibAddress = deploymentData.InterestLib;
        const loanManagerAddress = deploymentData.LoanManager;

        console.log("\n📦 Indirizzi dei contratti caricati:");
        console.log("- InterestLib:", interestLibAddress);
        console.log("- LoanManager:", loanManagerAddress);

        // Connettiti al contratto LoanManager
        console.log("\n🔗 Connessione al contratto LoanManager...");
        const loanManager = await ethers.getContractAt("LoanManager", loanManagerAddress);
        console.log("✅ Connessione stabilita!");

        // Ottieni i signers
        const [owner, lender1, lender2, borrower1, borrower2, staker1] = await ethers.getSigners();
        console.log("\n👤 Account principale (owner):", owner.address);

        /** ------------------- READ FUNCTIONS (LETTURA) ------------------- **/
        console.log("\n📖 LETTURA DEI DATI DEL CONTRATTO:");

        // Totale prestiti
        const totalLoans = await loanManager.getTotalLoans();
        console.log("Totale prestiti:", totalLoans.toString());

        // Verifica lo stato di pausa
        const pausedState = await loanManager.paused();
        console.log("Stato di pausa:", pausedState);

        // Verifica il totale degli stake
        const totalStaked = await loanManager.getTotalStaked();
        console.log("Totale in stake:", ethers.formatEther(totalStaked), "ETH");

        // Verifica il limite di un borrower
        const borrowerLimit = await loanManager.borrowerLimits(borrower1.address);
        console.log("Limite del borrower:", ethers.formatEther(borrowerLimit), "ETH");

        // Se ci sono prestiti, mostra i dettagli del primo prestito
        if (totalLoans > 0) {
            const loan = await loanManager.loans(0);
            console.log("\nDettagli del primo prestito:");
            console.log("- Borrower:", loan.borrower);
            console.log("- Importo:", ethers.formatEther(loan.amount), "ETH");
            console.log("- Tasso di interesse:", loan.interestRate.toString(), "%");
            console.log("- Stato:", loan.state.toString());
        }

        /** ------------------- WRITE FUNCTIONS (SCRITTURA) ------------------- **/
        console.log("\n✍️ TEST DELLE FUNZIONI DI SCRITTURA:");

        // 1. Autorizza un lender
        console.log("\nAutorizzazione di un nuovo lender...");
        const authLenderTx = await loanManager.connect(owner).setAuthorizedLender(lender1.address, true);
        await authLenderTx.wait();
        console.log("✅ Lender autorizzato:", lender1.address);

        // 2. Imposta un limite per un borrower
        const newLimit = ethers.parseEther("5.0");
        console.log("\nImpostazione limite borrower di 5 ETH...");
        const setLimitTx = await loanManager.connect(owner).setBorrowerLimit(borrower1.address, newLimit);
        await setLimitTx.wait();
        console.log("✅ Limite borrower impostato!");

        // 3. Aggiungi stake
        const stakeAmount = ethers.parseEther("1.0");
        console.log("\nAggiunta stake di 1 ETH...");
        const stakeTx = await loanManager.connect(staker1).addStake({ value: stakeAmount });
        await stakeTx.wait();
        console.log("✅ Stake aggiunto con successo!");

        // 4. Crea un prestito
        console.log("\nCreazione di un nuovo prestito...");
        const loanAmount = ethers.parseEther("0.5");
        const createLoanTx = await loanManager.connect(borrower1).createLoan(
            lender1.address,
            loanAmount,
            10, // 10% interesse
            30, // 30 giorni
            { value: loanAmount }
        );
        await createLoanTx.wait();
        console.log("✅ Prestito creato con successo!");

        /** ------------------- VERIFICA FINALE ------------------- **/
        console.log("\n📊 VERIFICA FINALE:");
        
        const finalTotalLoans = await loanManager.getTotalLoans();
        console.log("Totale prestiti finale:", finalTotalLoans.toString());
        
        const finalStake = await loanManager.getStakeBalance(staker1.address);
        console.log("Stake finale dello staker:", ethers.formatEther(finalStake), "ETH");
        
        const finalBorrowerLimit = await loanManager.borrowerLimits(borrower1.address);
        console.log("Limite finale del borrower:", ethers.formatEther(finalBorrowerLimit), "ETH");
        
        const isLenderAuth = await loanManager.authorizedLenders(lender1.address);
        console.log("Stato autorizzazione lender:", isLenderAuth);

    } catch (error) {
        console.error("\n❌ Errore dettagliato:");
        console.error("Messaggio:", error.message);
        if (error.data) {
            console.error("Data:", error.data);
        }
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Errore durante l'esecuzione dello script");
        process.exit(1);
    });
