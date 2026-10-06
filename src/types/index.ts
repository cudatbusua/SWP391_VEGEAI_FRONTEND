// barrel over types (ActionResult, Paginated)
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}