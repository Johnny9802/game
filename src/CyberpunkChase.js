import React, { useState, useEffect, useCallback, useRef } from 'react';

const BASE_WIDTH = 800;
const BASE_HEIGHT = 400;
const GROUND_HEIGHT = 50;
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const INITIAL_SPEED = 6;

const CyberpunkChase = () => {
  const [gameState, setGameState] = useState('menu'); // menu, playing, boss, victory, gameOver
  const [player, setPlayer] = useState({ x: 100, y: 300, vy: 0, isJumping: false, isSliding: false });
  const [obstacles, setObstacles] = useState([]);
  const [particles, setParticles] = useState([]);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [federico, setFederico] = useState({ x: 700, y: 300, frame: 0 });
  const [boss, setBoss] = useState(null);
  const [bossHealth, setBossHealth] = useState(0);
  const [bossNumber, setBossNumber] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(3);
  const [powerUp, setPowerUp] = useState(null);
  const [hasShield, setHasShield] = useState(false);
  const [coins, setCoins] = useState([]);
  const [collectedCoins, setCollectedCoins] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState(0);
  const [projectiles, setProjectiles] = useState([]);
  const [canShoot, setCanShoot] = useState(true);
  const [gameDimensions, setGameDimensions] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT, scale: 1 });
  const [isMobile, setIsMobile] = useState(false);
  const gameLoopRef = useRef(null);
  const lastTimeRef = useRef(0);
  const containerRef = useRef(null);

  const GAME_WIDTH = BASE_WIDTH;
  const GAME_HEIGHT = BASE_HEIGHT;

  const BOSS_1_DISTANCE = 1500;
  const BOSS_2_DISTANCE = 3500;
  const WIN_DISTANCE = 5000;

  // Handle responsive sizing
  useEffect(() => {
    const handleResize = () => {
      const isMobileDevice = window.innerWidth < 768 || 'ontouchstart' in window;
      setIsMobile(isMobileDevice);
      
      const maxWidth = Math.min(window.innerWidth - 32, BASE_WIDTH);
      const maxHeight = Math.min(window.innerHeight - (isMobileDevice ? 200 : 150), BASE_HEIGHT);
      const scaleX = maxWidth / BASE_WIDTH;
      const scaleY = maxHeight / BASE_HEIGHT;
      const scale = Math.min(scaleX, scaleY, 1);
      
      setGameDimensions({
        width: BASE_WIDTH * scale,
        height: BASE_HEIGHT * scale,
        scale
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resetGame = () => {
    setPlayer({ x: 100, y: 300, vy: 0, isJumping: false, isSliding: false });
    setObstacles([]);
    setParticles([]);
    setScore(0);
    setDistance(0);
    setSpeed(INITIAL_SPEED);
    setFederico({ x: 700, y: 300, frame: 0 });
    setBoss(null);
    setBossHealth(0);
    setBossNumber(0);
    setPlayerHealth(3);
    setPowerUp(null);
    setHasShield(false);
    setCoins([]);
    setCollectedCoins(0);
    setProjectiles([]);
    setCanShoot(true);
    setGameState('playing');
  };

  const jump = useCallback(() => {
    if (!player.isJumping && !player.isSliding && gameState === 'playing') {
      setPlayer(p => ({ ...p, vy: JUMP_FORCE, isJumping: true }));
    }
  }, [player.isJumping, player.isSliding, gameState]);

  const slide = useCallback(() => {
    if (!player.isJumping && !player.isSliding && gameState === 'playing') {
      setPlayer(p => ({ ...p, isSliding: true }));
      setTimeout(() => setPlayer(p => ({ ...p, isSliding: false })), 500);
    }
  }, [player.isJumping, player.isSliding, gameState]);

  const shoot = useCallback(() => {
    if (canShoot && (gameState === 'playing' || gameState === 'boss')) {
      setProjectiles(p => [...p, { x: player.x + 40, y: player.y + 20, vx: 12 }]);
      setCanShoot(false);
      setTimeout(() => setCanShoot(true), 300);
    }
  }, [canShoot, gameState, player.x, player.y]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'menu') {
          resetGame();
        } else {
          jump();
        }
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        slide();
      }
      if (e.code === 'KeyX' || e.code === 'ControlLeft') {
        e.preventDefault();
        shoot();
      }
      if ((gameState === 'victory' || gameState === 'gameOver') && e.code === 'Enter') {
        resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump, slide, shoot, gameState]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e, action) => {
    e.preventDefault();
    if (action === 'jump') {
      if (gameState === 'menu') {
        resetGame();
      } else if (gameState === 'victory' || gameState === 'gameOver') {
        resetGame();
      } else {
        jump();
      }
    } else if (action === 'slide') {
      slide();
    } else if (action === 'shoot') {
      shoot();
    }
  }, [jump, slide, shoot, gameState]);

  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'boss') return;

    const gameLoop = (timestamp) => {
      if (timestamp - lastTimeRef.current < 16) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      lastTimeRef.current = timestamp;

      // Update player physics
      setPlayer(p => {
        let newY = p.y + p.vy;
        let newVy = p.vy + GRAVITY;
        let isJumping = p.isJumping;
        
        const groundLevel = p.isSliding ? 320 : 300;
        if (newY >= groundLevel) {
          newY = groundLevel;
          newVy = 0;
          isJumping = false;
        }
        
        return { ...p, y: newY, vy: newVy, isJumping };
      });

      // Update distance and score
      if (gameState === 'playing') {
        setDistance(d => {
          const newDist = d + speed * 0.5;
          
          // Check for boss triggers
          if (bossNumber === 0 && newDist >= BOSS_1_DISTANCE) {
            setGameState('boss');
            setBoss({ x: 600, y: 250, type: 'drone', attackTimer: 0 });
            setBossHealth(100);
            setBossNumber(1);
          } else if (bossNumber === 1 && newDist >= BOSS_2_DISTANCE) {
            setGameState('boss');
            setBoss({ x: 600, y: 200, type: 'mech', attackTimer: 0 });
            setBossHealth(150);
            setBossNumber(2);
          } else if (newDist >= WIN_DISTANCE) {
            setGameState('victory');
          }
          
          return newDist;
        });
        setScore(s => s + 1);
        setTimeOfDay(t => (t + 0.001) % 1);
      }

      // Update speed
      setSpeed(s => Math.min(s + 0.001, 12));

      // Spawn obstacles
      if (gameState === 'playing' && Math.random() < 0.02) {
        const types = ['barrier', 'drone', 'laser_low', 'laser_high'];
        const type = types[Math.floor(Math.random() * types.length)];
        setObstacles(obs => [...obs, {
          x: GAME_WIDTH + 50,
          y: type === 'laser_high' ? 280 : type === 'drone' ? 250 : 300,
          type,
          width: type === 'drone' ? 40 : 30,
          height: type === 'laser_low' || type === 'laser_high' ? 20 : 50
        }]);
      }

      // Spawn coins
      if (gameState === 'playing' && Math.random() < 0.03) {
        setCoins(c => [...c, { x: GAME_WIDTH + 50, y: 250 + Math.random() * 50 }]);
      }

      // Spawn power-ups
      if (gameState === 'playing' && Math.random() < 0.005 && !powerUp) {
        setPowerUp({ x: GAME_WIDTH + 50, y: 270, type: 'shield' });
      }

      // Update obstacles
      setObstacles(obs => obs
        .map(o => ({ ...o, x: o.x - speed }))
        .filter(o => o.x > -50)
      );

      // Update coins
      setCoins(c => c
        .map(coin => ({ ...coin, x: coin.x - speed }))
        .filter(coin => coin.x > -20)
      );

      // Update power-up
      if (powerUp) {
        setPowerUp(p => p ? { ...p, x: p.x - speed } : null);
        if (powerUp && powerUp.x < -50) setPowerUp(null);
      }

      // Update projectiles
      setProjectiles(p => p
        .map(proj => ({ ...proj, x: proj.x + proj.vx }))
        .filter(proj => proj.x < GAME_WIDTH + 50)
      );

      // Update particles
      setParticles(p => p
        .map(part => ({ ...part, x: part.x + part.vx, y: part.y + part.vy, life: part.life - 1 }))
        .filter(part => part.life > 0)
      );

      // Update Federico animation
      setFederico(f => ({ ...f, frame: (f.frame + 0.1) % 4 }));

      // Boss logic
      if (gameState === 'boss' && boss) {
        setBoss(b => {
          if (!b) return null;
          let newBoss = { ...b, attackTimer: b.attackTimer + 1 };
          
          // Boss attacks
          if (b.type === 'drone' && b.attackTimer > 60) {
            setObstacles(obs => [...obs, {
              x: b.x,
              y: b.y + 30,
              type: 'boss_projectile',
              width: 20,
              height: 10
            }]);
            newBoss.attackTimer = 0;
          } else if (b.type === 'mech' && b.attackTimer > 45) {
            setObstacles(obs => [...obs, {
              x: b.x,
              y: 280 + Math.random() * 40,
              type: 'boss_laser',
              width: 100,
              height: 15
            }]);
            newBoss.attackTimer = 0;
          }
          
          return newBoss;
        });

        // Check projectile hits on boss
        setProjectiles(projs => {
          let hit = false;
          const remaining = projs.filter(p => {
            if (p.x > boss.x - 30 && p.x < boss.x + 60 && p.y > boss.y - 30 && p.y < boss.y + 60) {
              hit = true;
              // Spawn hit particles
              for (let i = 0; i < 5; i++) {
                setParticles(parts => [...parts, {
                  x: p.x,
                  y: p.y,
                  vx: (Math.random() - 0.5) * 5,
                  vy: (Math.random() - 0.5) * 5,
                  life: 20,
                  color: '#ff00ff'
                }]);
              }
              return false;
            }
            return true;
          });
          
          if (hit) {
            setBossHealth(h => {
              const newHealth = h - 10;
              if (newHealth <= 0) {
                setGameState('playing');
                setBoss(null);
                setScore(s => s + 500);
                // Victory particles
                for (let i = 0; i < 20; i++) {
                  setParticles(parts => [...parts, {
                    x: 600,
                    y: 250,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 40,
                    color: '#00ffff'
                  }]);
                }
              }
              return newHealth;
            });
          }
          
          return remaining;
        });
      }

      // Collision detection
      setObstacles(obs => {
        const playerBox = {
          x: player.x,
          y: player.y,
          width: 30,
          height: player.isSliding ? 25 : 50
        };

        obs.forEach(o => {
          if (
            playerBox.x < o.x + o.width &&
            playerBox.x + playerBox.width > o.x &&
            playerBox.y < o.y + o.height &&
            playerBox.y + playerBox.height > o.y
          ) {
            if (hasShield) {
              setHasShield(false);
              // Remove the obstacle that was hit
              o.x = -100;
            } else {
              setPlayerHealth(h => {
                if (h <= 1) {
                  setGameState('gameOver');
                }
                return h - 1;
              });
              o.x = -100;
            }
            // Hit particles
            for (let i = 0; i < 5; i++) {
              setParticles(parts => [...parts, {
                x: player.x,
                y: player.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 15,
                color: '#ff0000'
              }]);
            }
          }
        });
        return obs.filter(o => o.x > -50);
      });

      // Coin collection
      setCoins(c => {
        return c.filter(coin => {
          const dist = Math.hypot(coin.x - player.x - 15, coin.y - player.y - 25);
          if (dist < 30) {
            setCollectedCoins(cc => cc + 1);
            setScore(s => s + 50);
            return false;
          }
          return true;
        });
      });

      // Power-up collection
      if (powerUp) {
        const dist = Math.hypot(powerUp.x - player.x - 15, powerUp.y - player.y - 25);
        if (dist < 35) {
          setHasShield(true);
          setPowerUp(null);
        }
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, speed, player, boss, bossNumber, hasShield, powerUp]);

  const getSkyGradient = () => {
    const t = timeOfDay;
    if (t < 0.25) return 'linear-gradient(to bottom, #0a0a1a, #1a0a2e, #2d1b4e)';
    if (t < 0.5) return 'linear-gradient(to bottom, #1a0a2e, #4a1942, #2d1b4e)';
    if (t < 0.75) return 'linear-gradient(to bottom, #0d0d1a, #1a1a3e, #0a0a1a)';
    return 'linear-gradient(to bottom, #050510, #0a0a1a, #1a0a2e)';
  };

  const renderPlayer = () => {
    const yOffset = player.isSliding ? 25 : 0;
    const height = player.isSliding ? 25 : 50;
    
    return (
      <g transform={`translate(${player.x}, ${player.y + yOffset})`}>
        {hasShield && (
          <ellipse cx="15" cy={height/2} rx="25" ry={height/2 + 5} 
            fill="none" stroke="#00ffff" strokeWidth="2" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.3;0.6" dur="0.5s" repeatCount="indefinite"/>
          </ellipse>
        )}
        {/* Body */}
        <rect x="5" y={height - 35} width="20" height="30" fill="#ff1493" rx="3"/>
        {/* Head */}
        <circle cx="15" cy={height - 42} r="10" fill="#ffdbac"/>
        {/* Hair */}
        <path d={`M5 ${height - 45} Q15 ${height - 55} 25 ${height - 45} Q28 ${height - 35} 25 ${height - 30}`} 
          fill="#9932cc"/>
        {/* Cyber eye */}
        <rect x="18" y={height - 44} width="5" height="2" fill="#00ffff">
          <animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="indefinite"/>
        </rect>
        {/* Legs */}
        {!player.isSliding && (
          <>
            <rect x="7" y={height - 5} width="6" height="8" fill="#1a1a2e"/>
            <rect x="17" y={height - 5} width="6" height="8" fill="#1a1a2e"/>
          </>
        )}
        {/* Neon trim */}
        <line x1="5" y1={height - 20} x2="25" y2={height - 20} stroke="#00ffff" strokeWidth="1">
          <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite"/>
        </line>
        {/* Name tag */}
        <text x="15" y={height - 55} textAnchor="middle" fill="#00ffff" fontSize="8" fontFamily="monospace">
          FRANCESCA
        </text>
      </g>
    );
  };

  const renderFederico = () => {
    const bobY = Math.sin(federico.frame * Math.PI) * 3;
    
    return (
      <g transform={`translate(${federico.x}, ${federico.y + bobY})`}>
        {/* Body */}
        <rect x="0" y="15" width="15" height="25" fill="#4169e1" rx="2"/>
        {/* Head */}
        <circle cx="7" cy="8" r="8" fill="#ffdbac"/>
        {/* Hair */}
        <ellipse cx="7" cy="3" rx="7" ry="4" fill="#8b4513"/>
        {/* Backpack with borraccia */}
        <rect x="-5" y="18" width="8" height="15" fill="#32cd32" rx="2"/>
        {/* Borraccia sticking out */}
        <rect x="-3" y="12" width="4" height="10" fill="#00bfff" rx="1"/>
        <ellipse cx="-1" cy="12" rx="3" ry="2" fill="#00bfff"/>
        {/* Legs running */}
        <rect x="2" y="40" width="5" height="8" fill="#1a1a2e" 
          transform={`rotate(${Math.sin(federico.frame * Math.PI) * 20}, 4, 40)`}/>
        <rect x="8" y="40" width="5" height="8" fill="#1a1a2e"
          transform={`rotate(${-Math.sin(federico.frame * Math.PI) * 20}, 10, 40)`}/>
        {/* Name tag */}
        <text x="7" y="-5" textAnchor="middle" fill="#ff00ff" fontSize="8" fontFamily="monospace">
          FEDERICO
        </text>
      </g>
    );
  };

  const renderBoss = () => {
    if (!boss) return null;
    
    if (boss.type === 'drone') {
      return (
        <g transform={`translate(${boss.x}, ${boss.y})`}>
          {/* Main body */}
          <ellipse cx="0" cy="0" rx="40" ry="25" fill="#2d2d4e"/>
          <ellipse cx="0" cy="0" rx="35" ry="20" fill="#1a1a3e"/>
          {/* Eye */}
          <circle cx="0" cy="0" r="12" fill="#ff0000">
            <animate attributeName="fill" values="#ff0000;#ff6600;#ff0000" dur="0.5s" repeatCount="indefinite"/>
          </circle>
          {/* Propellers */}
          <rect x="-50" y="-5" width="20" height="5" fill="#666">
            <animateTransform attributeName="transform" type="rotate" from="0 -40 0" to="360 -40 0" dur="0.1s" repeatCount="indefinite"/>
          </rect>
          <rect x="30" y="-5" width="20" height="5" fill="#666">
            <animateTransform attributeName="transform" type="rotate" from="0 40 0" to="360 40 0" dur="0.1s" repeatCount="indefinite"/>
          </rect>
          {/* Health bar */}
          <rect x="-40" y="-45" width="80" height="8" fill="#333" rx="2"/>
          <rect x="-38" y="-43" width={76 * (bossHealth / 100)} height="4" fill="#ff0000" rx="1"/>
          <text x="0" y="-50" textAnchor="middle" fill="#ff00ff" fontSize="10" fontFamily="monospace">
            SECURITY DRONE
          </text>
        </g>
      );
    } else {
      return (
        <g transform={`translate(${boss.x}, ${boss.y})`}>
          {/* Mech body */}
          <rect x="-30" y="0" width="60" height="80" fill="#3d3d5c" rx="5"/>
          <rect x="-25" y="5" width="50" height="40" fill="#1a1a3e"/>
          {/* Visor */}
          <rect x="-20" y="10" width="40" height="15" fill="#ff0000">
            <animate attributeName="fill" values="#ff0000;#ff3300;#ff0000" dur="0.3s" repeatCount="indefinite"/>
          </rect>
          {/* Arms */}
          <rect x="-45" y="20" width="15" height="50" fill="#4d4d6e" rx="3"/>
          <rect x="30" y="20" width="15" height="50" fill="#4d4d6e" rx="3"/>
          {/* Weapon */}
          <rect x="35" y="55" width="25" height="10" fill="#ff6600"/>
          {/* Health bar */}
          <rect x="-40" y="-25" width="80" height="8" fill="#333" rx="2"/>
          <rect x="-38" y="-23" width={76 * (bossHealth / 150)} height="4" fill="#ff0000" rx="1"/>
          <text x="0" y="-30" textAnchor="middle" fill="#ff00ff" fontSize="10" fontFamily="monospace">
            GUARDIAN MECH
          </text>
        </g>
      );
    }
  };

  const renderObstacle = (obs, index) => {
    switch (obs.type) {
      case 'barrier':
        return (
          <g key={index} transform={`translate(${obs.x}, ${obs.y - 50})`}>
            <rect width="30" height="50" fill="#ff6600" rx="2"/>
            <rect x="5" width="5" height="50" fill="#ffff00" opacity="0.5">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.3s" repeatCount="indefinite"/>
            </rect>
            <rect x="20" width="5" height="50" fill="#ffff00" opacity="0.5">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.3s" repeatCount="indefinite"/>
            </rect>
          </g>
        );
      case 'drone':
        return (
          <g key={index} transform={`translate(${obs.x}, ${obs.y})`}>
            <ellipse cx="20" cy="10" rx="20" ry="10" fill="#4a4a6a"/>
            <circle cx="20" cy="10" r="5" fill="#ff0000">
              <animate attributeName="r" values="5;7;5" dur="0.2s" repeatCount="indefinite"/>
            </circle>
          </g>
        );
      case 'laser_low':
      case 'laser_high':
        return (
          <g key={index} transform={`translate(${obs.x}, ${obs.y})`}>
            <rect width="30" height="20" fill="#ff00ff" opacity="0.8">
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.1s" repeatCount="indefinite"/>
            </rect>
            <rect y="8" width="30" height="4" fill="#ffffff"/>
          </g>
        );
      case 'boss_projectile':
        return (
          <g key={index} transform={`translate(${obs.x}, ${obs.y})`}>
            <ellipse cx="10" cy="5" rx="15" ry="8" fill="#ff3300">
              <animate attributeName="rx" values="15;18;15" dur="0.1s" repeatCount="indefinite"/>
            </ellipse>
          </g>
        );
      case 'boss_laser':
        return (
          <g key={index} transform={`translate(${obs.x}, ${obs.y})`}>
            <rect width="100" height="15" fill="#ff0000" opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.5;0.9" dur="0.05s" repeatCount="indefinite"/>
            </rect>
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-2 sm:p-4 select-none" ref={containerRef}>
      <div className="mb-2 sm:mb-4 text-cyan-400 font-mono text-xs sm:text-base flex flex-wrap justify-center gap-2 sm:gap-6">
        <span>❤️ {playerHealth}</span>
        <span>🪙 {collectedCoins}</span>
        <span>📏 {Math.floor(distance)}m</span>
        <span>⭐ {score}</span>
      </div>
      
      <svg 
        width={gameDimensions.width} 
        height={gameDimensions.height} 
        viewBox={`0 0 ${GAME_WIDTH} ${GAME_HEIGHT}`}
        className="border-2 border-cyan-500 rounded-lg touch-none"
        style={{ background: getSkyGradient() }}
      >
        {/* City background - parallax layers */}
        {[...Array(15)].map((_, i) => (
          <rect
            key={`building-${i}`}
            x={(i * 60 - (distance * 0.2) % 900 + 900) % 900 - 50}
            y={GAME_HEIGHT - GROUND_HEIGHT - 80 - Math.random() * 100}
            width="40"
            height={80 + Math.random() * 100}
            fill={`rgba(20, 20, 40, ${0.5 + Math.random() * 0.3})`}
          />
        ))}
        
        {/* Neon signs */}
        {[...Array(5)].map((_, i) => (
          <rect
            key={`neon-${i}`}
            x={(i * 180 - (distance * 0.3) % 900 + 900) % 900}
            y={GAME_HEIGHT - GROUND_HEIGHT - 120 - i * 20}
            width="30"
            height="10"
            fill={['#ff00ff', '#00ffff', '#ff6600', '#00ff00', '#ff0066'][i]}
            opacity={0.7}
          >
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur={`${0.5 + i * 0.2}s`} repeatCount="indefinite"/>
          </rect>
        ))}

        {/* Ground */}
        <rect 
          x="0" 
          y={GAME_HEIGHT - GROUND_HEIGHT} 
          width={GAME_WIDTH} 
          height={GROUND_HEIGHT} 
          fill="#1a1a2e"
        />
        <line 
          x1="0" 
          y1={GAME_HEIGHT - GROUND_HEIGHT} 
          x2={GAME_WIDTH} 
          y2={GAME_HEIGHT - GROUND_HEIGHT} 
          stroke="#00ffff" 
          strokeWidth="3"
        >
          <animate attributeName="stroke" values="#00ffff;#ff00ff;#00ffff" dur="2s" repeatCount="indefinite"/>
        </line>

        {/* Grid lines on ground */}
        {[...Array(20)].map((_, i) => (
          <line
            key={`grid-${i}`}
            x1={(i * 50 - (distance * 2) % 1000 + 1000) % 1000 - 50}
            y1={GAME_HEIGHT - GROUND_HEIGHT}
            x2={(i * 50 - (distance * 2) % 1000 + 1000) % 1000 - 50}
            y2={GAME_HEIGHT}
            stroke="#00ffff"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}

        {/* Coins */}
        {coins.map((coin, i) => (
          <g key={`coin-${i}`} transform={`translate(${coin.x}, ${coin.y})`}>
            <circle r="10" fill="#ffd700">
              <animate attributeName="r" values="10;12;10" dur="0.5s" repeatCount="indefinite"/>
            </circle>
            <text x="0" y="4" textAnchor="middle" fill="#000" fontSize="10" fontWeight="bold">$</text>
          </g>
        ))}

        {/* Power-up */}
        {powerUp && (
          <g transform={`translate(${powerUp.x}, ${powerUp.y})`}>
            <circle r="15" fill="none" stroke="#00ffff" strokeWidth="3">
              <animate attributeName="r" values="15;18;15" dur="0.5s" repeatCount="indefinite"/>
            </circle>
            <text x="0" y="5" textAnchor="middle" fill="#00ffff" fontSize="16">🛡️</text>
          </g>
        )}

        {/* Obstacles */}
        {obstacles.map((obs, i) => renderObstacle(obs, i))}

        {/* Projectiles */}
        {projectiles.map((proj, i) => (
          <g key={`proj-${i}`} transform={`translate(${proj.x}, ${proj.y})`}>
            <ellipse cx="0" cy="0" rx="12" ry="4" fill="#00ffff">
              <animate attributeName="rx" values="12;15;12" dur="0.1s" repeatCount="indefinite"/>
            </ellipse>
            <ellipse cx="0" cy="0" rx="6" ry="2" fill="#ffffff"/>
          </g>
        ))}

        {/* Particles */}
        {particles.map((part, i) => (
          <circle
            key={`part-${i}`}
            cx={part.x}
            cy={part.y}
            r={3}
            fill={part.color}
            opacity={part.life / 20}
          />
        ))}

        {/* Federico */}
        {gameState !== 'boss' && renderFederico()}

        {/* Boss */}
        {renderBoss()}

        {/* Player */}
        {renderPlayer()}

        {/* Menu overlay */}
        {gameState === 'menu' && (
          <g>
            <rect x="0" y="0" width={GAME_WIDTH} height={GAME_HEIGHT} fill="rgba(0,0,0,0.8)"/>
            <text x={GAME_WIDTH/2} y="100" textAnchor="middle" fill="#ff00ff" fontSize="36" fontFamily="monospace">
              LA CACCIA ALLA BORRACCIA
            </text>
            <text x={GAME_WIDTH/2} y="150" textAnchor="middle" fill="#00ffff" fontSize="18" fontFamily="monospace">
              ~ Cyberpunk Edition ~
            </text>
            <text x={GAME_WIDTH/2} y="220" textAnchor="middle" fill="#ffffff" fontSize="14" fontFamily="monospace">
              Federico ha rubato la borraccia a Francesca!
            </text>
            <text x={GAME_WIDTH/2} y="270" textAnchor="middle" fill="#aaa" fontSize="12" fontFamily="monospace">
              ⬆️/SPAZIO = Salta | ⬇️ = Scivolata | X = Spara
            </text>
            <text x={GAME_WIDTH/2} y="320" textAnchor="middle" fill="#00ff00" fontSize="16" fontFamily="monospace">
              Premi SPAZIO per iniziare
            </text>
          </g>
        )}

        {/* Victory screen */}
        {gameState === 'victory' && (
          <g>
            <rect x="0" y="0" width={GAME_WIDTH} height={GAME_HEIGHT} fill="rgba(0,0,0,0.85)"/>
            <text x={GAME_WIDTH/2} y="100" textAnchor="middle" fill="#00ff00" fontSize="36" fontFamily="monospace">
              BORRACCIA RECUPERATA!
            </text>
            <text x={GAME_WIDTH/2} y="160" textAnchor="middle" fill="#00ffff" fontSize="60">
              🎉💧🎉
            </text>
            <text x={GAME_WIDTH/2} y="220" textAnchor="middle" fill="#ffffff" fontSize="18" fontFamily="monospace">
              Francesca ha catturato Federico!
            </text>
            <text x={GAME_WIDTH/2} y="260" textAnchor="middle" fill="#ffd700" fontSize="16" fontFamily="monospace">
              Punteggio: {score} | Monete: {collectedCoins}
            </text>
            <text x={GAME_WIDTH/2} y="320" textAnchor="middle" fill="#ff00ff" fontSize="14" fontFamily="monospace">
              Premi ENTER per rigiocare
            </text>
          </g>
        )}

        {/* Game Over screen */}
        {gameState === 'gameOver' && (
          <g>
            <rect x="0" y="0" width={GAME_WIDTH} height={GAME_HEIGHT} fill="rgba(0,0,0,0.85)"/>
            <text x={GAME_WIDTH/2} y="100" textAnchor="middle" fill="#ff0000" fontSize="36" fontFamily="monospace">
              GAME OVER
            </text>
            <text x={GAME_WIDTH/2} y="160" textAnchor="middle" fill="#ff6666" fontSize="18" fontFamily="monospace">
              Federico è scappato! Francesca è rimasta senza acqua!
            </text>
            <text x={GAME_WIDTH/2} y="220" textAnchor="middle" fill="#ffd700" fontSize="16" fontFamily="monospace">
              Distanza: {Math.floor(distance)}m | Punteggio: {score}
            </text>
            <text x={GAME_WIDTH/2} y="280" textAnchor="middle" fill="#ff00ff" fontSize="14" fontFamily="monospace">
              Premi ENTER per riprovare
            </text>
          </g>
        )}

        {/* Boss warning */}
        {gameState === 'boss' && (
          <text x={GAME_WIDTH/2} y="40" textAnchor="middle" fill="#ff0000" fontSize="20" fontFamily="monospace">
            ⚠️ BOSS FIGHT - Spara con X! ⚠️
            <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite"/>
          </text>
        )}
      </svg>

      {/* Mobile Touch Controls */}
      {isMobile && (gameState === 'playing' || gameState === 'boss') && (
        <div className="mt-4 w-full max-w-md px-4">
          <div className="flex justify-between items-center gap-2">
            {/* Left side - Jump & Slide */}
            <div className="flex flex-col gap-2">
              <button
                onTouchStart={(e) => handleTouchStart(e, 'jump')}
                className="w-20 h-16 bg-cyan-600 active:bg-cyan-400 rounded-xl text-white font-bold text-2xl shadow-lg shadow-cyan-500/30 transition-all"
              >
                ⬆️
              </button>
              <button
                onTouchStart={(e) => handleTouchStart(e, 'slide')}
                className="w-20 h-12 bg-purple-600 active:bg-purple-400 rounded-xl text-white font-bold text-xl shadow-lg shadow-purple-500/30 transition-all"
              >
                ⬇️
              </button>
            </div>
            
            {/* Right side - Shoot */}
            <button
              onTouchStart={(e) => handleTouchStart(e, 'shoot')}
              className="w-24 h-24 bg-pink-600 active:bg-pink-400 rounded-full text-white font-bold text-3xl shadow-lg shadow-pink-500/30 transition-all flex items-center justify-center"
            >
              💥
            </button>
          </div>
        </div>
      )}

      {/* Mobile start/restart button */}
      {isMobile && (gameState === 'menu' || gameState === 'victory' || gameState === 'gameOver') && (
        <button
          onTouchStart={(e) => handleTouchStart(e, 'jump')}
          className="mt-6 px-8 py-4 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-xl text-white font-bold text-xl shadow-lg transition-all active:scale-95"
        >
          {gameState === 'menu' ? '🎮 GIOCA' : '🔄 RIGIOCA'}
        </button>
      )}

      {/* Desktop instructions */}
      {!isMobile && (
        <div className="mt-4 text-gray-400 text-sm font-mono text-center">
          <p>⬆️/SPAZIO = Salta | ⬇️ = Scivolata | X = Spara</p>
          <p className="mt-1">Raccogli 🛡️ per uno scudo | 🪙 per punti extra</p>
        </div>
      )}

      {/* Mobile instructions */}
      {isMobile && gameState === 'menu' && (
        <div className="mt-4 text-gray-400 text-xs font-mono text-center px-4">
          <p>⬆️ = Salta | ⬇️ = Scivolata | 💥 = Spara</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-3 w-full max-w-md px-4">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 transition-all duration-300"
            style={{ width: `${Math.min((distance / WIN_DISTANCE) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
          <span>0m</span>
          <span className="text-yellow-500">Boss 1</span>
          <span className="text-red-500">Boss 2</span>
          <span className="text-green-500">🏁 {WIN_DISTANCE}m</span>
        </div>
      </div>
    </div>
  );
};

export default CyberpunkChase;
