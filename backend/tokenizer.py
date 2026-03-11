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

IMPLEMENTATION INSTRUCTIONS:
============================
The developer implementing this module should:

1. Implement `get_lexer_for_language(language: str)` function
   - Accept language parameter: 'c', 'cpp', 'c++', 'java'
   - Return appropriate Pygments lexer for the language
   - Raise ValueError for unsupported languages

2. Implement `normalize_source_code(source_code: str, language: str)` function
   - Tokenize using Pygments lexer
   - Filter out whitespace, newlines, and comments
   - Normalize identifiers to 'ID' (except built-ins)
   - Normalize numeric literals to 'LIT'
   - Normalize string literals to 'STR'
   - Keep keywords, operators, and punctuation intact
   - Return list of dicts with keys: 'token', 'start_idx', 'end_idx'

3. Use Pygments library for lexical analysis
   - Reference: https://pygments.org/
   - Token types: token.String, token.Number, token.Name, token.Keyword, etc.

4. Include comprehensive error handling and edge cases
5. Add unit tests to validate tokenization for C, C++, and Java code samples
6. Test with the sample code provided in the example section
"""
#Required imports
from typing import List, Dict, Any #Used only for type hints
from pygments import lex, token #Runs the lexer and identify token types
from pygments.lexers import get_lexer_by_name #Loads a lexer for a programming language
from pygments.util import ClassNotFound #This exception occurs if the requested lexer does not exist.


# Constants for Normalization
PLACEHOLDER_ID = "ID"       # For user-defined variables/functions
PLACEHOLDER_STR = "STR"     # For string literals
PLACEHOLDER_LIT = "LIT"     # For numeric literals

#Built-ins that needs to be preserved and not normalize.
COMMON_BUILTINS = {
    # C / C++
    "printf", "scanf", "cin", "cout", "cerr", "clog", "endl",
    "stdin", "stdout", "stderr", "malloc", "calloc", "realloc", "free",

    # Java
    "System", "String", "Math", "Integer", "Double", "Float",
    "Boolean", "Character", "out", "println", "print",

    # Common constants
    "NULL", "null", "true", "false"
}

def get_lexer_for_language(language: str): #This function selects the correct lexer for the language
    """
    Retrieves the appropriate Pygments lexer for the given language.

    Args:
        language (str): The programming language (e.g., 'c', 'cpp', 'java').

    Returns:
        Lexer: A Pygments Lexer instance.

    Raises:
        ValueError: If the language is not supported or unknown.
    """
    if not isinstance(language, str) or not language.strip(): #Checks if the language is actually a string and is not empty
        raise ValueError("Language must be a non-empty string!!!")
    lang = language.strip().lower() #Prevents input formatting issues
    #Language mapping conditional statements
    if lang == "c":
        lexer_name = "c"
    elif lang == "cpp" or lang == "c++": #Accepts two ways of writing C++
        lexer_name = "cpp"
    elif lang == "java":
        lexer_name = "java"
    else:
        raise ValueError(
            "Error! Sorry! Unsupported language. Supported languages are: 'C', 'CPP', 'C++', 'Java'."
        )
    try:
        return get_lexer_by_name(lexer_name) #Loads the lexer for the particular language.
    except ClassNotFound:
        raise ValueError(f"No lexer found for language: {language}")
    

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

    Example:
        >>> code = 'int myCount = 0; // Initialize count'
        >>> tokens = normalize_source_code(code, 'cpp')
        >>> # Expected output includes normalized tokens with indices
    """
    if not isinstance(source_code, str): #Input Validation
        raise TypeError("source_code must be a string.")

    lexer = get_lexer_for_language(language) #Get lexer
    raw_tokens = lex(source_code, lexer) #Tokenization

    normalized_tokens: List[Dict[str, Any]] = [] #Holds final tokens
    current_index = 0 #Tracks position in the source code

    for tok_type, tok_value in raw_tokens: #Each token has type and value
        start_idx = current_index
        end_idx = current_index + len(tok_value)
        current_index = end_idx

        if not tok_value:
            continue

        #Skip whitespace/newlines
        if tok_type in token.Text or tok_type in token.Whitespace:
            continue

        #Skip comments
        if tok_type in token.Comment:
            continue
        #Normalize strings
        if tok_type in token.String:
            norm_value = PLACEHOLDER_STR

        #Normalize numbers
        elif tok_type in token.Number:
            norm_value = PLACEHOLDER_LIT

        #Normalize identifiers/names
        elif tok_type in token.Name:
            if tok_value in COMMON_BUILTINS: #Checks preserved names
                norm_value = tok_value
            else:
                norm_value = PLACEHOLDER_ID

        #Keep keywords, operators, punctuation, etc.
        else:
            norm_value = tok_value

        normalized_tokens.append({
            "token": norm_value,
            "start_idx": start_idx,
            "end_idx": end_idx
        })
    return normalized_tokens


# Example Usage (for testing purposes)
if __name__ == "__main__": #Runs only when file is executed directly
    sample_code = 'int myCount = 0; // Initialize count' #Test code
    tokens = normalize_source_code(sample_code, 'cpp') #Run tokenizer

    print("Input:")
    print(sample_code)
    print("\nOutput:")
    for item in tokens: #Print tokens
        print(item)
    