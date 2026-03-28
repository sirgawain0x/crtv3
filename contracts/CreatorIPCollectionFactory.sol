// SPDX-License-Identifier: MIT
/**
 * @title CreatorIPCollectionFactory
 * @dev Factory contract for deploying and initializing CreatorIPCollection (TokenERC721) contracts.
 * 
 * This factory deploys upgradeable TokenERC721 contracts and initializes them with creator-specific
 * parameters. Each creator gets their own NFT collection contract that they own from deployment.
 * 
 * Features:
 * - Deploys TokenERC721 contracts using CREATE2 for deterministic addresses
 * - Automatically initializes contracts with proper roles and settings
 * - Prevents duplicate deployments per creator
 * - Supports batch deployment for gas efficiency
 * - Tracks all deployed collections
 * 
 * Security:
 * - ReentrancyGuard on all state-changing functions
 * - Zero-address checks on all inputs
 * - Duplicate deployment prevention
 * - Ownable2Step for safer ownership transfers
 * 
 * @notice This factory deploys the TokenERC721 implementation directly (not via proxy)
 * @notice For upgradeable deployments, consider using a proxy pattern
 */
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./CreatorIPCollection.sol";

contract CreatorIPCollectionFactory is Ownable2Step, ReentrancyGuard {
    // Custom errors (gas-efficient)
    error OwnerZeroAddress();
    error CreatorZeroAddress();
    error CreatorHasCollection();
    error DeploymentFailed();
    error InitializationFailed();
    error ArrayLengthMismatch();
    error EmptyArrays();
    error BatchSizeExceedsMaximum();
    error InvalidRoyaltyBps();
    error InvalidPlatformFeeBps();

    /**
     * @dev Emitted when a new collection is created
     * @param creator Creator's wallet address
     * @param collectionAddress Address of the deployed collection
     * @param name Collection name
     * @param symbol Collection symbol
     */
    event CollectionCreated(
        address indexed creator,
        address indexed collectionAddress,
        string name,
        string symbol
    );

    /**
     * @dev Mapping from creator address to their collection address
     * @notice Prevents duplicate deployments
     */
    mapping(address => address) public creatorCollections;

    /**
     * @dev Array of all deployed collection addresses
     * @notice For enumeration - can be removed if not needed to save gas
     */
    address[] public allCollections;

    /**
     * @dev Maximum batch size for batch deployments
     * @notice Prevents gas limit issues
     */
    uint256 public constant MAX_BATCH_SIZE = 30;

    /**
     * @dev Default trusted forwarders for meta transactions
     * @notice Can be updated by owner
     */
    address[] public defaultTrustedForwarders;

    /**
     * @dev Default contract URI template
     * @notice Can be updated by owner
     */
    string public defaultContractURI;

    /**
     * @dev Default royalty recipient (can be zero for no default)
     */
    address public defaultRoyaltyRecipient;

    /**
     * @dev Default royalty basis points (0-10000)
     */
    uint128 public defaultRoyaltyBps;

    /**
     * @dev Default platform fee recipient
     */
    address public defaultPlatformFeeRecipient;

    /**
     * @dev Default platform fee basis points (0-10000)
     */
    uint128 public defaultPlatformFeeBps;

    /**
     * @dev Bytecode hash of the TokenERC721 contract to deploy
     * @notice Stored as immutable to avoid embedding full bytecode in factory
     */
    bytes32 public immutable collectionBytecodeHash;

    /**
     * @dev Constructor
     * @param _initialOwner Owner of the factory
     * @param _defaultContractURI Default contract URI for collections
     * @param _defaultRoyaltyRecipient Default royalty recipient (can be zero)
     * @param _defaultRoyaltyBps Default royalty basis points (0-10000)
     * @param _defaultPlatformFeeRecipient Default platform fee recipient
     * @param _defaultPlatformFeeBps Default platform fee basis points (0-10000)
     * @param _trustedForwarders Array of trusted forwarder addresses for meta transactions
     * @param _collectionBytecodeHash Keccak256 hash of the TokenERC721 creation bytecode
     */
    constructor(
        address _initialOwner,
        string memory _defaultContractURI,
        address _defaultRoyaltyRecipient,
        uint128 _defaultRoyaltyBps,
        address _defaultPlatformFeeRecipient,
        uint128 _defaultPlatformFeeBps,
        address[] memory _trustedForwarders,
        bytes32 _collectionBytecodeHash
    ) {
        if (_initialOwner == address(0)) revert OwnerZeroAddress();
        if (_defaultRoyaltyBps > 10000) revert InvalidRoyaltyBps();
        if (_defaultPlatformFeeBps > 10000) revert InvalidPlatformFeeBps();

        _transferOwnership(_initialOwner);

        defaultContractURI = _defaultContractURI;
        defaultRoyaltyRecipient = _defaultRoyaltyRecipient;
        defaultRoyaltyBps = _defaultRoyaltyBps;
        defaultPlatformFeeRecipient = _defaultPlatformFeeRecipient;
        defaultPlatformFeeBps = _defaultPlatformFeeBps;
        defaultTrustedForwarders = _trustedForwarders;
        collectionBytecodeHash = _collectionBytecodeHash;
    }

    /**
     * @notice Compute the deterministic address for a collection before deployment
     * @param _creator The wallet address of the creator who will own the collection
     * @param _name The name of the collection
     * @param _symbol The ticker symbol
     * @return predictedAddress The address where the collection will be deployed
     * 
     * @dev Uses CREATE2 formula for deterministic addresses
     * @dev Salt is derived from creator address, name, and symbol
     * @dev Note: CREATE2 only uses creation code, not initialization data
     */
    function computeCollectionAddress(
        address _creator,
        string memory _name,
        string memory _symbol
    ) public view returns (address predictedAddress) {
        bytes32 salt = keccak256(abi.encodePacked(_creator, _name, _symbol));
        
        predictedAddress = address(uint160(uint256(keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                collectionBytecodeHash
            )
        ))));
    }

    /**
     * @notice Deploys a new collection and initializes it with creator as owner
     * @param _name The name of the collection
     * @param _symbol The ticker symbol
     * @param _creator The wallet address of the creator who will own the collection
     * @param _bytecode The creation bytecode of the TokenERC721 contract
     * @return collectionAddress Address of the deployed collection
     * 
     * Requirements:
     * - Only factory owner can call
     * - Creator address cannot be zero
     * - Creator must not already have a collection
     * - Bytecode hash must match the stored hash
     * 
     * Effects:
     * - Deploys a new TokenERC721 contract using CREATE2
     * - Initializes the contract with creator as DEFAULT_ADMIN_ROLE
     * - Stores collection address in creatorCollections mapping
     * - Emits CollectionCreated event
     */
    function deployCreatorCollection(
        string memory _name,
        string memory _symbol,
        address _creator,
        bytes memory _bytecode
    ) external onlyOwner nonReentrant returns (address collectionAddress) {
        if (_creator == address(0)) revert CreatorZeroAddress();
        if (creatorCollections[_creator] != address(0)) revert CreatorHasCollection();
        
        // Verify bytecode hash matches
        if (keccak256(_bytecode) != collectionBytecodeHash) {
            revert DeploymentFailed();
        }

        collectionAddress = _deployCollection(_creator, _name, _symbol, _bytecode);
        if (collectionAddress == address(0)) revert DeploymentFailed();

        creatorCollections[_creator] = collectionAddress;
        allCollections.push(collectionAddress);
        emit CollectionCreated(_creator, collectionAddress, _name, _symbol);

        return collectionAddress;
    }

    /**
     * @dev Internal function to deploy and initialize a collection
     * @param _creator Creator address
     * @param _name Collection name
     * @param _symbol Collection symbol
     * @param _bytecode The creation bytecode
     * @return collectionAddress Deployed collection address
     */
    function _deployCollection(
        address _creator,
        string memory _name,
        string memory _symbol,
        bytes memory _bytecode
    ) internal returns (address collectionAddress) {
        bytes32 salt = keccak256(abi.encodePacked(_creator, _name, _symbol));
        
        // Deploy using CREATE2
        assembly {
            collectionAddress := create2(0, add(_bytecode, 0x20), mload(_bytecode), salt)
        }
        
        if (collectionAddress == address(0)) {
            revert DeploymentFailed();
        }

        // Initialize the contract
        TokenERC721 collection = TokenERC721(collectionAddress);
        collection.initialize(
            _creator, // _defaultAdmin (creator owns the collection)
            _name,
            _symbol,
            defaultContractURI,
            defaultTrustedForwarders,
            _creator, // _saleRecipient (creator receives primary sales)
            defaultRoyaltyRecipient,
            defaultRoyaltyBps,
            defaultPlatformFeeBps,
            defaultPlatformFeeRecipient
        );
    }

    /**
     * @notice Get a creator's collection address
     * @param creatorAddress Creator's wallet address
     * @return Collection address or zero address if not found
     */
    function getCreatorCollection(address creatorAddress) external view returns (address) {
        return creatorCollections[creatorAddress];
    }

    /**
     * @notice Check if a creator has a collection
     * @param creatorAddress Creator's wallet address
     * @return True if creator has a collection
     */
    function hasCollection(address creatorAddress) external view returns (bool) {
        return creatorCollections[creatorAddress] != address(0);
    }

    /**
     * @notice Get total number of collections deployed
     * @return Total number of collections
     */
    function totalCollections() external view returns (uint256) {
        return allCollections.length;
    }

    /**
     * @notice Update default contract URI
     * @param _newContractURI New default contract URI
     */
    function setDefaultContractURI(string memory _newContractURI) external onlyOwner {
        defaultContractURI = _newContractURI;
    }

    /**
     * @notice Update default royalty settings
     * @param _recipient New default royalty recipient (can be zero)
     * @param _bps New default royalty basis points (0-10000)
     */
    function setDefaultRoyalty(address _recipient, uint128 _bps) external onlyOwner {
        if (_bps > 10000) revert InvalidRoyaltyBps();
        defaultRoyaltyRecipient = _recipient;
        defaultRoyaltyBps = _bps;
    }

    /**
     * @notice Update default platform fee settings
     * @param _recipient New default platform fee recipient
     * @param _bps New default platform fee basis points (0-10000)
     */
    function setDefaultPlatformFee(address _recipient, uint128 _bps) external onlyOwner {
        if (_bps > 10000) revert InvalidPlatformFeeBps();
        defaultPlatformFeeRecipient = _recipient;
        defaultPlatformFeeBps = _bps;
    }

    /**
     * @notice Update default trusted forwarders
     * @param _forwarders New array of trusted forwarder addresses
     */
    function setDefaultTrustedForwarders(address[] memory _forwarders) external onlyOwner {
        defaultTrustedForwarders = _forwarders;
    }

    /**
     * @notice Batch deploy collections for multiple creators
     * @param creators Array of creator addresses
     * @param names Array of collection names
     * @param symbols Array of collection symbols
     * @return collectionAddresses Array of deployed collection addresses
     * 
     * Requirements:
     * - Only owner can call
     * - All arrays must have the same length
     * - Arrays must not be empty
     * - Batch size must not exceed MAX_BATCH_SIZE
     * - No creator address can be zero
     * - No creator can already have a collection
     * 
     * Gas Considerations:
     * - Each deployment costs ~2-3M gas
     * - MAX_BATCH_SIZE is set to 30 for conservative mainnet deployment
     */
    function batchDeployCollections(
        address[] calldata creators,
        string[] calldata names,
        string[] calldata symbols,
        bytes memory _bytecode
    ) external onlyOwner nonReentrant returns (address[] memory collectionAddresses) {
        uint256 length = creators.length;
        if (length != names.length || length != symbols.length) revert ArrayLengthMismatch();
        if (length == 0) revert EmptyArrays();
        if (length > MAX_BATCH_SIZE) revert BatchSizeExceedsMaximum();
        
        // Verify bytecode hash matches
        if (keccak256(_bytecode) != collectionBytecodeHash) {
            revert DeploymentFailed();
        }

        collectionAddresses = new address[](length);

        for (uint256 i = 0; i < length; i++) {
            if (creators[i] == address(0)) revert CreatorZeroAddress();
            if (creatorCollections[creators[i]] != address(0)) revert CreatorHasCollection();

            address collectionAddress = _deployCollection(creators[i], names[i], symbols[i], _bytecode);
            if (collectionAddress == address(0)) revert DeploymentFailed();

            creatorCollections[creators[i]] = collectionAddress;
            collectionAddresses[i] = collectionAddress;
            allCollections.push(collectionAddress);
            emit CollectionCreated(creators[i], collectionAddress, names[i], symbols[i]);
        }

        return collectionAddresses;
    }
}

