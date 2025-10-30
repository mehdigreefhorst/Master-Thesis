
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

1. User logs in or signs up
2. Inputs topic + subreddit
3. System suggests related subreddits via external persona graph  (or add link to the respective website)
4. LLM generates keywords
5. User edits keywords
6. Reddit scraping begins (progress bar shown)
7. Scraped Post and comments are classified by LLM (you can see the prompt with how it will do this. You can see examples of how the LLM is doing this step). So you can interactively see how the system is doing the task at hand. When you are happy with the results. You can lock it in. then the complete dataset will be labeled. Possible supercharging of this step through massive parallelization. Or cheaply using batch API?
8. User edits filter + prompt. This
9. LLM rewrites selected posts into problem descriptions
10. BERTopic clustering with LLM evaluation
11. User selects best cluster config
12. Persona profiling from user history
13. Final dashboard displays cluster insights

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
POST /clustering/prepare_cluster       # Flattens nested Reddit data
POST /clustering/enrich_cluster_text  # Creates synthetic messages
POST /clustering/assign_units         # Runs BERTopic clustering
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

---

## 8. 📄 UI Pages & Concepts

Each screen includes 3 design options for layout and structure.

---

### 🖥️ 1. Landing/Login Page

**Functionality**:
- Log in
- Register
- Redirect to dashboard

**Design Options**:
1. Split screen (Form left / Hero text right)
2. Modal form on blurred background
3. Full-page form with testimonial footer

🖼️ _[Insert wireframe or BPMN diagram placeholder here]_

---

### 🖥️ 2. Topic Input + Subreddit Selector

**Functionality**:
- Enter topic text
- Select subreddit
- Show suggested related subreddits

**Design Options**:
1. Wizard stepper layout
2. Sidebar input form + preview panel
3. Central card form with chips for related subreddits

🖼️ _[Insert diagram placeholder]_

---

### 🖥️ 3. Keyword Refinement Page

**Functionality**:
- Display AI-generated keywords
- Add/edit/remove terms
- Preview scrape volume estimate

**Design Options**:
1. Dual-column: LLM suggestions vs Final list
2. Editable table with ranking
3. Tag editor with search autocomplete

🖼️ _[Insert wireframe placeholder]_

---

### 🖥️ 4. Scraping Progress Page

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

### 🖥️ 5. LLM Classification Page

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

### 🖥️ 6. Synthetic Problem Explorer

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

### 🖥️ 7. Clustering Evaluation

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

### 🖥️ 8. Persona Analysis Dashboard

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

### 🖥️ 9. Final Report Page

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

