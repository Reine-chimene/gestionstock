export const TYPE_DESTOCKAGE_LABELS = {
  reforme: { label: 'Reforme', variant: 'muted' },
  vente: { label: 'Vente', variant: 'teal' },
  don: { label: 'Don', variant: 'success' },
  casse: { label: 'Casse', variant: 'error' },
  perte: { label: 'Perte', variant: 'warning' },
  vol: { label: 'Vol', variant: 'error' },
  autre: { label: 'Autre', variant: 'muted' },
};

export const ETAT_LABELS = {
  neuf: { label: 'Neuf', variant: 'gold' },
  disponible: { label: 'Disponible', variant: 'success' },
  affecte: { label: 'Affecte', variant: 'teal' },
  en_maintenance: { label: 'Maintenance', variant: 'warning' },
  hors_service: { label: 'Hors service', variant: 'error' },
  reforme: { label: 'Reforme', variant: 'muted' },
};

export const CATEGORIE_LABELS = {
  informatique: 'Informatique',
  mobilier: 'Mobilier',
  vehicule: 'Vehicule',
  equipement_medical: 'Equipement medical',
  bureautique: 'Bureautique',
  electronique: 'Electronique',
  autre: 'Autre',
};

export const TYPE_LIEU_LABELS = {
  lycee: 'Lycee',
  hopital: 'Hopital',
  ecole: 'Ecole',
  service_cro: 'Service CRO',
  commune: 'Commune',
  autre: 'Autre',
};

export const STATUT_AFFECTATION_LABELS = {
  active: { label: 'Active', variant: 'success' },
  terminee: { label: 'Terminee', variant: 'muted' },
  annulee: { label: 'Annulee', variant: 'error' },
};

export const ROLE_LABELS = {
  admin: 'Administrateur',
  gestionnaire: 'Gestionnaire',
  lecteur: 'Lecteur',
};

export const TYPE_MAINTENANCE_LABELS = {
  preventive: 'Preventive',
  corrective: 'Corrective',
  controle: 'Controle',
  reparation: 'Reparation',
  revision: 'Revision',
  nettoyage: 'Nettoyage',
  autre: 'Autre',
};

export const ACTION_LABELS = {
  creation: 'Creation',
  modification: 'Modification',
  suppression: 'Suppression',
  affectation: 'Affectation',
  retour: 'Retour',
  signature: 'Signature',
  photo: 'Capture',
  inventaire: 'Inventaire',
  destockage: 'Destockage',
};

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
