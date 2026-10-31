import { db } from '@/lib/db'
import type { StoredChatMessage } from '@/types'

/**
 * Chat Repository
 * 聊天记录按项目保存在本地 IndexedDB
 */
export const ChatRepository = {
  /**
   * 保存（新增或覆盖）一条聊天记录
   */
  async save(message: StoredChatMessage): Promise<void> {
    await db.chatMessages.put(message)
  },

  /**
   * 获取某个项目的全部聊天记录，按时间正序
   */
  async getByProject(projectId: string): Promise<StoredChatMessage[]> {
    return db.chatMessages
      .where('projectId')
      .equals(projectId)
      .sortBy('timestamp')
  },

  /**
   * 删除单条聊天记录
   */
  async delete(id: string): Promise<void> {
    await db.chatMessages.delete(id)
  },

  /**
   * 删除某个项目的全部聊天记录
   */
  async deleteByProject(projectId: string): Promise<void> {
    await db.chatMessages.where('projectId').equals(projectId).delete()
  },
}
