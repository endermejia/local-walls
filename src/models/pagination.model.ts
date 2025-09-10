export interface PageableResponse<T> {
  items: T[];
  pagination: {
    hasNext: boolean;
    itemsOnPage: number;
    pageCount: number;
    pageIndex: number;
    pageSize: number;
    totalItems: number;
  };
}
