import React, { useRef, useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, MathUtils, Color, CatmullRomCurve3 } from 'three';
import { Html } from '@react-three/drei';

// ============================================================================
// COMBAT SYSTEM CONFIGURATION
// ============================================================================
export const COMBAT_CONFIG = {
  // Targeting System
  TARGETING: {
    AUTO_LOCKON_RANGE: 150,
    TARGET_CYCLE_COOLDOWN: 200,
    LOCKON_INDICATOR_SIZE: 2,
    MAX_MISSILE_TARGETS: 8,
    TARGET_LEAD_FACTOR: 0.5,
  },
  
  // Gun Weapons
  GUNS: {
    RAPID: {
      name: 'RAPID',
      type: 'gun',
      fireRate: 100,
      damage: 10,
      projectileSpeed: 80,
      projectileLifetime: 2000,
      spread: 0,
      projectilesPerShot: 1,
      unlimited: true,
      color: '#00ff88',
      description: 'Standard rapid-fire cannon',
    },
    FLAK: {
      name: 'FLAK',
      type: 'gun',
      fireRate: 250,
      damage: 15,
      projectileSpeed: 60,
      projectileLifetime: 1500,
      spread: 0.4,
      projectilesPerShot: 8,
      duration: 10000,
      explosionRadius: 5,
      color: '#ff8844',
      description: 'Wide cone explosive shells',
    },
    LIGHTNING: {
      name: 'LIGHTNING',
      type: 'gun',
      fireRate: 150,
      damage: 8,
      projectileSpeed: 120,
      projectileLifetime: 800,
      spread: 0.1,
      projectilesPerShot: 1,
      duration: 10000,
      chainCount: 4,
      chainRange: 15,
      color: '#88ccff',
      description: 'Chain lightning arcs between enemies',
    },
    BEAM: {
      name: 'BEAM',
      type: 'gun',
      fireRate: 0,
      damage: 50,
      beamWidth: 1.5,
      beamRange: 100,
      duration: 10000,
      isConstant: true,
      color: '#ff00ff',
      description: 'Continuous high-power laser beam',
    },
    GRAVITY: {
      name: 'GRAVITY',
      type: 'gun',
      fireRate: 400,
      damage: 25,
      projectileSpeed: 80,
      projectileLifetime: 2000,
      spread: 0,
      projectilesPerShot: 1,
      duration: 10000,
      gravityRadius: 25,
      gravityStrength: 40,
      collapseDelay: 1200,
      color: '#9900ff',
      unlockable: true,
      description: 'Hit creates gravity well on enemy, pulling squad together then destroying all',
    },
  },
  
  // Missile Weapons
  MISSILES: {
    HELLFIRE: {
      name: 'HELLFIRE',
      type: 'missile',
      fireRate: 150,
      damage: 40,
      missileSpeed: 45,
      turnRate: 8,
      lifetime: 4000,
      maxAmmo: 32,
      reloadTime: 20000,
      multiLock: true,
      maxTargets: 8,
      color: '#ff4400',
      trailColor: '#ff8800',
      description: 'Multi-lock homing missiles',
    },
    SMARTBOMB: {
      name: 'SMARTBOMB',
      type: 'missile',
      damage: 9999,
      maxAmmo: 1,
      isScreenClear: true,
      bossImmune: true,
      effectDuration: 1000,
      color: '#ffffff',
      description: 'Destroys all enemies on screen (bosses immune)',
    },
    BUSTER: {
      name: 'BUSTER',
      type: 'missile',
      fireRate: 0,
      damage: 500,
      missileSpeed: 100,
      turnRate: 2,
      lifetime: 5000,
      maxAmmo: 1,
      bossOnly: true,
      penetrating: true,
      color: '#ffff00',
      trailColor: '#ff8800',
      description: 'Anti-capital ship missile (misses normal enemies)',
    },
    BARRAGE: {
      name: 'BARRAGE',
      type: 'missile',
      fireRate: 75,
      damage: 30,
      missileSpeed: 55,
      turnRate: 6,
      lifetime: 3000,
      unlimited: true,
      duration: 20000,
      multiLock: false,
      color: '#ff6600',
      trailColor: '#ff4400',
      description: 'Unlimited rapid-fire missiles',
    },
    THOR: {
      name: 'THOR',
      type: 'missile',
      fireRate: 300,
      damage: 150,
      rodImpactInstant: true,
      rodDownForce: 50,
      rodDamageRadius: 10,
      unlimited: true,
      duration: 15000,
      maxPaintedTargets: 5,
      painterColor: '#ff0000',
      painterWidth: 0.15,
      rodColor: '#ffffff',
      color: '#00ffff',
      description: 'Orbital kinetic strike - instant rod impact pushes targets to ground',
    },
  },
  
  // Passive Powerups
  PASSIVES: {
    MULTILOCK: {
      name: 'MULTI-LOCK',
      duration: 30000,
      color: '#ffaa00',
      description: 'Lock entire squadron, fires one projectile per enemy in gun mode',
      locksWeaponSwitch: true,
      forcesGunMode: true,
    },
    OVERDRIVE: {
      name: 'OVERDRIVE',
      duration: 30000,
      color: '#00ffff',
      description: '2x movement speed, 2x barrel roll, 50% faster cooldowns',
      movementMultiplier: 2.0,
      barrelRollMultiplier: 2.0,
      evadeCooldownReduction: 0.5,
      boostMultiplier: 2.0,
      boostCooldownReduction: 0.5,
    },
    ACTIVE_ARMOR: {
      name: 'ACTIVE ARMOR',
      duration: 30000,
      color: '#4488ff',
      description: 'Blue explosions on hit, 90% damage reduction',
      damageReduction: 0.9,
      explosionColor: '#4488ff',
      explosionRadius: 3,
    },
  },
  
  // Visual Effects
  EFFECTS: {
    MUZZLE_FLASH_DURATION: 50,
    EXPLOSION_DURATION: 300,
    CHAIN_LIGHTNING_SEGMENTS: 8,
    BEAM_PULSE_SPEED: 10,
    GRAVITY_WELL_ROTATION: 3,
    THOR_PAINTER_PULSE: 5,
  },
};

// ============================================================================
// COMBAT CONTEXT
// ============================================================================
const CombatContext = createContext(null);

export function useCombatSystem() {
  const context = useContext(CombatContext);
  if (!context) {
    throw new Error('useCombatSystem must be used within a CombatSystemProvider');
  }
  return context;
}

