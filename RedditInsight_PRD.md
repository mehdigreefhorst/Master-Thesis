
# 📝 Product Requirements Document (PRD)

## 📌 Project Name:
**Reddit Insight Generator for Latent Problem Discovery**

---

## 1. ✅ Purpose

This tool supports the discovery, analysis, and validation of user-reported problems from Reddit discussions, with a focus on enabling:

- Business ventures to validate real problems
- Researchers to extract and cluster public sentiment
- Policymakers to understand lived experiences at scale

The system integrates keyword-driven Reddit scraping with LLM-assisted filtering, prompt editing, persona detection, and BERTOPIC-based clustering. It operates as an iterative problem-finding assistant.

---

## 2. 👥 Target Audience

- 🧪 Researchers interested in extracting social problem data
- 💡 Entrepreneurs looking to find unmet needs worth solving
- 🏛️ Policymakers interested in quantifying online struggles

---

## 3. 🧭 Scope

### ✅ Included Features

- Login & authentication with email + password
- Reddit scraping via official API using keyword/subreddit strategy
- Multi-step interactive LLM-based classification
- Full scraping cache (shared across users)
- Persistent user-specific project storage (long-term)
- Clustering via BERTopic with prompt refinement
- Persona enrichment with Reddit user activity history
- Early evangelist detection using Steve Blank’s methodology
- Backend implemented in Flask + MongoDB
- Frontend (planned): Claude Code with Superdesign or React

---

## 4. 🔄 System Workflow

### User Journey

1. **Authentication**: User logs in or signs up
2. **Problem Definition** (Define Page - Step 1):
   - User describes the problem they want to investigate
   - Specifies target audience
   - Optionally specifies subreddit where audience is active
   - Progress indicator shows Step 1 of 2
3. **Keyword Generation** (Define Page - Step 2):
   - User manually adds initial keywords
   - Info box encourages manual keyword entry first
   - Optional: AI generates additional keywords based on problem description
   - Keywords displayed as removable tags
   - Summary shows complete research focus
   - Progress indicator shows Step 2 of 2
4. **Scraping**: Reddit scraping begins (progress bar shown)
5. **Ground Truth Labeling** (Sample Page):
   - User navigates through scraped posts/comments in carousel view
   - Manually labels a subset (e.g., 50-250 samples) with ground truth categories
   - Can filter by subreddit to focus labeling efforts
   - Labels auto-save to database as they're created
   - **Purpose**: Creates training/validation data for prompt evaluation
6. **LLM Classification**:
   - Multiple prompts run predictions on the labeled dataset
   - Each prompt runs multiple times (e.g., 3 runs) for consistency testing
   - Results stored with prompt_id for comparison
7. **Label Accuracy Analysis** (Viewer Page):
   - Compare LLM predictions vs ground truth side-by-side
   - View accuracy and consistency metrics per prompt
   - Identify which prompts perform best on which categories
   - Edit ground truth if corrections needed
   - Select winning prompt(s) for full dataset classification
8. **Full Dataset Classification**:
   - Run best-performing prompt on entire scraped dataset
   - Possible optimization: Batch API or parallelization
9. **Filter & Refine**: User edits classification filters based on results
10. **Problem Synthesis**: LLM rewrites selected posts into problem descriptions
11. **BERTopic Clustering**: Multiple clustering configurations evaluated by LLM
12. **Cluster Selection**: User selects best cluster configuration
13. **Persona Profiling**: Deep dive into user histories per cluster
14. **Final Dashboard**: Comprehensive insights and exportable reports

---

## 5. 🧱 Technical Architecture

- **Frontend:** Claude Code UI / React
- **Backend:** Flask
- **Database:** MongoDB
- **AI:** OpenAI / Claude
- **Clustering:** BERTopic
- **Authentication:** Email + Password
- **Data caching:** Reddit content cache shared across users

---

## 6. 🛠️ API Endpoints

### 🧑 Authentication
```
POST /auth/login
POST /auth/signup
```

