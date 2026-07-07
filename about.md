---
layout: page
title: About
permalink: /about/
description: Who is Godsec — background, skills, certifications, and experience.
---

<div class="about-grid">
<div markdown="1">

## whoami

I'm **Nithish Guru Kumar Gajula** — an **Offensive Security Consultant** based in Pune, India,
writing here under the handle **Godsec**. I have 3+ years of experience in penetration testing,
vulnerability exploitation, and red team operations across enterprise environments, currently
as a Senior Security Consultant at **BDO India**.

My day job is hands-on security testing of web applications, APIs, network infrastructure, and
mobile platforms — using Burp Suite, Metasploit, Nessus, Nmap, OWASP ZAP, and Frida to find,
exploit, and validate real weaknesses across thousands of servers and network devices. I came
up through the **SOC** side first (triaging 100+ daily alerts across five SIEM platforms and
mapping adversary behavior with MITRE ATT&CK), which shapes how I think about offense: I know
what the defenders are watching, so I know where the blind spots are.

I'm **CEH Practical** and **Microsoft SC-200** certified, with **OSCP in progress**. This site
is where I document what I learn — practical, reproducible research with working commands and
clear explanations of *why* an attack works, not just *that* it does.

### what I write about

Web app pentesting, Active Directory security, red teaming, bug bounty, threat intelligence,
OSINT, malware analysis, network & API security, cloud security, and CTF / Hack The Box writeups.

### get in touch

- **Email:** [{{ site.author.email }}](mailto:{{ site.author.email }})
- **LinkedIn:** [/in/nithish-guru](https://www.linkedin.com/in/nithish-guru)
- **GitHub:** [@POXOZ](https://github.com/POXOZ)
- **TryHackMe:** [NithisX](https://tryhackme.com/p/NithisX) — Top 2% globally
- **Credly:** [verified certifications](https://www.credly.com/users/nithish-guru-kumar-gajula)

## experience

<ul class="xp-list">
{% for job in site.data.experience %}
  <li>
    <div><span class="xp-role">{{ job.role }}</span> · {{ job.org }}</div>
    <div class="xp-meta">{{ job.period }}</div>
    <ul>
    {% for p in job.points %}<li>{{ p }}</li>{% endfor %}
    </ul>
  </li>
{% endfor %}
</ul>

## achievements

- 🥇 **1st Place** — StealthMole OSINT Capture The Flag (CTF) Competition, 2025
- 🏆 **Employee of the Quarter** — 3 consecutive quarters at BDO India (Q3–Q4 2024, Q1 2025)
- 📈 **Top 2% globally** on TryHackMe (profile: NithisX)

## education

**B.Tech, Computer Science and Engineering** — Parul University, Vadodara · Aug 2019 – Apr 2023

Relevant coursework: Cryptography & Network Security, Network Security Protocols, Information
Security, Operating Systems, Distributed Systems, and Web Application Programming.

</div>

<aside markdown="1">

### skills

{% for g in site.data.skills %}
<div class="skill-group">
  <h3>{{ g.group }}</h3>
  <ul class="tag-list">
    {% for s in g.items %}<li class="tag">{{ s }}</li>{% endfor %}
  </ul>
</div>
{% endfor %}

### certifications

<ul class="cert-list">
{% for c in site.data.certifications %}
  <li>
    <div class="cert-name">{% if c.url != "" %}<a href="{{ c.url }}">{{ c.name }}</a>{% else %}{{ c.name }}{% endif %}</div>
    <div class="cert-meta">{{ c.issuer }}{% if c.year != "" %} · {{ c.year }}{% endif %}</div>
  </li>
{% endfor %}
</ul>

</aside>
</div>
