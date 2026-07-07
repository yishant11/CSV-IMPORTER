const API_BASE = "/api";

/**
 * Uploads a CSV file to the backend for AI processing.
 * Returns the extracted CRM records.
 *
 * @param {File} file - The CSV file to upload
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function uploadAndProcess(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/import`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Server error (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (_) {
      try {
        const text = await response.text();
        if (text && text.length < 100) errorMessage = text;
      } catch (__) {}
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch (parseError) {
    throw new Error("Invalid response format received from server.");
  }
}
