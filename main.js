(function () {
  "use strict";

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.from((scope || document).querySelectorAll(sel)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* ---------------------------------------------------------
     Split text — preserves <br> and <em>
  --------------------------------------------------------- */
  function splitWords(el) {
    var wrap = function (text) {
      return text.split(/(\s+)/).map(function (w) {
        return /^\s+$/.test(w) ? w : '<span class="split-word"><span>' + w + "</span></span>";
      }).join("");
    };
    var html = Array.from(el.childNodes).map(function (node) {
      if (node.nodeType === 3) return wrap(node.textContent);
      if (node.nodeName === "BR") return "<br>";
      if (node.nodeType === 1) {
        var tag = node.tagName.toLowerCase();
        return "<" + tag + ">" + wrap(node.textContent) + "</" + tag + ">";
      }
      return "";
    }).join("");
    el.innerHTML = html;
    return $$(".split-word > span", el);
  }

  function initHeroSplit() {
    var el = $("[data-split]");
    if (!el) return;
    var spans = splitWords(el);
    // Plain CSS transition stagger — no animation library needed for one
    // headline. Start state is set inline, then flipped on the next frame
    // so the transition actually runs.
    spans.forEach(function (span, i) {
      span.style.transform = "translateY(130%)";
      span.style.transition = "transform " + (reduced ? 0.5 : 1.1) + "s " + (0.15 + i * 0.045) + "s cubic-bezier(0.16, 1, 0.3, 1)";
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        spans.forEach(function (span) { span.style.transform = "translateY(0)"; });
      });
    });
    // Safety net: guarantee the headline is visible even if the transition
    // never fires (tab backgrounded during load, etc.)
    setTimeout(function () {
      spans.forEach(function (span) { span.style.transform = "translateY(0)"; });
    }, 2500);
  }

  /* ---------------------------------------------------------
     Custom cursor
  --------------------------------------------------------- */
  function initCursor() {
    if (!fineHover) return;
    var cursor = $("[data-cursor]");
    var dot = $(".cursor-dot", cursor);
    var ring = $(".cursor-ring", cursor);
    if (!cursor) return;
    var mx = 0, my = 0, rx = 0, ry = 0, firstMove = false;

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0) translate(-50%,-50%)";
      if (!firstMove) {
        firstMove = true;
        rx = mx; ry = my;
        ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0) translate(-50%,-50%)";
        cursor.classList.add("is-ready");
      }
    });

    function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    var hoverables = "a, button, .project-card-link, .pill";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest(hoverables)) ring.classList.add("is-hover");
    });
    document.addEventListener("mouseout", function (e) {
      var t = e.target.closest(hoverables);
      if (t && !t.contains(e.relatedTarget)) ring.classList.remove("is-hover");
    });
  }

  /* ---------------------------------------------------------
     Nav — solidify on scroll + mobile menu
  --------------------------------------------------------- */
  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;
    var onScroll = function () {
      nav.classList.toggle("is-solid", window.scrollY > 40);
    };
    onScroll();
    document.addEventListener("scroll", onScroll, { passive: true });

    var burger = $("[data-burger]");
    var mobile = $("[data-nav-mobile]");
    if (burger && mobile) {
      burger.addEventListener("click", function () {
        var open = burger.getAttribute("aria-expanded") === "true";
        burger.setAttribute("aria-expanded", String(!open));
        mobile.classList.toggle("is-open", !open);
      });
      $$("a", mobile).forEach(function (a) {
        a.addEventListener("click", function () {
          burger.setAttribute("aria-expanded", "false");
          mobile.classList.remove("is-open");
        });
      });
    }
  }

  /* ---------------------------------------------------------
     Smooth anchor scroll
  --------------------------------------------------------- */
  function initSmoothAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var navOffset = 78;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - navOffset,
        behavior: reduced ? "auto" : "smooth",
      });
    });
  }

  /* ---------------------------------------------------------
     Reveal on scroll
  --------------------------------------------------------- */
  function initReveals() {
    var targets = $$(".reveal");
    if (!targets.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    targets.forEach(function (t) { io.observe(t); });

    setTimeout(function () {
      $$(".reveal:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
      });
    }, 6000);
  }

  /* ---------------------------------------------------------
     Stagger reveal for project grids (per client group)
  --------------------------------------------------------- */
  function initGridStagger() {
    var groups = $$(".project-grid");
    if (!groups.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var cards = $$(".project-card", entry.target);
        cards.forEach(function (card, i) {
          card.style.transition = "opacity .6s " + (i * 0.045) + "s var(--ease-out), transform .6s " + (i * 0.045) + "s var(--ease-out)";
          card.style.opacity = "1";
          card.style.transform = "none";
        });
        io.unobserve(entry.target);
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -5% 0px" });

    groups.forEach(function (grid) {
      $$(".project-card", grid).forEach(function (card) {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
      });
      io.observe(grid);
    });

    setTimeout(function () {
      $$(".project-card").forEach(function (card) {
        card.style.opacity = "1";
        card.style.transform = "none";
      });
    }, 6000);
  }

  /* ---------------------------------------------------------
     Count-up stats
  --------------------------------------------------------- */
  function initCountUp() {
    var nums = $$("[data-count-to]");
    if (!nums.length) return;
    var animate = function (el) {
      var to = parseInt(el.getAttribute("data-count-to"), 10) || 0;
      var start = null;
      var duration = reduced ? 400 : 1400;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * to);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = to;
      }
      requestAnimationFrame(step);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animate(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -10% 0px" });
    nums.forEach(function (n) { io.observe(n); });

    setTimeout(function () {
      nums.forEach(function (n) {
        if (n.textContent === "0" && n.getBoundingClientRect().top < window.innerHeight) animate(n);
      });
    }, 6000);
  }

  /* ---------------------------------------------------------
     Filter pills — show/hide client groups
  --------------------------------------------------------- */
  function initFilters() {
    var wrap = $("[data-filters]");
    var portfolio = $("[data-portfolio]");
    if (!wrap || !portfolio) return;
    var pills = $$(".pill", wrap);
    var groups = $$(".client-group", portfolio);

    wrap.addEventListener("click", function (e) {
      var pill = e.target.closest(".pill");
      if (!pill) return;
      var filter = pill.getAttribute("data-filter");
      pills.forEach(function (p) { p.classList.toggle("is-active", p === pill); });
      groups.forEach(function (g) {
        var match = filter === "all" || g.getAttribute("data-client") === filter;
        g.classList.toggle("is-hidden", !match);
      });
      if (filter !== "all") {
        var target = groups.find(function (g) { return g.getAttribute("data-client") === filter; });
        if (target) {
          window.scrollTo({
            top: target.getBoundingClientRect().top + window.scrollY - 78,
            behavior: reduced ? "auto" : "smooth",
          });
        }
      }
    });
  }

  /* ---------------------------------------------------------
     Lightbox — lazy-load Drive iframe only on demand
  --------------------------------------------------------- */
  function initLightbox() {
    var lightbox = $("[data-lightbox]");
    if (!lightbox) return;
    var frame = $("[data-lightbox-frame]", lightbox);
    var titleEl = $("[data-lightbox-title]", lightbox);
    var panel = $(".lightbox-panel", lightbox);

    function open(embedUrl, title, trigger) {
      frame.innerHTML = '<iframe src="' + embedUrl + '" allow="autoplay; fullscreen" allowfullscreen webkitallowfullscreen mozallowfullscreen loading="eager"></iframe>';
      titleEl.textContent = title || "";

      // Match the player's shape to the video's real orientation instead of
      // always forcing a 16:9 box — vertical/portrait cuts get squeezed
      // into tiny letterboxed strips otherwise. We read the dimensions off
      // the card's own thumbnail image, which already reflects the video's
      // actual frame.
      var thumb = trigger && trigger.querySelector(".project-card-thumb");
      var portrait = false;
      if (thumb && thumb.naturalWidth && thumb.naturalHeight) {
        frame.style.aspectRatio = thumb.naturalWidth + " / " + thumb.naturalHeight;
        portrait = thumb.naturalWidth / thumb.naturalHeight < 0.95;
      } else {
        frame.style.aspectRatio = "";
      }
      if (panel) panel.classList.toggle("is-portrait", portrait);

      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";

      // iOS Safari won't paint <video> inline once it's nested two iframes
      // deep (our lightbox iframe > Drive's own player iframe) — audio
      // plays but the picture stays black until the player is promoted to
      // fullscreen. Rather than send touch users away to Drive's own page,
      // stay on the site and push the freshly-created iframe into fullscreen
      // ourselves, in the same tap gesture — that's enough to make it render.
      if (!fineHover) {
        var iframeEl = frame.querySelector("iframe");
        var request = iframeEl.requestFullscreen || iframeEl.webkitRequestFullscreen || iframeEl.webkitEnterFullscreen;
        if (request) {
          try {
            var result = request.call(iframeEl);
            if (result && result.catch) result.catch(function () {});
          } catch (err) {}
        }
      }
    }
    function close() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      frame.innerHTML = "";
      frame.style.aspectRatio = "";
      if (panel) panel.classList.remove("is-portrait");
      document.body.style.overflow = "";
    }

    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-play]");
      if (trigger) {
        e.preventDefault();
        open(trigger.getAttribute("data-embed"), trigger.getAttribute("data-title"), trigger);
        return;
      }
      if (e.target.closest("[data-lightbox-close]")) close();
    });

    // On touch, we auto-enter fullscreen when opening; when the user exits
    // fullscreen (native back/close gesture) they'd otherwise land back on
    // the still-broken inline black video, so close the lightbox with it.
    function onFullscreenChange() {
      var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl && !fineHover && lightbox.classList.contains("is-open")) close();
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox.classList.contains("is-open")) close();
    });
  }

  /* ---------------------------------------------------------
     Footer year
  --------------------------------------------------------- */
  function initFooterYear() {
    var y = $("[data-year]");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  function boot() {
    safe(initHeroSplit, "initHeroSplit");
    safe(initCursor, "initCursor");
    safe(initNav, "initNav");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initReveals, "initReveals");
    safe(initGridStagger, "initGridStagger");
    safe(initCountUp, "initCountUp");
    safe(initFilters, "initFilters");
    safe(initLightbox, "initLightbox");
    safe(initFooterYear, "initFooterYear");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
