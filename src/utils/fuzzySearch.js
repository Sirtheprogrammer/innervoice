/**
 * Fuzzy search utility with typo tolerance
 * Uses a combination of techniques:
 * - Levenshtein distance for typo tolerance
 * - Substring matching
 * - Word boundary matching
 */

/**
 * Calculate Levenshtein distance between two strings
 * Lower distance = more similar
 */
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;

    // Create a 2D array to store distances
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Initialize base cases
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill the matrix
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],     // deletion
                    dp[i][j - 1],     // insertion
                    dp[i - 1][j - 1]  // substitution
                );
            }
        }
    }

    return dp[m][n];
}

/**
 * Calculate similarity score (0-1) based on Levenshtein distance
 * 1 = exact match, 0 = completely different
 */
function similarityScore(str1, str2) {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    const distance = levenshteinDistance(str1, str2);
    return 1 - distance / maxLen;
}

/**
 * Check if a query matches a text with typo tolerance
 * Returns a score from 0 to 1 (higher = better match)
 */
export function fuzzyMatch(query, text) {
    if (!query || !text) return 0;

    // Normalize both strings
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedText = text.toLowerCase();

    if (!normalizedQuery) return 0;

    // Exact match gets highest score
    if (normalizedText.includes(normalizedQuery)) {
        return 1;
    }

    // Split query into words for partial matching
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
    const textWords = normalizedText.split(/\s+/).filter(w => w.length > 0);

    let totalScore = 0;
    let matchedWords = 0;

    for (const queryWord of queryWords) {
        let bestWordScore = 0;

        // Check each word in the text
        for (const textWord of textWords) {
            // Direct substring match
            if (textWord.includes(queryWord)) {
                bestWordScore = Math.max(bestWordScore, 0.9);
                continue;
            }

            // Check if query word is substring of text word (handles "conf" matching "confession")
            if (textWord.startsWith(queryWord)) {
                bestWordScore = Math.max(bestWordScore, 0.85);
                continue;
            }

            // Fuzzy match using similarity
            const similarity = similarityScore(queryWord, textWord);

            // Allow matches with similarity > 0.6 (allows for typos)
            // For example, "confessionn" vs "confession" would have high similarity
            if (similarity > 0.6) {
                bestWordScore = Math.max(bestWordScore, similarity * 0.8);
            }
        }

        if (bestWordScore > 0.3) {
            matchedWords++;
            totalScore += bestWordScore;
        }
    }

    // Calculate final score based on matched words
    if (queryWords.length === 0) return 0;

    const matchRatio = matchedWords / queryWords.length;
    const avgScore = matchedWords > 0 ? totalScore / matchedWords : 0;

    return matchRatio * avgScore;
}

/**
 * Search through an array of items and return sorted results
 * @param {Array} items - Array of items to search through
 * @param {string} query - Search query
 * @param {Array<string>} searchFields - Fields to search in each item
 * @param {number} threshold - Minimum score to include in results (0-1)
 * @returns {Array} Sorted array of matching items with scores
 */
export function fuzzySearch(items, query, searchFields = ['title', 'content'], threshold = 0.3) {
    if (!query || !query.trim() || !items || items.length === 0) {
        return items;
    }

    const results = items
        .map(item => {
            let maxScore = 0;

            for (const field of searchFields) {
                if (item[field]) {
                    const score = fuzzyMatch(query, String(item[field]));
                    maxScore = Math.max(maxScore, score);
                }
            }

            return { item, score: maxScore };
        })
        .filter(result => result.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .map(result => result.item);

    return results;
}

export default fuzzySearch;
