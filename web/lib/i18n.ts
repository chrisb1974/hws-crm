/**
 * Libelles de l'interface. Un seul dictionnaire pour l'instant (`fr`) mais la
 * forme est deja celle d'une bascule EN : ajouter `en` avec les memes cles et
 * changer LOCALE suffira, aucun libelle n'est ecrit en dur dans les composants.
 */

const fr = {
  appName: "CRM HWS",
  nav: {
    properties: "Établissements",
    signOut: "Se déconnecter",
  },
  login: {
    title: "CRM HWS",
    subtitle: "Connexion par lien magique",
    emailLabel: "Adresse e-mail professionnelle",
    emailPlaceholder: "prenom@hospitalitywebservices.com",
    submit: "Recevoir le lien de connexion",
    submitting: "Envoi en cours…",
    sent: "Lien envoyé. Ouvrez votre boîte mail et cliquez sur le lien pour vous connecter.",
    sentAgain: "Renvoyer un lien",
    genericError: "L'envoi a échoué. Vérifiez l'adresse et réessayez.",
    linkExpired: "Ce lien de connexion est expiré ou a déjà été utilisé. Demandez-en un nouveau.",
    signedOut: "Vous êtes déconnecté.",
  },
  list: {
    title: "Établissements",
    countOne: "établissement",
    countMany: "établissements",
    searchPlaceholder: "Rechercher un nom, un code, une ville, un fournisseur…",
    searchHint: "/",
    searchLabel: "Recherche",
    clearSearch: "Effacer la recherche",
    filters: "Filtres",
    clearFilters: "Effacer tout",
    noResult: "Aucun établissement ne correspond.",
    noResultHint: "Élargissez la recherche ou effacez les filtres.",
    loadError: "Les données n'ont pas pu être chargées.",
    emptyAuth:
      "Aucune ligne visible. Votre compte n'a peut-être pas encore de rôle actif dans l'application.",
  },
  columns: {
    code: "Code",
    property: "Établissement",
    city: "Ville",
    type: "Type",
    rooms: "Chambres",
    status: "Statut",
    stack: "Stack",
    rolesCovered: "Rôles",
    renewal: "Prochain renouvellement",
    overdue: "Dépassé depuis",
    owner: "Commercial",
    select: "Sélection",
  },
  filters: {
    country: "Pays",
    city: "Ville",
    type: "Type",
    status: "Statut",
    vendor: "Fournisseur",
    missingRole: "Rôle non couvert",
    owner: "Commercial",
    all: "Tous",
    allF: "Toutes",
  },
  views: {
    all: "Tous",
    hotelrunner: "Actifs HotelRunner",
    centra: "Actifs Centra",
    gosiyaha: "Sous subvention Go Siyaha",
    mghNoBeCm: "MGH sans moteur ni CM",
    rival: "Stacks concurrents",
    renewal60: "Renouvellements à 60 jours",
    overdue: "Échéances dépassées",
    noStack: "Sans stack",
  },
  lifecycle: {
    active: "Actif",
    program_only: "Programme seul",
    prospect: "Prospect",
    onboarding: "Onboarding",
    suspended: "Suspendu",
    churned: "Résilié",
  } as Record<string, string>,
  roles: {
    CRS: "CRS",
    PMS: "PMS",
    CM: "CM",
    BE: "BE",
    SITE: "SITE",
    PAYMENT: "PAY",
    ADDON: "ADD",
    SERVICE: "SRV",
  } as Record<string, string>,
  rolesLong: {
    CRS: "CRS",
    PMS: "PMS",
    CM: "Channel manager",
    BE: "Moteur de réservation",
    SITE: "Site web",
    PAYMENT: "Paiement",
    ADDON: "Option",
    SERVICE: "Service",
  } as Record<string, string>,
  stack: {
    hws: "vendu par HWS",
    rival: "concurrent",
    empty: "non couvert",
    legendHws: "Vendu par HWS",
    legendRival: "Concurrent constaté",
    legendEmpty: "Rôle vide",
  },
  renewal: {
    toFill: "à renseigner",
    overdue: (days: number) => `dépassé de ${days} j`,
    inDays: (days: number) => `J-${days}`,
    today: "aujourd'hui",
  },
  selection: {
    countOne: "établissement sélectionné",
    countMany: "établissements sélectionnés",
    clear: "Tout désélectionner",
    selectAllFiltered: (n: number) => `Sélectionner les ${n} résultats`,
    setRenewal: "Poser une date de renouvellement",
    assignProject: "Assigner à un projet",
    export: "Exporter",
    notYet: (action: string, n: number) =>
      `${action} : ${n} établissement(s) retenu(s). L'écriture en base arrivera avec l'écran suivant.`,
    exported: (n: number) => `Export CSV de ${n} établissement(s) généré.`,
  },
  pagination: {
    range: (from: number, to: number, total: number) => `${from}–${to} sur ${total}`,
    previous: "Page précédente",
    next: "Page suivante",
    page: (n: number) => `Page ${n}`,
  },
  sort: {
    ascending: "croissant",
    descending: "décroissant",
  },
} as const;

export type Dictionary = typeof fr;

const dictionaries = { fr } satisfies Record<string, Dictionary>;

export const LOCALE: keyof typeof dictionaries = "fr";

export const t: Dictionary = dictionaries[LOCALE];
