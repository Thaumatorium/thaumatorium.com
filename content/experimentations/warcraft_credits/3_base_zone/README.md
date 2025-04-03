# Base Zone

Here is where the data is prepared before we can properly manipulate it.

We're removing:

* `<br /><br /><br /><br /><br />`
* `<h2 />` ????
* `Dunsel` titles - these are joke titles that I'll skip
* `Thanks To`, `Special Thanks`, `VERY SPECIAL THANKS`, `Additional Thanks` "roles", as those people
  have not worked on that specific game.
* `BLIZZARD DEVELOPMENT FAMILY` - these are just people that used to work for
  Blizzard. Not relevant to our research.
* fix a typo in `NetEase, Inc.`
* replace `&#44;` (HTML encoding) with `,` using:

  ```bash
  find . -name '*.html' -print0 | while IFS= read -r -d '' file; do
    perl -MHTML::Entities -pe 'decode_entities($_)' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  done
  ```

TODO:
* remove `<p>` tags - not sure what they were for...
* lowercase `Dal Loc Mult. SL`, and `Qloc S.A.` titles (otherwise my script
  breaks).
* removed `Third Party Credits` from `Legion`, as it was a duplicate of `Voice
  Over Cast - Brazil`
* removed instruments for:
  * `Guest Musicians`, from `WotLK`
  * `Featured Musicians`, from `Cata`
  * `Featured Musicians`, from `MoP`
  * `Featured Musicians`, from `BfA`.
  * `Featured Musicians`, from `Shadowlands`.
  * `Featured Musicians`, from `Dragonflight`.
