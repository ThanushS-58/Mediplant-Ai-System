import { KnowledgeBasePlant, CommunityContribution, User, AuthenticatedUser } from '../types';
import { knowledgeBaseData } from '../i18n/knowledgeBaseData';
import { mockContributions } from '../components/AdminDashboard';

const DB_KEY = 'mediPlantDb';

interface Database {
  plants: KnowledgeBasePlant[];
  pendingContributions: CommunityContribution[];
  users: User[];
}

/**
 * Initializes the local storage database with default data if it doesn't exist.
 */
export const initializeDb = (): void => {
  if (!localStorage.getItem(DB_KEY)) {
    console.log('Initializing database with default data...');
    const initialDb: Database = {
      plants: knowledgeBaseData,
      pendingContributions: mockContributions,
      users: [
        { email: 'admin@medplant.ai', password: 'admin123', role: 'admin' },
        { email: 'user@medplant.ai', password: 'user123', role: 'user' },
      ],
    };
    localStorage.setItem(DB_KEY, JSON.stringify(initialDb));
  }
};

/**
 * Retrieves the entire database object from local storage.
 */
const getDb = (): Database => {
  const dbString = localStorage.getItem(DB_KEY);
  if (!dbString) {
    initializeDb();
    return JSON.parse(localStorage.getItem(DB_KEY)!);
  }
  return JSON.parse(dbString);
};

/**
 * Saves the entire database object to local storage.
 * @param db The database object to save.
 */
const setDb = (db: Database): void => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

// --- User Functions ---

export const authenticateUser = (email: string, password: string): AuthenticatedUser | null => {
    const db = getDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (user) {
        // Return user object without the password
        return { email: user.email, role: user.role };
    }
    return null;
};

export const registerUser = (email: string, password: string): void => {
    const db = getDb();
    const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existingUser) {
        throw new Error('User with this email already exists.');
    }

    const newUser: User = {
        email: email,
        password: password,
        role: 'user',
    };

    db.users.push(newUser);
    setDb(db);
};


// --- Plant Functions ---

export const getPlants = (): KnowledgeBasePlant[] => {
  return getDb().plants;
};

export const getPlantById = (id: string): KnowledgeBasePlant | undefined => {
  return getDb().plants.find(p => p.id === id);
};

export const updatePlant = (updatedPlant: KnowledgeBasePlant): void => {
  const db = getDb();
  const plantIndex = db.plants.findIndex(p => p.id === updatedPlant.id);
  if (plantIndex > -1) {
    db.plants[plantIndex] = updatedPlant;
    setDb(db);
  } else {
    console.error("Attempted to update a plant that does not exist:", updatedPlant.id);
  }
};


// --- Contribution Functions ---

export const getPendingContributions = (): CommunityContribution[] => {
  return getDb().pendingContributions;
};

export const addContribution = (contribution: Omit<CommunityContribution, 'id' | 'status' | 'likes' | 'comments'>): void => {
  const db = getDb();
  
  // Find the scientific name to make linking on approval more robust
  const plantNameLower = contribution.plantName?.toLowerCase() || '';
  const matchedPlant = db.plants.find(p => 
      p.plantName['en-US'].toLowerCase() === plantNameLower ||
      p.scientificName.toLowerCase() === plantNameLower
  );

  const newContribution: CommunityContribution = {
    ...contribution,
    id: `contrib-${Date.now()}`,
    status: 'pending',
    likes: 0,
    comments: [],
    plantName: matchedPlant?.plantName['en-US'] || contribution.plantName, // Standardize to English name
  };

  db.pendingContributions.unshift(newContribution);
  setDb(db);
};


export const approveContribution = (contributionId: string): void => {
  const db = getDb();
  const contributionIndex = db.pendingContributions.findIndex(c => c.id === contributionId);

  if (contributionIndex > -1) {
    const contribution = db.pendingContributions[contributionIndex];
    contribution.status = 'approved';
    
    // Find the plant to add the contribution to
    const plantNameLower = contribution.plantName?.toLowerCase() || '';
    const plantIndex = db.plants.findIndex(p => 
        p.plantName['en-US'].toLowerCase() === plantNameLower ||
        p.scientificName.toLowerCase() === plantNameLower
    );

    if (plantIndex > -1) {
      db.plants[plantIndex].communityContributions.unshift(contribution);
    } else {
      console.warn(`Could not find plant "${contribution.plantName}" to approve contribution.`);
      // Even if plant not found, we remove it from pending.
    }
    
    // Remove from pending list
    db.pendingContributions.splice(contributionIndex, 1);
    setDb(db);
  }
};

export const rejectContribution = (contributionId: string): void => {
  const db = getDb();
  const updatedPending = db.pendingContributions.filter(c => c.id !== contributionId);
  db.pendingContributions = updatedPending;
  setDb(db);
};