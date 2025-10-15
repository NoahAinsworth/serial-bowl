// Profanity filter utility
const profanityWords = [
  /\bf+[\*\-_]*u+[\*\-_]*c+[\*\-_]*k+/gi,
  /\bs+[\*\-_]*h+[\*\-_]*i+[\*\-_]*t+/gi,
  /\bc+[\*\-_]*u+[\*\-_]*n+[\*\-_]*t+/gi,
  /\bd+[\*\-_]*i+[\*\-_]*c+[\*\-_]*k+/gi,
  /\bp+[\*\-_]*u+[\*\-_]*s+[\*\-_]*s+[\*\-_]*y+/gi,
  /\bc+[\*\-_]*o+[\*\-_]*c+[\*\-_]*k+/gi,
  /\bb+[\*\-_]*i+[\*\-_]*t+[\*\-_]*c+[\*\-_]*h+/gi,
];

export function replaceProfanity(text: string): string {
  let result = text;
  profanityWords.forEach(pattern => {
    result = result.replace(pattern, '(BLEEP)');
  });
  return result;
}

export function detectProfanity(text: string): boolean {
  return profanityWords.some(pattern => pattern.test(text));
}

export function detectSexualContent(text: string): boolean {
  const sexualPatterns = [
    /\bsex(ual)?\b/gi,
    /\bporn(o)?\b/gi,
    /\bnude(s)?\b/gi,
    /\bnaked\b/gi,
    /\berotic\b/gi,
    /\bxxx\b/gi,
    /\badult content\b/gi,
  ];
  
  return sexualPatterns.some(pattern => pattern.test(text));
}

export function detectMatureContent(text: string): {
  isMature: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  if (detectProfanity(text)) {
    reasons.push('profanity');
  }
  
  if (detectSexualContent(text)) {
    reasons.push('sexual');
  }
  
  return {
    isMature: reasons.length > 0,
    reasons
  };
}
