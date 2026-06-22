const { Deck, Card } = require('./Deck');
const AI = require('./BotAI');

class GameEngine {
  constructor(id, playerCount, difficulty = 'medium') {
    this.id = id;
    this.playerCount = playerCount;
    this.difficulty = difficulty;
    this.players = [];
    this.deck = null;
    this.discardPile = [];
    this.currentPlayerIndex = 0;
    this.direction = 1;
    this.pendingDraw = 0;
    this.status = 'waiting';
    this.winner = null;
    this.scores = null;
    this.lastAction = '';
    this.turnSequence = 0;
    this.playLog = [];
  }

  addPlayer(id, name, isBot = false, personality = null) {
    this.players.push({
      id,
      name,
      hand: [],
      isBot,
      personality,
      isOut: false,
      hasDrawn: false,
      calledLastHand: false,
      frozen: false,
      position: this.players.length,
      cardsRemaining: 0
    });
  }

  removePlayer(playerId) {
    const idx = this.players.findIndex(p => p.id === playerId);
    if (idx !== -1) {
      this.players.splice(idx, 1);
      if (this.currentPlayerIndex >= this.players.length) {
        this.currentPlayerIndex = 0;
      }
    }
  }

  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  startGame() {
    this.deck = new Deck(this.playerCount);
    this.status = 'playing';
    this.direction = 1;
    this.currentPlayerIndex = 0;

    for (const player of this.players) {
      const dealt = this.deck.draw(7);
      if (dealt) {
        player.hand = dealt;
        player.cardsRemaining = dealt.length;
      }
    }

    let firstCard = this.deck.draw(1);
    while (firstCard && firstCard[0] && (firstCard[0].type === 'wild' || firstCard[0].type === 'draw_four')) {
      this.deck.cards.unshift(firstCard[0]);
      this.deck.shuffle();
      firstCard = this.deck.draw(1);
    }

    if (firstCard && firstCard[0]) {
      this.discardPile.push(firstCard[0]);
      this.lastAction = `Game started with ${firstCard[0].color} ${firstCard[0].type}`;
    }

    this.checkInitialEffects();
    this.updateAllCardsRemaining();
  }

  checkInitialEffects() {
    const top = this.getTopCard();
    if (!top) return;

    if (top.type === 'skip') {
      this.lastAction = `${this.getCurrentPlayer().name} was frozen by the starting card`;
      this.advanceTurn();
    } else if (top.type === 'reverse') {
      this.direction = -1;
      this.lastAction = 'Direction redirected by the starting card';
    } else if (top.type === 'draw_two') {
      this.pendingDraw += 2;
      this.lastAction = `${this.getCurrentPlayer().name} must draw 2`;
    }
  }

  getTopCard() {
    return this.discardPile[this.discardPile.length - 1] || null;
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  advanceTurn() {
    if (this.status !== 'playing') return;

    do {
      this.currentPlayerIndex += this.direction;
      if (this.currentPlayerIndex >= this.players.length) this.currentPlayerIndex = 0;
      if (this.currentPlayerIndex < 0) this.currentPlayerIndex = this.players.length - 1;
    } while (this.players[this.currentPlayerIndex].isOut);

    const next = this.getCurrentPlayer();
    if (next && next.frozen) {
      next.frozen = false;
      this.lastAction += ` — ${next.name} was frozen!`;
      this.advanceTurn();
      return;
    }

    this.getCurrentPlayer().hasDrawn = false;
    this.turnSequence++;

    this.checkPendingDraw();
  }

  checkPendingDraw() {
    if (this.pendingDraw > 0 && this.status === 'playing') {
      const player = this.getCurrentPlayer();
      const drawn = this.drawCards(player, this.pendingDraw);
      this.pendingDraw = 0;
      this.lastAction = `${player.name} drew ${drawn} card(s) (penalty)`;
      this.advanceTurn();
    }
  }

  drawCards(player, count) {
    let drawn = 0;
    for (let i = 0; i < count; i++) {
      if (this.deck.remaining() === 0) this.reshuffleDiscardPile();
      const cards = this.deck.draw(1);
      if (cards) {
        player.hand.push(cards[0]);
        drawn++;
      }
    }
    player.cardsRemaining = player.hand.length;
    return drawn;
  }

  reshuffleDiscardPile() {
    if (this.discardPile.length <= 1) return;
    const top = this.discardPile.pop();
    const reshuffled = [];
    while (this.discardPile.length > 0) {
      reshuffled.push(this.discardPile.pop());
    }
    for (let i = reshuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reshuffled[i], reshuffled[j]] = [reshuffled[j], reshuffled[i]];
    }
    this.deck.cards = reshuffled;
    this.discardPile.push(top);
  }

