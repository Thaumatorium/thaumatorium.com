import sys
import os
import re

def process_text(text):
    lines = text.splitlines()
    result = []

    i = 0
    while i < len(lines):
        current_line = lines[i]
        result.append(current_line)

        # If current line contains commas and isn't just a heading
        if ',' in current_line and not current_line.strip().endswith(':'):
            # Split the line by commas
            parts = re.split(r',\s*', current_line)

            # If this is a heading followed by names on the same line
            if ':' in parts[0]:
                heading, first_item = parts[0].split(':', 1)
                parts[0] = first_item.strip()

                # Add the heading back as a separate line
                result[-1] = heading + ':'

                # Add each item as a new indented line
                for part in parts:
                    if part.strip():  # Skip empty parts
                        result.append("    " + part.strip())
            else:
                # Replace the original line with the first part
                result[-1] = parts[0].strip()

                # Add remaining parts as new lines
                for part in parts[1:]:
                    if part.strip():  # Skip empty parts
                        result.append("    " + part.strip())

        # If current line is non-empty and there's a next line
        elif i < len(lines) - 1 and current_line.strip():
            # Only indent the next line if it's not empty
            if lines[i+1].strip():
                lines[i+1] = "    " + lines[i+1]

        i += 1

    return "\n".join(result)

def process_file(input_file):
    # Determine the output filename
    file_name, file_extension = os.path.splitext(input_file)
    output_file = f"{file_name}_formatted{file_extension}"

    # Read the input file
    with open(input_file, 'r', encoding='utf-8') as file:
        text = file.read()

    # Process the text
    formatted_text = process_text(text)

    # Write to the output file
    with open(output_file, 'w', encoding='utf-8') as file:
        file.write(formatted_text)

    print(f"Processed '{input_file}' and saved to '{output_file}'")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <filename>")
        sys.exit(1)

    input_file = sys.argv[1]
    if not os.path.exists(input_file):
        print(f"Error: File '{input_file}' not found")
        sys.exit(1)

    process_file(input_file)
