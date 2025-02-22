# Structured Raw Data

This data _is_structured, but would require a custom parser to figure out, so I'm still calling this raw.

I've extracted the text from the unstructured data by using OpenAI 4o model and
asked it to convert the images to text. I did it in parts (take a screenshot of
part of the image), to ensure `4o` didn't get lost. I also specified that it
should do it itself, otherwise it'll use some Python OCR lib to do it, but those
are PAINFULLY inaccurate.
