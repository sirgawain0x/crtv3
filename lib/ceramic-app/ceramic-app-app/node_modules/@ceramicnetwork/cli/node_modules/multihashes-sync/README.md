# multihashes-sync

> Sync Multihash implementation.

Spiritual successor to deprecated [multihashing](https://github.com/multiformats/js-multihashing).
Compatible with [multiformats](https://github.com/multiformats/js-multiformats).

## Install

```sh
> pnpm install multihashes-sync
```

## Usage

```ts
import { sha256, sha512 } from 'multihashes-sync/sha2'
var bytes = Uint8Array.from([0, 1, 2, 3])

var digest = sha256.digest(bytes)
> console.log(digest)
Digest {
  code: 18,
  size: 32,
  digest: <Buffer 05 4e de c1 d0 21 1f 62 4f ed 0c bc a9 d4 f9 40 0b 0e 49 1c 43 74 2a f2 c5 b0 ab eb f0 c9 90 d8>,
  bytes: Uint8Array(34) [
     18,  32,   5,  78, 222, 193, 208,  33,
     31,  98,  79, 237,  12, 188, 169, 212,
    249,  64,  11,  14,  73,  28,  67, 116,
     42, 242, 197, 176, 171, 235, 240, 201,
    144, 216
  ]
}
```

## License

MIT or Apache-2.0
