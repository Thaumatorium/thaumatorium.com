# Hugo

This folder contains the Hugo code to generate the static site :D

## Dev setup

This project uses `devenv` + `direnv` for the Hugo development shell.

```bash
direnv allow
```

If you want to enter the shell manually instead of using `direnv`:

```bash
devenv shell
```

Project commands live in `just`:

```bash
just
```

Formatting now uses `oxfmt`:

```bash
just fmt
just fmt-public
```

Git hooks use `prek` with a local `oxfmt` hook:

```bash
just prek-install
just prek-run --all-files
```

## Add article

```bash
just new-article articles/test/_index.md
```

## Run the server

```bash
just serve
```

## Tools

These were used to create this Hugo version of the site:

- [html-to-markdown](https://codebeautify.org/html-to-markdown)
- [html-to-markdown](https://tableconvert.com/html-to-markdown)
