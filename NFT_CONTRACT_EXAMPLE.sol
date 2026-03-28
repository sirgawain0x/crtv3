// SPDX-License-Identifier: MIT
// Production-ready NFT contract for video asset minting
// This contract extends OpenZeppelin's ERC721 and includes access control,
// payment requirements, rate limiting, and whitelist functionality

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title VideoAssetNFT
 * @dev Production-ready ERC721 token contract for video assets
 * 
 * Features:
 * - Access control (owner-only, role-based, or public minting)
 * - Payment requirements (optional minting fee in wei)
 * - Rate limiting (max mints per address per time period)
 * - Whitelist support (optional address-based whitelist)
 * - Reentrancy protection (prevents reentrancy attacks)
 * 
 * Configuration Examples:
 * 
 * 1. Public Free Minting (no restrictions):
 *    - setPublicMintingEnabled(true)
 *    - setMintingFee(0)
 *    - setRateLimit(0, 0)  // No rate limit
 *    - setWhitelistEnabled(false)
 * 
 * 2. Public Minting with Fee:
 *    - setPublicMintingEnabled(true)
 *    - setMintingFee(1000000000000000)  // 0.001 ETH
 *    - Note: Requires updating minting service to send ETH
 * 
 * 3. Owner-Only Minting:
 *    - setPublicMintingEnabled(false)
 *    - Only owner or addresses with MINTER_ROLE can mint
 * 
 * 4. Rate Limited Minting (max 5 mints per day):
 *    - setRateLimit(5, 86400)  // 5 mints per 86400 seconds (1 day)
 * 
 * 5. Whitelist-Only Minting:
 *    - setWhitelistEnabled(true)
 *    - addToWhitelist([address1, address2, ...])
 * 
 * Security Features:
 * - ReentrancyGuard: Prevents reentrancy attacks on minting functions
 * - AccessControl: Role-based access control for minting permissions
 * - SafeMint: All mint functions use _safeMint to prevent NFT loss to non-compliant contracts
 * - Payment Safety: Excess ETH is automatically refunded
 * 
 * This contract is compatible with the Story Protocol integration.
 */
