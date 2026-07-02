/* godsec theme JS — no dependencies */
(function () {
  "use strict";

  /* ---------- theme toggle ---------- */
  var root = document.documentElement;
  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  });

  /* ---------- mobile nav ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  var navMenu = document.getElementById("nav-menu");
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      var open = navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- reading progress ---------- */
  var bar = document.getElementById("progress-bar");
  var article = document.getElementById("post-content");
  if (bar && article) {
    var onScroll = function () {
      var rect = article.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var done = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      bar.style.width = (total > 0 ? (done / total) * 100 : 100) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- table of contents ---------- */
  var toc = document.getElementById("toc");
  if (toc && article) {
    var heads = article.querySelectorAll("h2, h3");
    if (heads.length > 1) {
      var title = document.createElement("p");
      title.className = "toc-title";
      title.textContent = "on this page";
      var ul = document.createElement("ul");
      heads.forEach(function (h, i) {
        if (!h.id) h.id = "s-" + i + "-" + h.textContent.toLowerCase().replace(/[^\w]+/g, "-");
        var li = document.createElement("li");
        li.className = "toc-" + h.tagName.toLowerCase();
        var a = document.createElement("a");
        a.href = "#" + h.id;
        a.textContent = h.textContent;
        li.appendChild(a);
        ul.appendChild(li);
      });
      toc.appendChild(title);
      toc.appendChild(ul);

      if ("IntersectionObserver" in window) {
        var links = toc.querySelectorAll("a");
        var map = {};
        links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              links.forEach(function (a) { a.classList.remove("active"); });
              var a = map[en.target.id];
              if (a) a.classList.add("active");
            }
          });
        }, { rootMargin: "0px 0px -75% 0px" });
        heads.forEach(function (h) { io.observe(h); });
      }
    }
  }

  /* ---------- copy buttons on code blocks ---------- */
  document.querySelectorAll("div.highlighter-rouge").forEach(function (block) {
    var btn = document.createElement("button");
    btn.className = "copy-code";
    btn.type = "button";
    btn.textContent = "copy";
    btn.addEventListener("click", function () {
      var code = block.querySelector("pre").innerText;
      navigator.clipboard.writeText(code).then(function () {
        btn.textContent = "copied ✓";
        setTimeout(function () { btn.textContent = "copy"; }, 1600);
      });
    });
    block.appendChild(btn);
  });

  /* ---------- copy permalink ---------- */
  document.querySelectorAll(".copy-link").forEach(function (btn) {
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(btn.getAttribute("data-url")).then(function () {
        btn.textContent = "copied ✓";
        setTimeout(function () { btn.textContent = "copy link"; }, 1600);
      });
    });
  });

  /* ---------- search ---------- */
  var modal = document.getElementById("search-modal");
  var input = document.getElementById("search-input");
  var results = document.getElementById("search-results");
  var index = null;
  var selected = -1;

  function openSearch() {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    input.value = "";
    results.innerHTML = "";
    selected = -1;
    input.focus();
    if (!index) {
      fetch((window.SITE_BASEURL || "") + "/search.json")
        .then(function (r) { return r.json(); })
        .then(function (data) { index = data; });
    }
  }
  function closeSearch() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".search-open").forEach(function (b) {
    b.addEventListener("click", openSearch);
  });
  if (modal) {
    modal.querySelectorAll("[data-close]").forEach(function (el) {
      el.addEventListener("click", closeSearch);
    });
  }

  document.addEventListener("keydown", function (e) {
    var typing = /input|textarea|select/i.test(document.activeElement.tagName);
    if ((e.key === "/" || (e.key === "k" && (e.ctrlKey || e.metaKey))) && !typing) {
      e.preventDefault();
      openSearch();
    } else if (e.key === "Escape" && modal && !modal.hidden) {
      closeSearch();
    } else if (modal && !modal.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      var items = results.querySelectorAll("a");
      if (!items.length) return;
      selected = e.key === "ArrowDown"
        ? Math.min(selected + 1, items.length - 1)
        : Math.max(selected - 1, 0);
      items.forEach(function (a, i) { a.classList.toggle("selected", i === selected); });
      items[selected].scrollIntoView({ block: "nearest" });
    } else if (modal && !modal.hidden && e.key === "Enter") {
      var sel = results.querySelector("a.selected") || results.querySelector("a");
      if (sel) window.location.href = sel.href;
    }
  });

  function score(post, terms) {
    var hay = (post.title + " " + post.tags + " " + post.categories + " " + post.excerpt).toLowerCase();
    var s = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (!t) continue;
      if (post.title.toLowerCase().indexOf(t) !== -1) s += 8;
      else if (post.tags.toLowerCase().indexOf(t) !== -1) s += 5;
      else if (hay.indexOf(t) !== -1) s += 2;
      else return 0; // all terms must match somewhere
    }
    return s;
  }

  if (input) {
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      selected = -1;
      if (!q || !index) { results.innerHTML = ""; return; }
      var terms = q.split(/\s+/);
      var hits = index
        .map(function (p) { return { p: p, s: score(p, terms) }; })
        .filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 10);
      if (!hits.length) {
        results.innerHTML = '<li><span class="r-empty">no results for “' + q.replace(/</g, "&lt;") + '”</span></li>';
        return;
      }
      results.innerHTML = hits.map(function (x) {
        return '<li><a href="' + x.p.url + '"><span class="r-title">' + x.p.title +
          '</span><span class="r-meta">' + x.p.date + " · " + x.p.tags + "</span></a></li>";
      }).join("");
    });
  }
})();
