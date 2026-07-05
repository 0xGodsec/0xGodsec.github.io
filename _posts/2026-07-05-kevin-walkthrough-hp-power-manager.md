---
title: "Kevin — Walkthrough: Default Creds to SYSTEM via HP Power Manager"
description: "Walkthrough of the Kevin machine (Windows 7) — chaining default credentials with a buffer overflow in HP Power Manager 4.2 to land a SYSTEM shell, no privilege escalation needed."
date: 2026-07-05 10:00:00 +0000
categories: [CTF]
tags: [ctf, oscp, windows, buffer-overflow, metasploit, default-credentials]
difficulty: Easy
---

> **Box:** Windows 7 · **Difficulty:** Easy · **Theme:** Default credentials + a buffer overflow in legacy software

Kevin is a classic "old software will hurt you" box. The entire chain hinges on one outdated service — **HP Power Manager v4.2 (Build 7)** — sitting on port 80 behind default credentials. Once I confirmed the version, a known buffer overflow handed me a SYSTEM shell directly. There's no privilege-escalation stage here: the exploit lands as SYSTEM on its own.

## Recon

I kicked things off with a full rustscan piped into nmap for service and OS detection:

```bash
rustscan -a 192.168.181.45 -- -A
```

The scan came back with a Windows 7 host and a healthy spread of open ports. The ones that mattered:

- **80/tcp** — GoAhead WebServer serving an **HP Power Manager** login page *(the interesting one)*
- **135 / 139 / 445** — MSRPC / NetBIOS / SMB (Windows 7 Ultimate N 7600, WORKGROUP)
- **3389/tcp** — RDP (hostname: KEVIN)
- **3573/tcp** plus a cluster of high ephemeral RPC ports

SMB allowed a blank session and had signing disabled, but nothing useful shook loose there. The real lead was that **HP Power Manager** app on port 80 — software old enough to be a red flag by itself.

## Enumeration — Web (Port 80)

Browsing to `http://192.168.181.45/` dropped me on the HP Power Manager login. Before reaching for anything fancy, I tried the oldest trick in the book — default credentials:

```text
admin : admin
```

… and I was straight in. Digging through the application logs then revealed the exact build:

> HP Power Manager **version 4.2 (Build 7)**

That version string is the whole ballgame. A quick searchsploit / Exploit-DB lookup for *HP Power Manager 4.2* surfaces a **stack buffer overflow** with a ready-made Metasploit module.

## Exploitation

I dropped into Metasploit to pull up the HP Power Manager buffer-overflow module:

```bash
msfconsole
```

From there it's standard MSF flow: select the HP Power Manager exploit, point `RHOSTS` at the target, set a matching Windows payload, and fire. The overflow triggers remote code execution against the vulnerable service — and because that service runs with high privileges, the session comes back as **NT AUTHORITY\SYSTEM** with no escalation needed.

*(The lab also ships a Python PoC for the same overflow if you'd rather land it without Metasploit — same vulnerability, manual delivery.)*

## Proof

With a SYSTEM shell, grabbing the flag was trivial:

```bash
┌──(kali@kali)-[~/Desktop/Offsec/Kevin]
└─$ cat proof.txt
437b333343d4297041b7a13ae71a2c3f
```

## Takeaways

- **Default credentials are still everywhere.** `admin:admin` shouldn't unlock anything — but on legacy appliances it constantly does.
- **Version disclosure = game over.** The app volunteered its exact build in the logs, which was all I needed to find a matching public exploit.
- **Legacy software carries legacy vulns.** HP Power Manager 4.2's overflow is a well-known, long-patched issue; running unsupported software leaves SYSTEM-level RCE one module away.
- **Defensive fix:** rotate default creds, keep management software patched and supported, and never expose admin web panels to untrusted networks.
