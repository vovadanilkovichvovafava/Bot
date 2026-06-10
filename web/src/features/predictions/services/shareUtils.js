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

  text += `\nGet AI predictions at PreScore AI`;

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

  text += `\nPowered by PreScore AI`;

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

/**
 * Generate share text with referral link for viral growth
 */
export function generateReferralShareText({ matchText, prediction, referralCode, bonus = '€100' }) {
  const baseUrl = window.location.origin;
  const refLink = referralCode ? `${baseUrl}/register?ref=${referralCode}` : baseUrl;

  let text = '';
  if (matchText) {
    text += `${matchText}\n\n`;
  }
  if (prediction) {
    text += `AI Prediction: ${prediction}\n\n`;
  }
  text += `Get ${bonus} free bet + AI predictions at PreScore AI\n`;
  text += refLink;

  return text;
}

/**
 * Generate express share text with referral
 */
export function generateExpressShareText({ express, referralCode, bonus = '€100' }) {
  const baseUrl = window.location.origin;
  const refLink = referralCode ? `${baseUrl}/register?ref=${referralCode}` : baseUrl;

  let text = `AI Express x${express.total_odds} (${express.leg_count} legs)\n\n`;
  express.legs?.forEach((leg, i) => {
    text += `${i + 1}. ${leg.home_team} - ${leg.away_team}: ${leg.bet_type} @ ${leg.odds}\n`;
  });
  text += `\nPotential win: ${bonus} x ${express.total_odds} = €${Math.round(75 * parseFloat(express.total_odds))}\n\n`;
  text += `Get ${bonus} free bet at PreScore AI\n`;
  text += refLink;

  return text;
}

/**
 * Generate post-match "could have won" share text
 */
export function generatePostMatchShareText({ homeTeam, awayTeam, score, bet, odds, potentialWin, currency, referralCode, bonus = '€100' }) {
  const baseUrl = window.location.origin;
  const refLink = referralCode ? `${baseUrl}/register?ref=${referralCode}` : baseUrl;

  let text = `${homeTeam} vs ${awayTeam} ${score}\n`;
  text += `AI predicted: ${bet} @ ${odds} ✅\n`;
  text += `Could have won: ${currency}${potentialWin}\n\n`;
  text += `Get ${bonus} free bet + AI predictions\n`;
  text += refLink;

  return text;
}

export default {
  generatePredictionShareText,
  generateMatchShareText,
  sharePrediction,
  getShareLinks,
  generateReferralShareText,
  generateExpressShareText,
  generatePostMatchShareText,
};
