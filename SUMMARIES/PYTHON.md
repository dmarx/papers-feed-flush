# Python Project Structure

## scripts/hydrate_metadata.py
```python
def is_metadata_satisfied(data: dict) -> bool

def is_valid_arxiv_id(arxiv_id: str) -> bool
    """Validate arXiv ID format."""

def extract_arxiv_id_from_object_id(object_id: str) -> str
    """Extract the arXiv ID from a paper ID with various prefixing schemes."""

def fetch_arxiv_metadata(arxiv_id: str) -> Dict[[str, Any]]
    """Fetch metadata from arXiv API for a given ID using the arxiv client."""

def hydrate_issue_metadata(issue: int, token: str, repo: str)

def get_open_issues(token: str, repo: str, extra_labels: list | None)

def hydrate_all_open_issues(token: str, repo: str)

```

## scripts/process_pdf.py
```python
def remove_extra_whitespace(text: str) -> str

def remove_gibberish(text: str, cutoff) -> str

def sanitize_markdown(text: str) -> str

def get_feature_path(base_path: Path, feature_type: str, paper_id: str, ext: str) -> Path
    """Create feature directory if it doesn't exist and return the full path."""

def process_pdf_grobid(pdf_path: str, format: OutputFormat, tag: str, output_path: str | None, regenerate_tei: bool) -> None
    """
    Process a PDF file using Grobid and convert to the specified format.
    Output files will be saved in feature-specific directories:
    - TEI XML files go to features/tei-xml-grobid/
    - Markdown files go to features/markdown-grobid/
    Args:
        pdf_path: Path to the PDF file relative to the repository root.
        format: Output format, either 'markdown' or 'tei'.
        tag: Optional tag to append to the output filename (default: "grobid").
        output_path: Optional path where the output file should be saved. If provided,
            this overrides the default feature directory behavior.
        regenerate_tei: Whether to regenerate TEI XML even if it exists.
    """

def generate_missing_conversions(data_path: str, tag: str, checkpoint_cadence, regenerate_tei: bool)
    """Generate missing conversions for PDFs, saving outputs to feature directories."""

```
