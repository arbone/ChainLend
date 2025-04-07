// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract InterestLib {
    function calculateInterest(
        uint amount,
        uint annualRate,
        uint durationInDays
    ) external pure returns (uint) {
        return (amount * annualRate * durationInDays) / (365 * 100);
    }

    function calculatePenalty(
        uint amount,
        uint dailyPenaltyRate,
        uint lateDays
    ) external pure returns (uint) {
        return (amount * dailyPenaltyRate * lateDays) / 100;
    }
}
