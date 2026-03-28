---
trigger: model_decision
description: This guide will walk you through deleting content from Grove.
---

Deleting Content
This guide will walk you through deleting content from Grove.

A mutable resource can be deleted only by authorized addresses, as defined in its Access Control configuration. The Grove API enforces this by requiring a signed message to verify identity before allowing any changes.

Deleting a file removes it permanently, while deleting a folder also removes all its contents.

TypeScript
API
To delete a resource, follow these steps.

1

Define a Signer
First, create an object that satisfies the 
Signer
 interface:

Signer
interface Signer {
  signMessage({ message }): Promise<string>;
}
The address used to sign the message will be extracted from the signature and used to validate the ACL for the resource being deleted.

If you are using Viem, the 
WalletClient
 instances satisfies the 
Signer
 interface so you can use it directly.

2

Delete the Resource
Then, delete the resource by calling the 
delete
 method, using its 
lens://
 URI to remove a file or an entire folder along with its contents.

let response = await storageClient.delete("lens://af5225b…", walletClient);

// response.success: boolean - true if the resource was deleted successfully
That's it—you successfully deleted a resource from Grove.