"""
Tokenizer Module for Code-Checker (Plagiarism Detection System).

This module performs Lexical Tokenization and Identifier Normalization for source code.
It is designed to support C, C++, and Java.

Key Features:
1.  **Lexical Tokenization**: Converts raw code into a stream of tokens using Pygments.
2.  **Noise Reduction**: Removes whitespace, newlines, and comments.
3.  **Normalization**: Replaces user-defined identifiers with placeholders ('ID')
    and literals with placeholders ('LIT', 'STR') to prevent simple renaming cheats.
    Keeps language keywords and operators intact to preserve logic structure.
"""

from typing import List, Dict, Any
from pygments import lexers, token
from pygments.lexers import get_lexer_by_name, guess_lexer
from pygments.util import ClassNotFound

# Constants for Normalization
PLACEHOLDER_ID = "ID"       # For user-defined variables/functions
PLACEHOLDER_STR = "STR"     # For string literals
PLACEHOLDER_LIT = "LIT"     # For numeric literals

def get_lexer_for_language(language: str):
    """
    Retrieves the appropriate Pygments lexer for the given language.

    Args:
        language (str): The programming language (e.g., 'c', 'cpp', 'java').

    Returns:
        Lexer: A Pygments Lexer instance.

    Raises:
        ValueError: If the language is not supported or unknown.
    """
    # Normalize language string
    lang = language.lower().strip()
    
    try:
        if lang == 'c':
            return lexers.get_lexer_by_name("c")
        elif lang in ['cpp', 'c++']:
            return lexers.get_lexer_by_name("cpp")
        elif lang == 'java':
            return lexers.get_lexer_by_name("java")
        else:
            # Fallback: try to find by name, or raise error if strictly limited to C/C++/Java
            return lexers.get_lexer_by_name(lang)
    except ClassNotFound:
        raise ValueError(f"Unsupported language: {language}")

def normalize_source_code(source_code: str, language: str) -> List[Dict[str, Any]]:
    """
    Tokenizes and normalizes raw source code into a list of token dictionaries with indices.

    Process:
    1. Tokenize code using the specific language lexer.
    2. Filter out Comments and Whitespace.
    3. Normalize Identifiers to 'ID' (except built-ins).
    4. Normalize Literals (Numbers/Strings) to 'LIT'/'STR'.
    5. Keep Keywords, Operators, and Punctuation intact.

    Args:
        source_code (str): The raw source code content.
        language (str): The language of the code ('c', 'cpp', 'java').

    Returns:
        List[Dict]: A list of dicts: {'token': str, 'start_idx': int, 'end_idx': int}
    """
    if not source_code:
        return []

    try:
        lexer = get_lexer_for_language(language)
    except ValueError as e:
        print(f"Error: {e}")
        return []

    normalized_tokens = []

    # lexer.get_tokens_unprocessed returns (index, token_type, value)
    # index: The starting position of the token in the raw string.
    for index, token_type, value in lexer.get_tokens_unprocessed(source_code):
        
        end_index = index + len(value)
        
        # 1. Filter: Skip Whitespace and Newlines
        if token_type in token.Text:
            continue

        # 2. Filter: Skip Comments (Single-line, Multi-line, and Preprocessor directives)
        # Note: We skip Preprocessor (#include, #define) to focus on algorithmic logic,
        # as these are often boilerplate in C/C++.
        if token_type in token.Comment:
            continue

        # 3. Normalization Logic
        normalized_val = value
        
        # Handle String Literals
        if token_type in token.String:
            normalized_val = PLACEHOLDER_STR
            
        # Handle Numeric Literals
        elif token_type in token.Number:
            normalized_val = PLACEHOLDER_LIT
            
        # Handle Identifiers (Variable names, Function names)
        elif token_type in token.Name:
            # Exception: Keep Built-in names (e.g., 'printf', 'System', 'main')
            # This helps distinguish standard library usage from user logic.
            if token_type in token.Name.Builtin:
                normalized_val = value
            else:
                # Replace user-defined names with generic ID
                normalized_val = PLACEHOLDER_ID
        
        # Handle Keywords, Operators, and Punctuation
        # We keep these as-is to preserve the structural logic of the program.
        # e.g., 'if', 'while', '+', '=', '{', '}'
        elif token_type in token.Keyword or \
             token_type in token.Operator or \
             token_type in token.Punctuation:
            normalized_val = value
            
        # Fallback: If a token doesn't match above, we usually keep it or ignore it.
        # For safety in a parser, we append it if it's not purely whitespace/error.
        elif not value.isspace():
            normalized_val = value
        else:
            # Skip if it fell through and is just whitespace
            continue
            
        normalized_tokens.append({"token": normalized_val, "start_idx": index, "end_idx": end_index})

    return normalized_tokens
