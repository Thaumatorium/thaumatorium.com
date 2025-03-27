# Structured Raw Data

This data _is_structured, but would require a custom parser to figure out, so I'm still calling this raw.

I've extracted the text from the unstructured data by using OpenAI `4o` model
and asked it to convert the images to text itself. I did it in parts (take a
screenshot of part of the image), to ensure `4o` didn't get lost in the data. I
also specified that it should do it itself, otherwise it'll use some Python OCR
lib to do it, but those are PAINFULLY inaccurate.

## Regexes

These I used to clean up the data

`^(?![ \t])\S.*\n(?![ \t])\S.*` - to find two consecutive lines. Typically these
are Department and Role lines.
