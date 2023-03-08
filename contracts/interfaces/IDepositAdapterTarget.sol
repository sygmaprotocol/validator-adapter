// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

interface IDepositAdapterTarget {
    function execute(address originDepositor, bytes calldata depositData) external;
}