import { describe, expect, it } from "vitest";
import { cleanHtml, formatHtml, PROFILES, validateHtmlFragment } from "../../content/projects/hypertext-token-killer/cleaner.js";

describe("cleanHtml", () => {
	it("extracts main content from a full document", () => {
		const input = `<!doctype html><html><head><style>x</style></head><body><nav>Menu</nav><main><h1>Title</h1><p>Useful text</p></main><footer>Footer</footer></body></html>`;
		const result = cleanHtml(input, PROFILES.balanced);
		expect(result.html).toBe("<h1>Title</h1><p>Useful text</p>");
		expect(result.stats.elementsRemoved).toBeGreaterThan(0);
		expect(result.stats.outputElements).toBe(2);
	});

	it("keeps fragments as fragments", () => {
		const result = cleanHtml(`<h2>Heading</h2><p>Paragraph</p>`, PROFILES.balanced);
		expect(result.html).toBe("<h2>Heading</h2><p>Paragraph</p>");
	});

	it("removes executable markup and unsafe attributes in every profile", () => {
		for (const profile of Object.values(PROFILES)) {
			const result = cleanHtml(`<p id="x" style="color:red" onclick="evil()">Safe<script>evil()</script></p><a href="javascript:evil()">Link</a>`, profile);
			expect(result.html).not.toMatch(/script|onclick|javascript:|style=|id=/i);
			expect(result.html).toContain("Safe");
		}
	});

	it("removes boilerplate only when configured", () => {
		const input = `<nav>Navigation</nav><article><h1>Title</h1><p>${"Content ".repeat(30)}</p></article><footer>Footer</footer>`;
		expect(cleanHtml(input, PROFILES.balanced).html).not.toContain("Navigation");
		expect(cleanHtml(input, PROFILES.conservative).html).toContain("Navigation");
	});

	it("preserves non-semantic containers in the Conservative profile", () => {
		const input = `<div><span>Kept container structure</span></div>`;
		expect(cleanHtml(input, PROFILES.conservative).html).toBe("<div><span>Kept container structure</span></div>");
		expect(cleanHtml(input, PROFILES.balanced).html).toBe("Kept container structure");
	});

	it("turns images into compact alt text", () => {
		const result = cleanHtml(`<p>Before <img src="large.jpg" alt="Useful diagram"> after.</p>`, PROFILES.balanced);
		expect(result.html).toBe("<p>Before [Image: Useful diagram] after.</p>");
	});

	it("preserves table structure and structural attributes", () => {
		const input = `<table class="grid"><tr><th colspan="2" style="x">Heading</th></tr><tr><td>A</td><td>B</td></tr></table>`;
		const result = cleanHtml(input, PROFILES.balanced);
		expect(result.html).toContain('<th colspan="2">Heading</th>');
		expect(result.html).not.toContain("class=");
	});

	it("preserves code whitespace while collapsing prose whitespace", () => {
		const input = `<p>Hello\n    world</p><pre><code>if (x) {\n  run();\n}</code></pre>`;
		const result = cleanHtml(input, PROFILES.balanced);
		expect(result.html).toContain("<p>Hello world</p>");
		expect(result.html).toContain("if (x) {\n  run();\n}");
	});

	it("removes inherited leading whitespace at element boundaries", () => {
		const input = `<article>\n    <h1>  Title</h1>\n    <p>  Hello <strong>world</strong> again.  </p>\n  </article>`;
		const result = cleanHtml(input, PROFILES.compact);
		expect(result.html).toBe("<article><h1>Title</h1><p>Hello <strong>world</strong> again.</p></article>");
	});

	it("always trims element-edge whitespace, even without whitespace collapsing", () => {
		const input = `<button>                 Bronnen</button><p><span aria-hidden="true">icon</span>          Text</p>`;
		const result = cleanHtml(input, { ...PROFILES.balanced, collapseWhitespace: false });
		expect(result.html).toBe("<button>Bronnen</button><p>Text</p>");
	});

	it("trims text positioned between block elements", () => {
		const input = `<section>
<h4>Je zei:</h4>
               Are the claims about the AfD actually true/substantiated?
<br>
</section>`;
		const result = cleanHtml(input, { ...PROFILES.balanced, collapseWhitespace: false });
		expect(result.html).toBe("<section><h4>Je zei:</h4>Are the claims about the AfD actually true/substantiated?<br></section>");
	});

	it("merges whitespace text nodes left by deeply nested UI containers", () => {
		const input = `<section>
  <h4>Je zei:</h4>
  <div>
    <div><button><span><svg><use href="#icon"></use></svg></span></button></div>
    <div><div>Are the claims about the AfD actually true/substantiated?</div></div>
  </div>
  <br>
</section>`;
		for (const profile of [PROFILES.balanced, PROFILES.compact]) {
			const result = cleanHtml(input, profile);
			expect(result.html).not.toMatch(/>\s+Are the claims/);
			expect(result.html).toContain(">Are the claims about the AfD actually true/substantiated?<");
		}
	});

	it("resolves relative links only when a base URL is supplied", () => {
		const input = `<a href="../guide">Guide</a>`;
		expect(cleanHtml(input, PROFILES.balanced).html).toContain('href="../guide"');
		expect(cleanHtml(input, PROFILES.balanced, "https://example.com/articles/page").html).toContain('href="https://example.com/guide"');
	});

	it("unwraps links and tables in maximum compression", () => {
		const input = `<p><a href="https://example.com">Read this</a></p><table><tr><td>A</td><td>B</td></tr></table>`;
		const result = cleanHtml(input, PROFILES.compact);
		expect(result.html).not.toMatch(/<a|<table|<tr|<td/);
		expect(result.html).toContain("Read this");
		expect(result.html).toContain("AB");
	});

	it("handles malformed and Word-style markup", () => {
		const input = `<div class="WordSection1"><p class="MsoNormal"><span style="font-family:Calibri">One<p>Two`;
		const result = cleanHtml(input, PROFILES.balanced);
		expect(result.html).toContain("One");
		expect(result.html).toContain("Two");
		expect(result.html).not.toMatch(/WordSection|MsoNormal|style=/);
	});

	it("supports individual overrides", () => {
		const input = `<p><a href="https://example.com">Example</a></p>`;
		const result = cleanHtml(input, { ...PROFILES.balanced, preserveLinks: false });
		expect(result.html).toBe("<p>Example</p>");
	});

	it("reports empty-input and all-content-removed states", () => {
		expect(cleanHtml("", PROFILES.balanced)).toMatchObject({ html: "", warnings: [] });
		expect(cleanHtml("<script>only()</script>", PROFILES.balanced).warnings).toHaveLength(1);
	});
});

describe("formatHtml", () => {
	it("indents block structure while preserving inline content", () => {
		const html = "<article><h1>Title</h1><p>Hello <strong>world</strong>.</p></article>";
		expect(formatHtml(html)).toBe("<article>\n\t<h1>Title</h1>\n\t<p>Hello <strong>world</strong>.</p>\n</article>");
	});

	it("preserves code-block whitespace", () => {
		const html = "<pre><code>if (x) {\n  run();\n}</code></pre>";
		expect(formatHtml(html)).toContain("if (x) {\n  run();\n}");
	});
});

describe("validateHtmlFragment", () => {
	it("accepts stable HTML fragments", () => {
		expect(validateHtmlFragment("<section><h2>Title</h2><p>Text</p></section>")).toEqual({ valid: true, repaired: false });
	});

	it("reports fragments that the browser repairs", () => {
		expect(validateHtmlFragment("<p>Before<div>Invalid nesting</div>After</p>")).toEqual({ valid: false, repaired: true });
	});
});
