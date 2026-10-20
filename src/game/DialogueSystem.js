// ===================================================
// DialogueSystem.js — Interactive RPG Story & Branching Dialogue Runner
// Follows dialogue-systems skill: node graph, typewriter effect, choices, lore flags
// ===================================================

export class DialogueSystem {
  constructor(audio) {
    this.audio = audio;
    this.active = false;
    this.currentNode = null;
    this.typewriterTimer = null;
    this.fullText = '';
    this.charIndex = 0;
    this.onCompleteCallback = null;

    // Story Narrative State & Flags
    this.storyFlags = {
      talkedToFinn: false,
      learnedAboutMushrooms: false,
      spiritAwakened: false,
    };

    // UI references
    this.dialogueBox = document.getElementById('dialogue-box');
    this.speakerName = document.getElementById('dialogue-speaker');
    this.speakerAvatar = document.getElementById('dialogue-avatar');
    this.dialogueText = document.getElementById('dialogue-text');
    this.dialogueChoices = document.getElementById('dialogue-choices');
    this.btnAdvance = document.getElementById('dialogue-advance');

    this._bindEvents();
  }

  _bindEvents() {
    if (this.btnAdvance) {
      this.btnAdvance.addEventListener('click', () => this.advance());
    }
    window.addEventListener('keydown', e => {
      if (this.active && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) {
        this.advance();
      }
    });
  }

  // ─── Dialogue Node Graph ──────────────────────────────────────────────────

  getDialogues() {
    return {
      // NPC 1: Old Explorer Finn (Valley Spawn - Tier 0)
      finn_intro: {
        speaker: 'Old Explorer Finn',
        avatar: '🧙‍♂️',
        text: 'Hold your step, Traveler! You stand upon the ancient lands of Eldoria. Last night, the Dark Curse awakened, shattering the Emerald Heart of the Forest into shards scattered across all realms!',
        choices: [
          { text: 'What happened to Eldoria, elder?', next: 'finn_story' },
          { text: 'Which lands lie beyond the crossroads?', next: 'finn_world' },
          { text: 'How can I break the Curse?', next: 'finn_quest' },
        ],
      },
      finn_story: {
        speaker: 'Old Explorer Finn',
        avatar: '🧙‍♂️',
        text: 'When nightfall arrives, the Dark Curse unleashes its deadliest power, shrouding the sky in violet dread! If you do not gather the emerald shards and awaken the Forest Spirit atop the mountain summit, our woodland will fall into eternal slumber!',
        choices: [
          { text: 'Which lands lie beyond the crossroads?', next: 'finn_world' },
          { text: 'I will recover the emeralds right away!', next: 'finn_quest' },
        ],
      },
      finn_world: {
        speaker: 'Old Explorer Finn',
        avatar: '🧙‍♂️',
        text: 'Follow the four paths from the signpost: West (-60m) lies Oakvale Village. East (+70m) towers the fiery Dragon Fortress. North (+60m) is the Forbidden Forest glowing with arcane violet beacons, and South (-60m) descends into the Murky Demon Swamp. Follow the lanterns and explore!',
        choices: [
          { text: 'How do I scale the steep cliffs?', next: 'finn_quest' },
        ],
      },
      finn_quest: {
        speaker: 'Old Explorer Finn',
        avatar: '🧙‍♂️',
        text: 'Take this Compass and the legendary Falcon Glider! Use W, A, S, D to run, and SHIFT to sprint. When leaping off precipices, HOLD SPACE to glide safely across gorges! Step on red bouncy mushrooms to propel yourself skyward. Waste no time — make haste!',
        flag: 'talkedToFinn',
        next: null, // End of conversation
      },

      // NPC 2: Woodsman Bram (Suspension Bridge - Tier 1)
      bram_intro: {
        speaker: 'Bram the Woodcutter',
        avatar: '🪓',
        text: 'Well met, young explorer! You managed to climb all the way from the valley up to this plateau? Impressive! The suspension bridge behind me leads straight into the ancient highlands.',
        choices: [
          { text: 'How do I reach the highest summit?', next: 'bram_hint' },
          { text: 'Is this suspension bridge safe?', next: 'bram_bridge' },
        ],
      },
      bram_hint: {
        speaker: 'Bram the Woodcutter',
        avatar: '🪓',
        text: 'Ha ha! The cliff wall to the summit is over 7 meters sheer rock — no walking path up there! Seek out the giant red spring mushroom with white spots nearby; stepping onto it will launch you straight up to the peak!',
        flag: 'learnedAboutMushrooms',
        choices: [
          { text: 'Thanks Bram, I will go test the spring mushroom!', next: null },
        ],
      },
      bram_bridge: {
        speaker: 'Bram the Woodcutter',
        avatar: '🪓',
        text: 'I just tightened the cables myself, cross with confidence! There is an ancient treasure chest nestled by the canyon overlook on the other side!',
        next: null,
      },

      // NPC 3: Forest Spirit (Peak Summit - Tier 2)
      spirit_intro: {
        speaker: 'Spirit of the Forest',
        avatar: '✨',
        text: 'Brave seeker of the skies... You have harnessed the winds, deployed your glider, and conquered the highest summit of the Eldorian realm!',
        choices: [
          { text: 'Are you the Guardian Spirit of the Forest?', next: 'spirit_praise' },
        ],
      },
      spirit_praise: {
        speaker: 'Spirit of the Forest',
        avatar: '✨',
        text: 'The Royal Treasure Chest beside me is your rightful reward. When night falls, the fireflies shall light your path, for you are now the true Legend of the Forest!',
        flag: 'spiritAwakened',
        next: null,
      },
    };
  }

