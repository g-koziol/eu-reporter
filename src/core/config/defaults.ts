import type { AboutCard, AppConfig, ConfigurableOwner, DayField, PageInfo, TimeResolution, WorkAttribute, WorkType } from '../models.js';

export const DEFAULT_TARGET_HOURS = 100;
export const DEFAULT_RESOLUTION: TimeResolution = "minute";
export const DEFAULT_WORK_FROM = "09:00";
export const DEFAULT_WORK_TO = "17:00";
export const DEFAULT_VERSION = 1;
export const STORAGE_KEY = "ewidencjaProjektowa_v1";

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function esc(value: unknown = ""): string {
  const escaped: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(value).replace(/[&<>\"']/g, (char) => escaped[char] || char);
}

export function defaultWorkTypes(): WorkType[] {
  return [
    {
      id: "ops-cooperation",
      name: "Współpraca z OPS",
      defaultValues: { description: "", notes: "", attrs: {}, from: "", to: "" },
      attributes: []
    },
    {
      id: "institution-contact",
      name: "Kontakt z instytucją",
      defaultValues: { description: "", notes: "", attrs: {}, from: "", to: "" },
      attributes: []
    },
    {
      id: "intervention",
      name: "Działania interwencyjne",
      defaultValues: { description: "", notes: "", attrs: {}, from: "", to: "" },
      attributes: []
    },
    {
      id: "admin",
      name: "Praca administracyjno-organizacyjna",
      defaultValues: { description: "", notes: "", attrs: {}, from: "", to: "" },
      attributes: []
    },
    {
      id: "other",
      name: "Inne",
      defaultValues: { description: "", notes: "", attrs: {}, from: "", to: "" },
      attributes: []
    }
  ];
}

export function defaultDayFields(): DayField[] {
  return [
    { id: "area", label: "Obszar działania", type: "textarea", defaultValue: "" },
    { id: "nextPlan", label: "Plan dalszych działań", type: "textarea", defaultValue: "" },
    { id: "risks", label: "Trudności / ryzyka", type: "textarea", defaultValue: "" },
    { id: "notes", label: "Uwagi do dnia", type: "textarea", defaultValue: "" }
  ];
}

export function defaultCollaborationRecordAttributes(): WorkAttribute[] {
  return [
    { id: "person", label: "Osoba / kontakt", type: "textarea", defaultValue: "" },
    { id: "institution", label: "Instytucja / dział", type: "textarea", defaultValue: "" },
    { id: "topic", label: "Temat współpracy", type: "textarea", defaultValue: "" },
    { id: "notes", label: "Uwagi", type: "textarea", defaultValue: "" }
  ];
}

export function defaultCollaborationRecordConfig() {
  return {
    title: "Współpraca z osobami",
    attributes: clone(defaultCollaborationRecordAttributes())
  };
}

export function createProfile(name = "Domyślny profil"): ConfigurableOwner {
  return {
    id: uid("profile"),
    name,
    config: {
      timeResolution: DEFAULT_RESOLUTION,
      workFrom: DEFAULT_WORK_FROM,
      workTo: DEFAULT_WORK_TO,
      cardsPerRow: 2,
      collapseEmptyDaysByDefault: false,
      targetHoursPerMonth: DEFAULT_TARGET_HOURS,
      workTypes: clone(defaultWorkTypes()),
      dayFields: clone(defaultDayFields()),
      collaborationRecords: defaultCollaborationRecordConfig()
    }
  };
}

export function createProject(name = "Domyślny projekt"): ConfigurableOwner {
  return {
    id: uid("project"),
    name,
    config: {
      timeResolution: DEFAULT_RESOLUTION,
      workFrom: DEFAULT_WORK_FROM,
      workTo: DEFAULT_WORK_TO,
      cardsPerRow: 2,
      collapseEmptyDaysByDefault: false,
      targetHoursPerMonth: DEFAULT_TARGET_HOURS,
      workTypes: clone(defaultWorkTypes()),
      dayFields: clone(defaultDayFields()),
      collaborationRecords: defaultCollaborationRecordConfig()
    }
  };
}

export function createDefaultLabels(): Record<string, string> {
  return {
    title: "Ewidencja działań projektowych",
    month: "Miesiąc",
    profile: "Profil",
    project: "Projekt",
    config: "Konfiguracja",
    backToCalendar: "Powrót do kalendarza",
    exportJson: "Eksport JSON",
    exportPdf: "Eksport PDF",
    importJson: "Import JSON",
    clearMonth: "Wyczyść bieżący miesiąc",
    globalSettings: "Ustawienia globalne",
    profileSettings: "Profile",
    projectSettings: "Projekty",
    defaultProfile: "Domyślny profil",
    defaultProject: "Domyślny projekt",
    timeResolution: "Rozdzielczość czasu",
    addProfile: "+ Dodaj profil",
    addProject: "+ Dodaj projekt",
    addWorkType: "+ Dodaj typ wpisu",
    addDayField: "+ Dodaj pole dnia",
    addAttribute: "+ Dodaj atrybut",
    labelSectionTitle: "Teksty i etykiety",
    labelHints: "Ustaw etykiety widocznych sekcji, nagłówków i przycisków.",
    workTypeLabel: "Typ wpisu pracy",
    workTypeDefaultDescription: "Domyślny opis",
    workTypeDefaultNotes: "Domyślne uwagi",
    workTypeAttributes: "Atrybuty typu",
    dayFieldLabel: "Etykieta pola",
    startOfDay: "Zakres dnia od",
    endOfDay: "Zakres dnia do",
    dayArea: "Obszar działania",
    dayPlan: "Plan dalszych działań",
    dayRisks: "Trudności / ryzyka",
    dayNotes: "Uwagi do dnia",
    actionSummary: "Działania w ciągu dnia",
    actionDescription: "Opis działania",
    actionNotes: "Uwagi do działania",
    actionDuration: "Czas działania",
    actionDelete: "Usuń",
    emptyMonth: "Poza wybranym miesiącem",
    defaultActionType: "Typ zapisu",
    pageInfoTitle: "Informacje o stronie",
    pageInfoSummary: "Ta aplikacja służy do ewidencji czasu pracy w ramach projektów i działań. Umożliwia szybkie zapisanie godzin, kontrolę limitu oraz eksport danych do pliku JSON.",
    pageInfoDefaultOwner: "g-koziol",
    pageInfoOwnerUrl: "https://github.com/g-koziol",
    pageInfoFooterText: "© 2026 Ewidencja działań projektowych · Wersja demonstracyjna",
    footerAuthorLabel: "Autor",
    aboutCardsLabel: "Karty o stronie"
  };
}

export function createDefaultAboutCards(): AboutCard[] {
  return [
    {
      id: uid("aboutcard"),
      title: "Planowanie",
      body: "Przeglądaj miesięczne zestawienia i poruszaj się po dniach z poziomym panelem nawigacyjnym."
    },
    {
      id: uid("aboutcard"),
      title: "Kontrola czasu",
      body: "Widzisz wypracowane godziny, pozostały limit i liczbę dodanych działań w każdej chwili."
    },
    {
      id: uid("aboutcard"),
      title: "Bezpieczne dane",
      body: "Wszystkie dane są zapisywane lokalnie w przeglądarce i mogą być łatwo wyeksportowane jako backup."
    }
  ];
}

export function defaultPageInfo(): PageInfo {
  return {
    title: "Informacje o stronie",
    summary: "Ta aplikacja służy do ewidencji czasu pracy w ramach projektów i działań. Umożliwia szybkie zapisanie godzin, kontrolę limitu oraz eksport danych do pliku JSON.",
    ownerName: "g-koziol",
    ownerUrl: "https://github.com/g-koziol",
    footerText: "© 2026 Ewidencja działań projektowych · Wersja demonstracyjna",
    cards: createDefaultAboutCards()
  };
}

export function createDefaultConfig(): AppConfig {
  const profile = createProfile();
  const project = createProject();
  return {
    version: DEFAULT_VERSION,
    labels: createDefaultLabels(),
    pageInfo: defaultPageInfo(),
    global: {
      timeResolution: DEFAULT_RESOLUTION,
      workFrom: DEFAULT_WORK_FROM,
      workTo: DEFAULT_WORK_TO,
      cardsPerRow: 2,
      collapseEmptyDaysByDefault: false,
      targetHoursPerMonth: DEFAULT_TARGET_HOURS,
      workTypes: clone(defaultWorkTypes()),
      dayFields: clone(defaultDayFields()),
      collaborationRecords: defaultCollaborationRecordConfig()
    },
    profiles: [profile],
    projects: [project],
    defaultProfileId: profile.id,
    defaultProjectId: project.id
  };
}