// ============================================================================
// TARGETING SYSTEM HOOK
// ============================================================================
export function useTargetingSystem(enemies = [], playerPosition, autoLockEnabled = true) {
  const [currentTarget, setCurrentTarget] = useState(null);
  const [lockedTargets, setLockedTargets] = useState([]);
  const [targetIndex, setTargetIndex] = useState(0);
  const lastCycleTime = useRef(0);
  
  // Sort enemies by distance
  const sortedEnemies = useMemo(() => {
    if (!playerPosition || enemies.length === 0) return [];
    
    return enemies
      .filter(e => e && e.position && e.health > 0)
      .map(enemy => ({
        ...enemy,
        distance: playerPosition.distanceTo(enemy.position),
      }))
      .filter(e => e.distance < COMBAT_CONFIG.TARGETING.AUTO_LOCKON_RANGE)
      .sort((a, b) => a.distance - b.distance);
  }, [enemies, playerPosition]);
  
  // Auto-lock to nearest enemy
  useEffect(() => {
    if (autoLockEnabled && sortedEnemies.length > 0) {
      const validIndex = Math.min(targetIndex, sortedEnemies.length - 1);
      setCurrentTarget(sortedEnemies[validIndex] || null);
    } else if (!autoLockEnabled) {
      setCurrentTarget(null);
    }
  }, [sortedEnemies, targetIndex, autoLockEnabled]);
  
  // Cycle to next target
  const cycleTargetNext = useCallback(() => {
    const now = Date.now();
    if (now - lastCycleTime.current < COMBAT_CONFIG.TARGETING.TARGET_CYCLE_COOLDOWN) return;
    lastCycleTime.current = now;
    
    if (sortedEnemies.length > 0) {
      setTargetIndex(prev => (prev + 1) % sortedEnemies.length);
    }
  }, [sortedEnemies.length]);
  
  // Cycle to previous target
  const cycleTargetPrev = useCallback(() => {
    const now = Date.now();
    if (now - lastCycleTime.current < COMBAT_CONFIG.TARGETING.TARGET_CYCLE_COOLDOWN) return;
    lastCycleTime.current = now;
    
    if (sortedEnemies.length > 0) {
      setTargetIndex(prev => (prev - 1 + sortedEnemies.length) % sortedEnemies.length);
    }
  }, [sortedEnemies.length]);
  
  // Lock multiple targets for missiles
  const lockMultipleTargets = useCallback((maxTargets = COMBAT_CONFIG.TARGETING.MAX_MISSILE_TARGETS) => {
    const targets = sortedEnemies.slice(0, maxTargets);
    setLockedTargets(targets);
    return targets;
  }, [sortedEnemies]);
  
  // Lock ALL targets (for multi-lock passive)
  const lockAllTargets = useCallback(() => {
    setLockedTargets(sortedEnemies);
    return sortedEnemies;
  }, [sortedEnemies]);
  
  // Clear all locks
  const clearLocks = useCallback(() => {
    setLockedTargets([]);
    setTargetIndex(0);
  }, []);
  
  return {
    currentTarget,
    lockedTargets,
    availableTargets: sortedEnemies,
    cycleTargetNext,
    cycleTargetPrev,
    lockMultipleTargets,
    lockAllTargets,
    clearLocks,
    targetCount: sortedEnemies.length,
  };
}

// ============================================================================
// PROJECTILE COMPONENT - GUN TYPE
// ============================================================================
function GunProjectile({ 
  id, 
  position, 
  direction, 
  config, 
  onExpire, 
  onHit, 
  enemies = [],
  chainedFrom = null,
  onGravityAttach,
}) {
  const ref = useRef();
  const startTime = useRef(Date.now());
  const hasHit = useRef(false);
  const currentPos = useRef(position.clone());
  
  useFrame((_, delta) => {
    if (!ref.current || hasHit.current) return;
    
    const now = Date.now();
    const elapsed = now - startTime.current;
    
    // Move projectile
    const movement = direction.clone().multiplyScalar(config.projectileSpeed * delta);
    ref.current.position.add(movement);
    currentPos.current.copy(ref.current.position);
    
    // Check for hits
    enemies.forEach(enemy => {
      if (!enemy || !enemy.position || enemy.health <= 0) return;
      if (chainedFrom && chainedFrom.includes(enemy.id)) return;
      if (hasHit.current) return;
      
      const dist = currentPos.current.distanceTo(enemy.position);
      const hitRadius = config.explosionRadius || 1.5;
      
      if (dist < hitRadius) {
        hasHit.current = true;
        
        // Gravity weapon - attach to enemy
        if (config.gravityRadius) {
          onGravityAttach?.(enemy, config);
        } else {
          onHit?.(id, enemy.id, config.damage, {
            isExplosive: !!config.explosionRadius,
            explosionRadius: config.explosionRadius,
          });
        }
        
        onExpire(id);
      }
    });
    
    // Expire after lifetime
    if (elapsed > config.projectileLifetime) {
      onExpire(id);
    }
  });
  
  const scale = config.explosionRadius ? 0.3 : config.gravityRadius ? 0.25 : 0.15;
  
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[scale, 8, 8]} />
      <meshBasicMaterial color={config.color} />
      <pointLight color={config.color} intensity={2} distance={5} />
    </mesh>
  );
}

// ============================================================================
// MULTI-LOCK PROJECTILE COMPONENT (fires at all locked targets)
// ============================================================================
function MultiLockProjectile({
  id,
  position,
  target,
  config,
  onExpire,
  onHit,
}) {
  const ref = useRef();
  const startTime = useRef(Date.now());
  const hasHit = useRef(false);
  
  useFrame((_, delta) => {
    if (!ref.current || hasHit.current || !target?.position) return;
    
    const now = Date.now();
    const elapsed = now - startTime.current;
    
    // Home toward target
    const toTarget = target.position.clone().sub(ref.current.position).normalize();
    const movement = toTarget.multiplyScalar(config.projectileSpeed * 1.2 * delta);
    ref.current.position.add(movement);
    
    // Check hit
    const dist = ref.current.position.distanceTo(target.position);
    if (dist < 2) {
      hasHit.current = true;
      onHit?.(id, target.id, config.damage, { isMultiLock: true });
      onExpire(id);
    }
    
    // Expire after lifetime
    if (elapsed > config.projectileLifetime) {
      onExpire(id);
    }
  });
  
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.2, 8, 8]} />
      <meshBasicMaterial color="#ffaa00" />
      <pointLight color="#ffaa00" intensity={2} distance={4} />
    </mesh>
  );
}

