# ChainLend

ChainLend è una piattaforma decentralizzata di prestiti su blockchain che permette agli utenti di creare, gestire e partecipare a prestiti peer-to-peer.

## Caratteristiche

- Creazione e gestione prestiti
- Sistema di staking per governance
- Pagamenti parziali
- Estensione durata prestiti
- Rinegoziazione tassi di interesse
- Sistema di governance decentralizzato
- Gestione prestatori autorizzati
- Sistema di emergenza
- Limiti prestito personalizzabili

## Struttura del Progetto

ChainLend/ ├── contracts/ │ ├── LoanManager.sol │ └── InterestLib.sol ├── scripts/ │ └── deploy.js ├── test/ │ ├── LoanManager.test.js │ └── LoanManager.extended.test.js └── hardhat.config.js


## Tecnologie Utilizzate

- Solidity ^0.8.28
- Hardhat
- Ethers.js
- Chai (testing)

## Setup

1. Clone il repository
```bash
git clone https://github.com/arbone/ChainLend.git

Installa le dipendenze
bash

Copy
npm install
Compila i contratti
bash

Copy
npx hardhat compile
Esegui i test
bash

Copy
npx hardhat test
Deploy locale
bash

Copy
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
Licenza
MIT

text

Copy

5. **Commit e push del codice**:
```bash
git add .
git commit -m "Initial commit: ChainLend core functionality"
git branch -M main
git push -u origin main
Documentazione aggiuntiva - Crea una cartella docs con:
docs/ARCHITECTURE.md:

markdown

Copy
# Architettura ChainLend

## Componenti Core

### LoanManager
- Gestione prestiti
- Sistema di governance
- Gestione stake
- Sistema di emergenza

### InterestLib
- Calcolo interessi
- Calcolo penali

## Flussi di Processo

1. **Creazione Prestito**
   - Verifica limiti
   - Trasferimento fondi
   - Emissione eventi

2. **Gestione Pagamenti**
   - Pagamenti parziali
   - Calcolo interessi
   - Applicazione penali

3. **Governance**
   - Proposte
   - Votazione
   - Finalizzazione
docs/SECURITY.md:

markdown

Copy
# Modello di Sicurezza

## Controlli Implementati

1. **Controllo Accessi**
   - Modifier onlyOwner
   - Modifier notPaused
   - Modifier onlyLoanParties

2. **Gestione Stato**
   - Enum per stati prestito
   - Enum per stati proposta
   - Mapping per saldi e autorizzazioni

3. **Validazioni**
   - Controlli importi
   - Controlli temporali
   - Prevenzione doppio voto

## Best Practices

- Utilizzo SafeMath
- Check-Effects-Interactions pattern
- Eventi per tracking
Configurazione GitHub:
Aggiungi tag appropriati
Configura branch protection
Aggiungi workflow GitHub Actions