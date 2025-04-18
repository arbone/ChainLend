```markdown
# 🏦 ChainLend - Sistema di Prestiti Decentralizzato P2P

## 📑 Descrizione
ChainLend è un sistema di prestiti peer-to-peer basato su blockchain sviluppato per Bonny, una startup marchigiana che mira a semplificare l'accesso al credito. Il sistema permette agli utenti di effettuare e ricevere prestiti in modo decentralizzato, con gestione automatizzata di interessi e penali.

## 📑 Il Progetto e il Cliente

### Chi è Bonny
Bonny è una startup marchigiana attiva da tre anni, impegnata nella semplificazione della burocrazia per i cittadini italiani. La loro missione è facilitare il rapporto tra cittadini e istituzioni, aiutando le persone a scoprire e ottenere bonus e agevolazioni fiscali in modo semplice e trasparente.

### Vision del Cliente
📑 Semplificare la vita dei cittadini italiani, rendendo la burocrazia più semplice e migliorando il loro benessere.

### Il Problema da Risolvere
Bonny ha identificato una criticità nell'accesso al credito per le persone con limitate risorse finanziarie. ChainLend nasce come soluzione blockchain per democratizzare l'accesso ai prestiti attraverso un sistema P2P decentralizzato.


## 🌟 Caratteristiche Principali

### Core Features
- ✅ Creazione e gestione prestiti P2P
- 📊 Calcolo automatico di interessi e penali
- 🔒 Sistema di sicurezza anti-reentrancy
- ⏰ Gestione delle scadenze dei prestiti
- 💰 Pagamenti parziali e totali
- 🚫 Sistema di annullamento prestiti

### Governance e Staking
- 🏛️ Sistema di governance decentralizzata
- 📈 Staking per partecipazione alla governance
- 🗳️ Votazioni per modifiche dei tassi di interesse
- 💼 Gestione autorizzazioni prestatori

### Monitoraggio e Trasparenza
- 📡 Sistema di eventi per tracking completo
- 📊 Dashboard di monitoraggio in tempo reale
- 📝 Logging dettagliato delle operazioni

## 🛠 Tecnologie Utilizzate
- Solidity ^0.8.28
- Hardhat
- OpenZeppelin Contracts

## 📦 Installazione

1. Clona il repository
```bash
git clone [url-repository]
```

2. Installa le dipendenze
```bash
npm install
```

3. Configura le variabili d'ambiente
```bash
cp .env.example .env
# Modifica .env con le tue chiavi
```

## 🚀 Deployment

1. Compila i contratti
```bash
npx hardhat compile
```

2. Esegui i test
```bash
npx hardhat test
```

3. Deploy su rete di test (Sepolia)
```bash
npx hardhat run scripts/deploy-testnet.js --network sepolia
```

## 📊 Monitoring

Avvia il sistema di monitoring:
```bash
npx hardhat run scripts/monitor.js --network sepolia
```

## 🧪 Test

### Test Automatizzati
```bash
# Esegui tutti i test
npx hardhat test

# Esegui test specifici
npx hardhat test test/loan-manager.test.js
```

### Test Manuali
```bash
# Crea un prestito di test
npx hardhat run scripts/test-transaction.js --network sepolia
```

## 📝 Contratto Principale

### Eventi
- `LoanCreated`: Creazione nuovo prestito
- `LoanRepaid`: Prestito ripagato
- `LoanDefaulted`: Prestito in default
- `CollateralAdded`: Aggiunto collaterale
- `StakeAdded`: Nuovo stake aggiunto
- `ProposalCreated`: Nuova proposta di governance

### Funzioni Principali
```solidity
function createLoan(address lender, uint amount, uint interestRate, uint durationInDays) public payable
function makePartialPayment(uint loanId) public payable
function addCollateralERC20(uint256 loanId, address tokenAddress, uint256 amount) public
function addCollateralETH(uint256 loanId) public payable
function proposeRateChange(uint newRate) public
function vote(uint proposalId, bool support) public
```

markdown

Copy
## 🏗 Struttura del Progetto

### 📑 Componenti Principali

#### Smart Contracts (`/contracts`)
- `LoanManager.sol` - Contratto principale del sistema di prestiti
- `InterestLib.sol` - Libreria per calcoli di interessi e penali

#### Scripts (`/scripts`)
- `deploy-testnet.js` - Deployment su rete di test
- `monitor.js` - Sistema di monitoraggio
- `complete-test.js` - Test completi
- `test-transaction.js` - Test transazioni

#### Test (`/test`)
- `LoanManager.test.js` - Suite completa di test unitari

#### Configurazione
- `.env` - Variabili ambiente e chiavi private
- `hardhat.config.js` - Configurazione ambiente Hardhat
- `deployment-testnet.json` - Settings deployment testnet
- `package.json` - Dipendenze e script

### 📊 Files di Supporto
- `deployed-addresses.json` - Registro indirizzi contratti deployati
- `README.md` - Documentazione del progetto
- `.gitignore` - Configurazione Git

### 🔧 Utilities
- `/artifacts` - File compilati dei contratti
- `/cache` - Cache di compilazione Hardhat
- `/backup` - Backup del sistema
- `/logs` - Log di sistema

### 🛠 Moduli Aggiuntivi
- `/ignition/modules` - Configurazioni framework Ignition
- `/node_modules` - Dipendenze Node.js

## 📚 Note sulla Struttura
- I contratti principali sono in `/contracts`
- Gli script di deployment e test in `/scripts`
- I test unitari in `/test`
- Le configurazioni nella root directory


## 🔐 Sicurezza
- Utilizzo di OpenZeppelin ReentrancyGuard
- Sistema di pause per emergenze
- Controlli di sicurezza sui collaterali
- Validazioni input rigorose

## 📋 Stato del Progetto
- ✅ Contratti sviluppati e testati
- ✅ Deployato su Sepolia Testnet
- ✅ Sistema di monitoring attivo
- ✅ Test completi implementati

## 🌐 Indirizzi Contratti (Sepolia)
- LoanManager: `[indirizzo-contratto]`
- InterestLib: `[indirizzo-libreria]`

## 📜 Licenza
MIT

## 👥 Team
- Sviluppatore: [Il tuo nome]
- Progetto per: Bonny

## 🤝 Contribuire
Le pull request sono benvenute. Per modifiche maggiori, apri prima una issue per discutere le modifiche proposte.

## ⚠️ Disclaimer
Questo software è in fase di sviluppo. Usare con cautela su reti di test prima del deployment in produzione.
```
