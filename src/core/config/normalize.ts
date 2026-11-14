import {
  DEFAULT_RESOLUTION,
  DEFAULT_TARGET_HOURS,
  DEFAULT_VERSION,
  DEFAULT_WORK_FROM,
  DEFAULT_WORK_TO,
  clone,
  createDefaultAboutCards,
  createDefaultConfig,
  createDefaultLabels,
  createProfile,
  createProject,
  defaultCollaborationRecordAttributes,
  defaultCollaborationRecordConfig,
  defaultDayFields,
  defaultPageInfo,
  defaultWorkTypes,
  uid
} from './defaults.js';
import type { AboutCard, AppConfig, ConfigurableOwner, DayField, PageInfo, SettingsConfig, WorkAttribute, WorkType } from '../models.js';

type LooseRecord = any;

function asRecord(value: unknown): LooseRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : null;
}

function normalizeWorkTypes(value: unknown): WorkType[] {
  return Array.isArray(value)
    ? value.map(normalizeWorkType).filter((item): item is WorkType => item !== null)
    : clone(defaultWorkTypes());
}

function normalizeDayFields(value: unknown): DayField[] {
  return Array.isArray(value)
    ? value.map(normalizeDayField).filter((item): item is DayField => item !== null)
    : clone(defaultDayFields());
}

export function normalizeWorkType(value: unknown): WorkType | null {
  const item = asRecord(value);
  if (!item) return null;
  const rawAttributes: unknown[] = Array.isArray(item.attributes) ? item.attributes : [];
  const attrs: WorkAttribute[] = rawAttributes.map((value) => {
    const attr = asRecord(value) || {};
    return {
      id: attr.id ? String(attr.id) : uid('attr'),
      label: attr.label || attr.name || 'Nowy atrybut',
      name: attr.name || attr.label || 'Nowy atrybut',
      type: 'textarea',
      defaultValue: attr.defaultValue || ''
    };
  });
  const defaultValues = asRecord(item.defaultValues) || {};
  return {
    id: String(item.id || uid('worktype')),
    name: String(item.name || 'Nowy typ'),
    defaultValues: {
      description: String(defaultValues.description || ''),
      notes: String(defaultValues.notes || ''),
      from: String(defaultValues.from || ''),
      to: String(defaultValues.to || ''),
      attrs: { ...(asRecord(defaultValues.attrs) || {}) }
    },
    attributes: attrs
  };
}

export function normalizeDayField(value: unknown): DayField | null {
  const item = asRecord(value);
  if (!item) return null;
  return {
    id: String(item.id || uid('field')),
    label: String(item.label || item.name || 'Nowe pole'),
    type: 'textarea',
    defaultValue: String(item.defaultValue || '')
  };
}

