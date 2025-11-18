# Quick Start Guide - /filter Route Implementation

## Overview
You're building a filter route to allow users to filter cluster units by various criteria (subreddit, upvotes, ground truth status, predictions, etc.).

## What the System Does
1. **Scrapes Reddit** - Collects posts/comments from specified subreddits
2. **Clusters Data** - Groups similar content into cluster units
3. **Runs Experiments** - Uses LLM prompts to classify cluster units with multiple labels:
   - problem_description, frustration_expression, solution_seeking
   - solution_attempted, solution_proposing, agreement_empathy, none_of_the_above
4. **Labels Data** - Users provide ground truth labels
5. **Compares Results** - Viewer shows how LLM predictions match ground truth

## Your /filter Route Should
- Allow users to filter cluster units by: subreddit, author, upvotes, ground truth status, prediction status
- Show filtered results
- Link to viewer page for detailed analysis

## Key Files Already Created (Reference These)

### Sample Page (Filtering Reference)
`/Users/mehdigreefhorst/Desktop/Coding-Projects/Master-Thesis/reddit_ui/src/app/(routes)/(authenticated)/sample/page.tsx`
- Shows how to implement subreddit/keyword filtering
- Uses state + useMemo pattern
- Reference for your filter page structure

### Viewer Page (Data Display Reference)
`/Users/mehdigreefhorst/Desktop/Coding-Projects/Master-Thesis/reddit_ui/src/app/(routes)/(authenticated)/viewer/page.tsx`
- Shows how to fetch cluster units
- Shows how to navigate between units
- Shows how to display predictions from multiple experiments

### ViewerContent Component (Reusable)
`/Users/mehdigreefhorst/Desktop/Coding-Projects/Master-Thesis/reddit_ui/src/components/viewer/ViewerContent.tsx`
- Displays single cluster unit with thread context
- Shows label predictions
- Handles ground truth updates

## Implementation Steps

### Step 1: Create Backend Request Class (5 min)
File: `app/requests/filter_requests.py`

Copy the FilterClusterUnitsRequest class from IMPLEMENTATION_GUIDE.md

### Step 2: Add Repository Method (5 min)
File: `app/database/cluster_unit_repository.py`

Add find_filtered() method for MongoDB queries

### Step 3: Create Backend Route (15 min)
File: `app/routes/clustering_routes.py`

Add filter_cluster_units() endpoint - builds MongoDB filters based on request params

### Step 4: Add Frontend API Method (5 min)
File: `reddit_ui/src/lib/api.ts`

Add filterClusterUnits() to clusterApi object

### Step 5: Create Frontend Page (20 min)
File: `reddit_ui/src/app/(routes)/(authenticated)/filter/page.tsx`

Create filtering UI with controls for all filter types

## Key Architecture Points

### Data Model (ClusterUnitEntity)
```
id: unique identifier
cluster_entity_id: which cluster this unit belongs to
type: "post" or "comment"
author: Reddit username
reddit_id: official Reddit ID
subreddit: which subreddit from
upvotes/downvotes: engagement metrics
created_utc: creation timestamp
text: the actual content
ground_truth: {
  problem_description: bool,
  frustration_expression: bool,
  solution_seeking: bool,
  solution_attempted: bool,
  solution_proposing: bool,
  agreement_empathy: bool,
  none_of_the_above: bool
}
predicted_category: Dict[experiment_id, PredictionResults]
```

### Backend Flow
1. Validate user owns scraper_cluster
2. Build MongoDB query filter from request params
3. Execute query with sort/skip/limit
4. Return filtered ClusterUnitEntity objects as JSON

### Frontend Flow
1. Load all cluster units for scraper_cluster
2. Display filter controls (checkboxes, dropdowns, range sliders)
3. Apply filters in useMemo for performance
4. Show filtered results count
5. Allow navigation to viewer page for each unit

## Files to Create/Modify

| File | Action | Priority |
|------|--------|----------|
| app/requests/filter_requests.py | CREATE | High |
| app/database/cluster_unit_repository.py | MODIFY (add method) | High |
| app/routes/clustering_routes.py | MODIFY (add endpoint) | High |
| reddit_ui/src/lib/api.ts | MODIFY (add method) | High |
| reddit_ui/src/app/(routes)/(authenticated)/filter/page.tsx | CREATE | High |
| reddit_ui/src/app/(routes)/(authenticated)/layout.tsx | MODIFY (add nav link) | Medium |

## Testing Commands

### Test Backend Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/clustering/filter_cluster_units?scraper_cluster_id=XXX&subreddits=techsupport,programming&upvotes_min=5"
```

### Test Frontend
- Navigate to /filter?scraper_cluster_id=XXX
- Try different filter combinations
- Click on results to view in viewer page

## Common Pitfalls

1. **Forgetting PyObjectId conversion** - Use PyObjectId type from base_entity
2. **MongoDB query syntax** - Use $in for arrays, $gte/$lte for ranges
3. **Frontend state management** - Use useMemo to prevent infinite re-renders
4. **Authentication** - Always check @jwt_required() decorator
5. **User access control** - Always verify user owns the scraper_cluster

## Performance Tips

1. Add MongoDB indexes on frequently filtered fields (subreddit, author, upvotes, created_utc)
2. Use pagination (skip/limit) for large datasets
3. Use useMemo on frontend for expensive filter operations
4. Consider backend filtering for large datasets (move filtering from client to server)

## Integration Checklist

After implementation:
- [ ] Add link to /filter in navigation
- [ ] Add /filter to breadcrumbs if applicable
- [ ] Test with multiple filter combinations
- [ ] Test with no results case
- [ ] Test with all results case
- [ ] Link from filtered results to viewer page
- [ ] Add "Clear filters" button
- [ ] Add "Export results" button (optional)

## Next Steps

1. Read CODEBASE_ANALYSIS.md for detailed architecture overview
2. Read IMPLEMENTATION_GUIDE.md for complete code examples
3. Start with Step 1 (backend request class)
4. Follow steps sequentially
5. Test each step before moving to next

## Questions to Ask Yourself

- Should filters be AND or OR? (suggest AND - safer)
- Should filtering happen server-side or client-side? (suggest client for simplicity, server for large datasets)
- Do you need real-time filtering feedback? (implement debouncing if yes)
- Should results be paginated? (implement if dataset > 1000 items)

## Reference Documentation

- CODEBASE_ANALYSIS.md - Complete architecture analysis
- IMPLEMENTATION_GUIDE.md - Detailed code examples for each step
- Sample page code - /reddit_ui/src/app/(routes)/(authenticated)/sample/page.tsx
- Viewer page code - /reddit_ui/src/app/(routes)/(authenticated)/viewer/page.tsx
