const COLORS = ['red', 'blue', 'green', 'yellow'];
const CARD_TYPES = ['number', 'draw_two', 'draw_four', 'skip', 'reverse', 'wild'];

let cardIdCounter = 0;

function generateId() {
  return `card_${++cardIdCounter}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

class Card {
  constructor(color, type, value = null) {
    this.id = generateId();
    this.color = color;
    this.type = type;
    this.value = value;
  }

  canPlayOn(other) {
    if (this.type === 'wild' || this.type === 'draw_four') return true;
    if (other.type === 'wild' || other.type === 'draw_four') {
      return this.color === other.chosenColor;
    }
    if (this.color === other.color) return true;
    if (this.type === 'number' && other.type === 'number' && this.value === other.value) return true;
    if (this.type !== 'number' && other.type !== 'number' && this.type === other.type) return true;
    return false;
  }
}

class Deck {
  constructor(numPlayers) {
    this.cards = [];
    const numDecks = numPlayers <= 4 ? 1 : numPlayers <= 8 ? 2 : numPlayers <= 16 ? 3 : numPlayers <= 32 ? 5 : numPlayers <= 64 ? 8 : 12;

    for (let d = 0; d < numDecks; d++) {
      for (const color of COLORS) {
        this.cards.push(new Card(color, 'number', 0));
        for (let n = 1; n <= 9; n++) {
          this.cards.push(new Card(color, 'number', n));
          this.cards.push(new Card(color, 'number', n));
        }
        for (let i = 0; i < 2; i++) {
          this.cards.push(new Card(color, 'draw_two'));
          this.cards.push(new Card(color, 'skip'));
          this.cards.push(new Card(color, 'reverse'));
        }
      }
      for (let i = 0; i < 4; i++) {
        this.cards.push(new Card(null, 'wild'));
        this.cards.push(new Card(null, 'draw_four'));
      }
    }

    this.shuffle();
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(n = 1) {
    const drawn = [];
    for (let i = 0; i < n; i++) {
      if (this.cards.length === 0) return null;
      drawn.push(this.cards.pop());
    }
    return drawn;
  }

  remaining() {
    return this.cards.length;
  }
}

module.exports = { Deck, Card, COLORS };
