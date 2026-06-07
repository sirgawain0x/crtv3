export const PREDICTION_CATEGORIES = [
  { value: "creative tv", label: "Creative TV" },
  { value: "songchain", label: "Songchain" },
  { value: "general", label: "General" },
  { value: "technology", label: "Technology" },
  { value: "sports", label: "Sports" },
  { value: "entertainment", label: "Entertainment" },
] as const;

export const ALL_CATEGORIES_VALUE = "all" as const;

export type PredictionCategoryValue =
  (typeof PREDICTION_CATEGORIES)[number]["value"];
