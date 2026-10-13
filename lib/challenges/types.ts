// Challenge from the catalog: scenario, keywords in groups and reference prompt.
export type Challenge = {
  id: string;
  order: number;
  title: string;
  scenario: string;
  // Each group is a set of synonyms; the task requires at least 2 distinct groups.
  keywords: string[][];
  referencePrompt: string;
};
