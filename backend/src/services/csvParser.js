const { parse } = require("csv-parse/sync");

/**
 * Parses a CSV buffer into an array of record objects.
 * Each record is a plain object with column names as keys.
 *
 * @param {Buffer} buffer - Raw CSV file buffer
 * @returns {{ headers: string[], records: object[] }}
 */
function parseCSV(buffer) {
  const content = buffer.toString("utf-8");

  const records = parse(content, {
    columns: true,          // Use first row as column headers
    skip_empty_lines: true, // Ignore blank lines
    trim: true,             // Trim whitespace from values
    relax_column_count: true, // Handle rows with inconsistent column counts
    bom: true,              // Handle BOM character in UTF-8 files
  });

  // Extract headers from the first record's keys
  const headers = records.length > 0 ? Object.keys(records[0]) : [];

  return { headers, records };
}

module.exports = { parseCSV };
