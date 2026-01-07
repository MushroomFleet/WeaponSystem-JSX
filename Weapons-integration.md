# Weapons Integration Guide

This document explains how to integrate the `CombatSystem.jsx` component into your React Three.js project.

## Prerequisites

Your project should have the following dependencies:

```bash
npm install three @react-three/fiber @react-three/drei
```

**Required versions:**
- React 18+
- Three.js r128+
- @react-three/fiber 8+
- @react-three/drei 9+

## File Structure

```
your-project/
├── src/
│   ├── components/
│   │   ├── CombatSystem.jsx      # Main combat component
│   │   ├── PlayerController.jsx  # Your player controller
│   │   └── EnemyManager.jsx      # Your enemy management
│   └── App.jsx
```

## Basic Integration

### Step 1: Import the Component

```jsx
import { 
  CombatSystem, 
  useCombatSystem,
  useCombatInputManager,
  COMBAT_CONFIG 
} from './components/CombatSystem';
```

### Step 2: Add to Your Scene

```jsx
import { Canvas } from '@react-three/fiber';
import { CombatSystem } from './components/CombatSystem';

function Game() {
  const [playerPosition, setPlayerPosition] = useState(new Vector3(0, 0, 0));
  const [playerAimTarget, setPlayerAimTarget] = useState(new Vector3(0, 0, -50));
  const [enemies, setEnemies] = useState([]);

  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} />
      
      {/* Your player component */}
      <PlayerShip 
        onPositionUpdate={setPlayerPosition}
        onAimUpdate={setPlayerAimTarget}
      />
      
      {/* Combat System */}
      <CombatSystem
        playerPosition={playerPosition}
        playerAimTarget={playerAimTarget}
        enemies={enemies}
        onEnemyDamage={handleEnemyDamage}
        onEnemyKill={handleEnemyKill}
        onWeaponFire={handleWeaponFire}
      />
      
      {/* Your enemy components */}
      <EnemyManager enemies={enemies} />
    </Canvas>
  );
}
```

## Props Reference

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `playerPosition` | `Vector3` | Current player ship position |
| `playerAimTarget` | `Vector3` | Where the player is aiming (world coordinates) |
| `enemies` | `Array<Enemy>` | Array of enemy objects |

### Enemy Object Structure

Each enemy in the `enemies` array must have:

```typescript
interface Enemy {
  id: string | number;        // Unique identifier
  position: Vector3;          // Current world position
  health: number;             // Current health (> 0 to be targetable)
  velocity?: Vector3;         // Optional: for target leading
  hitRadius?: number;         // Optional: collision radius (default: 1.5)
  isBoss?: boolean;           // Optional: for boss-specific weapons
}
```

### Callback Props

| Prop | Signature | Description |
|------|-----------|-------------|
| `onEnemyDamage` | `(enemyId, damage, options) => void` | Called when enemy takes damage |
| `onEnemyKill` | `(enemyId, options) => void` | Called when enemy is destroyed |
| `onEnemyPull` | `(enemyId, direction, strength) => void` | Called for gravity pull effect |
| `onWeaponFire` | `(type, weaponName) => void` | Called when weapon fires |
| `onPlayerDamage` | `(damage) => void` | Called when player takes damage |

### Input Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fireInput` | `boolean` | `false` | Fire weapon trigger |
| `switchWeaponInput` | `boolean` | `false` | Switch weapon type trigger |
| `toggleLockInput` | `boolean` | `false` | Toggle auto-lock trigger |
| `cycleTargetNextInput` | `boolean` | `false` | Cycle to next target |
| `cycleTargetPrevInput` | `boolean` | `false` | Cycle to previous target |

### Configuration Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `unlockedWeapons` | `string[]` | `['GRAVITY']` | Unlockable weapons available |

### Passive Multiplier Callbacks

These callbacks receive the current multiplier values when passives are active:

