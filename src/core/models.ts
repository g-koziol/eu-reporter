export type TimeResolution = 'minute' | '30m' | 'hour';

export interface WorkAttribute {
  id: string;
  label: string;
  name?: string;
  type: 'textarea';
  defaultValue: string;
}

export interface WorkType {
  id: string;
  name: string;
  defaultValues: {
    description: string;
    notes: string;
    from: string;
    to: string;
    attrs: Record<string, string>;
  };
  attributes: WorkAttribute[];
}

export interface DayField {
  id: string;
  label: string;
  type: 'textarea';
  defaultValue: string;
}

export interface CollaborationConfig {
  title: string;
  attributes: WorkAttribute[];
}

export interface SettingsConfig {
  timeResolution: string;
  workFrom: string;
  workTo: string;
  cardsPerRow: number;
  collapseEmptyDaysByDefault: boolean;
  targetHoursPerMonth: number;
  workTypes: WorkType[];
  dayFields: DayField[];
  collaborationRecords: CollaborationConfig;
}

export interface ConfigurableOwner {
  id: string;
  name: string;
  config: SettingsConfig;
}

export interface AboutCard {
  id: string;
  title: string;
  body: string;
}

export interface PageInfo {
  title: string;
  summary: string;
  ownerName: string;
  ownerUrl: string;
  footerText: string;
  cards: AboutCard[];
}

export interface AppConfig {
  version: number;
  labels: Record<string, string>;
  pageInfo: PageInfo;
  global: SettingsConfig;
  profiles: ConfigurableOwner[];
  projects: ConfigurableOwner[];
  defaultProfileId: string;
  defaultProjectId: string;
}

export interface ActionRecord {
  workType: string;
  from?: string;
  to?: string;
  description?: string;
  notes?: string;
  attrs?: Record<string, string>;
}

export interface DayRecord {
  [key: string]: unknown;
  workFrom?: string;
  workTo?: string;
  workRangeAuto?: boolean;
  area?: string;
  nextPlan?: string;
  risks?: string;
  notes?: string;
  extra?: Record<string, string>;
  actions?: ActionRecord[];
  collaborationRecords?: Array<{ attrs: Record<string, string> }>;
  collapsed?: boolean;
}

export interface AppDatabase {
  version: number;
  config: AppConfig;
  months: Record<string, unknown>;
}

export interface ProjectDictionary {
  id: string;
  projectId: string;
  fieldKey: string;
  values: string[];
}

export interface PdfReportContext {
  currentMonth: string;
  getEffectiveConfig: () => SettingsConfig;
  getSelectedProfile: () => ConfigurableOwner | null | undefined;
  getSelectedProject: () => ConfigurableOwner | null | undefined;
  getLabels: () => Record<string, string>;
  ensureDay: (date: string) => DayRecord;
  getMonthTargetHours: () => number;
  formatPdfDate?: (date: string) => string;
  esc?: (value: string) => string;
  monthGridFn?: (month: string) => Date[];
  isoFn?: (date: Date) => string;
}

export interface PdfTitleContext {
  currentMonth: string;
  getSelectedProject: () => Pick<ConfigurableOwner, 'name'> | null | undefined;
  getSelectedProfile: () => Pick<ConfigurableOwner, 'name'> | null | undefined;
}