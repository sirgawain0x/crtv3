---
description: how to buy and sell metokens via the vault address.
globs: 
alwaysApply: false
---

What I found:
The ERC20 approve is correctly executed via a UserOperation and confirmed on-chain.
The allowance is immediately visible via standard allowance() reads.
I validated allowance end-to-end with a minimal test:
The Smart Account performs approve(spender, amount) via UserOp
The approved spender successfully calls transferFrom and the transaction completes with status: success
This confirms allowance propagation is correct and the network is not “missing” the approval state in this scenario.

Why the mint flow fails
In the failing mint() path, allowance is being set for Contract A (for example the Diamond or meToken), but the actual transferFrom is executed by Contract B (for example a downstream vault or router).
Since ERC20 allowances are checked against msg.sender, this produces a legitimate ERC20: insufficient allowance revert even though allowance exists for a different contract.
This also explains why waiting 30 to 60+ seconds does not help and why simulation consistently reports insufficient allowance.

Additional verification
To rule out bundler-specific behavior, I also tested unrelated interactions (including approve + transferFrom and other contract calls). In all cases, allowance behaved correctly and was immediately usable.

Conclusion
This looks like a logical issue in the mint flow regarding which contract actually performs the ERC20 transferFrom. The bundler is correctly simulating and reporting the revert.
