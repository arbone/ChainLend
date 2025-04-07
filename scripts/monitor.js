const { ethers } = require("hardhat");
const fs = require("fs");

// Carica gli indirizzi dei contratti deployati
const deploymentInfo = require('../deployment-testnet.json');

async function monitorContract() {
    console.log("🔍 Inizializzando il monitoring del LoanManager...\n");

    try {
        // Connessione al contratto
        const LoanManager = await ethers.getContractFactory("LoanManager");
        const loanManager = LoanManager.attach(deploymentInfo.loanManager);

        console.log("📊 Dashboard LoanManager:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        // Statistiche iniziali
        const totalLoans = await loanManager.getTotalLoans();
        console.log("Statistiche Generali:");
        console.log(`- Totale Prestiti: ${totalLoans}\n`);

        // Monitoring eventi in tempo reale
        console.log("🎯 Monitoring Eventi in tempo reale:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        // Event Listeners
        loanManager.on("LoanCreated", (loanId, borrower, lender, amount, timestamp, event) => {
            console.log(`\n📥 Nuovo Prestito Creato (${new Date().toLocaleString()})`);
            console.log(`- ID: ${loanId}`);
            console.log(`- Borrower: ${borrower}`);
            console.log(`- Lender: ${lender}`);
            console.log(`- Importo: ${ethers.formatEther(amount)} ETH`);
            logToFile('loans.json', {
                type: 'LoanCreated',
                timestamp: new Date(),
                data: { loanId, borrower, lender, amount: ethers.formatEther(amount) }
            });
        });

        loanManager.on("LoanRepaid", (loanId, amount, timestamp, event) => {
            console.log(`\n💰 Prestito Ripagato (${new Date().toLocaleString()})`);
            console.log(`- ID: ${loanId}`);
            console.log(`- Importo: ${ethers.formatEther(amount)} ETH`);
            logToFile('repayments.json', {
                type: 'LoanRepaid',
                timestamp: new Date(),
                data: { loanId, amount: ethers.formatEther(amount) }
            });
        });

        loanManager.on("LoanDefaulted", (loanId, borrower, amount, event) => {
            console.log(`\n⚠️ Prestito in Default (${new Date().toLocaleString()})`);
            console.log(`- ID: ${loanId}`);
            console.log(`- Borrower: ${borrower}`);
            console.log(`- Importo: ${ethers.formatEther(amount)} ETH`);
            logToFile('defaults.json', {
                type: 'LoanDefaulted',
                timestamp: new Date(),
                data: { loanId, borrower, amount: ethers.formatEther(amount) }
            });
        });

        loanManager.on("PenaltyApplied", (loanId, amount, event) => {
            console.log(`\n📌 Penale Applicata (${new Date().toLocaleString()})`);
            console.log(`- ID: ${loanId}`);
            console.log(`- Importo Penale: ${ethers.formatEther(amount)} ETH`);
            logToFile('penalties.json', {
                type: 'PenaltyApplied',
                timestamp: new Date(),
                data: { loanId, amount: ethers.formatEther(amount) }
            });
        });

        // Funzione di logging su file
        function logToFile(filename, data) {
            const logsDir = './logs';
            if (!fs.existsSync(logsDir)){
                fs.mkdirSync(logsDir);
            }

            const filepath = `${logsDir}/${filename}`;
            let logs = [];
            
            if (fs.existsSync(filepath)) {
                logs = JSON.parse(fs.readFileSync(filepath));
            }
            
            logs.push(data);
            fs.writeFileSync(filepath, JSON.stringify(logs, null, 2));
        }

        // Status check periodico
        setInterval(async () => {
            try {
                const currentTotalLoans = await loanManager.getTotalLoans();
                console.log(`\n📊 Status Update (${new Date().toLocaleString()})`);
                console.log(`- Prestiti Attivi: ${currentTotalLoans}`);
            } catch (error) {
                console.error("Errore nell'aggiornamento dello status:", error);
            }
        }, 60000); // Check ogni minuto

        console.log("✅ Monitoring attivo - In attesa di eventi...\n");

    } catch (error) {
        console.error("❌ Errore durante il monitoring:", error);
        process.exit(1);
    }
}

// Avvio del monitoring
monitorContract()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
