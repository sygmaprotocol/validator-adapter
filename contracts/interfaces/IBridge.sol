// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

/**
    @title Interface for Bridge contract.
    @author ChainSafe Systems.
 */
interface IBridge {
    /**
        @notice Exposing getter for {_domainID} instead of forcing the use of call.
        @return uint8 The {_domainID} that is currently set for the Bridge contract.
     */
    function _domainID() external returns (uint8);

    /**
        @notice Exposing getter for {_resourceIDToHandlerAddress}.
        @param resourceID ResourceID to be used when making deposits.
        @return address The {handlerAddress} that is currently set for the resourceID.
     */
    function _resourceIDToHandlerAddress(bytes32 resourceID) external view returns (address);

    /**
        @notice Initiates a transfer using a specified handler contract.
        @notice Only callable when Bridge is not paused.
        @param destinationDomainID ID of chain deposit will be bridged to.
        @param resourceID ResourceID used to find address of handler to be used for deposit.
        @param depositData Additional data to be passed to specified handler.
        @param feeData Additional data to be passed to the fee handler.
        @notice Emits {Deposit} event with all necessary parameters and a handler response.
        - ERC20Handler: responds with an empty data.
        - ERC721Handler: responds with the deposited token metadata acquired by calling a tokenURI method in the token contract.
        - PermissionedGenericHandler: responds with the raw bytes returned from the call to the target contract.
        - PermissionlessGenericHandler: responds with an empty data.
     */
    function deposit(uint8 destinationDomainID, bytes32 resourceID, bytes calldata depositData, bytes calldata feeData) external payable;
}