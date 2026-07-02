---
title: "Hack The Box: Building a Repeatable Writeup Workflow"
description: "My template and methodology for HTB machine writeups — from enumeration to root — so every box teaches something transferable."
date: 2026-06-30 09:00:00 +0000
categories: [CTF]
tags: [hackthebox, ctf, methodology, enumeration, privilege-escalation]
difficulty: Easy
---

Doing boxes is fun; *learning* from them is what actually builds skill. Over time I've
settled on a repeatable writeup structure that forces me to articulate the **why** behind
each step. Here's the template I use — feel free to steal it.

## 1. Enumeration

Always start wide, then go deep. A full TCP scan first, then targeted service scans:

```bash
# Quick all-ports sweep
nmap -p- --min-rate 10000 -T4 10.10.11.42 -oN nmap/all-ports.txt

# Deep scan on discovered ports
nmap -sCV -p 22,80,445 10.10.11.42 -oN nmap/detailed.txt
```

Write down **every** open port and service version. Boxes are designed so that the
foothold lives in something enumeration reveals.

## 2. Foothold

Document the vulnerability, the exploit, and — importantly — *why it worked*.

```bash
# Example: exploiting a vulnerable web endpoint
curl -s 'http://10.10.11.42/api/export?file=../../../../etc/passwd'
```

> **Note to self:** if I couldn't explain this bug to a teammate in two sentences, I don't
> understand it yet.

## 3. Privilege escalation

The pattern is nearly always the same: enumerate, spot the misconfiguration, exploit it.

```bash
# Linux quick wins
sudo -l
find / -perm -4000 -type f 2>/dev/null
```

Common paths: SUID binaries, sudo misconfigs, cron jobs, weak service permissions, and
reused credentials.

## 4. Lessons learned

End every writeup with **three transferable takeaways** — not box-specific trivia, but
things that apply to real engagements:

1. What class of vulnerability did this represent?
2. What tool or technique will I reuse next time?
3. How would a defender have caught or prevented this?

## Why this matters

A pile of rooted boxes is a leaderboard stat. A pile of **structured writeups** is a
searchable personal knowledge base — and, conveniently, a portfolio that shows recruiters
how you think. That's the whole reason this blog exists.

Now go pop a box.
