# Membership pass cancel (crypto / Unlock passes)

Creative **Brand** and **Investor** passes are 30-day Unlock NFTs bought with crypto. There is **no subscription auto-renewal** and **no on-chain refund** when a holder taps cancel.

Cancel is a **UX acknowledgment**: the member confirms they do not intend to buy again when the current pass expires. Access continues until the on-chain expiration timestamp.

## UI flow

| Piece | Role |
|-------|------|
| `MembershipPassRows` | Renders active passes on Profile → Membership |
| `CancelMembershipButton` | Confirm dialog + post-cancel message |
| `UserProfile` | Loads/stores acknowledgements per wallet |

Dialog copy (`CancelMembershipButton.tsx`) states that passes are manual 30-day purchases and that cancel only affects **intent to renew**, not current access.

Lifetime passes (expiration above internal threshold) hide cancel controls.

## Persistence

Acknowledgements are stored in **browser `localStorage`**, not Supabase or Unlock:

- Prefix: `crtv3:pass-cancel-ack:{walletLowercase}`
- Pass key: `{wallet}:{lockAddress}:{tokenId}:{expirationSeconds}` (`lib/access/pass-cancel-acknowledgements.ts`)

After confirm, the destructive button is replaced by muted text showing access until expiration (`passAccessUntilMessage`).

### Renewal and refetch behavior

- Keys include **expiration**, so a new purchase with the same token ID gets a fresh key and cancel UI returns.
- `prunePassCancelAcknowledgements` drops stale keys when passes disappear from the active set (e.g. expired).
- Parent waits until cancel state is hydrated before showing triggers (loading skeleton avoids flash).

## What cancel does **not** do

- Does not burn or transfer the NFT.
- Does not call `/api/membership` or any refund endpoint.
- Does not sync across devices (localStorage only).

For Unlock verification and pass addresses, see [predictions.md](./predictions.md#quotas) (quota tiers use the same membership reads).