contract VideoAssetNFT is ERC721, Ownable, ReentrancyGuard, AccessControl {
    using Counters for Counters.Counter;
    using Strings for uint256;
    
    // Role for minters (alternative to owner-only)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Token ID counter
    Counters.Counter private _tokenIdCounter;
    
    // Mapping from token ID to token URI
    mapping(uint256 => string) private _tokenURIs;
    
    // Base URI for all tokens (optional)
    string private _baseTokenURI;
    
    // ============ Access Control Configuration ============
    bool public publicMintingEnabled = false; // If false, only owner/minters can mint
    
    // ============ Payment Configuration ============
    uint256 public mintingFee = 0; // Fee in wei (0 = free)
    
    // ============ Rate Limiting Configuration ============
    uint256 public maxMintsPerAddress = 0; // 0 = unlimited
    uint256 public rateLimitPeriod = 0; // Time period in seconds (0 = no rate limit)
    mapping(address => uint256) private _mintCounts; // Track mints per address
    mapping(address => uint256) private _lastMintTime; // Track last mint time per address
    
    // ============ Whitelist Configuration ============
    bool public whitelistEnabled = false;
    mapping(address => bool) public whitelist;
    
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC721(name, symbol) Ownable(initialOwner) {
        // Grant owner the DEFAULT_ADMIN_ROLE and MINTER_ROLE
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        
        // Start token IDs at 1
        _tokenIdCounter.increment();
    }
    
    // ============ Access Control Functions ============
    
    /**
     * @dev Enable or disable public minting
     * @param enabled Whether public minting should be enabled
     * 
     * NOTE: Configuration changes are not protected against front-running.
     * This is acceptable as config changes don't affect funds and are
     * owner-only operations. Front-running would only allow users to mint
     * slightly earlier than intended, which doesn't cause fund loss.
     */
    function setPublicMintingEnabled(bool enabled) public onlyOwner {
        publicMintingEnabled = enabled;
    }
    
    /**
     * @dev Grant minter role to an address
     * @param minter The address to grant minter role to
     */
    function grantMinterRole(address minter) public onlyOwner {
        _grantRole(MINTER_ROLE, minter);
    }
    
    /**
     * @dev Revoke minter role from an address
     * @param minter The address to revoke minter role from
     */
    function revokeMinterRole(address minter) public onlyOwner {
        _revokeRole(MINTER_ROLE, minter);
    }
    
    // ============ Payment Configuration Functions ============
    
    /**
     * @dev Set the minting fee
     * @param fee The fee in wei (0 = free)
     */
    function setMintingFee(uint256 fee) public onlyOwner {
        mintingFee = fee;
    }
    
    /**
     * @dev Withdraw collected fees
     */
    function withdrawFees() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // ============ Rate Limiting Functions ============
    
    /**
     * @dev Set rate limiting parameters
     * @param maxMints Maximum mints per address per period (0 = unlimited)
     * @param period Time period in seconds (0 = no rate limit)
     */
    function setRateLimit(uint256 maxMints, uint256 period) public onlyOwner {
        maxMintsPerAddress = maxMints;
        rateLimitPeriod = period;
    }
    
    // ============ Whitelist Functions ============
    
    /**
     * @dev Enable or disable whitelist
     * @param enabled Whether whitelist should be enabled
     */
    function setWhitelistEnabled(bool enabled) public onlyOwner {
        whitelistEnabled = enabled;
    }
    
    /**
     * @dev Add addresses to whitelist
     * @param addresses Array of addresses to add
     */
    function addToWhitelist(address[] calldata addresses) public onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = true;
        }
    }
    
    /**
     * @dev Remove addresses from whitelist
     * @param addresses Array of addresses to remove
     */
    function removeFromWhitelist(address[] calldata addresses) public onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = false;
        }
    }
    
    // ============ Internal Modifiers ============
    
    /**
     * @dev Check if address can mint (access control + whitelist)
     */
    modifier canMint(address to) {
        // Check public minting
        if (!publicMintingEnabled) {
            require(
                hasRole(MINTER_ROLE, msg.sender) || msg.sender == owner(),
                "Minting is not public and caller is not authorized"
            );
        }
        
        // Check whitelist if enabled
        if (whitelistEnabled) {
            require(whitelist[to] || whitelist[msg.sender], "Address not whitelisted");
        }
        
        // Check rate limiting
        if (maxMintsPerAddress > 0 && rateLimitPeriod > 0) {
            uint256 lastMint = _lastMintTime[to];
            uint256 currentTime = block.timestamp;
            
            // Reset count if period has passed
            if (currentTime >= lastMint + rateLimitPeriod) {
                _mintCounts[to] = 0;
            }
            
            require(_mintCounts[to] < maxMintsPerAddress, "Rate limit exceeded");
        }
        
        _;
    }
    
    /**
     * @dev Mint a new token with a specific URI (preferred method)
     * @param to The address that will own the minted token
     * @param uri The token URI for the metadata
     * @return tokenId The newly minted token ID
     * 
     * Applies access control, payment, rate limiting, and whitelist checks
     * 
     * NOTE: If mintingFee > 0, you'll need to update the minting service
     * to send ETH with the transaction (set value in sendUserOperation)
     */
    function safeMint(address to, string memory uri) 
        public 
        payable 
        nonReentrant 
        canMint(to) 
        returns (uint256) 
    {
        // Check payment requirement (if fee is set)
        if (mintingFee > 0) {
            require(msg.value >= mintingFee, "Insufficient payment for minting fee");
        }
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        // Update rate limiting tracking
        _mintCounts[to]++;
        _lastMintTime[to] = block.timestamp;
        
        // Refund excess payment (if fee is set)
        if (mintingFee > 0 && msg.value > mintingFee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - mintingFee}("");
            require(success, "Refund failed");
        }
        
        return tokenId;
    }
    
    /**
     * @dev Mint a new token with a specific URI (delegates to safeMint)
     * @param to The address that will own the minted token
     * @param uri The token URI for the metadata
     * @return tokenId The newly minted token ID
     * 
     * This function is provided for compatibility with contracts that call mint()
     * instead of safeMint(). It delegates to safeMint() to avoid code duplication.
     */
    function mint(address to, string memory uri) 
        public 
        payable 
        returns (uint256) 
    {
        return safeMint(to, uri);
    }
    
    /**
     * @dev Mint a new token without URI (uses baseURI + tokenId)
     * @param to The address that will own the minted token
     * @return tokenId The newly minted token ID
     * 
     * Applies access control, payment, rate limiting, and whitelist checks
     */
    function mint(address to) 
        public 
        payable 
        nonReentrant 
        canMint(to) 
        returns (uint256) 
    {
        // Check payment requirement (if fee is set)
        if (mintingFee > 0) {
            require(msg.value >= mintingFee, "Insufficient payment for minting fee");
        }
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        
        // Update rate limiting tracking
        _mintCounts[to]++;
        _lastMintTime[to] = block.timestamp;
        
        // Refund excess payment (if fee is set)
        if (mintingFee > 0 && msg.value > mintingFee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - mintingFee}("");
            require(success, "Refund failed");
        }
        
        return tokenId;
    }
    
    /**
     * @dev Get the token URI for a specific token
     * @param tokenId The token ID
     * @return The token URI
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireOwned(tokenId);
        
        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();
        
        // If there is a base URI but no token URI, concatenate baseURI and tokenId
        if (bytes(base).length > 0 && bytes(_tokenURI).length == 0) {
            return string(abi.encodePacked(base, Strings.toString(tokenId)));
        }
        
        // If there is a token URI, return it
        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }
        
        // Fallback to base implementation
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Set the base URI for all tokens
     * @param baseURI The base URI
     */
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    /**
     * @dev Get the base URI
     * @return The base URI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Set the token URI for a specific token
     * @param tokenId The token ID
     * @param uri The token URI
     */
    function _setTokenURI(uint256 tokenId, string memory uri) internal {
        _tokenURIs[tokenId] = uri;
    }
    
    /**
     * @dev Get the current token counter value (next token ID to be minted)
     * @return The current counter value
     */
    function currentTokenId() public view returns (uint256) {
        return _tokenIdCounter.current();
    }
    
    /**
     * @dev Get the total supply of tokens (current counter - 1 since we start at 1)
     * @return The total supply
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current() - 1;
    }
    
    /**
     * @dev Get the number of mints for an address (for rate limiting)
     * @param addr The address to check
     * @return The number of mints (resets after rate limit period)
     */
    function getMintCount(address addr) public view returns (uint256) {
        if (maxMintsPerAddress == 0 || rateLimitPeriod == 0) {
            return 0;
        }
        
        uint256 lastMint = _lastMintTime[addr];
        uint256 currentTime = block.timestamp;
        
        // Return 0 if period has passed
        if (currentTime >= lastMint + rateLimitPeriod) {
            return 0;
        }
        
        return _mintCounts[addr];
    }
    
    /**
     * @dev Get minting configuration (useful for frontend integration)
     * @return isPublic Whether public minting is enabled
     * @return fee The minting fee in wei
     * @return maxMints Maximum mints per address
     * @return period Rate limit period in seconds
     * @return whitelistActive Whether whitelist is enabled
     */
    function getMintingConfig() 
        public 
        view 
        returns (
            bool isPublic,
            uint256 fee,
            uint256 maxMints,
            uint256 period,
            bool whitelistActive
        ) 
    {
        return (
            publicMintingEnabled,
            mintingFee,
            maxMintsPerAddress,
            rateLimitPeriod,
            whitelistEnabled
        );
    }
    
    /**
     * @dev Support for AccessControl interface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

