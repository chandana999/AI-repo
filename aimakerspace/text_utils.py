from pathlib import Path
from typing import Iterable, List

import PyPDF2
try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False


class TextFileLoader:
    """Load plain-text documents from a single file or an entire directory."""

    def __init__(self, path: str, encoding: str = "utf-8"):
        self.path = Path(path)
        self.encoding = encoding
        self.documents: List[str] = []

    def load(self) -> None:
        """Populate ``self.documents`` from the configured path."""

        self.documents = list(self._iter_documents())

    def load_file(self) -> None:
        """Load a single file specified by ``self.path``."""

        self.documents = [self._read_text_file(self.path)]

    def load_directory(self) -> None:
        """Load all text files contained within ``self.path``."""

        self.documents = list(self._iter_directory(self.path))

    def load_documents(self) -> List[str]:
        """Convenience wrapper returning the loaded documents."""

        self.load()
        return self.documents

    def _iter_documents(self) -> Iterable[str]:
        if self.path.is_dir():
            yield from self._iter_directory(self.path)
        elif self.path.is_file() and self.path.suffix.lower() == ".txt":
            yield self._read_text_file(self.path)
        else:
            raise ValueError(
                "Provided path must be a directory or a .txt file: " f"{self.path}"
            )

    def _iter_directory(self, directory: Path) -> Iterable[str]:
        for entry in sorted(directory.rglob("*.txt")):
            if entry.is_file():
                yield self._read_text_file(entry)

    def _read_text_file(self, file_path: Path) -> str:
        with file_path.open("r", encoding=self.encoding) as file_handle:
            return file_handle.read()


class CharacterTextSplitter:
    """Naively split long strings into overlapping character chunks."""

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
    ):
        if chunk_size <= chunk_overlap:
            raise ValueError("Chunk size must be greater than chunk overlap")

        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split(self, text: str) -> List[str]:
        """Split ``text`` into chunks preserving the configured overlap."""

        step = self.chunk_size - self.chunk_overlap
        return [text[i : i + self.chunk_size] for i in range(0, len(text), step)]

    def split_texts(self, texts: List[str]) -> List[str]:
        """Split multiple texts and flatten the resulting chunks."""

        chunks: List[str] = []
        for text in texts:
            chunks.extend(self.split(text))
        return chunks


class PDFLoader:
    """Extract text from PDF files stored at a path."""

    def __init__(self, path: str):
        self.path = Path(path)
        self.documents: List[str] = []

    def load(self) -> None:
        """Populate ``self.documents`` from the configured path."""

        self.documents = list(self._iter_documents())

    def load_file(self) -> None:
        """Load a single PDF specified by ``self.path``."""

        self.documents = [self._read_pdf(self.path)]

    def load_directory(self) -> None:
        """Load all PDF files contained within ``self.path``."""

        self.documents = list(self._iter_directory(self.path))

    def load_documents(self) -> List[str]:
        """Convenience wrapper returning the loaded documents."""

        self.load()
        return self.documents

    def _iter_documents(self) -> Iterable[str]:
        if self.path.is_dir():
            yield from self._iter_directory(self.path)
        elif self.path.is_file() and self.path.suffix.lower() == ".pdf":
            yield self._read_pdf(self.path)
        else:
            raise ValueError(
                "Provided path must be a directory or a .pdf file: " f"{self.path}"
            )

    def _iter_directory(self, directory: Path) -> Iterable[str]:
        for entry in sorted(directory.rglob("*.pdf")):
            if entry.is_file():
                yield self._read_pdf(entry)

    def _read_pdf(self, file_path: Path) -> str:
        """Extract text from PDF with robust error handling."""
        try:
            with file_path.open("rb") as file_handle:
                # Check if file is empty
                file_handle.seek(0, 2)  # Seek to end
                file_size = file_handle.tell()
                if file_size == 0:
                    raise ValueError("PDF file is empty")
                
                file_handle.seek(0)  # Reset to beginning
                
                # Try to read PDF with PyPDF2
                try:
                    pdf_reader = PyPDF2.PdfReader(file_handle)
                    
                    # Check if PDF is encrypted
                    if pdf_reader.is_encrypted:
                        raise ValueError("PDF is password-protected and cannot be processed")
                    
                    # Check if PDF has pages
                    if len(pdf_reader.pages) == 0:
                        raise ValueError("PDF has no readable pages")
                    
                    extracted_pages = []
                    for i, page in enumerate(pdf_reader.pages):
                        try:
                            text = page.extract_text() or ""
                            extracted_pages.append(text)
                        except Exception as e:
                            print(f"Warning: Could not extract text from page {i+1}: {e}")
                            extracted_pages.append("")  # Add empty string for failed pages
                    
                    result = "\n".join(extracted_pages)
                    
                    # Check if any text was extracted
                    if not result.strip():
                        raise ValueError("No text could be extracted from the PDF")
                    
                    return result
                    
                except Exception as e:
                    # If PyPDF2 fails, try alternative approach with pdfplumber
                    print(f"PyPDF2 failed: {e}")
                    if PDFPLUMBER_AVAILABLE:
                        print("Trying pdfplumber as fallback...")
                        try:
                            return self._read_pdf_with_pdfplumber(file_path)
                        except Exception as pdfplumber_error:
                            print(f"pdfplumber also failed: {pdfplumber_error}")
                            raise ValueError(f"PDF processing failed with both PyPDF2 and pdfplumber: {str(e)}")
                    else:
                        raise ValueError(f"PDF processing failed: {str(e)}")
                    
        except FileNotFoundError:
            raise ValueError(f"PDF file not found: {file_path}")
        except PermissionError:
            raise ValueError(f"Permission denied accessing PDF file: {file_path}")
        except Exception as e:
            if "EOF marker not found" in str(e):
                raise ValueError("PDF file appears to be corrupted or incomplete. Please try a different PDF file.")
            elif "password" in str(e).lower() or "encrypted" in str(e).lower():
                raise ValueError("PDF is password-protected. Please provide an unprotected PDF file.")
            else:
                raise ValueError(f"Error reading PDF file: {str(e)}")

    def _read_pdf_with_pdfplumber(self, file_path: Path) -> str:
        """Fallback PDF reading method using pdfplumber."""
        try:
            with pdfplumber.open(file_path) as pdf:
                extracted_pages = []
                for i, page in enumerate(pdf.pages):
                    try:
                        text = page.extract_text() or ""
                        extracted_pages.append(text)
                    except Exception as e:
                        print(f"Warning: Could not extract text from page {i+1} with pdfplumber: {e}")
                        extracted_pages.append("")
                
                result = "\n".join(extracted_pages)
                
                if not result.strip():
                    raise ValueError("No text could be extracted from the PDF using pdfplumber")
                
                return result
        except Exception as e:
            raise ValueError(f"pdfplumber processing failed: {str(e)}")


if __name__ == "__main__":
    loader = TextFileLoader("data/KingLear.txt")
    loader.load()
    splitter = CharacterTextSplitter()
    chunks = splitter.split_texts(loader.documents)
    print(len(chunks))
    print(chunks[0])
    print("--------")
    print(chunks[1])
    print("--------")
    print(chunks[-2])
    print("--------")
    print(chunks[-1])
