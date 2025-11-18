# Codebase Exploration Summary

This directory contains comprehensive documentation for implementing a `/filter` route in your Master Thesis Reddit analysis application.

## Generated Documentation Files

### 1. QUICK_START.md (Start Here!)
**For:** Quick overview and getting started
**Contains:**
- High-level overview of the system
- 5 implementation steps (30 min total)
- Key files to create/modify
- Testing commands
- Common pitfalls to avoid

**Read this first** if you want to jump into implementation.

---

### 2. CODEBASE_ANALYSIS.md
**For:** Understanding the full architecture
**Contains:**
- Project overview
- Complete routing structure (backend & frontend)
- Full database schema documentation
- Existing filtering functionality
- All API endpoints
- Integration architecture
- Summary table of key files

**Read this** if you want to understand how everything fits together.

---

### 3. IMPLEMENTATION_GUIDE.md
**For:** Detailed step-by-step implementation
**Contains:**
- Quick reference of database models
- Backend organization structure
- Frontend organization structure
- Complete implementation checklist (5 phases)
- Code examples for:
  - Backend request class
  - Repository method
  - Backend route handler
  - Frontend API method
  - Frontend page component
- Integration points
- Testing checklist
- Performance considerations

**Use this** as your implementation guide with full code examples.

---

### 4. API_FLOW_DIAGRAM.md
**For:** Visual understanding of data flows
**Contains:**
- System architecture diagram
- Complete data flow walkthrough (4 scenarios)
- MongoDB collection structure
- Component hierarchy diagram
- Request/response examples
- State management flow
- TypeScript type definitions
- Navigation flow diagram
- Error handling strategies
- Performance optimization strategies
- Recommended database indexes

**Reference this** when confused about how data moves through the system.

---

## Key Discoveries About Your Codebase

### The Application Does:
1. Scrapes Reddit posts and comments from specified keywords/subreddits
2. Groups content into "cluster units" (individual posts or comments)
3. Runs LLM-based experiments to classify each unit with 7 possible labels
4. Stores ground truth labels from human reviewers
5. Compares LLM predictions vs ground truth to evaluate model performance
6. Provides a viewer interface to analyze prediction accuracy

### Current Routes:
- `/sample` - Select cluster units for experiments
- `/viewer` - View individual cluster units with predictions
- `/experiments` - Manage and run LLM experiments
- `/dashboard` - Overview of all scraper clusters
- `/scraping-progress` - Monitor scraping status

### Your /filter Route Should:
- Provide advanced filtering by: subreddit, author, upvotes, ground truth status, prediction status
- Display filtered results with option to view each in the viewer
- Follow the same pattern as the existing sample page

---

## File Locations

### Backend (Python/Flask)
```
app/
├── database/entities/
│   ├── cluster_unit_entity.py       ← ClusterUnitEntity definition
│   ├── experiment_entity.py         ← Experiment results
│   └── base_entity.py               ← PyObjectId type
├── database/
│   ├── cluster_unit_repository.py   ← Data access (add find_filtered)
│   └── experiment_repository.py
├── routes/
│   ├── clustering_routes.py         ← Add filter_cluster_units endpoint
│   ├── experiment_routes.py
│   ├── auth_routes.py
│   └── scraper_routes.py
└── requests/
    ├── cluster_prep_requests.py
    └── filter_requests.py           ← CREATE (new request validation)
```

