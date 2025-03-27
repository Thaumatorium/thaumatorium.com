# Structured Raw Data

This data _is_ structured, but would require a custom parser to figure out, so I'm still calling this raw.

I've extracted the text from the unstructured data by using OpenAI `4o` model
and asked it to convert the images to text itself. I did it in parts (take a
screenshot of part of the image), to ensure `4o` didn't get lost in the data. I
also specified that it should do it itself, otherwise it'll use some Python OCR
lib to do it, but those are PAINFULLY inaccurate.

## Regexes

OK, I lied - I did the above until MoP. I used a script from MoP on forward,
because it was a TON of pain to get the (for LLMs) massive files formatted
right, so creating a script was a lot more feasable. I had to be careful since
the formatting is iffy, since the structure of the text is SUPER inconsistent :(

I did do some manual stuff with `,.*?,.*?,.*?,`, `\n\n\n`, `[A-Z]{3,}`, `\s+.*?\n^[^\s].*?\n\n`

For `WoW_8_Shadowlands.txt` I needed to do some manual work for `ACKNOWLEDGEMENTS`

`^(?![ \t])\S.*\n(?![ \t])\S.*` - to find two consecutive lines. Typically these
are Department and Role lines.

## Addendum

OK, I doubly lied, because Google's Gemini 2.5 Pro came out and had 1Mil tokens, which means it could do most of the formatting work for me.
