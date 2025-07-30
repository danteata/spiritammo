import AsyncStorage from '@react-native-async-storage/async-storage';
import { Scripture, BattleIntel } from '@/types/scripture';

// Enhanced Scripture with Military Metadata
export interface AmmunitionRound extends Scripture {
  // Military-specific properties
  ammunitionType: 'standard' | 'armor-piercing' | 'explosive' | 'tracer' | 'incendiary';
  caliber: 'light' | 'medium' | 'heavy' | 'artillery';
  effectiveRange: number; // difficulty level 1-10
  penetration: number; // memorization difficulty 1-10
  battleIntel?: BattleIntel;
  deploymentHistory: DeploymentRecord[];
  maintenanceRequired: boolean;
  lastCleaned?: Date;
  roundsExpended: number;
  jamCount: number; // failed attempts
}

export interface DeploymentRecord {
  date: Date;
  accuracy: number;
  conditions: 'optimal' | 'adverse' | 'combat';
  duration: number; // seconds
  feedback: string;
}

export interface AmmunitionCache {
  [bookId: string]: {
    [chapter: number]: AmmunitionRound[];
  };
}

export interface SupplyManifest {
  totalRounds: number;
  readyRounds: number;
  maintenanceRequired: number;
  lastResupply: Date;
  nextResupply?: Date;
  supplyLines: {
    [testament: string]: {
      books: number;
      chapters: number;
      verses: number;
    };
  };
}

// Storage keys
const AMMUNITION_CACHE_KEY = '@spiritammo_ammunition_cache';
const SUPPLY_MANIFEST_KEY = '@spiritammo_supply_manifest';
const DEPLOYMENT_HISTORY_KEY = '@spiritammo_deployment_history';

class AmmunitionSupplyService {
  private cache: AmmunitionCache = {};
  private manifest: SupplyManifest | null = null;

  constructor() {
    this.initializeSupplyLines();
  }

  private async initializeSupplyLines() {
    try {
      await this.loadAmmunitionCache();
      await this.loadSupplyManifest();
    } catch (error) {
      console.error('Failed to initialize supply lines:', error);
    }
  }

  // Load ammunition cache from storage
  private async loadAmmunitionCache() {
    try {
      const stored = await AsyncStorage.getItem(AMMUNITION_CACHE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
      } else {
        // Initialize with default ammunition
        await this.initializeDefaultAmmunition();
      }
    } catch (error) {
      console.error('Failed to load ammunition cache:', error);
    }
  }

  // Load supply manifest
  private async loadSupplyManifest() {
    try {
      const stored = await AsyncStorage.getItem(SUPPLY_MANIFEST_KEY);
      if (stored) {
        this.manifest = JSON.parse(stored);
      } else {
        this.manifest = await this.generateSupplyManifest();
        await this.saveSupplyManifest();
      }
    } catch (error) {
      console.error('Failed to load supply manifest:', error);
    }
  }

  // Initialize default ammunition with military classifications
  private async initializeDefaultAmmunition() {
    // This would load from a comprehensive scripture database
    // For now, we'll create enhanced versions of existing scriptures
    
    const defaultAmmunition: AmmunitionRound[] = [
      {
        id: 'john_3_16',
        book: 'John',
        chapter: 3,
        verse: 16,
        text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
        reference: 'John 3:16',
        ammunitionType: 'standard',
        caliber: 'medium',
        effectiveRange: 8,
        penetration: 7,
        deploymentHistory: [],
        maintenanceRequired: false,
        roundsExpended: 0,
        jamCount: 0,
      },
      {
        id: 'philippians_4_13',
        book: 'Philippians',
        chapter: 4,
        verse: 13,
        text: 'I can do all this through him who gives me strength.',
        reference: 'Philippians 4:13',
        ammunitionType: 'armor-piercing',
        caliber: 'heavy',
        effectiveRange: 9,
        penetration: 8,
        deploymentHistory: [],
        maintenanceRequired: false,
        roundsExpended: 0,
        jamCount: 0,
      },
      {
        id: 'romans_8_28',
        book: 'Romans',
        chapter: 8,
        verse: 28,
        text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
        reference: 'Romans 8:28',
        ammunitionType: 'explosive',
        caliber: 'artillery',
        effectiveRange: 10,
        penetration: 9,
        deploymentHistory: [],
        maintenanceRequired: false,
        roundsExpended: 0,
        jamCount: 0,
      },
    ];

    // Organize by book and chapter
    for (const round of defaultAmmunition) {
      if (!this.cache[round.book]) {
        this.cache[round.book] = {};
      }
      if (!this.cache[round.book][round.chapter]) {
        this.cache[round.book][round.chapter] = [];
      }
      this.cache[round.book][round.chapter].push(round);
    }

    await this.saveAmmunitionCache();
  }

