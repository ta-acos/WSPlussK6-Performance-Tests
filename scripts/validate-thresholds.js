#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const schemaPath = path.join(process.cwd(), 'performance-thresholds.schema.json');
const thresholdsPath = path.join(process.cwd(), 'src', 'config', 'performance-thresholds.json');

if (!fs.existsSync(schemaPath)) {
  console.error('[validate-thresholds] Schema file not found:', schemaPath);
  process.exit(1);
}
if (!fs.existsSync(thresholdsPath)) {
  console.error('[validate-thresholds] Thresholds file not found:', thresholdsPath);
  process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const data = JSON.parse(fs.readFileSync(thresholdsPath, 'utf-8'));

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validate = ajv.compile(schema);
const valid = validate(data);

if (!valid) {
  console.error('\n❌ performance-thresholds.json FAILED schema validation');
  for (const err of validate.errors) {
    console.error(` - ${err.instancePath} ${err.message}`);
  }
  process.exit(1);
}

// Logical ordering warnings
const bands = data.uiBands || {};
const issues = [];
function checkOrder(obj, name) {
  if (!obj) return;
  if (!(obj.good <= obj.watch && obj.watch <= obj.investigate)) {
    issues.push(`${name} values should be non-decreasing (good <= watch <= investigate). Currently: good=${obj.good}, watch=${obj.watch}, investigate=${obj.investigate}`);
  }
}
checkOrder(bands.latencyMs, 'latencyMs');
checkOrder(bands.errorRate, 'errorRate');
checkOrder(bands.checkFailureRate, 'checkFailureRate');

console.log('✅ performance-thresholds.json schema validation passed.');
if (issues.length) {
  console.warn('\n⚠ Ordering Warnings:');
  issues.forEach(i => console.warn(' - ' + i));
}

