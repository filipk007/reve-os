"""Tests for atomic file write utility."""

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from app.core.atomic_writer import atomic_write_json, atomic_write_text


@pytest.fixture
def tmp_dir(tmp_path):
    return tmp_path


class TestAtomicWriteText:
    def test_basic_write(self, tmp_dir):
        path = tmp_dir / "test.txt"
        atomic_write_text(path, "hello world")
        assert path.read_text() == "hello world"

    def test_overwrites_existing(self, tmp_dir):
        path = tmp_dir / "test.txt"
        path.write_text("old content")
        atomic_write_text(path, "new content")
        assert path.read_text() == "new content"

    def test_creates_parent_dirs(self, tmp_dir):
        path = tmp_dir / "sub" / "dir" / "test.txt"
        atomic_write_text(path, "nested")
        assert path.read_text() == "nested"

    def test_no_tmp_file_left_on_success(self, tmp_dir):
        path = tmp_dir / "test.txt"
        atomic_write_text(path, "content")
        tmp_file = path.with_suffix(".txt.tmp")
        assert not tmp_file.exists()

    def test_no_tmp_file_left_on_failure(self, tmp_dir):
        path = tmp_dir / "test.txt"
        tmp_file = path.with_suffix(".txt.tmp")

        with patch("app.core.atomic_writer.os.replace", side_effect=OSError("disk full")):
            with pytest.raises(OSError, match="disk full"):
                atomic_write_text(path, "content")

        assert not tmp_file.exists()

    def test_original_preserved_on_failure(self, tmp_dir):
        path = tmp_dir / "test.txt"
        path.write_text("original")

        with patch("app.core.atomic_writer.os.replace", side_effect=OSError("disk full")):
            with pytest.raises(OSError):
                atomic_write_text(path, "new content")

        assert path.read_text() == "original"

    def test_empty_string(self, tmp_dir):
        path = tmp_dir / "empty.txt"
        atomic_write_text(path, "")
        assert path.read_text() == ""

    def test_unicode_content(self, tmp_dir):
        path = tmp_dir / "unicode.txt"
        content = "Hola mundo! Cari\u00f1o \U0001f680"
        atomic_write_text(path, content)
        assert path.read_text() == content


class TestAtomicWriteJson:
    def test_basic_dict(self, tmp_dir):
        path = tmp_dir / "data.json"
        data = {"key": "value", "count": 42}
        atomic_write_json(path, data)
        assert json.loads(path.read_text()) == data

    def test_list(self, tmp_dir):
        path = tmp_dir / "list.json"
        data = [1, 2, 3]
        atomic_write_json(path, data)
        assert json.loads(path.read_text()) == data

    def test_custom_indent(self, tmp_dir):
        path = tmp_dir / "compact.json"
        data = {"a": 1}
        atomic_write_json(path, data, indent=0)
        content = path.read_text()
        # indent=0 produces newlines but no spaces
        assert json.loads(content) == data

    def test_nested_structure(self, tmp_dir):
        path = tmp_dir / "nested.json"
        data = {"users": [{"name": "Alice", "scores": [1, 2, 3]}]}
        atomic_write_json(path, data)
        assert json.loads(path.read_text()) == data

    def test_preserves_original_on_serialization_error(self, tmp_dir):
        path = tmp_dir / "data.json"
        path.write_text('{"original": true}')

        # Non-serializable object
        with pytest.raises(TypeError):
            atomic_write_json(path, {"bad": object()})

        assert json.loads(path.read_text()) == {"original": True}

    def test_accepts_path_object(self, tmp_dir):
        path = Path(tmp_dir / "pathobj.json")
        atomic_write_json(path, {"ok": True})
        assert json.loads(path.read_text()) == {"ok": True}
