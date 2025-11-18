# Implementation Guide for /filter Route

## Quick Reference - Where Everything Is

### Database Models
```
ClusterUnitEntity Fields:
├── id, cluster_entity_id
├── post_id, comment_post_id
├── type: "post" | "comment"
├── reddit_id, author, usertag
├── upvotes, downvotes, created_utc
├── thread_path_text: List[str]
├── enriched_comment_thread_text: str
├── predicted_category: Dict[experiment_id, predictions]
├── ground_truth: ClusterUnitEntityCategory
├── text: str
├── total_nested_replies: int
└── subreddit: str

Ground Truth Categories:
├── problem_description
├── frustration_expression
├── solution_seeking
├── solution_attempted
├── solution_proposing
├── agreement_empathy
└── none_of_the_above
```

### Backend Organization
```
app/
├── database/
│   ├── entities/
│   │   ├── cluster_unit_entity.py (ClusterUnitEntity)
│   │   ├── experiment_entity.py (ExperimentEntity)
│   │   └── base_entity.py (PyObjectId type)
│   ├── cluster_unit_repository.py (Data access)
│   └── experiment_repository.py (Data access)
├── routes/
│   ├── clustering_routes.py (GET /clustering/get_cluster_units)
│   ├── experiment_routes.py
│   └── [NEW] filter_routes.py (suggested)
└── requests/
    ├── cluster_prep_requests.py
    └── [NEW] filter_requests.py (suggested)
```

### Frontend Organization
```
reddit_ui/src/
├── app/(routes)/(authenticated)/
│   ├── sample/page.tsx (Reference for filtering UI)
│   ├── viewer/page.tsx (Reference for data display)
│   └── [NEW] filter/page.tsx (your new route)
├── components/
│   ├── sample/SubredditFilter.tsx (Reference)
│   ├── sample/KeywordFilter.tsx (Reference)
│   └── viewer/ViewerContent.tsx (Reference component)
├── lib/api.ts (API client - add new methods here)
└── types/
    ├── cluster-unit.ts (Types for ClusterUnit)
    └── sample.ts
```

## Implementation Checklist

### Phase 1: Backend API Endpoint

**Step 1: Create Filter Request Class**
File: `/Users/mehdigreefhorst/Desktop/Coding-Projects/Master-Thesis/app/requests/filter_requests.py`

```python
from typing import List, Literal, Optional
from pydantic import BaseModel
from app.database.entities.base_entity import PyObjectId

class FilterClusterUnitsRequest(BaseModel):
    scraper_cluster_id: PyObjectId
    reddit_message_type: Literal["post", "comment", "all"] = "all"
    subreddits: Optional[List[str]] = None
    authors: Optional[List[str]] = None
    upvotes_min: Optional[int] = None
    upvotes_max: Optional[int] = None
    downvotes_min: Optional[int] = None
    downvotes_max: Optional[int] = None
    has_ground_truth: Optional[bool] = None
    has_predictions: Optional[bool] = None
    ground_truth_labels: Optional[List[str]] = None  # Labels to filter by
    prediction_accuracy_min: Optional[int] = None  # 0-100
    experiment_id: Optional[PyObjectId] = None
    sort_by: Optional[str] = "created_utc"  # or "upvotes", "prediction_accuracy"
    sort_order: Optional[str] = "desc"  # or "asc"
    limit: Optional[int] = 100
    skip: Optional[int] = 0
```

**Step 2: Add Repository Method**
File: `/Users/mehdigreefhorst/Desktop/Coding-Projects/Master-Thesis/app/database/cluster_unit_repository.py`

Add method to ClusterUnitRepository:
```python
def find_filtered(self, cluster_entity_id, filter_dict, sort_field, sort_direction, skip, limit):
    """
    filter_dict: MongoDB filter conditions
    sort_field: field to sort by
    sort_direction: 1 (asc) or -1 (desc)
    """
    query = {"cluster_entity_id": cluster_entity_id, **filter_dict}
    sort_order = [( sort_field, sort_direction )]
    
    cursor = self.collection.find(query).sort(sort_order).skip(skip).limit(limit)
    return [self.entity_class.model_validate(doc) for doc in cursor]
```

**Step 3: Create Backend Route**
File: `/Users/mehdigreefhorst/Desktop/Coding-Projects/Master-Thesis/app/routes/clustering_routes.py`

