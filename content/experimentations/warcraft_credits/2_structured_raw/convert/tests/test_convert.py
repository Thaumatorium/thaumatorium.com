import textwrap
import pytest
from pytest_mock import MockerFixture
from convert.convert import process_text, process_file


def test_process_text_first_line_not_split() -> None:
    input_text = textwrap.dedent("""\
        Vice President, Battle.net
        Robert Bridenbecker""")
    expected_output = textwrap.dedent("""\
        Vice President, Battle.net
            Robert Bridenbecker""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_heading_style() -> None:
    input_text = textwrap.dedent("""\
        Sr. Project Producer
        Phillip Hillenbrand, Jr.""")
    expected_output = textwrap.dedent("""\
        Sr. Project Producer
            Phillip Hillenbrand, Jr.
        """)
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_vice_president() -> None:
    input_text = textwrap.dedent("""\
        Vice President, Art & Cinematic Development
        Nick Carpenter""")
    expected_output = textwrap.dedent("""\
        Vice President, Art & Cinematic Development
            Nick Carpenter""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_vice_president_with_trailing_newline() -> None:
    input_text = textwrap.dedent("""\
        Vice President, Art & Cinematic Development
        Nick Carpenter
        """)
    expected_output = textwrap.dedent("""\
        Vice President, Art & Cinematic Development
            Nick Carpenter""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_text_junior_not_split() -> None:
    input_text = textwrap.dedent("""\
        SOME TITLE
        John Doe, Jr., Friend""")
    expected_output = textwrap.dedent("""\
        SOME TITLE
            John Doe, Jr.
            Friend""")
    result = process_text(input_text)
    assert result == expected_output


def test_process_file(mocker: MockerFixture) -> None:
    sample_text = "First line, with commas\nAnother line"
    expected_text = """First line, with commas
Another line"""
    mock_open = mocker.mock_open(read_data=sample_text)
    mocker.patch("builtins.open", mock_open)
    mocker.patch("os.path.exists", return_value=True)

    process_file("dummy.txt")

    # builtins.open should be called twice: one for reading, one for writing.
    assert mock_open.call_count == 2

    handle = mock_open()
    # Check that write was called exactly once.
    assert handle.write.call_count == 1

    written_text = "".join(call.args[0] for call in handle.write.call_args_list)
    assert written_text == expected_text
