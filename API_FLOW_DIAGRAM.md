# API Flow Diagram and Data Structure Reference

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Reddit Scraper Application                   │
├────────────────────────────────────┬────────────────────────────┤
│         Backend (Flask)             │      Frontend (Next.js)     │
├────────────────────────────────────┼────────────────────────────┤
│                                    │                            │
│  Routes:                           │  Pages:                    │
│  - /scraper/*                      │  - /dashboard              │
│  - /scraper_cluster/*              │  - /sample                 │
│  - /clustering/*                   │  - /viewer                 │
│  - /experiment/*                   │  - /experiments            │
│  - /auth/*                         │  - /filter (NEW)           │
│                                    │                            │
│  Database:                         │  Components:               │
│  - MongoDB                         │  - SubredditFilter         │
│  - Repositories                    │  - KeywordFilter           │
│  - Entities                        │  - ViewerContent           │
│  - Services                        │  - LabelTable              │
│                                    │                            │
└────────────────────────────────────┴────────────────────────────┘
```

## Data Flow for /filter Implementation

### 1. Frontend: Load Page with Scraper Cluster ID
```
Browser URL: /filter?scraper_cluster_id=507f1f77bcf86cd799439011
                                          ↓
                        Parse URL params in page.tsx
                                          ↓
                    Call clusterApi.getClusterUnits()
```

### 2. API Call to Backend
```
GET /clustering/get_cluster_units
  ?scraper_cluster_id=507f1f77bcf86cd799439011
  &reddit_message_type=all
                           ↓
                    [Flask Route Handler]
                           ↓
      validate_query_params(GetClusterUnitsRequest)
                           ↓
         get_jwt_identity() → verify user owns cluster
                           ↓
      ClusterUnitRepository.find()
                           ↓
      Return ClusterUnitEntity[] as JSON
                           ↓
                [Browser receives data]
                           ↓
                  setClusterUnits(units)
```

### 3. Frontend: Apply Filters (Client-Side)
```
State in React:
  selectedSubreddits: Set["techsupport", "learnprogramming"]
  upvotesMin: 5
  upvotesMax: 1000
  hasGroundTruth: true
  hasPredictions: true
                           ↓
                    useMemo(() => {
                      filter clusterUnits based on state
                      return filtered array
                    }, [clusterUnits, filters])
                           ↓
              Display filtered results in UI
```

### 4. New /filter Endpoint (Advanced - Optional Backend Filtering)
```
GET /clustering/filter_cluster_units
  ?scraper_cluster_id=507f1f77bcf86cd799439011
  &subreddits=techsupport,learnprogramming
  &upvotes_min=5
  &upvotes_max=1000
  &has_ground_truth=true
  &has_predictions=true
  &sort_by=created_utc
  &sort_order=desc
                           ↓
                    [Flask Route Handler]
                           ↓
     validate_query_params(FilterClusterUnitsRequest)
                           ↓
          Build MongoDB filter:
          {
            "cluster_entity_id": ObjectId(...),
            "subreddit": {"$in": ["techsupport", ...]},
            "upvotes": {"$gte": 5, "$lte": 1000},
            "ground_truth": {"$ne": null},
            "predicted_category": {"$ne": null}
          }
                           ↓
    ClusterUnitRepository.find_filtered(
      cluster_entity_id,
      filter_dict,
      sort_field="created_utc",
      sort_direction=-1,
      skip=0,
      limit=100
    )
                           ↓
      Return filtered ClusterUnitEntity[] as JSON
                           ↓
                [Browser receives filtered data]
```

## Database Query Structure

### MongoDB Collections

```
┌─────────────────────────┐
│   cluster_unit          │
├─────────────────────────┤
│ _id: ObjectId           │
│ cluster_entity_id: Ref  │
│ type: "post"/"comment"  │
│ author: "username"      │
│ reddit_id: "t1_abc123"  │
│ subreddit: "techsupport"│
│ upvotes: 42             │
│ downvotes: 3            │
│ created_utc: 1699776000 │
│ text: "content..."      │
│ ground_truth: {         │
│   problem_description:  │ true
│   frustration_expr.:    │ true
│   solution_seeking:     │ false
│   ...                   │
│ }                       │
│ predicted_category: {   │
│   "exp_id_1": {         │
│     predicted_categories: [...]
│   }                     │
│ }                       │
└─────────────────────────┘

MongoDB Filters for /filter:
  Filter Name     → MongoDB Query
  ─────────────────────────────
  subreddit       → {"subreddit": {"$in": [...]}}
  author          → {"author": {"$in": [...]}}
  upvotes_min     → {"upvotes": {"$gte": N}}
  upvotes_max     → {"upvotes": {"$lte": N}}
  has_ground_truth → {"ground_truth": {"$ne": null}}
  has_predictions → {"predicted_category": {"$ne": null}}
  type            → {"type": "post"/"comment"}
```

## Component Hierarchy for /filter Page

```
/filter/page.tsx (Server Component Wrapper)
  └─ FilterPageContent (Client Component)
      ├─ FilterControls
      │   ├─ SubredditCheckboxes
      │   ├─ UpvotesRangeSlider
      │   ├─ AuthorFilter
      │   ├─ GroundTruthToggle
      │   └─ PredictionsToggle
      ├─ FilterResults
      │   └─ ClusterUnitGrid/Table
      │       ├─ ClusterUnitCard (for each)
      │       │   ├─ Author
      │       │   ├─ Subreddit
      │       │   ├─ Upvotes
      │       │   ├─ Ground Truth Badge
      │       │   ├─ Predictions Badge
      │       │   └─ "View in Viewer" Link
      └─ ResultsCounter
          └─ "Showing X of Y units"
```

## Request/Response Examples

### Example 1: Frontend API Call (Client-Side Filtering)
```
Frontend Code:
  const units = await clusterApi.getClusterUnits(
    authFetch,
    "507f1f77bcf86cd799439011",
    "all"
  );

Request:
  GET /clustering/get_cluster_units
    ?scraper_cluster_id=507f1f77bcf86cd799439011
    &reddit_message_type=all
  Headers:
    Authorization: Bearer eyJhbGc...

Response (200 OK):
  [
    {
      "id": "507f191e810c19729de860ea",
      "cluster_entity_id": "507f1f77bcf86cd799439011",
      "type": "post",
      "author": "user123",
      "subreddit": "techsupport",
      "upvotes": 45,
      "downvotes": 2,
      "created_utc": 1699776000,
      "text": "My laptop keeps crashing...",
      "ground_truth": {
        "problem_description": true,
        "frustration_expression": true,
        "solution_seeking": false,
        "solution_attempted": false,
        "solution_proposing": false,
        "agreement_empathy": false,
        "none_of_the_above": false
      },
      "predicted_category": [
        {
          "prompt_id": "507f1f77bcf86cd799439012",
          "problem_description": true,
          "frustration_expression": true,
          ...
        }
      ]
    },
    // ... more units
  ]
```

### Example 2: Backend Filter Endpoint Call (Optional)
```
Request:
  GET /clustering/filter_cluster_units
    ?scraper_cluster_id=507f1f77bcf86cd799439011
    &subreddits=techsupport,learnprogramming
    &upvotes_min=5
    &upvotes_max=1000
    &has_ground_truth=true
    &sort_by=created_utc
    &sort_order=desc
    &limit=50
    &skip=0
  Headers:
    Authorization: Bearer eyJhbGc...

Response (200 OK):
  [
    // Filtered and sorted cluster units
    { ... unit 1 ... },
    { ... unit 2 ... },
    // ... max 50 units
  ]

Error Response (400):
  {
    "error": "Could not find scraper_cluster_id=invalid"
  }

Error Response (401):
  {
    "error": "No such user"
  }
```

## State Management Flow (Frontend)

```
┌─────────────────────────────────────────┐
│     FilterPageContent Component         │
├─────────────────────────────────────────┤
│                                         │
│  State Variables:                       │
│  ├─ clusterUnits: ClusterUnitEntity[]   │
│  ├─ isLoading: boolean                  │
│  ├─ error: string | null                │
│  │                                      │
│  ├─ Filters:                            │
│  │  ├─ selectedSubreddits: Set<string>  │
│  │  ├─ selectedAuthors: Set<string>     │
│  │  ├─ upvotesMin: number | null        │
│  │  ├─ upvotesMax: number | null        │
│  │  ├─ hasGroundTruth: boolean | null   │
│  │  ├─ hasPredictions: boolean | null   │
│  │  ├─ sortBy: string                   │
│  │  └─ sortOrder: "asc" | "desc"        │
│                                         │
│  Effects:                               │
│  ├─ useEffect (Mount):                  │
│  │  └─ Fetch clusterUnits               │
│  │                                      │
│  ├─ useMemo (Filter):                   │
│  │  ├─ Apply all filters                │
│  │  ├─ Apply sorting                    │
│  │  └─ Return filteredUnits             │
│  │                                      │
│  └─ useMemo (Unique Values):            │
│     ├─ Extract unique subreddits        │
│     ├─ Extract unique authors           │
│     └─ Calculate upvotes range          │
│                                         │
└─────────────────────────────────────────┘
```

## Key Data Types

### ClusterUnitEntity (from Python backend)
```typescript
interface ClusterUnitEntity {
  id: string;
  cluster_entity_id: string;
  post_id: string;
  comment_post_id: string;
  type: 'post' | 'comment';
  reddit_id: string;
  author: string;
  usertag: string | null;
  upvotes: number;
  downvotes: number;
  created_utc: number;
  thread_path_text: string[] | null;
  enriched_comment_thread_text: string | null;
  predicted_category: ClusterUnitEntityPredictedCategory[];
  ground_truth: ClusterUnitEntityCategory | null;
  text: string;
  total_nested_replies: number | null;
  subreddit: string;
}

interface ClusterUnitEntityCategory {
  problem_description: boolean;
  frustration_expression: boolean;
  solution_seeking: boolean;
  solution_attempted: boolean;
  solution_proposing: boolean;
  agreement_empathy: boolean;
  none_of_the_above: boolean;
}

interface ClusterUnitEntityPredictedCategory 
  extends ClusterUnitEntityCategory {
  prompt_id: string;
}
```

## Navigation Flow

```
/dashboard
    ↓
/scraping-progress (monitor scraping)
    ↓
/sample (select cluster units for sample)
    ↓
/experiments (run experiments with LLM)
    ↓
/filter (NEW - filter cluster units by criteria)
    ↓
/viewer (view individual cluster units with predictions)
    ↓
Compare ground truth vs predictions
    ↓
Improve prompts and re-run experiments
```

## Error Handling

```
Backend:
  401 Unauthorized
    → User not found or not authenticated
  
  400 Bad Request
    → scraper_cluster_id not found
    → User doesn't own the scraper_cluster
    → Invalid query parameters
  
  500 Internal Server Error
    → Database error
    → Unexpected exception

Frontend:
  API errors caught in try/catch
  Display error message to user
  Show retry button
  Log to console for debugging
```

## Performance Optimization Strategies

```
Current Approach (Sample Page):
  1. Fetch all cluster units
  2. Store in state
  3. Apply filters in useMemo (client-side)
  ✓ Simple
  ✗ Slow for large datasets (>10K units)

Optimized Approach (Recommended for /filter):
  Option A: Hybrid (Client + Server)
    1. Fetch filtered data from backend
    2. Apply additional client-side filters
    3. Use pagination (skip/limit)
    ✓ Best performance
    ✓ Scales to large datasets
    ✗ More complex implementation

  Option B: Virtual Scrolling
    1. Fetch all data
    2. Use react-window for virtualization
    3. Only render visible units
    ✓ Good performance
    ✓ Better UX
    ✗ More library dependencies

  Option C: Backend Filtering Only
    1. All filtering on server
    2. Fetch filtered results with pagination
    ✓ Best for very large datasets
    ✗ Less responsive UI
```

## Database Indexes

Recommended MongoDB indexes for /filter performance:
```javascript
db.cluster_unit.createIndex({ "cluster_entity_id": 1 });
db.cluster_unit.createIndex({ "subreddit": 1 });
db.cluster_unit.createIndex({ "author": 1 });
db.cluster_unit.createIndex({ "upvotes": 1 });
db.cluster_unit.createIndex({ "created_utc": 1 });
db.cluster_unit.createIndex({ "ground_truth": 1 });
db.cluster_unit.createIndex({ "predicted_category": 1 });
db.cluster_unit.createIndex({
  "cluster_entity_id": 1,
  "subreddit": 1,
  "created_utc": -1
});
```

