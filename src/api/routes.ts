/**
 * Dashboard API Routes
 * Story 5.2 - Express routes for the dashboard
 */

import { Router, Request, Response } from 'express';
import * as db from '../db/ruvector.js';

const router = Router();

// Industry impact data (from ai-impact.ts)
const INDUSTRY_DATA: Record<string, {
  score: number;
  automationPotential: number;
  adoptionRate: number;
  skillsGap: number;
  description: string;
  affectedRoles: string[];
  trend: 'growing' | 'stable' | 'declining';
  employees?: number;
}> = {
  'Finanzdienstleistungen': {
    score: 7.5,
    automationPotential: 7.5,
    adoptionRate: 8.0,
    skillsGap: 7.0,
    description: 'Bankwesen, Versicherungen, FinTech',
    affectedRoles: ['Accountant', 'Consultant', 'Customer Service'],
    trend: 'declining',
    employees: 214000,
  },
  'Information und Kommunikation': {
    score: 6.0,
    automationPotential: 4.5,
    adoptionRate: 9.0,
    skillsGap: 6.5,
    description: 'IT, Software, Telekommunikation',
    affectedRoles: ['Software Developer', 'Data Scientist'],
    trend: 'growing',
    employees: 218000,
  },
  'Pharma und Chemie': {
    score: 5.5,
    automationPotential: 5.5,
    adoptionRate: 7.0,
    skillsGap: 6.0,
    description: 'Pharmazeutische Industrie, Biotechnologie',
    affectedRoles: ['Research Scientist', 'Data Scientist'],
    trend: 'stable',
    employees: 78000,
  },
  'Verarbeitendes Gewerbe': {
    score: 7.0,
    automationPotential: 7.5,
    adoptionRate: 6.5,
    skillsGap: 7.5,
    description: 'Produktion, Industrie 4.0',
    affectedRoles: ['Manager', 'Project Manager'],
    trend: 'declining',
    employees: 580000,
  },
  'Gesundheits- und Sozialwesen': {
    score: 4.0,
    automationPotential: 3.5,
    adoptionRate: 5.0,
    skillsGap: 5.0,
    description: 'Spitäler, Pflege, Sozialarbeit',
    affectedRoles: ['Administrative Assistant'],
    trend: 'growing',
    employees: 710000,
  },
  'Handel': {
    score: 7.5,
    automationPotential: 7.5,
    adoptionRate: 6.5,
    skillsGap: 6.0,
    description: 'Detailhandel, Grosshandel, E-Commerce',
    affectedRoles: ['Sales Representative', 'Customer Service'],
    trend: 'stable',
    employees: 420000,
  },
  'Gastgewerbe': {
    score: 5.5,
    automationPotential: 5.0,
    adoptionRate: 5.0,
    skillsGap: 4.5,
    description: 'Hotels, Restaurants, Tourismus',
    affectedRoles: ['Customer Service'],
    trend: 'stable',
    employees: 245000,
  },
  'Baugewerbe': {
    score: 4.5,
    automationPotential: 4.5,
    adoptionRate: 4.0,
    skillsGap: 4.0,
    description: 'Bau, Immobilien, Infrastruktur',
    affectedRoles: ['Project Manager'],
    trend: 'stable',
    employees: 340000,
  },
  'Öffentliche Verwaltung': {
    score: 6.0,
    automationPotential: 6.0,
    adoptionRate: 5.5,
    skillsGap: 5.5,
    description: 'Behörden, öffentliche Dienste',
    affectedRoles: ['Administrative Assistant'],
    trend: 'stable',
    employees: 185000,
  },
  'Erziehung und Unterricht': {
    score: 3.5,
    automationPotential: 3.5,
    adoptionRate: 4.5,
    skillsGap: 5.0,
    description: 'Bildungswesen, Schulen, Hochschulen',
    affectedRoles: ['Administrative Assistant'],
    trend: 'growing',
    employees: 295000,
  },
};

