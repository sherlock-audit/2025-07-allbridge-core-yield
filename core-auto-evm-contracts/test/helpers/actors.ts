import { ethers,  } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export class Actors {
  admin: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;

  private constructor(signers: HardhatEthersSigner[]) {
    [this.admin, this.alice, this.bob] = signers;
  }

  async getZeroActor(): Promise<HardhatEthersSigner> {
    return HardhatEthersSigner.create(ethers.provider, ethers.ZeroAddress)
  }

  static async init() {
    const signers = await ethers.getSigners();
    return new Actors(signers);
  }

  getActors() {
    return {
      admin: this.admin,
      alice: this.alice,
      bob: this.bob,
    };
  }

  getName(user: HardhatEthersSigner) {
    switch (user.address) {
      case this.admin.address:
        return "Admin";
      case this.alice.address:
        return "Alice";
      case this.bob.address:
        return "Bob";
      default:
        return "unknown";
    }
  }
}
