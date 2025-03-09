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


def test_process_text_multiple_sections() -> None:
    """
    Test processing multiple sections of credits with different formats.
    Verifies that each section maintains proper formatting and indentation.
    """
    input_text = dedent("""\
        Game Design
        Blizzard Entertainment

        Executive Producer
        Frank Pearce

        Game Director
        Tom Chilton""")
    expected_output = dedent("""\
        Game Design
            Blizzard Entertainment

        Executive Producer
            Frank Pearce

        Game Director
            Tom Chilton""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_multiple_producer_sections() -> None:
    """
    Test processing multiple producer sections with multiple names.
    Verifies correct formatting of titles and proper indentation of multiple names.
    """
    input_text = dedent("""\
        Lead/Senior Producers
        Ray Cobo, Rob Foote, Carlos Guerrero, John Hight, John Lagrave

        Producers
        Ernst ten Bosch, Jason Hutchins, Joseph Hsu, Scott Keenan, Thomas Pieracci, John Shin, Alex Tsang""")
    expected_output = dedent("""\
        Lead/Senior Producers
            Ray Cobo
            Rob Foote
            Carlos Guerrero
            John Hight
            John Lagrave

        Producers
            Ernst ten Bosch
            Jason Hutchins
            Joseph Hsu
            Scott Keenan
            Thomas Pieracci
            John Shin
            Alex Tsang""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_multiline_producer_sections() -> None:
    """
    Test processing multiple producer sections with multiple names.
    Verifies correct formatting of titles and proper indentation of multiple names
    when names are already on separate lines.
    """
    input_text = dedent("""\
        Lead/Senior Producers
        Ray Cobo
        Rob Foote
        Carlos Guerrero
        John Hight
        John Lagrave

        Producers
        Ernst ten Bosch
        Jason Hutchins
        Joseph Hsu
        Scott Keenan
        Thomas Pieracci
        John Shin
        Alex Tsang""")
    expected_output = dedent("""\
        Lead/Senior Producers
            Ray Cobo
            Rob Foote
            Carlos Guerrero
            John Hight
            John Lagrave

        Producers
            Ernst ten Bosch
            Jason Hutchins
            Joseph Hsu
            Scott Keenan
            Thomas Pieracci
            John Shin
            Alex Tsang""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_multiple_art_department_sections() -> None:
    """
    Test processing multiple art department sections with multiple names on separate lines.
    Verifies proper indentation and formatting is maintained across multiple sections
    with different titles and varying numbers of team members.
    """
    input_text = dedent("""\
        Lead/Senior Producers
        Ray Cobo
        Rob Foote
        Carlos Guerrero
        John Hight
        John Lagrave

        Producers
        Ernst ten Bosch
        Jason Hutchins
        Joseph Hsu
        Scott Keenan
        Thomas Pieracci
        John Shin
        Alex Tsang

        Animators
        John Butkus
        Carman Cheung
        Jeremy Collins
        Carlos Fins
        Mai Igarashi
        John Scharmen
        Jason Zirpolo

        Character Artists
        Tamara Bakhlycheva
        Danny Beck
        Christopher Chang
        Joe Keller
        Roman Kenney
        Ryan Metcalf
        Tyson Murphy
        Dusty Nolting
        Jon McConnell
        Danny Saint-Hilaire
        Robert Sevilla
        Thomas Yip

        Dungeon Sub-Leads
        Steve Crow
        Jimmy Lo""")
    expected_output = dedent("""\
        Lead/Senior Producers
            Ray Cobo
            Rob Foote
            Carlos Guerrero
            John Hight
            John Lagrave

        Producers
            Ernst ten Bosch
            Jason Hutchins
            Joseph Hsu
            Scott Keenan
            Thomas Pieracci
            John Shin
            Alex Tsang

        Animators
            John Butkus
            Carman Cheung
            Jeremy Collins
            Carlos Fins
            Mai Igarashi
            John Scharmen
            Jason Zirpolo

        Character Artists
            Tamara Bakhlycheva
            Danny Beck
            Christopher Chang
            Joe Keller
            Roman Kenney
            Ryan Metcalf
            Tyson Murphy
            Dusty Nolting
            Jon McConnell
            Danny Saint-Hilaire
            Robert Sevilla
            Thomas Yip

        Dungeon Sub-Leads
            Steve Crow
            Jimmy Lo""")
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