export function normalizeConfig(raw: unknown): AppConfig {
  const source = asRecord(raw) || createDefaultConfig() as unknown as LooseRecord;
  const defaultLabels = createDefaultLabels();
  const defaultInfo = defaultPageInfo();
  const parseTargetHours = (value: unknown): number => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.max(0, number) : DEFAULT_TARGET_HOURS;
  };

  const parseCardsPerRow = (value: unknown): number => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 2;
    return Math.min(6, Math.max(1, Math.round(number)));
  };

  const normalizeCollaborationAttributes = (value: unknown): WorkAttribute[] => {
    if (!Array.isArray(value)) return clone(defaultCollaborationRecordAttributes());
    return (value as unknown[]).map((value) => {
      const attr = asRecord(value) || {};
      return {
        id: attr.id ? String(attr.id) : uid('collab-attr'),
        label: attr.label || attr.name || 'Nowy atrybut',
        name: attr.name || attr.label || 'Nowy atrybut',
        type: 'textarea',
        defaultValue: attr.defaultValue || ''
      };
    });
  };

  const normalizeCollaborationConfig = (value: unknown): SettingsConfig['collaborationRecords'] => {
    const config = asRecord(value) || {};
    return {
      title: config.title || 'Współpraca z osobami',
      attributes: normalizeCollaborationAttributes(config.attributes)
    };
  };

  const pageInfo = asRecord(source.pageInfo) || defaultInfo as unknown as LooseRecord;
  const normalizeAboutCard = (value: unknown): AboutCard | null => {
    const card = asRecord(value);
    if (!card) return null;
    return {
      id: String(card.id || uid('aboutcard')),
      title: String(card.title || 'Nowa karta'),
      body: String(card.body || '')
    };
  };

  const pageCards = Array.isArray(pageInfo.cards)
    ? (pageInfo.cards as unknown[]).map(normalizeAboutCard).filter((card): card is AboutCard => card !== null)
    : createDefaultAboutCards();
  const global = asRecord(source.global) || {};
  const normalizeOwner = (value: unknown, fallbackName: string): ConfigurableOwner => {
    const owner = asRecord(value) || {};
    const settings = asRecord(owner.config) || {};
    return {
      id: String(owner.id || uid('owner')),
      name: String(owner.name || fallbackName),
      config: {
        timeResolution: settings.timeResolution || DEFAULT_RESOLUTION,
        workFrom: settings.workFrom || DEFAULT_WORK_FROM,
        workTo: settings.workTo || DEFAULT_WORK_TO,
        cardsPerRow: parseCardsPerRow(settings.cardsPerRow),
        collapseEmptyDaysByDefault: typeof settings.collapseEmptyDaysByDefault === 'boolean' ? settings.collapseEmptyDaysByDefault : false,
        targetHoursPerMonth: parseTargetHours(settings.targetHoursPerMonth),
        workTypes: normalizeWorkTypes(settings.workTypes),
        dayFields: normalizeDayFields(settings.dayFields),
        collaborationRecords: normalizeCollaborationConfig(settings.collaborationRecords)
      }
    };
  };

  const sourceProfiles: unknown[] = Array.isArray(source.profiles) ? source.profiles : [];
  const sourceProjects: unknown[] = Array.isArray(source.projects) ? source.projects : [];
  const firstProfile = asRecord(sourceProfiles[0]);
  const firstProject = asRecord(sourceProjects[0]);
  const config: AppConfig = {
    version: DEFAULT_VERSION,
    labels: Object.assign({}, defaultLabels, source.labels || {}),
    pageInfo: {
      title: String(pageInfo.title || defaultInfo.title),
      summary: String(pageInfo.summary || defaultInfo.summary),
      ownerName: String(pageInfo.ownerName || defaultInfo.ownerName),
      ownerUrl: String(pageInfo.ownerUrl || defaultInfo.ownerUrl),
      footerText: String(pageInfo.footerText || defaultInfo.footerText),
      cards: pageCards.length ? pageCards : createDefaultAboutCards()
    },
    global: {
      timeResolution: global.timeResolution || DEFAULT_RESOLUTION,
      workFrom: global.workFrom || DEFAULT_WORK_FROM,
      workTo: global.workTo || DEFAULT_WORK_TO,
      cardsPerRow: parseCardsPerRow(global.cardsPerRow),
      collapseEmptyDaysByDefault: typeof global.collapseEmptyDaysByDefault === 'boolean' ? global.collapseEmptyDaysByDefault : false,
      targetHoursPerMonth: parseTargetHours(global.targetHoursPerMonth),
      workTypes: normalizeWorkTypes(global.workTypes),
      dayFields: normalizeDayFields(global.dayFields),
      collaborationRecords: normalizeCollaborationConfig(global.collaborationRecords)
    },
    profiles: sourceProfiles.length ? sourceProfiles.map((profile) => normalizeOwner(profile, 'Nowy profil')) : [createProfile()],
    projects: sourceProjects.length ? sourceProjects.map((project) => normalizeOwner(project, 'Nowy projekt')) : [createProject()],
    defaultProfileId: String(source.defaultProfileId || firstProfile?.id || ''),
    defaultProjectId: String(source.defaultProjectId || firstProject?.id || '')
  };

  if (!config.profiles.length) config.profiles.push(createProfile());
  if (!config.projects.length) config.projects.push(createProject());
  if (!config.defaultProfileId) config.defaultProfileId = config.profiles[0].id;
  if (!config.defaultProjectId) config.defaultProjectId = config.projects[0].id;
  if (!config.pageInfo) config.pageInfo = defaultInfo;
  return config;
}