### 🧪 Scraping
```
POST /scraper_cluster
POST /scraper                     # Starts with keywords and subreddits
PUT  /scraper/start               # Begins scraping
```

### 🧠 Clustering Pipeline
```
POST /clustering/prepare_cluster          # Flattens nested Reddit data
POST /clustering/enrich_cluster_text      # Creates synthetic messages
POST /clustering/assign_units             # Runs BERTopic clustering
GET  /clustering/get_cluster_units        # Fetches cluster units with predictions and ground truth
PUT  /clustering/update_ground_truth      # Updates ground truth label for a cluster unit
```

---

## 7. 🧩 Data Models (from UML)

### Entity: `Post`
- `reddit_id: str`
- `author: str`
- `created_utc: datetime`
- `downvotes: int`
- `usertag: str`

### Entity: `ScraperConfig`
- `filter: "new", "hot", "top", "rising"`
- `posts_per_keyword: int`
- `post_entity_ids_status: Dict[PyObjectId, bool]`

### Entity: `ClusterUnitEntity`
- `id: str`
- `cluster_entity_id: str`
- `post_id: str`
- `comment_post_id: str`
- `type: "post" | "comment"`
- `text: str`
- `thread_path_text: str[]` - Full conversation thread leading to this message
- `ground_truth: ClusterUnitEntityCategory | null` - User-labeled ground truth
- `predicted_category: ClusterUnitEntityPredictedCategory[]` - LLM predictions from multiple prompts

### Model: `ClusterUnitEntityCategory`
- `problem_description: bool`
- `frustration_expression: bool`
- `solution_seeking: bool`
- `solution_attempted: bool`
- `solution_proposing: bool`
- `agreement_empathy: bool`
- `none_of_the_above: bool`

### Model: `ClusterUnitEntityPredictedCategory`
Extends `ClusterUnitEntityCategory` with:
- `prompt_id: str` - Identifies which prompt generated this prediction

---

## 8. 📄 UI Pages & Concepts

Each screen includes 3 design options for layout and structure.

---

### 🖥️ 1. Landing Page

**Brand**: VibeResearch - "Turning Reddit noise into market clarity"

**Functionality**:
- Product marketing and value proposition
- Educational content about the research tool
- Lead generation and sign-up conversion
- Social proof and testimonials
- Clear call-to-action to get started

**Key Sections**:

1. **Hero Section**:
   - Headline: "Find What Your Market Complains About — Before Your Competitors Do."
   - Sub-headline explaining the value proposition
   - Input field for subreddit/topic with "Analyze My Niche" CTA
   - Animated dashboard mockup showing pain point clusters
   - Trust indicators: Free to use, No credit card, Public data only
   - Gradient background with decorative elements

2. **Quick Product Snapshot**:
   - 3-sentence description of how the tool works
   - Scroll-to-features CTA link
   - Gray background section for visual separation

3. **Feature Grid** (3 columns):
   - Smart Subreddit Discovery: Find related communities automatically
   - Problem Extraction Engine: NLP-powered pain point detection
   - Quantified Insights Dashboard: Visualize clusters and patterns
   - Hover effects showing data examples
   - Gradient accent borders on hover

