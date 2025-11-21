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
  // Enriched
  summary: string
  codeRole: 'CoreLogic' | 'DataHolder' | 'UI' | 'Helper' | 'Structure'
  weight: number
}

export type CodeRow = CodeNode & {
  full_name: string
  base_type: string | null
  code_body: string
  file_path: string
  start_line: number
  attribute_details: string[]
  implemented_interfaces: string[]
  calls: string
  called_by: string
  code_role: string
}

export interface SearchResult extends CodeRow {
  distance?: number
  score?: number
  reasoning?: string
}

export type RerankStrategy = (
  query: string,
  candidates: SearchResult[]
) => Promise<SearchResult[]>
