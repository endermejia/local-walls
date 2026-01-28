export type RouterCommand = readonly (string | number)[] | string;

export interface BreadcrumbItem {
  caption: string;
  routerLink: RouterCommand;
}
