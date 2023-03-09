// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

/**
    @title Interface for handler that handles generic deposits and deposit executions.
    @author ChainSafe Systems.
 */
interface IHandler {
    /**
        @notice It is intended that deposit are made using the Bridge contract.
        @param resourceID ResourceID used to find address of handler to be used for deposit.
        @param depositor Address of account making the deposit in the Bridge contract.
        @param data Consists of additional data needed for a specific deposit.
     */
    function deposit(bytes32 resourceID, address depositor, bytes calldata data) external returns (bytes memory);
}