  canPlayCard(playerId, cardId) {
    const player = this.getPlayer(playerId);
    if (!player || player.isOut) return false;

    const card = player.hand.find(c => c.id === cardId);
    if (!card) return false;
    if (this.pendingDraw > 0) return card.type === 'draw_two' || card.type === 'draw_four';

    const top = this.getTopCard();
    if (!top) return true;

    return card.canPlayOn(top);
  }

  playCard(playerId, cardId, chosenColor = null, targetId = null) {
    if (this.status !== 'playing') return { success: false, error: 'Game is not in progress' };

    const player = this.getPlayer(playerId);
    if (!player || player.isOut) return { success: false, error: 'Player not found or already out' };

    if (!this.canPlayCard(playerId, cardId)) {
      return { success: false, error: 'Cannot play that card' };
    }

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { success: false, error: 'Card not in hand' };

    const card = player.hand.splice(cardIndex, 1)[0];
    player.cardsRemaining = player.hand.length;

    if (card.type === 'wild' || card.type === 'draw_four') {
      if (chosenColor && ['red', 'blue', 'green', 'yellow'].includes(chosenColor)) {
        card.chosenColor = chosenColor;
      } else {
        card.chosenColor = 'red';
      }
    }

    // Targeted special cards (Surge +2, Freeze)
    if ((card.type === 'draw_two' || card.type === 'skip') && targetId) {
      const target = this.getPlayer(targetId);
      if (target && !target.isOut) {
        if (card.type === 'draw_two') {
          const drawn = this.drawCards(target, 2);
          this.pendingDraw = 0;
          this.lastAction = `${player.name} played ${this.cardDisplay(card)} → ${target.name} draws ${drawn}!`;
        } else if (card.type === 'skip') {
          target.frozen = true;
          this.lastAction = `${player.name} played ${this.cardDisplay(card)} → ${target.name} frozen!`;
        }
        this.discardPile.push(card);
        this.playLog.push({ player: player.name, action: this.lastAction, turn: this.turnSequence });

        if (player.hand.length === 0) { this.eliminatePlayer(player); return { success: true, effect: 'won', winner: player }; }
        if (player.hand.length === 1) { player.calledLastHand = true; this.lastAction += ` — ${player.name} calls LAST HAND!`; }
        this.advanceTurn();
        return { success: true, effect: card.type, card, targeted: true };
      }
    }

    this.discardPile.push(card);
    this.pendingDraw = 0;

    let actionMsg = `${player.name} played ${this.cardDisplay(card)}`;

    if (card.type === 'wild' || card.type === 'draw_four') {
      actionMsg += ` (color: ${card.chosenColor})`;
    }
    this.lastAction = actionMsg;
    this.playLog.push({ player: player.name, action: actionMsg, turn: this.turnSequence });

    if (player.hand.length === 0) {
      this.eliminatePlayer(player);
      return { success: true, effect: 'won', winner: player };
    }

    if (player.hand.length === 1) {
      player.calledLastHand = true;
      this.lastAction += ` — ${player.name} calls LAST HAND!`;
    }

    this.applyCardEffect(card, player);
    this.advanceTurn();

    return { success: true, effect: card.type, card };
  }

  cardDisplay(card) {
    if (card.type === 'number') return `${card.color} ${card.value}`;
    const labels = { draw_two: 'Surge +2', draw_four: 'Chaos +4', skip: 'Freeze', reverse: 'Redirect', wild: 'Prism' };
    return `${card.color || ''} ${labels[card.type] || card.type}`.trim();
  }

  applyCardEffect(card, player) {
    switch (card.type) {
      case 'skip':
        this.advanceTurn();
        this.lastAction += ` — ${this.getCurrentPlayer().name} was frozen!`;
        break;
      case 'reverse':
        this.direction *= -1;
        this.lastAction += ' — Direction redirected!';
        if (this.players.length === 2) {
          this.advanceTurn();
          this.lastAction += ` — ${this.getCurrentPlayer().name} gets another turn!`;
        }
        break;
      case 'draw_two':
        this.pendingDraw += 2;
        break;
      case 'draw_four':
        this.pendingDraw += 4;
        break;
    }
  }

  drawCard(playerId) {
    if (this.status !== 'playing') return { success: false, error: 'Game is not in progress' };

    const player = this.getPlayer(playerId);
    if (!player || player.isOut) return { success: false, error: 'Player not found' };
    if (player.hasDrawn) return { success: false, error: 'Already drew this turn' };

    if (this.deck.remaining() === 0) this.reshuffleDiscardPile();
    const drawn = this.deck.draw(1);
    if (!drawn) return { success: false, error: 'Deck is empty' };

    player.hand.push(drawn[0]);
    player.cardsRemaining = player.hand.length;
    player.hasDrawn = true;

    this.lastAction = `${player.name} drew a card`;
    this.playLog.push({ player: player.name, action: 'Drew a card', turn: this.turnSequence });

    const top = this.getTopCard();
    if (drawn[0].canPlayOn(top)) {
      return { success: true, drawn: drawn[0], canPlay: true };
    }

    this.advanceTurn();
    return { success: true, drawn: drawn[0], canPlay: false };
  }

