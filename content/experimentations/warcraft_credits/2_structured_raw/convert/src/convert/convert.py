import sys
import os

STATIC_SKIP_FIRST_LINE_SPLIT: bool = True


def process_text(text: str) -> str:
    lines = text.splitlines()
    result: list[str] = []
    skip_splitting = False

    i = 0
    while i < len(lines):
        current_line = lines[i]

        # Check if we've reached "TEAM SPECIAL THANKS"
        if "TEAM SPECIAL THANKS" in current_line:
            skip_splitting = True

        if (
            not skip_splitting
            and (not STATIC_SKIP_FIRST_LINE_SPLIT or i != 0)
            and "," in current_line
            and not current_line.strip().endswith(":")
        ):
            # Split on commas
            parts = current_line.split(",")

            if ":" in parts[0]:
                heading, first_item = parts[0].split(":", 1)
                parts[0] = first_item.strip()
                result.append(heading + ":")
                for part in parts:
                    if part.strip():
                        result.append("    " + part.strip())
            else:
                if len(parts) > 1:
                    result.append(parts[0].strip())
                    for part in parts[1:]:
                        if part.strip():
                            result.append("    " + part.strip())
                else:
                    result.append(current_line.strip())
        else:
            result.append(current_line)
            if (
                not skip_splitting
                and i < len(lines) - 1
                and current_line.strip()
                and "," in current_line
            ):
                if lines[i + 1].strip():
                    lines[i + 1] = "    " + lines[i + 1]
        i += 1

    # Post-process to merge Jr. lines
    i = len(result) - 1
    while i > 0:
        if result[i].strip() == "Jr." and result[i].startswith("    "):
            result[i-1] = result[i-1].rstrip() + ", Jr."
            result.pop(i)
        i -= 1

    return "\n".join(result)


def process_file(input_file: str) -> None:
    file_name, file_extension = os.path.splitext(input_file)
    output_file = f"{file_name}_formatted{file_extension}"

    with open(input_file, "r", encoding="utf-8") as file:
        text = file.read()

    formatted_text = process_text(text)

    with open(output_file, "w", encoding="utf-8") as file:
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
