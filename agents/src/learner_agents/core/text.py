"""Text clean-up for model output that users see or that's matched by name later."""

import re

# gpt-oss likes non-breaking hyphens (U+2011) and similar; they break matching and copy-paste.
_DASHES = re.compile("[‐‑‒–−]")
_SPACES = re.compile("[   ]")


def plain(text: str) -> str:
    return _SPACES.sub(" ", _DASHES.sub("-", text)).strip()
