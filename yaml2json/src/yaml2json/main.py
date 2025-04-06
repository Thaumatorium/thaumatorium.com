import yaml
import re
import json
import os
import sys  # Import sys module
from typing import List, Dict, Tuple, Optional, Any, Set

# --- Global Data Structures ---
nodes: List[Dict[str, Any]] = []
edges: List[Dict[str, Any]] = []
created_node_ids: Set[str] = set()

# --- Helper Functions ---


def sanitize_id(name: str, prefix: str) -> str:
    """Creates a reasonably safe ID from a name."""
    if not name:
        return f"{prefix}_unknown_{len(created_node_ids)}"
    sanitized = re.sub(r"\s+", "_", str(name))
    sanitized = re.sub(r"[^a-zA-Z0-9_:-]", "", sanitized)
    sanitized = sanitized.strip("_:")
    return (
        f"{prefix}_{sanitized}"
        if sanitized
        else f"{prefix}_invalid_{len(created_node_ids)}"
    )


def add_node(
    node_id: str, label: str, name: str, properties: Optional[Dict[str, Any]] = None
) -> str:
    """Adds a node dictionary to the global list if it doesn't already exist."""
    if node_id not in created_node_ids:
        node = {"id": node_id, "label": label, "properties": {"name": name}}
        if properties:
            node["properties"].update(properties)
        nodes.append(node)
        created_node_ids.add(node_id)
    return node_id


def add_edge(
    source_id: str,
    target_id: str,
    label: str,
    properties: Optional[Dict[str, Any]] = None,
):
    """Adds an edge dictionary to the global list."""
    if not source_id or not target_id:
        print(
            f"Warning: Skipping edge creation due to missing node ID (source='{source_id}', target='{target_id}', label='{label}')"
        )
        return
    edge = {
        "source": source_id,
        "target": target_id,
        "label": label,
        "properties": properties if properties else {},
    }
    edges.append(edge)


def parse_name_and_detail(raw_string: str) -> Tuple[str, Optional[str]]:
    """
    Parses strings like "Role: Name" or "Name" into (name, detail).
    Handles potential quoting issues.
    Returns: (name_to_use, detail_if_found)
    """
    name_to_use = raw_string.strip()
    detail = None
    if ":" in name_to_use and len(name_to_use.split(":")[0]) < 35:
        parts = name_to_use.split(":", 1)
        potential_detail = parts[0].strip().strip("\"'")
        potential_name = parts[1].strip().strip("\"'")
        if len(potential_name.split()) <= 5 and potential_name:
            detail = potential_detail
            name_to_use = potential_name
    if not detail:
        name_to_use = name_to_use.strip("\"'")
    return name_to_use, detail


def is_likely_organization(name: str) -> bool:
    """Heuristic to determine if a name likely refers to an organization."""
    suffixes = [
        "Studio",
        "Studios",
        "Ltd.",
        "Inc",
        "SASU",
        "S.A.",
        "Ltd",
        "Company",
        "Preparation",
        "Entertainment",
        "Group",
        "Team",
        "Services",
    ]
    known_orgs = [
        "Proletariat",
        "Gimbal Zen",
        "Mooncolony",
        "Surfside 3D",
        "Keywords",
        "Anomaly",
        "ArtVostok",
        "DragonFly",
        "Synthesis",
        "Sound in Words",
        "Qloc S.A.",
        "PTS Group International Company Ltd.",
        "LOC3 Ltd",
        "Lionbridge International Unlimited Company",
        "Around the Word SASU",
        "Reiche & Drefs Partnerschaft von Übersetzern",
        "Logrus IT",
        "Dal Loc Mult. SL",
        "Latis Global Communications",
        "Pole To Win International",
        "擎天信使GTXS音樂製作有限公司",
        "Cowbay Entertainment",
        "EC Innovations (Shenyang), Inc",
        "President Translation Service (Shanghai) Co. Ltd",
    ]
    name_lower = name.lower()
    if any(name.endswith(suffix) for suffix in suffixes):
        return True
    if any(org.lower() in name_lower for org in known_orgs):
        return True
    return False


# --- Processing Functions ---


def process_organization(org_name: str, members: List[str], dept_id: str, game_id: str):
    """Handles nodes and edges for an organization and its members."""
    org_id = sanitize_id(org_name, "org")
    add_node(org_id, "Organization", org_name)
    add_edge(org_id, dept_id, "MENTIONED_IN_DEPT")
    add_edge(org_id, game_id, "CONTRIBUTED_TO")
    for member_entry in members:
        if isinstance(member_entry, str) and member_entry.strip():
            person_name, role_detail = parse_name_and_detail(member_entry)
            if not person_name:
                continue
            person_id = sanitize_id(person_name, "person")
            add_node(person_id, "Person", person_name)
            edge_props = {"role_detail": role_detail} if role_detail else {}
            add_edge(person_id, org_id, "MEMBER_OF", properties=edge_props)
            add_edge(person_id, game_id, "WORKED_ON")


def process_role(
    role_name: str, people: List[str], parent_id: str, parent_label: str, game_id: str
):
    """Handles nodes and edges for a role and the people holding it."""
    role_id = sanitize_id(role_name, "role")
    add_node(role_id, "Role", role_name)
    add_edge(role_id, parent_id, "BELONGS_TO")
    for person_entry in people:
        if isinstance(person_entry, str) and person_entry.strip():
            person_name, role_detail = parse_name_and_detail(person_entry)
            if not person_name:
                continue
            person_id = sanitize_id(person_name, "person")
            add_node(person_id, "Person", person_name)
            edge_props = {"role_detail": role_detail} if role_detail else {}
            add_edge(person_id, role_id, "HAS_ROLE", properties=edge_props)
            add_edge(person_id, game_id, "WORKED_ON")


