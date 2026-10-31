import Dexie, { type EntityTable } from 'dexie'
import type { Project, VersionHistory, StoredChatMessage } from '@/types'

/**
 * AI Diagram Hub Database
 * Using Dexie.js for IndexedDB management
 */
class DiagramHubDB extends Dexie {
  projects!: EntityTable<Project, 'id'>
  versionHistory!: EntityTable<VersionHistory, 'id'>
  chatMessages!: EntityTable<StoredChatMessage, 'id'>

  constructor() {
    super('DiagramHubDB')

    this.version(1).stores({
      // Primary key: id, indexed fields: title, engineType, createdAt, updatedAt
      projects: 'id, title, engineType, createdAt, updatedAt',
      // Primary key: id, indexed fields: projectId, timestamp
      versionHistory: 'id, projectId, timestamp',
    })

    this.version(2).stores({
      projects: 'id, title, engineType, createdAt, updatedAt',
      versionHistory: 'id, projectId, timestamp',
      // Primary key: id, indexed fields: projectId, timestamp
      chatMessages: 'id, projectId, timestamp',
    })
  }
}

// Singleton database instance
export const db = new DiagramHubDB()