```jsx
<CombatSystem
  // ... other props
  getMovementMultiplier={(mult) => setMovementSpeed(baseSpeed * mult)}
  getBarrelRollMultiplier={(mult) => setRollDuration(baseDuration * mult)}
  getEvadeCooldownMultiplier={(mult) => setEvadeCooldown(baseCooldown * mult)}
  getBoostMultiplier={(mult) => setBoostPower(basePower * mult)}
  getBoostCooldownMultiplier={(mult) => setBoostCooldown(baseCooldown * mult)}
  getDamageReduction={(reduction) => setDamageReduction(reduction)}
/>
```

## Using the Combat Context

Access combat state from child components:

```jsx
import { useCombatSystem } from './CombatSystem';

function WeaponDisplay() {
  const { 
    currentGun,
    currentMissile,
    activeWeaponType,
    missileAmmo,
    autoLockEnabled,
    targeting,
    activePassives,
    weaponSwitchLocked,
  } = useCombatSystem();

  return (
    <div className="hud">
      <div>Weapon: {activeWeaponType === 'gun' ? currentGun.name : currentMissile.name}</div>
      <div>Targets: {targeting.targetCount}</div>
      <div>Locks: {targeting.lockedTargets.length}</div>
    </div>
  );
}
```

## Using the Input Manager

The built-in input manager handles keyboard and gamepad:

```jsx
import { useCombatInputManager } from './CombatSystem';

function GameScene() {
  const combatInput = useCombatInputManager();
  
  return (
    <CombatSystem
      fireInput={combatInput.fire}
      switchWeaponInput={combatInput.switchWeapon}
      toggleLockInput={combatInput.toggleLock}
      cycleTargetNextInput={combatInput.cycleTargetNext}
      cycleTargetPrevInput={combatInput.cycleTargetPrev}
      // ... other props
    />
  );
}
```

### Default Input Bindings

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Fire | Left Click / Space | LT / RT |
| Switch Weapon | F | Y |
| Toggle Lock | Tab | Select |
| Cycle Target Prev | Q | LB |
| Cycle Target Next | E | RB |

## Triggering Weapon Pickups

Use the context methods to equip weapons:

```jsx
const { pickupGunPowerup, pickupMissilePowerup, pickupPassive } = useCombatSystem();

// When player collects a powerup
function onPowerupCollected(powerupType) {
  switch(powerupType) {
    case 'FLAK':
    case 'LIGHTNING':
    case 'BEAM':
    case 'GRAVITY':
      pickupGunPowerup(powerupType);
      break;
      
    case 'SMARTBOMB':
    case 'BUSTER':
    case 'BARRAGE':
    case 'THOR':
      pickupMissilePowerup(powerupType);
      break;
      
    case 'MULTILOCK':
    case 'OVERDRIVE':
    case 'ACTIVE_ARMOR':
      pickupPassive(powerupType);
      break;
  }
}
```

## Handling Damage Events

### Enemy Damage Callback

```jsx
function handleEnemyDamage(enemyId, damage, options) {
  setEnemies(prev => prev.map(enemy => {
    if (enemy.id !== enemyId) return enemy;
    
    const newHealth = enemy.health - damage;
    
    // Handle special damage types
    if (options.isBeam) {
      // Continuous damage from beam weapon
    }
    if (options.isExplosive) {
      // AOE damage, check nearby enemies
      // options.explosionRadius available
    }
    if (options.isThorStrike) {
      // Push enemy down
      // options.downForce available
    }
    
    return { ...enemy, health: newHealth };
  }));
}
```

### Enemy Kill Callback

```jsx
function handleEnemyKill(enemyId, options) {
  if (options.isGravityCollapse) {
    // Enemy was killed by gravity well collapse
    // Play special effect
  }
  
  setEnemies(prev => prev.filter(e => e.id !== enemyId));
  setScore(prev => prev + 100);
}
```

### Gravity Pull Callback

```jsx
function handleEnemyPull(enemyId, direction, strength) {
  setEnemies(prev => prev.map(enemy => {
    if (enemy.id !== enemyId) return enemy;
    
    // Move enemy toward gravity well
    const newPos = enemy.position.clone().add(
      direction.clone().multiplyScalar(strength)
    );
    
    return { ...enemy, position: newPos };
  }));
}
```

