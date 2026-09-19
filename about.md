---
layout: page
title: About
permalink: /about/
description: Who is Godsec — background, certifications, and experience.
---

## whoami

I'm **Godsec**, a security consultant with 3+ years in penetration testing and red teaming.
I started in a **SOC**, so I know what defenders watch for, and I use that on the offensive side.

This blog is where I write up what I learn: Active Directory attacks, CTF and lab walkthroughs,
and OSINT reports, with commands you can actually run.

## experience

<ul class="xp-list">
{% for job in site.data.experience %}
  <li>
    <div><span class="xp-role">{{ job.role }}</span> · {{ job.org }}</div>
    <div class="xp-meta">{{ job.period }}</div>
  </li>
{% endfor %}
</ul>

## certifications

<ul class="cert-list">
{% for c in site.data.certifications %}
  <li>
    <div class="cert-name">{% if c.url != "" %}<a href="{{ c.url }}">{{ c.name }}</a>{% else %}{{ c.name }}{% endif %}</div>
    <div class="cert-meta">{{ c.issuer }}{% if c.year != "" %} · {{ c.year }}{% endif %}</div>
  </li>
{% endfor %}
</ul>

## achievements

- 1st Place, StealthMole OSINT CTF (2025)
- Employee of the Quarter, 3 quarters in a row (Q3 2024 – Q1 2025)
- Top 2% on TryHackMe

## education

B.Tech, Computer Science and Engineering, Parul University (2019 – 2023)

## contact

[LinkedIn](https://www.linkedin.com/in/nithish-guru) ·
[GitHub](https://github.com/POXOZ) ·
[TryHackMe](https://tryhackme.com/p/NithisX) ·
[Credly](https://www.credly.com/users/nithish-guru-kumar-gajula)
