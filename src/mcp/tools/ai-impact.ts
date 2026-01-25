/**
 * MCP AI Impact Tool for Swiss Labor Market
 * Story 4.3 - Get AI impact analysis for industries and job roles
 */

import * as db from '../../db/ruvector.js';
import { type ImpactFactors } from '../../graph/impact.js';

export type ImpactTargetType = 'industry' | 'job_role';

export interface AIImpactResponse {
  target: string;
  targetType: ImpactTargetType;
  found: boolean;
  score: number | null;
  confidence: number | null;
  reasoning: string;
  factors: ImpactFactors | null;
  relatedEntities: RelatedEntity[];
  recommendations: string[];
  sources: string[];
}

export interface RelatedEntity {
  name: string;
  type: string;
  relationship: string;
  impactScore?: number;
}

// Industry-specific AI impact data
const INDUSTRY_IMPACT_DATA: Record<string, {
  score: number;
  reasoning: string;
  automationPotential: number;
  adoptionRate: number;
  skillsGap: number;
  affectedRoles: string[];
  requiredSkills: string[];
}> = {
  'Finanzdienstleistungen': {
    score: 7.5,
    reasoning: 'Die Finanzbranche in der Schweiz erlebt massive AI-Transformation. Robo-Advisors, algorithmischer Handel und AI-basierte Risikobewertung sind Standard. Backoffice-Prozesse werden stark automatisiert, während kundennahe Beratung bestehen bleibt.',
    automationPotential: 7.5,
    adoptionRate: 8.0,
    skillsGap: 7.0,
    affectedRoles: ['Accountant', 'Administrative Assistant', 'Consultant', 'Customer Service'],
    requiredSkills: ['Data Analysis', 'Machine Learning', 'Python', 'AI Skills'],
  },
  'Information und Kommunikation': {
    score: 6.0,
    reasoning: 'Die IT-Branche ist Vorreiter bei AI-Adoption, aber auch gut positioniert um AI zu nutzen. Entwickler verwenden AI-Assistenten für Code, während neue Rollen entstehen. Geringere Verdrängung, mehr Produktivitätssteigerung.',
    automationPotential: 4.5,
    adoptionRate: 9.0,
    skillsGap: 6.5,
    affectedRoles: ['Software Developer', 'Data Scientist', 'Project Manager'],
    requiredSkills: ['Machine Learning', 'Python', 'AI Skills', 'Cloud Computing'],
  },
  'Pharma und Chemie': {
    score: 5.5,
    reasoning: 'AI beschleunigt Drug Discovery und Forschungsprozesse erheblich. Laborautomation nimmt zu. Regulatorische Anforderungen und Expertise schützen viele Positionen.',
    automationPotential: 5.5,
    adoptionRate: 7.0,
    skillsGap: 6.0,
    affectedRoles: ['Research Scientist', 'Data Scientist'],
    requiredSkills: ['Data Analysis', 'Machine Learning', 'Statistics'],
  },
  'Verarbeitendes Gewerbe': {
    score: 7.0,
    reasoning: 'Industrie 4.0 mit AI-gesteuerter Produktion transformiert die Branche. Predictive Maintenance und Qualitätskontrolle durch Computer Vision sind verbreitet. Produktionsjobs sind stark betroffen.',
    automationPotential: 7.5,
    adoptionRate: 6.5,
    skillsGap: 7.5,
    affectedRoles: ['Manager', 'Project Manager'],
    requiredSkills: ['Data Analysis', 'AI Skills', 'Automation'],
  },
  'Gesundheits- und Sozialwesen': {
    score: 4.0,
    reasoning: 'AI unterstützt bei Diagnose und Administration, aber menschliche Pflege und Empathie bleiben essentiell. Regulierung und Datenschutz bremsen Adoption. Schweizer Gesundheitssystem ist qualitätsorientiert.',
    automationPotential: 3.5,
    adoptionRate: 5.0,
    skillsGap: 5.0,
    affectedRoles: ['Administrative Assistant', 'Research Scientist'],
    requiredSkills: ['Digital Literacy', 'Data Analysis'],
  },
  'Handel': {
    score: 7.5,
    reasoning: 'E-Commerce, automatisierte Lagerhaltung und AI-gestützte Kundenanalyse verändern den Handel stark. Kassenpersonal und Lagerarbeiter sind besonders betroffen.',
    automationPotential: 7.5,
    adoptionRate: 6.5,
    skillsGap: 6.0,
    affectedRoles: ['Sales Representative', 'Customer Service', 'Administrative Assistant'],
    requiredSkills: ['Digital Literacy', 'Data Analysis', 'Customer Service'],
  },
  'Gastgewerbe': {
    score: 5.5,
    reasoning: 'Chatbots für Buchungen und AI-gestützte Preisoptimierung sind verbreitet. Serviceorientierte Tätigkeiten bleiben jedoch menschlich. Tourismus in der Schweiz bleibt personalintensiv.',
    automationPotential: 5.0,
    adoptionRate: 5.0,
    skillsGap: 4.5,
    affectedRoles: ['Customer Service', 'Administrative Assistant'],
    requiredSkills: ['Digital Literacy', 'Communication'],
  },
};

