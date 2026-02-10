/**
 * Share prediction utilities
 */

/**
 * Generate a shareable text for a prediction
 */
export function generatePredictionShareText(prediction) {
  const { homeTeam, awayTeam, league, matchDate, prediction: pred } = prediction;
  const date = new Date(matchDate).toLocaleDateString();

  let text = `${homeTeam?.name || 'Home'} vs ${awayTeam?.name || 'Away'}\n`;
  text += `${league || 'Match'} - ${date}\n\n`;

  if (pred?.winnerName) {
    text += `Prediction: ${pred.winnerName}\n`;
  }
  if (pred?.confidence) {
    text += `Confidence: ${pred.confidence}%\n`;
  }
  if (pred?.advice) {
    text += `Advice: ${pred.advice}\n`;
  }

  text += `\nGet AI predictions at PVA Betting App`;

  return text;
}

/**
 * Generate shareable text for match analysis
 */
export function generateMatchShareText({ homeTeam, awayTeam, league, date, prediction, odds }) {
  let text = `${homeTeam} vs ${awayTeam}\n`;
  text += `${league} - ${date}\n\n`;

  if (prediction?.predictions?.winner?.name) {
    text += `AI Prediction: ${prediction.predictions.winner.name}\n`;
  }
  if (prediction?.predictions?.percent) {
    const p = prediction.predictions.percent;
    text += `${homeTeam}: ${p.home} | Draw: ${p.draw} | ${awayTeam}: ${p.away}\n`;
  }
  if (prediction?.predictions?.advice) {
    text += `Advice: ${prediction.predictions.advice}\n`;
  }

  text += `\nPowered by PVA AI Betting`;

  return text;
}

/**
 * Share using Web Share API or fallback to clipboard
 */
export async function sharePrediction(text, title = 'Match Prediction') {
  // Try native share first (mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
      });
      return { success: true, method: 'native' };
    } catch (e) {
      if (e.name === 'AbortError') {
        return { success: false, method: 'cancelled' };
      }
      // Fall through to clipboard
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(text);
    return { success: true, method: 'clipboard' };
  } catch (e) {
    // Final fallback: select and copy
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return { success: true, method: 'clipboard' };
    } catch {
      document.body.removeChild(textarea);
      return { success: false, method: 'failed' };
    }
  }
}

/**
 * Share to specific platforms
 */
export function getShareLinks(text, url = window.location.href) {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  return {
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
}

export default {
  generatePredictionShareText,
  generateMatchShareText,
  sharePrediction,
  getShareLinks,
};
