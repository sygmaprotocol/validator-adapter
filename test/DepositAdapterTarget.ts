import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositAdapterTarget", function () {
  async function deployFixture() {
    const [sender, otherAccount] = await ethers.getSigners();
    const originAddress = "0xff50ed3d0ec03aC01D4C79aAd74928BFF48a7b2b";

    const TestDepositContract = await ethers.getContractFactory("TestDeposit");
    const testDepositInstance = await TestDepositContract.deploy();

    const DepositAdapterTargetContract = await ethers.getContractFactory("DepositAdapterTarget");
    const depositAdapterTargetInstance = await DepositAdapterTargetContract.deploy(sender.address, testDepositInstance.address);

    await depositAdapterTargetInstance.changeOriginAdapter(originAddress);
    let tx = {
      to: depositAdapterTargetInstance.address,
      value: ethers.utils.parseEther("32")
    };
    await sender.sendTransaction(tx);

    return { sender, otherAccount, originAddress, testDepositInstance, depositAdapterTargetInstance };
  }

  describe("constructor", function () {
    it("Should NOT deploy the contract if depositContract has no code", async function () {
      const [sender] = await ethers.getSigners();
    const testDepositAddress = "0xff50ed3d0ec03aC01D4C79aAd74928BFF48a7b2b";

    const DepositAdapterTargetContract = await ethers.getContractFactory("DepositAdapterTarget");
    await expect(DepositAdapterTargetContract.deploy(sender.address, testDepositAddress))
    .to.be.revertedWith(
      "DepositTarget: invalid deposit contract"
    );
  });
});

  describe("changeOriginAdapter", function () {
    it("Should set the new origin adapter", async function () {
      const newAdapter = "0xCAfEcAfeCAfECaFeCaFecaFecaFECafECafeCaFe";
      const { depositAdapterTargetInstance } = await loadFixture(deployFixture);
      await expect(depositAdapterTargetInstance.changeOriginAdapter(newAdapter))
          .to.emit(depositAdapterTargetInstance, "DepositAdapterOriginChanged")
          .withArgs(newAdapter); 
      expect(await depositAdapterTargetInstance._depositAdapterOrigin()).to.equal(newAdapter);
    });

    it("Should NOT set the same origin adapter", async function () {
      const newAdapter = "0xCAfEcAfeCAfECaFeCaFecaFecaFECafECafeCaFe";
      const { depositAdapterTargetInstance } = await loadFixture(deployFixture);
      await expect(depositAdapterTargetInstance.changeOriginAdapter(newAdapter))
        .to.emit(depositAdapterTargetInstance, "DepositAdapterOriginChanged")
        .withArgs(newAdapter); 
      await expect(depositAdapterTargetInstance.changeOriginAdapter(newAdapter))
          .to.be.revertedWith(
            "DepositTarget: new deposit adapter address is equal to old"
          );
    });

    it("Should NOT set the origin adapter if the sender doesn't have admin rights", async function () {
      const newAdapter = "0xCAfEcAfeCAfECaFeCaFecaFecaFECafECafeCaFe";
      const { otherAccount, depositAdapterTargetInstance } = await loadFixture(deployFixture);
      await expect(depositAdapterTargetInstance.connect(otherAccount).changeOriginAdapter(newAdapter))
          .to.be.revertedWith(
            "DepositTarget: sender doesn't have admin role"
          );
    });
  });

  describe("deposit", function () {
    it("Should make a deposit call", async function () {
      const { testDepositInstance, depositAdapterTargetInstance, originAddress } = await loadFixture(deployFixture);
      const pubkey = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const withdrawal_credentials = "0x010000000000000000000000" + depositAdapterTargetInstance.address.toLowerCase().substring(2);
      const signature = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const deposit_data_root = ethers.utils.formatBytes32String("0x11");

      const abiCoder = ethers.utils.defaultAbiCoder;
      const executionData = abiCoder.encode([ "bytes", "bytes", "bytes", "bytes32" ], [ pubkey, withdrawal_credentials, signature, deposit_data_root ]);

      await expect(depositAdapterTargetInstance.execute(originAddress, executionData))
        .to.emit(testDepositInstance, "Deposit")
        .withArgs(pubkey, withdrawal_credentials, signature, deposit_data_root)
        .and.to.changeEtherBalance(testDepositInstance.address, ethers.utils.parseEther("32"));
    });

    it("Should NOT make a deposit if sender is not handler", async function () {
      const { otherAccount, originAddress, depositAdapterTargetInstance } = await loadFixture(deployFixture);
      const pubkey = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const withdrawal_credentials = "0x010000000000000000000000" + depositAdapterTargetInstance.address.toLowerCase().substring(2);
      const signature = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const deposit_data_root = ethers.utils.formatBytes32String("0x11");

      const abiCoder = ethers.utils.defaultAbiCoder;
      const executionData = abiCoder.encode([ "bytes", "bytes", "bytes", "bytes32" ], [ pubkey, withdrawal_credentials, signature, deposit_data_root ]);

      await expect(depositAdapterTargetInstance.connect(otherAccount).execute(originAddress, executionData))
        .to.be.revertedWith(
          "DepositTarget: sender must be handler contract"
        );
    });

    it("Should NOT make a deposit if origin depositor is incorrect", async function () {
      const { otherAccount, depositAdapterTargetInstance } = await loadFixture(deployFixture);
      const pubkey = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const withdrawal_credentials = "0x010000000000000000000000" + depositAdapterTargetInstance.address.toLowerCase().substring(2);
      const signature = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const deposit_data_root = ethers.utils.formatBytes32String("0x11");

      const abiCoder = ethers.utils.defaultAbiCoder;
      const executionData = abiCoder.encode([ "bytes", "bytes", "bytes", "bytes32" ], [ pubkey, withdrawal_credentials, signature, deposit_data_root ]);

      await expect(depositAdapterTargetInstance.execute(otherAccount.address, executionData))
        .to.be.revertedWith(
          "DepositTarget: invalid origin depositor"
        );
    });

    it("Should NOT make a deposit if withdrawal_credentials length is invalid", async function () {
      const { depositAdapterTargetInstance, originAddress } = await loadFixture(deployFixture);
      const pubkey = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const withdrawal_credentials = "0x010000000000000000000000" + depositAdapterTargetInstance.address.toLowerCase().substring(4);
      const signature = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const deposit_data_root = ethers.utils.formatBytes32String("0x11");

      const abiCoder = ethers.utils.defaultAbiCoder;
      const executionData = abiCoder.encode([ "bytes", "bytes", "bytes", "bytes32" ], [ pubkey, withdrawal_credentials, signature, deposit_data_root ]);
      await expect(depositAdapterTargetInstance.execute(originAddress, executionData))
        .to.be.revertedWith(
          "DepositTarget: invalid withdrawal_credentials length"
        );
    });

    it("Should NOT make a deposit if withdrawal_credentials address is wrong", async function () {
      const { otherAccount, depositAdapterTargetInstance, originAddress } = await loadFixture(deployFixture);
      const pubkey = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const withdrawal_credentials = "0x010000000000000000000000" + otherAccount.address.toLowerCase().substring(2);
      const signature = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const deposit_data_root = ethers.utils.formatBytes32String("0x11");

      const abiCoder = ethers.utils.defaultAbiCoder;
      const executionData = abiCoder.encode([ "bytes", "bytes", "bytes", "bytes32" ], [ pubkey, withdrawal_credentials, signature, deposit_data_root ]);
      await expect(depositAdapterTargetInstance.execute(originAddress, executionData))
        .to.be.revertedWith(
          "DepositTarget: wrong withdrawal_credentials address"
        );
    });

    it("Should revert if deposit fails", async function () {
      const { testDepositInstance, depositAdapterTargetInstance, originAddress } = await loadFixture(deployFixture);
      const pubkey = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const withdrawal_credentials = "0x010000000000000000000000" + depositAdapterTargetInstance.address.toLowerCase().substring(2);
      const signature = "0x123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456";
      const deposit_data_root = ethers.utils.formatBytes32String("0x11");

      const abiCoder = ethers.utils.defaultAbiCoder;
      const executionData = abiCoder.encode([ "bytes", "bytes", "bytes", "bytes32" ], [ pubkey, withdrawal_credentials, signature, deposit_data_root ]);

      await expect(depositAdapterTargetInstance.execute(originAddress, executionData))
        .to.emit(testDepositInstance, "Deposit")
        .withArgs(pubkey, withdrawal_credentials, signature, deposit_data_root)
        .and.to.changeEtherBalance(testDepositInstance.address, ethers.utils.parseEther("32"));
      await expect(depositAdapterTargetInstance.execute(originAddress, executionData))
        .to.be.revertedWith(
          "DepositTarget: deposit failed"
        );
    });
  });
});
