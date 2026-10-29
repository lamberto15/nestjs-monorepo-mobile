/**
 * The `?filter=` JSON of a list (docs/api-conventions.md, "Filters"), typed
 * loosely: fields and operators are checked by the API, which answers 400
 * `validation_failed` naming what it refuses. Each route's operators are in
 * its query parameters (`status.in`, `title.contains`…), which the generated
 * types list for the flat syntax.
 */
export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'isNull';

export type FilterValue =
  string | number | boolean | readonly (string | number)[];

export interface FilterCondition {
  field: string;
  op: FilterOperator;
  /** Left out for `isNull` (true). Dates are ISO 8601 strings with an offset. */
  value?: FilterValue;
}

/** A condition, or a group: nested at most 3 deep, 30 conditions at most. */
export type Filter =
  FilterCondition | { and: readonly Filter[] } | { or: readonly Filter[] };

/** The value of `?filter=` (the client URL-encodes it). */
export const filterParam = (filter: Filter): string => JSON.stringify(filter);

/** `?sort=`: fields, `-` for descending, at most 3. */
export const sortParam = (...fields: string[]): string => fields.join(',');
