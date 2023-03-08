// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

import "./utils/AccessControl.sol";
import "./interfaces/IBridge.sol";
import "./interfaces/IDepositContract.sol";
import "./interfaces/IDepositAdapterTarget.sol";

/**
    @title Receives messages for making deposits to Goerli deposit contract.
    @author ChainSafe Systems.
    @notice This contract is intended to be used with the Bridge contract and Permissionless Generic handler.
 */
contract DepositAdapterOrigin is AccessControl {
    IBridge public immutable _bridgeAddress;
    bytes32 public immutable _resourceID;
    address public _targetDepositAdapter;
    uint256 public _depositFee;

    event FeeChanged(
        uint256 newFee
    );

    event DepositAdapterTargetChanged(
        address newDepositAdapter
    );

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "DepositOrigin: sender doesn't have admin role");
        _;
    }

    /**
        @param bridgeAddress Contract address of previously deployed Bridge.
     */
    constructor(IBridge bridgeAddress, bytes32 resourceID) {
        _bridgeAddress = bridgeAddress;
        _resourceID = resourceID;
        _depositFee = 3.2 ether;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
        @notice Sets new value of the fee.
        @notice Only callable by admin.
        @param newFee Value {_fee} will be updated to.
     */
    function changeFee(uint256 newFee) external onlyAdmin {
        require(_depositFee != newFee, "DepositOrigin: current fee is equal to new fee");
        _depositFee = newFee;
        emit FeeChanged(newFee);
    }

    /**
        @notice Sets new address of the deposit adapter on the target chain (used for checks on source chain).
        @notice Only callable by admin.
        @param targetDepositAdapter Value {_targetDepositAdapter} will be updated to.
     */
    function changeTargetAdapter(address targetDepositAdapter) external onlyAdmin {
        require(_targetDepositAdapter != targetDepositAdapter, "DepositOrigin: new deposit adapter address is equal to old");
        _targetDepositAdapter = targetDepositAdapter;
        emit DepositAdapterTargetChanged(targetDepositAdapter);
    }

    function deposit(
        uint8 destinationDomainID,
        bytes calldata depositContractCalldata,
        bytes calldata feeData
    ) external payable {
        // Collect fee
        require(msg.value >= _depositFee, "DepositOrigin: incorrect fee supplied");
        // Check input data
        bytes memory withdrawal_credentials;
        (, withdrawal_credentials, ,) = abi.decode(depositContractCalldata, (bytes, bytes, bytes, bytes32));
        require(withdrawal_credentials.length == 32,
            "DepositOrigin: invalid withdrawal_credentials length");
        bytes32 credentials = bytes32(withdrawal_credentials);
        address depositAdapter = _targetDepositAdapter;
        require(credentials == bytes32(abi.encodePacked(hex"010000000000000000000000", depositAdapter)),
            "DepositOrigin: wrong withdrawal_credentials address");
        // TODO: deposit to bridge
        
    //       maxFee:                       uint256  bytes  0                                                                                           -  32
    //       len(executeFuncSignature):    uint16   bytes  32                                                                                          -  34
    //       executeFuncSignature:         bytes    bytes  34                                                                                          -  34 + len(executeFuncSignature)
    //       len(executeContractAddress):  uint8    bytes  34 + len(executeFuncSignature)                                                              -  35 + len(executeFuncSignature)
    //       executeContractAddress        bytes    bytes  35 + len(executeFuncSignature)                                                              -  35 + len(executeFuncSignature) + len(executeContractAddress)
    //       len(executionDataDepositor):  uint8    bytes  35 + len(executeFuncSignature) + len(executeContractAddress)                                -  36 + len(executeFuncSignature) + len(executeContractAddress)
    //       executionDataDepositor:       bytes    bytes  36 + len(executeFuncSignature) + len(executeContractAddress)                                -  36 + len(executeFuncSignature) + len(executeContractAddress) + len(executionDataDepositor)
    //       executionData:                bytes    bytes  36 + len(executeFuncSignature) + len(executeContractAddress) + len(executionDataDepositor)  -  END
        bytes memory depositData = abi.encodePacked(
            uint256(0),
            uint16(4),
            IDepositAdapterTarget(address(0)).execute.selector,
            uint8(20),
            _targetDepositAdapter,
            uint8(32),
            abi.encode(address(this), depositContractCalldata)
        );
        IBridge(_bridgeAddress).deposit{value: msg.value - _depositFee}(destinationDomainID, _resourceID, depositData, feeData);
    }
}