Add to clustering_bp Blueprint:
```python
@clustering_bp.route("/filter_cluster_units", methods=["GET"])
@validate_query_params(FilterClusterUnitsRequest)
@jwt_required()
def filter_cluster_units(query: FilterClusterUnitsRequest):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    # Get the cluster to verify access
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(
        user_id, query.scraper_cluster_id
    )
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find scraper_cluster_id={query.scraper_cluster_id}"), 400
    
    # Build MongoDB filter
    filter_dict = {}
    
    # Filter by message type
    if query.reddit_message_type != "all":
        filter_dict["type"] = query.reddit_message_type
    
    # Filter by subreddits
    if query.subreddits:
        filter_dict["subreddit"] = {"$in": query.subreddits}
    
    # Filter by authors
    if query.authors:
        filter_dict["author"] = {"$in": query.authors}
    
    # Filter by upvotes
    upvote_filter = {}
    if query.upvotes_min is not None:
        upvote_filter["$gte"] = query.upvotes_min
    if query.upvotes_max is not None:
        upvote_filter["$lte"] = query.upvotes_max
    if upvote_filter:
        filter_dict["upvotes"] = upvote_filter
    
    # Filter by downvotes
    downvote_filter = {}
    if query.downvotes_min is not None:
        downvote_filter["$gte"] = query.downvotes_min
    if query.downvotes_max is not None:
        downvote_filter["$lte"] = query.downvotes_max
    if downvote_filter:
        filter_dict["downvotes"] = downvote_filter
    
    # Filter by ground truth existence
    if query.has_ground_truth is not None:
        if query.has_ground_truth:
            filter_dict["ground_truth"] = {"$ne": None}
        else:
            filter_dict["ground_truth"] = None
    
    # Filter by predictions existence
    if query.has_predictions is not None:
        if query.has_predictions:
            filter_dict["predicted_category"] = {"$ne": None}
        else:
            filter_dict["predicted_category"] = None
    
    # Determine sort
    sort_field = query.sort_by or "created_utc"
    sort_direction = -1 if (query.sort_order or "desc") == "desc" else 1
    
    # Get cluster_entity_id for the scraper cluster
    cluster_units = get_cluster_unit_repository().find(
        {"cluster_entity_id": scraper_cluster_entity.id}
    )
    
    # Apply pagination
    skip = query.skip or 0
    limit = query.limit or 100
    
    # Execute query with filters
    filtered_units = get_cluster_unit_repository().find_filtered(
        scraper_cluster_entity.id,
        filter_dict,
        sort_field,
        sort_direction,
        skip,
        limit
    )
    
    returnable_units = [unit.model_dump() for unit in filtered_units]
    return jsonify(returnable_units), 200
```

### Phase 2: Frontend API Client

File: `/Users/mehdigreefhorst/Desktop/Coding-Projects/Master-Thesis/reddit_ui/src/lib/api.ts`

Add to clusterApi object:
```typescript
async filterClusterUnits(
  authFetch: ReturnType<typeof useAuthFetch>,
  scraperClusterId: string,
  filters: {
    reddit_message_type?: "post" | "comment" | "all";
    subreddits?: string[];
    authors?: string[];
    upvotes_min?: number;
    upvotes_max?: number;
    downvotes_min?: number;
    downvotes_max?: number;
    has_ground_truth?: boolean;
    has_predictions?: boolean;
    prediction_accuracy_min?: number;
    experiment_id?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    limit?: number;
    skip?: number;
  }
): Promise<ClusterUnitEntity[]> {
  const params = new URLSearchParams();
  params.append('scraper_cluster_id', scraperClusterId);
  
  if (filters.reddit_message_type) {
    params.append('reddit_message_type', filters.reddit_message_type);
  }
  if (filters.subreddits?.length) {
    params.append('subreddits', filters.subreddits.join(','));
  }
  if (filters.authors?.length) {
    params.append('authors', filters.authors.join(','));
  }
  // ... add other filters ...
  
  const data = await authFetch(
    `/clustering/filter_cluster_units?${params.toString()}`
  );
  return await data.json();
}
```

### Phase 3: Frontend Page

File: `/Users/mehdigreefhorst/Desktop/Coding-Projects/Master-Thesis/reddit_ui/src/app/(routes)/(authenticated)/filter/page.tsx`

