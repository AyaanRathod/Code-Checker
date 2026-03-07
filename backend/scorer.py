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

--- TASK FOR IMPLEMENTOR ---
Your job is to implement the two functions below:
    1. remove_boilerplate()
    2. calculate_similarity()

Do NOT change the function signatures or return types — the rest of the
backend (main.py, test_engine.py) depends on them exactly as defined.

Run `python test_engine.py` from the backend folder to validate your work.
"""

from typing import Set, List, Dict, Any, Tuple


def remove_boilerplate(student_fingerprint: List[Dict[str, Any]], boilerplate_hashes: Set[int]) -> List[Dict[str, Any]]:
    """
    Removes boilerplate hashes from a student's fingerprint list.

    Boilerplate code includes starter code, provided libraries, or template files
    given by the instructor. We must exclude these to avoid false positives.

    Filter the student's list of fingerprint objects, keeping only those
    whose 'hash' key is NOT present in the boilerplate_hashes set.

    Args:
        student_fingerprint (List[Dict]): The list of fingerprint objects from the student.
            Each dict has the shape: {"hash": int, "start_idx": int, "end_idx": int}
        boilerplate_hashes (Set[int]): The set of integer hashes from the provided
            starter/template code.

    Returns:
        List[Dict]: A new list containing only the fingerprint objects whose hash
            does NOT appear in boilerplate_hashes. The order and structure of the
            dicts must be preserved.

    Example:
        student_fingerprint = [
            {"hash": 101, "start_idx": 0,  "end_idx": 10},   # boilerplate — exclude
            {"hash": 202, "start_idx": 11, "end_idx": 25},   # original — keep
            {"hash": 303, "start_idx": 26, "end_idx": 40},   # original — keep
        ]
        boilerplate_hashes = {101, 102}

        result = remove_boilerplate(student_fingerprint, boilerplate_hashes)
        # Expected: [{"hash": 202, ...}, {"hash": 303, ...}]
    """
    raise NotImplementedError("TODO: implement remove_boilerplate()")


def calculate_similarity(fingerprint_a: List[Dict[str, Any]], fingerprint_b: List[Dict[str, Any]]) -> Tuple[float, List[Dict], List[Dict]]:
    """
    Compares two fingerprint lists and returns a similarity score plus match ranges.

    Uses the Containment Metric:
        score = (size of intersection / size of smaller fingerprint set) * 100.0

    The Containment Metric is preferred over Jaccard because it handles cases where
    one document is much smaller than the other (e.g., a student copied one function
    from a large codebase — the intersection is small relative to the union, but
    large relative to the smaller doc).

    Implementation steps:
        1. Handle the edge case: if either fingerprint list is empty, return
           (0.0, [], []) immediately.
        2. Extract the integer hashes from each list into two Python sets.
        3. Compute the intersection (hashes that appear in BOTH sets).
        4. Compute the containment score using the formula above.
        5. Build ranges_a: for every fingerprint object in fingerprint_a whose
           'hash' is in the intersection, record {"start": start_idx, "end": end_idx}.
        6. Build ranges_b: same as above but for fingerprint_b.
        7. Return (similarity_score, ranges_a, ranges_b).

    Args:
        fingerprint_a (List[Dict]): Fingerprint list for document A.
            Each dict: {"hash": int, "start_idx": int, "end_idx": int}
        fingerprint_b (List[Dict]): Fingerprint list for document B.
            Same structure as fingerprint_a.

    Returns:
        Tuple containing:
            - similarity_score (float): Value between 0.0 and 100.0.
            - ranges_a (List[Dict]): Matched regions in document A.
                Each dict: {"start": int, "end": int}
            - ranges_b (List[Dict]): Matched regions in document B.
                Same structure as ranges_a.

    Example:
        fingerprint_a = [
            {"hash": 11, "start_idx": 0,  "end_idx": 5},
            {"hash": 22, "start_idx": 6,  "end_idx": 12},
            {"hash": 33, "start_idx": 13, "end_idx": 20},
        ]
        fingerprint_b = [
            {"hash": 11, "start_idx": 0,  "end_idx": 5},
            {"hash": 22, "start_idx": 6,  "end_idx": 12},
            {"hash": 99, "start_idx": 13, "end_idx": 20},
        ]
        # intersection = {11, 22}  (2 hashes)
        # min_size = 3
        # score = (2 / 3) * 100 = 66.67

        score, ra, rb = calculate_similarity(fingerprint_a, fingerprint_b)
        # score  -> 66.67
        # ra     -> [{"start": 0, "end": 5}, {"start": 6, "end": 12}]
        # rb     -> [{"start": 0, "end": 5}, {"start": 6, "end": 12}]
    """
    raise NotImplementedError("TODO: implement calculate_similarity()")
