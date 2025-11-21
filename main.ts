import type { RerankStrategy } from './types'
import { retrieveCandidates } from './modules/retriever'
import { rankWithHeuristic } from './modules/rankers/heuristic'
import { rankWithLLM } from './modules/rankers/reasoner'

const STRATEGIES: Record<string, RerankStrategy> = {
  heuristic: rankWithHeuristic,
  llm: rankWithLLM,
}

async function main() {
  const args = process.argv.slice(2)
  const query = args[0]

  // 获取策略参数，默认 fallback 到 heuristic
  const strategyName =
    args.find(a => a.startsWith('--strategy='))?.split('=')[1] || 'heuristic'
  const rankFn = STRATEGIES[strategyName]

  if (!query || !rankFn) {
    console.error(
      `用法: bun run dev "查询内容" [--strategy=heuristic|llm]`
    )
    process.exit(1)
  }

  console.log(`🔍 Query: "${query}"`)
  console.log(`🔀 Strategy: ${strategyName}`)

  // Retrieval
  const candidates = await retrieveCandidates(query, 20)
  console.log(`📡 Retrieved ${candidates.length} raw candidates.`)

  // Reranking
  const finalResults = await rankFn(query, candidates)

  // Display
  console.log('\n🏆 Top Results:\n')
  finalResults.slice(0, 5).forEach((item, index) => {
    console.log(`#${index + 1} ${item.name}`)

    if (item.reasoning) {
      console.log(`   🧠 Reasoning: ${item.reasoning}`)
    } else if (item.score) {
      console.log(`   📊 Score: ${item.score.toFixed(4)}`)
    }

    if (!item.reasoning) {
      console.log(`   📝 ${item.summary}`)
    }

    console.log(`   📂 ${item.file_path}:${item.start_line}`)

    console.log('-'.repeat(40))
  })
}

main()
