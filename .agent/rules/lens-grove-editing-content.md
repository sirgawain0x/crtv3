---
trigger: model_decision
description: This guide will walk you through editing content on Grove.
---

Editing Content
This guide will walk you through editing content on Grove.

A mutable resource can be modified only by authorized addresses, as defined in its Access Control configuration. The Grove API enforces this by requiring a signed message to verify identity before allowing any changes.

Editing a File
Editing a file retains its 
lens://
 URI, replacing its content with a new version while keeping the same reference.

TypeScript
API
To edit a file, follow these steps.

1

Define a Signer
First, create an object that satisfies the 
Signer
 interface:

Signer
interface Signer {
  signMessage({ message }): Promise<string>;
}
The address used to sign the message will be extracted from the signature and used to validate the ACL for the resource being edited.

If you are using Viem, the 
WalletClient
 instances satisfies the 
Signer
 interface so you can use it directly.

2

Define the New ACL
Then, define the new ACL configuration to use.

Lens Account
Wallet Address
Generic ACL
import { chains } from "@lens-chain/sdk/viem";
import { lensAccountOnly } from "@lens-chain/storage-client";

const acl = lensAccountOnly(
  "0x1234…", // Lens Account Address
  chains.testnet.id
);
It's developer responsability to provide the same ACL configuration if they want to retain the same access control settings.

3

Edit the File
Finally, use the 
editFile
 method to update the file.

Suppose you have a form that allows users to replace the file content, an image in this case:

index.html
<form id="upload-form">
  <label for="files">Select a file:</label>
  <input type="file" name="image" accept="image/*" />
  <button type="submit">Replace</button>
</form>
In the form’s submit event handler, you can edit the by passing:

the 
lens://
 URI of the file to be edited

the new 
File
 reference

the 
Signer
 instance

the ACL configuration

Edit Example
async function onSubmit(event: SubmitEvent) {
  event.preventDefault();

  const input = event.currentTarget.elements["image"];
  const file = input.files[0];

  const response = await storageClient.editFile(
    "lens://323c0e1cceb…",
    file,
    walletClient,
    { acl }
  );

  // response.uri: 'lens://323c0e1cceb…'
}
The response is the same 
FileUploadResponse
 object as when uploading a new file.

That's it—you successfully edited a file.

Editing a JSON File
If you need to update a JSON file and you are using the 
@lens-chain/storage-client
 library, you can use the 
updateJson
 method.

JSON Upload
import { chains } from "@lens-chain/sdk/viem";

const acl = lensAccountOnly("0x1234…", chains.testnet.id); // your ACL configuration
const newData = { key: "value" };

const response = await storageClient.updateJson(
  "lens://323c0e1cceb…",
  newData,
  walletClient,
  { acl }
);