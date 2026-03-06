import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

export const THERAPEUTIC_MAPPING: Record<string, string> = {
  'oxime': 'Antibiotics',
  'in': 'Antibiotics',
  'pril': 'B.P.',
  'tan': 'B.P.',
  'dipine': 'B.P.',
  'lol': 'B.P.',
  'sartan': 'B.P.',
  'formin': 'Diabetic',
  'glitazone': 'Diabetic',
  'gliptin': 'Diabetic',
  'prazole': 'Antacids/Gastro',
  'tidine': 'Antacids/Gastro',
  'mab': 'Monoclonal Antibody',
  'vir': 'Antiviral',
  'stat': 'Cholesterol',
  'statin': 'Cholesterol',
  'one': 'Steroid',
  'asone': 'Steroid',
  'olone': 'Steroid',
  'ide': 'Diuretic/Diabetic',
  'pine': 'B.P.',
  'zole': 'Antifungal/Antacid',
  'cillin': 'Antibiotics',
  'cycline': 'Antibiotics',
  'mycin': 'Antibiotics',
  'floxacin': 'Antibiotics',
  'azole': 'Antifungal',
  'triptan': 'Migraine',
  'barbital': 'Sedative',
  'pam': 'Anxiety',
  'lam': 'Anxiety',
  'setron': 'Anti-emetic',
};

export function suggestSubCategory(productName: string): string | undefined {
  const name = productName.toLowerCase();
  
  // Check for exact matches or common patterns
  if (name.includes('sugar') || name.includes('diabetic') || name.includes('insulin')) return 'Diabetic';
  if (name.includes('bp') || name.includes('pressure') || name.includes('hypertension')) return 'B.P.';
  if (name.includes('infection') || name.includes('antibiotic')) return 'Antibiotics';
  if (name.includes('gastric') || name.includes('acidity') || name.includes('antacid')) return 'Antacids/Gastro';

  // Check suffixes/prefixes
  for (const [pattern, group] of Object.entries(THERAPEUTIC_MAPPING)) {
    if (name.endsWith(pattern) || name.includes(pattern)) {
      return group;
    }
  }
  
  return undefined;
}
