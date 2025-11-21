// Raw
export interface CodeNode {
  id: string
  name: string
  fullName: string
  type: 'Method' | 'Property' | 'Class'
  baseType: string | null
  codeBody: string
  filePath: string
  startLine: number
  attributes: string[]
  attributeDetails: string[]
  implementedInterfaces: string[]
  calls: string[]
  calledBy: string[]
}

// Enriched
export interface CodeNode {
  summary: string
  codeRole: 'CoreLogic' | 'DataHolder' | 'UI' | 'Helper' | 'Structure'
  weight: number
}

export type DbRow = Pick<CodeNode, 'id' | 'type'> & {
  code_body: string
  calls: string
}

export interface SearchResult extends CodeNode {
  distance: number
  score?: number
  reasoning?: string
}

export type RerankStrategy = (
  query: string,
  candidates: SearchResult[]
) => Promise<SearchResult[]>
