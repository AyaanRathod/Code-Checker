#!/usr/bin/env python3
"""
generate.py — Test submission generator for the Code-Checker academic integrity system.

Generates a .zip of .zips representing a realistic set of Java student submissions
for a Library Book Management System assignment. Submissions are calibrated across
four similarity tiers so every risk level is represented in the output.

  Group A  ~85-100%  High-risk pairs    (copy-paste with light renaming)
  Group B  ~50-65%   Medium-risk pairs  (partial copy, structural similarity)
  Group C  ~25-40%   Low-risk pairs     (same problem, different approach)
  Group D  ~5-15%    Minimal            (genuinely independent solutions)

Usage:
    python generate.py                      # 20 students → test_submissions.zip
    python generate.py -n 50               # 50 students
    python generate.py -n 40 -o /tmp/out.zip
    python generate.py -n 60 --seed 42
"""

import io
import os
import random
import re
import zipfile
from typing import Dict, List, Tuple

# =============================================================================
# DISTRIBUTION
# =============================================================================

MIN_TOTAL = 20
MIN_PCT = 0.05  # each group gets at least 5% of total


def compute_distribution(n: int, rng: random.Random) -> Dict[str, int]:
    n = max(n, MIN_TOTAL)
    floor = max(1, int(n * MIN_PCT))
    counts = {"A": floor, "B": floor, "C": floor, "D": floor}
    remaining = n - sum(counts.values())
    # Distribute remaining randomly across groups
    groups = ["A", "B", "C", "D"]
    for _ in range(remaining):
        counts[rng.choice(groups)] += 1
    return counts


# =============================================================================
# MUTATION HELPERS
# =============================================================================

def rename(code: str, mapping: Dict[str, str]) -> str:
    """Whole-word identifier replacement using regex boundaries."""
    for old, new in mapping.items():
        code = re.sub(r"\b" + re.escape(old) + r"\b", new, code)
    return code


def swap_println(code: str, swaps: List[Tuple[str, str]]) -> str:
    """Replace specific print string literals."""
    for old, new in swaps:
        code = code.replace(old, new, 1)
    return code


def inject_blank_lines(code: str, rng: random.Random) -> str:
    """Randomly insert/remove blank lines between methods — cosmetic only."""
    lines = code.splitlines()
    result = []
    for line in lines:
        result.append(line)
        if line.strip() == "" and rng.random() < 0.3:
            continue  # randomly drop some blank lines
    return "\n".join(result)


# =============================================================================
# GROUP A  —  3-file linked-list solution, light mutations
#
# Base similarity when running A-to-A comparisons: ~85-100%
# Mutation strategy: rename 2-5 identifiers per variant, keep structure intact.
# =============================================================================

_A_BOOK_NODE = """\
public class BookNode {{
    {title_t} title;
    {author_t} author;
    int {year_v};
    BookNode {next_v};

    public BookNode({title_t} title, {author_t} author, int {year_v}) {{
        this.title = title;
        this.author = author;
        this.{year_v} = {year_v};
        this.{next_v} = null;
    }}

    @Override
    public String toString() {{
        return "\\"" + title + "\\" by " + author + " (" + {year_v} + ")";
    }}
}}
"""

_A_BOOK_LIST = """\
import java.util.ArrayList;
import java.util.Comparator;

public class BookList {{
    private BookNode {head_v};
    private int {size_v};

    public BookList() {{
        {head_v} = null;
        {size_v} = 0;
    }}

    public void addBook(String title, String author, int {year_v}) {{
        BookNode {newnode_v} = new BookNode(title, author, {year_v});
        if ({head_v} == null) {{
            {head_v} = {newnode_v};
        }} else {{
            BookNode {cur_v} = {head_v};
            while ({cur_v}.{next_v} != null) {{
                {cur_v} = {cur_v}.{next_v};
            }}
            {cur_v}.{next_v} = {newnode_v};
        }}
        {size_v}++;
        System.out.println("Added: " + {newnode_v});
    }}

    public boolean removeBook(String title) {{
        if ({head_v} == null) return false;
        if ({head_v}.title.equalsIgnoreCase(title)) {{
            {head_v} = {head_v}.{next_v};
            {size_v}--;
            return true;
        }}
        BookNode {cur_v} = {head_v};
        while ({cur_v}.{next_v} != null) {{
            if ({cur_v}.{next_v}.title.equalsIgnoreCase(title)) {{
                {cur_v}.{next_v} = {cur_v}.{next_v}.{next_v};
                {size_v}--;
                return true;
            }}
            {cur_v} = {cur_v}.{next_v};
        }}
        return false;
    }}

    public ArrayList<BookNode> searchByAuthor(String author) {{
        ArrayList<BookNode> {results_v} = new ArrayList<>();
        BookNode {cur_v} = {head_v};
        while ({cur_v} != null) {{
            if ({cur_v}.author.equalsIgnoreCase(author)) {{
                {results_v}.add({cur_v});
            }}
            {cur_v} = {cur_v}.{next_v};
        }}
        return {results_v};
    }}

    public BookNode searchByTitle(String title) {{
        BookNode {cur_v} = {head_v};
        while ({cur_v} != null) {{
            if ({cur_v}.title.equalsIgnoreCase(title)) {{
                return {cur_v};
            }}
            {cur_v} = {cur_v}.{next_v};
        }}
        return null;
    }}

    public void displayAll() {{
        if ({head_v} == null) {{
            System.out.println("{empty_msg}");
            return;
        }}
        ArrayList<BookNode> {books_v} = new ArrayList<>();
        BookNode {cur_v} = {head_v};
        while ({cur_v} != null) {{
            {books_v}.add({cur_v});
            {cur_v} = {cur_v}.{next_v};
        }}
        {books_v}.sort(Comparator.comparing(b -> b.title.toLowerCase()));
        System.out.println("\\n========== Library Catalogue ==========");
        int idx = 1;
        for (BookNode b : {books_v}) {{
            System.out.println(idx + ". " + b);
            idx++;
        }}
        System.out.println("Total: " + {size_v} + " book(s)");
        System.out.println("========================================");
    }}

    public int getSize() {{ return {size_v}; }}

    public boolean isEmpty() {{ return {size_v} == 0; }}
}}
"""

