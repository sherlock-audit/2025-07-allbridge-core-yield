// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

library PoolUtils {
    uint internal constant P = 52;
    uint internal constant A = 20;

    function getD(uint x, uint y, uint a) internal pure returns (uint d) {
        // a = 8 * Axy(x+y)
        // b = 4 * xy(4A - 1) / 3
        // c = sqrt(a² + b³)
        // D = cbrt(a + c) + cbrt(a - c)
        uint xy = x * y;
        uint a_ = a;
        // Axy(x+y)
        uint p1 = a_ * xy * (x + y);
        // xy(4A - 1) / 3
        uint p2 = (xy * ((a_ << 2) - 1)) / 3;
        // p1² + p2³
        uint p3 = _sqrt((p1 * p1) + (p2 * p2 * p2));
        unchecked {
            uint d_ = _cbrt(p1 + p3);
            if (p3 > p1) {
                d_ -= _cbrt(p3 - p1);
            } else {
                d_ += _cbrt(p1 - p3);
            }
            d = (d_ << 1);
        }
    }

    function _sqrt(uint n) internal pure returns (uint) {
        unchecked {
            if (n > 0) {
                uint x = (n >> 1) + 1;
                uint y = (x + n / x) >> 1;
                while (x > y) {
                    x = y;
                    y = (x + n / x) >> 1;
                }
                return x;
            }
            return 0;
        }
    }

    function _cbrt(uint n) internal pure returns (uint) {
        unchecked {
            uint x = 0;
            for (uint y = 1 << 255; y > 0; y >>= 3) {
                x <<= 1;
                uint z = 3 * x * (x + 1) + 1;
                if (n / y >= z) {
                    n -= y * z;
                    x += 1;
                }
            }
            return x;
        }
    }

    function changeStateOnDeposit(
        uint tokenBalance,
        uint vUsdBalance,
        uint oldD,
        uint amountSP
    ) internal pure returns (uint, uint, uint) {
        uint oldBalance = (tokenBalance + vUsdBalance);
        if (oldD == 0 || oldBalance == 0) {
            // Split balance equally on the first deposit
            uint halfAmount = amountSP >> 1;
            tokenBalance += halfAmount;
            vUsdBalance += halfAmount;
        } else {
            // Add amount proportionally to each pool
            tokenBalance += (amountSP * tokenBalance) / oldBalance;
            vUsdBalance += (amountSP * vUsdBalance) / oldBalance;
        }

        oldD = PoolUtils.getD(tokenBalance, vUsdBalance, PoolUtils.A);
        return (tokenBalance, vUsdBalance, oldD);
    }
}