// Trends data for visualization
const TRENDS_DATA = {
  employment: {
    labels: ['2020', '2021', '2022', '2023', '2024'],
    values: [5.15, 5.26, 5.42, 5.52, 5.56],
    unit: 'Mio. Beschäftigte',
    change: 2.4,
  },
  unemployment: {
    labels: ['2020', '2021', '2022', '2023', '2024'],
    values: [3.1, 2.8, 2.0, 2.1, 2.4],
    unit: '%',
    change: 0.3,
  },
  ai_adoption: {
    labels: ['2020', '2021', '2022', '2023', '2024'],
    values: [12, 18, 28, 42, 58],
    unit: '% der Unternehmen',
    change: 16,
  },
  wages: {
    labels: ['2020', '2021', '2022', '2023', '2024'],
    values: [6538, 6590, 6665, 6788, 6920],
    unit: 'CHF/Monat (Median)',
    change: 1.9,
  },
};

// Canton data
const CANTON_UNEMPLOYMENT: Record<string, number> = {
  'ZH': 2.3, 'BE': 1.8, 'LU': 1.5, 'UR': 0.9, 'SZ': 1.2,
  'OW': 0.8, 'NW': 0.9, 'GL': 1.4, 'ZG': 1.5, 'FR': 2.1,
  'SO': 2.0, 'BS': 3.2, 'BL': 2.4, 'SH': 2.3, 'AR': 1.4,
  'AI': 0.9, 'SG': 1.8, 'GR': 1.3, 'AG': 2.2, 'TG': 1.7,
  'TI': 2.5, 'VD': 3.8, 'VS': 2.8, 'NE': 4.1, 'GE': 4.3, 'JU': 3.2,
};

/**
 * GET /api/stats - Overview statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const dbStats = await db.stats();
    
    // Calculate aggregate statistics
    const industries = Object.keys(INDUSTRY_DATA).length;
    const avgImpactScore = Object.values(INDUSTRY_DATA)
      .reduce((sum, i) => sum + i.score, 0) / industries;
    const totalEmployees = Object.values(INDUSTRY_DATA)
      .reduce((sum, i) => sum + (i.employees || 0), 0);
    
    res.json({
      success: true,
      data: {
        // Knowledge base stats
        documentsIndexed: dbStats.documentCount,
        relationsCount: dbStats.relationCount,
        lastUpdated: new Date().toISOString(),
        
        // Labor market stats
        totalEmployees,
        industries,
        cantons: 26,
        averageAIImpact: Math.round(avgImpactScore * 10) / 10,
        
        // Key metrics
        metrics: {
          employment: {
            value: '5.56 Mio.',
            change: '+2.4%',
            trend: 'up',
          },
          unemployment: {
            value: '2.4%',
            change: '+0.3%',
            trend: 'up',
          },
          aiAdoption: {
            value: '58%',
            change: '+16%',
            trend: 'up',
          },
          medianWage: {
            value: '6\'920 CHF',
            change: '+1.9%',
            trend: 'up',
          },
        },
        
        // Top industries by AI impact
        topImpactedIndustries: Object.entries(INDUSTRY_DATA)
          .sort(([,a], [,b]) => b.score - a.score)
          .slice(0, 5)
          .map(([name, data]) => ({
            name,
            score: data.score,
            trend: data.trend,
          })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/industries - All industries with AI impact scores
 */