_A_MAIN = """\
import java.util.ArrayList;
import java.util.Scanner;

public class Main {{
    private static BookList {lib_v} = new BookList();
    private static Scanner {scan_v} = new Scanner(System.in);

    public static void main(String[] args) {{
        System.out.println("Welcome to the Library Management System");
        System.out.println("=========================================");
        int {choice_v} = -1;
        while ({choice_v} != 0) {{
            printMenu();
            System.out.print("Your choice: ");
            try {{
                {choice_v} = Integer.parseInt({scan_v}.nextLine().trim());
            }} catch (NumberFormatException e) {{
                System.out.println("Please enter a valid number.");
                {choice_v} = -1;
                continue;
            }}
            handleChoice({choice_v});
        }}
        {scan_v}.close();
        System.out.println("Thank you for using the Library System.");
    }}

    private static void printMenu() {{
        System.out.println("\\n--- MENU ---");
        System.out.println("1. Add a book");
        System.out.println("2. Remove a book");
        System.out.println("3. Search by author");
        System.out.println("4. Search by title");
        System.out.println("5. Display all books");
        System.out.println("6. Book count");
        System.out.println("0. Exit");
    }}

    private static void handleChoice(int {choice_v}) {{
        switch ({choice_v}) {{
            case 1:
                System.out.print("Title: ");
                String title = {scan_v}.nextLine();
                System.out.print("Author: ");
                String author = {scan_v}.nextLine();
                System.out.print("Year published: ");
                int {year_v} = 0;
                try {{
                    {year_v} = Integer.parseInt({scan_v}.nextLine().trim());
                }} catch (NumberFormatException e) {{
                    System.out.println("Invalid year, defaulting to 0.");
                }}
                {lib_v}.addBook(title, author, {year_v});
                break;
            case 2:
                System.out.print("Enter the title to remove: ");
                String removeTitle = {scan_v}.nextLine();
                if ({lib_v}.removeBook(removeTitle)) {{
                    System.out.println("{removed_msg}");
                }} else {{
                    System.out.println("{notfound_msg}");
                }}
                break;
            case 3:
                System.out.print("Enter author name: ");
                String authorName = {scan_v}.nextLine();
                ArrayList<BookNode> byAuthor = {lib_v}.searchByAuthor(authorName);
                if (byAuthor.isEmpty()) {{
                    System.out.println("No books found by \\"" + authorName + "\\".");
                }} else {{
                    System.out.println("Found " + byAuthor.size() + " book(s):");
                    for (BookNode b : byAuthor) System.out.println("  - " + b);
                }}
                break;
            case 4:
                System.out.print("Enter book title: ");
                String searchTitle = {scan_v}.nextLine();
                BookNode found = {lib_v}.searchByTitle(searchTitle);
                System.out.println(found != null ? "Found: " + found : "No book with that title.");
                break;
            case 5:
                {lib_v}.displayAll();
                break;
            case 6:
                System.out.println("Total books in library: " + {lib_v}.getSize());
                break;
            case 0:
                break;
            default:
                System.out.println("Invalid option. Please try again.");
        }}
    }}
}}
"""

# Mutation parameter sets for Group A — each set slightly shifts identifiers
_A_PARAM_POOL = [
    dict(title_t="String", author_t="String", year_v="year",   next_v="next",   head_v="head",  size_v="size",   newnode_v="newNode",  cur_v="current", results_v="results", books_v="books",  lib_v="library",  scan_v="scanner", choice_v="choice", removed_msg="Book removed successfully.", notfound_msg="Book not found in library.", empty_msg="The library is empty."),
    dict(title_t="String", author_t="String", year_v="year",   next_v="next",   head_v="first", size_v="count",  newnode_v="newBook",  cur_v="temp",    results_v="found",   books_v="items",  lib_v="library",  scan_v="scanner", choice_v="choice", removed_msg="Book removed successfully.", notfound_msg="Book not found in library.", empty_msg="The library is empty."),
    dict(title_t="String", author_t="String", year_v="year",   next_v="link",   head_v="start", size_v="length", newnode_v="node",     cur_v="ptr",     results_v="matches", books_v="list",   lib_v="library",  scan_v="sc",      choice_v="option", removed_msg="Book removed successfully.", notfound_msg="Book not found in library.", empty_msg="The library is empty."),
    dict(title_t="String", author_t="String", year_v="yr",     next_v="next",   head_v="head",  size_v="total",  newnode_v="entry",    cur_v="node",    results_v="output",  books_v="sorted", lib_v="catalog",  scan_v="reader",  choice_v="input",  removed_msg="Removed successfully.",      notfound_msg="Title not found.",           empty_msg="No books available."),
    dict(title_t="String", author_t="String", year_v="year",   next_v="next",   head_v="top",   size_v="num",    newnode_v="newItem",  cur_v="cursor",  results_v="results", books_v="allBooks",lib_v="library", scan_v="scanner", choice_v="choice", removed_msg="Book has been removed.",     notfound_msg="Book was not found.",        empty_msg="Library is currently empty."),
    dict(title_t="String", author_t="String", year_v="pubYear",next_v="next",   head_v="head",  size_v="size",   newnode_v="newNode",  cur_v="current", results_v="results", books_v="books",  lib_v="myLibrary",scan_v="scanner", choice_v="choice", removed_msg="Book removed successfully.", notfound_msg="Book not found in library.", empty_msg="The library is empty."),
    dict(title_t="String", author_t="String", year_v="year",   next_v="pointer",head_v="front", size_v="count",  newnode_v="newNode",  cur_v="iter",    results_v="found",   books_v="bookArr",lib_v="library",  scan_v="scanner", choice_v="sel",    removed_msg="Deleted from library.",      notfound_msg="No such book found.",        empty_msg="No books in the library."),
    dict(title_t="String", author_t="String", year_v="year",   next_v="next",   head_v="head",  size_v="size",   newnode_v="newNode",  cur_v="tmp",     results_v="hits",    books_v="books",  lib_v="lib",      scan_v="in",      choice_v="cmd",    removed_msg="Book removed successfully.", notfound_msg="Book not found in library.", empty_msg="Empty library."),
]


