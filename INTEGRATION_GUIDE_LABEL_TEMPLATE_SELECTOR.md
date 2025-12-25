# LabelTemplateSelector Integration Guide

## Overview
This guide shows how to integrate the `LabelTemplateSelector` component into `experimentsSearchBarResults` to filter experiments by label template.

## Component Breakdown

### What's in the LabelTemplateSelector Component
✅ **Data Fetching**: Automatically fetches label templates by IDs
✅ **Loading State**: Manages its own loading state
✅ **Error Handling**: Shows toast notifications for errors
✅ **Data Transformation**: Converts API data to selector format
✅ **UI Rendering**: Renders the SimpleSelector component

### What Stays in Parent Components
📍 **Label Template IDs Source**: Where the IDs come from (different per parent)
- ViewerTitle: From URL params (`label_template_ids`)
- ExperimentsSearchBarResults: From API (all available templates for the scraper cluster)

📍 **Current Selection**: The selected label template entity
📍 **Selection Side Effects**: What happens after selection (filtering, navigation, etc.)

## Integration Example for ExperimentsSearchBarResults

### Step 1: Add State Management

```typescript
import { LabelTemplateSelector } from "../common/LabelTemplateSelector";
import { LabelTemplateEntity } from "@/types/label-template";

// Add these state variables
const [selectedLabelTemplate, setSelectedLabelTemplate] = useState<LabelTemplateEntity | null>(null);
const [availableLabelTemplateIds, setAvailableLabelTemplateIds] = useState<string[]>([]);
```

### Step 2: Fetch Available Label Template IDs

You have two options:

#### Option A: Fetch ALL label templates (simpler)
```typescript
useEffect(() => {
  async function fetchAllLabelTemplates() {
    try {
      const templates = await labelTemplateApi.getAllLabelTemplates(authFetch);
      setAvailableLabelTemplateIds(templates.map(t => t.id));
    } catch (error) {
      console.error('Failed to fetch label templates:', error);
    }
  }

  fetchAllLabelTemplates();
}, [authFetch]);
```

#### Option B: Extract unique IDs from experiments (recommended)
```typescript
// Add this useMemo after experiments state
const availableLabelTemplateIds = useMemo(() => {
  // Extract unique label template IDs from experiments
  const uniqueIds = Array.from(new Set(
    experiments
      .map(exp => exp.labelTemplateId)
      .filter(id => id) // Remove null/undefined
  ));
  return uniqueIds;
}, [experiments]);
```

### Step 3: Update Filtering Logic

```typescript
// Update the filteredExperiments logic to include label template filter
const filteredExperiments = experiments.filter(experiment => {
  const matchesSearch = experiment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        experiment.model_id.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesModelFilter = filterModel === 'all' || experiment.model_id === filterModel;
  const matchesLabelTemplateFilter = !selectedLabelTemplate ||
                                     experiment.labelTemplateId === selectedLabelTemplate.id;

  return matchesSearch && matchesModelFilter && matchesLabelTemplateFilter;
});
```

### Step 4: Add to UI (in the Actions Bar section)

```typescript
{/* Actions Bar */}
<div className="flex justify-between items-center mb-6 gap-4">
  <div className="flex gap-3 flex-1">
    <Input
      type="text"
      placeholder="Search prompts..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="flex-1 px-3 py-2 border border-(--border) rounded-(--radius)
               bg-background text-foreground text-sm
               focus:outline-none focus:ring-2 focus:ring-(--ring) transition-shadow"
    />

    {/* Model Filter */}
    <select
      value={filterModel}
      onChange={(e) => setFilterModel(e.target.value)}
      className="px-3 py-2 border border-(--border) rounded-(--radius)
               bg-background text-foreground text-sm
               focus:outline-none focus:ring-2 focus:ring-(--ring) cursor-pointer"
    >
      <option value="all">All Models</option>
      {uniqueModels.map(model => (
        <option key={model} value={model}>{model}</option>
      ))}
    </select>

    {/* NEW: Label Template Filter */}
    <LabelTemplateSelector
      labelTemplateIds={availableLabelTemplateIds}
      selectedLabelTemplateId={selectedLabelTemplate?.id}
      onSelect={setSelectedLabelTemplate}
      placeholder="Filter by Template"
      enableSearch={true}
      className="min-w-[200px]"
    />
  </div>

  {/* Global Threshold Selector */}
  <div className="relative" ref={thresholdDropdownRef}>
    {/* ... existing threshold code ... */}
  </div>

  <Button variant="primary" onClick={handleNewExperiment}>
    + New Experiment
  </Button>
</div>
```

### Step 5 (Optional): Server-Side Filtering

If you want to filter on the server side instead of client side:

```typescript
// Update the fetchExperiments function
const experiments = await experimentApi.getExperiments(
  authFetch,
  scraperClusterId,
  undefined,
  globalThreshold,
  filterExperimentType,
  selectedLabelTemplate ? [selectedLabelTemplate.id] : null // Add this parameter
);

// Add selectedLabelTemplate to the useEffect dependencies
useEffect(() => {
  fetchExperiments();
}, [scraperClusterId, authFetch, globalThreshold, selectedLabelTemplate]);
```

## Props Reference

### LabelTemplateSelector Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `labelTemplateIds` | `string[]` | ✅ | Array of label template IDs to fetch and display |
| `selectedLabelTemplateId` | `string \| null` | ❌ | Currently selected label template ID |
| `onSelect` | `(template: LabelTemplateEntity \| null) => void` | ✅ | Callback when selection changes |
| `autoSelectFirst` | `boolean` | ❌ | Auto-select first template if only one available |
| `placeholder` | `string` | ❌ | Placeholder text (default: "Select Label Template") |
| `title` | `string` | ❌ | Title for the selector |
| `className` | `string` | ❌ | Additional CSS classes |
| `enableSearch` | `boolean` | ❌ | Enable search functionality |
| `onLoadingChange` | `(isLoading: boolean) => void` | ❌ | Callback when loading state changes |

## Benefits

✨ **Reusable**: Same component works in ViewerTitle and ExperimentsSearchBarResults
✨ **Clean**: Encapsulates all fetching and transformation logic
✨ **Maintainable**: Changes to label template fetching only need to happen in one place
✨ **Flexible**: Different parents can provide IDs from different sources
✨ **Type-Safe**: Full TypeScript support with proper entity types

## Example Use Cases

### ViewerTitle
- **IDs Source**: URL parameters (`label_template_ids=id1,id2`)
- **Purpose**: Switch between label templates for viewing
- **Auto-select**: Yes (when only one template)

### ExperimentsSearchBarResults
- **IDs Source**: Unique IDs from existing experiments
- **Purpose**: Filter experiments by label template
- **Auto-select**: No (allow viewing all experiments)

### Future: Sample Labeling Page
- **IDs Source**: All available templates from API
- **Purpose**: Select which template to apply for labeling
- **Auto-select**: Maybe (configurable)
