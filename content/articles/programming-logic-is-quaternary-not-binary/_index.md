---
title: "Programming Logic Is Quaternary Not Binary"
publishDate: 2025-08-23T14:31:07+02:00
lastmod: 2025-08-23T14:31:07+02:00
draft: true
---
## Or, Tony Hoare did nothing wrong - in fact, he didn't go far enough

* [How to pronounce "Quaternary"?](https://en.wiktionary.org/wiki/quaternary) (I prefer the "Audio (General Australian)"
  version)

I've been programming since 2009, professionally since 2021, and I've written programs in Python (my current go-to due
to professional reasons), C (my first language - can highly recommend), C++, C#, Java, Haskell (my first FP language -
[highly recommend](https://learnyouahaskell.github.io/chapters.html)), Typescript (ew), Javascript (ew), PowerShell,
Bash, and have dipped my toes in Rust, Go, Elm, Lisp, Visual Basic (ew), Lua.

I'm telling you this to explain that I have a very broad knowledge of programming, with a deep one in Python - I won't
claim to be an expert in any other language, and even in Python there's plenty I've barely touched due to a lack of
necessity.

In all this time the only two languages that broke my brain out of existing paradigms were Haskell and SQL.

Haskell for its Functional Programming paradigm, clearly, but SQL I did not expect.

See, it's not so much SQL itself, but the theory behind it - Relational Algebra, Relational Calculus, and the whole idea
of the Relational Model, as invented by Edgar F. "The Coddfather" Codd in 1969 (†2003).

In 1990 The Coddfather released a book called "The Relational Model for Database Management: Version 2" (RM/V2 after
this), where he introduced the idea of "Four-Valued Logic" - that is, a logic system with four truth values, instead of
the typical two (True and False).

This idea initially broke my brain, because *computers are binary, right?* *So how does having four truth values make
sense?*

Well, through my experience I've noticed that we've been using quaternary logic all this time, without even realizing
it!

Take the previously mentioned Python, for example. Lets say I have a function that returns a boolean. This same function
could also return None, if it doesn't know the answer because returning True or False doesn't make sense. So now we have
three possible return values: True, False, and None. But what if the function fails to execute due to exceptional
sitation? Now we have a fourth possible return value: an exception. Yes, the mechanisms are different, but it's still a
value you as a programmer will have to handle.

Again, now we have four possible return values that can be returned from a single function:

* `True`
* `False`
* `None`
* `Exception` (any kind).

This is a perfect example of quaternary logic in action in a super common programming language.

So, how does this relate to SQL? Well, in [RM/V2](https://codeblab.com/wp-content/uploads/2009/12/rmdb-codd.pdf)
(Relational Model, version 2 - yes, Codd numbered his models like a programming language) Codd introduces `TRUE` (`t`),
`FALSE` (`f`), `MAYBE BUT APPLICABLE` (`a`), and `MAYBE BUT INAPPLICABLE` (`i`) - Everything is shouted, because all
language did so back in the 1960s. Anyway, `t` and `f` are named *"values"*, and `i` and `a` are named *"markers"*.

### A code example

See [example.py](./example.py) for a full example that you can run locally, but here's the relevant code snippet:

```python
def is_email_verified(user: User) -> bool | None:
    """Yes, this code is contrived, for the sake of example, such that beginners can follow the logic as well."""
    if user.verified is True:
        return True  # TRUE
    if user.verified is False:
        return False  # FALSE
    if user.verified is None and user.email is not None:
        return None  # MAYBE BUT APPLICABLE
    # MAYBE BUT INAPPLICABLE
    raise ValueError("Predicate inapplicable: no email provided")
```

You may argue that you'd never write code like this, and I'd agree - it's a little messy, but you can't tell me that
you've never seen code like this in production.

My frustration is that the `bool | None` doesn't properly expresses the fourth possible return value.

Luckily, Haskell and Rust already have a solution for this - Monadic types! I'm not going to explain monads in detail,
but think of them as a coloured box that holds a value, and the colour of the box will tell you something about the type
of content it holds - for example, if it's a success or a failure, regardless of whether that value is `t`, `f`, `a`, or
`i`.

Haskell and Rust have this built-in, but using the `returns` library in Python, we can express this idea like so:

Again, see [monadic_example.py](./monadic_example.py) for a full example that you can run locally, but here's the
relevant code snippet:

```python
def is_email_verified(user: User) -> Result[Maybe[bool], Exception]:
    """Yes, this code is contrived, for the sake of example, such that beginners can follow the logic as well."""
    if user.verified is True:
        return Success(Some(True))  # TRUE
    if user.verified is False:
        return Success(Some(False))  # FALSE
    if user.verified is None and user.email is not None:
        return Success(Nothing)  # MAYBE BUT APPLICABLE
    return Failure(
        ValueError("Predicate inapplicable: no email provided")
    )  # MAYBE BUT INAPPLICABLE

# How to use is_email_verified:
users = [  # 4 users with different verification states
    User("alice", "alice@example.com", True),
    User("bob", "bob@example.com", False),
    User("carol", "carol@example.com", None),
    User("dave", None, None),
]
for user in users:
    # you use monads always with the `match` statement, to make life easier.
    match is_email_verified(user):
        case Success(Some(True)):
            print(f"{user.username} is verified")
        case Success(Some(False)):
            print(f"{user.username} is NOT verified")
        case Success(Nothing):
            print(f"{user.username} has unknown verification status")
        case Failure(error):
            print(
                f"Could not determine {user.username}'s verification status: {error}"
            )
```

So, long story short - programming logic is quaternary, not binary. Embrace it, if you can, and use it to your
advantage.
