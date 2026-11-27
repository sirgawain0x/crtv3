// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface BaseVm {
    function envString(string calldata) external returns (string memory);
    function envOr(string calldata, bool) external returns (bool);
    function skip(bool) external;
    function createSelectFork(string calldata, uint256) external returns (uint256);
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
}
interface BaseToken {
    function decimals() external view returns (uint8);
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
}
interface BaseDiamond {
    struct HubInfo { uint256 startTime; uint256 endTime; uint256 endCooldown; uint256 refundRatio;
        uint256 targetRefundRatio; address owner; address vault; address asset; bool updating; bool reconfigure; bool active; }
    function getHubInfo(uint256) external view returns (HubInfo memory);
    function registerController() external view returns (address);
    function count() external view returns (uint256);
    function register(address,address,address,uint256,uint256,uint32,bytes calldata) external;
    function subscribe(string calldata,string calldata,uint256,uint256) external;
    function getOwnerMeToken(address) external view returns (address);
    function mint(address,uint256,address) external returns (uint256);
    function burn(address,uint256,address) external returns (uint256);
}

/// Opt-in: run only with a Base-enabled forge. All impersonation is fork-local.
contract RealB20ForkTest {
    BaseVm constant vm = BaseVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    BaseDiamond constant diamond = BaseDiamond(0xba5502db2aC2cBff189965e991C07109B14eB3f5);
    BaseToken constant stock = BaseToken(0xb200000000000000000000C2e324d24d7eEcd1fb);
    address constant HISTORICAL_POOL = 0xF5FCB9CDAFcE67d50AfEf298F88E709d2B946BA6;
    address constant CREATOR = address(0xCAFE1234);
    address constant BUYER = address(0xB0B1234);
    uint256 constant UNIT = 1e8;

    function setUp() public {
        if (!vm.envOr("RUN_B20_FORK", false)) vm.skip(true);
        vm.createSelectFork(vm.envString("BASE_RPC_URL"), 55666312);
        require(block.chainid == 8453 && stock.decimals() == 8, "Base B20 execution unavailable");
    }

    function testRealAaplCollateralLifecycle() public {
        require(stock.balanceOf(HISTORICAL_POOL) >= 20 * UNIT, "fixture pool lacks balance");
        vm.startPrank(HISTORICAL_POOL);
        require(stock.transfer(CREATOR, 10 * UNIT), "creator funding failed");
        require(stock.transfer(BUYER, 10 * UNIT), "buyer funding failed");
        vm.stopPrank();
        address vault = diamond.getHubInfo(2).vault;
        uint256 hub = diamond.count() + 1;
        vm.prank(diamond.registerController());
        diamond.register(CREATOR, address(stock), vault, 800000, 224, 500000, "");
        vm.startPrank(CREATOR);
        stock.approve(vault, 5 * UNIT);
        diamond.subscribe("B20 Fork Test", "B20T", hub, 5 * UNIT);
        vm.stopPrank();
        address meToken = diamond.getOwnerMeToken(CREATOR);
        require(meToken != address(0), "no creator token");
        uint256 beforeVault = stock.balanceOf(vault);
        vm.startPrank(BUYER);
        stock.approve(vault, UNIT);
        uint256 minted = diamond.mint(meToken, UNIT, BUYER);
        require(minted > 0 && stock.balanceOf(vault) == beforeVault + UNIT, "mint deposit failed");
        uint256 beforeBuyer = stock.balanceOf(BUYER);
        uint256 redeemed = diamond.burn(meToken, minted, BUYER);
        require(redeemed > 0 && stock.balanceOf(BUYER) == beforeBuyer + redeemed, "redemption failed");
        vm.stopPrank();
    }
}
