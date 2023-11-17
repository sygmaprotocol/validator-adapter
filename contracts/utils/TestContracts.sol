// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

import "../interfaces/IBridge.sol";

/*
    This is a test contract that combines Sygma Bridge and PermissionlessGenericHandler contracts.
    It simulates a deposit call to the Bridge that use PermissionlessGenericHandler on the origin chain
    and then simulates executeProposal and performs the target call on the same chain.
    It allows simulating both origin and target parts of the bridged call on the same chain.
*/
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

    /*
        @notice This is an entry point for the contract.
        External contracts should call this function and pass the depositData
        that should be used by the PermissionlessGenericHandler.
        The contract unpacks the data in the same way as PermissionlessGenericHandler does
        and then performs the target call.
    */
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

    /*
        @notice This function unpacks the data in the same way as PermissionlessGenericHandler
        and performs the target call.
        @param resourceID ResourceID (not used in this test contract).
        @param data Structure should be constructed as follows:
          maxFee:                             uint256  bytes  0                                                             -  32
          len(executeFuncSignature):          uint16   bytes  32                                                            -  34
          executeFuncSignature:               bytes    bytes  34                                                            -  34 + len(executeFuncSignature)
          len(executeContractAddress):        uint8    bytes  34 + len(executeFuncSignature)                                -  35 + len(executeFuncSignature)
          executeContractAddress              bytes    bytes  35 + len(executeFuncSignature)                                -  35 + len(executeFuncSignature) + len(executeContractAddress)
          len(executionDataDepositor):        uint8    bytes  35 + len(executeFuncSignature) + len(executeContractAddress)  -  36 + len(executeFuncSignature) + len(executeContractAddress)
          executionDataDepositor:             bytes    bytes  36 + len(executeFuncSignature) + len(executeContractAddress)                                -  36 + len(executeFuncSignature) + len(executeContractAddress) + len(executionDataDepositor)
          executionData:                      bytes    bytes  36 + len(executeFuncSignature) + len(executeContractAddress) + len(executionDataDepositor)  -  END

          executionData is repacked together with executionDataDepositor address for using it in the target contract.
          If executionData contains dynamic types then it is necessary to keep the offsets correct.
          executionData should be encoded together with a 32-byte address and then passed as a parameter without that address.
    */
    function _executeProposal(bytes32 resourceID, bytes calldata data) internal returns (bool success) {
        uint16 lenExecuteFuncSignature;
        bytes4 executeFuncSignature;
        uint8 lenExecuteContractAddress;
        address executeContractAddress;
        uint8 lenExecutionDataDepositor;
        address executionDataDepositor;
        bytes memory executionData;
        uint pointer = 32; // lenth of maxFee

        lenExecuteFuncSignature = uint16(bytes2(data[pointer:pointer += 2]));
        executeFuncSignature = bytes4(data[pointer:pointer += lenExecuteFuncSignature]);
        lenExecuteContractAddress = uint8(bytes1(data[pointer:pointer += 1]));
        executeContractAddress = address(uint160(bytes20(data[pointer:pointer += lenExecuteContractAddress])));
        lenExecutionDataDepositor = uint8(bytes1(data[pointer:pointer += 1]));
        executionDataDepositor = address(uint160(bytes20(data[pointer:pointer += lenExecutionDataDepositor])));
        executionData = bytes(data[pointer:]);

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
