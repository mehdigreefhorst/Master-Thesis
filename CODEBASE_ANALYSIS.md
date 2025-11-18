# Master Thesis Codebase - Architecture Analysis for /filter Route Implementation

## Project Overview
This is a Reddit data analysis application with a Next.js frontend and Flask backend. The system involves:
- Scraping Reddit posts/comments
- Clustering and preparing data
- Running experiments with LLM prompts to classify cluster units
- Viewing and comparing predictions

---

## 1. ROUTING STRUCTURE

### Backend API Routes (Flask)
Location: `/Users/mehdigreefhorst/Desktop/Coding-Projects/Master-Thesis/app/routes/`

**Main Route Files:**
- `experiment_routes.py` - Experiment/sample/prompt management
- `clustering_routes.py` - Cluster preparation and cluster unit retrieval
- `scraper_routes.py` - Scraper management
- `scraper_cluster_routes.py` - Scraper cluster management
- `auth_routes.py` - Authentication
- `user_routes.py` - User management

**Key Endpoints Related to Filter:**
```
POST /clustering/prepare_cluster
GET /clustering/get_cluster_units?scraper_cluster_id={id}&reddit_message_type=all|post|comment
PUT /clustering/update_ground_truth
GET /experiment?scraper_cluster_id={id}&experiment_id={id}&user_threshold={int}
GET /experiment/get_sample_units?scraper_cluster_id={id}
GET /experiment/sample?scraper_cluster_id={id}
```

### Frontend Routes (Next.js)
Location: `/Users/mehdigreefhorst/Desktop/Coding-Projects/Master-Thesis/reddit_ui/src/app/(routes)/(authenticated)/`

**Current Routes:**
- `/viewer` - Label accuracy viewer (displays cluster units with predictions)
- `/sample` - Sample selection page (filter by subreddit/keyword)
- `/experiments` - Experiment listing and management
- `/dashboard` - Main dashboard
- `/scraping-progress` - Scraping status

**Note:** No `/filter` route exists yet. Based on the structure, it should be:
`/reddit_ui/src/app/(routes)/(authenticated)/filter/page.tsx`

---

## 2. DATABASE SCHEMA

### Key Entities

#### ClusterUnitEntity
**File:** `app/database/entities/cluster_unit_entity.py`

```python
class ClusterUnitEntity(BaseEntity):
    cluster_entity_id: PyObjectId          # Reference to cluster
    post_id: PyObjectId                    # Post ID
    comment_post_id: PyObjectId            # Comment/post ID
    type: Literal["post", "comment"]       # Type of reddit item
    reddit_id: str                         # Official Reddit ID
    author: str                            # Author username
    usertag: Optional[str]                 # User tag
    upvotes: int                           # Upvote count
    downvotes: int                         # Downvote count
    created_utc: int                       # Creation timestamp
    thread_path_text: List[str] | None     # Prior comments thread
    enriched_comment_thread_text: str | None  # LLM-processed thread
    predicted_category: Dict[PyObjectId, ClusterUnitEntityPredictedCategory] | None
    ground_truth: ClusterUnitEntityCategory  # Human annotations
    text: str                              # Content text
    total_nested_replies: Optional[int]    # Reply count
    subreddit: str                         # Subreddit name
```

#### ClusterUnitEntityCategory (Ground Truth Labels)
```python
class ClusterUnitEntityCategory(BaseModel):
    problem_description: bool          # Problem statement
    frustration_expression: bool       # Frustration shown
    solution_seeking: bool             # Seeking solution
    solution_attempted: bool           # Solution tried
    solution_proposing: bool           # Suggesting solution
    agreement_empathy: bool            # Agreement/empathy
    none_of_the_above: bool            # None of categories
```

#### ExperimentEntity
**File:** `app/database/entities/experiment_entity.py`

```python
class ExperimentEntity(BaseEntity):
    user_id: PyObjectId                    # User who ran experiment
    scraper_cluster_id: PyObjectId         # Associated scraper cluster
    prompt_id: PyObjectId                  # Prompt used
    sample_id: PyObjectId                  # Sample used
    model: str                             # LLM model (e.g., gpt-4)
    reasoning_effort: Optional[str]        # Reasoning effort level
    aggregate_result: AggregateResult      # Aggregated results
    runs_per_unit: int = 3                 # Number of runs per unit
    status: StatusType                     # Ongoing/Completed/Error
```

#### PredictionCategory (LLM Predictions)
```python
class PredictionCategoryTokens(PredictionCategory):
    reason: str                        # LLM reasoning
    sentiment: Literal["negative", "neutral", "positive"]
    # Plus all ClusterUnitEntityCategory boolean fields
```

