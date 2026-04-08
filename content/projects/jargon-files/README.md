# Jargon File 4.4.7 tooling

This directory has a small parser/CLI for `jargon-file.org/jargon-4.4.7.dos.txt`.

It is deliberately narrow:

- parse only `4.4.7` for now;
- export structured JSON for a later web app;
- support two immediate UX needs already: search and random entry lookup.

## Commands

Build JSON:

```bash
python3 content/projects/jargon-files/jargon_447.py build
```

Search entries:

```bash
python3 content/projects/jargon-files/jargon_447.py search automagically
python3 content/projects/jargon-files/jargon_447.py search "angle brackets" --limit 3
```

Show a random entry:

```bash
python3 content/projects/jargon-files/jargon_447.py random
python3 content/projects/jargon-files/jargon_447.py random --seed 447
```

Run tests:

```bash
python3 -m unittest discover -s content/projects/jargon-files/tests -p 'test_*.py'
```

## Output model

The `build` command writes `content/projects/jargon-files/build/jargon-4.4.7.json` with:

- `version`
- `source_file`
- `entry_count`
- `entries[]`

Each entry contains:

- `headword`
- `url_key`
- `header`
- `body`
- `body_raw`
- `line_start`

`body` is paragraph-unwrapped for search and web display.
`body_raw` stays closer to the original file layout in case a later frontend wants more faithful rendering.

## Why this shape

`4.4.7` is the cleanest starting point because the real lexicon entries are consistently marked as `:headword:` in the source.

That makes it a good base for:

- a static-site search index;
- a frontpage random-term widget;
- later version-history support without rewriting the whole first parser.
