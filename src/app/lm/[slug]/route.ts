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
    if (submitBtn) submitBtn.disabled = true;

    fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug, data: data })
    })
    .then(function(res) { return res.json(); })
    .then(function(result) {
      if (result.success) {
        var ty = form.querySelector('[data-thank-you]');
        if (ty) {
          form.style.display = 'none';
          ty.style.display = '';
        } else {
          form.reset();
          var msg = document.createElement('p');
          msg.textContent = 'Thank you! We\\'ll be in touch.';
          msg.style.cssText = 'padding:12px;background:#f0fdf4;color:#166534;border-radius:6px;margin-top:8px;text-align:center;';
          form.appendChild(msg);
          setTimeout(function() { msg.remove(); }, 5000);
        }
      }
      if (submitBtn) submitBtn.disabled = false;
    })
    .catch(function() {
      if (submitBtn) submitBtn.disabled = false;
    });
  }, true);
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
