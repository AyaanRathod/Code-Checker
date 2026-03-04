from typing import Dict, List, Any
import tokenizer
import fingerprint
import scorer

def run_tests() -> Dict[str, Any]:
    """
    Executes the automated test suite for the Alpha presentation.
    Validates the pipeline (tokenization, string stripping, and scoring).
    """
    results = []
    total_tests = 3
    passed_tests = 0

    # --- Test Case 1: Plagiarism (Identical logic, renamed vars, with comments) ---
    tc1_source = """
    // This is a test comment that should be ignored
    public class MathOps {
        /* Block comment: Adding two numbers together */
        public int addNums(int a, int b) {
            int sum = a + b;
            return sum;
        }
    }
    """
    tc1_target = """
    public class Operations {
        // Renamed method, same structure
        public int computeSum(int x, int y) {
            int total = x + y;
            return total;
        }
    }
    """
    
    # --- Test Case 2: Original (Completely different functional logic) ---
    tc2_source = """
    public class Greeter {
        public void sayHello(String name) {
            System.out.println("Hello, " + name);
        }
    }
    """
    tc2_target = """
    public class Calculator {
        public int multiply(int a, int b) {
            return a * b;
        }
    }
    """

    # --- Test Case 3: Boilerplate (Shared template but different custom logic) ---
    tc3_source = """
    public interface Task { void execute(); }
    public class MyTask implements Task {
        public void execute() { System.out.println("Custom Logic A"); }
    }
    """
    tc3_target = """
    public interface Task { void execute(); }
    public class YourTask implements Task {
        public void execute() { int count = 0; count++; }
    }
    """
    tc3_boiler = "public interface Task { void execute(); }"

    # Helper to run a single test pipeline
    def evaluate(name: str, desc: str, src: str, tgt: str, expected_min: float, expected_max: float, boiler: str = None) -> Dict[str, Any]:
        try:
            tok_src = tokenizer.normalize_source_code(src, "java")
            tok_tgt = tokenizer.normalize_source_code(tgt, "java")
            
            fp_src = fingerprint.generate_fingerprint(tok_src)
            fp_tgt = fingerprint.generate_fingerprint(tok_tgt)
            
            if boiler:
                tok_b = tokenizer.normalize_source_code(boiler, "java")
                fp_b = fingerprint.generate_fingerprint(tok_b)
                b_hashes = {f['hash'] for f in fp_b}
                fp_src = scorer.remove_boilerplate(fp_src, b_hashes)
                fp_tgt = scorer.remove_boilerplate(fp_tgt, b_hashes)
                
            score, _, _ = scorer.calculate_similarity(fp_src, fp_tgt)
            passed = expected_min <= score <= expected_max
            
            return {
                "name": name,
                "description": desc,
                "score": score,
                "expected": f"{expected_min}% - {expected_max}%",
                "passed": passed
            }
        except Exception as e:
             return {"name": name, "description": desc, "score": 0, "expected": f"{expected_min}% - {expected_max}%", "passed": False, "error": str(e)}

    # Execute combinations
    results.append(evaluate("Test 1: Plagiarism", "Verifying Comment Stripping & Normalization (Identical Logic). Expect High Score.", tc1_source, tc1_target, 80.0, 100.0))
    results.append(evaluate("Test 2: Original", "Completely different logic. Expect Low Score.", tc2_source, tc2_target, 0.0, 30.0))
    results.append(evaluate("Test 3: Boilerplate", "Shared template but different logic, using boilerplate removal. Expect Low Score.", tc3_source, tc3_target, 0.0, 40.0, tc3_boiler))

    for r in results:
        if r["passed"]:
            passed_tests += 1

    return {
        "status": "passed" if passed_tests == total_tests else "failed",
        "passed_count": passed_tests,
        "total_count": total_tests,
        "results": results
    }
