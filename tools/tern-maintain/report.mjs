import Ajv from 'ajv';
import analysisSchema from './analysis.schema.json' with {type: 'json'};
const ajv = new Ajv({allErrors: true, strict: false});
const hash = {type: 'string', pattern: '^[a-f0-9]{64}$'};
const schema = {
  type: 'object', required: ['schemaVersion'],
  properties: {
    schemaVersion: {const: 1}, inputSha256: hash,
    originalSha256: hash, candidateSha256: hash,
    checks: {
      type: 'array', items: {
        type: 'object', required: ['name', 'status'],
        properties: {
          name: {type: 'string', minLength: 1},
          status: {enum: ['passed', 'failed', 'not_run']},
          details: {type: 'string'},
        },
      },
    },
    decision: {enum: ['manual_review_required']},
    deployable: {const: false},
  },
  allOf: [{
    if: {required: ['decision']},
    then: {
      required: ['inputSha256', 'fonts', 'panicFunctions', 'clocks'],
      properties: {
        fonts: {type: 'array'}, panicFunctions: {type: 'array'}, clocks: {type: 'array'},
      },
    },
  }],
};
const validate = ajv.compile(schema);
const validateAnalysis = ajv.compile(analysisSchema);
export function validateReport(report) {
  if (!validate(report)) throw Error(`Invalid report: ${ajv.errorsText(validate.errors)}`);
  if (report.decision && !validateAnalysis(report)) throw Error(`Invalid analysis: ${ajv.errorsText(validateAnalysis.errors)}`);
  return report;
}
