export interface QueryResult {
  success: boolean
  question: string
  sql: string
  explanation: string
  chart_type: string
  chart_config: {
    x_axis: string
    y_axis: string
    title: string
  }
  data: Record<string, any>[]
  columns: string[]
  row_count: number
  error: string | null
  recovered: boolean
}

export interface ConversationTurn {
  question: string
  response: QueryResult
}