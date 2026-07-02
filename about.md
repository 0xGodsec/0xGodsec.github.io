---
layout: page
title: About
permalink: /about/
description: Who is Godsec — background, skills, certifications, and experience.
---

<div class="about-grid">
<div markdown="1">

## whoami

> _Replace this section with your own story._ (PLACEHOLDER)

I'm **Godsec**, a security researcher focused on **offensive security** — web application
pentesting, Active Directory attacks, red teaming, and hands-on writeups. I use this site
to document what I learn, share reproducible research, and help others break into the field.

I care about **practical, reproducible** security content: no hand-waving, working commands,
and clear explanations of *why* an attack works, not just *that* it does.

### what I write about

Web app pentesting, Active Directory security, red teaming, bug bounty, threat intelligence,
OSINT, malware analysis, network & API security, cloud security, and CTF / Hack The Box writeups.

### get in touch

- **Email:** [{{ site.author.email }}](mailto:{{ site.author.email }})
{% if site.social_links.github != "" %}- **GitHub:** [@{{ site.social_links.github }}](https://github.com/{{ site.social_links.github }}){% endif %}
{% if site.social_links.linkedin != "" %}- **LinkedIn:** [/in/{{ site.social_links.linkedin }}](https://www.linkedin.com/in/{{ site.social_links.linkedin }}){% endif %}

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
    <div class="cert-meta">{{ c.issuer }} · {{ c.year }}</div>
  </li>
{% endfor %}
</ul>

</aside>
</div>
