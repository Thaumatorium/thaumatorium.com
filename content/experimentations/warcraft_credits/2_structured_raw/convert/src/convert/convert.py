import sys
import os


def process_text(text: str) -> str:
    sections = text.split("\n\n")
    processed_sections = []
    for section in sections:
        lines = section.split("\n")
        if len(lines) > 1:
            if ", " in lines[1]:
                second_line_items = lines[1].split(", ")
                # Ensure 'Jr.' remains with the preceding name
                i = 0
                while i < len(second_line_items) - 1:
                    if second_line_items[i + 1].startswith("Jr."):
                        second_line_items[i] += ", " + second_line_items.pop(i + 1)
                    else:
                        i += 1
                lines[1] = "    " + "\n    ".join(second_line_items)
            else:
                for i in range(1, len(lines)):
                    lines[i] = "    " + lines[i]
        processed_sections.append("\n".join(lines))
    return "\n\n".join(processed_sections)


def process_file(input_file: str) -> None:
    with open(input_file, "r") as file:
        content = file.read()
    processed_content = process_text(content)
    with open(input_file, "w") as file:
        file.write(processed_content)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <filename>")
        sys.exit(1)
    input_file = sys.argv[1]
    if not os.path.exists(input_file):
        print(f"Error: File '{input_file}' not found")
        sys.exit(1)
    process_file(input_file)
