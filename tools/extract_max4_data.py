"""Extract MAX 4's JOHAB text databases without modifying their source files."""

import argparse
import hashlib
import json
from pathlib import Path


INITIAL = [-1, 0, *range(1, 20), *([-1] * 11)]
MEDIAL = [-1, -1, 0, *range(1, 6), -1, -1, *range(6, 12), -1, -1, *range(12, 18), -1, -1, *range(18, 22), -1, -1]
FINAL = [-1, *range(0, 17), -1, *range(17, 28), -1, -1]
JAMO_CODES = [
    0x8841, 0x8C41, 0x8444, 0x9041, 0x8446, 0x8447, 0x9441, 0x9841,
    0x9C41, 0x844A, 0x844B, 0x844C, 0x844D, 0x844E, 0x844F, 0x8450,
    0xA041, 0xA441, 0xA841, 0x8454, 0xAC41, 0xB041, 0xB441, 0xB841,
    0xBC41, 0xC041, 0xC441, 0xC841, 0xCC41, 0xD041, 0x8461, 0x8481,
    0x84A1, 0x84C1, 0x84E1, 0x8541, 0x8561, 0x8581, 0x85A1, 0x85C1,
    0x85E1, 0x8641, 0x8661, 0x8681, 0x86A1, 0x86C1, 0x86E1, 0x8741,
    0x8761, 0x8781, 0x87A1,
]
JAMO = {code: chr(0x3131 + index) for index, code in enumerate(JAMO_CODES)}


def decode_johab_bytes(raw: bytes) -> str:
    """Decode the JOHAB subset used by MAX 4, including compatibility jamo."""
    decoded = []
    index = 0
    while index < len(raw):
        first = raw[index]
        if first < 0x80:
            decoded.append(chr(first))
            index += 1
            continue
        if index + 1 >= len(raw):
            decoded.append("�")
            break
        code = (first << 8) | raw[index + 1]
        if code in JAMO:
            decoded.append(JAMO[code])
        else:
            initial = INITIAL[(code >> 10) & 31]
            medial = MEDIAL[(code >> 5) & 31]
            final = FINAL[code & 31]
            if initial > 0 and medial > 0 and final >= 0:
                decoded.append(chr(0xAC00 + ((initial - 1) * 21 + medial - 1) * 28 + final))
            else:
                decoded.append("�")
        index += 2
    return "".join(decoded)


def decode_johab(path: Path) -> str:
    text = decode_johab_bytes(path.read_bytes())
    if not text:
        raise ValueError(f"{path.name}: JOHAB conversion produced no text")
    return text


def parse_blocks(text: str, source_name: str) -> list[dict[str, list[str]]]:
    lines = [line for line in text.replace("\r\n", "\n").split("\n") if line]
    blocks = []
    index = 0
    while index < len(lines):
        count_text, separator, first = lines[index].partition(" ")
        if not separator or not count_text.isdecimal() or not first:
            raise ValueError(f"{source_name}: invalid block header at line {index + 1}")
        count = int(count_text)
        entries = [first, *lines[index + 1:index + count]]
        if len(entries) != count:
            raise ValueError(f"{source_name}: expected {count} entries at line {index + 1}")
        blocks.append({"entries": entries})
        index += count
    return blocks


def extract(source_dir: Path) -> dict:
    files = {}
    for path in sorted(source_dir.glob("PJM.*")):
        raw = path.read_bytes()
        files[path.name] = {
            "sha256": hashlib.sha256(raw).hexdigest(),
            "blocks": parse_blocks(decode_johab(path), path.name),
        }
    return {"format": "max4-pjm-v1", "files": files}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(extract(args.source), ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
