// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Fork-only feasibility test. No keys or transactions are sent to Base.
interface Vm {
    function envString(string calldata) external returns (string memory);
    function createSelectFork(string calldata, uint256) external returns (uint256);
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert() external;
}

interface IDiamond {
    struct HubInfo {
        uint256 startTime; uint256 endTime; uint256 endCooldown;
        uint256 refundRatio; uint256 targetRefundRatio;
        address owner; address vault; address asset;
        bool updating; bool reconfigure; bool active;
    }
    function registerController() external view returns (address);
    function count() external view returns (uint256);
    function getHubInfo(uint256) external view returns (HubInfo memory);
    function register(address, address, address, uint256, uint256, uint32, bytes calldata) external;
    function subscribe(string calldata, string calldata, uint256, uint256) external;
    function getOwnerMeToken(address) external view returns (address);
    function mint(address, uint256, address) external returns (uint256);
    function burn(address, uint256, address) external returns (uint256);
}
interface IERC20Balance { function balanceOf(address) external view returns (uint256); }

/// Simplified ERC-20, intentionally not a model of a particular issuer's B20 policies.
contract MockStock {
    string public constant name = "Fork Test Stock";
    string public constant symbol = "MOCK";
    uint8 public constant decimals = 8;
    uint256 public totalSupply;
    bool public transfersBlocked;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function issue(address to, uint256 amount) external { balanceOf[to] += amount; totalSupply += amount; }
    function setTransfersBlocked(bool blocked) external { transfersBlocked = blocked; }
    function approve(address spender, uint256 amount) external returns (bool) { allowance[msg.sender][spender] = amount; return true; }
    function transfer(address to, uint256 amount) external returns (bool) { _transfer(msg.sender, to, amount); return true; }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 permitted = allowance[from][msg.sender];
        require(permitted >= amount, "allowance");
        if (permitted != type(uint256).max) allowance[from][msg.sender] = permitted - amount;
        _transfer(from, to, amount); return true;
    }
    function _transfer(address from, address to, uint256 amount) internal {
        require(!transfersBlocked, "transfers blocked");
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount; balanceOf[to] += amount;
    }
}

contract StockBackingForkTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    IDiamond constant diamond = IDiamond(0xba5502db2aC2cBff189965e991C07109B14eB3f5);
    uint256 constant FORK_BLOCK = 55666312;
    address constant CREATOR = address(0xC0FFEE);
    address constant BUYER = address(0xB0B);
    MockStock stock;
    address vault;
    uint256 stockHub;
    address meToken;

    function setUp() public {
        vm.createSelectFork(vm.envString("BASE_RPC_URL"), FORK_BLOCK);
        require(block.chainid == 8453, "fork must be Base mainnet");
        IDiamond.HubInfo memory usdcHub = diamond.getHubInfo(2);
        require(usdcHub.active && usdcHub.vault != address(0), "USDC hub unavailable");
        vault = usdcHub.vault;
        stock = new MockStock();
        stockHub = diamond.count() + 1;
        address controller = diamond.registerController();
        require(controller != address(0), "no register controller");
        vm.prank(controller);
        diamond.register(CREATOR, address(stock), vault, 800000, 224, 500000, "");
        IDiamond.HubInfo memory info = diamond.getHubInfo(stockHub);
        require(info.active && info.asset == address(stock) && info.vault == vault, "stock hub mismatch");
        stock.issue(CREATOR, 10_000 * 1e8);
        stock.issue(BUYER, 10_000 * 1e8);
        vm.startPrank(CREATOR);
        stock.approve(vault, type(uint256).max);
        diamond.subscribe("Fork Test Creator", "FTC", stockHub, 100 * 1e8);
        vm.stopPrank();
        meToken = diamond.getOwnerMeToken(CREATOR);
        require(meToken != address(0), "no MeToken created");
    }

    function testStockHubMintAndRedeemWithEightDecimals() public {
        uint256 deposited = 10 * 1e8;
        uint256 beforeVault = stock.balanceOf(vault);
        vm.startPrank(BUYER);
        stock.approve(vault, deposited);
        uint256 minted = diamond.mint(meToken, deposited, BUYER);
        require(minted > 0 && IERC20Balance(meToken).balanceOf(BUYER) == minted, "mint failed");
        require(stock.balanceOf(vault) == beforeVault + deposited, "deposit units incorrect");
        uint256 beforeBuyer = stock.balanceOf(BUYER);
        uint256 returned = diamond.burn(meToken, minted, BUYER);
        require(returned > 0 && stock.balanceOf(BUYER) == beforeBuyer + returned, "redemption failed");
        require(IERC20Balance(meToken).balanceOf(BUYER) == 0, "burn failed");
        vm.stopPrank();
        require(diamond.getHubInfo(2).asset == 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913, "USDC hub changed");
    }

    function testExistingCurveDefaultsRevertForThisEightDecimalDeposit() public {
        uint256 defaultHub = diamond.count() + 1;
        vm.prank(diamond.registerController());
        diamond.register(CREATOR, address(stock), vault, 800000, 224, 32, "");
        address secondCreator = address(0xCAFE);
        stock.issue(secondCreator, 100 * 1e8);
        vm.startPrank(secondCreator);
        stock.approve(vault, 100 * 1e8);
        vm.expectRevert();
        diamond.subscribe("Default Curve Test", "DCT", defaultHub, 100 * 1e8);
        require(stock.balanceOf(secondCreator) == 100 * 1e8, "deposit not rolled back");
        vm.stopPrank();
    }

    function testBlockedTransferRevertsMintAndBurnWithoutLosingPosition() public {
        vm.startPrank(BUYER);
        stock.approve(vault, 20 * 1e8);
        uint256 minted = diamond.mint(meToken, 10 * 1e8, BUYER);
        vm.stopPrank();
        stock.setTransfersBlocked(true);
        uint256 vaultBalance = stock.balanceOf(vault);
        vm.startPrank(BUYER);
        vm.expectRevert();
        diamond.mint(meToken, 1e8, BUYER);
        vm.expectRevert();
        diamond.burn(meToken, minted, BUYER);
        require(IERC20Balance(meToken).balanceOf(BUYER) == minted, "position lost on failed burn");
        require(stock.balanceOf(vault) == vaultBalance, "vault changed on failed transfer");
        vm.stopPrank();
        stock.setTransfersBlocked(false);
        vm.prank(BUYER);
        require(diamond.burn(meToken, minted, BUYER) > 0, "retry failed");
    }
}
