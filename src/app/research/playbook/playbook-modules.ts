import {
  BarChart3,
  BookOpenText,
  FileCheck2,
  FlaskConical,
  LibraryBig,
  PencilLine,
  type LucideIcon,
} from 'lucide-react';

export type ModuleStatus = 'ready' | 'in-progress' | 'coming-soon';

export type PlaybookModule = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate';
  status: ModuleStatus;
  route: string;
  comingSoonMessage: string;
  expectedTopics: string[];
};

export const playbookModules: PlaybookModule[] = [
  {
    id: 'idea-generation',
    title: 'Idea Generation',
    description: 'Turn an interesting clinical observation into a focused, publishable research question.',
    icon: FlaskConical,
    duration: '20 min',
    difficulty: 'Beginner',
    status: 'coming-soon',
    route: '/research/idea-to-irb',
    comingSoonMessage: 'A practical path from clinical curiosity to a feasible research protocol.',
    expectedTopics: ['PICO question development', 'Feasibility and novelty checks', 'Endpoints, study design, and protocol planning'],
  },
  {
    id: 'literature-review',
    title: 'Literature Review',
    description: 'Search efficiently, assess novelty, organize citations, and critically evaluate the evidence.',
    icon: LibraryBig,
    duration: '35 min',
    difficulty: 'Intermediate',
    status: 'in-progress',
    route: '/research/lit-review',
    comingSoonMessage: 'Build a rigorous, repeatable approach to understanding the existing evidence.',
    expectedTopics: ['Search strategy', 'Screening and evidence mapping', 'Citation organization'],
  },
  {
    id: 'introduction',
    title: 'Introduction',
    description: 'Build a concise argument that establishes importance, identifies the gap, and states your aim.',
    icon: PencilLine,
    duration: '25 min',
    difficulty: 'Beginner',
    status: 'ready',
    route: '/research/introduction',
    comingSoonMessage: 'Learn the structure behind a clear and persuasive manuscript introduction.',
    expectedTopics: ['The four-paragraph framework', 'From evidence gap to objective', 'Clear academic writing'],
  },
  {
    id: 'methods',
    title: 'Methods',
    description: 'Design reproducible methods, choose variables, and create a clean plan for data collection.',
    icon: FileCheck2,
    duration: '40 min',
    difficulty: 'Intermediate',
    status: 'coming-soon',
    route: '/research/methods',
    comingSoonMessage: 'Translate your research question into a study another researcher could reproduce.',
    expectedTopics: ['Study design and cohorts', 'Variables and data dictionaries', 'Bias, missingness, and reproducibility'],
  },
  {
    id: 'stats-basics',
    title: 'Stats Basics',
    description: 'Choose appropriate tests, interpret results, and avoid the most common statistical pitfalls.',
    icon: BarChart3,
    duration: '45 min',
    difficulty: 'Intermediate',
    status: 'coming-soon',
    route: '/research/stats',
    comingSoonMessage: 'Develop the statistical intuition needed to plan and interpret clinical research.',
    expectedTopics: ['Choosing a statistical test', 'Effect sizes and confidence intervals', 'Regression and common pitfalls'],
  },
  {
    id: 'formatting',
    title: 'Formatting',
    description: 'Prepare polished tables, figures, references, and a submission-ready manuscript.',
    icon: BookOpenText,
    duration: '25 min',
    difficulty: 'Beginner',
    status: 'coming-soon',
    route: '/research/writing',
    comingSoonMessage: 'Turn a finished draft into a clear, consistent, journal-ready submission.',
    expectedTopics: ['Manuscript and reference formatting', 'Tables and figures', 'Journal requirements and submission checks'],
  },
];
