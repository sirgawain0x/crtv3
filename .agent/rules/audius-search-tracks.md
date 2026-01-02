---
trigger: model_decision
description: Search for a track or tracks on audius
---

Search Tracks
GET
https://api.audius.co/v1/tracks/search
Search for a track or tracks

Request
Query Parameters

offset
integer
The number of items to skip. Useful for pagination (page number * limit)

limit
integer
The number of items to fetch

query
string
The search query

genre
string[]
The genres to filter by

sort_method
string
Possible values: [relevant, popular, recent]

The sort method

mood
string[]
The moods to filter by

only_downloadable
string
Default value: false

Return only downloadable tracks

includePurchaseable
string
Whether or not to include purchaseable content

is_purchaseable
string
Only include purchaseable tracks and albums in the track and album results

has_downloads
string
Only include tracks that have downloads in the track results

key
string[]
Only include tracks that match the musical key

bpm_min
string
Only include tracks that have a bpm greater than or equal to

bpm_max
string
Only include tracks that have a bpm less than or equal to

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