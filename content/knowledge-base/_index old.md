---
title: "NostraDavid's Knowledge Base - Javascript code snippets and regex"
publishDate: 2020-08-17T16:55:37+01:00
lastmod: 2020-08-17T16:55:37+01:00
---

For now (2020-07-16) it's just snippets of JS and regex that I use every now and then

I'd use GitHub for that, but I have a tendency to forget [GitHub Gist](https://gist.github.com/NostraDavid) exists…

<div>
	<button class=button type=button onclick="document.querySelectorAll(`details`).forEach(el => {el.open = true});">Open all chapters</button>
	<button class=button type=button onclick="document.querySelectorAll(`details`).forEach(el => {el.open = false});">Close all chapters</button>
</div>

<details>
	<summary>
		<h2>Online Tools</h2>
		<p>These are websites/webpages that I use to optimize this site.</p>
	</summary>

| Tool name                                                                  | What to use it for                                                                                                                                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [SVGOMG!](https://jakearchibald.github.io/svgomg/)                         | "[**SVG O**ptimizer](https://github.com/svg/svgo)'s **M**issing **G**UI", an online SVG optimizer                                                                                                       |
| [Google's Closure Compiler](https://closure-compiler.appspot.com/home)     | A Javascript optimizer - turns modern JS into highly optimized, yet compatible, Javascript. I use this to improve my JS code here and there.                                                            |
| [My Sitemap Generator](https://www.mysitemapgenerator.com/)                | Since this is a fully static site I have to update the sitemap manually. I use this site to automate the generation partially.                                                                          |
| [Boxy SVG editor](https://boxy-svg.com/app/)                               | Usually I edit my SVG files by hand, but sometimes I need some basic shapes placed.                                                                                                                     |
| [Bing's robot.txt Tester](https://www.bing.com/webmasters/robotstxttester) | Use this to check your robots.txt for faults.                                                                                                                                                           |
| [Squoosh](https://squoosh.app/)                                            | Google Chrome Labs created this site so you can customize the compression of your image (and compare it with the original). [Desktop version](https://squoosh-desktop.now.sh/) is also available.       |
| [Diagrams.net](https://app.diagrams.net/) (previously Draw.io)             | Used for diagrams. If you save a file as PNG you can open it as PNG with an image viewer _and_ and with the website or [Desktop version](https://github.com/jgraph/drawio-desktop/releases/tag/v13.6.2) |

</details>


<details>
	<summary>
		<h2>Javascript oneliners</h2>
		<p>Small scripts that I run in the browser to manipulate a website (like remove my reddit comments from a specific subreddit, for example)</p>
	</summary>


<table>
	<tbody>
		<tr>
			<th>note</th>
			<th>code</th>
		</tr>
		<tr>
			<td>Open all collapsed comments on a reddit comment page</td>
			<td>

```js
document.querySelectorAll(".expand")
				.forEach(el => {
					if (el.innerText == "[+]") {
						el.click();
					}
				});
```
</td>
</tr>
<tr>
<td>Manipulating Unicode strings per code point, not per byte. <code class=lang-javascript>"".split()</code> gives you bytes, not codepoints</td>
<td>

	```js
	Array.from("𝔱𝔢𝔰𝔱𝔦𝔫𝔤 𝔗𝔈𝔖𝔗 #@$%#^$% 𝔱𝔢𝔰𝔱𝔦𝔫𝔤 𝔗𝔈𝔖𝔗");
	```

</td>
</tr>
<tr>
<td>Remove all <code class=lang-css>.bighead</code> classed elements (no Array.from() needed, which is what I used before, so I could use map() instead of a for loop)</td>
<td>

```js
document.querySelectorAll(".bighead")
	.forEach(el => {
		el.parentElement
			.removeChild(el)
		});
```

</td>
</tr>
<tr>
<td>Make console.log use colors</td>
<td>

```js
const CONSOLE_STYLE = "background: #800; color: #fff; padding: 2px";
console.log('%cService worker installing', CONSOLE_STYLE);
```
</td>
</tr>
<tr>
<td>This opens all <samp>are you sure?</samp> dialogs for comments, on a profile page of Reddit</td>
<td>

```js
let ys = Array.from(document.getElementsByClassName("score likes"))
							.filter(e => parseInt(e.title) < 3)
							.map(e => e.parentElement.parentElement.parentElement)
							.map(el => el.querySelector(`[data-event-action*="delete"]`));
// pick everything after the 77th comment
ys = ys.slice(77, ys.length - 1);
ys.map(e => e.click());
```

</td>
</tr>
<tr>
<td>Removing duplicates</td>
<td>

```js
const cities = ["Den Haag","Den Haag",
								"Utrecht", "Utrecht",
								"Arnhem", "Arnhem",
								"MiddelBurg", "MiddelBurg",
								"MiddelBurg"];
const uniqueCities = [...new Set(cities)];
// ["Den Haag", "Utrecht", "Arnhem", "MiddelBurg"]
```

</td>
</tr>
<tr>
<td>Run a timed loop (handy for interacting with Reddit, because Reddit has a rate limit of 30 requests per minute)</td>
<td>

```js
let xs = document.querySelectorAll("[query goes here]");
let i = 0;
let id = setInterval(() => {console.log(i); xs[i].click(); i++;}, 1100);
clearInterval(id);
```

</td>
</tr>
<tr>
<td> Remove all comments from a specific subreddit (TheLastOfUs2, in this case)</td>
<td>

```js
Array.from(document.getElementsByClassName("subreddit hover"))
									 .filter(el => el.innerHTML == "TheLastOfUs2")
									 .map(el => el.parentElement.parentElement)
									 .map(el => {
										 // subselection apparently works
										 el.querySelector(`[data-event-action*="delete"]`)
									 })
									 .map(el => el.click());
```

</td>
</tr>
<tr>
<td>Use on Twitch to track the amount of currently used emotes</td>
<td>

```js
const groupBy = (xs, key) => xs.reduce((acc, x) => {
	(acc[x[key]] = acc[x[key]] || []).push(x);
	return acc;
}, {});

let emoticons = Array.from(document.querySelectorAll(`.chat-line__message--emote[alt]`));
let groupedEmoticons = groupBy(emoticons, 'alt');
let listedEmoticons = [];

for (const key in groupedEmoticons) {
	if (groupedEmoticons.hasOwnProperty(key)) {
		const el = groupedEmoticons[key];
		listedEmoticons.push({key: key, length: el.length});
	}
}

listedEmoticons.sort((a, b) => b.length - a.length)
							 .slice(0,6)
							 .sort((a, b) => a.length - b.length)
							 .reduce((acc, el) => `${el.length}x ${el.key} ` + acc);
```
</td>
</tr>
</tbody>
</table>
</details>

<details>
	<summary>
				<h2>Regular Expressions</h2>
				<p>Use in combination with $0/$1/$2... to find and replace text.</p>
	</summary>

| note                                                                                                                                                      | regex                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Find the nth comma, via <a href="https://stackoverflow.com/a/9194889/1102369">stackoverflow</a>;<br> Edit the number in between {} to find the nth comma. | `,(?=(?:[^,]*,){3}[^,]*$)`                               |
| Every line that doesn't start with a . via regex;<br>I was trying to filter bootstrap.css from all non-classes                                            | `^((?!^\.).)*$`                                          |
| Filter everything from a : till the end of the line                                                                                                       | `[:].*$`                                                 |
| Find non-ASCII letters in vscode;<br>Great for finding unicode characters in copied code, because Haskell can't handle Unicode in your comments...        | `([^\x00-\x7F])`                                         |
| hit him up when you pay for WoW                                                                                                                           | Craizler-TarrenMill                                      |
| WoW BattleTag                                                                                                                                             | Cyrstad#2776                                             |
| Find main content of HTML page                                                                                                                            | `<main>\n\t+<section>((\n.*?)*)</section>(\n\t+)</main>` |
| find paragraph tags that aren't closed                                                                                                                    | `\t+<p>.*(?<!</p>)$`                                     |
| find all lines that do not contain hede                                                                                                                   | `^((?!hede).)*$`                                         |

</details>

<details>
	<summary>
		<h2>National 'warcry'</h2>
		<p>Twitch sillyness</p>
	</summary>

Not really a 'warcry', but whenever anyone posts any of these terms other nationals will join in repeating it.

PS: Sometimes it's just an emote spam

| Country   | Warcry                                                                  |
| --------- | ----------------------------------------------------------------------- |
| Dutch     | G E K O L O N I S E E R D                                               |
| German    | Sprich Deutsch, du Hurensohn!                                           |
| Swedish   | Skååååål                                                                |
| Danish    | Skååååål                                                                |
| Finnish   | Torille!                                                                |
| Bulgarian | [KKomrade](https://cdn.betterttv.net/emote/56be9fd6d9ec6bf74424760d/3x) |
| Germany   | [DatScheffe](https://static-cdn.jtvnw.net/emoticons/v1/111700/3.0)      |

</details>


<details open>
	<summary>
		<h2>Information for a secret project</h2>
		<p>I can't show you yet. I'm halfway, but its important it's done.</p>
	</summary>

| Character | HTML code                 |
| --------- | ------------------------- |
| 𝑥         | `&#119909;`               |
| ə         | `&#601;`                  |
| α         | `&alpha;`                 |
| β         | `&beta;`                  |
| 𝔟         | `&bfr;`                   |
| 𝔅         | `&Bfr;`                   |
| 𝔠         | `&cfr;`                   |
| ℭ         | `&Cfr;`                   |
| †         | `&dagger;`                |
| ‡         | `&ddagger;`               |
| 𝔢         | `&efr;`                   |
| 𝔈         | `&Efr;`                   |
| =         | `&equals;`                |
| 𝔣         | `&ffr;`                   |
| γ         | `&gamma;`                 |
| …         | `&hellip;`                |
| 𝔨         | `&kfr;`                   |
| 𝔩         | `&lfr;`                   |
| ℳ         | `&Mscr;`                  |
|           | `&nbsp;`                  |
| 𝔬         | `&ofr;`                   |
| ö         | `&ouml;`                  |
| 𝔭         | `&pfr;`                   |
| ′         | `&prime;`                 |
| 𝔮         | `&qfr;`                   |
| →         | `&rarr;`                  |
| 𝔯         | `&rfr;`                   |
| §         | `&sect;`                  |
| 𝔘         | `&Ufr;`                   |
| 𝒰         | `&Uscr;`                  |
| Ü         | `&Uuml;`                  |
| “         | `&OpenCurlyDoubleQuote;`  |
| ”         | `&CloseCurlyDoubleQuote;` |
| π         | `&pi;`                    |

</details>
