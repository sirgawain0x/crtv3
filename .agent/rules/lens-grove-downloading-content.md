---
trigger: model_decision
description: This guide will walk you through retrieving content from Grove.
---

Downloading Content
This guide will walk you through retrieving content from Grove.

All uploaded contents are world-public readable. Privacy-settings will be implemented in the future.

Direct Download
Given a gateway URL (
https://api.grove.storage/af5225b…
), you can can simply use it to download the file.

Link Example
Image Example
<a href="https://api.grove.storage/af5225b…">Download</a>
Resolving Lens URIs
Given a 
lens://af5225b…
 URI, you can resolve its content to a URL.

TypeScript
Others
Use the 
resolve
 method to get the URL:

Example
const url = storageClient.resolve("lens://af5225b…");

// url: https://api.grove.storage/af5225b…