def build_group_a(variant_idx: int, rng: random.Random) -> Dict[str, str]:
    params = _A_PARAM_POOL[variant_idx % len(_A_PARAM_POOL)]
    node_code = _A_BOOK_NODE.format(**params)
    list_code = _A_BOOK_LIST.format(**params)
    main_code = _A_MAIN.format(**params)
    if variant_idx >= len(_A_PARAM_POOL):
        # Extra variation: minor print swap for overflow variants
        main_code = main_code.replace("Welcome to the Library", f"Library Management System v{variant_idx}", 1)
    return {
        "BookNode.java": node_code,
        "BookList.java": list_code,
        "Main.java":     main_code,
    }


# =============================================================================
# GROUP B  —  2-file partial derivation, medium mutations (~50-65% vs Group A)
#
# Same linked-list algorithm, but Node is an inner class, method names differ,
# output formatting differs. Students who copied the skeleton but rewrote parts.
# =============================================================================

_B_LIBRARY = """\
import java.util.ArrayList;
import java.util.Comparator;

public class {cls_v} {{

    private class {node_cls} {{
        String title;
        String author;
        int {year_v};
        {node_cls} {next_v};

        {node_cls}(String title, String author, int {year_v}) {{
            this.title = title;
            this.author = author;
            this.{year_v} = {year_v};
            this.{next_v} = null;
        }}

        public String toString() {{
            return title + " - " + author + " [" + {year_v} + "]";
        }}
    }}

    private {node_cls} {head_v};
    private int {count_v};

    public {cls_v}() {{
        {head_v} = null;
        {count_v} = 0;
    }}

    public void {add_m}(String title, String author, int {year_v}) {{
        {node_cls} {newnode_v} = new {node_cls}(title, author, {year_v});
        if ({head_v} == null) {{
            {head_v} = {newnode_v};
        }} else {{
            {node_cls} {cur_v} = {head_v};
            while ({cur_v}.{next_v} != null) {{
                {cur_v} = {cur_v}.{next_v};
            }}
            {cur_v}.{next_v} = {newnode_v};
        }}
        {count_v}++;
        System.out.println("Stored: " + {newnode_v});
    }}

    public boolean {del_m}(String title) {{
        if ({head_v} == null) return false;
        if ({head_v}.title.equalsIgnoreCase(title)) {{
            {head_v} = {head_v}.{next_v};
            {count_v}--;
            return true;
        }}
        {node_cls} {cur_v} = {head_v};
        while ({cur_v}.{next_v} != null) {{
            if ({cur_v}.{next_v}.title.equalsIgnoreCase(title)) {{
                {cur_v}.{next_v} = {cur_v}.{next_v}.{next_v};
                {count_v}--;
                return true;
            }}
            {cur_v} = {cur_v}.{next_v};
        }}
        return false;
    }}

    public ArrayList<String> {find_m}(String author) {{
        ArrayList<String> {results_v} = new ArrayList<>();
        {node_cls} {cur_v} = {head_v};
        while ({cur_v} != null) {{
            if ({cur_v}.author.equalsIgnoreCase(author)) {{
                {results_v}.add({cur_v}.toString());
            }}
            {cur_v} = {cur_v}.{next_v};
        }}
        return {results_v};
    }}

    public void {print_m}() {{
        if ({count_v} == 0) {{
            System.out.println("Collection is empty.");
            return;
        }}
        ArrayList<{node_cls}> {list_v} = new ArrayList<>();
        {node_cls} {cur_v} = {head_v};
        while ({cur_v} != null) {{
            {list_v}.add({cur_v});
            {cur_v} = {cur_v}.{next_v};
        }}
        {list_v}.sort(Comparator.comparing(n -> n.title.toLowerCase()));
        System.out.println("\\n----- Books in Library -----");
        for (int i = 0; i < {list_v}.size(); i++) {{
            System.out.println((i + 1) + ". " + {list_v}.get(i));
        }}
        System.out.println("----------------------------");
    }}

    public int {count_m}() {{ return {count_v}; }}
}}
"""

