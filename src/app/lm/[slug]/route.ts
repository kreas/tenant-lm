import { NextRequest, NextResponse } from "next/server";
import { r2GetBuffer } from "@/lib/r2";

const GTM_HEAD = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WX2FHLSD');</script>
<!-- End Google Tag Manager -->`;

const GTM_BODY = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WX2FHLSD"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

function formHandlerScript(slug: string): string {
  return `<script>
(function() {
  var slug = ${JSON.stringify(slug)};

  function labelToKey(text) {
    return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  function getKey(el) {
    if (el.name) return el.name;
    if (el.id) return el.id;
    // Try associated label via for attribute
    if (el.id) {
      var lbl = document.querySelector('label[for="' + el.id + '"]');
      if (lbl) return labelToKey(lbl.textContent);
    }
    // Try preceding sibling label or parent label
    var prev = el.previousElementSibling;
    if (prev && prev.tagName === 'LABEL') return labelToKey(prev.textContent);
    var parent = el.closest('label, .form-group, [class*="field"]');
    if (parent) {
      var lbl = parent.tagName === 'LABEL' ? parent : parent.querySelector('label');
      if (lbl) return labelToKey(lbl.textContent);
    }
    return '';
  }

  function collectInputs(container) {
    var data = {};
    var inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(function(el) {
      if (el.type === 'submit' || el.type === 'button' || el.type === 'hidden' || el.type === 'range') return;
      var key = getKey(el);
      if (!key) return;
      var value = el.value;
      if (el.type === 'checkbox') value = el.checked ? 'yes' : '';
      if (el.type === 'radio' && !el.checked) return;
      if (!value) return;
      if (data[key]) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });
    return data;
  }

  function submitData(data, btn) {
    if (btn) btn.disabled = true;
    fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug, data: data })
    })
    .then(function(res) { return res.json(); })
    .then(function(result) {
      if (result.success && btn) {
        btn.textContent = 'Thank you! We\\'ll be in touch.';
        btn.style.cssText = btn.style.cssText + ';background:#166534;';
      }
      if (!result.success && btn) btn.disabled = false;
    })
    .catch(function() {
      if (btn) btn.disabled = false;
    });
  }

  // Handle real <form> submit events
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    e.preventDefault();

    var formData = new FormData(form);
    var data = {};
    formData.forEach(function(value, key) {
      if (data[key]) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });

    var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    submitData(data, submitBtn);
  }, true);

  // Handle pages without <form> tags — override any existing handleSubmit
  // Use DOMContentLoaded so we run after the page's own scripts are parsed
  function setupFormlessHandler() {
    if (document.querySelectorAll('form').length > 0) return;
    var _origHandleSubmit = window.handleSubmit;
    window.handleSubmit = function(e) {
      if (e && e.preventDefault) e.preventDefault();
      var btn = e && e.target ? e.target : null;
      var container = btn ? btn.closest('section, [class*="form"], [id*="form"], div') : document.body;
      var data = collectInputs(container || document.body);
      if (Object.keys(data).length === 0) data = collectInputs(document.body);
      submitData(data, btn);
      if (typeof _origHandleSubmit === 'function') {
        try { _origHandleSubmit(e); } catch(_) {}
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFormlessHandler);
  } else {
    setupFormlessHandler();
  }
})();
</script>`;
}

function injectSnippets(html: string, slug: string): string {
  const handler = formHandlerScript(slug);

  // Inject GTM script into <head>
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${GTM_HEAD}\n${handler}\n</head>`);
  } else {
    html = `${GTM_HEAD}\n${handler}\n${html}`;
  }

  // Inject GTM noscript after <body>
  if (html.match(/<body[^>]*>/i)) {
    html = html.replace(/(<body[^>]*>)/i, `$1\n${GTM_BODY}`);
  }

  return html;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Security: prevent directory traversal
  if (slug.includes("..") || slug.includes("~") || slug.includes("/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const buffer = await r2GetBuffer(`${slug}/index.html`);
  if (!buffer) {
    return new NextResponse("Lead magnet not found", { status: 404 });
  }

  let html = buffer.toString("utf-8");
  html = injectSnippets(html, slug);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