---

## 3. FILTERING FUNCTIONALITY

### Existing Filtering (Sample Page)
**File:** `/reddit_ui/src/app/(routes)/(authenticated)/sample/page.tsx`

**Current Filters:**
- **Subreddit Filter** - Component: `SubredditFilter.tsx`
  - Extracts unique subreddits from posts
  - Multi-select with all-by-default
  
- **Keyword Filter** - Component: `KeywordFilter.tsx`
  - Filters by keyword searches (scraped keywords)
  - Multi-select

**Implementation Pattern:**
```typescript
// Get unique values
const uniqueSubreddits = useMemo(() => {
  const subreddits = new Set(posts.map(post => post.subreddit));
  return Array.from(subreddits).sort();
}, [posts]);

// Track selections
const [selectedSubreddits, setSelectedSubreddits] = useState<Set<string>>(new Set());

// Filter posts
const filteredPosts = useMemo(() => {
  let filtered = posts;
  if (selectedSubreddits.size < uniqueSubreddits.length) {
    filtered = filtered.filter(post => selectedSubreddits.has(post.subreddit));
  }
  return filtered;
}, [posts, selectedSubreddits, uniqueSubreddits.length]);
```

### Backend Clustering Route
**File:** `app/routes/clustering_routes.py` - `get_cluster_units()`

```python
@clustering_bp.route("/get_cluster_units", methods=["GET"])
@validate_query_params(GetClusterUnitsRequest)
def get_cluster_units(query: GetClusterUnitsRequest):
    # Validates scraper_cluster_id exists and is completed
    # Filters by reddit_message_type: "post" | "comment" | "all"
    # Returns ClusterUnitEntity[] objects
```

---

## 4. VIEWER PAGE STRUCTURE

### ViewerContent Component
**File:** `/reddit_ui/src/components/viewer/ViewerContent.tsx`

**Key Features:**
- Displays single cluster unit at a time
- Shows Reddit thread context
- Displays label predictions from multiple prompts
- Shows ground truth annotations
- Navigation: Previous/Next
- Updates ground truth via API

**Props:**
```typescript
interface ViewerContentProps {
  scraperClusterId: string | null;
  clusterUnitEntityId: string | null;
  experimentId?: string | null;
  clusterUnits: ClusterUnitEntity[];  // Data fetching function
  basePath: string;  // "/viewer" or "/viewer/sample"
}
```

**Data Flow:**
1. Fetch cluster units for scraper cluster
2. Cache in state
3. Redirect to first unit if none specified
4. Display unit, navigate with Previous/Next
5. Show predictions grouped by prompt_id
6. Allow ground truth updates

---

## 5. API CLIENT STRUCTURE

### API Modules
**File:** `/reddit_ui/src/lib/api.ts`

**Key API Objects:**
```typescript
export const clusterApi = {
  async getClusterUnits(authFetch, scraperClusterId, reddit_message_type),
  async updateClusterUnitGroundTruth(authFetch, cluster_entity_id, 
                                     groundTruthCategory, groundTruth),
  async prepareCluster(authFetch, scraper_cluster_id)
}

export const experimentApi = {
  async createSample(authFetch, scraperClusterId, ...),
  async parseRawPrompt(authFetch, clusterUnitId, prompt),
  async getPrompts(authFetch),
  async getSampleUnits(authFetch, scraperClusterId),
  async createPrompt(authFetch, ...),
  async createExperiment(authFetch, ...),
  async getExperiments(authFetch, scraperClusterId),
  async getSampleEntity(authFetch, scraperClusterId)
}
```

---

## 6. BERTOPIC & LLM INTEGRATION

### LLM Helper
**File:** `app/utils/llm_helper.py`

**Key Functions:**
- `custom_formatting()` - Formats prompts with cluster unit context
- Supports different LLM providers (OpenAI, Anthropic, etc.)

### Experiment Service
**File:** `app/services/experiment_service.py`

**Prediction Flow:**
1. `predict_categories_cluster_units()` - Main orchestration
2. Fetches sample cluster units
3. Calls LLM for each unit (multiple runs)
4. Stores predictions in `cluster_unit.predicted_category` dict
5. Aggregates results in `experiment.aggregate_result`

**BERTopic Integration:**
- Used for topic modeling in cluster preparation
- Not directly related to filtering, but relevant for data organization

---

## 7. TYPE DEFINITIONS

### TypeScript Types
**File:** `/reddit_ui/src/types/cluster-unit.ts`