router.get('/industries', async (req: Request, res: Response) => {
  try {
    const industries = Object.entries(INDUSTRY_DATA).map(([name, data]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description: data.description,
      aiImpactScore: data.score,
      automationPotential: data.automationPotential,
      adoptionRate: data.adoptionRate,
      skillsGap: data.skillsGap,
      trend: data.trend,
      employees: data.employees,
      affectedRoles: data.affectedRoles,
      riskLevel: data.score >= 7 ? 'high' : data.score >= 5 ? 'medium' : 'low',
    }));
    
    // Sort by impact score descending
    industries.sort((a, b) => b.aiImpactScore - a.aiImpactScore);
    
    res.json({
      success: true,
      count: industries.length,
      data: industries,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/trends - Trends data for charts
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const metric = req.query.metric as string || 'all';
    
    if (metric !== 'all' && TRENDS_DATA[metric as keyof typeof TRENDS_DATA]) {
      res.json({
        success: true,
        data: TRENDS_DATA[metric as keyof typeof TRENDS_DATA],
      });
    } else {
      res.json({
        success: true,
        data: {
          ...TRENDS_DATA,
          cantonUnemployment: CANTON_UNEMPLOYMENT,
          industryAIAdoption: Object.entries(INDUSTRY_DATA)
            .map(([name, data]) => ({
              name,
              adoptionRate: data.adoptionRate * 10,
              score: data.score,
            }))
            .sort((a, b) => b.adoptionRate - a.adoptionRate),
        },
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/search - Search the knowledge base
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const industry = req.query.industry as string;
    const canton = req.query.canton as string;
    const source = req.query.source as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!query || query.length < 2) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'Please enter a search query (min 2 characters)',
      });
    }
    
    // Search in database
    const filter: any = {};
    if (industry) filter.industry = industry;
    if (canton) filter.canton = canton;
    if (source) filter.source = source;
    
    const results = await db.search(query, { limit, filter });
    
    // Transform results
    const transformed = results
      .filter(r => !r.id.startsWith('entity:') && !r.id.startsWith('impact:'))
      .map(r => {
        // Look up source URL from RESEARCH_SOURCES
        const titleLower = (r.metadata.title || '').toLowerCase();
        const matchedSource = RESEARCH_SOURCES.find(s => 
          titleLower.includes(s.id.replace('research-', '').toLowerCase()) ||
          s.id.toLowerCase().includes(titleLower.replace('research-', ''))
        );
        
        return {
          id: r.id,
          title: matchedSource?.title || r.metadata.title || r.content.split('\n')[0].substring(0, 100),
          snippet: r.content.substring(0, 250) + '...',
          source: r.metadata.source || 'unknown',
          sourceUrl: r.metadata.sourceUrl || matchedSource?.url,
          institution: matchedSource?.institution,
          industry: r.metadata.industry,
          canton: r.metadata.canton,
          date: r.metadata.date,
          relevance: Math.round(r.score * 100) / 100,
          tags: r.metadata.tags || [],
        };
      });
    
    res.json({
      success: true,
      query,
      filters: { industry, canton, source },
      count: transformed.length,
      data: transformed,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/industry/:name - Get detailed industry info
 */
router.get('/industry/:name', async (req: Request, res: Response) => {
  try {
    const name = decodeURIComponent(req.params.name);
    
    // Find industry (case-insensitive)
    const industry = Object.entries(INDUSTRY_DATA).find(
      ([key]) => key.toLowerCase() === name.toLowerCase()
    );
    
    if (!industry) {
      return res.status(404).json({
        success: false,
        error: 'Industry not found',
      });
    }
    
    const [industryName, data] = industry;
    
    res.json({
      success: true,
      data: {
        name: industryName,
        description: data.description,
        aiImpactScore: data.score,
        factors: {
          automationPotential: data.automationPotential,
          adoptionRate: data.adoptionRate,
          skillsGap: data.skillsGap,
        },
        trend: data.trend,
        employees: data.employees,
        affectedRoles: data.affectedRoles,
        riskLevel: data.score >= 7 ? 'high' : data.score >= 5 ? 'medium' : 'low',
        recommendations: generateRecommendations(data.score),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/cantons - Canton statistics
 */
router.get('/cantons', async (req: Request, res: Response) => {
  try {
    const cantons = Object.entries(CANTON_UNEMPLOYMENT).map(([code, unemployment]) => ({
      code,
      name: getCantonName(code),
      unemployment,
      riskLevel: unemployment >= 4 ? 'high' : unemployment >= 2.5 ? 'medium' : 'low',
    }));
    
    res.json({
      success: true,
      data: cantons.sort((a, b) => b.unemployment - a.unemployment),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Research Sources with verified URLs
const RESEARCH_SOURCES = [
  {
    id: 'research-mckinsey-genai-2023',
    title: 'The economic potential of generative AI',
    institution: 'McKinsey Global Institute',
    year: 2023,
    abstract: 'Comprehensive analysis of how generative AI could transform productivity across industries. Estimates generative AI could add $2.6-4.4 trillion annually to the global economy.',
    url: 'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai-the-next-productivity-frontier',
    topics: ['generative ai', 'automation', 'productivity', 'labor market'],
  },
  {
    id: 'research-wef-future-jobs-2023',
    title: 'Future of Jobs Report 2023',
    institution: 'World Economic Forum',
    year: 2023,
    abstract: 'Global report on labor market transformation through 2027. Projects 23% of jobs to change in next 5 years, with 69M new jobs created and 83M displaced.',
    url: 'https://www.weforum.org/publications/the-future-of-jobs-report-2023/',
    topics: ['future of work', 'skills', 'job creation', 'displacement'],
  },
  {
    id: 'research-bfs-arbeitsmarkt-2024',
    title: 'Arbeitsmarktindikatoren Schweiz',
    institution: 'BFS',
    year: 2024,
    abstract: 'Offizielle Schweizer Arbeitsmarktstatistiken. Umfasst Erwerbstätigkeit, Arbeitslosigkeit, Löhne, Arbeitsbedingungen und Branchenentwicklung.',
    url: 'https://www.bfs.admin.ch/bfs/de/home/statistiken/arbeit-erwerb.html',
    topics: ['arbeitsmarkt', 'statistik', 'beschäftigung', 'löhne'],
  },
  {
    id: 'research-seco-konjunktur-2024',
    title: 'Konjunkturprognosen',
    institution: 'SECO',
    year: 2024,
    abstract: 'Offizielle Konjunkturprognosen der Schweizer Regierung. Vierteljährliche Analysen zu BIP-Entwicklung, Arbeitsmarkt und Wirtschaftsaussichten.',
    url: 'https://www.seco.admin.ch/seco/de/home/wirtschaftslage---wirtschaftspolitik/Wirtschaftslage/konjunkturprognosen.html',
    topics: ['konjunktur', 'prognose', 'wirtschaft', 'arbeitsmarkt'],
  },
  {
    id: 'research-stanford-hai-2024',
    title: 'AI Index Report 2024',
    institution: 'Stanford HAI',
    year: 2024,
    abstract: 'Annual comprehensive report tracking AI progress across research, industry, policy and public perception. Covers model capabilities, investment trends, and labor market impacts.',
    url: 'https://aiindex.stanford.edu/report/',
    topics: ['ai research', 'ai policy', 'ai investment', 'ai capabilities'],
  },
  {
    id: 'research-oecd-employment-2024',
    title: 'OECD Employment Outlook 2024',
    institution: 'OECD',
    year: 2024,
    abstract: 'Annual flagship publication on labor markets in OECD countries including Switzerland. Analyzes AI impact on jobs, skills requirements, and policy responses.',
    url: 'https://www.oecd.org/employment/outlook/',
    topics: ['employment', 'ai impact', 'skills', 'policy'],
  },
];

/**
 * GET /api/sources - List all research sources with URLs
 */
router.get('/sources', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      count: RESEARCH_SOURCES.length,
      data: RESEARCH_SOURCES,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Helper functions
function generateRecommendations(score: number): string[] {
  if (score >= 7) {
    return [
      'Hohe Priorität für Weiterbildung in AI-Tools',
      'Fokus auf menschliche Kernkompetenzen',
      'Strategische AI-Investitionen zur Wettbewerbsfähigkeit',
    ];
  } else if (score >= 5) {
    return [
      'Kontinuierliche Weiterbildung in AI-Tools empfohlen',
      'Hybride Arbeitsweisen entwickeln',
      'AI-Entwicklungen im Bereich beobachten',
    ];
  }
  return [
    'Grundlegende AI-Literacy entwickeln',
    'AI als Produktivitäts-Tool nutzen',
    'Fokus auf Kernkompetenzen beibehalten',
  ];
}

function getCantonName(code: string): string {
  const names: Record<string, string> = {
    'ZH': 'Zürich', 'BE': 'Bern', 'LU': 'Luzern', 'UR': 'Uri', 'SZ': 'Schwyz',
    'OW': 'Obwalden', 'NW': 'Nidwalden', 'GL': 'Glarus', 'ZG': 'Zug', 'FR': 'Fribourg',
    'SO': 'Solothurn', 'BS': 'Basel-Stadt', 'BL': 'Basel-Landschaft', 'SH': 'Schaffhausen',
    'AR': 'Appenzell Ausserrhoden', 'AI': 'Appenzell Innerrhoden', 'SG': 'St. Gallen',
    'GR': 'Graubünden', 'AG': 'Aargau', 'TG': 'Thurgau', 'TI': 'Ticino',
    'VD': 'Vaud', 'VS': 'Valais', 'NE': 'Neuchâtel', 'GE': 'Genève', 'JU': 'Jura',
  };
  return names[code] || code;
}

export default router;
