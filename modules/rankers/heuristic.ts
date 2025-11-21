import { RerankStrategy, SearchResult } from '#types'

export const rankWithHeuristic: RerankStrategy = (
  query: string,
  candidates: SearchResult[]
): Promise<SearchResult[]> => {
  const queryLower = query.toLowerCase()

  const ranked = candidates.map(item => {
    // 1. 归一化距离 (假设 distance 范围在 0~1 之间，越小越好)
    // 如果用的是 cosine distance，值可能是 0~2，这里做个简单反转
    const similarity = Math.max(0, 1 - item.distance)

    // 2. 基础公式: 相似度占 70%, 静态权重占 30%
    let finalScore = similarity * 0.7 + item.weight * 0.3

    // 3. 规则修正 (Heuristics)
    // 核心逻辑加分
    if (item.code_role === 'CoreLogic') {
      finalScore *= 1.1
    }

    // 如果搜 "Menu/Dialog" 等词，UI 加分
    if (
      item.code_role === 'UI' &&
      (queryLower.includes('menu') || queryLower.includes('dialog'))
    ) {
      finalScore *= 1.2
    }

    return { ...item, score: finalScore }
  })

  // 降序排列
  return Promise.resolve(ranked.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)))
}