## Active Armor Integration

Handle player damage with Active Armor:

```jsx
const { handlePlayerDamage } = useCombatSystem();

function onPlayerHit(incomingDamage, hitPosition) {
  // This returns reduced damage if Active Armor is active
  // and spawns the blue explosion effect
  const actualDamage = handlePlayerDamage(incomingDamage, hitPosition);
  
  setPlayerHealth(prev => prev - actualDamage);
}
```

## Customizing Weapon Configuration

Import and modify the config:

```jsx
import { COMBAT_CONFIG } from './CombatSystem';

// Modify weapon stats
COMBAT_CONFIG.GUNS.RAPID.damage = 15;
COMBAT_CONFIG.GUNS.RAPID.fireRate = 80;

// Add custom weapon
COMBAT_CONFIG.GUNS.PLASMA = {
  name: 'PLASMA',
  type: 'gun',
  fireRate: 200,
  damage: 25,
  projectileSpeed: 70,
  projectileLifetime: 1500,
  spread: 0.1,
  projectilesPerShot: 2,
  duration: 12000,
  color: '#00ffaa',
  description: 'Twin plasma bolts',
};
```

## Disabling the Built-in HUD

The component includes an HTML-based HUD. To use your own:

```jsx
// In CombatSystem.jsx, remove or conditionally render:
{showHUD && (
  <Html fullscreen>
    <CombatHUD ... />
  </Html>
)}

// Or create a separate HUD using the context
function CustomHUD() {
  const combat = useCombatSystem();
  // Render your own UI
}
```

## Performance Considerations

1. **Enemy Array Updates**: Use immutable updates to prevent unnecessary re-renders
2. **Projectile Limits**: Consider adding max projectile limits for performance
3. **Dispose Resources**: Three.js geometries/materials are disposed on unmount

```jsx
// Add projectile limits
const MAX_PROJECTILES = 100;

// In your update logic
if (projectiles.length > MAX_PROJECTILES) {
  const excess = projectiles.slice(0, projectiles.length - MAX_PROJECTILES);
  excess.forEach(p => scene.remove(p));
}
```

## TypeScript Support

Add type definitions:

```typescript
interface CombatSystemProps {
  playerPosition: THREE.Vector3;
  playerAimTarget: THREE.Vector3;
  enemies: Enemy[];
  onEnemyDamage?: (enemyId: string, damage: number, options: DamageOptions) => void;
  onEnemyKill?: (enemyId: string, options: KillOptions) => void;
  onEnemyPull?: (enemyId: string, direction: THREE.Vector3, strength: number) => void;
  onWeaponFire?: (type: 'gun' | 'missile', weaponName: string) => void;
  onPlayerDamage?: (damage: number) => void;
  fireInput?: boolean;
  switchWeaponInput?: boolean;
  toggleLockInput?: boolean;
  cycleTargetNextInput?: boolean;
  cycleTargetPrevInput?: boolean;
  unlockedWeapons?: string[];
}

interface DamageOptions {
  isBeam?: boolean;
  isExplosive?: boolean;
  explosionRadius?: number;
  isMissile?: boolean;
  isThorStrike?: boolean;
  pushDown?: boolean;
  downForce?: number;
  isSmartbomb?: boolean;
  isMultiLock?: boolean;
  isGravityCollapse?: boolean;
}
```

## Troubleshooting

### Weapons not firing
- Check that `fireInput` prop is being updated
- Verify `playerPosition` is a valid Vector3

### Targets not locking
- Ensure enemies have valid `position` and `health > 0`
- Check that enemies are within `AUTO_LOCKON_RANGE` (150 units)

### Gravity well not appearing
- Verify `GRAVITY` is in `unlockedWeapons` array
- Check that projectile hit an enemy (not empty space)

### THOR not striking
- Ensure targets are locked before firing
- Verify `autoLockEnabled` is true or manual target exists
