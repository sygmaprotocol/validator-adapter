import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositAdapter E2E test", function () {
  async function deployFixture() {
    const resourceID = "0x0000000000000000000000000000000000000000000000000000000000000500";
    const destinationDomainID = 2;

    const TestBridgeContract = await ethers.getContractFactory("TestBridge");
    const testBridgeInstance = await TestBridgeContract.deploy();

    const TestDepositContract = await ethers.getContractFactory("TestDeposit");
    const testDepositInstance = await TestDepositContract.deploy();

    const DepositAdapterOriginContract = await ethers.getContractFactory("DepositAdapterOrigin");
    const depositAdapterOriginInstance = await DepositAdapterOriginContract.deploy(testBridgeInstance.address, resourceID);

    const DepositAdapterTargetContract = await ethers.getContractFactory("DepositAdapterTarget");
    const depositAdapterTargetInstance = await DepositAdapterTargetContract.deploy(testBridgeInstance.address, testDepositInstance.address);

    await depositAdapterOriginInstance.changeTargetAdapter(depositAdapterTargetInstance.address);
    await depositAdapterTargetInstance.setOriginAdapter(depositAdapterOriginInstance.address, true);

    const [sender] = await ethers.getSigners();
    let tx = {
      to: depositAdapterTargetInstance.address,
      value: ethers.utils.parseEther("32")
    };
    await sender.sendTransaction(tx);

    return { resourceID, destinationDomainID, depositAdapterOriginInstance, DepositAdapterTargetContract, depositAdapterTargetInstance, testBridgeInstance, testDepositInstance };
  }

  it("Should make a deposit call", async function () {
    const { resourceID, destinationDomainID, depositAdapterOriginInstance, DepositAdapterTargetContract, depositAdapterTargetInstance, testBridgeInstance, testDepositInstance } = await loadFixture(deployFixture);
    const pubkey = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
    const withdrawal_credentials = "0x010000000000000000000000" + depositAdapterTargetInstance.address.substring(2);
    const signature = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
    const deposit_data_root = ethers.utils.formatBytes32String("0x11");

    const abiCoder = ethers.utils.defaultAbiCoder;
    const executionData = abiCoder.encode([ "bytes", "bytes", "bytes", "bytes32" ], [ pubkey, withdrawal_credentials, signature, deposit_data_root ]);

    const functionSig = DepositAdapterTargetContract.interface.getSighash("execute");

      //   bytes memory depositData = abi.encodePacked(
      //     uint256(0),
      //     uint16(4),
      //     IDepositAdapterTarget(address(0)).execute.selector,
      //     uint8(20),
      //     _targetDepositAdapter,
      //     uint8(20),
      //     address(this)
      //     depositContractCalldata
      // );

    const depositData = ethers.utils.hexZeroPad("0x0", 32)
      + "0004"
      + functionSig.substring(2)
      + "14"
      + depositAdapterTargetInstance.address.toLowerCase().substring(2)
      + "14"
      + depositAdapterOriginInstance.address.toLowerCase().substring(2)
      + abiCoder.encode(["address", "bytes"], [ethers.constants.AddressZero, executionData]).substring(66);

    await expect(depositAdapterOriginInstance.deposit(
      destinationDomainID,
      executionData, "0x", {value: ethers.utils.parseEther("4")}))
      .to.emit(testBridgeInstance, "Deposit")
      .withArgs(
        destinationDomainID,
        resourceID,
        1,
        depositAdapterOriginInstance.address,
        depositData,
        "0x")
      .and.to.emit(depositAdapterTargetInstance, "Deposit")
      .withArgs(pubkey, withdrawal_credentials, signature, deposit_data_root)
      .and.to.changeEtherBalance(testDepositInstance.address, ethers.utils.parseEther("32"));
  });
});
