"""
Database size analysis test
Tests and reports on MongoDB database size by collection
"""
import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from flask import Flask
from flask_pymongo import PyMongo
from typing import Dict, List
from dotenv import load_dotenv
import pymongo

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Create mongo instance at module level
mongo = PyMongo()


def create_test_app() -> Flask:
    """Create a minimal Flask app for testing"""
    app = Flask(__name__)

    # Try multiple environment variable names
    mongo_uri = (
        os.getenv('MONGO_URI') or
        os.getenv('MONGODB_URI') or
        os.getenv('DATABASE_URL') or
        'mongodb://localhost:27017/reddit_scraper'
    )

    print(f"\n🔌 Connecting to MongoDB...")
    print(f"   URI: {mongo_uri.replace(mongo_uri.split('@')[-1].split('/')[0], '***') if '@' in mongo_uri else mongo_uri}")

    app.config['MONGO_URI'] = mongo_uri
    app.config['TESTING'] = True

    try:
        mongo.init_app(app)
        # Test connection
        with app.app_context():
            mongo.cx.server_info()
        print(f"   ✅ Connection successful!\n")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}\n")
        raise

    return app


def format_size(bytes_size: float) -> str:
    """Format bytes to human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.2f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.2f} PB"


def get_collection_stats(db) -> List[Dict]:
    """Get size statistics for all collections"""
    collection_stats = []

    for collection_name in db.list_collection_names():
        try:
            stats = db.command("collStats", collection_name)

            # Extract size information
            data_size = stats.get('size', 0)
            index_size = stats.get('totalIndexSize', 0)
            storage_size = stats.get('storageSize', 0)
            total_size = data_size + index_size

            # Extract document information
            count = stats.get('count', 0)
            avg_obj_size = stats.get('avgObjSize', 0)

            # Extract index information
            num_indexes = stats.get('nindexes', 0)

            collection_stats.append({
                'name': collection_name,
                'data_size': data_size,
                'index_size': index_size,
                'storage_size': storage_size,
                'total_size': total_size,
                'count': count,
                'avg_obj_size': avg_obj_size,
                'num_indexes': num_indexes,
            })
        except Exception as e:
            print(f"⚠️  Error getting stats for {collection_name}: {e}")
            continue

    # Sort by total size (descending)
    collection_stats.sort(key=lambda x: x['total_size'], reverse=True)
    return collection_stats


def print_database_size_report(db):
    """Print a comprehensive database size report"""
    print("\n" + "="*80)
    print("📊 MONGODB DATABASE SIZE ANALYSIS")
    print("="*80)

    # Get collection stats
    collection_stats = get_collection_stats(db)

    if not collection_stats:
        print("❌ No collections found or error accessing database")
        return

    # Calculate totals
    total_data_size = sum(c['data_size'] for c in collection_stats)
    total_index_size = sum(c['index_size'] for c in collection_stats)
    total_storage_size = sum(c['storage_size'] for c in collection_stats)
    total_size = total_data_size + total_index_size
    total_documents = sum(c['count'] for c in collection_stats)

    # Print summary
    print(f"\n📈 OVERALL SUMMARY")
    print(f"{'─'*80}")
    print(f"Total Collections:     {len(collection_stats)}")
    print(f"Total Documents:       {total_documents:,}")
    print(f"Total Data Size:       {format_size(total_data_size)}")
    print(f"Total Index Size:      {format_size(total_index_size)}")
    print(f"Total Storage Size:    {format_size(total_storage_size)}")
    print(f"Total Size (Data+Idx): {format_size(total_size)}")

    # Print detailed breakdown
    print(f"\n📋 COLLECTION BREAKDOWN (sorted by total size)")
    print(f"{'─'*80}")
    print(f"{'Collection':<30} {'Docs':>12} {'Data':>12} {'Indexes':>12} {'Total':>12}")
    print(f"{'─'*80}")

    for stats in collection_stats:
        print(f"{stats['name']:<30} "
              f"{stats['count']:>12,} "
              f"{format_size(stats['data_size']):>12} "
              f"{format_size(stats['index_size']):>12} "
              f"{format_size(stats['total_size']):>12}")

    print(f"{'─'*80}")
    print(f"{'TOTAL':<30} "
          f"{total_documents:>12,} "
          f"{format_size(total_data_size):>12} "
          f"{format_size(total_index_size):>12} "
          f"{format_size(total_size):>12}")

    # Print top 5 largest collections
    print(f"\n🔥 TOP 5 LARGEST COLLECTIONS")
    print(f"{'─'*80}")
    for i, stats in enumerate(collection_stats[:5], 1):
        percentage = (stats['total_size'] / total_size * 100) if total_size > 0 else 0
        print(f"{i}. {stats['name']}")
        print(f"   Size: {format_size(stats['total_size'])} ({percentage:.1f}% of total)")
        print(f"   Documents: {stats['count']:,}")
        print(f"   Avg Doc Size: {format_size(stats['avg_obj_size'])}")
        print(f"   Indexes: {stats['num_indexes']}")
        print()

    # Print index usage breakdown
    print(f"\n🔍 INDEX SIZE BREAKDOWN")
    print(f"{'─'*80}")
    print(f"{'Collection':<30} {'# Indexes':>12} {'Index Size':>12} {'% of Data':>12}")
    print(f"{'─'*80}")

    for stats in collection_stats:
        if stats['index_size'] > 0:
            index_percentage = (stats['index_size'] / stats['data_size'] * 100) if stats['data_size'] > 0 else 0
            print(f"{stats['name']:<30} "
                  f"{stats['num_indexes']:>12} "
                  f"{format_size(stats['index_size']):>12} "
                  f"{index_percentage:>11.1f}%")

    print(f"\n{'='*80}\n")


def get_direct_db_connection():
    """Get direct MongoDB connection without Flask"""
    # Load environment variables
    env_path = Path(__file__).parent.parent / '.env'
    load_dotenv(env_path)

    # Try multiple environment variable names
    mongo_uri = (
        os.getenv('MONGO_URI') or
        os.getenv('MONGODB_URI') or
        os.getenv('MONGODB_URL') or
        os.getenv('DATABASE_URL') or
        'mongodb://localhost:27017/reddit_scraper'
    )

    # Remove quotes if present (from .env file)
    mongo_uri = mongo_uri.strip('"').strip("'")

    # Replace password placeholder if needed
    if '<db_password>' in mongo_uri or '<password>' in mongo_uri:
        password = os.getenv('MONGODB_PASSWORD', '').strip()
        if password:
            mongo_uri = mongo_uri.replace('<db_password>', password)
            mongo_uri = mongo_uri.replace('<password>', password)
        else:
            print("❌ MongoDB URI contains placeholder but MONGODB_PASSWORD not found in .env")
            raise ValueError("Missing MONGODB_PASSWORD environment variable")

    print(f"\n🔌 Connecting to MongoDB...")
    # Mask the URI for security (hide everything between :// and @)
    masked_uri = mongo_uri
    if '@' in mongo_uri:
        parts = mongo_uri.split('://')
        if len(parts) > 1:
            after_protocol = parts[1]
            if '@' in after_protocol:
                user_pass, rest = after_protocol.split('@', 1)
                masked_uri = f"{parts[0]}://***:***@{rest}"
    print(f"   URI: {masked_uri}")

    try:
        client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        # Test connection
        client.server_info()
        print(f"   ✅ Connection successful!\n")

        # Get database name from URI or use default
        if '/' in mongo_uri.split('://')[-1]:
            db_name = mongo_uri.split('/')[-1].split('?')[0] or 'reddit_scraper'
        else:
            db_name = 'reddit_scraper'

        return client[db_name]
    except Exception as e:
        print(f"   ❌ Connection failed: {e}\n")
        print(f"\n💡 Troubleshooting tips:")
        print(f"   1. Make sure MongoDB is running")
        print(f"   2. Check your .env file for MONGO_URI")
        print(f"   3. Verify you can connect: mongosh \"{mongo_uri}\"")
        print(f"   4. If using MongoDB Atlas, ensure your IP is whitelisted\n")
        raise


def test_database_size():
    """Main test function to analyze database size"""
    try:
        # Try direct connection first (more reliable)
        db = get_direct_db_connection()
        print_database_size_report(db)
    except Exception as e:
        print(f"\n❌ Failed to analyze database: {e}\n")
        sys.exit(1)


def test_collection_details(collection_name: str):
    """Get detailed information about a specific collection"""
    try:
        db = get_direct_db_connection()

        if collection_name not in db.list_collection_names():
            print(f"❌ Collection '{collection_name}' not found")
            print(f"\nAvailable collections:")
            for col in sorted(db.list_collection_names()):
                print(f"  - {col}")
            return

        print(f"\n{'='*80}")
        print(f"📊 DETAILED ANALYSIS: {collection_name}")
        print(f"{'='*80}\n")

        stats = db.command("collStats", collection_name)

        print(f"📈 Basic Information:")
        print(f"  Documents: {stats.get('count', 0):,}")
        print(f"  Average Document Size: {format_size(stats.get('avgObjSize', 0))}")
        print(f"  Data Size: {format_size(stats.get('size', 0))}")
        print(f"  Storage Size: {format_size(stats.get('storageSize', 0))}")
        print(f"  Total Index Size: {format_size(stats.get('totalIndexSize', 0))}")
        print(f"  Number of Indexes: {stats.get('nindexes', 0)}")

        if 'indexSizes' in stats:
            print(f"\n🔍 Index Breakdown:")
            for index_name, size in stats['indexSizes'].items():
                print(f"  {index_name}: {format_size(size)}")

        if 'wiredTiger' in stats:
            wt = stats['wiredTiger']
            if 'block-manager' in wt:
                bm = wt['block-manager']
                print(f"\n💾 WiredTiger Storage:")
                print(f"  Blocks Allocated: {format_size(bm.get('file bytes available for reuse', 0))}")
                print(f"  File Size: {format_size(bm.get('file size in bytes', 0))}")

        print(f"\n{'='*80}\n")
    except Exception as e:
        print(f"\n❌ Failed to analyze collection '{collection_name}': {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Analyze MongoDB database size')
    parser.add_argument('--collection', '-c', type=str, help='Analyze specific collection in detail')
    parser.add_argument('--all', '-a', action='store_true', help='Show all collections (default)')

    args = parser.parse_args()

    if args.collection:
        test_collection_details(args.collection)
    else:
        test_database_size()
