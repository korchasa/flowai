/**
 * Data processor with validation, transformation, and JSON output.
 */

export interface Schema {
  fields: Record<string, FieldDef>;
  required?: string[];
}

export interface FieldDef {
  type: "string" | "number" | "boolean" | "date";
  min?: number;
  max?: number;
  pattern?: string;
}

export interface ProcessorOptions {
  schema: Schema;
  strict?: boolean;
  batchSize?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

/**
 * ISO 8601 calendar date (`2026-01-31`) or date-time with an explicit offset
 * (`2026-01-31T10:00:00Z`, `2026-01-31T10:00+02:00`). A date-time without an
 * offset is rejected: `new Date()` would read it in the host's local time zone.
 */
const ISO_DATE =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-](\d{2}):(\d{2})))?$/;

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** True for an ISO date whose calendar fields exist: `2026-02-30` is false. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  if (m[4] !== undefined && (Number(m[4]) > 23 || Number(m[5]) > 59)) {
    return false;
  }
  if (m[6] !== undefined && Number(m[6]) > 59) return false;
  if (m[7] !== undefined && (Number(m[7]) > 23 || Number(m[8]) > 59)) {
    return false;
  }
  return true;
}

export class DataProcessor {
  private schema: Schema;
  private strict: boolean;
  private batchSize: number;
  private patterns = new Map<string, RegExp>();

  constructor(options: ProcessorOptions) {
    const batchSize = options.batchSize ?? 100;
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new RangeError(
        `batchSize must be a positive integer, got ${batchSize}`,
      );
    }
    const unknown = (options.schema.required ?? []).filter((f) =>
      !Object.hasOwn(options.schema.fields, f)
    );
    if (unknown.length > 0) {
      throw new Error(
        `required names fields not in schema: ${unknown.join(", ")}`,
      );
    }
    for (const [field, def] of Object.entries(options.schema.fields)) {
      // Invalid patterns fail here, once, instead of on every record.
      if (def.pattern) this.patterns.set(field, new RegExp(def.pattern));
    }
    this.schema = options.schema;
    this.strict = options.strict ?? true;
    this.batchSize = batchSize;
  }

  validate(record: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, def] of Object.entries(this.schema.fields)) {
      const value = own(record, field);

      if (value === undefined || value === null) {
        if (this.schema.required?.includes(field)) {
          errors.push({ field, message: "Required field missing", value });
        }
        continue;
      }

      if (def.type === "date") {
        if (!isIsoDate(value)) {
          errors.push({
            field,
            message: `Expected an ISO date string, got ${String(value)}`,
            value,
          });
          continue;
        }
      } else {
        const actual: string = typeof value;
        if (actual !== def.type) {
          errors.push({
            field,
            message: `Expected ${def.type}, got ${actual}`,
            value,
          });
          continue;
        }
      }

      if (def.type === "number" && typeof value === "number") {
        if (!Number.isFinite(value)) {
          errors.push({ field, message: "Expected a finite number", value });
          continue;
        }
        if (def.min !== undefined && value < def.min) {
          errors.push({
            field,
            message: `Value ${value} below minimum ${def.min}`,
            value,
          });
        }
        if (def.max !== undefined && value > def.max) {
          errors.push({
            field,
            message: `Value ${value} above maximum ${def.max}`,
            value,
          });
        }
      }

      const pattern = this.patterns.get(field);
      if (def.type === "string" && typeof value === "string" && pattern) {
        if (!pattern.test(value)) {
          errors.push({
            field,
            message: `Value does not match pattern ${def.pattern}`,
            value,
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Normalize every record (trim strings, dates to UTC ISO) and, in strict
   * mode, validate the NORMALIZED record — the one that is returned.
   */
  transform(
    records: Record<string, unknown>[],
  ): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = [];

    for (let i = 0; i < records.length; i += this.batchSize) {
      const batch = records.slice(i, i + this.batchSize);

      for (const [offset, record] of batch.entries()) {
        const index = i + offset;
        if (
          typeof record !== "object" || record === null || Array.isArray(record)
        ) {
          throw new TypeError(`record ${index} is not an object`);
        }

        const transformed: Record<string, unknown> = {};
        for (const [field, def] of Object.entries(this.schema.fields)) {
          const value = own(record, field);
          if (value === undefined) continue;

          if (def.type === "string" && typeof value === "string") {
            transformed[field] = value.trim();
          } else if (def.type === "date" && typeof value === "string") {
            // Non-strict mode does not validate, so the date is checked here:
            // `new Date("nope").toISOString()` would throw a bare RangeError.
            if (!isIsoDate(value)) {
              throw new Error(
                `record ${index}: invalid date in field ${field}: ${value}`,
              );
            }
            transformed[field] = new Date(value).toISOString();
          } else {
            transformed[field] = value;
          }
        }

        if (this.strict) {
          const validation = this.validate(transformed);
          if (!validation.valid) {
            throw new Error(
              `record ${index} failed validation: ${
                validation.errors.map((e) => `${e.field}: ${e.message}`).join(
                  ", ",
                )
              }`,
            );
          }
        }
        results.push(transformed);
      }
    }

    return results;
  }

  /** Serialize records as pretty-printed JSON. */
  toJson(records: Record<string, unknown>[]): string {
    return JSON.stringify(records, null, 2);
  }
}

/** Read a field the record itself holds, never one inherited from its prototype. */
function own(record: Record<string, unknown>, field: string): unknown {
  return Object.hasOwn(record, field) ? record[field] : undefined;
}
