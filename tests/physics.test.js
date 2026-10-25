import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { PhysicsEngine } from '../src/engine/Physics.js';

test('蓄力速度應調慢三倍 (0.006)，且受擊動畫與轉場時間延長半秒', () => {
  assert.equal(CONFIG.PHYSICS.chargeSpeed, 0.006);
  assert.ok(CONFIG.HURT_FRAMES >= 66);
  assert.ok(CONFIG.TURN_TRANSITION_MS >= 1250);
});

test('PhysicsEngine.generateTurnMaxPowerSpec 在無風 100% 蓄力下，落點應為對手後方 3~6 個角色寬', () => {
  for (let i = 0; i < 30; i++) {
    const spec = PhysicsEngine.generateTurnMaxPowerSpec('cat');
    assert.ok(
      spec.overshootWidths >= 3.0 && spec.overshootWidths <= 6.0,
      `Overshoot widths ${spec.overshootWidths} should be within [3, 6]`
    );

    const startX = CONFIG.CAT.x + CONFIG.CAT.launchOffsetX;
    const expectedMinRange = (CONFIG.DOG.x - startX) + 3.0 * CONFIG.DOG.width;
    const expectedMaxRange = (CONFIG.DOG.x - startX) + 6.0 * CONFIG.DOG.width;
    assert.ok(spec.maxRange >= expectedMinRange - 1 && spec.maxRange <= expectedMaxRange + 1);
  }
});

test('PhysicsEngine.computeIdealPower 搭配動態 turnMaxSpeed 在各風向下皆能命中對手', () => {
  for (const side of ['cat', 'dog']) {
    for (const wind of [-4.5, -2.0, 0, 2.0, 4.5]) {
      const spec = PhysicsEngine.generateTurnMaxPowerSpec(side, 4.5);
      const idealPower = PhysicsEngine.computeIdealPower(side, wind, spec.maxSpeed);
      assert.ok(idealPower >= 0.15 && idealPower <= 0.99);

      const proj = PhysicsEngine.createProjectile(side, idealPower, {}, spec.maxSpeed);
      let impact = null;
      for (let step = 0; step < 240; step++) {
        impact = PhysicsEngine.stepProjectile(proj, wind);
        if (impact) break;
      }

      assert.ok(impact !== null, `Side=${side}, wind=${wind} should land or hit`);
      assert.equal(
        impact.type,
        'character',
        `Side=${side}, wind=${wind}, power=${idealPower} expected character hit but got ${impact?.type}`
      );
    }
  }
});

test('部位與精準度多段傷害判定 (crit 最大傷害 / normal 一般傷害 / graze 擦傷) 與眼冒金星腫大包觸發條件', () => {
  // 模擬正中狗狗頭部核心 (crit)
  const headProj = PhysicsEngine.createProjectile('cat', 0.6, {});
  headProj.x = CONFIG.DOG.x - headProj.vx;
  headProj.y = CONFIG.DOG.y - CONFIG.DOG.height * 0.72 - headProj.vy;
  const critHit = PhysicsEngine.stepProjectile(headProj, 0);

  assert.equal(critHit.type, 'character');
  assert.equal(critHit.hitTier, 'crit');
  assert.equal(critHit.isMaxDamage, true);
  assert.equal(critHit.damage, Math.round(CONFIG.BASE_DAMAGE * CONFIG.HIT_TIERS.crit.multiplier));

  // 模擬擦過角色最外緣腳部 (graze)
  const grazeProj = PhysicsEngine.createProjectile('cat', 0.6, {});
  grazeProj.x = CONFIG.DOG.x - CONFIG.DOG.width * 0.42 - grazeProj.vx;
  grazeProj.y = CONFIG.DOG.y - 12 - grazeProj.vy;
  const grazeHit = PhysicsEngine.stepProjectile(grazeProj, 0);

  assert.equal(grazeHit.type, 'character');
  assert.equal(grazeHit.hitTier, 'graze');
  assert.equal(grazeHit.isMaxDamage, false);
  assert.ok(grazeHit.damage < CONFIG.BASE_DAMAGE);
});

test('道具加成：加大傷害 (giant) 與 特級武器 (special) 應正確放大投擲物與基礎傷害', () => {
  const normalProj = PhysicsEngine.createProjectile('cat', 0.6, {});
  const giantProj = PhysicsEngine.createProjectile('cat', 0.6, { giant: true });
  const specialProj = PhysicsEngine.createProjectile('dog', 0.6, { special: true });

  assert.equal(normalProj.baseDamage, CONFIG.BASE_DAMAGE);
  assert.equal(giantProj.scale, CONFIG.ITEMS.giant.scaleMultiplier);
  assert.ok(giantProj.baseDamage > normalProj.baseDamage);
  assert.ok(specialProj.baseDamage > giantProj.baseDamage);
});
