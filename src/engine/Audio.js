/**
 * Web Audio API 程式合成音效引擎
 * 免除外部 mp3 載入延遲，即時合成蓄力、投擲、擊中、貓叫、狗吠、道具與勝利音效
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.chargeOsc = null;
    this.chargeGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopChargeSound();
    }
    return this.enabled;
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.06);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  startChargeSound() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    this.stopChargeSound();

    const now = this.ctx.currentTime;
    this.chargeOsc = this.ctx.createOscillator();
    this.chargeGain = this.ctx.createGain();

    this.chargeOsc.type = 'triangle';
    this.chargeOsc.frequency.setValueAtTime(220, now);
    this.chargeGain.gain.setValueAtTime(0.08, now);

    this.chargeOsc.connect(this.chargeGain);
    this.chargeGain.connect(this.ctx.destination);
    this.chargeOsc.start(now);
  }

  updateChargeSound(powerRatio) {
    if (!this.enabled || !this.chargeOsc || !this.ctx) return;
    const freq = 220 + powerRatio * 520;
    this.chargeOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
  }

  stopChargeSound() {
    if (this.chargeOsc) {
      try {
        this.chargeOsc.stop();
        this.chargeOsc.disconnect();
      } catch {
        // ignore if already stopped
      }
      this.chargeOsc = null;
      this.chargeGain = null;
    }
  }

  playThrow(isSpecial = false) {
    this.stopChargeSound();
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isSpecial ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isSpecial ? 620 : 460, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.24);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  playHitCharacter(victimSide, isHeavy = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. 撞擊重低音
    const impactOsc = this.ctx.createOscillator();
    const impactGain = this.ctx.createGain();
    impactOsc.type = 'square';
    impactOsc.frequency.setValueAtTime(isHeavy ? 140 : 180, now);
    impactOsc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

    impactGain.gain.setValueAtTime(isHeavy ? 0.28 : 0.2, now);
    impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    impactOsc.connect(impactGain);
    impactGain.connect(this.ctx.destination);
    impactOsc.start(now);
    impactOsc.stop(now + 0.2);

    // 2. 角色受擊叫聲 (貓喵嗚 / 狗汪嗚)
    const voiceOsc = this.ctx.createOscillator();
    const voiceGain = this.ctx.createGain();
    if (victimSide === 'cat') {
      // 貓咪高音滑落喵叫
      voiceOsc.type = 'sawtooth';
      voiceOsc.frequency.setValueAtTime(680, now + 0.05);
      voiceOsc.frequency.linearRampToValueAtTime(920, now + 0.13);
      voiceOsc.frequency.exponentialRampToValueAtTime(420, now + 0.36);
    } else {
      // 狗狗低音嗚叫
      voiceOsc.type = 'triangle';
      voiceOsc.frequency.setValueAtTime(340, now + 0.05);
      voiceOsc.frequency.linearRampToValueAtTime(460, now + 0.11);
      voiceOsc.frequency.exponentialRampToValueAtTime(170, now + 0.32);
    }

    voiceGain.gain.setValueAtTime(0.14, now + 0.05);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.37);

    voiceOsc.connect(voiceGain);
    voiceGain.connect(this.ctx.destination);
    voiceOsc.start(now + 0.05);
    voiceOsc.stop(now + 0.38);
  }

  playHitWallOrGround() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playItemUse(type) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = type === 'heal' ? [523, 659, 784, 1046] : [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);

      gain.gain.setValueAtTime(0.14, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.13);
    });
  }

  playVictory() {
    this.stopChargeSound();
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const melody = [
      { f: 523.25, t: 0.0, d: 0.14 },
      { f: 659.25, t: 0.14, d: 0.14 },
      { f: 783.99, t: 0.28, d: 0.14 },
      { f: 1046.5, t: 0.44, d: 0.38 },
    ];

    melody.forEach((n) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0.2, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    });
  }
}
