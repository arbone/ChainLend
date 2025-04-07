const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Iniziando il deployment su Sepolia...\n");

    try {
        // 1. Deploy InterestLib
        console.log("Deploying InterestLib...");
        const InterestLib = await ethers.getContractFactory("InterestLib");
        const interestLib = await InterestLib.deploy();
        await interestLib.waitForDeployment();
        const interestLibAddress = await interestLib.getAddress();
        console.log("✅ InterestLib deployed to:", interestLibAddress);

        // Attendi alcune conferme
        await interestLib.deploymentTransaction().wait(5);
        
        // 2. Deploy LoanManager
        console.log("\nDeploying LoanManager...");
        const LoanManager = await ethers.getContractFactory("LoanManager");
        const loanManager = await LoanManager.deploy(interestLibAddress);
        await loanManager.waitForDeployment();
        const loanManagerAddress = await loanManager.getAddress();
        console.log("✅ LoanManager deployed to:", loanManagerAddress);

        // Attendi alcune conferme
        await loanManager.deploymentTransaction().wait(5);

        // 3. Verifica su Etherscan
        console.log("\n🔍 Verificando i contratti su Etherscan...");
        
        console.log("\nVerificando InterestLib...");
        await hre.run("verify:verify", {
            address: interestLibAddress,
            constructorArguments: []
        });

        console.log("\nVerificando LoanManager...");
        await hre.run("verify:verify", {
            address: loanManagerAddress,
            constructorArguments: [interestLibAddress]
        });

        // 4. Salva gli indirizzi
        const fs = require("fs");
        const deploymentInfo = {
            network: "sepolia",
            interestLib: interestLibAddress,
            loanManager: loanManagerAddress,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(
            "deployment-testnet.json",
            JSON.stringify(deploymentInfo, null, 2)
        );

        console.log("\n✅ Deployment completato con successo!");
        console.log("📄 Informazioni salvate in deployment-testnet.json");

    } catch (error) {
        console.error("\n❌ Errore durante il deployment:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
