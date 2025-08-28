export interface OptionsItem {
  name: string;
  icon: string;
  fn?: (item: OptionsItem) => void;
}

export type OptionsData = Record<string, readonly OptionsItem[]>;
