---
layout: page
title: Projects
permalink: /projects/
description: Security tools, scripts, and research projects by Godsec.
---

Tools, scripts, and research I've built. _Edit `_data/projects.yml` to manage these._ (PLACEHOLDER)

<div class="grid grid-2" style="margin-top:2rem">
{% for p in site.data.projects %}
  <article class="project-card">
    <span class="project-status {{ p.status }}">{{ p.status }}</span>
    <h3>{% if p.repo %}<a href="{{ p.repo }}" rel="noopener" target="_blank">{{ p.name }}</a>{% else %}{{ p.name }}{% endif %}</h3>
    <p>{{ p.description }}</p>
    <ul class="tag-list">
      {% for t in p.tech %}<li class="tag">{{ t }}</li>{% endfor %}
    </ul>
  </article>
{% endfor %}
</div>
