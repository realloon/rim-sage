type CodeType = 'Method' | 'Property' | 'Class'

export type CodeRole =
  | 'CoreLogic'
  | 'DataHolder'
  | 'UI'
  | 'Helper'
  | 'Structure'

// lower camel case
export interface CodeNode {
  id: string
  name: string
  fullName: string
  type: CodeType
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
  codeRole: CodeRole
  weight: number
}

// snake_case
export interface NodeRow {
  rowid: string
  id: string
  name: string
  full_name: string
  type: CodeType
  base_type: string | null
  code_body: string
  file_path: string
  start_line: number
  attributes: string[]
  attribute_details: string // array
  implemented_interfaces: string // array
  calls: string | string[] // array
  called_by: string | string[] // array
  // Enriched
  summary: string
  code_role: CodeRole
  weight: number
}

export interface SearchResult extends NodeRow {
  distance?: number
  score?: number
  reasoning?: string
}

export type RerankStrategy = (
  query: string,
  candidates: SearchResult[]
) => Promise<SearchResult[]>
