---
trigger: model_decision
description: Inspects the details of the files for multiple audius tracks
---

Inspects the details of the files for multiple tracks
GET
https://api.audius.co/v1/tracks/inspect
Inspect multiple tracks

Request
Query Parameters

id
string[]
required
List of track IDs to inspect

original
boolean
Optional - if set to true inspects the original file quality

Responses
200
400
500
Success

Schema
Example (from schema)
Schema

data

object[]

Array [

size
integer
required
content_type
string
required
]