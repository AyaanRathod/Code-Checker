import re
import os
import zipfile
import io
from typing import List, Tuple

class SanitizationService:
    """Handles file extraction and code sanitization (removing comments)."""
    
    SUPPORTED_EXTENSIONS = {'.c', '.cpp', '.java'}

    def extract_files(self, file_content: bytes, filename: str) -> List[Tuple[str, bytes]]:
        """
        Extracts files if it's a zip. If single file, returns it in a list.
        Only keeps supported file types.
        """
        extracted = []
        
        if filename.endswith('.zip'):
            with zipfile.ZipFile(io.BytesIO(file_content)) as z:
                for file_info in z.infolist():
                    if not file_info.is_dir():
                        ext = os.path.splitext(file_info.filename)[1].lower()
                        if ext in self.SUPPORTED_EXTENSIONS:
                            extracted.append((file_info.filename, z.read(file_info.filename)))
        else:
            ext = os.path.splitext(filename)[1].lower()
            if ext in self.SUPPORTED_EXTENSIONS:
                extracted.append((filename, file_content))
                
        return extracted

    def strip_comments(self, code: str, language: str) -> str:
        """
        Removes single-line and multi-line comments from C/C++/Java code.
        """
        # A simple regex approach to strip comments from C/C++/Java
        # Note: this might strip comments inside strings, but for plagiarism detection it's generally fine.
        
        # Regex to match /* ... */ or // ...
        pattern = r'(/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+/)|(//.*)'
        
        # We use re.sub to match comments and wipe them out
        sanitized = re.sub(pattern, '', code)
        
        return sanitized.strip()

sanitization_service = SanitizationService()
