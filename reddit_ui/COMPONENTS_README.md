# React Components Documentation

This document describes all the modular React components created from the label comparison mockup.

## Component Structure

```
src/components/
├── ui/                    # Base UI components
│   ├── Button.tsx
│   ├── Badge.tsx
│   ├── Card.tsx
│   ├── ConsensusBar.tsx
│   ├── ReasoningIcon.tsx
│   ├── InsightBox.tsx
│   └── index.ts
├── thread/                # Thread-related components
│   ├── ThreadBox.tsx
│   ├── ThreadPost.tsx
│   ├── ThreadComment.tsx
│   ├── ThreadTarget.tsx
│   └── index.ts
├── label/                 # Label table components
│   ├── LabelTable.tsx
│   ├── LabelRow.tsx
│   └── index.ts
└── layout/                # Layout components
    ├── PageHeader.tsx
    └── index.ts
```

## UI Components

### Button
A reusable button component with primary and secondary variants.

```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>

<Button variant="secondary">
  Secondary Action
</Button>
```

**Props:**
- `variant?: 'primary' | 'secondary'` - Button style variant
- `children: React.ReactNode` - Button content
- All standard HTML button attributes

### Badge
A label component for displaying status or tags.

```tsx
import { Badge } from '@/components/ui/Badge';

<Badge variant="success">solution_attempted</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>
```

**Props:**
- `variant?: 'default' | 'success' | 'warning' | 'error'` - Badge style
- `children: React.ReactNode` - Badge content

### Card
A simple card container component.

```tsx
import { Card } from '@/components/ui/Card';

<Card>
  <p>Content goes here</p>
</Card>
```

### ConsensusBar
A visual bar showing consensus across multiple runs.

```tsx
import { ConsensusBar } from '@/components/ui/ConsensusBar';

<ConsensusBar value={2} total={3} isPartial={true} />
<ConsensusBar value={3} total={3} />
```

**Props:**
- `value: number` - How many runs matched (0-3)
- `total?: number` - Total runs (default: 3)
- `isPartial?: boolean` - Whether to show warning color

### ReasoningIcon
A clickable icon that expands to show reasoning text.

```tsx
import { ReasoningIcon } from '@/components/ui/ReasoningIcon';

<ReasoningIcon
  reasoning={
    <div>
      <strong>Run 1:</strong> Reasoning text here
    </div>
  }
/>
```

**Props:**
- `reasoning: string | React.ReactNode` - Content to show when expanded
- `className?: string` - Additional CSS classes

### InsightBox
A highlighted box for displaying AI insights or important information.

```tsx
import { InsightBox } from '@/components/ui/InsightBox';

<InsightBox icon="🤖" title="Key Insight:">
  Your insight text here with <strong>formatting</strong>.
</InsightBox>
```

**Props:**
- `icon?: string` - Icon to display (default: '🤖')
- `title?: string` - Box title (default: 'Key Insight (AI Analysis):')
- `children: React.ReactNode` - Box content

## Thread Components

### ThreadBox
Container for thread messages.

```tsx
import { ThreadBox } from '@/components/thread/ThreadBox';

<ThreadBox>
  {/* Thread messages go here */}
</ThreadBox>
```

### ThreadPost
The original post in a thread.

```tsx
import { ThreadPost } from '@/components/thread/ThreadPost';

<ThreadPost
  username="u/username123"
  content="The post content here..."
/>
```

**Props:**
- `username: string` - Reddit username
- `content: string` - Post content

### ThreadComment
A comment/reply in a thread.

```tsx
import { ThreadComment } from '@/components/thread/ThreadComment';

<ThreadComment
  username="u/helper42"
  content="Reply content here..."
/>
```

**Props:**
- `username: string` - Reddit username
- `content: string` - Comment content

### ThreadTarget
The highlighted target message being analyzed.

```tsx
import { ThreadTarget } from '@/components/thread/ThreadTarget';

<ThreadTarget
  username="u/techuser123"
  content="Target message content..."
  label="⭐ ANALYZING THIS REPLY"
/>
```

**Props:**
- `username: string` - Reddit username
- `content: string` - Message content
- `label?: string` - Custom label (default: '⭐ ANALYZING THIS REPLY')

## Label Components

### LabelTable
The main table component for displaying label analysis.

```tsx
import { LabelTable } from '@/components/label/LabelTable';

const models = [
  { name: 'GPT-4', version: 'Prompt v1.2' },
  { name: 'GPT-4', version: 'Prompt v2.0' },
];

const labels = [
  {
    labelName: 'frustration_expression',
    groundTruth: true,
    results: [
      { count: 3, total: 3, isSuccess: true },
      { count: 3, total: 3, isSuccess: true },
    ]
  }
];

const stats = [
  { accuracy: 72, consistency: 'Medium' },
  { accuracy: 100, consistency: 'Perfect', isHighlighted: true },
];

<LabelTable models={models} labels={labels} stats={stats} />
```

**Props:**
- `models: ModelColumn[]` - Array of model configurations
- `labels: LabelData[]` - Array of label data
- `stats?: PerformanceStats[]` - Optional performance statistics

**Types:**
```typescript
interface ModelColumn {
  name: string;
  version: string;
}

interface LabelResult {
  count: number;
  total?: number;
  isWarning?: boolean;
  isSuccess?: boolean;
  reasoning?: string | React.ReactNode;
}

interface LabelData {
  labelName: string;
  groundTruth: boolean;
  results: (LabelResult | null)[];
}

interface PerformanceStats {
  accuracy: number;
  consistency: string;
  isHighlighted?: boolean;
}
```

### LabelRow
Individual row in the label table (used internally by LabelTable).

## Layout Components

### PageHeader
Page header with title and navigation.

```tsx
import { PageHeader } from '@/components/layout/PageHeader';

<PageHeader
  title="Label Accuracy Viewer"
  currentSample={47}
  totalSamples={250}
  onPrevious={() => console.log('Previous')}
  onNext={() => console.log('Next')}
/>
```

**Props:**
- `title: string` - Page title
- `currentSample?: number` - Current sample number
- `totalSamples?: number` - Total number of samples
- `onPrevious?: () => void` - Previous button handler
- `onNext?: () => void` - Next button handler

## Styling

All components use CSS custom properties defined in `src/app/globals.css`. The theme includes:

- Color palette (primary, secondary, muted, accent, status colors)
- Typography (Inter for sans-serif, JetBrains Mono for monospace)
- Shadows and border radius
- Thread-specific colors for visual hierarchy
- Animations (targetPulse, insightAppear, warningPulse, etc.)

## Usage Example

See `src/app/page.tsx` for a complete example of how all components work together.

## Quick Tips

1. **Import from index files** for cleaner imports:
   ```tsx
   import { Button, Badge } from '@/components/ui';
   import { ThreadBox, ThreadPost } from '@/components/thread';
   ```

2. **Client components**: Components with interactivity (ReasoningIcon, page.tsx) use `'use client'` directive.

3. **Customization**: All components accept a `className` prop for additional styling.

4. **Data structure**: The LabelTable expects specific data structures - refer to the types for correct implementation.

5. **Animations**: Animations are defined in globals.css and applied via Tailwind's `animate-[]` utility.