// ============================================================================
// BEAM WEAPON COMPONENT
// ============================================================================
function BeamWeapon({ 
  origin, 
  target, 
  config, 
  isActive, 
  enemies = [],
  onHit 
}) {
  const beamRef = useRef();
  const pulsePhase = useRef(0);
  const hitCooldowns = useRef({});
  
  useFrame((_, delta) => {
    if (!beamRef.current || !isActive) return;
    
    pulsePhase.current += delta * COMBAT_CONFIG.EFFECTS.BEAM_PULSE_SPEED;
    
    const intensity = 0.7 + Math.sin(pulsePhase.current) * 0.3;
    beamRef.current.material.opacity = intensity;
    
    const now = Date.now();
    const beamDir = target.clone().sub(origin).normalize();
    
    enemies.forEach(enemy => {
      if (!enemy || !enemy.position || enemy.health <= 0) return;
      
      const toEnemy = enemy.position.clone().sub(origin);
      const projection = toEnemy.dot(beamDir);
      
      if (projection > 0 && projection < config.beamRange) {
        const closestPoint = origin.clone().add(beamDir.clone().multiplyScalar(projection));
        const distance = enemy.position.distanceTo(closestPoint);
        
        if (distance < config.beamWidth + (enemy.hitRadius || 1)) {
          if (!hitCooldowns.current[enemy.id] || now - hitCooldowns.current[enemy.id] > 100) {
            hitCooldowns.current[enemy.id] = now;
            onHit?.(null, enemy.id, config.damage * delta * 10, { isBeam: true });
          }
        }
      }
    });
  });
  
  if (!isActive) return null;
  
  const direction = target.clone().sub(origin);
  const length = Math.min(direction.length(), config.beamRange);
  const midpoint = origin.clone().add(direction.normalize().multiplyScalar(length / 2));
  
  return (
    <group>
      <mesh ref={beamRef} position={midpoint}>
        <cylinderGeometry args={[config.beamWidth * 0.3, config.beamWidth * 0.3, length, 8]} />
        <meshBasicMaterial color={config.color} transparent opacity={0.9} />
      </mesh>
      <mesh position={midpoint}>
        <cylinderGeometry args={[config.beamWidth, config.beamWidth, length, 8]} />
        <meshBasicMaterial color={config.color} transparent opacity={0.3} />
      </mesh>
      <pointLight position={origin} color={config.color} intensity={5} distance={10} />
    </group>
  );
}

// ============================================================================
// GRAVITY WELL COMPONENT (attached to enemy)
// ============================================================================
function GravityWell({ 
  id, 
  anchorEnemy,
  config, 
  onExpire, 
  onGravityKill,
  enemies = [],
}) {
  const ref = useRef();
  const startTime = useRef(Date.now());
  const [phase, setPhase] = useState('pull');
  const rotation = useRef(0);
  const affectedEnemies = useRef(new Set([anchorEnemy?.id]));
  
  useFrame((_, delta) => {
    if (!ref.current || !anchorEnemy?.position) return;
    
    const now = Date.now();
    const elapsed = now - startTime.current;
    
    ref.current.position.copy(anchorEnemy.position);
    
    rotation.current += delta * COMBAT_CONFIG.EFFECTS.GRAVITY_WELL_ROTATION;
    ref.current.rotation.z = rotation.current;
    
    if (phase === 'pull') {
      enemies.forEach(enemy => {
        if (!enemy || !enemy.position || enemy.health <= 0) return;
        if (enemy.id === anchorEnemy.id) return;
        
        const dist = anchorEnemy.position.distanceTo(enemy.position);
        if (dist < config.gravityRadius && dist > 0.5) {
          affectedEnemies.current.add(enemy.id);
          const pullDir = anchorEnemy.position.clone().sub(enemy.position).normalize();
          const pullStrength = (1 - dist / config.gravityRadius) * config.gravityStrength * delta;
          
          onGravityKill?.(enemy.id, pullDir, pullStrength, false, 0);
        }
      });
      
      if (elapsed > config.collapseDelay) {
        setPhase('collapse');
      }
    } else if (phase === 'collapse') {
      affectedEnemies.current.forEach(enemyId => {
        onGravityKill?.(enemyId, null, 0, true, config.damage * 10);
      });
      
      onExpire(id);
    }
  });
  
  if (!anchorEnemy?.position) return null;
  
  const scale = phase === 'collapse' ? 2 : 1;
  const color = phase === 'collapse' ? '#ffffff' : config.color;
  
  return (
    <group ref={ref} position={anchorEnemy.position} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {[1, 2, 3].map(i => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.3, rotation.current * (i % 2 ? 1 : -1), 0]}>
          <torusGeometry args={[i * 2.5, 0.15, 8, 32]} />
          <meshBasicMaterial color={config.color} transparent opacity={0.6 / i} />
        </mesh>
      ))}
      <pointLight color={config.color} intensity={5} distance={config.gravityRadius} />
    </group>
  );
}

// ============================================================================
// MISSILE COMPONENT
// ============================================================================
function Missile({ 
  id, 
  position, 
  target, 
  config, 
  onExpire, 
  onHit,
}) {
  const ref = useRef();
  const startTime = useRef(Date.now());
  const velocity = useRef(new Vector3(0, 0, -1).multiplyScalar(config.missileSpeed * 0.5));
  const currentPos = useRef(position.clone());
  
  useFrame((_, delta) => {
    if (!ref.current) return;
    
    const now = Date.now();
    const elapsed = now - startTime.current;
    
    if (target && target.position) {
      const targetPos = target.position.clone();
      
      if (target.velocity) {
        const timeToTarget = currentPos.current.distanceTo(targetPos) / config.missileSpeed;
        targetPos.add(target.velocity.clone().multiplyScalar(timeToTarget * COMBAT_CONFIG.TARGETING.TARGET_LEAD_FACTOR));
      }
      
      const toTarget = targetPos.sub(currentPos.current).normalize();
      const currentDir = velocity.current.clone().normalize();
      
      const newDir = currentDir.lerp(toTarget, config.turnRate * delta);
      velocity.current = newDir.multiplyScalar(config.missileSpeed);
    }
    
    const movement = velocity.current.clone().multiplyScalar(delta);
    ref.current.position.add(movement);
    currentPos.current.copy(ref.current.position);
    
    if (velocity.current.length() > 0) {
      ref.current.lookAt(currentPos.current.clone().add(velocity.current));
    }
    
    if (target && target.position) {
      const dist = currentPos.current.distanceTo(target.position);
      const hitRadius = target.hitRadius || 2;
      
      if (config.bossOnly && !target.isBoss) {
        // Intentionally miss
      } else if (dist < hitRadius) {
        onHit?.(id, target.id, config.damage, { 
          isMissile: true,
          penetrating: config.penetrating 
        });
        onExpire(id);
        return;
      }
    }
    
    if (elapsed > config.lifetime) {
      onExpire(id);
    }
  });
  
  return (
    <group ref={ref} position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.8, 6]} />
        <meshBasicMaterial color={config.color} />
      </mesh>
      <mesh position={[0, 0, 0.5]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color={config.trailColor || config.color} />
      </mesh>
      <pointLight color={config.trailColor || config.color} intensity={2} distance={3} />
    </group>
  );
}

