/**
 * A unit of data classification defined by an organization. A classification
 * level may be associated with specific storage and handling requirements or
 * expectations.
 */
export interface ClassificationLevel {
  readonly id?: string;
  readonly status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  readonly order?: number;
  readonly name?: string;
  readonly description?: string;
  readonly guideline?: string;
  readonly color?:
    | 'RED'
    | 'RED_BOLD'
    | 'ORANGE'
    | 'YELLOW'
    | 'GREEN'
    | 'BLUE'
    | 'NAVY'
    | 'TEAL'
    | 'PURPLE'
    | 'GREY'
    | 'LIME';
}

/**
 * Response shape for `GET /classification-levels`. The endpoint returns a bare
 * JSON array of {@link ClassificationLevel}.
 */
export type ListClassificationLevelsResponse = readonly ClassificationLevel[];
