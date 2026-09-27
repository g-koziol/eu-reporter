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

export function normalizeWorkType(item) {
  if (!item || typeof item !== 'object') return null;
  const attrs = Array.isArray(item.attributes) ? item.attributes.map((attr) => ({
    id: attr && attr.id ? String(attr.id) : uid('attr'),
    label: (attr && attr.label) || (attr && attr.name) || 'Nowy atrybut',
    name: (attr && attr.name) || (attr && attr.label) || 'Nowy atrybut',
    type: 'textarea',
    defaultValue: (attr && attr.defaultValue) || ''
  })) : [];
  const defaultValues = item.defaultValues && typeof item.defaultValues === 'object' ? item.defaultValues : {};
  return {
    id: item.id || uid('worktype'),
    name: item.name || 'Nowy typ',
    defaultValues: {
      description: defaultValues.description || '',
      notes: defaultValues.notes || '',
      from: defaultValues.from || '',
      to: defaultValues.to || '',
      attrs: Object.assign({}, defaultValues.attrs)
    },
    attributes: attrs
  };
}

export function normalizeDayField(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    id: item.id || uid('field'),
    label: item.label || item.name || 'Nowe pole',
    type: 'textarea',
    defaultValue: item.defaultValue || ''
  };
}

export function normalizeConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : createDefaultConfig();
  const defaultLabels = createDefaultLabels();
  const defaultInfo = defaultPageInfo();
  const parseTargetHours = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.max(0, number) : DEFAULT_TARGET_HOURS;
  };

  const normalizeCollaborationAttributes = (value) => {
    if (!Array.isArray(value)) return clone(defaultCollaborationRecordAttributes());
    return value.map((attr) => ({
      id: attr && attr.id ? String(attr.id) : uid('collab-attr'),
      label: (attr && (attr.label || attr.name)) || 'Nowy atrybut',
      name: (attr && (attr.name || attr.label)) || 'Nowy atrybut',
      type: 'textarea',
      defaultValue: (attr && attr.defaultValue) || ''
    }));
  };

  const normalizeCollaborationConfig = (value) => {
    const config = value && typeof value === 'object' ? value : {};
    return {
      title: config.title || 'Współpraca z osobami',
      attributes: normalizeCollaborationAttributes(config.attributes)
    };
  };

  const pageInfo = source.pageInfo && typeof source.pageInfo === 'object' ? source.pageInfo : defaultInfo;
  const normalizeAboutCard = (card) => {
    if (!card || typeof card !== 'object') return null;
    return {
      id: card.id || uid('aboutcard'),
      title: card.title || 'Nowa karta',
      body: card.body || ''
    };
  };

  const pageCards = Array.isArray(pageInfo.cards) ? pageInfo.cards.map(normalizeAboutCard).filter(Boolean) : createDefaultAboutCards();
  const config = {
    version: DEFAULT_VERSION,
    labels: Object.assign({}, defaultLabels, source.labels || {}),
    pageInfo: {
      title: pageInfo.title || defaultInfo.title,
      summary: pageInfo.summary || defaultInfo.summary,
      ownerName: pageInfo.ownerName || defaultInfo.ownerName,
      ownerUrl: pageInfo.ownerUrl || defaultInfo.ownerUrl,
      footerText: pageInfo.footerText || defaultInfo.footerText,
      cards: pageCards.length ? pageCards : createDefaultAboutCards()
    },
    global: {
      timeResolution: source.global && source.global.timeResolution ? source.global.timeResolution : DEFAULT_RESOLUTION,
      workFrom: source.global && source.global.workFrom ? source.global.workFrom : DEFAULT_WORK_FROM,
      workTo: source.global && source.global.workTo ? source.global.workTo : DEFAULT_WORK_TO,
      collapseEmptyDaysByDefault: source.global && typeof source.global.collapseEmptyDaysByDefault === 'boolean' ? source.global.collapseEmptyDaysByDefault : false,
      targetHoursPerMonth: parseTargetHours(source.global && source.global.targetHoursPerMonth),
      workTypes: Array.isArray(source.global && source.global.workTypes) ? source.global.workTypes.map(normalizeWorkType).filter(Boolean) : clone(defaultWorkTypes()),
      dayFields: Array.isArray(source.global && source.global.dayFields) ? source.global.dayFields.map(normalizeDayField).filter(Boolean) : clone(defaultDayFields()),
      collaborationRecords: normalizeCollaborationConfig(source.global && source.global.collaborationRecords)
    },
    profiles: Array.isArray(source.profiles) ? source.profiles.map((profile) => ({
      id: profile.id || uid('profile'),
      name: profile.name || 'Nowy profil',
      config: {
        timeResolution: profile.config && profile.config.timeResolution ? profile.config.timeResolution : DEFAULT_RESOLUTION,
        workFrom: profile.config && profile.config.workFrom ? profile.config.workFrom : DEFAULT_WORK_FROM,
        workTo: profile.config && profile.config.workTo ? profile.config.workTo : DEFAULT_WORK_TO,
        collapseEmptyDaysByDefault: profile.config && typeof profile.config.collapseEmptyDaysByDefault === 'boolean' ? profile.config.collapseEmptyDaysByDefault : false,
        targetHoursPerMonth: parseTargetHours(profile.config && profile.config.targetHoursPerMonth),
        workTypes: Array.isArray(profile.config && profile.config.workTypes) ? profile.config.workTypes.map(normalizeWorkType).filter(Boolean) : clone(defaultWorkTypes()),
        dayFields: Array.isArray(profile.config && profile.config.dayFields) ? profile.config.dayFields.map(normalizeDayField).filter(Boolean) : clone(defaultDayFields()),
        collaborationRecords: normalizeCollaborationConfig(profile.config && profile.config.collaborationRecords)
      }
    })) : [createProfile()],
    projects: Array.isArray(source.projects) ? source.projects.map((project) => ({
      id: project.id || uid('project'),
      name: project.name || 'Nowy projekt',
      config: {
        timeResolution: project.config && project.config.timeResolution ? project.config.timeResolution : DEFAULT_RESOLUTION,
        workFrom: project.config && project.config.workFrom ? project.config.workFrom : DEFAULT_WORK_FROM,
        workTo: project.config && project.config.workTo ? project.config.workTo : DEFAULT_WORK_TO,
        collapseEmptyDaysByDefault: project.config && typeof project.config.collapseEmptyDaysByDefault === 'boolean' ? project.config.collapseEmptyDaysByDefault : false,
        targetHoursPerMonth: parseTargetHours(project.config && project.config.targetHoursPerMonth),
        workTypes: Array.isArray(project.config && project.config.workTypes) ? project.config.workTypes.map(normalizeWorkType).filter(Boolean) : clone(defaultWorkTypes()),
        dayFields: Array.isArray(project.config && project.config.dayFields) ? project.config.dayFields.map(normalizeDayField).filter(Boolean) : clone(defaultDayFields()),
        collaborationRecords: normalizeCollaborationConfig(project.config && project.config.collaborationRecords)
      }
    })) : [createProject()],
    defaultProfileId: source.defaultProfileId || (source.profiles && source.profiles[0] && source.profiles[0].id) || null,
    defaultProjectId: source.defaultProjectId || (source.projects && source.projects[0] && source.projects[0].id) || null
  };

  if (!config.profiles.length) config.profiles.push(createProfile());
  if (!config.projects.length) config.projects.push(createProject());
  if (!config.defaultProfileId) config.defaultProfileId = config.profiles[0].id;
  if (!config.defaultProjectId) config.defaultProjectId = config.projects[0].id;
  if (!config.pageInfo) config.pageInfo = defaultInfo;
  return config;
}
