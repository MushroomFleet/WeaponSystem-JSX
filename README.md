# 🚀 WeaponSystem-JSX

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r128+-black?logo=three.js)](https://threejs.org/)

A comprehensive combat system component for React Three.js games, inspired by classic arcade shooters like **Star Fox 64**. Features multiple weapon types, targeting systems, powerups, and passive abilities.

![Combat System Preview](https://img.shields.io/badge/Status-Production_Ready-brightgreen)

## ✨ Features

### 🔫 Gun Weapons
| Weapon | Type | Description |
|--------|------|-------------|
| **RAPID** | Default | Unlimited rapid-fire laser cannon |
| **FLAK** | Pickup | 8-projectile explosive spread (10s) |
| **LIGHTNING** | Pickup | Chain lightning arcs to 4 enemies (10s) |
| **BEAM** | Pickup | Continuous high-damage laser (10s) |
| **GRAVITY** | NG+ Unlock | Creates gravity well on enemy, pulls squad together, destroys all (10s) |

### 🚀 Missile Weapons
| Weapon | Type | Description |
|--------|------|-------------|
| **HELLFIRE** | Default | Multi-lock homing missiles (8 targets, 32 ammo) |
| **SMARTBOMB** | Pickup | Screen-clearing explosion (bosses immune) |
| **BUSTER** | Pickup | Anti-capital ship missile (misses normal enemies) |
| **BARRAGE** | Pickup | Unlimited rapid-fire missiles (20s) |
| **THOR** | Pickup | Orbital kinetic strike with laser targeting (15s) |

### ⚡ Passive Powerups (30s duration)
| Passive | Effect |
|---------|--------|
| **MULTI-LOCK** | Lock entire squadron, fire one projectile per enemy. Locks weapon switching. |
| **OVERDRIVE** | 2× movement speed, 2× barrel roll, 50% reduced cooldowns. Stacks with boost. |
| **ACTIVE ARMOR** | Blue reactive explosions on hit, 90% damage reduction. |

### 🎯 Targeting System
- Auto-lock to nearest enemy (toggleable)
- Manual target cycling (Q/E or LB/RB)
- Multi-lock for missile weapons
- 150m lock-on range
- Visual lock indicators

## 🎮 Quick Demo

**[▶️ Open Interactive Demo](CombatSystemDemo.html)** - Download and open in your browser for immediate testing!

The demo includes:
- Full weapon testing arena
- Enemy spawn controls
- All weapons available via click-to-equip
- Passive powerup activation
- Real-time HUD display

### Demo Controls

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Move | WASD | Left Stick |
| Aim | Mouse | Right Stick |
| Fire | Left Click | LT / RT |
| Switch Weapon | F | Y |
| Toggle Lock | Tab | Select |
| Cycle Target | Q / E | LB / RB |

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/MushroomFleet/WeaponSystem-JSX.git

# Install dependencies (for your React project)
npm install three @react-three/fiber @react-three/drei
```

## 🚀 Quick Start

```jsx
import { CombatSystem, useCombatInputManager } from './CombatSystem';

function Game() {
  const combatInput = useCombatInputManager();
  const [enemies, setEnemies] = useState([]);
  
  return (
    <Canvas>
      <CombatSystem
        playerPosition={playerPos}
        playerAimTarget={aimTarget}
        enemies={enemies}
        onEnemyDamage={(id, dmg) => handleDamage(id, dmg)}
        onEnemyKill={(id) => handleKill(id)}
        fireInput={combatInput.fire}
        switchWeaponInput={combatInput.switchWeapon}
        toggleLockInput={combatInput.toggleLock}
        cycleTargetNextInput={combatInput.cycleTargetNext}
        cycleTargetPrevInput={combatInput.cycleTargetPrev}
      />
    </Canvas>
  );
}
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [**Weapons-integration.md**](Weapons-integration.md) | Complete integration guide with props, callbacks, and examples |
| [**CombatSystem.jsx**](CombatSystem.jsx) | Main React component source |
| [**CombatSystemDemo.html**](CombatSystemDemo.html) | Standalone demo for testing |

## 🏗️ Project Structure

```
WeaponSystem-JSX/
├── README.md                 # This file
├── Weapons-integration.md    # Integration documentation
├── CombatSystem.jsx          # Main React Three.js component
└── CombatSystemDemo.html     # Standalone HTML demo
```

## 🎯 Enemy Object Format

```javascript
const enemy = {
  id: 'enemy-001',           // Unique identifier
  position: new Vector3(),   // THREE.Vector3 position
  health: 100,               // Current health (> 0 to be targetable)
  velocity: new Vector3(),   // Optional: for target leading
  hitRadius: 1.5,            // Optional: collision radius
  isBoss: false              // Optional: for boss-specific weapons
};
```

## ⚙️ Configuration

All weapon stats are configurable via `COMBAT_CONFIG`:

```javascript
import { COMBAT_CONFIG } from './CombatSystem';

// Modify existing weapon
COMBAT_CONFIG.GUNS.RAPID.damage = 15;
COMBAT_CONFIG.GUNS.RAPID.fireRate = 80;

// Adjust targeting range
COMBAT_CONFIG.TARGETING.AUTO_LOCKON_RANGE = 200;
```

## 🔧 Available Exports

```javascript
// Main component
export { CombatSystem }

// Context hook
export { useCombatSystem }

// Input manager hook
export { useCombatInputManager }

// Targeting system hook
export { useTargetingSystem }

// Configuration object
export { COMBAT_CONFIG }

// Individual components (for custom implementations)
export {
  CombatHUD,
  GunProjectile,
  MultiLockProjectile,
  BeamWeapon,
  GravityWell,
  Missile,
  ThorRodStrike,
  ThorTargetingLaser,
  SmartbombEffect,
  ActiveArmorExplosion,
  LockOnIndicator,
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by **Star Fox 64** (Nintendo)
- Built with [React Three Fiber](https://github.com/pmndrs/react-three-fiber)
- Uses [Three.js](https://threejs.org/) for 3D rendering

---

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{weaponsystem_jsx,
  title = {WeaponSystem-JSX: A Comprehensive Combat System for React Three.js Games},
  author = {Drift Johnson},
  year = {2025},
  url = {https://github.com/MushroomFleet/WeaponSystem-JSX},
  version = {1.0.0}
}
```

### Donate

[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)
