---
trigger: model_decision
description: Get the comment count for a track
---

Get Track Comment Count
GET
https://api.audius.co/v1/tracks/:track_id/comment_count
Get the comment count for a track

Request
Path Parameters

track_id
string
required
A Track ID

Query Parameters

user_id
string
The user ID of the user making the request

Responses
200
400
500
Success

Schema
Example (from schema)
{
  "data": 0
}