const hre = require("hardhat");
const fs = require("fs");

async function main() {
    // Deploy InterestLib
    const InterestLib = await hre.ethers.getContractFactory("InterestLib");
    const interestLib = await InterestLib.deploy();
    await interestLib.waitForDeployment();
    
    console.log("InterestLib deployed to:", await interestLib.getAddress());

    // Deploy LoanManager
    const LoanManager = await hre.ethers.getContractFactory("LoanManager");
    const loanManager = await LoanManager.deploy(await interestLib.getAddress());
    await loanManager.waitForDeployment();

    console.log("LoanManager deployed to:", await loanManager.getAddress());

    // Salva gli indirizzi in un file
    const addresses = {
        InterestLib: await interestLib.getAddress(),
        LoanManager: await loanManager.getAddress()
    };

    fs.writeFileSync(
        'deployed-addresses.json',
        JSON.stringify(addresses, null, 2)
    );

    console.log("Indirizzi salvati in deployed-addresses.json");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
