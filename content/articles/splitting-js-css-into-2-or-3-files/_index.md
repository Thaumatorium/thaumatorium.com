---
title: "Optimizing your site by splitting JS/CSS into layers"
description: "A spark of an idea to enhance site performance"
publishDate: 2019-11-29T00:00:00+02:00
lastmod: 2024-07-24T19:54:00+02:00
layout: article
---

My idea is to split CSS into 3 parts (layers), where each outer part effectively builds on top of the inner part. The same applies to JS. This idea came from analyzing coverage using [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/coverage).

### Steps to Optimize

1. **Check Coverage with Chrome DevTools:**
   Use the coverage tool in Chrome DevTools to identify which parts of your JS/CSS are actually used by your site.

2. **Split the Files Programmatically:**
   After analyzing coverage, split the JS/CSS files into three categories:
   - **InnerCore:** Inline JS/CSS that is essential for when JS/CSS files fail to load, particularly on very slow connections.
   - **OuterCore:** JS/CSS that is actively covered (used) as identified by DevTools.
   - **Mantle:** JS/CSS that is not currently covered but may be used by the site under certain conditions.

### Why Split Files?

Splitting JS/CSS files helps in optimizing load times and improving the overall performance of your website. By ensuring that only essential code is loaded initially, you can enhance the user experience, especially for users with slower internet connections.

### How to Implement

Do this programmatically, as manually splitting files can be error-prone and time-consuming. Use scripts or build tools that automate the process based on the coverage data from DevTools.

### Naming Convention

The naming convention for these splits is inspired by Earth's structure:

- **InnerCore:** Essential inline code
- **OuterCore:** Covered code
- **Mantle:** Uncovered but potentially useful code

For a visual reference, see the [Earth poster on Wikipedia](https://en.wikipedia.org/wiki/Earth%27s_inner_core#/media/File:Earth_poster.svg):

![Earth poster on Wikipedia](https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Earth_poster.svg/2880px-Earth_poster.svg.png)

By following these steps, you can ensure that your website is both efficient and effective, providing a better experience for your users.
