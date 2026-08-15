import unittest

from pathlib import Path

from tools.extract_max4_data import decode_johab, decode_johab_bytes, parse_blocks

# 원본은 저장소에 없다. 사용자가 본인 사본을 두면 이 테스트가 실행된다.
SOURCE = Path("ref/max4/PJM.031")


class ParseBlocksTest(unittest.TestCase):
    def test_keeps_source_order_and_declared_entries(self):
        self.assertEqual(
            parse_blocks("2 첫째\n둘째\n1 셋째\n", "PJM.031"),
            [
                {"entries": ["첫째", "둘째"]},
                {"entries": ["셋째"]},
            ],
        )

    def test_rejects_an_incomplete_block(self):
        with self.assertRaisesRegex(ValueError, "PJM.031.*expected 2"):
            parse_blocks("2 첫째\n", "PJM.031")

    @unittest.skipUnless(SOURCE.exists(), "원본 데이터 없음 (README의 준비 절차 참고)")
    def test_decodes_the_original_dos_johab_data(self):
        text = decode_johab(SOURCE)
        self.assertEqual(len(text.splitlines()), 100)
        self.assertTrue(all(line.strip() for line in text.splitlines()))

    def test_decodes_a_johab_compatibility_jamo(self):
        self.assertEqual(decode_johab_bytes(bytes.fromhex("8841")), "ㄱ")


if __name__ == "__main__":
    unittest.main()