  // ─── Start Dialogue Flow ──────────────────────────────────────────────────

  start(dialogueKey, onComplete = null) {
    const dialogues = this.getDialogues();
    const node = dialogues[dialogueKey];
    if (!node) return;

    this.active = true;
    this.onCompleteCallback = onComplete;
    this.dialogueBox.classList.remove('hidden');

    this._showNode(node);
  }

  _showNode(node) {
    this.currentNode = node;
    this.speakerName.textContent = node.speaker;
    this.speakerAvatar.textContent = node.avatar || '💬';

    if (node.flag) {
      this.storyFlags[node.flag] = true;
    }

    // Typewriter effect
    this._startTypewriter(node.text, () => {
      this._renderChoices(node);
    });
  }

  _startTypewriter(text, onDone) {
    clearInterval(this.typewriterTimer);
    this.fullText = text;
    this.charIndex = 0;
    this.dialogueText.textContent = '';
    this.dialogueChoices.innerHTML = '';
    this.btnAdvance.style.display = 'none';

    this.typewriterTimer = setInterval(() => {
      this.charIndex++;
      this.dialogueText.textContent = this.fullText.slice(0, this.charIndex);

      // Play soft speech tick
      if (this.charIndex % 3 === 0 && this.audio) {
        this._playTick();
      }

      if (this.charIndex >= this.fullText.length) {
        clearInterval(this.typewriterTimer);
        if (onDone) onDone();
      }
    }, 22);
  }

  _renderChoices(node) {
    this.dialogueChoices.innerHTML = '';

    if (node.choices && node.choices.length > 0) {
      this.btnAdvance.style.display = 'none';
      node.choices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'dialogue-choice-btn';
        btn.textContent = `▸ ${c.text}`;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (c.next) {
            const nextNode = this.getDialogues()[c.next];
            if (nextNode) this._showNode(nextNode);
            else this.close();
          } else {
            this.close();
          }
        });
        this.dialogueChoices.appendChild(btn);
      });
    } else {
      // Linear node: show "Tiếp tục [E] ▶" button
      this.btnAdvance.style.display = 'block';
    }
  }

  advance() {
    if (!this.active || !this.currentNode) return;

    // If typewriter is still printing, instantly finish the line
    if (this.charIndex < this.fullText.length) {
      clearInterval(this.typewriterTimer);
      this.charIndex = this.fullText.length;
      this.dialogueText.textContent = this.fullText;
      this._renderChoices(this.currentNode);
      return;
    }

    // Move to next node if linear
    if (this.currentNode.next) {
      const nextNode = this.getDialogues()[this.currentNode.next];
      if (nextNode) {
        this._showNode(nextNode);
      } else {
        this.close();
      }
    } else {
      this.close();
    }
  }

  close() {
    this.active = false;
    clearInterval(this.typewriterTimer);
    if (this.dialogueBox) this.dialogueBox.classList.add('hidden');
    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.storyFlags);
      this.onCompleteCallback = null;
    }
  }

  _playTick() {
    try {
      const ctx = this.audio._getCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440 + Math.random() * 80, now);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (_) {}
  }
}
