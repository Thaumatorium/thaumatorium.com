---
title: "Haskell's fold functions explained"
description: "It's comparable to the map function, but isn't ambiguous about its direction"
publishDate: 2019-05-01T00:00:00+01:00
lastmod: 2024-07-24T18:35:00+02:00
layout: article
---
Protip: Use [https://repl.it/](https://repl.it/) to run your own little test
programs. Yes, they support other languages than Haskell as well.

Haskell's fold functions are Higher Order and Recursive functions. If you've
read [Types (or classes) of Haskell
functions](https://thaumatorium.wordpress.com/2018/10/15/types-or-classes-of-haskell-functions),
you'll know what that is. These functions take a function, a first/final item
(more on this later), a list of things, and return a single reduced item.

## Foldr

```haskell
foldr :: (a -> b -> b) -> b -> [a] -> b
foldr f z []     = z
foldr f z (x:xs) = f x (foldr f z xs)
```

There are two cases:

* The base case (where the input list is empty)
* The general case (where the input list is not empty), one item gets reduced,
  and the function is recursively called on the rest of the list.

Now let's run foldr:

```haskell
foldr (+) 0 [1,2,3,4]
```

As you notice, the `+` operator is placed in parentheses. This is to prevent the
direct application of `+`. If you run the command above without the parentheses,
you'll get an error. (Try it on the aforementioned [repl.it](https://repl.it/)
website!)

The answer is `10`, as `1 + 2 + 3 + 4 = 10`. But what's that `0` doing there?
That is the identity value for `+`. The identity value of a function means that
if you put any other value in, you'll get that value back out: `x + 0 = x`.

Other operators may have different identity values:

* Subtraction (`-`) has `0` (`x - 0 = x`) as identity.
* Multiplication (`*`) has `1` (multiplying by `0` would always give you `0`,
  which is unwanted behavior) as identity.
* Division (`/`) has `1` as identity.
* Exponentiation (`^`) (aka "the power operator") also has `1` as identity.
* `f()` where `f` outputs a list has the empty list (`[]`) as identity.

But how is `10` calculated? Since the function is called fold **right**, we know two things: all grouped parentheses are on the right, and the identity value will be the last value inserted.

If I run the code by hand (if you've ever followed a Logic course, you'll recognize this as **induction**), we'll get the following execution:

```haskell
foldr (+) 0 [1,2,3,4]
= { apply foldr, since the input is not an empty list we apply the general case }
(+) 1 (foldr (+) 0 [2,3,4])
= { apply foldr, ditto as before }
(+) 1 ((+) 2 (foldr (+) 0 [3,4]))
= { apply foldr, ditto as before }
(+) 1 ((+) 2 ((+) 3 (foldr (+) 0 [4])))
= { apply foldr, ditto as before }
(+) 1 ((+) 2 ((+) 3 ((+) 4 (foldr (+) 0 []))))
= { apply foldr, but since the list is now empty, return the identity value instead! }
(+) 1 ((+) 2 ((+) 3 ((+) 4 0)))
= { apply the most inner + operator }
(+) 1 ((+) 2 ((+) 3 4))
= { apply the most inner + operator }
(+) 1 ((+) 2 7)
= { apply the most inner + operator }
(+) 1 9
= { apply the last + operator }
10
```

Now, when you take a look at the moment all `foldr`s have been applied, you may see you can rewrite that line from:

```haskell
(+) 1 ((+) 2 ((+) 3 ((+) 4 0)))
```

to

```haskell
1 + (2 + (3 + (4 + 0)))
```

which is more readable. Now, for this instance, the order of execution doesn't matter at all, but there are certain operators (like subtraction and division) where the order does matter! `1/2 = 0.5`, whereas `2/1 = 2`.

Let's say we execute the next line. What will the answer be?

```haskell
foldr (-) 0 [1,2,3,4]
```

Let's simplify the executed code above to that cleaned up line right below it:

```haskell
1 - (2 - (3 - (4 - 0)))
```

As I've mentioned before: all grouped parentheses are on the right (because fold right) and the identity value is also on the right.

When we run this code we get:

```haskell
1 - (2 - (3 - (4 - 0)))
= { apply the most inner - }
1 - (2 - (3 - 4))
= { apply the most inner -; negative values must be wrapped in parentheses }
1 - (2 - (-1))
= { apply the most inner -; subtracting a negative number is the same as adding it }
1 - 3
= { apply the last - }
-2
```

## Foldl

Definition (again from Wikipedia):

```haskell
foldl :: (b -> a -> b) -> b -> [a] -> b
foldl f z [] = z
foldl f z (x:xs) = foldl f (f z x) xs
```

What is different? The input function has its first types flipped, and in the general case, you can see that the application of `f` is moved into the location of what was the identity value.

Let's run the same code we did last time:

```haskell
foldl (-) 0 [1,2,3,4]
= { apply foldl. Again the list isn't empty, so we'll apply the general case }
foldl (-) ((-) 0 1) [2,3,4]
= { apply foldl, ditto }
foldl (-) ((-) ((-) 0 1) 2) [3,4]
= { apply foldl, ditto }
foldl (-) ((-) ((-) ((-) 0 1) 2) 3) [4]
= { apply foldl, ditto }
foldl (-) ((-) ((-) ((-) ((-) 0 1) 2) 3) 4) []
= { apply foldl, again the list is now empty, so apply the base case }
(-) ((-) ((-) ((-) 0 1) 2) 3) 4
= { apply the most inner - }
(-) ((-) ((-) (-1) 2) 3) 4
= { apply the most inner - }
(-) ((-) (-3) 3) 4
= { apply the most inner - }
(-) (-6) 4
= { apply the last - }
(-10)
```

Now, after you've applied all `foldl`s, we can clean up that code:

```haskell
(-) ((-) ((-) ((-) 0 1) 2) 3) 4

(((0 - 1) - 2) - 3) - 4
```

There, much more readable! As you'll notice, the grouped parentheses are now all on the left (from the name fold left), ditto for the identity value.

Sometimes you have to rewrite code to make it make sense in Haskell. It's a sad fact of life. Anyway, if we reduce this cleaned up code we'll get:

```haskell
(((0 - 1) - 2) - 3) - 4
= { apply most inner - }
(((-1) - 2) - 3) - 4
= { apply most inner - }
((-3) - 3) - 4
= { apply most inner - }
(-6) - 4
= { apply most inner - }
(-10)
```

I think you've started seeing a pattern with `foldl`/`foldr` right about now: all parentheses are with the identity value either all left or all right - that's how I've been able to easily write out most code by hand (I had to use VSCode with the Bracket Pair Colorizer 2 addon with the `foldl (-) 0 [1,2,3,4]` code to check my parentheses :p).

If you've got any questions (especially when you don't understand a part), let me know down below!

## Alternative explanation

With either `foldl` or `foldr`, the text of the list gets manipulated until something executable is produced:

```haskell
foldl (-) 0 [1,2,3,4]
= { add identity value to the left of the list (because fold left) }
foldl (-) [0,1,2,3,4]
= { replace all commas with the function given }
foldl [0-1-2-3-4]
= { as last, apply the parentheses, grouped to the left (because fold left). The length of the grouped parentheses is the original length of the list - 1 }
(((0-1)-2)-3)-4

foldr (-) 0 [1,2,3,4]
= { add identity value to the right of the list (because fold right) }
foldr (-) [1,2,3,4,0]
= { replace all commas with the function given }
foldr [1-2-3-4-0]
= { as last, apply the parentheses, grouped to the right (because fold right). The length of the grouped parentheses is the original length of the list - 1 }
1-(2-(3-(4-0)))
```
