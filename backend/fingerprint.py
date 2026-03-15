"""
Fingerprint Module for Code-Checker (Plagiarism Detection System).

This module implements the Winnowing Algorithm.
It converts a list of normalized tokens into a document fingerprint (a set of hashes).

Concepts:
1.  **K-grams**: Substrings of length 'k'. We use these to capture local context.
    If k is too small, common words trigger matches. If k is too large, small edits break matches.
2.  **Rolling Hash / Stable Hash**: We convert each k-gram into a number. We use SHA-256
    instead of Python's hash() to ensure the same code produces the same hash across different runs/servers.
3.  **Winnowing**: A selection algorithm that picks a subset of hashes to represent the document.
    It guarantees that if two documents share a substring of length t = k + w - 1,
    at least one hash will be chosen from that substring in both documents.
"""

import hashlib
from typing import List, Set, Dict, Any

# Configuration Constants
# K: The noise threshold. Matches shorter than K tokens are ignored.
DEFAULT_K = 5
# W: The window size. Larger W = fewer fingerprints (less storage) but coarser granularity.
DEFAULT_WINDOW_SIZE = 4

def generate_kgrams(tokens: List[Dict[str, Any]], k: int = DEFAULT_K) -> List[Dict[str, Any]]:
    """
    Generates k-grams from a list of token dictionaries.

    A k-gram is a contiguous sequence of k items from a given sequence.
    
    Crucial Update: We now track the start index of the first token in the gram
    and the end index of the last token in the gram. This maps the hash back to
    the source code location.

    Args:
        tokens (List[Dict]): The normalized token stream with indices.
        k (int): The length of each gram.

    Returns:
        List[Dict]: A list of k-grams: {'gram': str, 'start_idx': int, 'end_idx': int}
    """
    if len(tokens) < k:
        # If the document is shorter than k, we can't form a k-gram.
        # We return the whole sequence joined if it's non-empty.
        if not tokens:
            return []
        return [{"gram": "".join(t['token'] for t in tokens), "start_idx": tokens[0]['start_idx'], "end_idx": tokens[-1]['end_idx']}]

    kgrams = []
    # Loop from 0 to len(tokens) - k
    # This ensures we slide one token at a time to create overlapping grams.
    for i in range(len(tokens) - k + 1):
        # Slice the list to get k tokens
        gram_tokens = tokens[i : i + k]
        # Join them into a single string for hashing
        # We join without spaces because the tokenizer already stripped whitespace logic
        gram_str = "".join(t['token'] for t in gram_tokens)
        
        # Capture the span: Start of first token -> End of last token
        start = gram_tokens[0]['start_idx']
        end = gram_tokens[-1]['end_idx']
        kgrams.append({"gram": gram_str, "start_idx": start, "end_idx": end})
    
    return kgrams

def get_stable_hash(text: str) -> int:
    """
    Generates a stable integer hash for a given string.

    We use SHA-256 and take the last 8 bytes (64 bits) to keep integers manageable
    but sufficiently random to avoid collisions.

    Args:
        text (str): The input string (k-gram).

    Returns:
        int: A consistent integer hash.
    """
    # Encode string to bytes (UTF-8)
    text_bytes = text.encode('utf-8')
    
    # Create SHA-256 hash object
    # hexdigest converts the bytes into hex string
    sha_signature = hashlib.sha256(text_bytes).hexdigest() 
    
    # Convert hex string to integer.
    # We don't need the full 256 bits. Let's take the last 16 chars (64 bits).
    # This reduces storage size while keeping collision probability extremely low for this use case.
    truncated_hex = sha_signature[-16:] 
    hash_int = int(truncated_hex, 16)
    
    return hash_int

def winnowing_algorithm(hashes: List[Dict[str, Any]], window_size: int = DEFAULT_WINDOW_SIZE) -> List[Dict[str, Any]]:
    """
    Applies the Winnowing algorithm to select a subset of hashes (fingerprints) with location data.

    Logic:
    1. Slide a window of size 'w' across the sequence of hashes.
    2. In each window, select the minimum hash value.
    3. If there is a tie (multiple minimums), select the right-most one.
       (This rule is crucial for mathematical properties of Winnowing).
    4. Store the selected hash ONLY if it's different from the previously recorded index.

    Args:
        hashes (List[Dict]): The sequence of k-gram objects {'hash': int, 'start_idx': int, 'end_idx': int}.
        window_size (int): The size of the sliding window.

    Returns:
        List[Dict]: A list of selected fingerprints {'hash': int, 'start_idx': int, 'end_idx': int}.
    """
    fingerprints = []
    
    if not hashes:
        return fingerprints
        
    # If we have fewer hashes than the window size, just take the minimum of what we have.
    if len(hashes) < window_size:
        # Find item with min hash value
        min_item = min(hashes, key=lambda x: x['hash'])
        fingerprints.append(min_item)
        return fingerprints

    # Variables to track the previous selection to avoid duplicates
    # We track the global index of the selected minimum to ensure we only add it once per "selection event"
    last_min_index = -1

    # Total windows = N - w + 1
    for i in range(len(hashes) - window_size + 1):
        # Define the current window slice
        window = hashes[i : i + window_size]
        
        # Find minimum in the current window.
        # We need the value AND its index relative to the window to handle the "right-most" rule.
        min_val = window[0]['hash']
        min_rel_index = 0
        
        # Iterate through window to find min (and right-most tie break)
        for j in range(1, window_size):
            val = window[j]['hash']
            # Strict less than (<) keeps the left-most.
            # Less than or equal (<=) keeps the right-most.
            if val <= min_val:
                min_val = val
                min_rel_index = j
        
        # Calculate global index of this minimum
        global_min_index = i + min_rel_index
        
        # If this is a new selection (different index than the last window's selection), record it.
        if global_min_index != last_min_index:
            fingerprints.append(window[min_rel_index])
            last_min_index = global_min_index

    return fingerprints

def generate_fingerprint(tokens: List[Dict[str, Any]], k: int = DEFAULT_K, window_size: int = DEFAULT_WINDOW_SIZE) -> List[Dict[str, Any]]:
    """
    Main entry point: Converts a list of token dicts into a document fingerprint (list of dicts).

    Args:
        tokens (List[Dict]): Normalized tokens with indices.
        k (int): K-gram size.
        window_size (int): Winnowing window size.

    Returns:
        List[Dict]: The list of selected fingerprint objects.
    """
    # Step 1: Generate K-grams
    kgrams = generate_kgrams(tokens, k)
    
    # Step 2: Hash the K-grams
    # We map the hash function over the list of k-gram strings, preserving indices
    hashes = []
    for kg in kgrams:
        h_val = get_stable_hash(kg['gram'])
        hashes.append({"hash": h_val, "start_idx": kg['start_idx'], "end_idx": kg['end_idx']})
    
    # Step 3: Winnowing (Selection)
    fingerprint_list = winnowing_algorithm(hashes, window_size)
    
    return fingerprint_list