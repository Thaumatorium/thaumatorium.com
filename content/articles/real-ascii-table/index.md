---
title: "Will the Real Ascii Table please stand up?"
description: "ASCII is a 7-bit layout with structure, not just a list of characters — here's the table that shows it"
publishDate: 2026-03-08T14:54:40+01:00
lastmod: 2026-03-08T14:54:40+01:00
layout: article
---

Most ASCII tables are formatted in a way that hides the interesting part: ASCII is a 7-bit layout with structure, not
just a list of characters.

If you split the table by the top 2 bits, and use the lower 5 bits as the row index, the design suddenly becomes
obvious:

- the left column is control codes
- digits and punctuation live in the middle
- uppercase and lowercase line up almost perfectly
- `A` and `a` differ by exactly one bit: `0x20`

So instead of a long boring table, you get something that shows why ASCII was laid out this way.

The columns below are the top 2 bits. The rightmost column is the lower 5 bits.

<style>
abbr[title] {
	cursor: help;
	position: relative;
	text-decoration: underline dotted;
}
abbr[title]:hover::after,
abbr[title]:focus::after {
	content: attr(title);
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
	bottom: 100%;
	margin-bottom: 4px;
	background: #333;
	color: #fff;
	padding: 4px 8px;
	border-radius: 4px;
	font-size: 0.85em;
	white-space: nowrap;
	z-index: 10;
	pointer-events: none;
}
</style>

