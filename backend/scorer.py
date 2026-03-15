"""
Scorer Module for Code-Checker (Plagiarism Detection System).

This module handles the mathematical comparison of document fingerprints.
It provides functionality for:
1.  **Boilerplate Exclusion**: Removing common code (provided by instructors) from analysis.
2.  **Similarity Scoring**: Calculating how much two documents overlap using Set Theory metrics.

Key Concepts:
-   **Set Difference**: Used to subtract authorized code (boilerplate) from student code.
-   **Intersection**: The set of hashes that appear in BOTH documents.
-   **Containment Metric**: A similarity measure ideal for detecting if a small document
    is contained within a larger one (e.g., copying a helper function).
"""

from typing import Set, List, Dict, Any, Tuple

def remove_boilerplate(student_fingerprint: List[Dict[str, Any]], boilerplate_hashes: Set[int]) -> List[Dict[str, Any]]:
    """
    Removes boilerplate hashes from a student's fingerprint list.

    Boilerplate code includes starter code, provided libraries, or template files
    given by the instructor. We must exclude these to avoid false positives.

    We filter the student's list of fingerprint objects, keeping only those
    whose hash is NOT in the boilerplate set.

    Args:
        student_fingerprint (List[Dict]): The list of fingerprint objects from the student.
        boilerplate_hashes (Set[int]): The set of hashes from the provided starter code.

    Returns:
        List[Dict]: A new list containing only the unique fingerprint objects.
    """
    unique_fingerprints = [
        fp for fp in student_fingerprint 
        if fp['hash'] not in boilerplate_hashes
    ]
    
    return unique_fingerprints

def calculate_similarity(fingerprint_a: List[Dict[str, Any]], fingerprint_b: List[Dict[str, Any]]) -> Tuple[float, List[Dict], List[Dict]]:
    # 1. Handle Edge Case: Empty fingerprints
    if not fingerprint_a or not fingerprint_b:
        return 0.0, [], []

    # 2. Extract just the hashes into sets to perform the math
    hashes_a = {fp['hash'] for fp in fingerprint_a}
    hashes_b = {fp['hash'] for fp in fingerprint_b}

    # 3. Calculate Intersection (which hashes match?)
    matched_hashes = hashes_a & hashes_b
    intersection_size = len(matched_hashes)

    # 4. Determine the size of the smaller fingerprint
    min_size = len(hashes_a)

    # 5. Calculate Ratio (Similarity Score)
    similarity_score = 0.0
    if min_size > 0:
        similarity_score = (intersection_size / min_size) * 100.0

    # 6. Build the lists of match ranges for the frontend
    # We loop through the original dictionaries and grab the start/end
    # indices only if their hash is in our matched_hashes set.
    ranges_a = [
        {"start": fp["start_idx"], "end": fp["end_idx"]} 
        for fp in fingerprint_a if fp['hash'] in matched_hashes
    ]
    
    ranges_b = [
        {"start": fp["start_idx"], "end": fp["end_idx"]} 
        for fp in fingerprint_b if fp['hash'] in matched_hashes
    ]

    return similarity_score, ranges_a, ranges_b
