from textwrap import dedent
from pytest_mock import MockerFixture
from convert.convert import process_text, process_file


def test_process_text_executive_producer() -> None:
    input_text = dedent("""\
        Executive Producer
        Frank Pearce""")
    expected_output = dedent("""\
        Executive Producer
            Frank Pearce""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_first_line_not_split() -> None:
    input_text = dedent("""\
        Vice President, Battle.net
        Robert Bridenbecker""")
    expected_output = dedent("""\
        Vice President, Battle.net
            Robert Bridenbecker""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_heading_style() -> None:
    """
    Test the process_text function's handling of heading style formatting.
    Tests whether the function correctly processes text by identifying a heading line
    followed by a name, and applies proper indentation to the name while keeping
    the heading at the original indentation level.
    """

    input_text = dedent("""\
        Sr. Project Producer
        Phillip Hillenbrand, Jr.""")
    expected_output = dedent("""\
        Sr. Project Producer
            Phillip Hillenbrand, Jr.""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_vice_president() -> None:
    input_text = dedent("""\
        Vice President, Art & Cinematic Development
        Nick Carpenter""")
    expected_output = dedent("""\
        Vice President, Art & Cinematic Development
            Nick Carpenter""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_vice_president_with_trailing_newline() -> None:
    input_text = dedent("""\
        Vice President, Art & Cinematic Development
        Nick Carpenter""")
    expected_output = dedent("""\
        Vice President, Art & Cinematic Development
            Nick Carpenter""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_voice_over_cast() -> None:
    """
    Test for processing voice over cast section of the credits. Tests the
    conversion of a single line of comma-separated voice actors into an indented
    list format where each actor is on a new line.
    """
    input_text = dedent("""\
        Voice Over Cast
        Lauren Tom, Matthew Yang King, Jim Cummings, James Hong, Keone Young, Patrick Seitz, David Lodge, Laura Bailey, Jon Olson""")
    expected_output = dedent("""\
        Voice Over Cast
            Lauren Tom
            Matthew Yang King
            Jim Cummings
            James Hong
            Keone Young
            Patrick Seitz
            David Lodge
            Laura Bailey
            Jon Olson""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_monster_voice_effects() -> None:
    """
    This test ensures that if someone is a Junior, their title remains
    """
    input_text = dedent("""\
        Monster Voice Effects
        Dave Fouquette, Lani Minella, Debra Wilson, Isaac Singleton, Jr., Jon Olson, Fred Tatasciore""")
    expected_output = dedent("""\
        Monster Voice Effects
            Dave Fouquette
            Lani Minella
            Debra Wilson
            Isaac Singleton, Jr.
            Jon Olson
            Fred Tatasciore""")
    result = process_text(input_text)
    assert result == expected_output

def test_process_text_junior_not_split() -> None:
    """
    Test that `process_text` handles names with 'Jr.' suffix correctly. Tests
    that when a name contains 'Jr.' followed by a comma and another name, the
    'Jr.' is kept with the name and not split into a separate line.
    """

    input_text = dedent("""\
        SOME TITLE
        John Doe, Jr., Jane Doe""")
    expected_output = dedent("""\
        SOME TITLE
            John Doe, Jr.
            Jane Doe""")
    result = process_text(input_text)
    assert result == expected_output
