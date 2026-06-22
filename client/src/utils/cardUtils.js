export const COLORS = ['red', 'blue', 'green', 'yellow']

export const COLOR_HEX = {
  red: '#e74c3c',
  blue: '#3498db',
  green: '#2ecc71',
  yellow: '#f1c40f'
}

export const COLOR_LIGHT = {
  red: '#ff6b6b',
  blue: '#6bb5ff',
  green: '#6bff9e',
  yellow: '#ffe66b'
}

export function getCardLabel(card) {
  if (!card) return ''
  switch (card.type) {
    case 'number': return card.value
    case 'draw_two': return '+2'
    case 'draw_four': return '+4'
    case 'skip': return '⊘'
    case 'reverse': return '⟳'
    case 'wild': return '★'
    default: return '?'
  }
}

export function getCardColor(card) {
  if (card.type === 'wild' || card.type === 'draw_four') {
    return card.chosenColor || '#2c3e50'
  }
  return COLOR_HEX[card.color] || '#2c3e50'
}

export function getCardLightColor(card) {
  if (card.type === 'wild' || card.type === 'draw_four') {
    return '#5a6c7d'
  }
  return COLOR_LIGHT[card.color] || '#5a6c7d'
}

export function getCardSymbol(card) {
  switch (card.type) {
    case 'number': return card.value
    case 'draw_two': return '+2'
    case 'draw_four': return '+4'
    case 'skip': return '⊘'
    case 'reverse': return '⟳'
    case 'wild': return '★'
    default: return '?'
  }
}

export function canPlayCard(card, topCard) {
  return card.canPlayOn ? card.canPlayOn(topCard) : false
}

export function isSpecialCard(card) {
  return ['draw_two', 'draw_four', 'skip', 'reverse', 'wild'].includes(card.type)
}

export function getPersonalityLabel(personality) {
  const labels = {
    aggressive: 'Aggressive',
    defensive: 'Defensive',
    chaos: 'Chaos',
    hunter: 'Hunter',
    leader_killer: 'Leader Killer'
  }
  return labels[personality] || 'Unknown'
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
