---
title: "The Different Types of Functions in Functional Programming"
description: "Comprehensive explanations of various function types in functional programming"
publishDate: 2018-10-15T00:00:00+02:00
lastmod: 2024-07-24T20:21:00+02:00
layout: article
---

In functional programming, the term "type" can be somewhat overloaded, especially in languages like Haskell. However, in this context, we are referring to different kinds of functions and their behaviors. A parser, for example, is a function that accepts strings as input and returns some data structure as output, typically a parse tree or a set of indices representing where parsing stopped successfully.

## Types of Functions

### Pure

Takes an input, returns an output, with no side effects.

```haskell
f :: Int -> Int
f x = x
```

### Predicate

Takes an input and returns a `Bool`.

```haskell
f :: Int -> Bool
f x = x > 5
```

### Recursive

Like a pure function, but also calls itself at least once with a subset of the original input.

```haskell
length :: [a] -> Int
length (x:xs) = 1 + length xs
```

### Curried

"Partial Application" means that a function receives only a part of the input, which makes it return a _new_ function that still wants the rest of the input. Imperative languages like C or Python usually want all arguments at once.

```haskell
timesTwo :: Int -> Int
timesTwo = (2 *)
```

Example usage: as you can see, the `*` operator only has one input. It's been partially applied. When you look at the definition, you see that `timesTwo` expects at least one `Int`, which when applied, gets added at the end of the function:

```haskell
timesTwo 3
-- { apply timesTwo }
2 * 3
-- { apply * }
6
```

### Applicative

Can take a variable amount of inputs and return an output. Uses the `pure` function and the `<*>` operator.

`pure` lifts a function into a wrapped type, and `<*>` accepts a wrapped type and a variable, also wrapped.

### Monadic

Takes an input, returns an output, can have side effects, and uses either the bind `>>=` operator or `do` notation.

From: [Haskell Wiki: All About Monads](https://wiki.haskell.org/All_About_Monads)

```haskell
maternalGrandfather :: Sheep -> Maybe Sheep
maternalGrandfather s = (return s) >>= mother >>= father

-- Alternatively
mothersPaternalGrandfather :: Sheep -> Maybe Sheep
mothersPaternalGrandfather s = do m  <- mother s
                                  gf <- father m
                                  father gf
```

### Parser Combinator

Accepts several parsers as input and returns a new parser as output.

From: [Wikipedia: Parser Combinator](https://en.wikipedia.org/wiki/Parser_combinator)

A parser is a function accepting strings as input and returning some structure as output, typically a parse tree or a set of indices representing where parsing stopped successfully in the string.
