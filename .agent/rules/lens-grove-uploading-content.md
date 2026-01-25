---
trigger: model_decision
description: This guide will walk you through uploading content to Grove.
---

Grove supports both single-file uploads and bulk uploads in the form of folders. Currently, the maximum upload size is 125MB. This is an initial limit and will be revised in the future.

All uploaded content is publicly readable. Privacy settings will be implemented in the future.

Permission Models
Uploaded content on Grove can be immutable or mutable, depending on the Access Control Layer (ACL) configuration provided during the upload.

A single ACL configuration can be used for both edit and delete actions, or separate configurations can be defined for each action individually.

Grove supports four types of ACL configurations.

Immutable
Lens Account
Wallet Address
Generic Contract Call
Use this to make the content immutable. The only required parameter is the chain ID, which informs the content retention policy to use.

Content associated with testnets follows different retention policies and may be deleted after a certain period of time.

Uploading a File
TypeScript
API
To upload a single file, follow these steps.

1

Define an ACL
First, define the ACL configuration to use.

Immutable
Lens Account
Wallet Address
Generic ACL
import { chains } from "@lens-chain/sdk/viem";
import { immutable } from "@lens-chain/storage-client";

const acl = immutable(chains.testnet.id);
2

Upload the File
Then, use the 
uploadFile
 method to upload the file.

Let's go through an example. Suppose you have a form that allows users to upload an image file.

index.html
<form id="upload-form">
  <label for="files">Select a file:</label>
  <input type="file" name="image" accept="image/*" />
  <button type="submit">Upload</button>
</form>
In the form’s submit event handler, you can upload the file by passing the 
File
 reference and the ACL configuration from the previous step:

Upload Example
async function onSubmit(event: SubmitEvent) {
  event.preventDefault();

  const input = event.currentTarget.elements["image"];
  const file = input.files[0];

  const response = await storageClient.uploadFile(file, { acl });

  // response.uri: 'lens://323c0e1ccebcfa70dc130772…'
}
The response includes:

uri
: A Lens URI (e.g., 
lens://323c0e1c…
).

gatewayUrl
: A direct link to the file (
https://api.grove.storage/323c0e1c…
).

storageKey
: A unique Storage Key allocated for the file.

Use 
uri
 for Lens Posts and other Lens metadata objects. Use 
gatewayUrl
 for sharing on systems that do not support Lens URIs.

That's it—your file is now available for download.

Quick Upload Methods
This section covers alternative upload methods designed to improve flexibility and ease of use.

Uploading as JSON
If you need to upload a JSON file, you can use the 
uploadAsJson
 method to simplify the process.

JSON Upload
import { chains } from "@lens-chain/sdk/viem";

const data = { key: "value" };
const acl = immutable(chains.testnet.id);

const response = await storageClient.uploadAsJson(data, { acl });
One-Step Upload
If you need to upload an immutable file, you can do so directly via the API without first requesting a storage key. This approach simplifies the process by allowing you to send the file in a single request.

The 
@lens-chain/storage-client
 uses this as an internal optimization to avoid unnecessary API round-trips.

For example, if you want to upload a file named 
watch_this.mp4
, you can do it directly in one step.

curl
HTTP
curl -s -X POST "https://api.grove.storage/?chain_id=37111" \
  --data-binary @watch_this.mp4 \
  -H 'Content-Type: video/mp4'
What happens here:

The file 
watch_this.mp4
 is uploaded directly to the 
https://api.grove.storage/
 URL.

The provided 
Content-Type
 header determines the type of the file.

The query parameter 
chain_id
 specifies the chain ID used to secure the content as part of an immutable ACL configuration.

This is exactly the same as with the full upload process with a multipart request involving an immutable ACL configuration.

Like with the full upload process, the server may respond with one of the following status codes:

201 Created
: The file has been saved in the underlying storage infrastructure.

202 Accepted
: The file is being saved in the edge infrastructure and will be propagated to the underlying storage infrastructure asynchronously.

Response
{
  "storage_key": "323c0e1ccebcfa70dc130772…",
  "gateway_url": "https://api.grove.storage/323c0e1ccebcfa70dc130772…",
  "uri": "lens://323c0e1ccebcfa70dc130772…",
  "status_url": "https://api.grove.storage/status/323c0e1ccebcfa70dc130772…"
}
Where the response includes the same fields as in the full upload process.

Uploading a Folder
TypeScript
API
To upload a folder, follow these steps.

1

