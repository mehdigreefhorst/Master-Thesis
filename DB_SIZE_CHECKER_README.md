# MongoDB Database Size Checker

This tool helps you analyze the size of your MongoDB database and identify which collections are taking up the most space.

## 📋 What It Does

- Shows total database size breakdown
- Lists all collections sorted by size
- Displays data size vs index size
- Identifies top 5 largest collections
- Shows detailed statistics per collection

## 🚀 Usage

### Option 1: Check all collections

```bash
source venv/bin/activate
python check_db_size.py
```

### Option 2: Analyze specific collection

```bash
source venv/bin/activate
python check_db_size.py cluster_unit
```

### Option 3: Run as pytest

```bash
source venv/bin/activate
python -m pytest tests/test_database_size.py::test_database_size -v -s
```

## 📊 Sample Output

```
================================================================================
📊 MONGODB DATABASE SIZE ANALYSIS
================================================================================

📈 OVERALL SUMMARY
────────────────────────────────────────────────────────────────────────────────
Total Collections:     12
Total Documents:       1,234,567
Total Data Size:       2.45 GB
Total Index Size:      512.34 MB
Total Storage Size:    2.95 GB
Total Size (Data+Idx): 2.95 GB

📋 COLLECTION BREAKDOWN (sorted by total size)
────────────────────────────────────────────────────────────────────────────────
Collection                            Docs         Data      Indexes        Total
────────────────────────────────────────────────────────────────────────────────
cluster_unit                       850,000     1.85 GB    234.56 MB     2.08 GB
experiment                          45,000   345.23 MB     45.67 MB   390.90 MB
post                               250,000   234.56 MB     23.45 MB   258.01 MB
...
```

## 🔧 Configuration

The script reads MongoDB URI from your `.env` file. If not found, it defaults to:
```
mongodb://localhost:27017/reddit_scraper
```

To use a custom MongoDB URI, set it in your `.env` file:
```bash
MONGO_URI=mongodb://your-mongo-host:27017/your-database
```

Or set it temporarily:
```bash
export MONGO_URI="mongodb://your-mongo-host:27017/your-database"
python check_db_size.py
```

## 📁 Files

- `check_db_size.py` - Main runner script (root directory)
- `tests/test_database_size.py` - Core analysis functions

## 🐛 Troubleshooting

### Connection refused
If you see "Connection refused", make sure:
1. MongoDB is running
2. The MONGO_URI in `.env` is correct
3. You can connect to MongoDB from your terminal:
   ```bash
   mongosh "mongodb://localhost:27017/reddit_scraper"
   ```

### Module not found
Make sure you've activated the virtual environment:
```bash
source venv/bin/activate
```

## 💡 Tips

- Run this regularly to monitor database growth
- Check the "Top 5 Largest Collections" to identify optimization targets
- Look at the index size - large indexes may need optimization
- Use the specific collection analysis for detailed breakdown
