---
trigger: model_decision
description: Get the users that have listened to a track the most
---

Get Track Top Listeners
GET
https://api.audius.co/v1/tracks/:track_id/top_listeners
Get the users that have listened to a track the most

Request
Path Parameters

track_id
string
required
A Track ID

Query Parameters

offset
integer
The number of items to skip. Useful for pagination (page number * limit)

limit
integer
The number of items to fetch

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
  "data": [
    null
  ]
}