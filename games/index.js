export { BaseGame } from './BaseGame.js';
export { GameManager, gameManager } from './GameManager.js';
export { ReactionRushGame } from './ReactionRush.js';
export { RockPaperScissorsGame } from './RockPaperScissors.js';
export { MemoryMatchGame } from './MemoryMatch.js';
export { QuickMathGame } from './QuickMath.js';
export { TargetClickGame } from './TargetClick.js';

import { gameManager } from './GameManager.js';
import { ReactionRushGame } from './ReactionRush.js';
import { RockPaperScissorsGame } from './RockPaperScissors.js';
import { MemoryMatchGame } from './MemoryMatch.js';
import { QuickMathGame } from './QuickMath.js';
import { TargetClickGame } from './TargetClick.js';

// Auto-register all 5 minigames
gameManager.registerGame('reaction_rush', ReactionRushGame);
gameManager.registerGame('rock_paper_scissors', RockPaperScissorsGame);
gameManager.registerGame('memory_match', MemoryMatchGame);
gameManager.registerGame('quick_math', QuickMathGame);
gameManager.registerGame('target_click', TargetClickGame);
