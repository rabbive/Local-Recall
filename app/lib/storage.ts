// Storage service using IndexedDB for LocalRecall
// This service provides client-side storage for knowledge cards, tags, etc.

import { KnowledgeCard, Tag, Quiz, QuizAttempt, UserSettings, ContentType } from './models';

// Environment detection
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// Interface definitions for storage APIs
export interface KnowledgeCardStorage {
  getAll: () => Promise<KnowledgeCard[]>;
  getById: (id: string) => Promise<KnowledgeCard | null>;
  add: (card: Omit<KnowledgeCard, 'id'>) => Promise<KnowledgeCard>;
  update: (card: KnowledgeCard) => Promise<KnowledgeCard>;
  delete: (id: string) => Promise<boolean>;
  getDueForReview?: () => Promise<KnowledgeCard[]>;
}

export interface TagStorage {
  getAll: () => Promise<Tag[]>;
  getById: (id: string) => Promise<Tag | null>;
  add: (tag: Omit<Tag, 'id'>) => Promise<Tag>;
  update: (tag: Tag) => Promise<Tag>;
  delete: (id: string) => Promise<boolean>;
}

export interface QuizStorage {
  getAll: () => Promise<Quiz[]>;
  getById: (id: string) => Promise<Quiz | null>;
  add: (quiz: Omit<Quiz, 'id'>) => Promise<Quiz>;
  update: (quiz: Quiz) => Promise<Quiz>;
  delete: (id: string) => Promise<boolean>;
  getByKnowledgeCardId?: (knowledgeCardId: string) => Promise<Quiz[]>;
}

export interface QuizAttemptStorage {
  getAll: () => Promise<QuizAttempt[]>;
  add: (attempt: Omit<QuizAttempt, 'id'>) => Promise<QuizAttempt>;
  getByQuizId?: (quizId: string) => Promise<QuizAttempt[]>;
}

export interface SettingsStorage {
  getSettings: () => Promise<UserSettings>;
  updateSettings: (settings: UserSettings) => Promise<UserSettings>;
}

// Create server-side stub that provides clear error messages
const createServerSideStub = () => ({
  add: () => Promise.reject(new Error('IndexedDB is only available in browser environments')),
  update: () => Promise.reject(new Error('IndexedDB is only available in browser environments')),
  getAll: () => Promise.reject(new Error('IndexedDB is only available in browser environments')),
  getById: () => Promise.reject(new Error('IndexedDB is only available in browser environments')),
  delete: () => Promise.reject(new Error('IndexedDB is only available in browser environments')),
  getDueForReview: () => Promise.reject(new Error('IndexedDB is only available in browser environments')),
  getByKnowledgeCardId: () => Promise.reject(new Error('IndexedDB is only available in browser environments')),
  getByQuizId: () => Promise.reject(new Error('IndexedDB is only available in browser environments')),
  getSettings: () => Promise.reject(new Error('IndexedDB is only available in browser environments')),
  updateSettings: () => Promise.reject(new Error('IndexedDB is only available in browser environments')),
});

// Initialize with server stubs by default
let knowledgeCardsAPI: KnowledgeCardStorage = createServerSideStub();
let tagsAPI: TagStorage = createServerSideStub();
let quizzesAPI: QuizStorage = createServerSideStub();
let quizAttemptsAPI: QuizAttemptStorage = createServerSideStub();
let settingsAPI: SettingsStorage = createServerSideStub();

