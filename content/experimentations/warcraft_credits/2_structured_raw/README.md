# Structured Raw Data

This data _is_ structured, but would require a custom parser to figure out, so I'm still calling this raw.

I've extracted the text from the unstructured data by using OpenAI 4o model and
asked it to convert the images to text. I did it in parts (take a screenshot of
part of the image), to ensure `4o` didn't get lost. I also specified that it
should do it itself, otherwise it'll use some Python OCR lib to do it, but those
are PAINFULLY inaccurate.

OK, I lied - I did the above until MoP. I used a script from MoP on forward,
because it was a TON of pain to get the (for LLMs) massive files formatted
right, so creating a script was a lot more feasable. I had to be careful since
the formatting is iffy, since the structure of the text is SUPER inconsistent :(

I did do some manual stuff with `,.*?,.*?,.*?,`, `\n\n\n`, `[A-Z]{3,}`, `\s+.*?\n^[^\s].*?\n\n`

For `WoW_8_Shadowlands.txt` I needed to do some manual work for `ACKNOWLEDGEMENTS`