  // Generate supply manifest
  private async generateSupplyManifest(): Promise<SupplyManifest> {
    let totalRounds = 0;
    let readyRounds = 0;
    let maintenanceRequired = 0;

    const supplyLines = {
      'Old Testament': { books: 0, chapters: 0, verses: 0 },
      'New Testament': { books: 0, chapters: 0, verses: 0 },
    };

    // Count ammunition by testament
    for (const [book, chapters] of Object.entries(this.cache)) {
      const testament = this.getTestament(book);
      supplyLines[testament].books++;

      for (const [chapterNum, rounds] of Object.entries(chapters)) {
        supplyLines[testament].chapters++;
        supplyLines[testament].verses += rounds.length;

        for (const round of rounds) {
          totalRounds++;
          if (!round.maintenanceRequired) {
            readyRounds++;
          } else {
            maintenanceRequired++;
          }
        }
      }
    }

    return {
      totalRounds,
      readyRounds,
      maintenanceRequired,
      lastResupply: new Date(),
      supplyLines,
    };
  }

  // Get testament for a book
  private getTestament(book: string): 'Old Testament' | 'New Testament' {
    const newTestamentBooks = [
      'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', 
      '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
      'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
      '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
      'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
      'Jude', 'Revelation'
    ];
    
    return newTestamentBooks.includes(book) ? 'New Testament' : 'Old Testament';
  }

