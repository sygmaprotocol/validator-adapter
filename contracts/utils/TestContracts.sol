// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

import "../interfaces/IBridge.sol";

contract TestBridge {
    event Deposit(
        uint8   destinationDomainID,
        bytes32 resourceID,
        uint64  depositNonce,
        address indexed user,
        bytes   data,
        bytes   handlerResponse
    );

    function deposit(uint8 destinationDomainID, bytes32 resourceID, bytes calldata depositData, bytes calldata feeData) external payable {
        emit Deposit(destinationDomainID, resourceID, 1, msg.sender, depositData, feeData);
    }
}

contract TestDeposit {
    event Deposit(
        bytes   pubkey,
        bytes   withdrawal_credentials,
        bytes   signature,
        bytes32 deposit_data_root
    );

    function deposit(
        bytes calldata pubkey,
        bytes calldata withdrawal_credentials,
        bytes calldata signature,
        bytes32 deposit_data_root
    ) external payable {
        emit Deposit(pubkey, withdrawal_credentials, signature, deposit_data_root);
    }
}