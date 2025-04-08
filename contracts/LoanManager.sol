// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./InterestLib.sol";

contract LoanManager {
    address public interestLibAddress;
    InterestLib public interestLib;
    address public owner;
    bool public paused;

    enum LoanState { Active, Repaid, Defaulted, Cancelled }
    enum ProposalState { Active, Approved, Rejected }

    struct Loan {
        address borrower;
        address lender;
        uint amount;
        uint interestRate;
        uint duration;
        uint startDate;
        uint endDate;
        LoanState state;
        uint repaidAmount;
        uint lastRepaymentDate;
        uint penaltyAmount;      // Penali calcolate
        uint paidPenalties;      // Penali già pagate
    }

    struct Proposal {
        uint proposalId;
        uint newRate;
        uint votesFor;
        uint votesAgainst;
        uint endTime;
        ProposalState state;
        mapping(address => bool) hasVoted;
    }

    uint public loanIdCounter;
    uint public proposalIdCounter;
    uint public defaultInterestRate = 10; // 10% default interest rate
    uint public constant VOTING_PERIOD = 3 days;
    uint public constant MINIMUM_VOTES = 3;
    uint public constant DEFAULT_PENALTY_RATE = 1; // 1% penale giornaliera

    mapping(uint => Loan) public loans;
    mapping(uint => Proposal) public proposals;
    mapping(address => uint) public borrowerLimits;
    mapping(address => bool) public authorizedLenders;
    mapping(address => uint) public stakingBalances;

    event LoanCreated(uint indexed loanId, address indexed borrower, address indexed lender, uint amount);
    event LoanRepaid(uint indexed loanId, address indexed borrower, uint amount);
    event LoanCancelled(uint indexed loanId);
    event LoanDefaulted(uint indexed loanId);
    event PenaltyApplied(uint indexed loanId, uint penalty);
    event LoanExtended(uint indexed loanId, uint newEndDate);
    event PartialPayment(uint indexed loanId, uint amount);
    event InterestRateChanged(uint indexed loanId, uint oldRate, uint newRate);
    event ProposalCreated(uint indexed proposalId, uint newRate);
    event ProposalCompleted(uint indexed proposalId, bool approved);
    event ContractPaused(bool paused);
    event StakeAdded(address indexed staker, uint amount);
    event StakeWithdrawn(address indexed staker, uint amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier notPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier onlyLoanParties(uint loanId) {
        require(
            msg.sender == loans[loanId].borrower || 
            msg.sender == loans[loanId].lender, 
            "Only loan parties can call this function"
        );
        _;
    }

    constructor(address _interestLibAddress) {
        interestLibAddress = _interestLibAddress;
        interestLib = InterestLib(_interestLibAddress);
        owner = msg.sender;
    }

    function togglePause() public onlyOwner {
        paused = !paused;
        emit ContractPaused(paused);
    }

    function addStake() public payable {
        require(msg.value > 0, "Must stake some ETH");
        stakingBalances[msg.sender] += msg.value;
        emit StakeAdded(msg.sender, msg.value);
    }

    function withdrawStake(uint amount) public {
        require(stakingBalances[msg.sender] >= amount, "Insufficient stake");
        stakingBalances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit StakeWithdrawn(msg.sender, amount);
    }

    function createLoan(
        address lender,
        uint amount,
        uint interestRate,
        uint durationInDays
    ) public payable notPaused {
        require(msg.value == amount, "Must send exact loan amount");
        require(lender != address(0), "Invalid lender address");
        require(amount > 0, "Amount must be greater than 0");
        require(durationInDays > 0, "Duration must be greater than 0");
        require(borrowerLimits[msg.sender] == 0 || 
                borrowerLimits[msg.sender] >= amount, 
                "Amount exceeds borrower limit");

        uint loanId = loanIdCounter++;

        // Aggiunta dei nuovi campi penaltyAmount e paidPenalties
        loans[loanId] = Loan({
            borrower: msg.sender,
            lender: lender,
            amount: amount,
            interestRate: interestRate,
            duration: durationInDays,
            startDate: block.timestamp,
            endDate: block.timestamp + (durationInDays * 1 days),
            state: LoanState.Active,
            repaidAmount: 0,
            lastRepaymentDate: 0,
            penaltyAmount: 0,         // Inizialmente nessuna penale
            paidPenalties: 0          // Nessuna penale pagata
        });

        // Invia l'importo del prestito al prestatore
        payable(msg.sender).transfer(amount);

        emit LoanCreated(loanId, msg.sender, lender, amount);   
    }

    function calculateDetailedAmounts(uint loanId) public view returns (
        uint totalDue, 
        uint principalDue, 
        uint interestDue, 
        uint penaltyDue
    ) {
        Loan storage loan = loans[loanId];
        require(loan.state == LoanState.Active, "Loan is not active");

        // Calcola il capitale rimanente
        principalDue = loan.amount - loan.repaidAmount;

        // Calcola gli interessi usando la libreria
        interestDue = calculateLoanInterest(loan.amount, loan.interestRate, loan.duration);

        // Calcola le penali solo se il prestito è scaduto
        if (block.timestamp > loan.endDate) {
            uint daysLate = (block.timestamp - loan.endDate) / 1 days;
            penaltyDue = calculateLoanPenalty(loan.amount, DEFAULT_PENALTY_RATE, daysLate);
        }

        // Il totale dovuto è la somma di capitale, interessi e penali
        totalDue = principalDue + interestDue + penaltyDue;
    }

    // Modifica la funzione makePartialPayment
    function makePartialPayment(uint loanId) public payable notPaused {
        Loan storage loan = loans[loanId];
        require(loan.state == LoanState.Active, "Loan is not active");
        require(msg.sender == loan.borrower, "Only borrower can repay");
        require(msg.value > 0, "Payment must be greater than 0");

        // Calcola gli importi dovuti
        (uint totalDue,,,uint penaltyDue) = calculateDetailedAmounts(loanId);

        // Aggiorna l'importo totale rimborsato
        loan.repaidAmount += msg.value;

        // Aggiorna la data dell'ultimo pagamento
        loan.lastRepaymentDate = block.timestamp;

        // Se ci sono penali, aggiorna il contatore delle penali pagate
        if (penaltyDue > 0) {
            uint penaltyPayment = min(msg.value, penaltyDue);
            loan.paidPenalties += penaltyPayment;
        }

        // Trasferisci il pagamento al prestatore
        payable(loan.lender).transfer(msg.value);

        emit PartialPayment(loanId, msg.value);

        // Verifica se il prestito è stato completamente ripagato
        if (loan.repaidAmount >= totalDue) {
            loan.state = LoanState.Repaid;
            emit LoanRepaid(loanId, msg.sender, loan.repaidAmount);
        }
    }

    function getLoanPaymentDetails(uint loanId) public view returns (
        uint paidPenalties,
        uint totalPaid,
        uint remainingAmount
    ) {
        Loan storage loan = loans[loanId];

        uint totalDue = calculateTotalDue(loanId);
        return (
            loan.paidPenalties,
            loan.repaidAmount,
            totalDue - loan.repaidAmount
        );
    }

    function extendLoanDuration(uint loanId, uint additionalDays) 
        public 
        onlyLoanParties(loanId) 
        notPaused 
    {
        Loan storage loan = loans[loanId];
        require(loan.state == LoanState.Active, "Loan is not active");
        require(additionalDays > 0, "Must extend by at least 1 day");

        loan.duration += additionalDays;
        loan.endDate += additionalDays * 1 days;

        emit LoanExtended(loanId, loan.endDate);
    }

    function renegotiateInterestRate(uint loanId, uint newRate) 
        public 
        onlyLoanParties(loanId) 
        notPaused 
    {
        Loan storage loan = loans[loanId];
        require(loan.state == LoanState.Active, "Loan is not active");
        uint oldRate = loan.interestRate;
        loan.interestRate = newRate;
        emit InterestRateChanged(loanId, oldRate, newRate);
    }

    function proposeRateChange(uint newRate) public notPaused {
        require(stakingBalances[msg.sender] > 0, "Must have stake to propose");
        uint proposalId = proposalIdCounter++;
        Proposal storage proposal = proposals[proposalId];
        proposal.proposalId = proposalId;
        proposal.newRate = newRate;
        proposal.endTime = block.timestamp + VOTING_PERIOD;
        proposal.state = ProposalState.Active;
        emit ProposalCreated(proposalId, newRate);
    }

    function vote(uint proposalId, bool support) public notPaused {
        require(stakingBalances[msg.sender] > 0, "Must have stake to vote");
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(block.timestamp < proposal.endTime, "Voting period ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        if (support) {
            proposal.votesFor++;
        } else {
            proposal.votesAgainst++;
        }

        proposal.hasVoted[msg.sender] = true;

        if (block.timestamp >= proposal.endTime) {
            finalizeProposal(proposalId);
        }
    }

    function finalizeProposal(uint proposalId) public {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(block.timestamp >= proposal.endTime, "Voting period not ended");

        if (proposal.votesFor + proposal.votesAgainst >= MINIMUM_VOTES && 
            proposal.votesFor > proposal.votesAgainst) {
            defaultInterestRate = proposal.newRate;
            proposal.state = ProposalState.Approved;
        } else {
            proposal.state = ProposalState.Rejected;
        }

        emit ProposalCompleted(proposalId, proposal.state == ProposalState.Approved);
    }

    // Modifica la funzione calculateTotalDue
    function calculateTotalDue(uint loanId) public view returns (uint) {
        Loan storage loan = loans[loanId];
        require(loan.state == LoanState.Active, "Loan is not active");

        // Calcola gli interessi base
        uint interest = calculateLoanInterest(loan.amount, loan.interestRate, loan.duration);
        uint totalDue = loan.amount + interest;

        // Aggiungi eventuali penali se il prestito è scaduto
        if (block.timestamp > loan.endDate) {
            uint daysLate = (block.timestamp - loan.endDate) / 1 days;
            uint penalty = calculateLoanPenalty(loan.amount, DEFAULT_PENALTY_RATE, daysLate);
            totalDue += penalty;
        }

        return totalDue;
    }

    function calculateLoanInterest(
        uint amount, 
        uint rate, 
        uint durationInDays
    ) public view returns (uint) {
        return interestLib.calculateInterest(amount, rate, durationInDays);
    }

    function calculateLoanPenalty(
        uint amount, 
        uint rate, 
        uint numberOfDays
    ) public view returns (uint) {
        return interestLib.calculatePenalty(amount, rate, numberOfDays);
    }

    // Inserisci qui la funzione helper min
    function min(uint a, uint b) internal pure returns (uint) {
            return a < b ? a : b;
    }
    

    // Funzioni amministrative
    function setBorrowerLimit(address borrower, uint limit) public onlyOwner {
        borrowerLimits[borrower] = limit;
    }

    function setAuthorizedLender(address lender, bool authorized) public onlyOwner {
        authorizedLenders[lender] = authorized;
    }

    // Nuove funzioni getter
    function getStakeBalance(address staker) public view returns (uint) {
        return stakingBalances[staker];
    }

    function getProposal(uint proposalId) public view returns (
        uint _proposalId,
        uint newRate,
        uint votesFor,
        uint votesAgainst,
        uint endTime,
        ProposalState state
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.proposalId,
            proposal.newRate,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.endTime,
            proposal.state
        );
    }

    function getLoanState(uint loanId) public view returns (LoanState) {
        return loans[loanId].state;
    }

    function getRemainingAmount(uint loanId) public view returns (uint) {
        uint totalDue = calculateTotalDue(loanId);
        return totalDue - loans[loanId].repaidAmount;
    }

    function getLoanBasicDetails(uint loanId) public view returns (
        address borrower,
        address lender,
        uint amount,
        uint interestRate,
        uint duration,
        uint startDate
    ) {
        Loan storage loan = loans[loanId];
        return (
            loan.borrower,
            loan.lender,
            loan.amount,
            loan.interestRate,
            loan.duration,
            loan.startDate
        );
    }

    function getLoanExtendedDetails(uint loanId) public view returns (
        uint endDate,
        LoanState state,
        uint repaidAmount,
        uint lastRepaymentDate,
        uint remainingAmount,
        uint totalDue
    ) {
        Loan storage loan = loans[loanId];
        return (
            loan.endDate,
            loan.state,
            loan.repaidAmount,
            loan.lastRepaymentDate,
            getRemainingAmount(loanId),
            calculateTotalDue(loanId)
        );
    }


    function getTotalLoans() public view returns (uint) {
        return loanIdCounter;
    }

    function getTotalProposals() public view returns (uint) {
        return proposalIdCounter;
    }

    function hasVotedForProposal(uint proposalId, address voter) public view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }

    function getTotalStaked() public view returns (uint) {
        return address(this).balance;
    }
}
