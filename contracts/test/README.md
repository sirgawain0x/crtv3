# Test Suite Documentation

This directory contains comprehensive tests for the CreatorIPFactory and CreatorIPCollection contracts.

## Test Structure

```
contracts/test/
├── CreatorIPFactory.t.sol      # Factory unit tests
├── CreatorIPCollection.t.sol  # Collection unit tests
├── Integration.t.sol           # Integration tests
├── Fuzz.t.sol                  # Fuzz tests
├── Gas.t.sol                   # Gas usage tests
└── helpers/
    ├── TestHelpers.sol         # Test utility functions
    └── ReentrancyAttacker.sol  # Reentrancy attack test contract
```

## Running Tests

### Foundry Tests

```bash
# Run all tests
npm run test:solidity

# Run with gas reporting
npm run test:solidity:gas

# Run extended fuzz tests (10k runs)
npm run test:solidity:fuzz

# Run specific test file
forge test --match-path test/CreatorIPFactory.t.sol

# Run with verbosity
forge test -vvv
```

### TypeScript Tests

```bash
# Run all TypeScript tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Test Coverage

### CreatorIPFactory Tests

- **Constructor Tests**: Zero-address checks, same address edge case
- **Deployment Tests**: Single and batch deployment, duplicate prevention
- **Access Control**: Owner-only functions, role management
- **View Functions**: Collection lookup, enumeration
- **Edge Cases**: Front-running protection, array validation

### CreatorIPCollection Tests

- **Constructor Tests**: Owner setup, role grants, token ID initialization
- **Minting Tests**: All minting functions, role requirements, event emissions
- **Role Management**: Grant/revoke MINTER_ROLE, duplicate prevention
- **URI Management**: Base URI, token-specific URI, fallback logic
- **Reentrancy Protection**: Attack simulation and prevention verification

### Integration Tests

- **Full Workflow**: Deploy → Grant Role → Mint → Verify
- **Batch Operations**: Multiple creators, multiple collections
- **Ownership Transfer**: Ownable2Step flow verification
- **Collection Enumeration**: Factory-based collection lookup

### Fuzz Tests

- **Random Inputs**: Addresses, strings, batch sizes
- **Edge Cases**: Empty strings, Unicode, very long strings
- **Stress Tests**: Multiple grants/revokes, high mint counts

### Gas Tests

- **Deployment Costs**: Single and batch deployment gas usage
- **Minting Costs**: All minting function gas comparisons
- **Optimization Verification**: MAX_BATCH_SIZE gas limit verification

## Test Helpers

### TestHelpers.sol

Utility functions for test data generation:
- `makeAddr(string memory seed)`: Generate deterministic test addresses
- `makeAddrs(uint256 count, string memory prefix)`: Generate multiple addresses
- `randomString(uint256 length, uint256 seed)`: Generate random strings

### ReentrancyAttacker.sol

Contract that attempts reentrancy attacks during minting to verify protection.

## Expected Test Results

### Foundry Tests

All tests should pass with:
- ✅ 100% function coverage
- ✅ No gas limit violations
- ✅ All security checks verified

### TypeScript Tests

All tests should pass with:
- ✅ 100% service function coverage
- ✅ All integration flows verified
- ✅ Error handling tested

## Continuous Integration

Tests should be run:
- Before every commit
- In CI/CD pipeline
- Before mainnet deployment
- After any contract changes

## Test Maintenance

### Adding New Tests

1. Add unit tests for new functions
2. Add integration tests for new workflows
3. Add fuzz tests for new public functions
4. Update gas tests if gas usage changes

### Updating Tests

When contracts change:
1. Update corresponding test files
2. Verify all tests still pass
3. Update gas benchmarks if needed
4. Update this documentation

## Known Limitations

- Fuzz tests use bounded inputs to prevent out-of-gas
- Some edge cases may require manual testing
- Gas measurements are approximate (actual costs vary by network)

## Troubleshooting

### Tests Failing

1. Check Foundry version: `forge --version` (should be latest)
2. Check Solidity version matches `foundry.toml`
3. Verify OpenZeppelin dependencies are installed
4. Run `forge clean` and rebuild

### Gas Tests Failing

1. Gas costs vary by network and block
2. Adjust bounds in `Gas.t.sol` if needed
3. Verify optimizer settings match deployment

## Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Forge Testing](https://book.getfoundry.sh/forge/tests)
- [Vitest Documentation](https://vitest.dev/)

