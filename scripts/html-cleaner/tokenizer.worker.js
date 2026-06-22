import { getEncoding } from "js-tiktoken";

// Construct once per worker; subsequent counts reuse the local vocabulary.
const encoding = getEncoding("o200k_base");

self.addEventListener("message", (event) => {
	const { id, text } = event.data;
	try {
		self.postMessage({ id, tokens: encoding.encode(String(text)).length, characters: String(text).length });
	} catch (error) {
		self.postMessage({ id, error: error instanceof Error ? error.message : "Token counting failed." });
	}
});
