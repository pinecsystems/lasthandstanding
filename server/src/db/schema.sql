CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_history (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(100) NOT NULL,
  player_count INTEGER NOT NULL,
  winner_id VARCHAR(100),
  duration_seconds INTEGER,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  difficulty VARCHAR(20) DEFAULT 'medium'
);

CREATE TABLE IF NOT EXISTS player_game_results (
  id SERIAL PRIMARY KEY,
  game_history_id INTEGER REFERENCES game_history(id),
  player_id VARCHAR(100) NOT NULL,
  player_name VARCHAR(50),
  is_bot BOOLEAN DEFAULT false,
  bot_personality VARCHAR(30),
  cards_remaining INTEGER DEFAULT 0,
  position INTEGER,
  score INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS player_stats (
  player_id VARCHAR(100) PRIMARY KEY,
  player_name VARCHAR(50),
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  cards_played INTEGER DEFAULT 0,
  last_game_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_history_played_at ON game_history(played_at);
CREATE INDEX IF NOT EXISTS idx_player_game_results_player ON player_game_results(player_id);
