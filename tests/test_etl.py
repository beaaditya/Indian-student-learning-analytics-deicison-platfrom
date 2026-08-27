import unittest
from etl.extract import Extractor
from etl.database import DatabaseContext

class TestETL(unittest.TestCase):
    def test_extractor_instantiation(self):
        extractor = Extractor()
        self.assertIsNotNone(extractor)

    def test_database_connection_fails_gracefully(self):
        with self.assertRaises(Exception):
            with DatabaseContext() as conn:
                pass