_B_MAIN = """\
import java.util.ArrayList;
import java.util.Scanner;

public class Main {{
    public static void main(String[] args) {{
        {cls_v} {lib_v} = new {cls_v}();
        Scanner {scan_v} = new Scanner(System.in);
        boolean running = true;

        System.out.println("{header_msg}");

        while (running) {{
            System.out.println("\\n1. Add Book");
            System.out.println("2. Delete Book");
            System.out.println("3. Find by Author");
            System.out.println("4. Show All Books");
            System.out.println("5. Count Books");
            System.out.println("0. Quit");
            System.out.print(">> ");

            String line = {scan_v}.nextLine().trim();
            int option;
            try {{
                option = Integer.parseInt(line);
            }} catch (NumberFormatException e) {{
                System.out.println("Invalid input.");
                continue;
            }}

            switch (option) {{
                case 1:
                    System.out.print("Title: ");
                    String title = {scan_v}.nextLine();
                    System.out.print("Author: ");
                    String author = {scan_v}.nextLine();
                    System.out.print("Year: ");
                    int {year_v} = 0;
                    try {{ {year_v} = Integer.parseInt({scan_v}.nextLine().trim()); }}
                    catch (NumberFormatException ex) {{ System.out.println("Invalid year."); }}
                    {lib_v}.{add_m}(title, author, {year_v});
                    break;
                case 2:
                    System.out.print("Title to delete: ");
                    String del = {scan_v}.nextLine();
                    System.out.println({lib_v}.{del_m}(del) ? "Deleted." : "Not found.");
                    break;
                case 3:
                    System.out.print("Author name: ");
                    ArrayList<String> hits = {lib_v}.{find_m}({scan_v}.nextLine());
                    if (hits.isEmpty()) System.out.println("No results for that author.");
                    else hits.forEach(System.out::println);
                    break;
                case 4:
                    {lib_v}.{print_m}();
                    break;
                case 5:
                    System.out.println("Books in library: " + {lib_v}.{count_m}());
                    break;
                case 0:
                    running = false;
                    System.out.println("Goodbye!");
                    break;
                default:
                    System.out.println("Unknown option.");
            }}
        }}
        {scan_v}.close();
    }}
}}
"""

_B_PARAM_POOL = [
    dict(cls_v="Library",       node_cls="Node",     year_v="year",   next_v="next",    head_v="head",  count_v="count",  newnode_v="newNode", cur_v="current", results_v="results", list_v="list", add_m="addBook",    del_m="deleteBook",  find_m="findByAuthor", print_m="printBooks",   count_m="getCount",   scan_v="scanner", lib_v="library",  header_msg="Library System"),
    dict(cls_v="BookCollection", node_cls="BookNode", year_v="yr",     next_v="next",    head_v="head",  count_v="size",   newnode_v="entry",   cur_v="temp",    results_v="found",   list_v="sorted",add_m="insert",    del_m="remove",      find_m="getByAuthor",  print_m="display",      count_m="size",       scan_v="sc",      lib_v="col",      header_msg="Book Collection Manager"),
    dict(cls_v="LibraryStore",   node_cls="Record",   year_v="year",   next_v="link",    head_v="start", count_v="total",  newnode_v="rec",     cur_v="ptr",     results_v="matches", list_v="items", add_m="addRecord",  del_m="deleteRecord",find_m="lookupAuthor", print_m="listAll",      count_m="getTotal",   scan_v="reader",  lib_v="store",    header_msg="Library Store"),
    dict(cls_v="Catalogue",      node_cls="Entry",    year_v="pubYear",next_v="pointer", head_v="front", count_v="num",    newnode_v="newEntry",cur_v="iter",    results_v="output",  list_v="arr",   add_m="addEntry",   del_m="removeEntry", find_m="searchAuthor", print_m="showAll",      count_m="entryCount", scan_v="input",   lib_v="cat",      header_msg="Catalogue System"),
    dict(cls_v="Library",        node_cls="Node",     year_v="year",   next_v="next",    head_v="head",  count_v="count",  newnode_v="n",       cur_v="c",       results_v="res",     list_v="l",     add_m="add",        del_m="delete",      find_m="findAuthor",   print_m="print",        count_m="count",      scan_v="scanner", lib_v="lib",      header_msg="My Library"),
]


def build_group_b(variant_idx: int, rng: random.Random) -> Dict[str, str]:
    params = _B_PARAM_POOL[variant_idx % len(_B_PARAM_POOL)]
    lib_code  = _B_LIBRARY.format(**params)
    main_code = _B_MAIN.format(**params)
    cls = params["cls_v"]
    return {
        f"{cls}.java": lib_code,
        "Main.java":   main_code,
    }


# =============================================================================
# GROUP C  —  1-2 file ArrayList-based solution (~25-40% vs Group A)
#
# Same assignment, different data structure entirely. Common patterns like
# Scanner loops and sorting remain but linked-list traversal is gone.
# =============================================================================

