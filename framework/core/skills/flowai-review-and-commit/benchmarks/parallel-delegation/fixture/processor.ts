/**
 * Data processor with validation, transformation, and formatting.
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

export type OutputFormat = "json" | "csv" | "xml";

export class DataProcessor {
  private schema: Schema;
  private strict: boolean;
  private batchSize: number;

  constructor(options: ProcessorOptions) {
    this.schema = options.schema;
    this.strict = options.strict ?? true;
    this.batchSize = options.batchSize ?? 100;
  }

  validate(record: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, def] of Object.entries(this.schema.fields)) {
      const value = record[field];

      if (value === undefined || value === null) {
        if (this.schema.required?.includes(field)) {
          errors.push({ field, message: "Required field missing", value });
        }
        continue;
      }

      if (typeof value !== def.type && def.type !== "date") {
        errors.push({
          field,
          message: `Expected ${def.type}, got ${typeof value}`,
          value,
        });
        continue;
      }

      if (def.type === "number" && typeof value === "number") {
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

      if (
        def.type === "string" && typeof value === "string" && def.pattern
      ) {
        if (!new RegExp(def.pattern).test(value)) {
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

  transform(
    records: Record<string, unknown>[],
  ): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = [];

    for (let i = 0; i < records.length; i += this.batchSize) {
      const batch = records.slice(i, i + this.batchSize);

      for (const record of batch) {
        if (this.strict) {
          const validation = this.validate(record);
          if (!validation.valid) {
            throw new Error(
              `Validation failed: ${
                validation.errors.map((e) => e.message).join(", ")
              }`,
            );
          }
        }

        const transformed: Record<string, unknown> = {};
        for (const [field, def] of Object.entries(this.schema.fields)) {
          const value = record[field];
          if (value === undefined) continue;

          if (def.type === "string" && typeof value === "string") {
            transformed[field] = value.trim();
          } else if (def.type === "date" && typeof value === "string") {
            transformed[field] = new Date(value).toISOString();
          } else {
            transformed[field] = value;
          }
        }
        results.push(transformed);
      }
    }

    return results;
  }

  format(
    records: Record<string, unknown>[],
    outputFormat: OutputFormat,
  ): string {
    switch (outputFormat) {
      case "json":
        return JSON.stringify(records, null, 2);

      case "csv": {
        const fields = Object.keys(this.schema.fields);
        const header = fields.join(",");
        const rows = records.map((r) =>
          fields.map((f) => String(r[f] ?? "")).join(",")
        );
        return [header, ...rows].join("\n");
      }

      case "xml": {
        const items = records.map((r) => {
          const fields = Object.entries(r)
            .map(([k, v]) => `    <${k}>${String(v)}</${k}>`)
            .join("\n");
          return `  <record>\n${fields}\n  </record>`;
        });
        return `<?xml version="1.0"?>\n<data>\n${items.join("\n")}\n</data>`;
      }

      default:
        throw new Error(`Unsupported format: ${outputFormat}`);
    }
  }
}
