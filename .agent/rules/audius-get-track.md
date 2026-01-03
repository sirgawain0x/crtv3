---
trigger: model_decision
description: Gets a track by ID on Audius
---

Get Track
GET
https://api.audius.co/v1/tracks/:track_id
Gets a track by ID

Request
Path Parameters

track_id
string
required
A Track ID

Responses
200
400
500
Success

Schema
Example (from schema)
{
  "data": {
    "artwork": {
      "150x150": "string",
      "480x480": "string",
      "1000x1000": "string"
    },
    "description": "string",
    "genre": "string",
    "id": "string",
    "track_cid": "string",
    "preview_cid": "string",
    "orig_file_cid": "string",
    "orig_filename": "string",
    "is_original_available": true,
    "mood": "string",
    "release_date": "string",
    "isrc": "string",
    "remix_of": {
      "tracks": [
        {
          "parent_track_id": "string"
        }
      ]
    },
    "repost_count": 0,
    "favorite_count": 0,
    "comment_count": 0,
    "tags": "string",
    "title": "string",
    "user": {
      "album_count": 0,
      "artist_pick_track_id": "string",
      "bio": "string",
      "cover_photo": {
        "640x": "string",
        "2000x": "string"
      },
      "followee_count": 0,
      "follower_count": 0,
      "handle": "string",
      "id": "string",
      "is_verified": true,
      "twitter_handle": "string",
      "instagram_handle": "string",
      "tiktok_handle": "string",
      "verified_with_twitter": true,
      "verified_with_instagram": true,
      "verified_with_tiktok": true,
      "website": "string",
      "donation": "string",
      "location": "string",
      "name": "string",
      "playlist_count": 0,
      "profile_picture": {
        "150x150": "string",
        "480x480": "string",
        "1000x1000": "string"
      },
      "repost_count": 0,
      "track_count": 0,
      "is_deactivated": true,
      "is_available": true,
      "erc_wallet": "string",
      "spl_wallet": "string",
      "spl_usdc_wallet": "string",
      "spl_usdc_payout_wallet": "string",
      "supporter_count": 0,
      "supporting_count": 0,
      "total_audio_balance": 0,
      "wallet": "string"
    },
    "duration": 0,
    "is_downloadable": true,
    "play_count": 0,
    "permalink": "string",
    "is_streamable": true,
    "ddex_app": "string",
    "playlists_containing_track": [
      0
    ],
    "pinned_comment_id": 0,
    "album_backlink": {
      "playlist_id": 0,
      "playlist_name": "string",
      "permalink": "string"
    }
  }
}