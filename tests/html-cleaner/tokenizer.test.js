import { describe, expect, it } from "vitest";
import { getEncoding } from "js-tiktoken";

describe("GPT-5 o200k_base token counting", () => {
	it("uses the o200k_base vocabulary", () => {
		const encoding = getEncoding("o200k_base");
		expect(encoding.encode("hello world")).toHaveLength(2);
		expect(encoding.encode("<h1>Hello</h1>").length).toBeGreaterThan(2);
	});

	it("handles empty and large strings", () => {
		const encoding = getEncoding("o200k_base");
		expect(encoding.encode("")).toHaveLength(0);
		expect(encoding.encode("token ".repeat(10_000)).length).toBeGreaterThan(1_000);
	});
});