| 00                                                                       |  01   | 10  |                                                               11 | low 5 bits |
| :----------------------------------------------------------------------- | :---: | :-: | ---------------------------------------------------------------: | :--------: |
| <abbr tabindex="0" title="Null – zero byte">NUL</abbr>                   | `Spc` | `@` |                                                          `` ` `` |  `00000`   |
| <abbr tabindex="0" title="Start of Heading">SOH</abbr>                   |  `!`  | `A` |                                                              `a` |  `00001`   |
| <abbr tabindex="0" title="Start of Text">STX</abbr>                      |  `"`  | `B` |                                                              `b` |  `00010`   |
| <abbr tabindex="0" title="End of Text">ETX</abbr>                        |  `#`  | `C` |                                                              `c` |  `00011`   |
| <abbr tabindex="0" title="End of Transmission">EOT</abbr>                |  `$`  | `D` |                                                              `d` |  `00100`   |
| <abbr tabindex="0" title="Enquiry – request a response">ENQ</abbr>       |  `%`  | `E` |                                                              `e` |  `00101`   |
| <abbr tabindex="0" title="Acknowledge – positive response">ACK</abbr>    |  `&`  | `F` |                                                              `f` |  `00110`   |
| <abbr tabindex="0" title="Bell – beep or flash">BEL</abbr>               |  `'`  | `G` |                                                              `g` |  `00111`   |
| <abbr tabindex="0" title="Backspace">BS</abbr>                           |  `(`  | `H` |                                                              `h` |  `01000`   |
| <abbr tabindex="0" title="Horizontal Tab">TAB</abbr>                     |  `)`  | `I` |                                                              `i` |  `01001`   |
| <abbr tabindex="0" title="Line Feed – move down one line">LF</abbr>      | `\*`  | `J` |                                                              `j` |  `01010`   |
| <abbr tabindex="0" title="Vertical Tab">VT</abbr>                        |  `+`  | `K` |                                                              `k` |  `01011`   |
| <abbr tabindex="0" title="Form Feed – next page">FF</abbr>               |  `,`  | `L` |                                                              `l` |  `01100`   |
| <abbr tabindex="0" title="Carriage Return – start of line">CR</abbr>     |  `-`  | `M` |                                                              `m` |  `01101`   |
| <abbr tabindex="0" title="Shift Out – alternate character set">SO</abbr> |  `.`  | `N` |                                                              `n` |  `01110`   |
| <abbr tabindex="0" title="Shift In – default character set">SI</abbr>    |  `/`  | `O` |                                                              `o` |  `01111`   |
| <abbr tabindex="0" title="Data Link Escape">DLE</abbr>                   |  `0`  | `P` |                                                              `p` |  `10000`   |
| <abbr tabindex="0" title="Device Control 1 (XON)">DC1</abbr>             |  `1`  | `Q` |                                                              `q` |  `10001`   |
| <abbr tabindex="0" title="Device Control 2">DC2</abbr>                   |  `2`  | `R` |                                                              `r` |  `10010`   |
| <abbr tabindex="0" title="Device Control 3 (XOFF)">DC3</abbr>            |  `3`  | `S` |                                                              `s` |  `10011`   |
| <abbr tabindex="0" title="Device Control 4">DC4</abbr>                   |  `4`  | `T` |                                                              `t` |  `10100`   |
| <abbr tabindex="0" title="Negative Acknowledge">NAK</abbr>               |  `5`  | `U` |                                                              `u` |  `10101`   |
| <abbr tabindex="0" title="Synchronous Idle">SYN</abbr>                   |  `6`  | `V` |                                                              `v` |  `10110`   |
| <abbr tabindex="0" title="End of Transmission Block">ETB</abbr>          |  `7`  | `W` |                                                              `w` |  `10111`   |
| <abbr tabindex="0" title="Cancel">CAN</abbr>                             |  `8`  | `X` |                                                              `x` |  `11000`   |
| <abbr tabindex="0" title="End of Medium">EM</abbr>                       |  `9`  | `Y` |                                                              `y` |  `11001`   |
| <abbr tabindex="0" title="Substitute – replacement marker">SUB</abbr>    |  `:`  | `Z` |                                                              `z` |  `11010`   |
| <abbr tabindex="0" title="Escape – start escape sequence">ESC</abbr>     |  `;`  | `[` |                                                              `{` |  `11011`   |
| <abbr tabindex="0" title="File Separator">FS</abbr>                      |  `<`  | `\` |                                                             `\|` |  `11100`   |
| <abbr tabindex="0" title="Group Separator">GS</abbr>                     |  `=`  | `]` |                                                              `}` |  `11101`   |
| <abbr tabindex="0" title="Record Separator">RS</abbr>                    |  `>`  | `^` |                                                              `~` |  `11110`   |
| <abbr tabindex="0" title="Unit Separator">US</abbr>                      |  `?`  | `_` | <abbr tabindex="0" title="Delete – all 1 bits (0x7F)">DEL</abbr> |  `11111`   |

The nicest part is the letter alignment:

- `A` is `1000001`
- `a` is `1100001`

Only one bit changes: bit `0x20`.

That means ASCII case conversion is not some arbitrary lookup table artifact. It is baked directly into the encoding.
The same row, same lower 5 bits, different high bits.

That also explains a bunch of old bit tricks:

- uppercase to lowercase: set bit `0x20`
- lowercase to uppercase: clear bit `0x20`
- map letters to `1..26`: mask with `0x1f`

## Useful shortcuts

These only work because ASCII is structured so cleanly.

### Flip case with a single bit

Uppercase and lowercase letters differ only in bit `0x20`.

- `A` = `0x41`
- `a` = `0x61`

So:

- force lowercase: `c | 0x20`
- force uppercase: `c & 0x5f`
- toggle case: `c ^ 0x20`

Of course, that only makes sense if `c` is already an ASCII letter. If you do it blindly, other characters also move
around.

### Map letters to 1 through 26

Because the low 5 bits are shared between uppercase and lowercase letters, this works:

- `A & 0x1f = 1`
- `B & 0x1f = 2`
- ...
- `Z & 0x1f = 26`

And the same holds for lowercase letters:

- `a & 0x1f = 1`
- `z & 0x1f = 26`

That made ASCII handy for parsers, tokenizers, and old-school case-insensitive logic.

### Digits are contiguous too

The digits are also laid out as a neat block:

- `0` = `0x30`
- `1` = `0x31`
- ...
- `9` = `0x39`

So converting between digit characters and numbers is trivial:

- char to int: `c - '0'`
- int to char: `n + '0'`

That seems obvious now, but it is another example of ASCII being designed for computation, not just display.

### Control codes line up with letters

There is another cute shortcut hidden in the table.

If you take an uppercase letter and clear the high 3 bits with `& 0x1f`, you land in the control-code range:

- `A & 0x1f = 0x01` = `SOH`
- `M & 0x1f = 0x0d` = `CR`
- `J & 0x1f = 0x0a` = `LF`
- `Z & 0x1f = 0x1a` = `SUB`

This is why notations like `Ctrl-M` and `Ctrl-J` make historical sense: they map directly onto carriage return and line
feed.

### Cheap ASCII checks

The same structure also makes simple range checks cheap:

- digit: `'0' <= c && c <= '9'`
- uppercase: `'A' <= c && c <= 'Z'`
- lowercase: `'a' <= c && c <= 'z'`
- alphabetic ASCII: `(c | 0x20) >= 'a' && (c | 0x20) <= 'z'`

Again, this is not accidental. The layout was chosen so character classification and conversion would be easy on limited
hardware.

## What the control codes actually mean

The `00` column is the least familiar part of ASCII today.

These are the old control codes: non-printable values meant for teletypes, terminals, printers, and serial links. They
were used to structure messages, move the print head around, ring bells, pause transmission, and escape into
device-specific commands.

Some are still relevant. Many are now mostly historical.

### Message framing and transmission

These were used to structure or control a stream of data:

- `SOH` = Start of Heading
  Used to mark the beginning of a message header.
  Mostly historical now.
- `STX` = Start of Text
  Marks the start of the actual payload text.
  Mostly historical now.
- `ETX` = End of Text
  Marks the end of the payload text.
  Mostly historical now.
- `EOT` = End of Transmission
  Signals that transmission is done.
  Mostly historical now.
- `ENQ` = Enquiry
  Used to ask the other side for a response.
  Mostly historical now.
- `ACK` = Acknowledge
  Positive acknowledgement: "got it".
  Still conceptually relevant, but not usually as raw ASCII anymore.
- `NAK` = Negative Acknowledge
  Negative acknowledgement: "send again" or "something went wrong".
  Same story: concept still relevant, raw code mostly historical.
- `SYN` = Synchronous Idle
  Used to maintain synchronization on synchronous links.
  Historical.
- `ETB` = End of Transmission Block
  End of one block in a larger transmission.
  Historical.

### Device control

These were meant to control hardware more directly:

- `DLE` = Data Link Escape
  Escape byte in communication protocols.
  Historical in raw ASCII form, though escape bytes still exist in many protocols.
- `DC1` = Device Control 1
  General device control. Often reused as XON.
  Still somewhat relevant historically because of XON/XOFF flow control.
- `DC2` = Device Control 2
  General device control.
  Mostly historical.
- `DC3` = Device Control 3
  General device control. Often reused as XOFF.
  Still somewhat relevant historically because of XON/XOFF flow control.
- `DC4` = Device Control 4
  General device control.
  Mostly historical.

### Layout, paper, and terminal movement

These matter because ASCII came from the teletype era:

- `BEL` = Bell
  Makes the terminal beep or flash.
  Still somewhat relevant; many terminals still react to it.
- `BS` = Backspace
  Move back one character position.
  Still relevant in terminals and text processing.
- `TAB` = Horizontal Tab
  Move to the next tab stop.
  Still very relevant.
- `LF` = Line Feed
  Move down one line.
  Still very relevant.
- `VT` = Vertical Tab
  Vertical movement similar to tabbing down.
  Mostly irrelevant today.
- `FF` = Form Feed
  Advance to the next page.
  Mostly obsolete, except in a few printers and legacy formats.
- `CR` = Carriage Return
  Move to the start of the current line.
  Still very relevant because of line endings like `CRLF`.

### Shift and escaping

- `SO` = Shift Out
  Switch to an alternate character set or mode.
  Historical for most people.
- `SI` = Shift In
  Switch back from the alternate set or mode.
  Historical for most people.
- `ESC` = Escape
  Start an escape sequence.
  Very relevant. Modern terminal control sequences still use `ESC`.

### Record and separator codes

These were intended as structural separators in text streams:

- `FS` = File Separator
- `GS` = Group Separator
- `RS` = Record Separator
- `US` = Unit Separator

These are mostly historical today. The idea survived, but modern formats usually use commas, tabs, newlines, JSON
punctuation, or protocol-specific delimiters instead.

### Special cases

- `NUL` = Null
  Literally a zero byte.
  Still extremely relevant in C, binary data, protocol padding, and low-level programming.
- `SUB` = Substitute
  Used as a replacement marker for invalid or missing data.
  Mostly historical.
- `CAN` = Cancel
  Cancel the current operation or block.
  Mostly historical.
- `EM` = End of Medium
  Intended to mark the end of a physical medium, like tape.
  Historical.
- `DEL` = Delete
  Originally all 1 bits (`0x7f`), handy for punching out paper tape.
  Still somewhat relevant as the Delete key code name, though its original purpose is obsolete.

### Which ones still matter?

If you are writing modern software, the most relevant control codes are usually:

- `NUL`
- `TAB`
- `LF`
- `CR`
- `ESC`
- `DEL`
- sometimes `BEL`, `BS`, `DC1`, and `DC3`

The rest are mostly of historical interest. They matter if you care about old communication protocols, terminals,
paper tape, or how character encodings evolved, but most programmers will almost never handle them directly.

Once you see ASCII in this shape, it stops looking random and starts looking engineered.