// Only load IndexedDB in browser environment
if (isBrowser) {
  // Database name and version
  const DB_NAME = 'localrecall-db';
  const DB_VERSION = 1;

  // Object store names
  const STORES = {
    KNOWLEDGE_CARDS: 'knowledgeCards',
    TAGS: 'tags',
    QUIZZES: 'quizzes',
    QUIZ_ATTEMPTS: 'quizAttempts',
    SETTINGS: 'settings',
  };

  // Initialize the database
  const initDatabase = async (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('Error opening database:', event);
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.KNOWLEDGE_CARDS)) {
          const knowledgeCardsStore = db.createObjectStore(STORES.KNOWLEDGE_CARDS, { keyPath: 'id' });
          knowledgeCardsStore.createIndex('contentType', 'contentType', { unique: false });
          knowledgeCardsStore.createIndex('createdAt', 'createdAt', { unique: false });
          knowledgeCardsStore.createIndex('reviewDueDate', 'reviewDueDate', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.TAGS)) {
          db.createObjectStore(STORES.TAGS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.QUIZZES)) {
          const quizzesStore = db.createObjectStore(STORES.QUIZZES, { keyPath: 'id' });
          quizzesStore.createIndex('knowledgeCardId', 'knowledgeCardId', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.QUIZ_ATTEMPTS)) {
          const quizAttemptsStore = db.createObjectStore(STORES.QUIZ_ATTEMPTS, { keyPath: 'id' });
          quizAttemptsStore.createIndex('quizId', 'quizId', { unique: false });
          quizAttemptsStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
        }
      };
    });
  };

  // Get a database connection
  const getDB = async (): Promise<IDBDatabase> => {
    return initDatabase();
  };

  // Generic function to add an item to a store
  const addItem = async <T>(storeName: string, item: T): Promise<T> => {
    const db = await getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(item);
      
      request.onsuccess = () => {
        resolve(item);
      };
      
      request.onerror = (event) => {
        console.error(`Error adding item to ${storeName}:`, event);
        reject(new Error(`Failed to add item to ${storeName}`));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  };

  // Generic function to update an item in a store
  const updateItem = async <T>(storeName: string, item: T): Promise<T> => {
    const db = await getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      
      request.onsuccess = () => {
        resolve(item);
      };
      
      request.onerror = (event) => {
        console.error(`Error updating item in ${storeName}:`, event);
        reject(new Error(`Failed to update item in ${storeName}`));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  };

  // Generic function to get all items from a store
  const getAllItems = async <T>(storeName: string): Promise<T[]> => {
    const db = await getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error(`Error getting all items from ${storeName}:`, event);
        reject(new Error(`Failed to get items from ${storeName}`));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  };

  // Generic function to get an item by ID
  const getItemById = async <T>(storeName: string, id: string): Promise<T | null> => {
    const db = await getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = (event) => {
        console.error(`Error getting item from ${storeName}:`, event);
        reject(new Error(`Failed to get item from ${storeName}`));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  };

  // Generic function to delete an item by ID
  const deleteItemById = async (storeName: string, id: string): Promise<boolean> => {
    const db = await getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error(`Error deleting item from ${storeName}:`, event);
        reject(new Error(`Failed to delete item from ${storeName}`));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  };

  // Implementation of KnowledgeCardStorage
  knowledgeCardsAPI = {
    async add(card) {
      const newCard: KnowledgeCard = {
        ...card as any,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await addItem(STORES.KNOWLEDGE_CARDS, newCard);
      return newCard;
    },
    
    async update(card) {
      const updatedCard = {
        ...card,
        updatedAt: new Date().toISOString(),
      };
      await updateItem(STORES.KNOWLEDGE_CARDS, updatedCard);
      return updatedCard;
    },
    
    async getAll() {
      return getAllItems<KnowledgeCard>(STORES.KNOWLEDGE_CARDS);
    },
    
    async getById(id) {
      return getItemById<KnowledgeCard>(STORES.KNOWLEDGE_CARDS, id);
    },
    
    async delete(id) {
      return deleteItemById(STORES.KNOWLEDGE_CARDS, id);
    },
    
    async getDueForReview() {
      const cards = await this.getAll();
      const now = new Date();
      
      return cards.filter(card => {
        if (!card.reviewDueDate) return false;
        const dueDate = new Date(card.reviewDueDate);
        return dueDate <= now;
      });
    },
  };

  // Implementation of TagStorage
  tagsAPI = {
    async add(tag) {
      const newTag: Tag = {
        ...tag as any,
        id: crypto.randomUUID(),
      };
      await addItem(STORES.TAGS, newTag);
      return newTag;
    },
    
    async update(tag) {
      await updateItem(STORES.TAGS, tag);
      return tag;
    },
    
    async getAll() {
      return getAllItems<Tag>(STORES.TAGS);
    },
    
    async getById(id) {
      return getItemById<Tag>(STORES.TAGS, id);
    },
    
    async delete(id) {
      return deleteItemById(STORES.TAGS, id);
    },
  };

  // Implementation of QuizStorage
  quizzesAPI = {
    async add(quiz) {
      const newQuiz: Quiz = {
        ...quiz as any,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      await addItem(STORES.QUIZZES, newQuiz);
      return newQuiz;
    },
    
    async update(quiz) {
      await updateItem(STORES.QUIZZES, quiz);
      return quiz;
    },
    
    async getAll() {
      return getAllItems<Quiz>(STORES.QUIZZES);
    },
    
    async getById(id) {
      return getItemById<Quiz>(STORES.QUIZZES, id);
    },
    
    async getByKnowledgeCardId(knowledgeCardId) {
      const quizzes = await this.getAll();
      return quizzes.filter(quiz => quiz.knowledgeCardId === knowledgeCardId);
    },
    
    async delete(id) {
      return deleteItemById(STORES.QUIZZES, id);
    },
  };

  // Implementation of QuizAttemptStorage
  quizAttemptsAPI = {
    async add(attempt) {
      const newAttempt: QuizAttempt = {
        ...attempt as any,
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
      };
      await addItem(STORES.QUIZ_ATTEMPTS, newAttempt);
      return newAttempt;
    },
    
    async getAll() {
      return getAllItems<QuizAttempt>(STORES.QUIZ_ATTEMPTS);
    },
    
    async getByQuizId(quizId) {
      const attempts = await this.getAll();
      return attempts
        .filter(attempt => attempt.quizId === quizId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
  };

  // Implementation of SettingsStorage
  settingsAPI = {
    async getSettings() {
      try {
        const settings = await getItemById<UserSettings>(STORES.SETTINGS, 'user-settings');
        if (settings) {
          return settings;
        }
        
        // Create default settings if none exist
        const defaultSettings: UserSettings = {
          id: 'user-settings',
          theme: 'light',
          ollamaEndpoint: 'http://localhost:11434',
          ollamaModel: 'gemma3:4b',
          ollamaTemperature: 0.7,
          reviewSettings: {
            easyInterval: 7, // days
            mediumInterval: 3, // days
            hardInterval: 1, // day
          },
        };
        
        await addItem(STORES.SETTINGS, defaultSettings);
        return defaultSettings;
      } catch (error) {
        console.error('Error getting settings:', error);
        
        // Return default settings in case of error
        return {
          id: 'user-settings',
          theme: 'light',
          ollamaEndpoint: 'http://localhost:11434',
          ollamaModel: 'gemma3:4b',
          ollamaTemperature: 0.7,
          reviewSettings: {
            easyInterval: 7,
            mediumInterval: 3,
            hardInterval: 1,
          },
        };
      }
    },
    
    async updateSettings(settings) {
      await updateItem(STORES.SETTINGS, settings);
      return settings;
    },
  };

  // Initialize the database on first load
  initDatabase().catch(error => {
    console.error('Failed to initialize database:', error);
  });
}

// Export the APIs
export { knowledgeCardsAPI, tagsAPI, quizzesAPI, quizAttemptsAPI, settingsAPI }; 