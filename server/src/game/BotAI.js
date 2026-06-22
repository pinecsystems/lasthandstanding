const BOT_NAMES = [
  'SolarFox', 'RedComet', 'NovaByte', 'TurboDuck', 'PixelKing',
  'ShadowCard', 'EchoStorm', 'WildDrawer', 'BlueFalcon', 'CardCrusher',
  'CyberLynx', 'VoltKnight', 'FrostWing', 'BlazeHound', 'StormRaven',
  'IronMole', 'JadeSerpent', 'CrimsonTide', 'VoidWalker', 'ThunderPaw',
  'NeonGhost', 'QuantumAxe', 'SteelLotus', 'PhantomBit', 'RustClaw',
  'DuskRider', 'FlamePetal', 'GlacierMaw', 'HollowShard', 'InfernoVex',
  'LunarDrift', 'MirageFang', 'ObsidianFlux', 'PrismFury', 'RavenHilt',
  'SableMist', 'TeslaCoil', 'UmbraStrike', 'VenomShank', 'WarpBlade',
  'ZenMaster', 'ArcanePaw', 'BinaryStar', 'ChaosKnight', 'DynaMight'
];

const DIFFICULTY_DELAYS = {
  easy: { min: 500, max: 1500 },
  medium: { min: 300, max: 800 },
  hard: { min: 100, max: 400 }
};

const PERSONALITIES = ['aggressive', 'defensive', 'chaos', 'hunter', 'leader_killer'];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getPlayableCards(hand, topCard) {
  if (!topCard) return [...hand];
  return hand.filter(card => card.canPlayOn(topCard));
}

function countCardValue(card) {
  if (card.type === 'number') return 0;
  if (card.type === 'draw_four') return 50;
  if (card.type === 'wild') return 40;
  if (card.type === 'draw_two') return 20;
  if (card.type === 'skip' || card.type === 'reverse') return 20;
  return 0;
}

function sortByValue(cards) {
  return [...cards].sort((a, b) => countCardValue(b) - countCardValue(a));
}

function getCid(gameState) {
  return gameState.currentPlayerId || (gameState.players[gameState.currentPlayerIndex] && gameState.players[gameState.currentPlayerIndex].id) || '';
}

function findWeakestPlayers(gameState) {
  const cid = getCid(gameState);
  return [...gameState.players]
    .filter(p => !p.isOut && p.id !== cid)
    .sort((a, b) => a.hand.length - b.hand.length);
}

function findLeader(gameState) {
  return [...gameState.players]
    .filter(p => !p.isOut)
    .sort((a, b) => a.hand.length - b.hand.length)[0];
}

function findHunterTarget(gameState) {
  const cid = getCid(gameState);
  const nearElimination = [...gameState.players]
    .filter(p => !p.isOut && p.id !== cid && p.hand.length <= 2);
  if (nearElimination.length > 0) {
    return nearElimination.sort((a, b) => a.hand.length - b.hand.length)[0];
  }
  return null;
}

