// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

import "../interfaces/IBridge.sol";

contract TestBridge {
    error CallReverted();

    event Deposit(
        uint8 destinationDomainID,
        bytes32 resourceID,
        uint64 depositNonce,
        address indexed user,
        bytes data,
        bytes handlerResponse
    );

    function deposit(
        uint8 destinationDomainID,
        bytes32 resourceID,
        bytes calldata depositData,
        bytes calldata feeData
    ) external payable returns (uint64 depositNonce, bytes memory handlerResponse) {
        emit Deposit(destinationDomainID, resourceID, 1, msg.sender, depositData, feeData);

        bool success = _executeProposal(resourceID, depositData);

        if (!success) revert CallReverted();

        return (1, bytes("2"));
    }

    function _executeProposal(bytes32 resourceID, bytes calldata data) internal returns (bool success) {
        uint16 lenExecuteFuncSignature;
        bytes4 executeFuncSignature;
        uint8 lenExecuteContractAddress;
        address executeContractAddress;
        uint8 lenExecutionDataDepositor;
        address executionDataDepositor;
        bytes memory executionData;

        lenExecuteFuncSignature = uint16(bytes2(data[32:34]));
        executeFuncSignature = bytes4(data[34:34 + lenExecuteFuncSignature]);
        lenExecuteContractAddress = uint8(bytes1(data[34 + lenExecuteFuncSignature:35 + lenExecuteFuncSignature]));
        executeContractAddress = address(
            uint160(
                bytes20(data[35 + lenExecuteFuncSignature:35 + lenExecuteFuncSignature + lenExecuteContractAddress])
            )
        );
        lenExecutionDataDepositor = uint8(
            bytes1(
                data[35 + lenExecuteFuncSignature + lenExecuteContractAddress:36 +
                    lenExecuteFuncSignature +
                    lenExecuteContractAddress]
            )
        );
        executionDataDepositor = address(
            uint160(
                bytes20(
                    data[36 + lenExecuteFuncSignature + lenExecuteContractAddress:36 +
                        lenExecuteFuncSignature +
                        lenExecuteContractAddress +
                        lenExecutionDataDepositor]
                )
            )
        );
        executionData = bytes(
            data[36 + lenExecuteFuncSignature + lenExecuteContractAddress + lenExecutionDataDepositor:]
        );

        bytes memory callData = abi.encodePacked(
            executeFuncSignature,
            abi.encode(executionDataDepositor),
            executionData
        );
        (success, ) = executeContractAddress.call(callData);
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
