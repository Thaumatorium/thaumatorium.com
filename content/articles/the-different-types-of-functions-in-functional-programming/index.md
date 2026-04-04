---
title: "Function Kinds and Function Patterns in Functional Programming"
description: "A practical overview of function shapes, abstractions and common patterns in functional programming"
publishDate: 2018-10-15T00:00:00+02:00
lastmod: 2026-03-07T20:41:00+01:00
layout: article
---

In functional programming, the term "kind" can be somewhat overloaded, especially in languages like Haskell. However, in
this context, we are referring to different shapes of functions and their behaviors. Some of these are truly different
kinds of functions, while others are simply common patterns or abstractions that you will quickly run into when learning
FP.

## Side Effects

Before talking about the different kinds of functions, it helps to understand what a _side effect_ is.

A side effect is anything a function does besides calculating and returning a result. In other words: if a function
affects or depends on something outside its explicit input and output, that's usually a side effect.

You can roughly divide side effects like this:

```text
Side effects
├── I/O
│   ├── printing to the console
│   ├── reading user input
│   ├── reading/writing files
│   └── network or database access
├── Mutation
│   ├── changing a variable
│   ├── mutating an object or list
│   └── changing global/shared state
├── Environment inspection
│   ├── reading the current time
│   ├── generating randomness
│   └── reading environment variables
└── Control effects
    ├── throwing exceptions
    ├── aborting early
    └── other non-local control flow
```

Side effects come in several forms. Mutating state, reading the current time, generating random values, and interacting
with the outside world are all examples.

This matters because a pure function has no side effects: it only depends on its input, and only produces an output.

## Types of Functions

### Basic Function Shapes

#### Pure

Takes an input, returns an output, and has no side effects. This also means that the same input should always produce
the same output. This idea is closely related to _referential transparency_: if an expression is pure, you can replace
it with its result without changing the behavior of the program.

```haskell
f :: Int -> Int
f x = x
```

#### Predicate

Takes an input and returns a `Bool`.

```haskell
f :: Int -> Bool
f x = x > 5
```

#### Recursive

Like a pure function, but also calls itself at least once with a subset of the original input.

```haskell
length :: [a] -> Int
length (x:xs) = 1 + length xs
```

#### Curried

"Partial Application" means that a function receives only a part of the input, which makes it return a _new_ function
that still wants the rest of the input. Imperative languages like C or Python usually want all arguments at once. In
other words: partial application means "give a function some of its arguments now, and get back a new function that
waits for the remaining arguments."

```haskell
timesTwo :: Int -> Int
timesTwo = (2 *)
```

Example usage: as you can see, the `*` operator only has one input. It's been partially applied. When you look at the
definition, you see that `timesTwo` expects at least one `Int`, which when applied, gets added at the end of the
function:

```haskell
timesTwo 3
-- { apply timesTwo }
2 * 3
-- { apply * }
6
```

### Functions You Will Also Run Into

#### Higher-Order

Higher-order functions either take one or more functions as input, return a function as output, or both.

```haskell
map :: (a -> b) -> [a] -> [b]
map f xs = ...
```

Common examples are `map`, `filter`, and `foldr`.

#### Lambda / Anonymous

Anonymous functions are functions without a name. They are often used when a function is only needed once.

```haskell
\x -> x + 1
```

For example:

```haskell
map (\x -> x + 1) [1,2,3]
```

#### Polymorphic

Polymorphic functions work for many different types instead of just one specific type.

```haskell
id :: a -> a
id x = x
```

This function works for `Int`, `String`, `Bool`, `[Int]`, `[String]`, and many other types. So "many types" does not
mean literally every imaginable type, but rather every type that matches the function's type constraints. In the case of
`id :: a -> a`, there are no extra constraints, so it works for almost anything.

#### Partial

A partial function is not defined for every possible input.

```haskell
head :: [a] -> a
```

This works for non-empty lists, but fails on an empty list.

#### Total

A total function is defined for every possible input of its type.

```haskell
safeHead :: [a] -> Maybe a
safeHead []    = Nothing
safeHead (x:_) = Just x
```

Unlike `head`, this version always returns a valid result.

#### Composition

Function composition means combining smaller functions into a new function.

```haskell
f :: Int -> Int
f = negate . (+ 1)
```

This first adds `1`, and then negates the result.

#### Fold

A fold reduces a whole list or structure into a single value by repeatedly combining smaller pieces.

```haskell
sum' :: [Int] -> Int
sum' = foldr (+) 0
```

Folds are extremely common in FP because they capture a very general recursion pattern.

### FP Abstractions and Patterns

#### Applicative

Can take a variable amount of inputs and return an output. Uses the `pure` function and the `<*>` operator.

`pure` lifts a function into a wrapped type, and `<*>` accepts a wrapped type and a variable, also wrapped. A "wrapped
type" means a value inside some context, such as `Maybe Int`, `[Int]`, or `IO Int`. Here, "context" means extra meaning
around the value: `Maybe Int` means "an Int that may be missing", `[Int]` means "many Int values", and `IO Int` means
"an Int produced by interacting with the outside world".

#### Monadic

Takes an input, returns an output, can have side effects, and uses either the bind `>>=` operator or `do` notation.

Just like with applicatives, a monad works with values inside a context. Here, "context" again means that the value
comes with some extra meaning or computational setting around it, such as optionality (`Maybe`), multiple results
(`[]`), or I/O (`IO`). The bind operator `>>=` takes a wrapped value, passes its inner value to the next function, and
keeps the whole computation inside that same context.

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

#### Parser Combinator

Accepts several parsers as input and returns a new parser as output.

From: [Wikipedia: Parser Combinator](https://en.wikipedia.org/wiki/Parser_combinator)

A parser is a function that reads input text and tries to turn it into structured data. That output is often a parse
tree, a syntax tree, or simply a result plus the remaining unparsed input.

For example:

A number parser accepts text that should represent a number and turns it into an actual numeric value.

```haskell
parseNumber :: String -> Either String Int
parseNumber s =
  if all isDigit s
  then Right (read s)
  else Left "not a number"

parseNumber "123"
-- Right 123
```

A CSV parser accepts comma-separated text and turns it into separate fields.

```haskell
parseCsvLine :: String -> Either String [String]
parseCsvLine s = Right (splitOn "," s)

parseCsvLine "red,green,blue"
-- Right ["red", "green", "blue"]
```

A JSON parser accepts JSON text and turns it into a structured JSON value.

```haskell
parseJson :: String -> Either String JsonValue
parseJson "{\"name\":\"David\"}" =
  Right (Object [("name", JsonString "David")])
parseJson _ =
  Left "invalid json"

parseJson "{\"name\":\"David\"}"
-- Right (Object ...)
```
