---
trigger: model_decision
description:  Key Terms and Concepts in Grove storage system.
---

Glossary
Key Terms and Concepts in Grove storage system.

Access Control Layer
An Access Control Layer (ACL) configuration determines whether content on Grove is mutable or immutable. It defines the rules for editing and deleting content, using a Lens Account, Wallet Address, or a Generic Contract Call to enforce access permissions.

File
A user-provided file containing arbitrary data. It can be any type of content, such as documents, images, videos, or application-specific data. Each file is uniquely identified by a storage key and may be subject to access control rules if an ACL template is provided during upload.

Folder
A lightweight structure for organizing files and grouping them for bulk uploads or deletions. It does not support full folder semantics, such as nesting or adding files after creation. Instead, it serves as a fixed collection of files referenced by a shared storage key.

Folder Index
A folder index is an optional JSON file uploaded alongside a folder to define its contents. When resolving a folder’s storage key, the index file determines the response. If no folder index is present, a 404 status code is returned.

Lens URI
A Lens URI is a unique identifier for a resource on Grove. It follows the syntax:

lens://<storage_key>
where 
<storage_key>
 is a Storage Key assigned to the resource.

Example: 
lens://af5225b6262e03be6bfacf31aa416ea5e00ebb05e802d0573222a92f8d0677f5

Mutability
A mutable resource can be modified or deleted after it has been uploaded. Immutable resources can never be modified or deleted once they have been uploaded. You can control the mutability of a file by providing an ACL template during upload.

Storage Key
A Storage Key is a globally unique hexadecimal identifier assigned to a file or folder on Grove. It serves as a persistent reference, ensuring that each piece of stored content can be uniquely addressed and retrieved. The storage key always points to the latest version of the associated file or folder.

Example: 
af5225b6262e03be6bfacf31aa416ea5e00ebb05e802d0573222a92f8d0677f5