Define an ACL
First, define the ACL configuration to use. This will be applied to all files in the folder.

Immutable
Lens Account
Wallet Address
Generic ACL
import { chains } from "@lens-chain/sdk/viem";
import { immutable } from "@lens-chain/storage-client";

const acl = immutable(chains.testnet.id);
2

Define a Folder Index
Next, decide how you want the folder to be indexed. This determines what data will be returned when accessing the folder's URL.

Currently, only a JSON representation of the folder's content is supported.

You can choose between static and dynamic index files.

Static Index File

Allows you to specify a custom JSON file to be returned.

Example
const content = {
  name: "My Folder",
  description: "This is a folder",
};

const index = new File([JSON.stringify(content)], "index.json", {
  type: "text/plain",
});
Dynamic Index File

Generates a JSON file based on the URIs of the individual files.

This is usually the best choice for storing the content of a Lens Post with media, as it allows defining a single URI that can be used as the Post's 
contentURI
. This streamlines any delete operations, as one can simply delete the resource at that URI, and all associated content will be deleted.

Example
import type { CreateIndexContent, Resource } from "@lens-chain/storage-client";

const index: CreateIndexContent = (resources: Resource[]) => {
  return {
    name: "My Folder",
    files: resources.map((resource) => ({
      uri: resource.uri,
      gatewayUrl: resource.gatewayUrl,
      storageKey: resource.storageKey,
    })),
  };
};
Each 
Resource
 object contains:

uri
: A Lens URI (e.g., 
lens://323c0e1c…
).

gatewayUrl
: A direct link to the file (
https://api.grove.storage/323c0e1c…
).

storageKey
: A unique Storage Key allocated for the file.

Use 
uri
 for Lens Posts media and or Lens Account Metadata pictures. Use 
gatewayUrl
 for sharing on systems that do not support Lens URIs.

3

Upload the Files
Finally, use the 
uploadFolder
 method to upload all files in a folder.

Let's go through an example. Suppose you have a form that allows users to upload multiple images.

index.html
<form id="upload-form">
  <label for="files">Select multiple files:</label>
  <input type="file" name="images" accept="image/*" multiple />
  <button type="submit">Upload</button>
</form>
In the form’s submit event handler, you can upload all files by passing the 
FileList
 reference, along with the ACL configuration and the index configuration from the previous steps:

Upload Example
async function onSubmit(event: SubmitEvent) {
  event.preventDefault();

  const input = event.currentTarget.elements["images"];

  const response = await storageClient.uploadFolder(input.files, {
    acl,
    index,
  });

  // response.folder.uri: 'lens://af5225b6262…'
  // response.files[0].uri: 'lens://47ec69ef75122…'
}
The response includes:

folder: Resource
: The 
Resource
 object representing the uploaded folder.

files: Resource[]
: An array of 
Resource
 objects, one for each uploaded file.

That's it—your folder and its content are now available for download.

Fine-Grained ACL
As described earlier, edit and delete actions can share the same ACL, but they can also be configured separately. This allows for more granular control, enabling different permissions for modifying and removing content.

When integrating directly with the API, you can define two separate ACL files—
acl-edit.json
 and 
acl-delete.json
—each specifying the desired configurations. These ACLs are then included as separate entries in the multipart request.

curl
HTTP
curl -X POST 'https://api.grove.storage/323c0e1ccebcfa70dc130772…' \
     -F '323c0e1ccebcfa70dc130772…=/path/to/watch_this.mp4;type=video/mp4' \
     -F 'lens-acl-edit.json=/path/to/acl-edit.json;type=application/json' \
     -F 'lens-acl-delete.json=/path/to/acl-delete.json;type=application/json'
What happens here:

The edit ACL configuration is included as a separate multipart body and addressed under 
name=lens-acl-edit.json
.

The delete ACL configuration is included as a separate multipart body and addressed under 
name=lens-acl-delete.json
.

For folder uploads, the provided ACL configurations will apply to all files in the folder.

Propagation Status
Whenever you upload a file or a folder, you can check the status of the resource to see if it has been fully propagated to the underlying storage infrastructure.

Checking the status is usually unnecessary unless you need to edit or delete the resource soon after uploading. Persistence typically completes within 5 seconds.

TypeScript
API
Use the 
response.waitForPropagation()
 method to wait for the resource to be fully propagated to the underlying storage infrastructure.

Wait Until Persisted
const response = await storageClient.uploadFile(file, { acl });

await response.waitForPropagation();