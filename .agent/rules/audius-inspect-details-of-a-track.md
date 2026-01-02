---
trigger: model_decision
description: Inspect a track
---

Inspects the details of the file for a track
GET
https://api.audius.co/v1/tracks/:track_id/inspect
Inspect a track

Request
Path Parameters

track_id
string
required
A Track ID

Query Parameters

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
{
  "data": {
    "size": 0,
    "content_type": "string"
  }
}