**Start with:** `app/requests/filter_requests.py` (doesn't exist yet)

### Frontend (TypeScript/Next.js)
```
reddit_ui/src/
├── app/(routes)/(authenticated)/
│   ├── filter/page.tsx              ← CREATE (your new page)
│   ├── sample/page.tsx              ← Reference implementation
│   ├── viewer/page.tsx              ← Reference implementation
│   └── viewer/layout.tsx
├── components/
│   ├── sample/SubredditFilter.tsx   ← Reference component
│   ├── sample/KeywordFilter.tsx     ← Reference component
│   └── viewer/ViewerContent.tsx     ← Reusable component
├── lib/
│   └── api.ts                       ← Add filterClusterUnits method
├── types/
│   ├── cluster-unit.ts              ← TypeScript types
│   └── sample.ts
└── utils/
    └── fetch.ts                     ← useAuthFetch hook
```

**Start with:** `reddit_ui/src/lib/api.ts` (add method to clusterApi)

---

## Key Concepts

### ClusterUnitEntity
The core data model. Each unit is a single Reddit post or comment with:
- Content metadata (author, subreddit, upvotes, etc.)
- Ground truth labels (set by humans)
- Predicted labels (from LLM experiments)

### Ground Truth Labels (7 boolean fields)
```
problem_description      - User describes a problem
frustration_expression   - User shows frustration
solution_seeking         - User is looking for help
solution_attempted       - User tried a solution
solution_proposing       - User suggests a solution
agreement_empathy        - User agrees/empathizes
none_of_the_above        - None of the above
```

### Predicted Categories
Stored separately for each experiment with:
- Individual prediction for each run
- Reasoning from the LLM
- Sentiment analysis

### MongoDB Storage
- Posts/comments stored as ClusterUnitEntity documents
- Grouped by cluster_entity_id
- Indexed on frequently searched fields

---

## Implementation Complexity

### Simple (Start with these)
- Basic subreddit filter (done in sample page)
- Basic upvotes range filter (done in sample page)
- Frontend pagination/display

### Medium
- Has ground truth filter
- Has predictions filter
- Backend request validation

### Advanced (Optional)
- Prediction accuracy calculation
- Complex sorting options
- Virtual scrolling for performance
- Backend-side filtering with MongoDB aggregation

---

## Testing Strategy

### Unit Test
- Test FilterClusterUnitsRequest validation
- Test repository find_filtered method

### Integration Test
- Test full /filter endpoint
- Test error cases (wrong user, missing cluster)

### E2E Test
- Load /filter page
- Apply various filter combinations
- Verify results are correct
- Click to view in viewer

---

## Dependencies Already Available

Your project already has:
- Flask - web framework
- PyMongo - MongoDB driver
- Pydantic - request validation
- Next.js - frontend framework
- React - for components
- TypeScript - for type safety

No new dependencies needed for basic /filter implementation!

---

## Performance Notes

### Current Sample Page
- Loads all cluster units to memory
- Filters client-side with JavaScript
- Works fine for ~1K units, slow for 10K+

### Recommended for /filter
- Load all data initially (matches sample pattern)
- Filter on client-side (useMemo)
- Optional: Add backend endpoint for large datasets

### Database Optimization
- Add indexes on: subreddit, author, upvotes, created_utc, ground_truth
- See API_FLOW_DIAGRAM.md for index definitions

---

## Next Steps

1. **Read QUICK_START.md** (5 min) - Get overview
2. **Read IMPLEMENTATION_GUIDE.md** (15 min) - Understand full approach
3. **Reference CODEBASE_ANALYSIS.md** - Details as needed
4. **Reference API_FLOW_DIAGRAM.md** - When confused about data flow
5. **Follow implementation steps** in order
6. **Test after each step** before moving to next

---

## Questions? 

### "Where should I add the filter endpoint?"
A: `/Users/mehdigreefhorst/Desktop/Coding-Projects/Master-Thesis/app/routes/clustering_routes.py`
   In the clustering_bp Blueprint, following the pattern of get_cluster_units()

### "Which file should I look at for filtering patterns?"
A: `/reddit_ui/src/app/(routes)/(authenticated)/sample/page.tsx`
   Shows exact pattern for subreddit + keyword filtering

### "How do I test my endpoint?"
A: Use curl command in Testing Commands section of QUICK_START.md
   Or use your browser's DevTools Network tab

### "Is the viewer page reusable?"
A: Yes! ViewerContent component is designed to be reusable
   You can import and use it in your filter page

### "Should I modify the navigation?"
A: Yes, add link to /filter in your navbar/navigation
   Follow same pattern as other page links

---

## Quick Reference

### MongoDB Filter Syntax
```python
# Exact match
{"field": value}

# Array contains
{"field": {"$in": ["value1", "value2"]}}

# Range
{"field": {"$gte": min, "$lte": max}}

# Not null
{"field": {"$ne": None}}

# Null
{"field": None}
```

### React Hooks
```typescript
useState()     // Store filter state
useEffect()    // Fetch data on mount
useMemo()      // Cache filter results
useSearchParams() // Get URL params
useRouter()    // Navigate pages
```

### API Pattern
```typescript
// 1. Backend: Request class validates input
// 2. Backend: Route checks authentication + permissions
// 3. Backend: Repository queries database
// 4. Backend: Return filtered data as JSON
// 5. Frontend: Call API with authFetch
// 6. Frontend: Store results in state
// 7. Frontend: Apply filters in useMemo
// 8. Frontend: Render filtered results
```

---

## Success Criteria

Your /filter implementation is complete when:
- [ ] Can access /filter?scraper_cluster_id=XXX
- [ ] All filter controls work (checkboxes, sliders, etc.)
- [ ] Filtered results display correctly
- [ ] Can click results to view in /viewer
- [ ] No errors in browser console or server logs
- [ ] Works with user authentication

---

## Additional Resources

- **MongoDB Query Docs:** https://docs.mongodb.com/manual/reference/operator/query/
- **Next.js App Router:** https://nextjs.org/docs/app
- **React Hooks Guide:** https://react.dev/reference/react/hooks
- **Flask-PyMongo:** https://flask-pymongo.readthedocs.io/
- **Pydantic Validation:** https://docs.pydantic.dev/

