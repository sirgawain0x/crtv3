---
description: Create a table containing ERC-20 Transfers for several or all token contracts
globs: 
alwaysApply: false
---

# ERC-20 transfers

> Create a table containing ERC-20 Transfers for several or all token contracts

ERC-20 tokens provide a standardized format for fungible digital assets within EVM ecosystems. The process of transferring ERC-20 tokens into a database is fundamental, unlocking opportunities for data analysis, tracking, and the development of innovative solutions.

This guide is part of a series of tutorials on how you can stream transfer data into your datawarehouse using Mirror pipelines. Here we will be focusing on ERC-20 Transfers, visit the following guides for other types of Transfers:

* [Native Transfers](/mirror/guides/token-transfers/Native-transfers)
* [ERC-721 Transfers](/mirror/guides/token-transfers/ERC-721-transfers)
* [ERC-1155 Transfers](/mirror/guides/token-transfers/ERC-1155-transfers)

## What you'll need

1. A Goldky account and the CLI installed
   <Accordion title="Install Goldsky's CLI and log in">
     1. Install the Goldsky CLI:

        **For macOS/Linux:**

        ```shell  theme={null}
        curl https://goldsky.com | sh
        ```

        **For Windows:**

        ```shell  theme={null}
        npm install -g @goldskycom/cli
        ```

        <Note>Windows users need to have Node.js and npm installed first. Download from [nodejs.org](https://nodejs.org) if not already installed.</Note>
     2. Go to your [Project Settings](https://app.goldsky.com/dashboard/settings) page and create an API key.
     3. Back in your Goldsky CLI, log into your Project by running the command `goldsky login` and paste your API key.
     4. Now that you are logged in, run `goldsky` to get started:
        ```shell  theme={null}
        goldsky
        ```
   </Accordion>
2. A basic understanding of the [Mirror product](/mirror)
3. A destination sink to write your data to. In this example, we will use [the PostgreSQL Sink](/mirror/sinks/postgres)

## Introduction

In order to stream all the ERC-20 Transfers of a chain there are two potential methods available:

1. Use the readily available ERC-20 dataset for the chain you are interested in: this is the easiest and quickest method to get you streaming token transfers into your sink of choice with minimum code.
2. Build the ERC-20 Transfers pipeline from scratch using raw or decoded logs: this method takes more code and time to implement but it's a great way to learn about how you can use decoding functions in case you
   want to build more customized pipelines.

Let's explore both method below with more detail:

## Using the ERC-20 Transfers Source Dataset

Every EVM chain has its own ERC-20 dataset available for you to use as source in your pipelines. You can check this by running the `goldsky dataset list` command and finding the EVM of your choice.
For this example, let's use `apex` chain and create a simple pipeline definition using its ERC-20 dataset that writes the data into a PostgreSQL instance:

```yaml apex-erc20-transfers.yaml theme={null}
name: apex-erc20-pipeline
resource_size: s
apiVersion: 3
sources:
  apex.erc20_transfers:
    dataset_name: apex.erc20_transfers
    version: 1.0.0
    type: dataset
    start_at: earliest
transforms: {}
sinks:
  postgres_apex.erc20_transfers_public_apex_erc20_transfers:
    type: postgres
    table: apex_erc20_transfers
    schema: public
    secret_name: <YOUR_SECRET>
    description: "Postgres sink for Dataset: apex.erc20_transfers"
    from: apex.erc20_transfers
```

<Note>
  If you copy and use this configuration file, make sure to update: 1. Your
  `secretName`. If you already [created a secret](/mirror/manage-secrets), you
  can find it via the [CLI command](/reference/cli#secret) `goldsky secret
    list`. 2. The schema and table you want the data written to, by default it
  writes to `public.apex_erc20_transfers`.
</Note>

You can start above pipeline by running:

```bash  theme={null}
goldsky pipeline start apex-erc20-pipeline.yaml
```

Or

```bash  theme={null}
goldsky pipeline apply apex-erc20-pipeline.yaml --status ACTIVE
```

That's it! You should soon start seeing ERC-20 token transfers in your database.

## Building ERC-20 Transfers from scratch using logs

In the previous method we just explored, the ERC-20 datasets that we used as source to the pipeline encapsulates all the decoding logic that's explained in this section.
Read on if you are interested in learning how it's implemented in case you want to consider extending or modifying this logic yourself.

There are two ways that we can go about building this token transfers pipeline from scratch:

1. Use the `raw_logs` Direct Indexing dataset for that chain in combination with [Decoding Transform Functions](/reference/mirror-functions/decoding-functions) using the ABI of a specific ERC-20 Contract.
2. Use the `decoded_logs` Direct Indexing dataset for that chain in which the decoding process has already been done by Goldsky. This is only available for certain chains as you can check in [this list](/mirror/sources/direct-indexing).

We'll primarily focus on the first decoding method using `raw_logs` and decoding functions as it's the default and most used way of decoding; we'll also present an example using `decoded_logs` and highlight the differences between the two.

### Building ERC-20 Tranfers using Decoding Transform Functions

In this example, we will stream all the `Transfer` events of all the ERC-20 Tokens for the [Scroll chain](https://scroll.io/). To that end, we will dinamically fetch the ABI of the USDT token from the Scrollscan API (available [here](https://api.scrollscan.com/api?module=contract\&action=getabi\&address=0xc7d86908ccf644db7c69437d5852cedbc1ad3f69))
and use it to identify all the same events for the tokens in the chain. We have decided to use the ABI of USDT token contract for this example but any other ERC-20 compliant token would also work.

We need to differentiate ERC-20 token transfers from ERC-721 (NFT) transfers since they have the same event signature in decoded data: `Transfer(address,address,uint256)`.
However, if we look closely at their event definitions we can appreciate that the number of topics differ:

* [ERC-20](https://ethereum.org/en/developers/docs/standards/tokens/erc-20/): `event Transfer(address indexed _from, address indexed _to, uint256 _value)`
* [ERC-721](https://ethereum.org/en/developers/docs/standards/tokens/erc-721/): `event Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId)`

ERC-20 Transfer events have three topics (one topic for event signature + 2 topics for the indexed params).
NFTs on the other hand have four topics as they have one more indexed param in the event signature.
We will use this as a filter in our pipeline transform to only transfer ERC-20 Transfer events.

Let's now see all these concepts applied in an example pipeline definition:

#### Pipeline Definition

<Tabs>
  <Tab title="v3">
    ```yaml scroll-erc20-transfers.yaml theme={null}
    name: scroll-erc20-transfers
    apiVersion: 3
    sources:
      my_scroll_mainnet_raw_logs:
        type: dataset
        dataset_name: scroll_mainnet.raw_logs
        version: 1.0.0
    transforms:
      scroll_decoded:
        primary_key: id
        # Fetch the ABI from scrollscan for USDT
        sql: >
          SELECT
            *,
            _gs_log_decode(
                _gs_fetch_abi('https://api.scrollscan.com/api?module=contract&action=getabi&address=0xc7d86908ccf644db7c69437d5852cedbc1ad3f69', 'etherscan'),
                `topics`,
                `data`
            ) AS `decoded`
            FROM my_scroll_mainnet_raw_logs
            WHERE topics LIKE '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef%'
            AND SPLIT_INDEX(topics, ',', 3) IS NULL
      scroll_clean:
        primary_key: id
        # Clean up the previous transform, unnest the values from the `decoded` object
        sql: >
          SELECT
            *,
            decoded.event_params AS `event_params`,
            decoded.event_signature AS `event_name`
            FROM scroll_decoded
            WHERE decoded IS NOT NULL
            AND decoded.event_signature = 'Transfer'
      scroll_20_transfers:
        primary_key: id
        sql: >
          SELECT
            id,
            address AS token_id,
            lower(event_params[1]) AS sender,
            lower(event_params[2]) AS recipient,
            lower(event_params[3]) AS `value`,
            event_name,
            block_number,
            block_hash,
            log_index,
            transaction_hash,
            transaction_index
            FROM scroll_clean
    sinks:
      scroll_20_sink:
        type: postgres
        table: erc20_transfers
        schema: mirror
        secret_name: <YOUR_SECRET>
        description: Postgres sink for ERC20 transfers
        from: scroll_20_transfers
    ```
  </Tab>

  <Tab title="v2 (deprecated)">
    ```yaml scroll-erc20-transfers.yaml theme={null}
    sources:
      - type: dataset
        referenceName: scroll_mainnet.raw_logs
        version: 1.0.0
    transforms:
      - referenceName: scroll_decoded
        type: sql
        primaryKey: id
        # Fetch the ABI from scrollscan for USDT
        sql: >
          SELECT
            *,
            _gs_log_decode(
                _gs_fetch_abi('https://api.scrollscan.com/api?module=contract&action=getabi&address=0xc7d86908ccf644db7c69437d5852cedbc1ad3f69', 'etherscan'),
                `topics`,
                `data`
            ) AS `decoded`
            WHERE topics LIKE '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef%'
            AND SPLIT_INDEX(topics, ',', 3) IS NULL
            FROM scroll_mainnet.raw_logs

      - referenceName: scroll_clean
        primaryKey: id
        type: sql
        # Clean up the previous transform, unnest the values from the `decoded` object
        sql: >
          SELECT
            *,
            decoded.event_params AS `event_params`,
            decoded.event_signature AS `event_name`
            FROM scroll_decoded
            WHERE decoded IS NOT NULL
            AND decoded.event_signature = 'Transfer'

      - referenceName: scroll_20_transfers
        primaryKey: id
        type: sql
        sql: >
          SELECT
            id,
            address AS token_id,
            lower(event_params[1]) AS sender,
            lower(event_params[2]) AS recipient,
            lower(event_params[3]) AS `value`,
            event_name,
            block_number,
            block_hash,
            log_index,
            transaction_hash,
            transaction_index
            FROM scroll_clean
    sinks:
      - type: postgres
        table: erc20_transfers
        schema: mirror
        secretName: <YOUR_SECRET>
        description: Postgres sink for ERC20 transfers
        referenceName: scroll_20_sink
        sourceStreamName: scroll_20_transfers
    ```
  </Tab>
</Tabs>

<Note>
  If you copy and use this configuration file, make sure to update: 1. Your
  `secretName`. If you already [created a secret](/mirror/manage-secrets), you
  can find it via the [CLI command](/reference/cli#secret) `goldsky secret
    list`. 2. The schema and table you want the data written to, by default it
  writes to `mirror.erc20_transfers`.
</Note>

There are three transforms in this pipeline definition which we'll explain how they work:

```sql Transform: scroll_decoded theme={null}
SELECT
  *,
  _gs_log_decode(
      _gs_fetch_abi('https://api.scrollscan.com/api?module=contract&action=getabi&address=0xc7d86908ccf644db7c69437d5852cedbc1ad3f69', 'etherscan'),
      `topics`,
      `data`
  ) AS `decoded`
  FROM scroll_mainnet.raw_logs
  WHERE topics LIKE '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef%'
  AND SPLIT_INDEX(topics, ',', 3) IS NULL
```

As explained in the [Decoding Contract Events guide](/mirror/guides/decoding-contract-events) we first make use of the `_gs_fetch_abi` function to get the ABI from Scrollscan and pass it as first argument
to the function `_gs_log_decode` to decode its topics and data. We store the result in a `decoded` [ROW](https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/table/types/#row) which we unnest on the next transform.
We also limit the decoding to the relevent events using the topic filter and `SPLIT_INDEX` to only include ERC-20 transfers.

* `topics LIKE '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef%'`: `topics` is a comma separated string. Each value in the string is a hash. The first is the hash of the full event\_signature (including arguments), in our case `Transfer(address,address,uint256)` for ERC-20, which is hashed to `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`. We use `LIKE` to only consider the first signature, with a `%` at the end, which acts as a wildcard.
* `SPLIT_INDEX(topics, ',', 3) IS NULL`: as mentioned in the introduction, ERC-20 transfers share the same `event_signature` as ERC-721 transfers. The difference between them is the number of topics associated with the event. ERC-721 transfers have four topics, and ERC-20 transfers have three.

```sql Transform: scroll_clean theme={null}
SELECT
  *,
  decoded.event_params AS `event_params`,
  decoded.event_signature AS `event_name`
  FROM scroll_decoded
  WHERE decoded IS NOT NULL
  AND decoded.event_signature = 'Transfer'
```

In this second transform, we take the `event_params` and `event_signature` from the result of the decoding. We then filter the query on:

* `decoded IS NOT NULL`: to leave out potential null results from the decoder
* `decoded.event_signature = 'Transfer'`: the decoder will output the event name as event\_signature, excluding its arguments. We use it to filter only for Transfer events.

```sql Transform: scroll_20_transfers theme={null}
SELECT
  id,
  address AS token_id,
  lower(event_params[1]) AS sender,
  lower(event_params[2]) AS recipient,
  lower(event_params[3]) AS `value`,
  event_name,
  block_number,
  block_hash,
  log_index,
  transaction_hash,
  transaction_index
  FROM scroll_clean
```

In this last transform we are essentially selecting all the Transfer information we are interested in having in our database.
We've included a number of columns that you may or may not need, the main columns needed for most purposes are: `id`, `address` (if you are syncing multiple contract addresses), `sender`, `recipient`, `token_id`, and `value`.

* `id`: This is the Goldsky provided `id`, it is a string composed of the dataset name, block hash, and log index, which is unique per event, here's an example: `log_0x60eaf5a2ab37c73cf1f3bbd32fc17f2709953192b530d75aadc521111f476d6c_18`
* `address AS token_id`: We use the `lower` function here to lower-case the address to make using this data simpler downstream, we also rename the column to `token_id` to make it more explicit.
* `lower(event_params[1]) AS sender`: Here we continue to lower-case values for consistency. In this case we're using the first element of the `event_params` array (using a 1-based index), and renaming it to `sender`. Each event parameter maps to an argument to the `event_signature`.
* `lower(event_params[2]) AS recipient`: Like the previous column, we're pulling the second element in the `event_params` array and renaming it to `recipient`.
* `lower(event_params[3]) AS value`: We're pulling the third element in the `event_params` array and renaming it to `value` to represent the amount of the token\_id sent in the transfer.

Lastly, we are also adding more block metadata to the query to add context to each transaction:

```
event_name,
block_number,
block_hash,
log_index,
transaction_hash,
transaction_index
```

It's worth mentioning that in this example we are interested in all the ERC-20 Transfer events but if you would like to filter for specific contract addresses you could simply add a `WHERE` filter to this query with address you are interested in, like: `WHERE address IN ('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', '0xdac17f958d2ee523a2206206994597c13d831ec7')`

#### Deploying the pipeline

Our last step is to deploy this pipeline and start sinking ERC-20 transfer data into our database. Assuming we are using the same file name for the pipeline configuration as in this example,
we can use the [CLI pipeline create command](/reference/cli#pipeline-create) like this:

`goldsky pipeline create scroll-erc20-transfers --definition-path scroll-erc20-transfers.yaml`

After some time, you should see the pipeline start streaming Transfer data into your sink.

<Note>
  Remember that you can always speed up the streaming process by
  [updating](/reference/cli#pipeline-update) the resourceSize of the pipeline
</Note>

Here's an example transfer record from our sink:

| id                                                                         | token\_id                                  | sender                                     | recipient                                  | value             | event\_name | block\_number | block\_hash                                                        | log\_index | transaction\_hash                                                  | transaction\_index |
| -------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------ | ----------------- | ----------- | ------------- | ------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------ | ------------------ |
| log\_0x666622ad5c04eb5a335364d9268e24c64d67d005949570061d6c150271b0da12\_2 | 0x5300000000000000000000000000000000000004 | 0xefeb222f8046aaa032c56290416c3192111c0085 | 0x8c5c4595df2b398a16aa39105b07518466db1e5e | 22000000000000006 | Transfer    | 5136          | 0x666622ad5c04eb5a335364d9268e24c64d67d005949570061d6c150271b0da12 | 2          | 0x63097d8bd16e34caacfa812d7b608c29eb9dd261f1b334aa4cfc31a2dab2f271 | 0                  |

We can find this [transaction in Scrollscan](https://scrollscan.com/tx/0x63097d8bd16e34caacfa812d7b608c29eb9dd261f1b334aa4cfc31a2dab2f271). We see that it corresponds to the second internal transfers of Wrapped ETH (WETH):

<img className="block mx-auto" width="450" src="https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/mirror/guides/token-transfers/erc20-transaction.png?fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=f8e34475e840382bf89c71a258e4700f" data-og-width="2186" data-og-height="242" data-path="images/mirror/guides/token-transfers/erc20-transaction.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/mirror/guides/token-transfers/erc20-transaction.png?w=280&fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=a4faac656f399d5f2b6144aaaeeb6ba8 280w, https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/mirror/guides/token-transfers/erc20-transaction.png?w=560&fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=3d038e4b776219331393bcc7be3f52bf 560w, https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/mirror/guides/token-transfers/erc20-transaction.png?w=840&fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=b5f42aa9a5f022c0d90ca3f0bfaa0bf8 840w, https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/mirror/guides/token-transfers/erc20-transaction.png?w=1100&fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=fea6a60325208ae791ce16ac4752f8f0 1100w, https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/mirror/guides/token-transfers/erc20-transaction.png?w=1650&fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=82c1c28b7ccae9e5c51edf7b07a3754b 1650w, https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/mirror/guides/token-transfers/erc20-transaction.png?w=2500&fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=0ce55e0d99dc0c3d3e444cb1f31a0955 2500w" />

This concludes our successful deployment of a Mirror pipeline streaming ERC-20 Tokens from Scroll chain into our database using inline decoders. Congrats! 🎉

### ERC-20 Transfers using decoded datasets

As explained in the Introduction, Goldsky provides decoded datasets for Raw Logs and Raw Traces for a number of different chains. You can check [this list](/mirror/sources/direct-indexing) to see if the chain you are interested in has these decoded datasets.
In these cases, there is no need for us to run Decoding Transform Functions as the dataset itself will already contain the event signature and event params decoded.

Click on the button below to see an example pipeline definition for streaming ERC-20 tokens on the Ethereum chain using the `decoded_logs` dataset.

<Accordion title="Decoded Logs Pipeline Definition">
  ```yaml ethereum-decoded-logs-erc20-transfers.yaml theme={null}
  sources:
    - referenceName: ethereum.decoded_logs
      version: 1.0.0
      type: dataset
      startAt: earliest
      description: Decoded logs for events emitted from contracts. Contains the
        decoded event signature and event parameters, contract address, data,
        topics, and metadata for the block and transaction.
  transforms:
    - type: sql
      referenceName: ethereum_20_transfers
      primaryKey: id
      description: ERC20 Transfers
      sql: >-
        SELECT
                address AS token_id,
                lower(event_params[1]) AS sender,
                lower(event_params[2]) AS recipient,
                lower(event_params[3]) AS `value`,
                raw_log.block_number       AS block_number,
                raw_log.block_hash         AS block_hash,
                raw_log.log_index          AS log_index,
                raw_log.transaction_hash   AS transaction_hash,
                raw_log.transaction_index  AS transaction_index,
                id
                FROM ethereum.decoded_logs WHERE raw_log.topics LIKE '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef%'
                AND SPLIT_INDEX(raw_log.topics, ',', 3) IS NULL
  sinks:
    - type: postgres
      table: erc20_transfers
      schema: mirror
      secretName: <YOUR SECRET>
      description: Postgres sink for ERC20 transfers
      referenceName: ethereum_20_sink
      sourceStreamName: ethereum_20_transfers
  ```

  <Note>
    If you copy and use this configuration file, make sure to update:

    1. Your `secretName`. If you already [created a secret](/mirror/manage-secrets), you can find it via the [CLI command](/reference/cli#secret) `goldsky secret list`.
    2. The schema and table you want the data written to, by default it writes to `mirror.erc20_transfers`.
  </Note>
</Accordion>

You can appreciate that it's pretty similar to the inline decoding pipeline method but here we simply create a transform which does the filtering based on the `raw_log.topics` just as we did on the previous method.

Assuming we are using the same filename for the pipeline configuration as in this example and that you have added your own [secret](/mirror/manage-secrets)
we can deploy this pipeline with the [CLI pipeline create command](/reference/cli#pipeline-create):

`goldsky pipeline create ethereum-erc20-transfers --definition-path ethereum-decoded-logs-erc20-transfers.yaml`

## Conclusion

In this guide, we have learnt how Mirror simplifies streaming ERC-20 Transfer events into your database.

We have first looked into the easy way of achieving this, simply by making use of the readily available ERC-20 dataset of the EVM chaina and using its as the source to our pipeline.

Next, we have deep dived into the standard decoding method using Decoding Transform Functions, implementing an example on Scroll chain.
We have also looked into an example implementation using the decoded\_logs dataset for Ethereum. Both are great decoding methods and depending on your use case and dataset availability you might prefer one over the other.

With Mirror, developers gain flexibility and efficiency in integrating blockchain data, opening up new possibilities for applications and insights. Experience the transformative power of Mirror today and redefine your approach to blockchain data integration.

Can't find what you're looking for? Reach out to us at [support@goldsky.com](mailto:support@goldsky.com) for help.


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.goldsky.com/llms.txt