---
trigger: model_decision
description: Gets the most shared tracks for a given time range
---

Get Most Shared Tracks
GET
https://api.audius.co/v1/tracks/most-shared
Gets the most shared tracks for a given time range

Request
Query Parameters

user_id
string
The user ID of the user making the request

limit
integer
Possible values: >= 1 and <= 100

Default value: 10

Number of tracks to fetch

offset
integer
Default value: 0

The number of items to skip. Useful for pagination (page number * limit)

time_range
string
Possible values: [week, month, allTime]

Default value: week

The time range to consider

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

artwork

object

required

description
string
genre
string
required
id
string
required
track_cid
string
preview_cid
string
orig_file_cid
string
orig_filename
string
is_original_available
boolean
required
mood
string
release_date
string
isrc
string
remix_of

object

repost_count
integer
required
favorite_count
integer
required
comment_count
integer
required
tags
string
title
string
required
user

object

required

duration
integer
required
is_downloadable
boolean
required
play_count
integer
required
permalink
string
required
is_streamable
boolean
ddex_app
string
playlists_containing_track
integer[]
pinned_comment_id
integer
album_backlink

object

]