Basic structure (see sample page for reference):
```typescript
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthFetch } from '@/utils/fetch';
import { clusterApi } from '@/lib/api';
import type { ClusterUnitEntity } from '@/types/cluster-unit';
import { Button } from '@/components/ui/Button';

export default function FilterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();

  const scraperClusterId = searchParams.get('scraper_cluster_id');
  const [clusterUnits, setClusterUnits] = useState<ClusterUnitEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<string>>(new Set());
  const [upvotesMin, setUpvotesMin] = useState<number | null>(null);
  const [upvotesMax, setUpvotesMax] = useState<number | null>(null);
  const [hasGroundTruth, setHasGroundTruth] = useState<boolean | null>(null);
  const [hasPredictions, setHasPredictions] = useState<boolean | null>(null);

  // Fetch all cluster units on mount
  useEffect(() => {
    async function fetchClusterUnits() {
      if (!scraperClusterId) return;
      
      try {
        setIsLoading(true);
        const units = await clusterApi.getClusterUnits(
          authFetch,
          scraperClusterId,
          "all"
        );
        setClusterUnits(units);
      } catch (err) {
        console.error('Failed to fetch cluster units:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClusterUnits();
  }, [scraperClusterId, authFetch]);

  // Get unique subreddits
  const uniqueSubreddits = useMemo(() => {
    const subreddits = new Set(clusterUnits.map(unit => unit.subreddit));
    return Array.from(subreddits).sort();
  }, [clusterUnits]);

  // Apply filters
  const filteredUnits = useMemo(() => {
    let filtered = clusterUnits;

    // Filter by subreddits
    if (selectedSubreddits.size > 0) {
      filtered = filtered.filter(unit =>
        selectedSubreddits.has(unit.subreddit)
      );
    }

    // Filter by upvotes
    if (upvotesMin !== null) {
      filtered = filtered.filter(unit => unit.upvotes >= upvotesMin);
    }
    if (upvotesMax !== null) {
      filtered = filtered.filter(unit => unit.upvotes <= upvotesMax);
    }

    // Filter by ground truth
    if (hasGroundTruth !== null) {
      if (hasGroundTruth) {
        filtered = filtered.filter(unit => unit.ground_truth !== null);
      } else {
        filtered = filtered.filter(unit => unit.ground_truth === null);
      }
    }

    // Filter by predictions
    if (hasPredictions !== null) {
      if (hasPredictions) {
        filtered = filtered.filter(unit => unit.predicted_category && unit.predicted_category.length > 0);
      } else {
        filtered = filtered.filter(unit => !unit.predicted_category || unit.predicted_category.length === 0);
      }
    }

    return filtered;
  }, [clusterUnits, selectedSubreddits, upvotesMin, upvotesMax, hasGroundTruth, hasPredictions]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Filter Cluster Units</h1>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
          {/* Subreddit Filter */}
          <div>
            <label className="block text-sm font-semibold mb-2">Subreddits</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {uniqueSubreddits.map(subreddit => (
                <label key={subreddit} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedSubreddits.has(subreddit)}
                    onChange={(e) => {
                      const new Set = new Set(selectedSubreddits);
                      if (e.target.checked) {
                        new Set.add(subreddit);
                      } else {
                        new Set.delete(subreddit);
                      }
                      setSelectedSubreddits(new Set);
                    }}
                    className="mr-2"
                  />
                  {subreddit}
                </label>
              ))}
            </div>
          </div>

          {/* Upvotes Range Filter */}
          <div>
            <label className="block text-sm font-semibold mb-2">Upvotes Range</label>
            <input
              type="number"
              placeholder="Min"
              value={upvotesMin ?? ''}
              onChange={(e) => setUpvotesMin(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border rounded mb-2"
            />
            <input
              type="number"
              placeholder="Max"
              value={upvotesMax ?? ''}
              onChange={(e) => setUpvotesMax(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {/* Ground Truth Filter */}
          <div>
            <label className="block text-sm font-semibold mb-2">Ground Truth</label>
            <select
              value={hasGroundTruth === null ? '' : hasGroundTruth ? 'yes' : 'no'}
              onChange={(e) => {
                if (e.target.value === '') setHasGroundTruth(null);
                else setHasGroundTruth(e.target.value === 'yes');
              }}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">All</option>
              <option value="yes">Has Ground Truth</option>
              <option value="no">No Ground Truth</option>
            </select>
          </div>

          {/* Predictions Filter */}
          <div>
            <label className="block text-sm font-semibold mb-2">Has Predictions</label>
            <select
              value={hasPredictions === null ? '' : hasPredictions ? 'yes' : 'no'}
              onChange={(e) => {
                if (e.target.value === '') setHasPredictions(null);
                else setHasPredictions(e.target.value === 'yes');
              }}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">All</option>
              <option value="yes">Has Predictions</option>
              <option value="no">No Predictions</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredUnits.length} of {clusterUnits.length} units
        </div>

        {/* Display filtered units - similar to sample page */}
        {/* Use VirtualizedHorizontalGrid or table view */}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button variant="primary">View Selected in Viewer</Button>
          <Button variant="secondary">Export Filtered Units</Button>
        </div>
      </div>
    </div>
  );
}
```

## Integration Points

### 1. Add Filter to Navigation
Update navbar/navigation to include link to /filter route

### 2. Connect to Viewer
Add ability to navigate from filtered results to viewer page

### 3. Connect to Experiments
Allow filtering by experiment results

## Testing Checklist

- [ ] GET /clustering/filter_cluster_units endpoint returns correct results
- [ ] All filter parameters work correctly
- [ ] Sorting works in both directions
- [ ] Pagination works
- [ ] Frontend loads all cluster units
- [ ] Client-side filters work
- [ ] Can navigate to viewer from filtered results
- [ ] User authentication/authorization works

## Performance Considerations

1. **Backend Filtering vs Frontend Filtering**
   - Current sample.tsx uses frontend filtering (all data loaded)
   - For large datasets, consider moving filters to backend
   - MongoDB query optimization important

2. **Caching**
   - Cache cluster units in state to avoid repeated fetches
   - Use useMemo for expensive filter operations

3. **Pagination**
   - Implement pagination if datasets are large
   - Add skip/limit parameters to API

4. **Indexing**
   - Ensure MongoDB has indexes on frequently filtered fields
   - Check cluster_unit_repository.create_index() calls