```typescript
export interface ClusterUnitEntity {
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

export interface ClusterUnitEntityCategory {
  problem_description: boolean;
  frustration_expression: boolean;
  solution_seeking: boolean;
  solution_attempted: boolean;
  solution_proposing: boolean;
  agreement_empathy: boolean;
  none_of_the_above: boolean;
}
```

---

## 8. REQUEST/RESPONSE VALIDATION

### Backend Request Classes
**File:** `app/requests/cluster_prep_requests.py`

```python
class GetClusterUnitsRequest(BaseModel):
    scraper_cluster_id: PyObjectId
    reddit_message_type: Literal["post", "comment", "all"] = "all"
```

**File:** `app/requests/experiment_requests.py`

```python
class GetExperiments(BaseModel):
    scraper_cluster_id: PyObjectId
    experiment_id: Optional[PyObjectId] = None
    user_threshold: Optional[int] = None
```

---

## 9. REPOSITORIES (Data Access)

### ClusterUnitRepository
**File:** `app/database/cluster_unit_repository.py`

```python
class ClusterUnitRepository(BaseRepository[ClusterUnitEntity]):
    def update_ground_truth_category(self, cluster_unit_entity_id, 
                                     ground_truth_category, ground_truth)
    def insert_predicted_category(self, cluster_unit_entity_id, 
                                  experiment_id, cluster_unit_predicted_categories)
    def find_many_by_ids(ids)
    def find(filter_dict)  # From BaseRepository
```

### ExperimentRepository
**File:** `app/database/experiment_repository.py`

Basic CRUD operations inherited from BaseRepository

---

## 10. RECOMMENDED /FILTER ROUTE IMPLEMENTATION

### Backend Endpoint (Flask)
**Location:** `app/routes/clustering_routes.py` or new `app/routes/filter_routes.py`

**Suggested Endpoint:**
```python
@bp.route("/filter_cluster_units", methods=["GET"])
@validate_query_params(FilterClusterUnitsRequest)
@jwt_required()
def filter_cluster_units(query: FilterClusterUnitsRequest):
    """
    Query Parameters:
    - scraper_cluster_id: required
    - reddit_message_type: "post"|"comment"|"all" (default: "all")
    - subreddits: comma-separated or array
    - authors: comma-separated or array
    - upvotes_min: integer
    - upvotes_max: integer
    - has_ground_truth: boolean
    - has_predictions: boolean
    - prediction_accuracy_min: integer (0-100)
    - sort_by: "created_utc"|"upvotes"|"prediction_accuracy"
    - sort_order: "asc"|"desc"
    
    Returns: ClusterUnitEntity[] filtered and sorted
    """
    pass
```

### Frontend Page
**Location:** `/reddit_ui/src/app/(routes)/(authenticated)/filter/page.tsx`

**Features:**
- Advanced filtering UI similar to sample page
- Filters: subreddit, author, upvotes, ground truth, prediction accuracy
- Sorting options
- Pagination/virtual scrolling
- Link to viewer page for selected units

### Filter Request Class
**Location:** `app/requests/filter_requests.py`

```python
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
    prediction_accuracy_min: Optional[int] = None
    experiment_id: Optional[PyObjectId] = None
    sort_by: Optional[str] = "created_utc"
    sort_order: Optional[str] = "desc"
```

---

## Summary of Key Files to Reference

| Component | File Path | Purpose |
|-----------|-----------|---------|
| ClusterUnitEntity | `app/database/entities/cluster_unit_entity.py` | Data model |
| ExperimentEntity | `app/database/entities/experiment_entity.py` | Experiment results model |
| ClusterUnitRepository | `app/database/cluster_unit_repository.py` | Data access layer |
| ExperimentRepository | `app/database/experiment_repository.py` | Experiment data access |
| Clustering Routes | `app/routes/clustering_routes.py` | Current cluster endpoints |
| Experiment Routes | `app/routes/experiment_routes.py` | Sample/experiment endpoints |
| Sample Page | `reddit_ui/src/app/(routes)/(authenticated)/sample/page.tsx` | Reference for filtering UI |
| Viewer Page | `reddit_ui/src/app/(routes)/(authenticated)/viewer/page.tsx` | Reference for data display |
| ViewerContent | `reddit_ui/src/components/viewer/ViewerContent.tsx` | Reusable viewer component |
| API Client | `reddit_ui/src/lib/api.ts` | Frontend API calls |
| Cluster Types | `reddit_ui/src/types/cluster-unit.ts` | TypeScript type definitions |
| Sample Types | `reddit_ui/src/types/sample.ts` | Sample entity types |