def process_group(group_name: str, content: Dict[str, Any], dept_id: str, game_id: str):
    """Handles nodes and edges for a group containing sub-roles."""
    group_id = sanitize_id(group_name, "group")
    add_node(group_id, "Group", group_name)
    add_edge(group_id, dept_id, "PART_OF")
    for sub_role_name, sub_people in content.items():
        if isinstance(sub_people, list):
            process_role(sub_role_name, sub_people, group_id, "Group", game_id)
        else:
            print(
                f"Warning: Skipping unexpected content type under Group '{group_name}' -> '{sub_role_name}': {type(sub_people)}"
            )


def process_department_content(
    dept_id: str, role_or_group_name: str, content: Any, game_id: str
):
    """Determines how to process content under a department key."""
    if is_likely_organization(role_or_group_name) and isinstance(content, list):
        process_organization(role_or_group_name, content, dept_id, game_id)
    elif isinstance(content, list):
        if not content and role_or_group_name == "Blizzard Entertainment":
            org_id = sanitize_id(role_or_group_name, "org")
            add_node(org_id, "Organization", role_or_group_name)
            add_edge(org_id, dept_id, "RESPONSIBLE_FOR_DEPT")
            add_edge(org_id, game_id, "PRIMARY_DEVELOPER")
        elif content:
            process_role(role_or_group_name, content, dept_id, "Department", game_id)
    elif isinstance(content, dict):
        process_group(role_or_group_name, content, dept_id, game_id)
    else:
        print(
            f"Warning: Skipping unexpected content type for '{role_or_group_name}': {type(content)}"
        )


def process_credits_data(data: Dict[str, Any], game_name: str, game_id: str):
    """Processes the entire loaded YAML data structure to build the graph."""
    global nodes, edges, created_node_ids
    nodes = []
    edges = []
    created_node_ids = set()

    add_node(game_id, "Game", game_name)

    for dept_name, dept_content in data.items():
        if not isinstance(dept_content, dict):
            if dept_content is None or isinstance(dept_content, (str, int, float)):
                print(f"Info: Skipping simple value/empty department: {dept_name}")
            else:
                print(
                    f"Warning: Skipping non-dictionary department content for '{dept_name}': {type(dept_content)}"
                )
            continue

        dept_id = sanitize_id(dept_name, "dept")
        add_node(dept_id, "Department", dept_name)

        for role_or_group_name, content in dept_content.items():
            process_department_content(dept_id, role_or_group_name, content, game_id)


# --- File and Argument Handling ---


def load_yaml_data(filepath: str) -> Dict[str, Any]:
    """Loads and parses YAML data from a file."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            if data is None:
                print(
                    f"Warning: YAML file '{filepath}' is empty or contains only null."
                )
                return {}
            if not isinstance(data, dict):
                raise yaml.YAMLError(
                    f"YAML root element is not a dictionary (type: {type(data)})"
                )
            return data
    except FileNotFoundError:
        print(f"Error: Input file not found: {filepath}", file=sys.stderr)
        sys.exit(1)
    except yaml.YAMLError as exc:
        print(f"Error parsing YAML file '{filepath}': {exc}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(
            f"An unexpected error occurred reading '{filepath}': {e}", file=sys.stderr
        )
        sys.exit(1)


def save_graph_data(graph_data: Dict[str, List[Dict]], output_path: str):
    """Saves the graph data (nodes, edges) to a JSON file."""
    try:
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(graph_data, f, indent=2, ensure_ascii=False)
        print(f"Graph data successfully saved to: {output_path}")
    except IOError as e:
        print(f"Error writing output file '{output_path}': {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(
            f"An unexpected error occurred writing to '{output_path}': {e}",
            file=sys.stderr,
        )
        sys.exit(1)


# --- Main Execution ---

if __name__ == "__main__":
    # Basic argument check using sys.argv
    if len(sys.argv) != 3:
        print(
            f"Usage: python {sys.argv[0]} <input_yaml_filepath> <output_folder>",
            file=sys.stderr,
        )
        sys.exit(1)

    input_file = sys.argv[1]
    output_dir = sys.argv[2]

    # Validate input file existence early
    if not os.path.isfile(input_file):
        print(
            f"Error: Input file not found or is not a file: {input_file}",
            file=sys.stderr,
        )
        sys.exit(1)

    # Extract game name from filename
    base_name = os.path.basename(input_file)
    game_name_raw, _ = os.path.splitext(base_name)
    game_name = (
        game_name_raw.replace("_", " ").replace("-", " ").title()
    )  # Basic cleanup
    print(f"Processing game: '{game_name}' from file '{input_file}'")

    # Generate Game ID and Output Filename
    game_id = sanitize_id(game_name, "game")
    output_filename = f"{game_id}_graph.json"
    output_filepath = os.path.join(output_dir, output_filename)

    # Load data
    credits_yaml_data = load_yaml_data(input_file)

    # Process data
    if credits_yaml_data:
        process_credits_data(credits_yaml_data, game_name, game_id)

        # Prepare final structure
        final_graph_data = {"nodes": nodes, "edges": edges}

        # Save output
        save_graph_data(final_graph_data, output_filepath)
    else:
        print("No data processed due to loading issues or empty file.")
