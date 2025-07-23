import 'hardhat/types/config';
declare module 'hardhat/types/config' {
    interface HardhatUserConfig {
        debug?: boolean;
    }
    interface HardhatConfig {
        debug?: boolean;
    }
    interface HttpNetworkUserConfig {
        pools: string[]
    }
    interface HardhatNetworkConfig {
        pools: string[]
    }
    interface HttpNetworkConfig {
        pools: string[]
    }
}
