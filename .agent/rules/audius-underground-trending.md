---
trigger: model_decision
description: Gets the top 100 trending underground tracks on Audius
---

Get Underground Trending Tracks
GET
https://api.audius.co/v1/tracks/trending/underground
Gets the top 100 trending underground tracks on Audius

Request
Query Parameters

offset
integer
The number of items to skip. Useful for pagination (page number * limit)

limit
integer
The number of items to fetch

Responses
200
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