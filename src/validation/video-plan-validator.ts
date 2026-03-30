import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020, ErrorObject, ValidateFunction } from "ajv/dist/2020.js";
import { VideoPlan } from "../domain/video-plan.js";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateVideoPlanFn = buildVideoPlanValidator();

export interface VideoPlanValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateVideoPlan(input: unknown): input is VideoPlan {
  return validateVideoPlanFn(input);
}

export function assertValidVideoPlan(input: unknown): asserts input is VideoPlan {
  if (!validateVideoPlanFn(input)) {
    throw new Error(formatValidationErrors(validateVideoPlanFn.errors));
  }
}

export function getVideoPlanValidationResult(input: unknown): VideoPlanValidationResult {
  const ok = validateVideoPlanFn(input);
  return {
    ok,
    errors: ok ? [] : normalizeValidationErrors(validateVideoPlanFn.errors),
  };
}

function buildVideoPlanValidator(): ValidateFunction<VideoPlan> {
  const schemaPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../schemas/video-plan.schema.json",
  );
  const schemaJson = readFileSync(schemaPath, "utf-8");
  const schema = JSON.parse(schemaJson) as object;
  return ajv.compile<VideoPlan>(schema);
}

function formatValidationErrors(errors: ErrorObject[] | null | undefined): string {
  const normalizedErrors = normalizeValidationErrors(errors);
  return `VideoPlan validation failed: ${normalizedErrors.join("; ")}`;
}

function normalizeValidationErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors || errors.length === 0) {
    return ["unknown validation error"];
  }

  return errors.map((error) => {
    const path = error.instancePath || "/";
    const message = error.message ?? "validation error";
    return `${path} ${message}`;
  });
}
