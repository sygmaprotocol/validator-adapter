import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositAdapterOrigin", function () {
  async function deployFixture() {
    const bridgeAddress = "0x9a8F70222FB768e16FE343c9EbA8634e4bd6524A";
    const resourceID = "0x0000000000000000000000000000000000000000000000000000000000000500";

    const DepositAdapterOriginContract = await ethers.getContractFactory("DepositAdapterOrigin");
    const depositAdapterOriginInstance = await DepositAdapterOriginContract.deploy(bridgeAddress, resourceID);

    return depositAdapterOriginInstance;
  }

  async function deployFixtureWithBridge() {
    const resourceID = "0x0000000000000000000000000000000000000000000000000000000000000500";
    const destinationDomainID = 2;
    const targetAddress = "0x4Bcb6F81acedCCF5606EE7A392FD024b6C9192B2";

    const TestBridgeContract = await ethers.getContractFactory("TestBridge");
    const testBridgeInstance = await TestBridgeContract.deploy();

    const DepositAdapterOriginContract = await ethers.getContractFactory("DepositAdapterOrigin");
    const depositAdapterOriginInstance = await DepositAdapterOriginContract.deploy(testBridgeInstance.address, resourceID);

    await depositAdapterOriginInstance.changeTargetAdapter(targetAddress);

    return { resourceID, destinationDomainID, targetAddress, depositAdapterOriginInstance, testBridgeInstance };
  }

  describe("changeFee", function () {
    it("Should set the new value of the fee", async function () {
      const newFee = ethers.utils.parseEther("5");
      const depositAdapterOriginInstance = await loadFixture(deployFixture);
      await expect(depositAdapterOriginInstance.changeFee(newFee))
          .to.emit(depositAdapterOriginInstance, "FeeChanged")
          .withArgs(newFee); 
      expect(await depositAdapterOriginInstance._depositFee()).to.equal(newFee);
    });

    it("Should NOT set the same value of the fee", async function () {
      const newFee = ethers.utils.parseEther("3.2");
      const depositAdapterOriginInstance = await loadFixture(deployFixture);
      await expect(depositAdapterOriginInstance.changeFee(newFee))
          .to.be.revertedWith(
            "DepositOrigin: current fee is equal to new fee"
          );
    });

    it("Should NOT set the fee if the sender doesn't have admin rights", async function () {
      const newFee = ethers.utils.parseEther("3.2");
      const depositAdapterOriginInstance = await loadFixture(deployFixture);
      const [, otherAccount] = await ethers.getSigners();
      await expect(depositAdapterOriginInstance.connect(otherAccount).changeFee(newFee))
          .to.be.revertedWith(
            "DepositOrigin: sender doesn't have admin role"
          );
    });
  });

  describe("deposit", function () {
    it("Should make a deposit call", async function () {
      const { resourceID, destinationDomainID, targetAddress, depositAdapterOriginInstance, testBridgeInstance } = await loadFixture(deployFixtureWithBridge);
      const pubkey = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const withdrawal_credentials = "0x010000000000000000000000" + targetAddress.substring(2);
      const signature = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const deposit_data_root = ethers.utils.formatBytes32String("0x11");

      const abiCoder = ethers.utils.defaultAbiCoder;
      const executionData = abiCoder.encode([ "bytes", "bytes", "bytes", "bytes32" ], [ pubkey, withdrawal_credentials, signature, deposit_data_root ]);

      const DepositAdapterTargetContract = await ethers.getContractFactory("DepositAdapterTarget");
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
        + targetAddress.toLowerCase().substring(2)
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
          "0x");
    });

    it("Should NOT make a deposit if incorrect fee is supplied", async function () {
      const { destinationDomainID, targetAddress, depositAdapterOriginInstance } = await loadFixture(deployFixtureWithBridge);
      const pubkey = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const withdrawal_credentials = "0x010000000000000000000000" + targetAddress.substring(2);
      const signature = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const deposit_data_root = ethers.utils.formatBytes32String("0x11");

      const abiCoder = ethers.utils.defaultAbiCoder;
      const executionData = abiCoder.encode([ "bytes", "bytes", "bytes", "bytes32" ], [ pubkey, withdrawal_credentials, signature, deposit_data_root ]);

      await expect(depositAdapterOriginInstance.deposit(
      destinationDomainID,
      executionData, "0x", {value: ethers.utils.parseEther("3")}))
        .to.be.revertedWith("DepositOrigin: incorrect fee supplied");
    });

    it("Should NOT make a deposit if withdrawal_credentials length is incorrect", async function () {
      const { destinationDomainID, targetAddress, depositAdapterOriginInstance } = await loadFixture(deployFixtureWithBridge);
      const pubkey = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const withdrawal_credentials = "0x010000000000000000000000" + targetAddress.substring(4);
      const signature = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const deposit_data_root = ethers.utils.formatBytes32String("0x11");

      const abiCoder = ethers.utils.defaultAbiCoder;
      const executionData = abiCoder.encode([ "bytes", "bytes", "bytes", "bytes32" ], [ pubkey, withdrawal_credentials, signature, deposit_data_root ]);

      await expect(depositAdapterOriginInstance.deposit(
      destinationDomainID,
      executionData, "0x", {value: ethers.utils.parseEther("4")}))
        .to.be.revertedWith("DepositOrigin: invalid withdrawal_credentials length");
    });

    it("Should NOT make a deposit if address in withdrawal_credentials is not _targetDepositAdapter", async function () {
      const { destinationDomainID, depositAdapterOriginInstance } = await loadFixture(deployFixtureWithBridge);
      const fakeAddress = "0xcafecafecafecafecafecafecafecafecafecafe";
      const pubkey = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const withdrawal_credentials = "0x010000000000000000000000" + fakeAddress.substring(2);
      const signature = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const deposit_data_root = ethers.utils.formatBytes32String("0x11");

      const abiCoder = ethers.utils.defaultAbiCoder;
      const executionData = abiCoder.encode([ "bytes", "bytes", "bytes", "bytes32" ], [ pubkey, withdrawal_credentials, signature, deposit_data_root ]);

      await expect(depositAdapterOriginInstance.deposit(
      destinationDomainID,
      executionData, "0x", {value: ethers.utils.parseEther("4")}))
        .to.be.revertedWith("DepositOrigin: wrong withdrawal_credentials address");
    });
  });

  describe("withdraw", function () {
    async function deployAndDeposit() {
      const { resourceID, destinationDomainID, targetAddress, depositAdapterOriginInstance, testBridgeInstance } = await loadFixture(deployFixtureWithBridge);
      const pubkey = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const withdrawal_credentials = "0x010000000000000000000000" + targetAddress.substring(2);
      const signature = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const deposit_data_root = ethers.utils.formatBytes32String("0x11");
      const amount = ethers.utils.parseEther("4");
      const fee = ethers.utils.parseEther("3.2");

      const abiCoder = ethers.utils.defaultAbiCoder;
      const executionData = abiCoder.encode([ "bytes", "bytes", "bytes", "bytes32" ], [ pubkey, withdrawal_credentials, signature, deposit_data_root ]);

      const DepositAdapterTargetContract = await ethers.getContractFactory("DepositAdapterTarget");
      const functionSig = DepositAdapterTargetContract.interface.getSighash("execute");

        //   bytes memory depositData = abi.encodePacked(
        //     uint256(0),
        //     uint16(4),
        //     IDepositAdapterTarget(address(0)).execute.selector,
        //     uint8(20),
        //     _targetDepositAdapter,
        //     uint8(20),
        //     address(this), 
        //     depositContractCalldata
        // );
        
      const depositData = ethers.utils.hexZeroPad("0x0", 32)
        + "0004"
        + functionSig.substring(2)
        + "14"
        + targetAddress.toLowerCase().substring(2)
        + "14"
        + depositAdapterOriginInstance.address.toLowerCase().substring(2)
        + abiCoder.encode(["address", "bytes"], [ethers.constants.AddressZero, executionData]).substring(66);
      await expect(depositAdapterOriginInstance.deposit(
      destinationDomainID,
      executionData, "0x", {value: amount}))
        .to.emit(testBridgeInstance, "Deposit")
        .withArgs(
          destinationDomainID,
          resourceID,
          1,
          depositAdapterOriginInstance.address,
          depositData,
          "0x")
          .and.to.changeEtherBalance(depositAdapterOriginInstance.address, fee);

      return { depositAdapterOriginInstance };
    }

    it("Should withdraw eth from the contract", async function () {
      const { depositAdapterOriginInstance } = await loadFixture(deployAndDeposit);
      const [, otherAccount] = await ethers.getSigners();
      const amount = ethers.utils.parseEther("1");
      const negAmount = ethers.utils.parseEther("-1");
      await expect(depositAdapterOriginInstance.withdraw(otherAccount.address, amount))
        .to.emit(depositAdapterOriginInstance, "Withdrawal")
        .withArgs(otherAccount.address, amount)
        .and.to.changeEtherBalances([depositAdapterOriginInstance.address, otherAccount.address], [negAmount, amount]);
    });

    it("Should NOT withdraw eth if the sender doesn't have admin rights", async function () {
      const { depositAdapterOriginInstance } = await loadFixture(deployAndDeposit);
      const [, otherAccount] = await ethers.getSigners();
      const amount = ethers.utils.parseEther("1");
      await expect(depositAdapterOriginInstance.connect(otherAccount).withdraw(otherAccount.address, amount))
      .to.be.revertedWith(
        "DepositOrigin: sender doesn't have admin role"
      );
    });

    it("Should revert if not enough balance", async function () {
      const { depositAdapterOriginInstance } = await loadFixture(deployAndDeposit);
      const [, otherAccount] = await ethers.getSigners();
      const amount = ethers.utils.parseEther("40");
      await expect(depositAdapterOriginInstance.withdraw(otherAccount.address, amount))
      .to.be.revertedWith(
        "DepositOrigin: not enough balance"
      );
    });

    it("Should revert if withdrawal fails", async function () {
      const { depositAdapterOriginInstance } = await loadFixture(deployAndDeposit);
      const TestDepositContract = await ethers.getContractFactory("TestDeposit");
      const testDepositInstance = await TestDepositContract.deploy();
      const amount = ethers.utils.parseEther("1");
      await expect(depositAdapterOriginInstance.withdraw(testDepositInstance.address, amount))
      .to.be.revertedWith(
        "DepositOrigin: withdrawal failed"
      );
    });
  });
});
