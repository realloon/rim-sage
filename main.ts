import { argv } from 'bun'
import { parseArgs } from 'util'
import { retrieveCandidates } from '#modules/retriever'
import { rankWithHeuristic, rankWithLLM } from '#modules/rankers'

const {
  values: { strategy = 'heuristic' },
  positionals: [query],
} = parseArgs({
  args: argv.slice(2),
  options: {
    strategy: {
      type: 'string',
      short: 's',
    },
  },
  strict: true,
  allowPositionals: true,
})

const STRATEGIES = {
  heuristic: rankWithHeuristic,
  llm: rankWithLLM,
}

async function main() {
  const rankFn = STRATEGIES[strategy as 'heuristic' | 'llm']

  if (!query || !rankFn) {
    console.error(`用法: bun run dev "查询内容" --strategy heuristic|llm`)
    process.exit(1)
  }

  console.log(`🔍 Query: "${query}"`)
  console.log(`🔀 Strategy: ${strategy}`)

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
