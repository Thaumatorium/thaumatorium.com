---
title: "About"
description: "About NostraDavid and the Thaumatorium"
publishDate: 2020-08-03T22:31:44+01:00
lastmod: 2025-04-09T20:08:00+02:00
---

## NostraDavid; the author

I'm someone who's sick of the state of the web and you know what they say:

> Improve the world, start with yourself - [Bond Zonder Naam](https://nl.wikipedia.org/wiki/Bond_zonder_Naam)

This is why I started with the basics: HTML, CSS and JS. Anything else is deemed _bloat_. Then, over the years of HTML growth, I eventually switched to GoHugo as the basis of my website, so I could reduce a mass amount of duplicate HTML (mostly around the website's menu)

## Thaumatorium

### The name

It's based on the word _thaumaturge_, meaning _miracle worker_, thus _Thaumatorium_ is where miracles are performed.

### The reason - the why

I wanted a place where I could post my articles, but I found my free [Wordpress site](https://thaumatorium.wordpress.com/) too slow, too bloated, too messy, so I started to search for a way to still create and host articles, without needing bloat like Wordpress.

I started with thinking about using something like Angular and React. They were the hot new thing in town, so why not try that? Turns out they both have a tendency to become pretty damn complex pretty damn fast - that's my personal experience anyway.

After finding Elm, a Haskell-like language that compiles to JS I though to use that as it promised small and (more importantly) _fast_ websites.

After learning the creator wasn't the... most cooperating of persons I decided to move on before even clashing with him.

I quickly found the Blazor beta, which seemed promising, especially in the PWA department. Downsides: the output is rather huge (4MB+ in size) and the code is based on the Mono lib, not the fastest of libs.

So I ended up thinking: What's left after removing _all and anything_ bloat? HTML. CSS. JS... So why not create my site in that? So I set out to create a PWA - a single HTML page that contains the whole site.

The site quickly grew too big for this, so I changed it up by splitting the site in separate HTML pages, but index.html contained the generic header/footer HTML, while the other HTML files contained the articles.

In doing so - splitting the site, but mostly handling things like a PWA - I broke the back/forward buttons and browser history...

In the end I decided in writing just separate HTML pages, which means I have a bunch of duplicate HTML, but I'm OK with that, as I know enough REGEX to edit _all_ HTML headers in one fell swoop!

After about two years of building this site I ended up switching to GoHugo as a site generator that would let me write stuff in Markdown, or HTML, depending on my needs. If I just want a regular-ass looking article, I can just write Markdown, but if I want to I can just write HTML (either inside the Markdown, or just straight up).
