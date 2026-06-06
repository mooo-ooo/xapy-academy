import { htmlToMarkdown, markdownToHtml } from "@/lib/content";
import { renderArticleHtml } from "@/lib/html";

const SOURCE = `
<h2>Section one: the basics</h2>
<p>A paragraph with <strong>bold</strong>, <i>italic</i>, <u>underline</u>,
<s>strike</s>, <sub>sub</sub>, <sup>sup</sup>, <code>inline code</code> and a
<span style="color:#34d399">green word</span> plus a
<span style="background-color:#fbbf24">highlighted</span> one and
<span style="font-size:20px">bigger text</span>.</p>
<p style="text-align:center">Centered paragraph.</p>
<p>Link to <a href="https://example.com">an external site</a> and an
<a href="/academy/foo">internal one</a>.</p>
<h3>A subsection</h3>
<ul><li>bullet one</li><li>bullet two</li></ul>
<ol><li>first</li><li>second</li></ol>
<ul class="todo-list"><li><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">a task</span></label></li></ul>
<blockquote><p>A quote block.</p></blockquote>
<pre><code class="language-js">const x = 1;\nconsole.log(x);</code></pre>
<figure class="image image_resized" style="width:50%;"><img src="/uploads/abc123.png" alt="An image"><figcaption>Image caption</figcaption></figure>
<figure class="media"><oembed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"></oembed></figure>
<figure class="table"><table><caption>My table</caption><thead><tr><th>H1</th><th>H2</th></tr></thead><tbody><tr><td>a</td><td>b</td></tr></tbody></table></figure>
<hr>
<p>Special chars: © → ☆ and an emoji 🚀.</p>
<h2>Section two</h2>
<p>Bare YouTube line:</p>
<p>https://youtu.be/dQw4w9WgXcQ</p>
`;

function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  return cond;
}

async function main() {
  console.log("=== 1) htmlToMarkdown (what gets stored in bodyMdx) ===");
  let md = "";
  try {
    md = htmlToMarkdown(SOURCE);
    check("turndown did not throw", true);
  } catch (e) {
    check("turndown did not throw", false, String(e));
  }
  check("md has heading", /(^|\n)## Section one/.test(md));
  check("md kept youtube url", md.includes("youtube.com/watch?v=dQw4w9WgXcQ") || md.includes("youtu.be/dQw4w9WgXcQ"));
  check("md kept image", md.includes("/uploads/abc123.png"));
  check("md kept table (html-kept)", /<table|\| H1/.test(md));

  console.log("\n=== 2) markdownToHtml (migration path) ===");
  let back = "";
  try {
    back = markdownToHtml(md);
    check("marked did not throw", true);
  } catch (e) {
    check("marked did not throw", false, String(e));
  }
  check("md->html has <h2", back.includes("<h2"));

  console.log("\n=== 3) renderArticleHtml (reader pipeline) ===");
  const { html, toc } = await renderArticleHtml(SOURCE);
  check("h2 got slug id", /<h2 id="section-one[^"]*"/.test(html), firstMatch(html, /<h2 id="[^"]+"/));
  check("h3 got slug id", /<h3 id="a-subsection"/.test(html));
  check("color span preserved", html.includes('color:#34d399'));
  check("highlight bg preserved", html.includes('background-color:#fbbf24'));
  check("font-size preserved", html.includes("font-size:20px"));
  check("text-align preserved", html.includes("text-align:center"));
  check("underline kept", /<u>/.test(html));
  check("sub/sup kept", /<sub>/.test(html) && /<sup>/.test(html));
  check("code highlighted (pre)", html.includes("<pre"));
  check("image kept", html.includes("/uploads/abc123.png"));
  check("table kept", html.includes("<table"));
  check("oembed -> iframe", html.includes("<iframe") && html.includes("youtube.com/embed/dQw4w9WgXcQ"));
  const iframeCount = (html.match(/<iframe/g) || []).length;
  check("bare youtube url -> iframe too (2 embeds)", iframeCount >= 2, `iframes=${iframeCount}`);
  check("no raw <script>", !/<script/i.test(html));
  check("internal link kept", html.includes('href="/academy/foo"'));
  check("TOC built (h2+h3)", toc.length >= 3, `toc=${JSON.stringify(toc.map((t) => t.number + " " + t.slug))}`);

  console.log("\n--- rendered html (first 1200 chars) ---");
  console.log(html.slice(0, 1200));
  console.log("\n--- stored markdown (first 800 chars) ---");
  console.log(md.slice(0, 800));
}

function firstMatch(s: string, re: RegExp): string {
  const m = re.exec(s);
  return m ? m[0] : "(no match)";
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