_C_SINGLE = """\
import java.util.ArrayList;
import java.util.Collections;
import java.util.Scanner;

public class {cls_v} {{

    static ArrayList<String[]> {books_v} = new ArrayList<>();
    static final int {T} = 0;
    static final int {A} = 1;
    static final int {Y} = 2;

    public static void main(String[] args) {{
        Scanner {sc_v} = new Scanner(System.in);
        int {choice_v};

        System.out.println("{header}");

        while (true) {{
            System.out.println("\\n[1] Add  [2] Remove  [3] Author Search  [4] List  [5] Count  [0] Exit");
            System.out.print("{prompt}");

            try {{
                {choice_v} = Integer.parseInt({sc_v}.nextLine().trim());
            }} catch (NumberFormatException e) {{
                System.out.println("Enter a valid number.");
                continue;
            }}

            if ({choice_v} == 0) break;

            if ({choice_v} == 1) {{
                System.out.print("Title: ");
                String t = {sc_v}.nextLine();
                System.out.print("Author: ");
                String a = {sc_v}.nextLine();
                System.out.print("Year: ");
                String y = {sc_v}.nextLine();
                {books_v}.add(new String[]{{t, a, y}});
                System.out.println("Added.");

            }} else if ({choice_v} == 2) {{
                System.out.print("Title to remove: ");
                String target = {sc_v}.nextLine();
                boolean removed = false;
                for (int i = 0; i < {books_v}.size(); i++) {{
                    if ({books_v}.get(i)[{T}].equalsIgnoreCase(target)) {{
                        {books_v}.remove(i);
                        removed = true;
                        System.out.println("Removed.");
                        break;
                    }}
                }}
                if (!removed) System.out.println("Not found.");

            }} else if ({choice_v} == 3) {{
                System.out.print("Author: ");
                String auth = {sc_v}.nextLine();
                boolean found = false;
                for (String[] b : {books_v}) {{
                    if (b[{A}].equalsIgnoreCase(auth)) {{
                        System.out.println(b[{T}] + " (" + b[{Y}] + ")");
                        found = true;
                    }}
                }}
                if (!found) System.out.println("None found.");

            }} else if ({choice_v} == 4) {{
                if ({books_v}.isEmpty()) {{
                    System.out.println("No books stored.");
                }} else {{
                    ArrayList<String[]> sorted = new ArrayList<>({books_v});
                    sorted.sort((x, z) -> x[{T}].compareToIgnoreCase(z[{T}]));
                    System.out.println("--- All Books ---");
                    for (int i = 0; i < sorted.size(); i++) {{
                        String[] b = sorted.get(i);
                        System.out.println((i + 1) + ". " + b[{T}] + " | " + b[{A}] + " | " + b[{Y}]);
                    }}
                }}

            }} else if ({choice_v} == 5) {{
                System.out.println("Total: " + {books_v}.size());
            }} else {{
                System.out.println("Unknown option.");
            }}
        }}
        {sc_v}.close();
    }}
}}
"""

_C_PARAM_POOL = [
    dict(cls_v="LibrarySystem",  books_v="books",    T="TITLE",  A="AUTHOR",  Y="YEAR",      sc_v="sc",      choice_v="choice", header="=== Library System ===",    prompt="Choice: "),
    dict(cls_v="BookDatabase",   books_v="database", T="T_IDX",  A="A_IDX",   Y="Y_IDX",     sc_v="scanner", choice_v="cmd",    header="Book Database",             prompt="Enter option: "),
    dict(cls_v="LibraryApp",     books_v="catalog",  T="TITLE",  A="AUTH",    Y="PUB_YEAR",  sc_v="reader",  choice_v="input",  header="Library Application",       prompt=">> "),
    dict(cls_v="BookRegistry",   books_v="registry", T="NAME",   A="WRITER",  Y="DATE",      sc_v="sc",      choice_v="sel",    header="Book Registry",             prompt="Select: "),
    dict(cls_v="LibraryCatalog", books_v="entries",  T="TITLE",  A="AUTHOR",  Y="YEAR",      sc_v="sc",      choice_v="opt",    header="Library Catalog Manager",   prompt="Option: "),
    dict(cls_v="BookStore",      books_v="store",    T="TITLE",  A="AUTHOR",  Y="YEAR",      sc_v="in",      choice_v="n",      header="Book Store",                prompt="> "),
]


def build_group_c(variant_idx: int, rng: random.Random) -> Dict[str, str]:
    params = _C_PARAM_POOL[variant_idx % len(_C_PARAM_POOL)]
    code = _C_SINGLE.format(**params)
    cls  = params["cls_v"]
    return {f"{cls}.java": code}


# =============================================================================
# GROUP D  —  4 genuinely different implementations (~5-15% vs everything else)
#
# Each D variant uses a completely different data structure and design pattern.
# Rotated by variant_idx % 4.
# =============================================================================

_D0 = {
    "LibraryCatalog.java": """\
import java.util.*;

public class LibraryCatalog {

    private HashMap<String, String[]> catalog;

    public LibraryCatalog() {
        catalog = new HashMap<>();
    }

    public void insert(String title, String author, String year) {
        String key = title.toLowerCase().replaceAll("\\\\s+", "_");
        catalog.put(key, new String[]{title, author, year});
    }

    public boolean remove(String title) {
        String key = title.toLowerCase().replaceAll("\\\\s+", "_");
        return catalog.remove(key) != null;
    }

    public List<String[]> getByAuthor(String author) {
        List<String[]> matches = new ArrayList<>();
        for (String[] entry : catalog.values()) {
            if (entry[1].equalsIgnoreCase(author)) {
                matches.add(entry);
            }
        }
        return matches;
    }

    public void listAll() {
        if (catalog.isEmpty()) {
            System.out.println("Catalog empty.");
            return;
        }
        List<String[]> entries = new ArrayList<>(catalog.values());
        entries.sort(Comparator.comparing(e -> e[0].toLowerCase()));
        System.out.println("\\nCatalog:");
        for (String[] e : entries) {
            System.out.printf("  %-30s  %-20s  %s%n", e[0], e[1], e[2]);
        }
    }

    public int size() { return catalog.size(); }

    public static void main(String[] args) {
        LibraryCatalog cat = new LibraryCatalog();
        Scanner scanner = new Scanner(System.in);
        String cmd;

        System.out.println("Library Catalog — commands: add, remove, find, list, count, quit");

        while (!(cmd = scanner.nextLine().trim()).equalsIgnoreCase("quit")) {
            String[] parts = cmd.split("\\\\s*,\\\\s*", 4);
            String action = parts[0].toLowerCase();

            switch (action) {
                case "add":
                    if (parts.length < 4) { System.out.println("Usage: add, title, author, year"); break; }
                    cat.insert(parts[1], parts[2], parts[3]);
                    System.out.println("Inserted.");
                    break;
                case "remove":
                    if (parts.length < 2) { System.out.println("Usage: remove, title"); break; }
                    System.out.println(cat.remove(parts[1]) ? "Removed." : "Not found.");
                    break;
                case "find":
                    if (parts.length < 2) { System.out.println("Usage: find, author"); break; }
                    List<String[]> res = cat.getByAuthor(parts[1]);
                    if (res.isEmpty()) System.out.println("No results.");
                    else res.forEach(e -> System.out.println(e[0] + " (" + e[2] + ")"));
                    break;
                case "list":
                    cat.listAll();
                    break;
                case "count":
                    System.out.println("Books: " + cat.size());
                    break;
                default:
                    System.out.println("Unknown: " + action);
            }
            System.out.print("> ");
        }
        System.out.println("Goodbye.");
        scanner.close();
    }
}
""",
}

