const { ethers } = require("hardhat");

async function main() {
    console.log("\n🔍 TEST COMPLETO DEL SISTEMA DI PRESTITI\n");

    try {
        // 1. SETUP INIZIALE E DEPLOYMENT
        console.log("1️⃣ SETUP E DEPLOYMENT");
        
        // Deploy InterestLib
        const InterestLib = await ethers.getContractFactory("InterestLib");
        const interestLib = await InterestLib.deploy();
        await interestLib.waitForDeployment();
        console.log("✓ InterestLib deployato:", await interestLib.getAddress());

        // Deploy LoanManager
        const LoanManager = await ethers.getContractFactory("LoanManager");
        const loanManager = await LoanManager.deploy(await interestLib.getAddress());
        await loanManager.waitForDeployment();
        console.log("✓ LoanManager deployato:", await loanManager.getAddress());

        // Get signers
        const [owner, lender1, lender2, borrower1, borrower2, staker1, staker2, staker3] = await ethers.getSigners();
        console.log("\nPARTECIPANTI:");
        console.log("- Owner:", await owner.getAddress());
        console.log("- Lender1:", await lender1.getAddress());
        console.log("- Lender2:", await lender2.getAddress());
        console.log("- Borrower1:", await borrower1.getAddress());
        console.log("- Borrower2:", await borrower2.getAddress());
        console.log("- Staker1:", await staker1.getAddress());
        console.log("- Staker2:", await staker2.getAddress());
        console.log("- Staker3:", await staker3.getAddress());

        // 2. TEST FUNZIONI AMMINISTRATIVE
        console.log("\n2️⃣ TEST FUNZIONI AMMINISTRATIVE");
        
        // Test pausa
        console.log("\nTest Sistema di Pausa:");
        await loanManager.connect(owner).togglePause();
        console.log("✓ Contratto in pausa:", await loanManager.paused());
        await loanManager.connect(owner).togglePause();
        console.log("✓ Contratto riattivato:", !(await loanManager.paused()));

        // Test autorizzazione prestatori
        console.log("\nTest Autorizzazione Prestatori:");
        await loanManager.connect(owner).setAuthorizedLender(lender1.address, true);
        await loanManager.connect(owner).setAuthorizedLender(lender2.address, true);
        console.log("✓ Lender1 autorizzato:", await loanManager.authorizedLenders(lender1.address));
        console.log("✓ Lender2 autorizzato:", await loanManager.authorizedLenders(lender2.address));

        // Test limiti prestatori
        console.log("\nTest Limiti Prestatori:");
        await loanManager.connect(owner).setBorrowerLimit(borrower1.address, ethers.parseEther("10.0"));
        await loanManager.connect(owner).setBorrowerLimit(borrower2.address, ethers.parseEther("5.0"));
        console.log("✓ Limite Borrower1:", ethers.formatEther(await loanManager.borrowerLimits(borrower1.address)), "ETH");
        console.log("✓ Limite Borrower2:", ethers.formatEther(await loanManager.borrowerLimits(borrower2.address)), "ETH");

        // 3. TEST SISTEMA DI STAKING
        console.log("\n3️⃣ TEST SISTEMA DI STAKING");
        
        // Aggiungi stake
        const stakeAmount = ethers.parseEther("2.0");
        await loanManager.connect(staker1).addStake({ value: stakeAmount });
        await loanManager.connect(staker2).addStake({ value: stakeAmount });
        await loanManager.connect(staker3).addStake({ value: stakeAmount });
        
        console.log("✓ Stake Aggiunti:");
        console.log("- Staker1:", ethers.formatEther(await loanManager.getStakeBalance(staker1.address)), "ETH");
        console.log("- Staker2:", ethers.formatEther(await loanManager.getStakeBalance(staker2.address)), "ETH");
        console.log("- Staker3:", ethers.formatEther(await loanManager.getStakeBalance(staker3.address)), "ETH");
        console.log("- Totale Stake:", ethers.formatEther(await loanManager.getTotalStaked()), "ETH");

        // 4. TEST SISTEMA DI PRESTITI
        console.log("\n4️⃣ TEST SISTEMA DI PRESTITI");

        // Crea prestiti
        const loanAmount1 = ethers.parseEther("1.0");
        const loanAmount2 = ethers.parseEther("2.0");
        
        await loanManager.connect(borrower1).createLoan(
            lender1.address,
            loanAmount1,
            10, // 10% interest
            30, // 30 days
            { value: loanAmount1 }
        );

        await loanManager.connect(borrower2).createLoan(
            lender2.address,
            loanAmount2,
            12, // 12% interest
            45, // 45 days
            { value: loanAmount2 }
        );

        console.log("\n✓ Prestiti Creati:");
        const loan1 = await loanManager.loans(0);
        const loan2 = await loanManager.loans(1);
        
        console.log("Prestito 1:");
        console.log("- Borrower:", loan1.borrower);
        console.log("- Amount:", ethers.formatEther(loan1.amount), "ETH");
        console.log("- Interest:", loan1.interestRate.toString(), "%");
        
        console.log("Prestito 2:");
        console.log("- Borrower:", loan2.borrower);
        console.log("- Amount:", ethers.formatEther(loan2.amount), "ETH");
        console.log("- Interest:", loan2.interestRate.toString(), "%");

        // Test cancellazione prestito
        console.log("\n✓ Test Cancellazione Prestito:");
        await loanManager.connect(borrower1).cancelLoan(0);
        console.log("- Prestito 1 cancellato");
        
        // Verifica i pending withdrawals
        const pendingWithdrawal = await loanManager.pendingWithdrawals(borrower1.address);
        console.log("- Pending withdrawal per Borrower1:", ethers.formatEther(pendingWithdrawal), "ETH");
        
        // Test withdraw balance
        await loanManager.connect(borrower1).withdrawBalance();
        console.log("- Fondi prelevati da Borrower1");

        // Test pagamenti parziali sul secondo prestito
        console.log("\n✓ Test Pagamenti Parziali:");
        await loanManager.connect(borrower2).makePartialPayment(1, { value: ethers.parseEther("0.5") });
        console.log("- Pagamento parziale effettuato per Prestito 2");
        console.log("- Importo rimanente:", ethers.formatEther(await loanManager.getRemainingAmount(1)), "ETH");

        // 5. TEST SISTEMA DI GOVERNANCE
        console.log("\n5️⃣ TEST SISTEMA DI GOVERNANCE");
        
        // Crea proposta
        await loanManager.connect(staker1).proposeRateChange(15);
        console.log("✓ Proposta creata per nuovo tasso del 15%");

        // Vota proposta
        await loanManager.connect(staker1).vote(0, true);
        await loanManager.connect(staker2).vote(0, true);
        await loanManager.connect(staker3).vote(0, false);

        const proposal = await loanManager.getProposal(0);
        console.log("\n✓ Risultati Votazione:");
        console.log("- Voti a favore:", proposal[2].toString());
        console.log("- Voti contro:", proposal[3].toString());

        // 6. STATISTICHE FINALI
        console.log("\n6️⃣ STATISTICHE FINALI DEL SISTEMA");
        console.log("✓ Totale Prestiti:", (await loanManager.getTotalLoans()).toString());
        console.log("✓ Totale Proposte:", (await loanManager.getTotalProposals()).toString());
        console.log("✓ Totale in Stake:", ethers.formatEther(await loanManager.getTotalStaked()), "ETH");
        console.log("✓ Stato Contratto (Paused):", await loanManager.paused());

        console.log("\n✅ TUTTI I TEST COMPLETATI CON SUCCESSO!");

    } catch (error) {
        console.error("\n❌ ERRORE DURANTE I TEST:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