4. **Story Section** ("Why We Built This"):
   - Problem paragraph: Traditional research is slow/expensive
   - Solution paragraph: Automated Reddit exploration
   - Founder bio (80 words) with circular avatar
   - Coral-tinted background (#FFF5F5)

5. **Testimonial Carousel**:
   - 3 testimonials from founders/researchers/indie hackers
   - 5-star ratings with rotation controls
   - Dark background with Reddit thread pattern
   - Auto-advancing slides with manual navigation

6. **Getting Started Section** (Updated for Beta):
   - Free beta access badge
   - Feature checklist with green checkmarks
   - Reddit API key requirement notice
   - Primary CTA: "Get Started Free"
   - No pricing tiers (all features free during beta)

7. **FAQ Accordion**:
   - 4 questions addressing common objections
   - "Why Reddit?", "How accurate?", "Private subreddits?", "Ethical data?"
   - Expandable answers with smooth animations
   - GDPR compliance notice in highlighted box

8. **Sticky CTA Bar**:
   - Red-to-coral gradient background
   - Input + "Get Insights Now" button
   - Fixed to bottom of viewport
   - Always accessible for conversion

9. **Footer**:
   - Navigation links (Features, How It Works, FAQ)
   - Social media links (LinkedIn, Twitter, Product Hunt, GitHub)
   - Legal links (Privacy, Terms)
   - Tagline: "Turning Reddit noise into market clarity"

**Design System**:
- **Colors**:
  - Primary: Crimson Red #E63946
  - Secondary: Coral #F9844A
  - Accent: Teal #06B6D4
  - Neutral: Charcoal #1C1C1C, Off-white #FAF9F6
- **Typography**:
  - System fonts for performance (fallback to Inter/Poppins style)
  - Bold headings with gradient text effects
  - Clean, readable body text
- **Animations**:
  - slideInLeft/slideInRight for hero elements
  - fadeInUp for feature cards
  - Smooth hover transitions
  - Pulse effect on data badges

**Technical Implementation**:
- Next.js 14 with App Router
- Client-side components with useState/useEffect
- Modular component architecture:
  - `HeroSection.tsx`
  - `FeatureGrid.tsx`
  - `StorySection.tsx`
  - `TestimonialCarousel.tsx`
  - `PricingSection.tsx`
  - `FAQSection.tsx`
  - `CTABar.tsx`
  - `LandingFooter.tsx`
- Responsive design (mobile-first)
- SEO-optimized meta tags
- Analytics-ready conversion tracking

**Route**: `/landing`

🖼️ _[Implemented as full-featured marketing landing page]_

---

### 🖥️ 2. Define Page (Two-Step Flow)

**Step 1: Problem Definition**

**Functionality**:
- Enter problem description (textarea)
- Specify target audience (input)
- Optional: Specify subreddit (input)
- Progress bar shows 50% completion
- Continue button disabled until problem & audience filled

**Step 2: Keyword Generation**

**Functionality**:
- Humorous info box encourages manual keyword entry first
- Add keywords manually (input + "Add" button or Enter key)
- Keywords displayed as removable tags with staggered animation
- Counter shows number of keywords added
- AI generation button (optional):
  - Analyzes problem description and audience
  - Generates suggested keywords
  - Adds them as removable tags
  - Shows loading state with spinning gear icon
- Research summary card displays all inputs
- Back button returns to Step 1
- Start Scraping button proceeds to next phase

**Key Animations**:
- Bouncing target emoji in header
- Smooth progress bar transition (50% → 100%)
- Slide-in animation when switching steps
- Fade-in for form elements with staggered timing
- Wobble animation on info box
- Hover effects on buttons (translate arrow icons)
- Keyword tags fade in with delay based on index

**Design Pattern**:
- Two-column max-width layout (4xl)
- Gradient background
- Card-based forms
- Emoji section headers
- Minimalist color scheme
- Smooth state transitions

🖼️ _[Implemented as /define route]_

---

### 🖥️ 3. Scraping Progress Page

**Route**: `/scraping-progress`

**Functionality**:
Real-time monitoring dashboard that displays live scraping progress across multiple subreddits and keywords. Provides detailed status tracking, estimated completion times, and activity logging to keep users informed during the data collection phase.

**Key Features**:

1. **Overall Progress Section**:
   - Master progress bar showing total scraping completion percentage
   - Live statistics: `actualPostsScraped / totalEstimatedPosts`
   - Elapsed time counter (updates every second)
   - Estimated time remaining (ETA) calculation
   - Gradient background with animated shimmer effect on progress bar

2. **Real-time Statistics Grid** (4 stat cards):
   - **Subreddits**: Completed vs Total (e.g., "2/4 completed")
   - **Keywords**: Total searches completed across all subreddits
   - **Posts Found**: Actual posts scraped with percentage vs estimate
   - **Time Remaining**: ETA with elapsed time subtext
   - Each card has icon, color theme, and count-up animation

3. **Subreddit Progress Cards**:
   - Individual card per subreddit with status badge (✅/⚡/⏳)
   - Per-subreddit progress bar
   - Keywords completed count (e.g., "3/5 keywords")
   - Total posts found for that subreddit
   - Live indicator showing currently active keyword search
   - Slide-in animations with staggered delays

4. **Keyword Matrix Breakdown**:
   - Interactive table: Keywords (rows) × Subreddits (columns)
   - Each cell shows:
     - ✅ + post count if completed
     - ⚡ + animated dots if ongoing
     - ⏳ + dash if pending
   - Color-coded cells (green/blue/gray)
   - Sticky table headers for scrolling
   - Hover effects on rows

5. **Live Activity Log**:
   - Terminal-style scrolling feed
   - Timestamped entries (HH:MM:SS format)
   - Entry types with icons:
     - 🔍 Info (starting searches)
     - ✅ Success (completed operations)
     - ⚠️ Warning (rate limits, retries)
     - ❌ Error (failures)
   - Auto-scroll to bottom for new entries
   - Configurable max entries (default: 50)
   - Fade-in animation for new logs

6. **Control Actions**:
   - Pause button (top-right) - Sets scraper status to "paused"
   - Continue to Analysis button (bottom) - Enabled when status = "completed"
   - Back to Overview link (top-left)

**Data Flow & Backend Integration**:

1. **Polling Mechanism**:
   ```typescript
   // Frontend polls every 2 seconds
   useEffect(() => {
     const interval = setInterval(async () => {
       const response = await authFetch(`/scraper/${scraperId}`);
       const scraperData = await response.json();
       updateScraperState(scraperData);
     }, 2000);
     return () => clearInterval(interval);
   }, [scraperId]);
   ```

2. **Progress Calculations**:
   - **Total Estimated Posts**: `subreddits.length × keywords.length × posts_per_keyword`
   - **Actual Posts Scraped**: Sum of all `found_post_ids.length` across all keyword searches
   - **Overall Progress**: `(actualPostsScraped / totalEstimatedPosts) × 100`
   - **ETA Calculation**: `(elapsedTime / currentProgress) - elapsedTime`
   - **Subreddit Progress**: `(completedKeywords / totalKeywords) × 100`

3. **Status Tracking**:
   - Scraper status: `initialized | ongoing | paused | completed | error`
   - Subreddit status: `pending | ongoing | done`
   - Keyword status: `pending | ongoing | done`

4. **Log Generation**:
   - Backend generates log entries during scraping
   - Stored in `scraper_logs` collection with:
     ```typescript
     {
       scraper_id: string,
       timestamp: Date,
       type: 'info' | 'success' | 'warning' | 'error',
       message: string
     }
     ```
   - Frontend fetches recent logs with `/scraper/${scraperId}/logs?limit=50`

**Backend API Requirements**:

```
GET /scraper/:scraper_id
Response: {
  id: string,
  status: StatusType,
  keywords: string[],
  subreddits: string[],
  keyword_search_objective: KeywordSearchObjective,
  posts_per_keyword: number,
  created_at: Date
}

GET /scraper/:scraper_id/logs?limit=50
Response: {
  logs: LogEntry[]
}

PUT /scraper/:scraper_id/pause
Effect: Sets status to "paused", stops scraping worker

PUT /scraper/:scraper_id/resume
Effect: Sets status to "ongoing", resumes scraping worker
```

**Component Architecture**:

Reusable components (fully typed, memoized, composable):
- `ProgressBar.tsx` - Animated progress visualization
- `StatusBadge.tsx` - Status indicators with icons
- `StatCard.tsx` - Metric display cards
- `SubredditProgressCard.tsx` - Individual subreddit tracking
- `KeywordMatrix.tsx` - Grid layout for keyword×subreddit status
- `ActivityLog.tsx` - Scrolling log feed

**Animations**:
- **Shimmer**: Moving highlight on progress bars (2s loop)
- **Count-up**: Numbers scale and fade in when changed
- **Slide-in**: Cards enter from bottom with stagger
- **Pulse**: Ongoing status badges pulsate
- **Ping**: Active searches have expanding ring effect
- **Spin**: Loading spinners on active operations

**Edge Cases & Error Handling**:

1. **Rate Limiting**:
   - Backend detects HTTP 429 from Reddit API
   - Logs warning with retry countdown
   - Automatically resumes after cooldown

2. **Network Failures**:
   - Polling fails: Display "Connection lost" warning
   - Retry logic with exponential backoff
   - Preserve last known state until reconnection

3. **Partial Completion**:
   - Some keywords find 0 posts → Show "0" in matrix
   - Subreddit returns fewer than expected → Adjust ETA dynamically
   - API returns errors → Mark keyword as "error" status

4. **Browser Refresh**:
   - State persisted in database, not localStorage
   - Page reload fetches current scraper state
   - Continue from last position

5. **Long-Running Scrapes**:
   - Session timeout → Scraping continues server-side
   - User can navigate away and return later
   - Progress preserved in database

**User Flow**:

```
Define Page → [Submit Keywords] → Scraping Progress Page (auto-navigate)
                                   ↓ (polling every 2s)
                                   [Backend scraping in background]
                                   ↓ (status updates)
                                   [Progress bars animate]
                                   ↓ (logs appear)
                                   [Activity log scrolls]
                                   ↓ (completion)
                                   [Continue to Analysis] → Sample Page
```

**Performance Optimizations**:

1. **Memoization**: All components wrapped in `React.memo()`
2. **Debounced Updates**: Batch state updates to prevent excessive re-renders
3. **Virtual Scrolling**: Activity log uses windowing for 1000+ entries
4. **Conditional Rendering**: Hide matrix if >50 keywords to prevent lag
5. **Lazy Loading**: Components load on-demand

**Design Pattern**:
- Clean, dashboard-style layout
- Color-coded status system (green=done, blue=active, gray=pending)
- Real-time data visualization
- Mobile-responsive grid layout
- Terminal aesthetic for logs

🖼️ _[Implemented as /scraping-progress route with mock data]_

---

### 🖥️ 4. Historical: Scraping Progress Page (Old Notes)

**Functionality**:
- Live scrape progress bar
- Keyword/Subreddit status
- Reddit API log output

**Design Options**:
1. Terminal-style log with progress indicators
2. Keyword + Subreddit grid with status icons
3. Animated progress steps with ETA countdown

🖼️ _[Insert placeholder]_

---

### 🖥️ 5. Sample Page (Ground Truth Labeling)

**Functionality**:
- Browse through scraped posts and comments in an interactive carousel
- Manually label a subset of messages with ground truth categories
- Filter by subreddit to focus labeling efforts
- Navigate between samples with keyboard shortcuts
- View full Reddit thread context for each message
- Track labeling progress across the dataset

**Key Features**:
- **Horizontal Carousel**: Swipe or scroll through messages with smooth navigation
- **Category Checkboxes**: Multi-select categories for each message:
  - Problem Description
  - Frustration Expression
  - Solution Seeking
  - Solution Attempted
  - Solution Proposing
  - Agreement/Empathy
  - None of the Above
- **Subreddit Filter**: Focus on specific communities for targeted labeling
- **Progress Indicator**: Shows current position (e.g., "47/250")
- **Auto-save**: Ground truth labels are saved immediately to the database
- **Thread Context**: Full parent thread displayed above the target message

**Design Pattern**:
- Card-based carousel with centered focus item
- Navigation arrows and dot indicators
- Sticky header with progress and filters
- Gradient fade on carousel edges for visual polish

🖼️ _[Implemented as /sample route]_

---

### 🖥️ 6. Label Accuracy Viewer Page

**Functionality**:
- Compare LLM predictions against ground truth labels
- Evaluate multiple prompts and models side-by-side
- Track prediction accuracy and consistency across runs
- Identify prompt strengths and weaknesses per category
- Navigate through labeled samples to review performance

**Key Features**:
- **Comparison Table**:
  - Truth column showing ground truth labels (editable)
  - Multiple model/prompt columns showing prediction results
  - Visual consensus bars (e.g., "3/3" runs matched)
  - Color-coded accuracy indicators
- **Performance Metrics**:
  - Overall accuracy percentage per prompt
  - Consistency scores (Perfect/Good/Medium)
  - Highlighted prompts achieving 100% accuracy
- **Interactive Navigation**:
  - Previous/Next sample buttons
  - Sample counter (e.g., "#47/250")
  - Direct navigation to next sample
- **Thread Context Display**: Full Reddit thread shown above analysis
- **Ground Truth Editing**: Click to toggle truth values if corrections needed
- **Reasoning View**: Click 💬 icon to see LLM's reasoning for predictions
- **AI Insights**: Automated analysis comparing prompt performance

**Design Pattern**:
- Clean table layout with fixed header
- Expandable reasoning sections
- Sticky navigation controls
- Truth column with toggle interaction
- Visual feedback for matches/mismatches

**Data Flow**:
1. Fetches all cluster unit entities with predictions and ground truth
2. Groups predictions by prompt_id for comparison
3. Calculates accuracy metrics per prompt
4. Updates cached data when ground truth is modified
5. Preserves changes across navigation

🖼️ _[Implemented as /viewer route]_

---

### 🖥️ 7. LLM Classification Page

**Functionality**:
- View classified comments
- Adjust classification prompt
- Select which categories to keep

**Design Options**:
1. Card stack layout (per message + category)
2. Table view with filters and inline editing
3. Prompt editor sidebar + live preview

🖼️ _[Insert diagram placeholder]_

---

### 🖥️ 8. Synthetic Problem Explorer

**Functionality**:
- View rewritten problem descriptions
- Accept or edit
- Filter based on user labels

**Design Options**:
1. Paginated card gallery
2. Infinite scroll with filters
3. Comparison view: Original vs Synthetic

🖼️ _[Insert placeholder]_

---

### 🖥️ 9. Clustering Evaluation

**Functionality**:
- Show clusters and scores
- Explore example posts
- Select best configuration

**Design Options**:
1. Bar chart of scores + cluster previews
2. List with expandable cluster insights
3. Grid of clusters + LLM rating heatmap

🖼️ _[Insert placeholder]_

---

### 🖥️ 10. Persona Analysis Dashboard

**Functionality**:
- Explore users per cluster
- View Reddit histories
- Show early evangelist scores

**Design Options**:
1. Profile cards + stage meter
2. Timeline view of user activity
3. Cluster vs Persona matrix

🖼️ _[Insert placeholder]_

---

### 🖥️ 11. Final Report Page

**Functionality**:
- Summary of cluster insights
- Visuals of sentiment and engagement
- Exportable insights

**Design Options**:
1. Dashboard-style cards
2. Vertical report with export to PDF
3. Scrollable story narrative view

🖼️ _[Insert placeholder]_

---

## 9. 📌 Success Criteria

- 🔍 Problems surfaced are specific, grounded, and human-sounding
- ⚙️ User feels in control of prompt evolution and filter refinement
- 📊 Clusters are coherent and semantically meaningful
- 🧠 Personas reveal patterns across subreddit behavior
- 📈 Insightful enough to guide product or policy action

---

## 10. 📎 Diagram Placeholders

🖼️ Insert:
- BPMN system flow (from Lucidchart)
- System architecture sketch
- Class relationships (UML)

---



## Prompt variations to for classification
https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/long-context-tips
Use XML tags to wrap the variables for example <reddit_message_to_evaluate>I hate fishes in the water</reddit_message_to_evaluate>