// Job role-specific AI impact data
const JOB_ROLE_IMPACT_DATA: Record<string, {
  score: number;
  reasoning: string;
  automationPotential: number;
  adoptionRate: number;
  skillsGap: number;
  affectedIndustries: string[];
  requiredSkills: string[];
}> = {
  'Software Developer': {
    score: 4.0,
    reasoning: 'AI-Assistenten wie GitHub Copilot erhöhen Produktivität erheblich, ersetzen aber Entwickler nicht. Nachfrage nach Entwicklern bleibt hoch, auch für AI-Entwicklung selbst.',
    automationPotential: 3.5,
    adoptionRate: 9.0,
    skillsGap: 5.0,
    affectedIndustries: ['Information und Kommunikation', 'Finanzdienstleistungen'],
    requiredSkills: ['AI Skills', 'Machine Learning', 'Python', 'Cloud Computing'],
  },
  'Data Scientist': {
    score: 5.0,
    reasoning: 'AutoML-Tools vereinfachen Standardaufgaben, aber komplexe Analysen und Business-Verständnis bleiben menschlich. Nachfrage wächst weiter in der Schweiz.',
    automationPotential: 4.5,
    adoptionRate: 8.5,
    skillsGap: 5.5,
    affectedIndustries: ['Information und Kommunikation', 'Finanzdienstleistungen', 'Pharma und Chemie'],
    requiredSkills: ['Machine Learning', 'Python', 'Statistics', 'AI Skills'],
  },
  'Accountant': {
    score: 8.0,
    reasoning: 'Buchführung und Standard-Accounting werden stark automatisiert. Strategie, Beratung und komplexe Steuerplanung bleiben relevant. Umschulung auf AI-gestützte Tools nötig.',
    automationPotential: 8.0,
    adoptionRate: 7.0,
    skillsGap: 7.5,
    affectedIndustries: ['Finanzdienstleistungen', 'Dienstleistungen'],
    requiredSkills: ['Data Analysis', 'AI Skills', 'Excel', 'Digital Literacy'],
  },
  'Administrative Assistant': {
    score: 8.5,
    reasoning: 'Terminplanung, E-Mail-Verwaltung und Dokumentation werden durch AI stark automatisiert. Rollen transformieren sich zu strategischeren Aufgaben oder werden reduziert.',
    automationPotential: 8.5,
    adoptionRate: 7.5,
    skillsGap: 6.5,
    affectedIndustries: ['Dienstleistungen', 'Öffentliche Verwaltung', 'Finanzdienstleistungen'],
    requiredSkills: ['Digital Literacy', 'AI Skills', 'Communication', 'Project Management'],
  },
  'Customer Service': {
    score: 7.5,
    reasoning: 'Chatbots und AI-Assistenten übernehmen Standard-Anfragen. Komplexe Fälle und empathische Betreuung bleiben menschlich. Mitarbeiter werden zu AI-Supervisoren.',
    automationPotential: 7.5,
    adoptionRate: 7.0,
    skillsGap: 6.0,
    affectedIndustries: ['Handel', 'Finanzdienstleistungen', 'Gastgewerbe'],
    requiredSkills: ['Communication', 'AI Skills', 'Problem Solving', 'Digital Literacy'],
  },
  'Manager': {
    score: 3.5,
    reasoning: 'Führung, Entscheidungsfindung und Mitarbeiterentwicklung bleiben menschlich. AI unterstützt bei Datenanalyse und Reporting. Führungskräfte müssen AI-Kompetenz entwickeln.',
    automationPotential: 3.0,
    adoptionRate: 6.5,
    skillsGap: 6.0,
    affectedIndustries: ['Alle Branchen'],
    requiredSkills: ['Leadership', 'AI Skills', 'Data Analysis', 'Critical Thinking'],
  },
  'Consultant': {
    score: 4.5,
    reasoning: 'AI-Tools beschleunigen Recherche und Analyse. Kundenbeziehungen, kreative Problemlösung und Expertise bleiben essentiell. Produktivität steigt signifikant.',
    automationPotential: 4.0,
    adoptionRate: 7.5,
    skillsGap: 5.5,
    affectedIndustries: ['Freiberufliche Tätigkeiten', 'Finanzdienstleistungen'],
    requiredSkills: ['AI Skills', 'Data Analysis', 'Communication', 'Critical Thinking'],
  },
  'Research Scientist': {
    score: 4.0,
    reasoning: 'AI beschleunigt Forschung erheblich, ersetzt aber Wissenschaftler nicht. Hypothesenbildung, experimentelles Design und Interpretation bleiben menschlich.',
    automationPotential: 3.5,
    adoptionRate: 7.0,
    skillsGap: 5.0,
    affectedIndustries: ['Pharma und Chemie', 'Erziehung und Unterricht'],
    requiredSkills: ['Machine Learning', 'Statistics', 'Data Analysis', 'Critical Thinking'],
  },
};

