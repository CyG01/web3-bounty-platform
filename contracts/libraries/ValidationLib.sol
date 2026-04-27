// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library ValidationLib {
    function nonEmpty(string memory value) internal pure returns (bool) {
        return bytes(value).length > 0;
    }
}
