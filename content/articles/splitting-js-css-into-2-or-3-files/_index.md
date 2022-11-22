---
title: "Splitting JS/CSS into 2 or 3 files, meant for optimizing your site"
description: "Just a little spark of an idea"
publishDate: 2019-11-29T00:00:00+01:00
lastmod: 2019-11-29T00:00:00+01:00
layout: article
---
Context: Checking Coverage with [Chrome Devtools](https://developers.google.com/web/tools/chrome-devtools/coverage)

After checking coverage, split the JS/CSS up into:

* InnerCore (inline JS/CSS, needed for when the JS/CSS files don't load on super slow connections)
* OuterCore (the JS/CSS that's covered by Devtools)
* Mantle (the JS/CSS that's NOT covered by Devtools, but can be potentially used by the site)

Do all of this programmatically, because you do NOT want to do this by hand.

Names are based on Earth:

- [Wikipedia/Earth\_poster.svg](https://en.wikipedia.org/wiki/Earth%27s_inner_core#/media/File:Earth_poster.svg)