  eliminatePlayer(player) {
    player.isOut = true;
    this.lastAction = `🔥 ${player.name} is out of cards! LAST HAND STANDING!`;
    this.playLog.push({ player: player.name, action: 'ELIMINATED', turn: this.turnSequence });

    const remaining = this.players.filter(p => !p.isOut);
    if (remaining.length === 1) {
      this.endGame(remaining[0]);
    } else if (this.players.filter(p => !p.isOut).length === 0) {
      this.endGame(null);
    }
  }

  endGame(winner) {
    this.status = 'finished';
    this.winner = winner;
    this.scores = {};

    for (const player of this.players) {
      let score = 0;
      for (const card of player.hand) {
        if (card.type === 'number') score += card.value;
        else if (card.type === 'draw_two' || card.type === 'skip' || card.type === 'reverse') score += 20;
        else if (card.type === 'wild') score += 40;
        else if (card.type === 'draw_four') score += 50;
      }
      this.scores[player.id] = score;
    }

    if (winner) {
      this.lastAction = `🏆 ${winner.name} wins Last Hand Standing! 🏆`;
      this.playLog.push({ player: winner.name, action: 'WINS THE GAME!', turn: this.turnSequence });
    }
  }

  getPlayableCards(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || player.isOut) return [];
    const top = this.getTopCard();
    if (!top) return [...player.hand];
    return player.hand.filter(c => c.canPlayOn(top));
  }

  updateAllCardsRemaining() {
    for (const p of this.players) {
      p.cardsRemaining = p.hand.length;
    }
  }

  getStateForPlayer(playerId) {
    const player = this.getPlayer(playerId);
    const isPlayerInGame = !!player;

    const publicState = {
      id: this.id,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        personality: p.personality,
        isOut: p.isOut,
        cardsRemaining: p.hand.length,
        handCount: p.hand.length,
        position: p.position,
        calledLastHand: p.calledLastHand,
        hasDrawn: p.hasDrawn
      })),
      discardPile: this.discardPile.map(c => ({
        id: c.id,
        color: c.color,
        type: c.type,
        value: c.value,
        chosenColor: c.chosenColor
      })),
      discardTop: this.discardPile.length > 0 ? {
        id: this.discardPile[this.discardPile.length - 1].id,
        color: this.discardPile[this.discardPile.length - 1].color,
        type: this.discardPile[this.discardPile.length - 1].type,
        value: this.discardPile[this.discardPile.length - 1].value,
        chosenColor: this.discardPile[this.discardPile.length - 1].chosenColor
      } : null,
      currentPlayerId: this.players[this.currentPlayerIndex]?.id || null,
      direction: this.direction,
      pendingDraw: this.pendingDraw,
      status: this.status,
      winner: this.winner ? { id: this.winner.id, name: this.winner.name } : null,
      scores: this.scores,
      lastAction: this.lastAction,
      turnSequence: this.turnSequence,
      playLog: this.playLog.slice(-20),
      deckRemaining: this.deck.remaining(),
      playerCount: this.playerCount,
      difficulty: this.difficulty
    };

    if (isPlayerInGame) {
      return {
        ...publicState,
        myHand: player.hand.map(c => ({
          id: c.id,
          color: c.color,
          type: c.type,
          value: c.value
        })),
        myId: playerId,
        myIndex: this.players.findIndex(p => p.id === playerId)
      };
    }

    return publicState;
  }

  processBotTurn() {
    if (this.status !== 'playing') return null;

    const botPlayer = this.getCurrentPlayer();
    if (!botPlayer || !botPlayer.isBot) return null;

    const decision = AI.decidePlay(botPlayer, this, this.difficulty);

    if (decision.action === 'draw') {
      const result = this.drawCard(botPlayer.id);
      return { ...result, action: 'draw', delay: decision.delay, botId: botPlayer.id };
    } else if (decision.action === 'play' && decision.card) {
      const result = this.playCard(botPlayer.id, decision.card.id, decision.chosenColor, decision.targetId);
      return { ...result, action: 'play', delay: decision.delay, botId: botPlayer.id };
    }

    return null;
  }

  getActivePlayerCount() {
    return this.players.filter(p => !p.isOut).length;
  }

  getLeaderboard() {
    return [...this.players]
      .filter(p => !p.isOut)
      .sort((a, b) => a.hand.length - b.hand.length)
      .map((p, i) => ({
        rank: i + 1,
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        cardsRemaining: p.hand.length,
        isOut: false
      }))
      .concat(
        this.players
          .filter(p => p.isOut)
          .map((p, i) => ({
            rank: 99,
            id: p.id,
            name: p.name,
            isBot: p.isBot,
            cardsRemaining: 0,
            isOut: true
          }))
      );
  }
}

module.exports = GameEngine;
