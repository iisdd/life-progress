export const CATEGORIES = ['life', 'health', 'money', 'work', 'study', 'hobby', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

export const ITEM_STATUSES = ['planned', 'doing', 'paused', 'done'] as const
export type ItemStatus = (typeof ITEM_STATUSES)[number]

export const STEP_STATUSES = ['todo', 'doing', 'done'] as const
export type StepStatus = (typeof STEP_STATUSES)[number]

export const CATEGORY_LABEL: Record<Category, string> = {
  life: '生活',
  health: '健康',
  money: '财务',
  work: '工作',
  study: '学习',
  hobby: '兴趣',
  other: '其他',
}

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  planned: '想做',
  doing: '正在做',
  paused: '先放放',
  done: '做成了',
}

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  todo: '待办',
  doing: '正在做',
  done: '做成了',
}

export type Item = {
  id: string
  title: string
  category: Category
  status: ItemStatus
  dueDate: string | null
  note: string
  manualProgress: number | null
  archived: boolean
  createdAt: string
}

export type StepCheck = {
  id: string
  text: string
  done: boolean
  indent: number
}

export type Step = {
  id: string
  itemId: string
  title: string
  checks: StepCheck[]
  status: StepStatus
  startDate: string | null
  dueDate: string | null
  order: number
}

export type LogEntry = {
  id: string
  itemId: string
  date: string
  text: string
}

export type AppData = {
  items: Item[]
  steps: Step[]
  logs: LogEntry[]
}
