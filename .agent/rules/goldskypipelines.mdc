# Operating pipelines

> Guide to common pipeline operations

### Deploying a pipeline

There are two main ways by which you can deploy a pipeline: in the web app or by using the CLI.

<Note>
  If you prefer to deploy pipelines using a web interface instead check the [Pipeline Builder](/mirror/create-a-pipeline#creating-mirror-pipelines-with-the-pipeline-builder)
</Note>

#### `apply` command + pipeline configuration

The [goldsky pipeline apply](/reference/cli#pipeline-apply) command expects a pipeline configuration file. For example:

<Tabs>
  <Tab title="v3">
    ```yaml base-logs.yaml theme={null}
    name: base-logs-pipeline
    resource_size: s
    apiVersion: 3
    sources:
      base.logs:
        dataset_name: base.logs
        version: 1.0.0
        type: dataset
        description: Enriched logs for events emitted from contracts. Contains the
          contract address, data, topics, decoded event and metadata for blocks and
          transactions.
        display_name: Logs
    transforms: {}
    sinks:
      postgres_base_logs:
        type: postgres
        table: base_logs
        schema: public
        secret_name: GOLDSKY_SECRET
        description: "Postgres sink for: base.logs"
        from: base.logs
    ```
  </Tab>

  <Tab title="v2 (deprecated)">
    ```yaml base-logs.yaml theme={null}
    name: base-logs-pipeline
    definition:
      sources:
        - referenceName: base.logs
          type: dataset
          version: 1.0.0
      transforms: []
      sinks:
        - type: postgres
          table: base_logs
          schema: public
          secretName: GOLDSKY_SECRET
          description: 'Postgres sink for: base.logs'
          sourceStreamName: base.logs
          referenceName: postgres_base_logs
    ```
  </Tab>
</Tabs>

Please save the configuration in a file and run `goldsky pipeline apply <path_to_config_file> --status ACTIVE` to deploy the pipeline.

### Pausing a pipeline

There are several ways by which you can pause a pipeline:

#### 1. `pause` command

`goldsky pipeline pause <name>` will attempt to take a snapshot before pausing the pipeline. The snapshot is successfully taken only if the
pipeline is in a healthy state. After snapshot completes, the pipeline desired status to `PAUSED` runtime status to `TERMINATED`.

Example:

```
> goldsky pipeline pause base-logs-pipeline
◇  Successfully paused pipeline: base-logs-pipeline
Pipeline paused and progress saved. You can restart it with "goldsky pipeline start base-logs-pipeline".
```

#### 2. `stop` command

You can stop a pipeline using the command `goldsky pipeline stop <name>`. Unlike the `pause` command, stopping a pipeline doesn't try to take a snapshot. Mirror will directly set pipeline to `INACTIVE` desired status and `TERMINATED` runtime status.

Example:

```
> goldsky pipeline stop base-logs-pipeline
│
◇  Pipeline stopped. You can restart it with "goldsky pipeline start base-logs-pipeline".
```

#### 3. `apply` command + `INACTIVE` or `PAUSED` status

We can replicate the behaviour of the `pause` and `stop` commands using `pipeline apply` and setting the `--status` flag to  `INACTIVE` or `PAUSED`.

Following up with our previous example, we could stop our deployed pipeline with `goldsky pipeline apply <name_or_path_to_config> --status INACTIVE`

```
goldsky pipeline apply base-logs.yaml --status INACTIVE
│
◇  Successfully validated config file
│
◇  Successfully applied config to pipeline: base-logs-pipeline
```

### Restarting a pipeline

There are two ways to restart an already deployed pipeline:

#### 1. `restart` command

As in: `goldsky pipeline restart <name> --from-snapshot last|none`

Example:

```
goldsky pipeline restart base-logs-pipeline --from-snapshot last
│
◇  Successfully restarted pipeline: base-logs-pipeline

Pipeline restarted. It's safe to exit now (press Ctrl-C). Or you can keep this terminal open to monitor the pipeline progress, it'll take a moment.

✔ Validating request
✔ Fetching pipeline
✔ Validating pipeline status
✔ Fetching runtime details
──────────────────────────────────────────────────────
│ Timestamp   │ Status     │ Total records received │ Total records written │ Errors │
──────────────────────────────────────────────────────
│ 02:54:44 PM │ STARTING   │                      0 │                     0 │ []     │                                  
──────────────────────────────────────────────────────
```

This command will open up a monitor for your pipeline after deploying.

#### 2. `apply` command + `ACTIVE` status

Just as you can stop a pipeline changing its status to `INACTIVE` you can also restart it by setting it to `ACTIVE`

Following up with our previous example, we could restart our stopped pipeline with `goldsky pipeline apply base-logs-pipeline --status ACTIVE`

```
goldsky pipeline apply base-logs.yaml --status ACTIVE
│
◇  Successfully validated config file
│
◇  Successfully applied config to pipeline: base-logs-pipeline

To monitor the status of your pipeline:

Using the CLI: `goldsky pipeline monitor base-logs`
Using the dashboard: https://app.goldsky.com/dashboard/pipelines/stream/base-logs-pipeline/9
```

Unlike the `start` command, this method won't open up the monitor automatically.

### Applying updates to pipeline configuration

For example:

```yaml base-logs.yaml theme={null}
name: base-logs-pipeline
description: a new description for my pipeline
resource_size: xxl

```

<Tabs>
  <Tab title="CLI versions > 11.0.0">
    ```
     goldsky pipeline apply base-logs.yaml --from-snapshot last
     │
     ◇  Successfully validated config file
     │
     ◇  Successfully applied config to pipeline: base-logs-pipeline
    ```
  </Tab>

  <Tab title="Older CLI versions">
    ```
       goldsky pipeline apply base-logs.yaml --use-latest-snapshot
       │
       ◇  Successfully validated config file
       │
       ◇  Successfully applied config to pipeline: base-logs-pipeline
    ```
  </Tab>
</Tabs>

In this example we are changing the pipeline `description` and `resource_size` of the pipeline using its latest succesful snapshot available and informing Mirror
to not take a snapshot before applying the update. This is a common configuration to apply in a situation where you found issues with your pipeline and would like to restart from the last
healthy checkpoint.

For a more complete reference on the configuration attributes you can apply check [this reference](/reference/config-file/pipeline).

### Deleting a pipeline

Although pipelines with desired status `INACTIVE` don't consume any resources (and thus, do not imply a billing cost on your side) it's always nice to keep your project
clean and remove pipelines which you aren't going to use any longer.
You can delete pipelines with the command `goldsky pipeline delete`:

```
> goldsky pipeline delete base-logs-pipeline

✔ Deleted pipeline with name: base-logs-pipeline
```

### In-flight requests

Sometimes you might experience that you are not able to perform a specific action on your pipeline because an in-flight request is currently being processed.
What this means is that there was a previous operation performed in your pipeline which hasn't finished yet and needs to be either processed or discarded before you can apply
your specific operation. A common scenario for this is your pipeline is busy taking a snapshot.

Consider the following example where we recently paused a pipeline (thus triggering a snapshot) and we immediately try to delete it:

```
> goldsky pipeline delete base-logs-pipeline
✖ Cannot process request, found existing request in-flight.

* To monitor run 'goldsky pipeline monitor base-logs-pipeline --update-request'
* To cancel run 'goldsky pipeline cancel-update base-logs-pipeline'
```

Let's look at what process is still to be processed:

```
> goldsky pipeline monitor base-logs-pipeline --update-request
│
◇  Monitoring update progress
│
◇  You may cancel the update request by running goldsky pipeline cancel-update base-logs-pipeline

Snapshot creation in progress: ■■■■■■■■■■■■■                            33%
```

We can see that the snapshot is still taking place. Since we want to delete the pipeline we can go ahead and stop this snapshot creation:

```
> goldsky pipeline cancel-update base-logs-pipeline
│
◇  Successfully cancelled the in-flight update request for pipeline base-logs-pipeline
```

We can now succesfully remove the pipeline:

```
> goldsky pipeline delete base-log-pipeline

✔ Deleted pipeline with name: base-logs-pipeline
```

As you saw in this example, Mirror provides you with commands to see the current in-flight requests in your pipeline and decide whether you want to discard them or wait for them to be processed.


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.goldsky.com/llms.txt