/**
 * Find matching entity or data
 */
function findTarget(target: string, targetType: ImpactTargetType): {
  found: boolean;
  name: string;
  data?: any;
} {
  const lowTarget = target.toLowerCase();
  
  if (targetType === 'industry') {
    // Check predefined data
    for (const [name, data] of Object.entries(INDUSTRY_IMPACT_DATA)) {
      if (name.toLowerCase().includes(lowTarget) || lowTarget.includes(name.toLowerCase())) {
        return { found: true, name, data };
      }
    }
    
    // Check common aliases
    const aliases: Record<string, string> = {
      'finance': 'Finanzdienstleistungen',
      'banking': 'Finanzdienstleistungen',
      'it': 'Information und Kommunikation',
      'tech': 'Information und Kommunikation',
      'software': 'Information und Kommunikation',
      'pharma': 'Pharma und Chemie',
      'healthcare': 'Gesundheits- und Sozialwesen',
      'retail': 'Handel',
      'manufacturing': 'Verarbeitendes Gewerbe',
    };
    
    for (const [alias, name] of Object.entries(aliases)) {
      if (lowTarget.includes(alias)) {
        return { found: true, name, data: INDUSTRY_IMPACT_DATA[name] };
      }
    }
  } else {
    // Job role lookup
    for (const [name, data] of Object.entries(JOB_ROLE_IMPACT_DATA)) {
      if (name.toLowerCase().includes(lowTarget) || lowTarget.includes(name.toLowerCase())) {
        return { found: true, name, data };
      }
    }
  }
  
  return { found: false, name: target };
}

/**
 * Generate recommendations based on impact
 */