  // Save ammunition cache
  private async saveAmmunitionCache() {
    try {
      await AsyncStorage.setItem(AMMUNITION_CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Failed to save ammunition cache:', error);
    }
  }

  // Save supply manifest
  private async saveSupplyManifest() {
    try {
      if (this.manifest) {
        await AsyncStorage.setItem(SUPPLY_MANIFEST_KEY, JSON.stringify(this.manifest));
      }
    } catch (error) {
      console.error('Failed to save supply manifest:', error);
    }
  }

  // Deploy ammunition (practice verse)
  async deployAmmunition(ammunitionId: string, accuracy: number, duration: number): Promise<boolean> {
    try {
      // Find the ammunition
      let targetRound: AmmunitionRound | null = null;
      let bookKey = '';
      let chapterKey = 0;

      for (const [book, chapters] of Object.entries(this.cache)) {
        for (const [chapter, rounds] of Object.entries(chapters)) {
          const round = rounds.find(r => r.id === ammunitionId);
          if (round) {
            targetRound = round;
            bookKey = book;
            chapterKey = parseInt(chapter);
            break;
          }
        }
        if (targetRound) break;
      }

      if (!targetRound) {
        console.error('Ammunition not found:', ammunitionId);
        return false;
      }

      // Record deployment
      const deployment: DeploymentRecord = {
        date: new Date(),
        accuracy,
        conditions: accuracy >= 90 ? 'optimal' : accuracy >= 70 ? 'adverse' : 'combat',
        duration,
        feedback: this.generateDeploymentFeedback(accuracy),
      };

      targetRound.deploymentHistory.push(deployment);
      targetRound.roundsExpended++;

      // Check for maintenance requirements
      if (accuracy < 50) {
        targetRound.jamCount++;
      }

      if (targetRound.jamCount >= 3 || targetRound.roundsExpended >= 50) {
        targetRound.maintenanceRequired = true;
      }

      // Update accuracy
      const recentDeployments = targetRound.deploymentHistory.slice(-10);
      const avgAccuracy = recentDeployments.reduce((sum, d) => sum + d.accuracy, 0) / recentDeployments.length;
      targetRound.accuracy = avgAccuracy;

      await this.saveAmmunitionCache();
      await this.updateSupplyManifest();

      return true;
    } catch (error) {
      console.error('Failed to deploy ammunition:', error);
      return false;
    }
  }

  // Generate deployment feedback
  private generateDeploymentFeedback(accuracy: number): string {
    if (accuracy >= 95) return 'Perfect deployment! Outstanding marksmanship!';
    if (accuracy >= 85) return 'Excellent shot! Target neutralized!';
    if (accuracy >= 75) return 'Good hit! Maintain fire discipline!';
    if (accuracy >= 60) return 'Target hit but needs improvement!';
    return 'Miss! Return to basic training!';
  }

  // Perform maintenance on ammunition
  async performMaintenance(ammunitionId: string): Promise<boolean> {
    try {
      // Find and clean the ammunition
      for (const [book, chapters] of Object.entries(this.cache)) {
        for (const [chapter, rounds] of Object.entries(chapters)) {
          const round = rounds.find(r => r.id === ammunitionId);
          if (round) {
            round.maintenanceRequired = false;
            round.jamCount = 0;
            round.lastCleaned = new Date();
            
            await this.saveAmmunitionCache();
            await this.updateSupplyManifest();
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to perform maintenance:', error);
      return false;
    }
  }

  // Update supply manifest
  private async updateSupplyManifest() {
    this.manifest = await this.generateSupplyManifest();
    await this.saveSupplyManifest();
  }

  // Get ammunition by book and chapter
  async getAmmunitionByLocation(book: string, chapter?: number): Promise<AmmunitionRound[]> {
    if (!this.cache[book]) return [];
    
    if (chapter !== undefined) {
      return this.cache[book][chapter] || [];
    }

    // Return all rounds for the book
    const allRounds: AmmunitionRound[] = [];
    for (const rounds of Object.values(this.cache[book])) {
      allRounds.push(...rounds);
    }
    return allRounds;
  }

  // Get random ammunition
  async getRandomAmmunition(filters?: {
    book?: string;
    chapter?: number;
    ammunitionType?: AmmunitionRound['ammunitionType'];
    caliber?: AmmunitionRound['caliber'];
    readyOnly?: boolean;
  }): Promise<AmmunitionRound | null> {
    let availableRounds: AmmunitionRound[] = [];

    for (const [book, chapters] of Object.entries(this.cache)) {
      if (filters?.book && book !== filters.book) continue;

      for (const [chapterNum, rounds] of Object.entries(chapters)) {
        if (filters?.chapter && parseInt(chapterNum) !== filters.chapter) continue;

        for (const round of rounds) {
          if (filters?.ammunitionType && round.ammunitionType !== filters.ammunitionType) continue;
          if (filters?.caliber && round.caliber !== filters.caliber) continue;
          if (filters?.readyOnly && round.maintenanceRequired) continue;

          availableRounds.push(round);
        }
      }
    }

    if (availableRounds.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * availableRounds.length);
    return availableRounds[randomIndex];
  }

  // Get supply manifest
  async getSupplyManifest(): Promise<SupplyManifest | null> {
    return this.manifest;
  }

  // Get ammunition requiring maintenance
  async getMaintenanceQueue(): Promise<AmmunitionRound[]> {
    const maintenanceQueue: AmmunitionRound[] = [];

    for (const chapters of Object.values(this.cache)) {
      for (const rounds of Object.values(chapters)) {
        for (const round of rounds) {
          if (round.maintenanceRequired) {
            maintenanceQueue.push(round);
          }
        }
      }
    }

    return maintenanceQueue;
  }
}

// Export singleton instance
export const ammunitionSupplyService = new AmmunitionSupplyService();
