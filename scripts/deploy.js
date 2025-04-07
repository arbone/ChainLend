const hre = require("hardhat");

async function main() {
    try {
        // Deploy InterestLib
        console.log("Deploying InterestLib...");
        const InterestLib = await hre.ethers.getContractFactory("InterestLib");
        const interestLib = await InterestLib.deploy();
        await interestLib.waitForDeployment();
        const interestLibAddress = await interestLib.getAddress();
        console.log("InterestLib deployed to:", interestLibAddress);

        // Deploy LoanManager passando l'indirizzo della libreria
        console.log("Deploying LoanManager...");
        const LoanManager = await hre.ethers.getContractFactory("LoanManager");
        const loanManager = await LoanManager.deploy(interestLibAddress);
        await loanManager.waitForDeployment();
        const loanManagerAddress = await loanManager.getAddress();
        console.log("LoanManager deployed to:", loanManagerAddress);

    } catch (error) {
        console.error("Error during deployment:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
