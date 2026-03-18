import os
import sys
from typing import List, Dict, Any

from app.analysis import tokenizer, fingerprint, scorer

class AnalysisService:
    def strip_and_fingerprint(self, code: str, language: str) -> List[Dict[str, Any]]:
        """Normalize code and generate fingerprints."""
        try:
            tokens = tokenizer.normalize_source_code(code, language)
            return fingerprint.generate_fingerprint(tokens)
        except Exception as e:
            # Tokenizer or fingerprint parser might throw errors on syntax we don't handle
            print(f"Error fingerprinting code: {e}")
            return []

    def calculate_similarity_score(self, source_fp: List[Dict], target_fp: List[Dict]):
        """Calculate containment and match ranges."""
        try:
            score, ranges_a, ranges_b = scorer.calculate_similarity(source_fp, target_fp)
            return score, ranges_a, ranges_b
        except Exception as e:
            print(f"Error calculating similarity: {e}")
            return 0.0, [], []

    def detect_collusion_clusters(self, all_comparisons: List[Dict], threshold: float = 80.0) -> List[List[str]]:
        """
        Takes a list of comparison dicts of the form:
        { source: "uuid-a", target: "uuid-b", score: 95.0 }
        And returns groups (clusters) where everyone is mutually > threshold similar 
        or simply connected by > threshold edges. 
        We'll use connected components for simplicity.
        """
        from collections import defaultdict
        
        graph = defaultdict(set)
        for comp in all_comparisons:
            if comp['score'] >= threshold:
                graph[comp['source']].add(comp['target'])
                graph[comp['target']].add(comp['source'])
                
        visited = set()
        clusters = []
        
        for node in graph:
            if node not in visited:
                cluster = set()
                # Simple BFS/DFS
                stack = [node]
                while stack:
                    curr = stack.pop()
                    if curr not in visited:
                        visited.add(curr)
                        cluster.add(curr)
                        stack.extend(graph[curr] - visited)
                        
                if len(cluster) >= 3: # "groups of 3 or more submissions" from SRS
                    clusters.append(list(cluster))
                    
        return clusters

analysis_service = AnalysisService()