// ============================================================================
// THOR TARGETING LASER COMPONENT (thin red beam while active)
// ============================================================================
function ThorTargetingLaser({ origin, targets, config, isActive }) {
  const laserRefs = useRef([]);
  const pulsePhase = useRef(0);
  
  useFrame((_, delta) => {
    if (!isActive) return;
    pulsePhase.current += delta * COMBAT_CONFIG.EFFECTS.THOR_PAINTER_PULSE;
    
    laserRefs.current.forEach(ref => {
      if (ref) {
        const pulse = 0.6 + Math.sin(pulsePhase.current) * 0.4;
        ref.material.opacity = pulse;
      }
    });
  });
  
  if (!isActive || targets.length === 0) return null;
  
  return (
    <group>
      {targets.map((target, i) => {
        if (!target?.position) return null;
        
        const direction = target.position.clone().sub(origin);
        const length = direction.length();
        const midpoint = origin.clone().add(direction.normalize().multiplyScalar(length / 2));
        
        return (
          <group key={i}>
            <mesh 
              ref={el => laserRefs.current[i] = el}
              position={midpoint}
            >
              <cylinderGeometry args={[config.painterWidth, config.painterWidth, length, 6]} />
              <meshBasicMaterial color={config.painterColor} transparent opacity={0.8} />
            </mesh>
            <mesh position={target.position}>
              <ringGeometry args={[1.5, 2, 4]} />
              <meshBasicMaterial color={config.painterColor} transparent opacity={0.6} side={2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ============================================================================
// THOR ROD STRIKE COMPONENT (Instant Impact)
// ============================================================================
function ThorRodStrike({ 
  id, 
  target,
  config, 
  onExpire, 
  onHit,
}) {
  const [phase, setPhase] = useState('impact');
  const startTime = useRef(Date.now());
  const impactPos = useRef(target?.position?.clone() || new Vector3());
  const hasHit = useRef(false);
  
  useFrame((_, delta) => {
    const now = Date.now();
    const elapsed = now - startTime.current;
    
    if (phase === 'impact' && !hasHit.current) {
      hasHit.current = true;
      
      if (target && target.position) {
        onHit?.(id, target.id, config.damage, { 
          isThorStrike: true, 
          pushDown: true,
          downForce: config.rodDownForce,
        });
      }
      setPhase('pushing');
    } else if (phase === 'pushing') {
      if (elapsed > 800) {
        setPhase('explode');
      }
    } else if (phase === 'explode') {
      onExpire(id);
    }
  });
  
  if (!target?.position) return null;
  
  return (
    <group>
      <mesh position={[impactPos.current.x, impactPos.current.y + 50, impactPos.current.z]}>
        <cylinderGeometry args={[0.3, 0.1, 100, 8]} />
        <meshBasicMaterial color={config.rodColor} transparent opacity={phase === 'pushing' ? 0.9 : 0.3} />
      </mesh>
      
      <pointLight 
        position={impactPos.current} 
        color={config.rodColor} 
        intensity={phase === 'pushing' ? 50 : 10} 
        distance={config.rodDamageRadius * 3} 
      />
      
      <mesh 
        position={[impactPos.current.x, -4.9, impactPos.current.z]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0, config.rodDamageRadius, 32]} />
        <meshBasicMaterial color={config.color} transparent opacity={phase === 'pushing' ? 0.7 : 0.2} side={2} />
      </mesh>
    </group>
  );
}

// ============================================================================
// SMARTBOMB EFFECT COMPONENT
// ============================================================================
function SmartbombEffect({ onComplete, enemies = [], onHit, config }) {
  const [scale, setScale] = useState(0);
  const startTime = useRef(Date.now());
  const hasDetonated = useRef(false);
  
  useFrame(() => {
    const elapsed = Date.now() - startTime.current;
    const progress = Math.min(elapsed / config.effectDuration, 1);
    
    setScale(progress * 200);
    
    if (!hasDetonated.current && progress > 0.5) {
      hasDetonated.current = true;
      enemies.forEach(enemy => {
        if (!enemy || enemy.health <= 0) return;
        if (config.bossImmune && enemy.isBoss) return;
        
        onHit?.(null, enemy.id, config.damage, { isSmartbomb: true });
      });
    }
    
    if (progress >= 1) {
      onComplete?.();
    }
  });
  
  return (
    <mesh scale={scale}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={1 - scale / 200} />
    </mesh>
  );
}

// ============================================================================
// ACTIVE ARMOR EXPLOSION COMPONENT
// ============================================================================
function ActiveArmorExplosion({ position, onComplete }) {
  const [scale, setScale] = useState(0.1);
  const startTime = useRef(Date.now());
  
  useFrame(() => {
    const elapsed = Date.now() - startTime.current;
    const progress = elapsed / 300;
    
    setScale(progress * COMBAT_CONFIG.PASSIVES.ACTIVE_ARMOR.explosionRadius);
    
    if (progress >= 1) {
      onComplete?.();
    }
  });
  
  return (
    <group position={position}>
      <mesh scale={scale}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color={COMBAT_CONFIG.PASSIVES.ACTIVE_ARMOR.explosionColor} 
          transparent 
          opacity={1 - scale / COMBAT_CONFIG.PASSIVES.ACTIVE_ARMOR.explosionRadius} 
        />
      </mesh>
      <pointLight 
        color={COMBAT_CONFIG.PASSIVES.ACTIVE_ARMOR.explosionColor} 
        intensity={10 * (1 - scale / COMBAT_CONFIG.PASSIVES.ACTIVE_ARMOR.explosionRadius)} 
        distance={10} 
      />
    </group>
  );
}

// ============================================================================
// LOCK-ON INDICATOR COMPONENT
// ============================================================================
function LockOnIndicator({ target, isLocked, isPrimary, isMultiLockActive }) {
  const ref = useRef();
  
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.z += delta * 3;
    }
  });
  
  if (!target || !target.position) return null;
  
  const color = isMultiLockActive ? '#ffaa00' : isPrimary ? '#ff0000' : isLocked ? '#ff8800' : '#ffff00';
  const size = isPrimary ? 3 : 2;
  
  return (
    <group position={target.position} ref={ref}>
      <mesh>
        <ringGeometry args={[size * 0.8, size, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={2} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <ringGeometry args={[size * 0.5, size * 0.65, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={2} />
      </mesh>
      {isMultiLockActive && (
        <mesh rotation={[0, 0, Math.PI / 8]}>
          <ringGeometry args={[size * 1.1, size * 1.2, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={2} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// COMBAT HUD COMPONENT
// ============================================================================
function CombatHUD({ 
  currentGun,
  currentMissile,
  missileAmmo,
  missileReloadProgress,
  autoLockEnabled,
  activeWeaponType,
  powerupTimers,
  lockedTargets,
  activePassives,
  weaponSwitchLocked,
}) {
  const hudStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    fontFamily: '"Courier New", monospace',
    color: '#00ff88',
    textShadow: '0 0 10px #00ff88',
  };
  
  const weaponBoxStyle = (isActive, isLocked) => ({
    padding: '8px 12px',
    background: isActive ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 0, 0, 0.5)',
    border: `2px solid ${isLocked ? '#666' : isActive ? '#00ff88' : '#446644'}`,
    borderRadius: '4px',
    marginBottom: '8px',
    opacity: isLocked && !isActive ? 0.5 : 1,
  });
  
  return (
    <div style={hudStyle}>
      <div style={{ position: 'absolute', left: 60, top: 20 }}>
        <div style={{ fontSize: 12, marginBottom: 10, opacity: 0.7 }}>
          WEAPONS [{activeWeaponType === 'gun' ? 'GUN' : 'MISSILE'}]
          {weaponSwitchLocked && <span style={{ color: '#ff4444', marginLeft: 8 }}>🔒 LOCKED</span>}
        </div>
        
        <div style={weaponBoxStyle(activeWeaponType === 'gun', weaponSwitchLocked)}>
          <div style={{ fontSize: 14, color: currentGun?.color || '#00ff88' }}>
            ◆ {currentGun?.name || 'RAPID'}
          </div>
          {currentGun?.unlimited ? (
            <div style={{ fontSize: 10, opacity: 0.7 }}>∞ UNLIMITED</div>
          ) : powerupTimers.gun > 0 ? (
            <div style={{ fontSize: 10 }}>
              {(powerupTimers.gun / 1000).toFixed(1)}s
              <div style={{ width: '100%', height: 3, background: '#333', marginTop: 2 }}>
                <div style={{ 
                  width: `${(powerupTimers.gun / (currentGun?.duration || 10000)) * 100}%`, 
                  height: '100%', 
                  background: currentGun?.color || '#00ff88' 
                }} />
              </div>
            </div>
          ) : null}
        </div>
        
        <div style={weaponBoxStyle(activeWeaponType === 'missile', weaponSwitchLocked)}>
          <div style={{ fontSize: 14, color: currentMissile?.color || '#ff4400' }}>
            ◆ {currentMissile?.name || 'HELLFIRE'}
          </div>
          {currentMissile?.unlimited ? (
            powerupTimers.missile > 0 ? (
              <div style={{ fontSize: 10 }}>{(powerupTimers.missile / 1000).toFixed(1)}s</div>
            ) : (
              <div style={{ fontSize: 10, opacity: 0.7 }}>∞ UNLIMITED</div>
            )
          ) : (
            <div style={{ fontSize: 10 }}>
              AMMO: {missileAmmo} / {currentMissile?.maxAmmo || 32}
              {missileReloadProgress > 0 && missileReloadProgress < 1 && (
                <div style={{ width: '100%', height: 3, background: '#333', marginTop: 2 }}>
                  <div style={{ 
                    width: `${missileReloadProgress * 100}%`, 
                    height: '100%', 
                    background: '#ff4400' 
                  }} />
                </div>
              )}
            </div>
          )}
        </div>
        
        <div style={{ 
          fontSize: 11, 
          marginTop: 15, 
          padding: '5px 8px',
          background: autoLockEnabled ? 'rgba(255, 0, 0, 0.2)' : 'rgba(100, 100, 100, 0.2)',
          border: `1px solid ${autoLockEnabled ? '#ff4444' : '#666'}`,
          borderRadius: '3px',
        }}>
          {autoLockEnabled ? '◉ AUTO-LOCK' : '○ MANUAL AIM'}
          <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>TAB / SELECT</div>
        </div>
        
        {lockedTargets.length > 0 && (
          <div style={{ fontSize: 11, marginTop: 10 }}>LOCKS: {lockedTargets.length}</div>
        )}
      </div>
      
      {Object.keys(activePassives).length > 0 && (
        <div style={{ position: 'absolute', right: 20, top: 140 }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 8 }}>ACTIVE BUFFS</div>
          {Object.entries(activePassives).map(([name, timer]) => {
            const config = COMBAT_CONFIG.PASSIVES[name];
            if (!config || timer <= 0) return null;
            
            return (
              <div key={name} style={{
                padding: '6px 10px',
                background: `rgba(${name === 'MULTILOCK' ? '255, 170, 0' : name === 'OVERDRIVE' ? '0, 255, 255' : '68, 136, 255'}, 0.2)`,
                border: `1px solid ${config.color}`,
                borderRadius: '4px',
                marginBottom: '6px',
                fontSize: 11,
              }}>
                <div style={{ color: config.color, fontWeight: 'bold' }}>{config.name}</div>
                <div style={{ fontSize: 10 }}>{(timer / 1000).toFixed(1)}s</div>
                <div style={{ width: '100%', height: 2, background: '#333', marginTop: 3 }}>
                  <div style={{ 
                    width: `${(timer / config.duration) * 100}%`, 
                    height: '100%', 
                    background: config.color 
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {autoLockEnabled && (
        <div style={{ 
          position: 'absolute', 
          bottom: 80, 
          left: '50%', 
          transform: 'translateX(-50%)',
          textAlign: 'center',
          fontSize: 11,
          opacity: 0.7,
        }}>
          <span style={{ marginRight: 20 }}>◀ Q / L1</span>
          <span>TARGET</span>
          <span style={{ marginLeft: 20 }}>E / R1 ▶</span>
        </div>
      )}
      
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        fontSize: 10,
        opacity: weaponSwitchLocked ? 0.3 : 0.6,
        textDecoration: weaponSwitchLocked ? 'line-through' : 'none',
      }}>
        [F / Y] SWITCH WEAPON TYPE
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMBAT SYSTEM COMPONENT
// ============================================================================
export function CombatSystem({
  playerPosition,
  playerAimTarget,
  enemies = [],
  onEnemyDamage,
  onEnemyKill,
  onEnemyPull,
  onWeaponFire,
  onPlayerDamage,
  fireInput = false,
  switchWeaponInput = false,
  toggleLockInput = false,
  cycleTargetNextInput = false,
  cycleTargetPrevInput = false,
  unlockedWeapons = ['GRAVITY'],
  getMovementMultiplier,
  getBarrelRollMultiplier,
  getEvadeCooldownMultiplier,
  getBoostMultiplier,
  getBoostCooldownMultiplier,
  getDamageReduction,
}) {
  const [activeWeaponType, setActiveWeaponType] = useState('gun');
  const [currentGun, setCurrentGun] = useState(COMBAT_CONFIG.GUNS.RAPID);
  const [currentMissile, setCurrentMissile] = useState(COMBAT_CONFIG.MISSILES.HELLFIRE);
  const [missileAmmo, setMissileAmmo] = useState(COMBAT_CONFIG.MISSILES.HELLFIRE.maxAmmo);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(1);
  
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  
  const [gunPowerupTimer, setGunPowerupTimer] = useState(0);
  const [missilePowerupTimer, setMissilePowerupTimer] = useState(0);
  
  const [activePassives, setActivePassives] = useState({});
  const weaponSwitchLocked = activePassives.MULTILOCK > 0;
  
  const [projectiles, setProjectiles] = useState([]);
  const [multiLockProjectiles, setMultiLockProjectiles] = useState([]);
  const [missiles, setMissiles] = useState([]);
  const [gravityWells, setGravityWells] = useState([]);
  const [thorStrikes, setThorStrikes] = useState([]);
  const [smartbombActive, setSmartbombActive] = useState(false);
  const [beamActive, setBeamActive] = useState(false);
  const [thorActive, setThorActive] = useState(false);
  const [armorExplosions, setArmorExplosions] = useState([]);
  
  const lastFireTime = useRef(0);
  const lastSwitchTime = useRef(0);
  const lastToggleLockTime = useRef(0);
  const reloadStartTime = useRef(0);
  
  const targeting = useTargetingSystem(enemies, playerPosition, autoLockEnabled);
  
  useEffect(() => {
    if (switchWeaponInput && !weaponSwitchLocked) {
      const now = Date.now();
      if (now - lastSwitchTime.current > 300) {
        lastSwitchTime.current = now;
        setActiveWeaponType(prev => prev === 'gun' ? 'missile' : 'gun');
      }
    }
  }, [switchWeaponInput, weaponSwitchLocked]);
  
  useEffect(() => {
    if (toggleLockInput) {
      const now = Date.now();
      if (now - lastToggleLockTime.current > 300) {
        lastToggleLockTime.current = now;
        setAutoLockEnabled(prev => !prev);
      }
    }
  }, [toggleLockInput]);
  
  useEffect(() => {
    if (cycleTargetNextInput) targeting.cycleTargetNext();
  }, [cycleTargetNextInput, targeting]);
  
  useEffect(() => {
    if (cycleTargetPrevInput) targeting.cycleTargetPrev();
  }, [cycleTargetPrevInput, targeting]);
  
  useEffect(() => {
    if (activePassives.MULTILOCK > 0) {
      setActiveWeaponType('gun');
    }
  }, [activePassives.MULTILOCK]);
  
  const getAimDirection = useCallback(() => {
    if (!playerPosition) return new Vector3(0, 0, -1);
    
    if (autoLockEnabled && targeting.currentTarget?.position) {
      return targeting.currentTarget.position.clone().sub(playerPosition).normalize();
    }
    
    if (playerAimTarget) {
      return playerAimTarget.clone().sub(playerPosition).normalize();
    }
    
    return new Vector3(0, 0, -1);
  }, [playerPosition, playerAimTarget, autoLockEnabled, targeting.currentTarget]);
  
  const fireGun = useCallback(() => {
    if (!playerPosition) return;
    
    const config = currentGun;
    const now = Date.now();
    
    if (now - lastFireTime.current < config.fireRate) return;
    lastFireTime.current = now;
    
    if (config.isConstant) {
      setBeamActive(true);
      return;
    }
    
    if (activePassives.MULTILOCK > 0) {
      const allTargets = targeting.lockAllTargets();
      allTargets.forEach((target, i) => {
        setTimeout(() => {
          const newProj = {
            id: now + Math.random() + i,
            position: playerPosition.clone(),
            target,
            config,
          };
          setMultiLockProjectiles(prev => [...prev, newProj]);
        }, i * 30);
      });
      onWeaponFire?.('gun', config.name + ' (MULTI-LOCK)');
      return;
    }
    
    const aimDir = getAimDirection();
    
    for (let i = 0; i < config.projectilesPerShot; i++) {
      const dir = aimDir.clone();
      
      if (config.spread > 0) {
        dir.x += (Math.random() - 0.5) * config.spread;
        dir.y += (Math.random() - 0.5) * config.spread;
        dir.normalize();
      }
      
      const newProjectile = {
        id: now + Math.random() + i,
        position: playerPosition.clone(),
        direction: dir,
        config,
      };
      
      setProjectiles(prev => [...prev, newProjectile]);
    }
    
    onWeaponFire?.('gun', config.name);
  }, [playerPosition, currentGun, getAimDirection, onWeaponFire, activePassives.MULTILOCK, targeting]);
  
  const fireMissile = useCallback(() => {
    if (!playerPosition) return;
    
    const config = currentMissile;
    const now = Date.now();
    
    if (!config.unlimited && missileAmmo <= 0) return;
    
    if (config.fireRate && now - lastFireTime.current < config.fireRate) return;
    lastFireTime.current = now;
    
    if (config.isScreenClear) {
      if (missileAmmo > 0) {
        setSmartbombActive(true);
        setMissileAmmo(prev => prev - 1);
        onWeaponFire?.('missile', config.name);
      }
      return;
    }
    
    if (config.rodImpactInstant) {
      setThorActive(true);
      
      const targets = autoLockEnabled 
        ? targeting.lockMultipleTargets(config.maxPaintedTargets)
        : [{ position: playerAimTarget, id: 'manual' }];
      
      targets.forEach((target, i) => {
        if (!target?.position) return;
        
        const newStrike = {
          id: now + Math.random() + i,
          target,
          config,
        };
        
        setThorStrikes(prev => [...prev, newStrike]);
      });
      
      onWeaponFire?.('missile', config.name);
      return;
    }
    
    if (config.multiLock) {
      const targets = targeting.lockMultipleTargets(config.maxTargets);
      
      targets.forEach((target, i) => {
        setTimeout(() => {
          const newMissile = {
            id: now + Math.random() + i,
            position: playerPosition.clone().add(new Vector3(
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2,
              0
            )),
            target,
            config,
          };
          
          setMissiles(prev => [...prev, newMissile]);
        }, i * 50);
      });
      
      if (!config.unlimited) {
        setMissileAmmo(prev => Math.max(0, prev - targets.length));
      }
    } else {
      const target = targeting.currentTarget || { position: playerAimTarget };
      
      const newMissile = {
        id: now + Math.random(),
        position: playerPosition.clone(),
        target,
        config,
      };
      
      setMissiles(prev => [...prev, newMissile]);
      
      if (!config.unlimited) {
        setMissileAmmo(prev => prev - 1);
      }
    }
    
    onWeaponFire?.('missile', config.name);
  }, [playerPosition, playerAimTarget, currentMissile, missileAmmo, autoLockEnabled, targeting, onWeaponFire]);
  
  const handleGravityAttach = useCallback((enemy, config) => {
    const newWell = {
      id: Date.now() + Math.random(),
      anchorEnemy: enemy,
      config,
    };
    setGravityWells(prev => [...prev, newWell]);
  }, []);
  
  useFrame((_, delta) => {
    if (gunPowerupTimer > 0) {
      setGunPowerupTimer(prev => {
        const next = prev - delta * 1000;
        if (next <= 0) {
          setCurrentGun(COMBAT_CONFIG.GUNS.RAPID);
          return 0;
        }
        return next;
      });
    }
    
    if (missilePowerupTimer > 0) {
      setMissilePowerupTimer(prev => {
        const next = prev - delta * 1000;
        if (next <= 0) {
          setCurrentMissile(COMBAT_CONFIG.MISSILES.HELLFIRE);
          setMissileAmmo(COMBAT_CONFIG.MISSILES.HELLFIRE.maxAmmo);
          setThorActive(false);
          return 0;
        }
        return next;
      });
    }
    
    setActivePassives(prev => {
      const updated = { ...prev };
      let changed = false;
      
      Object.keys(updated).forEach(key => {
        if (updated[key] > 0) {
          updated[key] -= delta * 1000;
          changed = true;
          if (updated[key] <= 0) {
            delete updated[key];
          }
        }
      });
      
      return changed ? updated : prev;
    });
    
    if (isReloading) {
      const elapsed = Date.now() - reloadStartTime.current;
      const progress = elapsed / currentMissile.reloadTime;
      setReloadProgress(progress);
      
      if (progress >= 1) {
        setIsReloading(false);
        setMissileAmmo(currentMissile.maxAmmo);
        setReloadProgress(1);
      }
    } else if (missileAmmo <= 0 && currentMissile.reloadTime && !currentMissile.unlimited) {
      setIsReloading(true);
      reloadStartTime.current = Date.now();
    }
    
    if (fireInput) {
      if (activeWeaponType === 'gun') {
        fireGun();
      } else {
        fireMissile();
      }
    } else {
      if (currentGun.isConstant) {
        setBeamActive(false);
      }
    }
  });
  
  const handleProjectileHit = useCallback((projectileId, enemyId, damage, options = {}) => {
    onEnemyDamage?.(enemyId, damage, options);
  }, [onEnemyDamage]);
  
  const handleGravityEffect = useCallback((enemyId, pullDir, strength, isKill = false, damage = 0) => {
    if (isKill) {
      onEnemyKill?.(enemyId, { isGravityCollapse: true });
    } else if (pullDir) {
      onEnemyPull?.(enemyId, pullDir, strength);
    }
  }, [onEnemyKill, onEnemyPull]);
  
  const handlePlayerDamage = useCallback((damage, position) => {
    let finalDamage = damage;
    
    if (activePassives.ACTIVE_ARMOR > 0) {
      finalDamage = damage * (1 - COMBAT_CONFIG.PASSIVES.ACTIVE_ARMOR.damageReduction);
      
      const newExplosion = {
        id: Date.now() + Math.random(),
        position: position.clone(),
      };
      setArmorExplosions(prev => [...prev, newExplosion]);
    }
    
    onPlayerDamage?.(finalDamage);
    return finalDamage;
  }, [activePassives.ACTIVE_ARMOR, onPlayerDamage]);
  
  const removeProjectile = useCallback((id) => {
    setProjectiles(prev => prev.filter(p => p.id !== id));
  }, []);
  
  const removeMultiLockProjectile = useCallback((id) => {
    setMultiLockProjectiles(prev => prev.filter(p => p.id !== id));
  }, []);
  
  const removeMissile = useCallback((id) => {
    setMissiles(prev => prev.filter(m => m.id !== id));
  }, []);
  
  const removeGravityWell = useCallback((id) => {
    setGravityWells(prev => prev.filter(g => g.id !== id));
  }, []);
  
  const removeThorStrike = useCallback((id) => {
    setThorStrikes(prev => prev.filter(t => t.id !== id));
  }, []);
  
  const removeArmorExplosion = useCallback((id) => {
    setArmorExplosions(prev => prev.filter(e => e.id !== id));
  }, []);
  
  const pickupGunPowerup = useCallback((weaponName) => {
    const weapon = COMBAT_CONFIG.GUNS[weaponName];
    if (!weapon) return;
    
    if (weapon.unlockable && !unlockedWeapons.includes(weaponName)) return;
    
    setCurrentGun(weapon);
    setGunPowerupTimer(weapon.duration || 10000);
  }, [unlockedWeapons]);
  
  const pickupMissilePowerup = useCallback((weaponName) => {
    const weapon = COMBAT_CONFIG.MISSILES[weaponName];
    if (!weapon) return;
    
    setCurrentMissile(weapon);
    setMissileAmmo(weapon.maxAmmo || 999);
    if (weapon.duration) {
      setMissilePowerupTimer(weapon.duration);
    }
    
    if (weapon.rodImpactInstant) {
      setThorActive(true);
    }
  }, []);
  
  const pickupPassive = useCallback((passiveName) => {
    const config = COMBAT_CONFIG.PASSIVES[passiveName];
    if (!config) return;
    
    setActivePassives(prev => ({
      ...prev,
      [passiveName]: config.duration,
    }));
    
    if (config.forcesGunMode) {
      setActiveWeaponType('gun');
    }
  }, []);
  
  useEffect(() => {
    if (getMovementMultiplier) {
      getMovementMultiplier(activePassives.OVERDRIVE > 0 ? COMBAT_CONFIG.PASSIVES.OVERDRIVE.movementMultiplier : 1);
    }
    if (getBarrelRollMultiplier) {
      getBarrelRollMultiplier(activePassives.OVERDRIVE > 0 ? COMBAT_CONFIG.PASSIVES.OVERDRIVE.barrelRollMultiplier : 1);
    }
    if (getEvadeCooldownMultiplier) {
      getEvadeCooldownMultiplier(activePassives.OVERDRIVE > 0 ? COMBAT_CONFIG.PASSIVES.OVERDRIVE.evadeCooldownReduction : 1);
    }
    if (getBoostMultiplier) {
      getBoostMultiplier(activePassives.OVERDRIVE > 0 ? COMBAT_CONFIG.PASSIVES.OVERDRIVE.boostMultiplier : 1);
    }
    if (getBoostCooldownMultiplier) {
      getBoostCooldownMultiplier(activePassives.OVERDRIVE > 0 ? COMBAT_CONFIG.PASSIVES.OVERDRIVE.boostCooldownReduction : 1);
    }
    if (getDamageReduction) {
      getDamageReduction(activePassives.ACTIVE_ARMOR > 0 ? COMBAT_CONFIG.PASSIVES.ACTIVE_ARMOR.damageReduction : 0);
    }
  }, [activePassives, getMovementMultiplier, getBarrelRollMultiplier, getEvadeCooldownMultiplier, getBoostMultiplier, getBoostCooldownMultiplier, getDamageReduction]);
  
  const contextValue = useMemo(() => ({
    activeWeaponType,
    currentGun,
    currentMissile,
    missileAmmo,
    autoLockEnabled,
    targeting,
    activePassives,
    weaponSwitchLocked,
    setActiveWeaponType,
    pickupGunPowerup,
    pickupMissilePowerup,
    pickupPassive,
    handlePlayerDamage,
    COMBAT_CONFIG,
  }), [
    activeWeaponType, 
    currentGun, 
    currentMissile, 
    missileAmmo, 
    autoLockEnabled,
    targeting,
    activePassives,
    weaponSwitchLocked,
    pickupGunPowerup,
    pickupMissilePowerup,
    pickupPassive,
    handlePlayerDamage,
  ]);
  
  return (
    <CombatContext.Provider value={contextValue}>
      {projectiles.map(proj => (
        <GunProjectile
          key={proj.id}
          id={proj.id}
          position={proj.position}
          direction={proj.direction}
          config={proj.config}
          onExpire={removeProjectile}
          onHit={handleProjectileHit}
          enemies={enemies}
          onGravityAttach={handleGravityAttach}
        />
      ))}
      
      {multiLockProjectiles.map(proj => (
        <MultiLockProjectile
          key={proj.id}
          id={proj.id}
          position={proj.position}
          target={proj.target}
          config={proj.config}
          onExpire={removeMultiLockProjectile}
          onHit={handleProjectileHit}
        />
      ))}
      
      {beamActive && playerPosition && (
        <BeamWeapon
          origin={playerPosition}
          target={autoLockEnabled && targeting.currentTarget?.position 
            ? targeting.currentTarget.position 
            : playerAimTarget || playerPosition.clone().add(new Vector3(0, 0, -100))}
          config={currentGun}
          isActive={beamActive}
          enemies={enemies}
          onHit={handleProjectileHit}
        />
      )}
      
      {gravityWells.map(well => (
        <GravityWell
          key={well.id}
          id={well.id}
          anchorEnemy={well.anchorEnemy}
          config={well.config}
          onExpire={removeGravityWell}
          onGravityKill={handleGravityEffect}
          enemies={enemies}
        />
      ))}
      
      {missiles.map(missile => (
        <Missile
          key={missile.id}
          id={missile.id}
          position={missile.position}
          target={missile.target}
          config={missile.config}
          onExpire={removeMissile}
          onHit={handleProjectileHit}
        />
      ))}
      
      {thorActive && currentMissile.rodImpactInstant && playerPosition && (
        <ThorTargetingLaser
          origin={playerPosition}
          targets={autoLockEnabled ? targeting.lockedTargets : [{ position: playerAimTarget }]}
          config={currentMissile}
          isActive={thorActive && fireInput}
        />
      )}
      
      {thorStrikes.map(strike => (
        <ThorRodStrike
          key={strike.id}
          id={strike.id}
          target={strike.target}
          config={strike.config}
          onExpire={removeThorStrike}
          onHit={handleProjectileHit}
        />
      ))}
      
      {smartbombActive && (
        <SmartbombEffect
          onComplete={() => setSmartbombActive(false)}
          enemies={enemies}
          onHit={handleProjectileHit}
          config={COMBAT_CONFIG.MISSILES.SMARTBOMB}
        />
      )}
      
      {armorExplosions.map(exp => (
        <ActiveArmorExplosion
          key={exp.id}
          position={exp.position}
          onComplete={() => removeArmorExplosion(exp.id)}
        />
      ))}
      
      {autoLockEnabled && targeting.currentTarget && (
        <LockOnIndicator 
          target={targeting.currentTarget} 
          isLocked={true} 
          isPrimary={true}
          isMultiLockActive={activePassives.MULTILOCK > 0}
        />
      )}
      {(activeWeaponType === 'missile' || activePassives.MULTILOCK > 0) && 
        targeting.lockedTargets.map((target, i) => (
          <LockOnIndicator 
            key={target.id} 
            target={target} 
            isLocked={true} 
            isPrimary={i === 0}
            isMultiLockActive={activePassives.MULTILOCK > 0}
          />
        ))
      }
      
      <Html fullscreen>
        <CombatHUD
          currentGun={currentGun}
          currentMissile={currentMissile}
          missileAmmo={missileAmmo}
          missileReloadProgress={reloadProgress}
          autoLockEnabled={autoLockEnabled}
          activeWeaponType={activeWeaponType}
          powerupTimers={{ gun: gunPowerupTimer, missile: missilePowerupTimer }}
          lockedTargets={targeting.lockedTargets}
          activePassives={activePassives}
          weaponSwitchLocked={weaponSwitchLocked}
        />
      </Html>
    </CombatContext.Provider>
  );
}

// ============================================================================
// EXTENDED INPUT MANAGER HOOK
// ============================================================================
export function useCombatInputManager() {
  const [combatKeys, setCombatKeys] = useState({
    fire: false, switchWeapon: false, toggleLock: false, cycleTargetNext: false, cycleTargetPrev: false,
  });
  
  const [gamepadCombat, setGamepadCombat] = useState({
    fire: false, switchWeapon: false, toggleLock: false, cycleTargetNext: false, cycleTargetPrev: false,
  });
  
  useEffect(() => {
    const keyMap = {
      'Space': 'fire', 'KeyF': 'switchWeapon', 'Tab': 'toggleLock', 'KeyQ': 'cycleTargetPrev', 'KeyE': 'cycleTargetNext',
    };
    
    const handleKeyDown = (e) => {
      const action = keyMap[e.code];
      if (action) { e.preventDefault(); setCombatKeys(k => ({ ...k, [action]: true })); }
    };
    
    const handleKeyUp = (e) => {
      const action = keyMap[e.code];
      if (action) { setCombatKeys(k => ({ ...k, [action]: false })); }
    };
    
    const handleMouseDown = (e) => { if (e.button === 0) setCombatKeys(k => ({ ...k, fire: true })); };
    const handleMouseUp = (e) => { if (e.button === 0) setCombatKeys(k => ({ ...k, fire: false })); };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0];
      if (gp) {
        setGamepadCombat({
          fire: gp.buttons[6]?.pressed || gp.buttons[7]?.pressed || false,
          switchWeapon: gp.buttons[3]?.pressed || false,
          toggleLock: gp.buttons[8]?.pressed || false,
          cycleTargetPrev: gp.buttons[4]?.pressed || false,
          cycleTargetNext: gp.buttons[5]?.pressed || false,
        });
      }
    };
    
    const gamepadInterval = setInterval(pollGamepad, 16);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      clearInterval(gamepadInterval);
    };
  }, []);
  
  return useMemo(() => ({
    fire: combatKeys.fire || gamepadCombat.fire,
    switchWeapon: combatKeys.switchWeapon || gamepadCombat.switchWeapon,
    toggleLock: combatKeys.toggleLock || gamepadCombat.toggleLock,
    cycleTargetNext: combatKeys.cycleTargetNext || gamepadCombat.cycleTargetNext,
    cycleTargetPrev: combatKeys.cycleTargetPrev || gamepadCombat.cycleTargetPrev,
  }), [combatKeys, gamepadCombat]);
}

// ============================================================================
// EXPORTS
// ============================================================================
export default CombatSystem;

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
};