_D1 = {
    "BookStorage.java": """\
import java.util.Scanner;

public class BookStorage {

    private String[] titles;
    private String[] authors;
    private int[] years;
    private int capacity;
    private int total;

    public BookStorage(int initialCapacity) {
        capacity = initialCapacity;
        titles  = new String[capacity];
        authors = new String[capacity];
        years   = new int[capacity];
        total   = 0;
    }

    private void resize() {
        capacity *= 2;
        String[] t2 = new String[capacity];
        String[] a2 = new String[capacity];
        int[]    y2 = new int[capacity];
        System.arraycopy(titles,  0, t2, 0, total);
        System.arraycopy(authors, 0, a2, 0, total);
        System.arraycopy(years,   0, y2, 0, total);
        titles = t2; authors = a2; years = y2;
    }

    public void add(String title, String author, int year) {
        if (total == capacity) resize();
        titles[total]  = title;
        authors[total] = author;
        years[total]   = year;
        total++;
        System.out.println("Stored: " + title);
    }

    public boolean delete(String title) {
        for (int i = 0; i < total; i++) {
            if (titles[i].equalsIgnoreCase(title)) {
                for (int j = i; j < total - 1; j++) {
                    titles[j]  = titles[j + 1];
                    authors[j] = authors[j + 1];
                    years[j]   = years[j + 1];
                }
                total--;
                return true;
            }
        }
        return false;
    }

    public void findAuthor(String author) {
        boolean found = false;
        for (int i = 0; i < total; i++) {
            if (authors[i].equalsIgnoreCase(author)) {
                System.out.println(titles[i] + " (" + years[i] + ")");
                found = true;
            }
        }
        if (!found) System.out.println("No books by " + author);
    }

    public void printSorted() {
        if (total == 0) { System.out.println("Empty."); return; }
        String[] t = Arrays.copyOf(titles,  total);
        String[] a = Arrays.copyOf(authors, total);
        int[]    y = Arrays.copyOf(years,   total);
        for (int i = 0; i < total - 1; i++) {
            for (int j = 0; j < total - i - 1; j++) {
                if (t[j].compareToIgnoreCase(t[j + 1]) > 0) {
                    String ts = t[j]; t[j] = t[j+1]; t[j+1] = ts;
                    String as = a[j]; a[j] = a[j+1]; a[j+1] = as;
                    int    ys = y[j]; y[j] = y[j+1]; y[j+1] = ys;
                }
            }
        }
        System.out.println("Books:");
        for (int i = 0; i < total; i++) {
            System.out.println((i + 1) + ". " + t[i] + " — " + a[i] + ", " + y[i]);
        }
    }

    public int count() { return total; }

    public static void main(String[] args) {
        BookStorage storage = new BookStorage(10);
        Scanner sc = new Scanner(System.in);

        System.out.println("Book Storage System");
        System.out.println("Commands: ADD / DEL / AUTH / LIST / COUNT / STOP");

        while (sc.hasNextLine()) {
            System.out.print("> ");
            String cmd = sc.nextLine().trim().toUpperCase();
            if (cmd.equals("STOP")) break;
            switch (cmd) {
                case "ADD":
                    System.out.print("Title: ");  String title  = sc.nextLine();
                    System.out.print("Author: "); String author = sc.nextLine();
                    System.out.print("Year: ");
                    int year = 0;
                    try { year = Integer.parseInt(sc.nextLine().trim()); }
                    catch (NumberFormatException e) { System.out.println("Bad year."); }
                    storage.add(title, author, year);
                    break;
                case "DEL":
                    System.out.print("Title: ");
                    System.out.println(storage.delete(sc.nextLine()) ? "Deleted." : "Not found.");
                    break;
                case "AUTH":
                    System.out.print("Author: ");
                    storage.findAuthor(sc.nextLine());
                    break;
                case "LIST":
                    storage.printSorted();
                    break;
                case "COUNT":
                    System.out.println("Total: " + storage.count());
                    break;
                default:
                    System.out.println("Unknown command.");
            }
        }
        sc.close();
    }
}
""",
}

_D1["BookStorage.java"] = _D1["BookStorage.java"].replace(
    "        String[] t = Arrays.copyOf(titles,  total);\n"
    "        String[] a = Arrays.copyOf(authors, total);\n"
    "        int[]    y = Arrays.copyOf(years,   total);",
    "        String[] t = java.util.Arrays.copyOf(titles,  total);\n"
    "        String[] a = java.util.Arrays.copyOf(authors, total);\n"
    "        int[]    y = java.util.Arrays.copyOf(years,   total);"
)

