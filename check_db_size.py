#!/usr/bin/env python3
"""
Quick script to check MongoDB database size
Run this from the project root: python check_db_size.py
"""
from tests.test_database_size import test_database_size, test_collection_details
import sys

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Analyze specific collection
        collection_name = sys.argv[1]
        test_collection_details(collection_name)
    else:
        # Show all collections
        test_database_size()
