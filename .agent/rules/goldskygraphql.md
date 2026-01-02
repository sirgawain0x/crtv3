---
description: All subgraphs come with a GraphQL interface that allows you to query the data in the subgraph.
globs: 
alwaysApply: true
---

# GraphQL Endpoints

All subgraphs come with a GraphQL interface that allows you to query the data in the subgraph. Traditionally these GraphQL
interfaces are completely public and can be accessed by anyone. Goldsky supports public GraphQL endpoints for both
subgraphs and their tags.

## Public endpoints

For example, in the Goldsky managed community project there exists the `uniswap-v3-base/1.0.0` subgraph with a tag of `prod`.
This subgraph has a [public endpoint](https://api.goldsky.com/api/public/project_cl8ylkiw00krx0hvza0qw17vn/subgraphs/uniswap-v3-base/1.0.0/gn)
and the tag `prod` also has a [public endpoint](https://api.goldsky.com/api/public/project_cl8ylkiw00krx0hvza0qw17vn/subgraphs/uniswap-v3-base/prod/gn).

<img src="https://mintcdn.com/goldsky-38/vSVw2TFyUeHmzA4d/images/uniswap-base-public.png?fit=max&auto=format&n=vSVw2TFyUeHmzA4d&q=85&s=e6c2ea9b3e334501f757e7aa2410b4be" alt="Uniswap public subgraph endpoint for prod tag" data-og-width="1550" width="1550" data-og-height="94" height="94" data-path="images/uniswap-base-public.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/goldsky-38/vSVw2TFyUeHmzA4d/images/uniswap-base-public.png?w=280&fit=max&auto=format&n=vSVw2TFyUeHmzA4d&q=85&s=b49b500674e7a551d3ed3ca11d183369 280w, https://mintcdn.com/goldsky-38/vSVw2TFyUeHmzA4d/images/uniswap-base-public.png?w=560&fit=max&auto=format&n=vSVw2TFyUeHmzA4d&q=85&s=52749c3596af8ce69db96901674dfd1c 560w, https://mintcdn.com/goldsky-38/vSVw2TFyUeHmzA4d/images/uniswap-base-public.png?w=840&fit=max&auto=format&n=vSVw2TFyUeHmzA4d&q=85&s=b935bfb1eb7908458b55d872c2f81542 840w, https://mintcdn.com/goldsky-38/vSVw2TFyUeHmzA4d/images/uniswap-base-public.png?w=1100&fit=max&auto=format&n=vSVw2TFyUeHmzA4d&q=85&s=0200cd4276f5d80243c64d83d7c05581 1100w, https://mintcdn.com/goldsky-38/vSVw2TFyUeHmzA4d/images/uniswap-base-public.png?w=1650&fit=max&auto=format&n=vSVw2TFyUeHmzA4d&q=85&s=b36d005d116ce1dfadfdb73ee3a6cb0c 1650w, https://mintcdn.com/goldsky-38/vSVw2TFyUeHmzA4d/images/uniswap-base-public.png?w=2500&fit=max&auto=format&n=vSVw2TFyUeHmzA4d&q=85&s=9d77802350aaf498270bb08d876b31fa 2500w" />

In general, public endpoints come in the form of `https://api.goldsky.com/api/public/<project_id>/subgraphs/<subgraph name>/<version or tag>/gn`

Goldsky adds rate limiting to all public endpoints to prevent abuse. We currently have a default rate limit of 50 requests per 10 seconds.
This can be unlocked by contacting us at [support@goldsky.com](mailto:support@goldsky.com).

One major downside of public endpoints is that they are completely public and can be accessed by anyone. This means that
anyone can query the data in the subgraph and potentially abuse the endpoint. This is why we also support private endpoints.

## Private endpoints

Private endpoints are only accessible by authenticated users. This means that you can control who can access the data in
your subgraph. Private endpoints are only available to users who have been granted access to the subgraph. Accessing
a private endpoint requires sending an `Authorization` header with the GraphQL request. The value of the `Authorization`
header should be in the form of `Bearer <token>` where the `token` is an API token that has been generated through
[Goldsky project general settings](https://app.goldsky.com/dashboard/settings#general). Remember that API tokens are scoped to specific projects. This means an API
token for `projectA` cannot be used to access the private endpoints of subgraphs in `projectB`.

Private endpoints can be toggled on and off for each subgraph and tag. This means that you can have a mix of public and
private endpoints for your subgraph. For example, you can have a public endpoint for your subgraph and a private endpoint
for a specific tag.

Here's an example of how to access a private endpoint using the GraphiQL interface:

<img src="https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/query-private-endpoint-graphiql.png?fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=f0c9227ddf02484cdc919f97ef30c7bc" alt="GraphiQL query with Authorization header" data-og-width="3456" width="3456" data-og-height="1968" height="1968" data-path="images/query-private-endpoint-graphiql.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/query-private-endpoint-graphiql.png?w=280&fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=c1a7dfe9c083c08d024a6850969f0e23 280w, https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/query-private-endpoint-graphiql.png?w=560&fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=9519560be67e4720319793f681b7999d 560w, https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/query-private-endpoint-graphiql.png?w=840&fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=df7610b89cd047ac8acfa667fc49b9cd 840w, https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/query-private-endpoint-graphiql.png?w=1100&fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=f55cc4badde914d3bf8c79cc80f8d3c8 1100w, https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/query-private-endpoint-graphiql.png?w=1650&fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=f9e6449ff99d8bb6ed6f382a45080cbc 1650w, https://mintcdn.com/goldsky-38/djvhUUMseW21frQF/images/query-private-endpoint-graphiql.png?w=2500&fit=max&auto=format&n=djvhUUMseW21frQF&q=85&s=a8d5d1314cad2bbeafb69ea86e9f2b3a 2500w" />

Private subgraphs endpoints follow the same format as public subgraph endpoints except they start with `/api/private`
instead of `/api/public`. For example, the private endpoint for the `prod` tag of the `uniswap-v3-base/1.0.0` subgraph
would be `https://api.goldsky.com/api/private/project_cl8ylkiw00krx0hvza0qw17vn/subgraphs/uniswap-v3-base/1.0.0/gn`.

### Revoking access

To revoke access to a private endpoint you can simply delete the API token that was used to access the endpoint. If you
don't know which key is used to access the endpoint, you'll have to revoke all API tokens for all users that have access
to the project.

## Enabling and disabling public and private endpoints

By default, all new subgraphs and their tags come with the public endpoint enabled and the private endpoint disabled.
Both of these settings can be changed using the CLI and the webapp. To change either setting, you must have [`Editor` permissions](../rbac).

### CLI

To toggle one of these settings using the CLI you can use the `goldsky subgraph update` command with the
`--public-endpoint <disabled|enabled>` flag and/or the `--private-endpoint <disabled|enabled>` flag. Here's a complete example
disabling the public endpoint and enabling the private endpoint for the `prod` tag of the `uniswap-v3-base/1.0.0` subgraph:

```bash  theme={null}
goldsky subgraph update uniswap-v3-base/prod --public-endpoint disabled --private-endpoint enabled
```

### Dashboard

To toggle one of these settings using the dashboard webapp you can navigate to the subgraph detail page and use the relevant
toggles to enable or disable the public or private endpoints of the subgraph or its tags.

[//]: # "TODO: add a screenshot of this once the implementation and design are complete"

### Errors

Goldsky does not enforce CORS on our GraphQL endpoints. If you see an error that references CORS, or an error with the response code 429, you're likely seeing an issue with rate limiting. Rate limits can be unlocked on a case-by-case basis on the Scale plan and above. Please [reach out to us](mailto:support@goldsky.com?subject=Rate%20limits%20or%20errors) if you need help with rate limits or any GraphQL response errors.


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.goldsky.com/llms.txt