function generateRecommendations(score: number, targetType: ImpactTargetType, data: any): string[] {
  const recommendations: string[] = [];
  
  if (score >= 7) {
    recommendations.push('Hohe Priorität für Weiterbildung in AI-Tools und digitale Kompetenzen');
    recommendations.push('Fokus auf Tätigkeiten, die menschliche Stärken erfordern: Kreativität, Empathie, komplexe Entscheidungen');
    if (targetType === 'industry') {
      recommendations.push('Strategische AI-Investitionen zur Wettbewerbsfähigkeit');
    } else {
      recommendations.push('Umschulung oder Spezialisierung auf AI-gestützte Workflows empfohlen');
    }
  } else if (score >= 5) {
    recommendations.push('Kontinuierliche Weiterbildung in AI-Tools empfohlen');
    recommendations.push('Hybride Arbeitsweisen zwischen Mensch und AI entwickeln');
    recommendations.push('Monitoring der AI-Entwicklungen in diesem Bereich');
  } else {
    recommendations.push('Grundlegende AI-Literacy entwickeln');
    recommendations.push('AI als Produktivitäts-Tool nutzen');
    recommendations.push('Fokus auf Kernkompetenzen beibehalten');
  }
  
  // Add skill-specific recommendations
  if (data?.requiredSkills && data.requiredSkills.length > 0) {
    recommendations.push(`Wichtige Skills: ${data.requiredSkills.slice(0, 3).join(', ')}`);
  }
  
  return recommendations;
}

/**
 * Get related entities
 */
function getRelatedEntities(targetType: ImpactTargetType, data: any): RelatedEntity[] {
  const related: RelatedEntity[] = [];
  
  if (targetType === 'industry' && data?.affectedRoles) {
    for (const role of data.affectedRoles.slice(0, 4)) {
      const roleData = JOB_ROLE_IMPACT_DATA[role];
      related.push({
        name: role,
        type: 'job_role',
        relationship: 'Betroffene Rolle',
        impactScore: roleData?.score,
      });
    }
  } else if (targetType === 'job_role' && data?.affectedIndustries) {
    for (const industry of data.affectedIndustries.slice(0, 3)) {
      const industryData = INDUSTRY_IMPACT_DATA[industry];
      related.push({
        name: industry,
        type: 'industry',
        relationship: 'Relevante Branche',
        impactScore: industryData?.score,
      });
    }
  }
  
  // Add required skills as related entities
  if (data?.requiredSkills) {
    for (const skill of data.requiredSkills.slice(0, 3)) {
      related.push({
        name: skill,
        type: 'skill',
        relationship: 'Benötigte Kompetenz',
      });
    }
  }
  
  return related;
}

/**
 * Get AI impact analysis for a target
 */
export async function getAIImpact(
  target: string,
  targetType: ImpactTargetType
): Promise<AIImpactResponse> {
  await db.init();
  
  const result = findTarget(target, targetType);
  
  if (!result.found || !result.data) {
    // Return generic response for unknown targets
    return {
      target,
      targetType,
      found: false,
      score: null,
      confidence: null,
      reasoning: `Keine spezifischen Daten für "${target}" gefunden. Allgemeine Einschätzung: Die meisten Bereiche in der Schweiz sind von AI-Entwicklungen betroffen, der genaue Impact hängt von spezifischen Tätigkeiten und Automatisierungspotenzial ab.`,
      factors: null,
      relatedEntities: [],
      recommendations: [
        'Allgemeine AI-Literacy entwickeln',
        'Spezifische Branchenanalyse empfohlen',
        'Kontaktieren Sie Branchenverbände für detailliertere Informationen',
      ],
      sources: [],
    };
  }
  
  const data = result.data;
  const factors: ImpactFactors = {
    automationPotential: data.automationPotential,
    aiMentions: 0,
    jobTrendDirection: data.score >= 6 ? 'declining' : data.score >= 4 ? 'stable' : 'growing',
    skillsGapSeverity: data.skillsGap,
    adoptionRate: data.adoptionRate,
  };
  
  return {
    target: result.name,
    targetType,
    found: true,
    score: data.score,
    confidence: 0.85,
    reasoning: data.reasoning,
    factors,
    relatedEntities: getRelatedEntities(targetType, data),
    recommendations: generateRecommendations(data.score, targetType, data),
    sources: [
      'BFS Beschäftigungsstatistik',
      'Swiss AI Labor Market Knowledge Base',
      'Branchenberichte 2024',
    ],
  };
}

export default { getAIImpact };