_D2 = {
    "Book.java": """\
public class Book implements Comparable<Book> {
    private final String title;
    private final String author;
    private final int publicationYear;

    public Book(String title, String author, int publicationYear) {
        this.title           = title;
        this.author          = author;
        this.publicationYear = publicationYear;
    }

    public String getTitle()         { return title; }
    public String getAuthor()        { return author; }
    public int    getPublicationYear(){ return publicationYear; }

    @Override
    public int compareTo(Book other) {
        return this.title.compareToIgnoreCase(other.title);
    }

    @Override
    public String toString() {
        return String.format("[%s] %s (%d)", author, title, publicationYear);
    }
}
""",
    "BookManager.java": """\
import java.util.*;

public class BookManager {

    private final TreeMap<String, Book> collection;

    public BookManager() {
        collection = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
    }

    public void register(Book book) {
        collection.put(book.getTitle(), book);
        System.out.println("Registered: " + book);
    }

    public boolean unregister(String title) {
        return collection.remove(title) != null;
    }

    public Optional<Book> lookup(String title) {
        return Optional.ofNullable(collection.get(title));
    }

    public List<Book> findByAuthor(String author) {
        List<Book> result = new ArrayList<>();
        for (Book book : collection.values()) {
            if (book.getAuthor().equalsIgnoreCase(author)) {
                result.add(book);
            }
        }
        return result;
    }

    public void printCollection() {
        if (collection.isEmpty()) {
            System.out.println("Collection is empty.");
            return;
        }
        System.out.println("\\n--- Collection (" + collection.size() + " books) ---");
        int n = 1;
        for (Book book : collection.values()) {
            System.out.println(n++ + ". " + book);
        }
    }

    public int totalBooks() { return collection.size(); }

    public static void main(String[] args) {
        BookManager manager = new BookManager();
        Scanner scanner = new Scanner(System.in);

        System.out.println("Book Manager — commands: register | unregister | lookup | findauthor | list | total | exit");

        while (true) {
            System.out.print("\\ncmd> ");
            String command = scanner.nextLine().trim().toLowerCase();

            if (command.equals("exit")) {
                System.out.println("Exiting Book Manager.");
                break;
            } else if (command.equals("register")) {
                System.out.print("  Title: ");  String title  = scanner.nextLine();
                System.out.print("  Author: "); String author = scanner.nextLine();
                System.out.print("  Year: ");
                int year = 0;
                try { year = Integer.parseInt(scanner.nextLine().trim()); }
                catch (NumberFormatException e) { System.out.println("  Invalid year."); }
                manager.register(new Book(title, author, year));
            } else if (command.equals("unregister")) {
                System.out.print("  Title: ");
                System.out.println(manager.unregister(scanner.nextLine()) ? "  Removed." : "  Not found.");
            } else if (command.equals("lookup")) {
                System.out.print("  Title: ");
                manager.lookup(scanner.nextLine()).ifPresentOrElse(
                    b -> System.out.println("  Found: " + b),
                    () -> System.out.println("  Not in collection.")
                );
            } else if (command.equals("findauthor")) {
                System.out.print("  Author: ");
                List<Book> found = manager.findByAuthor(scanner.nextLine());
                if (found.isEmpty()) System.out.println("  No books by that author.");
                else found.forEach(b -> System.out.println("  " + b));
            } else if (command.equals("list")) {
                manager.printCollection();
            } else if (command.equals("total")) {
                System.out.println("  Total: " + manager.totalBooks());
            } else {
                System.out.println("Unknown: " + command);
            }
        }
        scanner.close();
    }
}
""",
}

_D3 = {
    "ReadingList.java": """\
import java.util.*;

public class ReadingList {

    private List<String[]> entries;
    private Deque<String[]> undoStack;
    private Deque<String>   undoActions;

    public ReadingList() {
        entries     = new ArrayList<>();
        undoStack   = new ArrayDeque<>();
        undoActions = new ArrayDeque<>();
    }

    public void addEntry(String title, String author, int publishedYear) {
        String[] entry = {title, author, String.valueOf(publishedYear)};
        entries.add(entry);
        undoStack.push(entry);
        undoActions.push("add");
        System.out.println("Added to reading list: " + fmt(entry));
    }

    public boolean removeEntry(String title) {
        Iterator<String[]> it = entries.iterator();
        while (it.hasNext()) {
            String[] e = it.next();
            if (e[0].equalsIgnoreCase(title)) {
                it.remove();
                undoStack.push(e);
                undoActions.push("remove");
                System.out.println("Removed: " + fmt(e));
                return true;
            }
        }
        System.out.println("Not found: " + title);
        return false;
    }

    public void undo() {
        if (undoStack.isEmpty()) { System.out.println("Nothing to undo."); return; }
        String[] last   = undoStack.pop();
        String   action = undoActions.pop();
        if (action.equals("add")) {
            entries.remove(last);
            System.out.println("Undid add: " + fmt(last));
        } else {
            entries.add(last);
            System.out.println("Undid remove: " + fmt(last));
        }
    }

    public void searchAuthor(String author) {
        long count = entries.stream()
            .filter(e -> e[1].equalsIgnoreCase(author))
            .peek(e -> System.out.println("  " + fmt(e)))
            .count();
        System.out.println(count == 0 ? "No entries by " + author : count + " found.");
    }

    public void display() {
        if (entries.isEmpty()) { System.out.println("Reading list is empty."); return; }
        entries.stream()
            .sorted(Comparator.comparing(e -> e[0].toLowerCase()))
            .forEach(e -> System.out.println("  * " + fmt(e)));
        System.out.println("(" + entries.size() + " total)");
    }

    private String fmt(String[] e) {
        return "\\"" + e[0] + "\\" by " + e[1] + " (" + e[2] + ")";
    }

    public static void main(String[] args) {
        ReadingList list = new ReadingList();
        Scanner sc = new Scanner(System.in);

        System.out.println("Reading List Manager");
        System.out.println("Commands: add | remove | undo | search | display | quit");

        while (true) {
            System.out.print("\\n> ");
            String cmd = sc.nextLine().trim().toLowerCase();
            switch (cmd) {
                case "add":
                    System.out.print("  Title: ");  String title  = sc.nextLine();
                    System.out.print("  Author: "); String author = sc.nextLine();
                    System.out.print("  Year: ");
                    int yr = 0;
                    try { yr = Integer.parseInt(sc.nextLine().trim()); }
                    catch (NumberFormatException e) { System.out.println("  Year set to 0."); }
                    list.addEntry(title, author, yr);
                    break;
                case "remove":
                    System.out.print("  Title: ");
                    list.removeEntry(sc.nextLine());
                    break;
                case "undo":
                    list.undo();
                    break;
                case "search":
                    System.out.print("  Author: ");
                    list.searchAuthor(sc.nextLine());
                    break;
                case "display":
                    list.display();
                    break;
                case "quit":
                    System.out.println("Bye.");
                    sc.close();
                    return;
                default:
                    System.out.println("Unknown: " + cmd);
            }
        }
    }
}
""",
}

