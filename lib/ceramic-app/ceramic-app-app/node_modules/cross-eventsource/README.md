# cross-eventsource

Provides [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) for Node.js and browser.

If in browser, use standard `globalThis.EventSource`. If in Node.js, use EventSource implementation
of [eventsource package](https://www.npmjs.com/package/eventsource).

## Installation

```shell
pnpm add cross-eventsource
```

## Usage

```typescript
import { EventSource  } from "cross-eventsource";

// And then use it like in a browser
const source = new EventSource('http://localhost/feed')
source.addEventListener('message', (event) => {
  console.log('message', event)
})
source.addEventListener('error', error => {
  console.log('error', error)
})
console.log('listening...')
```
