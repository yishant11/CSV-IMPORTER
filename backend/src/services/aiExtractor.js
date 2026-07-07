const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SYSTEM_PROMPT, buildUserPrompt } = require("../utils/prompt");

const BATCH_SIZE = 50;          // Larger batches = fewer API calls (fits output limits easily)
const MAX_RETRIES = 3;
const MAX_RECORDS = 1000;        // Cap to prevent extreme processing times and timeouts
const RETRY_DELAY_MS = 1500;    // Wait longer between retries (rate limit friendly)
const BATCH_DELAY_MS = 1000;    // Pause between every batch to avoid rate limits

/**
 * Extracts CRM records from raw CSV records using Google Gemini AI.
 * Falls back to a high-performance heuristic mapper if Gemini quota is exceeded or API key is dead.
 *
 * @param {object[]} rawRecords - Array of raw CSV record objects
 * @returns {Promise<{ records: object[], skipped: object[], totalImported: number, totalSkipped: number }>}
 */
async function extractWithAI(rawRecords) {
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyPlaceholder = !apiKey || apiKey.includes("your_gemini_api_key");

  // Limit records to prevent timeout
  const recordsToProcess = rawRecords.slice(0, MAX_RECORDS);
  const truncated = rawRecords.length > MAX_RECORDS;

  if (truncated) {
    console.warn(
      `CSV has ${rawRecords.length} records. Processing first ${MAX_RECORDS} to avoid timeout.`
    );
  }

  // Force fallback if key is missing or not set
  if (isKeyPlaceholder) {
    console.warn("GEMINI_API_KEY not configured or placeholder detected. Activating heuristic fallback parser!");
    const fallbackResult = heuristicExtract(recordsToProcess);
    return {
      records: fallbackResult.records,
      skipped: fallbackResult.skipped,
      totalImported: fallbackResult.records.length,
      totalSkipped: fallbackResult.skipped.length,
      fallbackUsed: true
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  });

  // Split records into batches
  const batches = [];
  for (let i = 0; i < recordsToProcess.length; i += BATCH_SIZE) {
    batches.push(recordsToProcess.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `Processing ${recordsToProcess.length} records in ${batches.length} batch(es) using Gemini...`
  );

  const allRecords = [];
  const allSkipped = [];
  let useFallback = false;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    if (useFallback) {
      console.log(`Processing batch ${i + 1}/${batches.length} using heuristic fallback (rate-limit bypass)...`);
      const fallbackResult = heuristicExtract(batch);
      allRecords.push(...fallbackResult.records);
      allSkipped.push(...fallbackResult.skipped);
      continue;
    }

    console.log(
      `Processing batch ${i + 1}/${batches.length} (${batch.length} records)...`
    );

    try {
      const result = await processWithRetry(model, batch, i + 1, batches.length);

      if (result.records) {
        allRecords.push(...result.records);
      }
      if (result.skipped) {
        allSkipped.push(...result.skipped);
      }
    } catch (batchError) {
      console.error(`Batch ${i + 1} failed completely:`, batchError.message);

      // Detect Quota Exceeded (429) or Project blocked
      const isQuotaError =
        batchError.message?.includes("429") ||
        batchError.message?.includes("quota") ||
        batchError.message?.includes("RESOURCE_EXHAUSTED");

      if (isQuotaError) {
        console.warn("⚠️ Gemini Quota Exceeded / Limit Reached! Switching all remaining batches to smart heuristic fallback...");
        useFallback = true;
        // Process current batch with fallback
        const fallbackResult = heuristicExtract(batch);
        allRecords.push(...fallbackResult.records);
        allSkipped.push(...fallbackResult.skipped);
      } else {
        allSkipped.push(
          ...batch.map((record) => ({
            original: record,
            reason: `AI processing failed: ${batchError.message}`,
          }))
        );
      }
    }

    // Delay between batches to respect rate limits
    if (!useFallback && i < batches.length - 1) {
      console.log(`Waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await sleep(BATCH_DELAY_MS);
    }
  }

  return {
    records: allRecords,
    skipped: allSkipped,
    totalImported: allRecords.length,
    totalSkipped: allSkipped.length,
    fallbackUsed: useFallback
  };
}

/**
 * High-performance deterministic rule-based CSV column mapper fallback.
 * Emulates the mapping logic of Gemini when API quota is exhausted.
 */
function heuristicExtract(rawRecords) {
  if (rawRecords.length === 0) return { records: [], skipped: [] };
  const keys = Object.keys(rawRecords[0]);

  const mapping = {};

  // Simple string-match synonyms
  const findColumn = (synonyms) => {
    return keys.find((k) => {
      const lower = k.toLowerCase().replace(/[\s_-]/g, "");
      return synonyms.some((syn) => lower.includes(syn));
    });
  };

  mapping.email = findColumn(["email", "mail"]);
  mapping.phone = findColumn(["phone", "mobile", "tel", "contact", "cell", "number"]);
  mapping.firstNameCol = findColumn(["firstname", "first"]);
  mapping.lastNameCol = findColumn(["lastname", "last"]);
  mapping.fullNameCol = findColumn(["fullname", "name", "customer", "lead"]);
  mapping.company = findColumn(["company", "org", "firm", "business"]);
  mapping.city = findColumn(["city", "town"]);
  mapping.state = findColumn(["state", "province", "region"]);
  mapping.country = findColumn(["country", "nation"]);
  mapping.createdAt = findColumn(["created", "date", "subscription", "time"]);
  mapping.leadOwner = findColumn(["owner", "agent", "sales", "assigned"]);
  mapping.status = findColumn(["status", "stage"]);
  mapping.notes = findColumn(["note", "remark", "comment", "desc", "website", "url"]);

  const records = [];
  const skipped = [];

  for (const raw of rawRecords) {
    let email = "";
    if (mapping.email && raw[mapping.email]) {
      email = String(raw[mapping.email]).trim();
    }

    let phone = "";
    if (mapping.phone && raw[mapping.phone]) {
      phone = String(raw[mapping.phone]).trim();
    }

    // Skip rule: no email AND no phone
    if (!email && !phone) {
      skipped.push({
        original: raw,
        reason: "Skipped: Record does not contain an email address or mobile number.",
      });
      continue;
    }

    // Extract name
    let name = "";
    if (mapping.fullNameCol && raw[mapping.fullNameCol]) {
      name = String(raw[mapping.fullNameCol]).trim();
    } else if (mapping.firstNameCol) {
      name = `${raw[mapping.firstNameCol] || ""} ${mapping.lastNameCol && raw[mapping.lastNameCol] ? raw[mapping.lastNameCol] : ""}`.trim();
    }
    if (!name) name = email ? email.split("@")[0] : "Lead";

    // Format phone and country code
    let countryCode = "+91";
    let mobile = phone;

    const cleanPhone = phone.replace(/[^\d+]/g, "");
    if (cleanPhone.startsWith("+")) {
      if (cleanPhone.startsWith("+91")) {
        countryCode = "+91";
        mobile = cleanPhone.substring(3);
      } else if (cleanPhone.startsWith("+1")) {
        countryCode = "+1";
        mobile = cleanPhone.substring(2);
      } else {
        const match = cleanPhone.match(/^\+(\d{1,3})/);
        if (match) {
          countryCode = match[0];
          mobile = cleanPhone.substring(match[0].length);
        }
      }
    } else if (cleanPhone.length === 10) {
      countryCode = "+91";
      mobile = cleanPhone;
    }

    // Parse created_at
    let createdAt = new Date().toISOString().replace("T", " ").substring(0, 19);
    if (mapping.createdAt && raw[mapping.createdAt]) {
      const parsedDate = new Date(raw[mapping.createdAt]);
      if (!isNaN(parsedDate.getTime())) {
        createdAt = parsedDate.toISOString().replace("T", " ").substring(0, 19);
      }
    }

    // Parse status
    let crmStatus = "GOOD_LEAD_FOLLOW_UP";
    if (mapping.status && raw[mapping.status]) {
      const statusVal = String(raw[mapping.status]).toUpperCase();
      if (statusVal.includes("GOOD") || statusVal.includes("FOLLOW") || statusVal.includes("INTEREST")) {
        crmStatus = "GOOD_LEAD_FOLLOW_UP";
      } else if (statusVal.includes("SALE") || statusVal.includes("CLOSE") || statusVal.includes("DONE")) {
        crmStatus = "SALE_DONE";
      } else if (statusVal.includes("BAD") || statusVal.includes("NO") || statusVal.includes("NOT INTEREST")) {
        crmStatus = "BAD_LEAD";
      } else if (statusVal.includes("CONNECT") || statusVal.includes("BUSY") || statusVal.includes("DIAL")) {
        crmStatus = "DID_NOT_CONNECT";
      }
    }

    // Parse notes
    let notes = "";
    if (mapping.notes && raw[mapping.notes]) {
      notes = String(raw[mapping.notes]).trim();
    }

    records.push({
      created_at: createdAt,
      name,
      email,
      country_code: countryCode,
      mobile_without_country_code: mobile,
      company: mapping.company && raw[mapping.company] ? String(raw[mapping.company]).trim() : "",
      city: mapping.city && raw[mapping.city] ? String(raw[mapping.city]).trim() : "",
      state: mapping.state && raw[mapping.state] ? String(raw[mapping.state]).trim() : "",
      country: mapping.country && raw[mapping.country] ? String(raw[mapping.country]).trim() : "",
      lead_owner: mapping.leadOwner && raw[mapping.leadOwner] ? String(raw[mapping.leadOwner]).trim() : "system@groweasy.ai",
      crm_status: crmStatus,
      crm_note: notes,
      data_source: "",
      possession_time: "",
      description: raw.description ? String(raw.description).trim() : "",
    });
  }

  return { records, skipped };
}

/**
 * Processes a single batch with retry logic.
 */
async function processWithRetry(model, batch, batchNum, totalBatches) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const userPrompt = buildUserPrompt(batch);

      const result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: userPrompt },
      ]);

      const responseText = result.response.text();
      const parsed = parseAIResponse(responseText);

      console.log(
        `Batch ${batchNum}/${totalBatches}: ${parsed.records?.length || 0} extracted, ${parsed.skipped?.length || 0} skipped`
      );

      return {
        records: parsed.records || [],
        skipped: parsed.skipped || [],
      };
    } catch (error) {
      lastError = error;
      console.error(
        `Batch ${batchNum} attempt ${attempt}/${MAX_RETRIES} failed:`,
        error.message
      );

      // If it's a rate limit/quota failure, propagate it to switch immediately to fallback
      const isQuotaError =
        error.message?.includes("429") ||
        error.message?.includes("quota") ||
        error.message?.includes("RESOURCE_EXHAUSTED");

      if (isQuotaError) {
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error(`Batch ${batchNum} failed after ${MAX_RETRIES} attempts`);
}

/**
 * Parses AI response text into JSON, handling markdown code fences.
 */
function parseAIResponse(text) {
  let cleaned = text.trim();

  // Remove markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
  }

  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (_) {
        // fall through
      }
    }
    throw new Error(`Failed to parse AI response as JSON: ${firstError.message}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { extractWithAI };
