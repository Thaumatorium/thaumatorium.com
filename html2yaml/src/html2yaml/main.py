from pathlib import Path
from bs4 import BeautifulSoup
import yaml
import sys


def main(input_file: Path, output_folder: Path) -> None:
    with input_file.open() as file:
        html_content = file.read()
    # Parse the HTML
    soup = BeautifulSoup(html_content, "html.parser")

    # Find the main body tag
    body = soup.find("body")

    # Initialize the main data dictionary and state variables
    data = {}
    current_department = None
    current_role = None

    # Iterate through the direct children of the body tag
    # Using find_all helps maintain the document order for relevant tags
    relevant_tags = body.find_all(["h1", "h2"], recursive=False)

    for tag in relevant_tags:
        tag_name = tag.name
        # Get text, replacing <br> with newline for splitting later, and strip whitespace
        text = tag.get_text(separator="\n", strip=True)

        # Handle H1 tags (Departments or Roles)
        if tag_name == "h1":
            if not text:  # Skip empty H1 tags
                continue

            # Check if it's an uppercase department title
            # Use `text.isupper()` and ensure it's not just symbols/numbers
            # A simple check: if text == text.upper() and any(c.isalpha() for c in text):
            # Or a more robust check just based on the rules given:
            if text == text.upper() and text.strip():
                current_department = text.strip()
                if current_department not in data:
                    data[current_department] = {}
                current_role = None  # Reset role when a new department starts
                # print(f"DEPARTMENT: {current_department}") # Debugging
            else:
                # It's a role title
                current_role = text.strip()
                if current_department:  # Ensure we have a department context
                    if current_role not in data[current_department]:
                        data[current_department][
                            current_role
                        ] = []  # Initialize list for names
                    # print(f"  ROLE: {current_role} under {current_department}") # Debugging
                else:
                    print(
                        f"Warning: Role '{current_role}' found without preceding department. Skipping."
                    )
                    current_role = None  # Cannot add role without department

        # Handle H2 tags (Lists of names)
        elif tag_name == "h2":
            if current_department and current_role:
                names = []
                # Split potentially multi-line text (from <br>) into lines
                lines = text.split("\n")
                for line in lines:
                    line_stripped = line.strip()
                    if not line_stripped:
                        continue
                    # Split each line by comma AND strip whitespace from each part
                    # Use regex for splitting by comma possibly surrounded by whitespace
                    # parts = [p.strip() for p in re.split(r'\s*,\s*', line_stripped) if p.strip()]
                    # Simpler split and strip:
                    parts = [p.strip() for p in line_stripped.split(",") if p.strip()]
                    names.extend(parts)

                if names:  # Only add if names were found
                    # print(f"    NAMES: {names} for {current_role}") # Debugging
                    if current_role in data[current_department]:
                        data[current_department][current_role].extend(names)
                    else:
                        print(
                            f"Warning: Role '{current_role}' key missing in department '{current_department}' when adding names. Creating."
                        )
                        data[current_department][current_role] = names

            elif (
                not text.strip() and tag.find("br") is None
            ):  # Handle self-closing <h2/>
                # print("Skipping empty H2 tag") # Debugging
                continue  # Skip truly empty H2 tags
            else:
                print(
                    f"Warning: Names list '{text}' found without preceding role/department context. Skipping."
                )

    # Convert the Python dictionary to a YAML string
    # sort_keys=False preserves insertion order (Python 3.7+ dicts are ordered)
    # allow_unicode=True ensures proper handling of special characters
    # default_flow_style=False makes it block style (more readable)
    yaml_output = yaml.dump(
        data, sort_keys=False, allow_unicode=True, default_flow_style=False, width=1000
    )  # Increased width to reduce wrapping

    # Optional: Save to a file
    output_file = f"{input_file.stem}.yaml"
    with open(output_folder / output_file, "w", encoding="utf-8") as f:
        f.write(yaml_output)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        output_folder = sys.argv[2]
    else:
        raise ValueError(
            "Please provide the input HTML file as a command line argument."
        )
    main(Path(input_file), Path(output_folder))