_D_BASES = [_D0, _D1, _D2, _D3]

_D_RENAME_POOLS = [
    {},  # original
    {"title": "bookTitle",   "author": "bookAuthor",  "year": "pubYear"},
    {"title": "name",        "author": "writer",      "year": "date"},
    {"title": "label",       "author": "by",          "year": "yr"},
    {"scanner": "sc",        "cmd": "command",        "found": "result"},
]


def build_group_d(variant_idx: int, rng: random.Random) -> Dict[str, str]:
    base   = _D_BASES[variant_idx % len(_D_BASES)]
    rename_map = _D_RENAME_POOLS[variant_idx % len(_D_RENAME_POOLS)]
    files: Dict[str, str] = {}
    for filename, code in base.items():
        files[filename] = rename(code, rename_map)
    return files


# =============================================================================
# ZIP BUILDERS
# =============================================================================

def build_inner_zip(student_label: str, files: Dict[str, str]) -> bytes:
    """Package a student's files into an inner zip (bytes)."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, code in files.items():
            zf.writestr(filename, code.encode("utf-8"))
    return buf.getvalue()


def build_outer_zip(student_submissions: List[Tuple[str, bytes]]) -> bytes:
    """Package all inner zips into the outer zip (bytes)."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for label, inner_bytes in student_submissions:
            zf.writestr(f"{label}.zip", inner_bytes)
    return buf.getvalue()


# =============================================================================
# MAIN
# =============================================================================

def generate(n: int, seed: int, output: str) -> None:
    rng = random.Random(seed)

    dist = compute_distribution(n, rng)
    nA, nB, nC, nD = dist["A"], dist["B"], dist["C"], dist["D"]
    actual_total = nA + nB + nC + nD

    # Generate unique 7-digit student IDs (no duplicates)
    student_ids: set = set()
    while len(student_ids) < actual_total:
        student_ids.add(str(rng.randint(1000000, 9999999)))
    id_pool = list(student_ids)
    rng.shuffle(id_pool)

    print(f"Generating {actual_total} submissions  "
          f"(A={nA} high-risk, B={nB} medium, C={nC} low, D={nD} original)")

    submissions: List[Tuple[str, bytes]] = []
    id_idx = 0

    for i in range(nA):
        label = id_pool[id_idx]; id_idx += 1
        files = build_group_a(i, rng)
        submissions.append((label, build_inner_zip(label, files)))

    for i in range(nB):
        label = id_pool[id_idx]; id_idx += 1
        files = build_group_b(i, rng)
        submissions.append((label, build_inner_zip(label, files)))

    for i in range(nC):
        label = id_pool[id_idx]; id_idx += 1
        files = build_group_c(i, rng)
        submissions.append((label, build_inner_zip(label, files)))

    for i in range(nD):
        label = id_pool[id_idx]; id_idx += 1
        files = build_group_d(i, rng)
        submissions.append((label, build_inner_zip(label, files)))

    rng.shuffle(submissions)

    outer = build_outer_zip(submissions)
    with open(output, "wb") as f:
        f.write(outer)

    size_kb = len(outer) / 1024
    print(f"Written to: {output}  ({size_kb:.1f} KB, {actual_total} inner zips)")
    print()
    print("Expected analysis results after upload + run:")
    print(f"  High Risk  (>80%)  : ~{nA * (nA - 1) // 2} pairs  (Group A vs A)")
    print(f"  Medium     (61-80%): ~{nA * nB} pairs             (Group A vs B)")
    print(f"  Low        (41-60%): ~{nA * nC + nB * nC} pairs   (A/B vs C)")
    print(f"  Minimal    (<=40%) : most D-group pairs")


def prompt(question: str, default: str) -> str:
    answer = input(f"{question} [{default}]: ").strip()
    return answer if answer else default


def main() -> None:
    print("=" * 48)
    print("  Code-Checker  —  Submission Generator")
    print("=" * 48)
    print("Press Enter to accept the default value.\n")

    # Number of students
    while True:
        raw = prompt("Number of student submissions", "20")
        try:
            n = int(raw)
            if n < MIN_TOTAL:
                print(f"  Minimum is {MIN_TOTAL}. Setting to {MIN_TOTAL}.")
                n = MIN_TOTAL
            break
        except ValueError:
            print("  Please enter a whole number.")

    # Output filename
    default_name = f"test_submissions_{n}students.zip"
    output = prompt("Output zip filename", default_name)
    if not output.endswith(".zip"):
        output += ".zip"

    # Random seed
    raw_seed = prompt("Random seed (for reproducibility)", "random")
    seed = random.randint(0, 999999) if raw_seed.lower() == "random" else int(raw_seed)

    print()
    generate(n=n, seed=seed, output=output)


if __name__ == "__main__":
    main()