const AI = {
  getRandomName() {
    return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  },

  getPersonalities(count) {
    const shuffled = shuffleArray(PERSONALITIES);
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(shuffled[i % shuffled.length]);
    }
    return result;
  },

  getDelay(difficulty) {
    const d = DIFFICULTY_DELAYS[difficulty] || DIFFICULTY_DELAYS.medium;
    return Math.floor(Math.random() * (d.max - d.min + 1)) + d.min;
  },

  decidePlay(player, gameState, difficulty) {
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const playable = getPlayableCards(player.hand, topCard);

    if (playable.length === 0) {
      return { action: 'draw', delay: this.getDelay(difficulty) };
    }

    let chosen;
    switch (player.personality) {
      case 'aggressive':
        chosen = this.aggressivePlay(playable, player, gameState);
        break;
      case 'defensive':
        chosen = this.defensivePlay(playable, player, gameState);
        break;
      case 'chaos':
        chosen = this.chaosPlay(playable, player, gameState);
        break;
      case 'hunter':
        chosen = this.hunterPlay(playable, player, gameState);
        break;
      case 'leader_killer':
        chosen = this.leaderKillerPlay(playable, player, gameState);
        break;
      default:
        chosen = playable[Math.floor(Math.random() * playable.length)];
    }

    const wildTypes = ['wild', 'draw_four'];
    let chosenColor = null;
    if (wildTypes.includes(chosen.type)) {
      chosenColor = this.chooseColor(player, gameState);
    }

    // Bot target selection for Surge+2 and Freeze cards
    let targetId = null;
    if (chosen.type === 'draw_two' || chosen.type === 'skip') {
      const active = gameState.players.filter(p => !p.isOut && p.id !== player.id);
      if (active.length > 0) {
        const sorted = active.sort((a, b) => a.hand.length - b.hand.length);
        if (player.personality === 'aggressive' || player.personality === 'leader_killer') {
          targetId = sorted[0].id;
        } else if (player.personality === 'hunter') {
          const danger = active.filter(p => p.hand.length <= 2);
          targetId = (danger.length > 0 ? danger[0] : sorted[0]).id;
        } else if (player.personality === 'defensive') {
          targetId = sorted[sorted.length - 1].id;
        } else {
          targetId = active[Math.floor(Math.random() * active.length)].id;
        }
      }
    }

    return {
      action: 'play',
      card: chosen,
      chosenColor,
      targetId,
      delay: this.getDelay(difficulty)
    };
  },

  aggressivePlay(playable, player, gameState) {
    const attackCards = playable.filter(c => ['draw_two', 'draw_four', 'skip', 'reverse'].includes(c.type));
    if (attackCards.length > 0) {
      return sortByValue(attackCards)[0];
    }
    const sorted = sortByValue(playable);
    return sorted.length > 0 ? sorted[0] : playable[0];
  },

  defensivePlay(playable, player, gameState) {
    const safeCards = playable.filter(c => c.type === 'number');
    if (safeCards.length > 0) {
      return safeCards.sort((a, b) => b.value - a.value)[0];
    }
    const weakAttack = playable.filter(c => c.type === 'reverse' || c.type === 'skip');
    if (weakAttack.length > 0) return weakAttack[0];
    return playable[Math.floor(Math.random() * playable.length)];
  },

  chaosPlay(playable) {
    return playable[Math.floor(Math.random() * playable.length)];
  },

  hunterPlay(playable, player, gameState) {
    const target = findHunterTarget(gameState);
    const attackCards = playable.filter(c => ['draw_two', 'draw_four', 'skip', 'reverse'].includes(c.type));
    if (target && attackCards.length > 0) {
      return sortByValue(attackCards)[0];
    }
    return playable[Math.floor(Math.random() * playable.length)];
  },

  leaderKillerPlay(playable, player, gameState) {
    const leader = findLeader(gameState);
    const attackCards = playable.filter(c => ['draw_two', 'draw_four', 'skip', 'reverse'].includes(c.type));
    if (leader && leader.id !== player.id && attackCards.length > 0) {
      return sortByValue(attackCards)[0];
    }
    const sorted = sortByValue(playable);
    return sorted.length > 0 ? sorted[sorted.length - 1] : playable[Math.floor(Math.random() * playable.length)];
  },

  chooseColor(player, gameState) {
    const colorCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
    for (const card of player.hand) {
      if (card.color && colorCounts[card.color] !== undefined) {
        colorCounts[card.color]++;
      }
    }
    let maxColor = 'red';
    let maxCount = 0;
    for (const [color, count] of Object.entries(colorCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxColor = color;
      }
    }
    if (player.personality === 'chaos') {
      const colors = Object.keys(colorCounts);
      return colors[Math.floor(Math.random() * colors.length)];
    }
    return maxCount > 0 ? maxColor : ['red', 'blue', 'green', 'yellow'][Math.floor(Math.random() * 4)];
  }
};

module.exports = AI;
