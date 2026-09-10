/**
 * Kinetic Grade Evaluator — Fix Pass 04: Motion Graphics Staged Scene
 *
 * Exact Frame Triggers:
 * - F00: Button snaps down (3 frames, --snap-in). Shutters sweep to meet at center (4 frames, --snap-in).
 *        Odometer & Band Marker hold previous positions!
 * - F04–F07: HOLD ON BLACK (3 full frames of nothing). Content swaps quietly.
 *            Panel is .staged: words held at translateY(105%), stars held at scale(0).
 * - F07–F12: Shutters retract (5 frames, --snap-out). Viewer sees ONLY flood color and letter at scale(1.06).
 *            Words are invisible. Stars are invisible. Odometer & Marker still at previous values.
 * - F12: Shutters fully open. .staged removed.
 *        Letter settle begins (4 frames, --settle, F12–F16).
 *        Odometer digits begin rolling from previous to target score (8 frames, --snap-out).
 * - F13: Kinetic verdict typeset begins (5 frames/word, 3 frames stagger, 20% contra-motion).
 * - F14: Echo trail 1 settles behind hero.
 * - F16: Echo trail 2 settles behind hero.
 *        Stars stagger in (2 frames apart, 6 frames each, --snap-out).
 * - F18–F30: Band marker slides across 7rem proportional strip to exact score position (12 frames, --snap-out).
 *            Active segment black wipe fires across new segment (3 frames, --snap-out).
 * - F30: Sequence completes. Ambient breath resumes.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const viewportWrapper = document.getElementById('viewportWrapper');
  const evalForm = document.getElementById('evalForm');
  const scoreInput = document.getElementById('scoreInput');
  const inputWrapper = document.getElementById('inputWrapper');
  const bottomRule = document.getElementById('bottomRule');
  const errorMsg = document.getElementById('errorMsg');
  const evalBtn = document.getElementById('evalBtn');
  const chargeFill = document.getElementById('chargeFill');
  const scoreReadout = document.getElementById('scoreReadout');
  const odometerContainer = document.getElementById('odometerContainer');
  const rightPanel = document.getElementById('rightPanel');
  const shutterTop = document.getElementById('shutterTop');
  const shutterBottom = document.getElementById('shutterBottom');
  const shineBar = document.getElementById('shineBar');
  const gradeLetterMask = document.getElementById('gradeLetterMask');
  const gradeStrip = document.getElementById('gradeStrip');
  const verdictSection = document.getElementById('verdictSection');
  const verdictLine = document.getElementById('verdictLine');
  const starRow = document.getElementById('starRow');
  const bandStrip = document.getElementById('bandStrip');
  const bandMarkerAssembly = document.getElementById('bandMarkerAssembly');
  const markerScoreLabel = document.getElementById('markerScoreLabel');
  const ariaLive = document.getElementById('ariaLive');

  // Rule 1: 30fps Grid (1 frame = 33.3333ms)
  const F = 33.333333;
  const urlParams = new URLSearchParams(window.location.search);
  const isSlow = urlParams.has('slow');
  const timeScale = isSlow ? 4 : 1;
  document.documentElement.style.setProperty('--time-scale', timeScale);

  function f(frames) {
    return Math.round(frames * F * timeScale);
  }

  // Reduced Motion Check
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReducedMotion = motionQuery.matches;
  motionQuery.addEventListener('change', (e) => {
    prefersReducedMotion = e.matches;
  });

  // State Tracking: previous score retained for post-reveal travel
  const state = {
    score: { current: 0, target: 0, previous: 0 }
  };

  let activeTimeouts = [];
  let activeRafIds = [];
  let markerRafId = null;
  let shineInterval = null;
  let invitationTimer = null;
  let currentGrade = 'F';

  // Drag & Scrub Tracking
  let isDragging = false;
  let dragStartX = 0;
  let dragStartScore = 0;
  let isCharging = false;
  let chargeStartTime = 0;
  let keyRepeatTimeout = null;
  let keyRepeatInterval = null;

  /**
   * Grading logic — strictly written as a single if / else if / else chain
   */
  function evaluateScore(score) {
    let grade, message, color, stars;

    if (score >= 90)      { grade = 'A'; message = 'Excellent performance!';     color = '#00E19B'; stars = 5; }
    else if (score >= 80) { grade = 'B'; message = 'Good performance!';          color = '#2BB3FF'; stars = 4; }
    else if (score >= 70) { grade = 'C'; message = 'Average performance!';       color = '#FFD400'; stars = 3; }
    else if (score >= 60) { grade = 'D'; message = 'Below average performance!'; color = '#FF7A1A'; stars = 2; }
    else                  { grade = 'F'; message = 'Failing!';                   color = '#FF2D2D'; stars = 1; }

    return { grade, message, color, stars };
  }

  function clearAllTimers() {
    activeTimeouts.forEach((id) => clearTimeout(id));
    activeTimeouts = [];

    activeRafIds.forEach((id) => cancelAnimationFrame(id));
    activeRafIds = [];
    markerRafId = null;
  }

  function scheduleFrame(frames, fn) {
    const delayMs = f(frames);
    const id = setTimeout(() => {
      const idx = activeTimeouts.indexOf(id);
      if (idx !== -1) activeTimeouts.splice(idx, 1);
      fn();
    }, delayMs);
    activeTimeouts.push(id);
    return id;
  }

  /**
   * Calculate exact X percentage for score marker on proportional strip
   * Proportions: F=60, D=10, C=10, B=10, A=11 (Total 101)
   */
  function getScorePercentage(s) {
    const clamped = Math.max(0, Math.min(100, s));
    if (clamped < 60) {
      // Inside F (0 to 59): 60 units across 60/101 of strip
      return (clamped / 60) * (60 / 101) * 100;
    } else if (clamped < 70) {
      // Inside D (60 to 69): 10 units across 10/101 of strip
      return ((60 / 101) + ((clamped - 60) / 10) * (10 / 101)) * 100;
    } else if (clamped < 80) {
      // Inside C (70 to 79): 10 units across 10/101 of strip
      return ((70 / 101) + ((clamped - 70) / 10) * (10 / 101)) * 100;
    } else if (clamped < 90) {
      // Inside B (80 to 89): 10 units across 10/101 of strip
      return ((80 / 101) + ((clamped - 80) / 10) * (10 / 101)) * 100;
    } else {
      // Inside A (90 to 100): 10 units across 11/101 of strip
      return ((90 / 101) + ((clamped - 90) / 10) * (11 / 101)) * 100;
    }
  }

  /**
   * Reset motion states for interruptibility
   */
  function resetMotionState() {
    clearAllTimers();
    cancelMarkerAnimation();

    evalBtn.classList.remove('is-active');

    shutterTop.classList.remove('closing', 'holding', 'opening');
    shutterBottom.classList.remove('closing', 'holding', 'opening');
    shutterTop.style.transform = '';
    shutterBottom.style.transform = '';

    rightPanel.classList.remove('staged');

    gradeLetterMask.classList.remove('settling', 'holding-scale');

    shineBar.classList.remove('shining');

    void document.body.offsetWidth;
  }

  function setStaticReadout(val) {
    odometerContainer.innerHTML = `<span class="odometer-static">${val}</span>`;
  }

  /**
   * Technique: Odometer Digits with Roll-In and Roll-Out
   * Strip items:
   * 0: blank (empty slot above 0)
   * 1–10: digits 0–9
   * 11: blank (empty slot below 9)
   */
  function createOdometerCol(initialDigit, isCollapsing = false) {
    const col = document.createElement('div');
    col.className = 'odometer-digit-col';

    const hasInitial = initialDigit !== null && initialDigit !== undefined;
    const startIdx = hasInitial ? (initialDigit + 1) : 0;

    const strip = document.createElement('div');
    strip.className = 'odometer-digit-strip';
    strip.style.transition = 'none';
    strip.style.transform = `translateY(-${startIdx}em)`;

    // Item 0: Blank top
    const blankTop = document.createElement('span');
    blankTop.className = 'odometer-digit-item is-blank';
    blankTop.innerHTML = '&nbsp;';
    strip.appendChild(blankTop);

    // Items 1–10: Digits 0–9
    for (let d = 0; d <= 9; d++) {
      const item = document.createElement('span');
      item.className = 'odometer-digit-item';
      item.textContent = d;
      strip.appendChild(item);
    }

    // Item 11: Blank bottom
    const blankBottom = document.createElement('span');
    blankBottom.className = 'odometer-digit-item is-blank';
    blankBottom.innerHTML = '&nbsp;';
    strip.appendChild(blankBottom);

    col.appendChild(strip);

    if (isCollapsing) {
      col.style.width = '1ch';
      col.style.opacity = '1';
    } else if (!hasInitial) {
      col.style.width = '0';
      col.style.opacity = '0';
    } else {
      col.style.width = '1ch';
      col.style.opacity = '1';
    }

    return { col, strip };
  }

  function setupOdometer(score) {
    const str = String(score);
    odometerContainer.innerHTML = '';

    for (let c = 0; c < str.length; c++) {
      const digit = parseInt(str[c], 10);
      const { col } = createOdometerCol(digit);
      odometerContainer.appendChild(col);
    }
  }

  function runOdometer(prevScore, targetScore) {
    const prevStr = String(prevScore);
    const targetStr = String(targetScore);
    const maxLen = Math.max(prevStr.length, targetStr.length);

    odometerContainer.innerHTML = '';

    const colsToAnimate = [];

    for (let i = 0; i < maxLen; i++) {
      const prevDigitChar = prevStr[i];
      const targetDigitChar = targetStr[i];

      const hasPrev = prevDigitChar !== undefined;
      const hasTarget = targetDigitChar !== undefined;

      const prevDigit = hasPrev ? parseInt(prevDigitChar, 10) : null;
      const targetDigit = hasTarget ? parseInt(targetDigitChar, 10) : null;

      if (hasPrev && hasTarget) {
        // Normal column: rolls from prevDigit to targetDigit
        const { col, strip } = createOdometerCol(prevDigit);
        odometerContainer.appendChild(col);

        colsToAnimate.push({
          type: 'roll',
          col,
          strip,
          targetIdx: targetDigit + 1,
          index: i
        });
      } else if (!hasPrev && hasTarget) {
        // Extra digit appearing: starts at blank, width 0, rolls in to targetDigit
        const { col, strip } = createOdometerCol(null);
        odometerContainer.appendChild(col);

        colsToAnimate.push({
          type: 'roll-in',
          col,
          strip,
          targetIdx: targetDigit + 1,
          index: i
        });
      } else if (hasPrev && !hasTarget) {
        // Extra digit disappearing: starts at prevDigit, rolls out to blank while width collapses
        const { col, strip } = createOdometerCol(prevDigit, true);
        odometerContainer.appendChild(col);

        colsToAnimate.push({
          type: 'roll-out',
          col,
          strip,
          targetIdx: 0,
          index: i
        });
      }
    }

    // Force layout reflow so initial state commits
    void odometerContainer.offsetWidth;

    if (prefersReducedMotion) {
      setupOdometer(targetScore);
      return;
    }

    // Stagger roll: ones starts at F12 (delay 0), tens at F14 (delay 2), hundreds at F16 (delay 4)
    colsToAnimate.forEach((item) => {
      const delayFrames = (maxLen - 1 - item.index) * 2;

      scheduleFrame(delayFrames, () => {
        item.strip.style.transition = '';
        item.strip.style.transform = `translateY(-${item.targetIdx}em)`;

        if (item.type === 'roll-in') {
          item.col.style.width = '1ch';
          item.col.style.opacity = '1';
        } else if (item.type === 'roll-out') {
          item.col.style.width = '0';
          item.col.style.opacity = '0';

          // Clean up collapsed column after transition (8 frames = 266ms)
          scheduleFrame(8, () => {
            if (item.col.parentNode) {
              item.col.remove();
            }
          });
        }
      });
    });
  }

  /**
   * Render Star Row with inline SVG star paths
   */
  function renderStarRow(starCount) {
    starRow.innerHTML = '';
    starRow.setAttribute('aria-label', `${starCount} out of 5 stars`);

    for (let i = 0; i < 5; i++) {
      const isEarned = i < starCount;
      const starSlot = document.createElement('span');
      starSlot.className = 'star-slot';
      starSlot.setAttribute('style', `--i: ${i}`);

      const ring = document.createElement('span');
      ring.className = 'star-impact-ring';
      starSlot.appendChild(ring);

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('class', 'star-svg');
      svg.setAttribute('aria-hidden', 'true');

      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2');
      polygon.setAttribute('stroke', '#000000');
      polygon.setAttribute('stroke-width', '3');
      polygon.setAttribute('stroke-linejoin', 'miter');
      polygon.setAttribute('fill', isEarned ? '#000000' : 'none');

      svg.appendChild(polygon);
      starSlot.appendChild(svg);

      // Two-way Click & Evaluate
      starSlot.addEventListener('click', (e) => {
        e.stopPropagation();
        const midpoints = [45, 65, 75, 85, 95];
        const target = midpoints[i];
        scoreInput.value = target;
        updateInputWidth(target);
        runEvaluation(target);
      });

      // Hover ripple
      starSlot.addEventListener('pointerenter', () => {
        if (prefersReducedMotion) return;
        const allSlots = starRow.querySelectorAll('.star-slot');
        allSlots.forEach((slot, sIdx) => {
          if (sIdx <= i) {
            slot.style.transitionDelay = `calc(var(--f) * ${i - sIdx})`;
            slot.classList.add('star-hover-lift');
          } else {
            slot.classList.remove('star-hover-lift');
            slot.style.transitionDelay = '0ms';
          }
        });
      });

      starRow.appendChild(starSlot);
    }
  }

  starRow.addEventListener('pointerleave', () => {
    const allSlots = starRow.querySelectorAll('.star-slot');
    allSlots.forEach((slot) => {
      slot.classList.remove('star-hover-lift');
      slot.style.transitionDelay = '0ms';
    });
  });

  /**
   * Technique: Kinetic Type on Verdict with Contra-Motion
   */
  function setupKineticVerdict(message) {
    verdictLine.innerHTML = '';
    const words = message.split(' ');
    const wordMasks = [];
    const wordInners = [];

    words.forEach((w) => {
      const mask = document.createElement('span');
      mask.className = 'word-mask';

      const inner = document.createElement('span');
      inner.className = 'word-inner';
      inner.textContent = w;

      mask.appendChild(inner);
      verdictLine.appendChild(mask);

      wordMasks.push(mask);
      wordInners.push(inner);
    });

    return { wordMasks, wordInners };
  }

  function cancelMarkerAnimation() {
    if (markerRafId) {
      cancelAnimationFrame(markerRafId);
      const idx = activeRafIds.indexOf(markerRafId);
      if (idx !== -1) activeRafIds.splice(idx, 1);
      markerRafId = null;
    }
  }

  /**
   * Calculate score from percentage along the proportional strip
   * Proportions: F=60, D=10, C=10, B=10, A=11 (Total 101)
   */
  function getScoreFromPercentage(pct01) {
    const p = Math.max(0, Math.min(1, pct01));
    const total = 101;
    const fBoundary = 60 / total;
    const dBoundary = 70 / total;
    const cBoundary = 80 / total;
    const bBoundary = 90 / total;

    if (p < fBoundary) {
      return Math.round((p / fBoundary) * 59);
    } else if (p < dBoundary) {
      return Math.round(60 + ((p - fBoundary) / (10 / total)) * 9);
    } else if (p < cBoundary) {
      return Math.round(70 + ((p - dBoundary) / (10 / total)) * 9);
    } else if (p < bBoundary) {
      return Math.round(80 + ((p - cBoundary) / (10 / total)) * 9);
    } else {
      return Math.round(90 + ((p - bBoundary) / (11 / total)) * 10);
    }
  }

  /**
   * Update Band Marker Position & Active Segment Color
   * Sets sub-pixel floating-point position for butter-smooth motion
   */
  function setBandMarkerPosition(score, displayVal) {
    const pct = getScorePercentage(score);
    bandMarkerAssembly.style.left = `${pct.toFixed(3)}%`;
    markerScoreLabel.textContent = displayVal !== undefined ? displayVal : Math.round(score);
  }

  /**
   * Silky-Smooth Band Marker Animation with continuous score badge ticking
   * Uses easeOutCubic over f(18) frames on requestAnimationFrame
   */
  function animateBandMarker(fromScore, toScore, onComplete) {
    cancelMarkerAnimation();

    if (prefersReducedMotion || Math.abs(fromScore - toScore) < 0.01) {
      setBandMarkerPosition(toScore, toScore);
      if (onComplete) onComplete();
      return;
    }

    const startTime = performance.now();
    const duration = f(18); // 18 frames = 600ms at 1x

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, Math.max(0, elapsed / duration));
      // Ease-out cubic: 1 - (1 - t)^3 (ultra smooth deceleration, continuous glide)
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentScore = fromScore + (toScore - fromScore) * eased;

      setBandMarkerPosition(currentScore, Math.round(currentScore));

      // Dynamically highlight active segment as marker glides across boundaries
      const currentGrade = evaluateScore(Math.round(currentScore)).grade;
      updateBandActiveSegment(currentGrade);

      if (progress < 1) {
        markerRafId = requestAnimationFrame(step);
      } else {
        markerRafId = null;
        setBandMarkerPosition(toScore, toScore);
        if (onComplete) onComplete();
      }
    }

    markerRafId = requestAnimationFrame(step);
    activeRafIds.push(markerRafId);
  }

  function updateBandActiveSegment(grade) {
    const allSegments = bandStrip.querySelectorAll('.band-segment');
    allSegments.forEach((seg) => {
      const segGrade = seg.getAttribute('data-grade');
      if (segGrade === grade) {
        seg.classList.add('is-active');
      } else {
        seg.classList.remove('is-active');
      }
    });
  }

  /**
   * Ambient 1: 8s Periodic Diagonal Shine Pass
   * 9 frames crossing, then complete dead air for rest of cycle.
   */
  function triggerShinePass() {
    if (prefersReducedMotion) return;
    shineBar.classList.remove('shining');
    void shineBar.offsetWidth;
    shineBar.classList.add('shining');

    scheduleFrame(9, () => {
      shineBar.classList.remove('shining');
    });
  }

  function startShineCycle() {
    if (shineInterval) clearInterval(shineInterval);
    shineInterval = setInterval(triggerShinePass, 8000 * timeScale);
  }

  /**
   * =========================================================================
   * THE 30-FRAME BEAT SHEET SEQUENCE (F00–F30)
   * Staged Reveal: Shutter-out reveals a staged scene, not a finished one!
   * =========================================================================
   */
  function runEvaluation(targetScore) {
    const prevScore = state.score.previous;
    const { grade, message, color, stars } = evaluateScore(targetScore);

    resetMotionState();

    state.score.target = targetScore;

    if (prefersReducedMotion) {
      document.documentElement.style.setProperty('--grade-color', color);
      setStaticReadout(targetScore);
      gradeStrip.innerHTML = `<span class="roll-letter">${grade}</span>`;
      verdictLine.textContent = message;
      renderStarRow(stars);
      setBandMarkerPosition(targetScore);
      updateBandActiveSegment(grade, false);
      state.score.previous = targetScore;
      currentGrade = grade;
      ariaLive.textContent = `Score ${targetScore}. Grade ${grade}. ${message}. ${stars} out of 5 stars.`;
      return;
    }

    // F00 (0ms):
    // 1. Button snaps down translate(4px, 4px), shadow to 0. 3 frames, --snap-in.
    evalBtn.classList.add('is-active');
    scheduleFrame(3, () => {
      evalBtn.classList.remove('is-active');
    });

    // 2. Shutters sweep to meet at center (F00 to F04, 4 frames, --snap-in)
    shutterTop.classList.add('closing');
    shutterBottom.classList.add('closing');

    // NOTE: Odometer and Band Marker maintain PREVIOUS position at F00!

    // F04 (133ms):
    // Shutters meet at centre. HOLD ON BLACK begins (F04–F07, 3 full frames of nothing).
    scheduleFrame(4, () => {
      shutterTop.classList.remove('closing');
      shutterBottom.classList.remove('closing');
      shutterTop.classList.add('holding');
      shutterBottom.classList.add('holding');
    });

    // During the hold (F05 = 167ms):
    // Content swaps quietly, scene is STAGED (not finished!):
    let kineticNodes = null;
    scheduleFrame(5, () => {
      // 1. Pin scene elements: words inside masks, stars scale(0)
      rightPanel.classList.add('staged');

      // 2. Swap background flood color
      document.documentElement.style.setProperty('--grade-color', color);

      // 3. Swap grade letter in strip
      gradeStrip.innerHTML = `<span class="roll-letter">${grade}</span>`;

      // 4. Set letter to scale(1.06) holding scale
      gradeLetterMask.classList.add('holding-scale');

      // 5. Build kinetic verdict words (pinned at translateY(105%) by .staged)
      kineticNodes = setupKineticVerdict(message);

      // 6. Render target stars (pinned at scale(0), opacity: 0 by .staged)
      renderStarRow(stars);

      // Odometer and Band Marker STILL hold previous score!
    });

    // F07 (233ms):
    // Shutter out: Bars retract to their outer edges (5 frames, --snap-out, F07 to F12).
    // The scene revealed at F07 contains ONLY the new color and the huge letter at scale(1.06).
    // Words and stars are completely hidden. Odometer & Marker still show previous score.
    scheduleFrame(7, () => {
      shutterTop.classList.remove('holding');
      shutterBottom.classList.remove('holding');
      shutterTop.classList.add('opening');
      shutterBottom.classList.add('opening');
    });

    // F12 (400ms):
    // Shutter out finishes. Bars have fully cleared!
    // Now the performance begins live in front of the viewer:
    scheduleFrame(12, () => {
      shutterTop.classList.remove('opening');
      shutterBottom.classList.remove('opening');

      // Unpin staged elements
      rightPanel.classList.remove('staged');

      // 1. Hero letter settle begins: scale(1.06) -> scale(1.0) over 4 frames on --settle (F12–F16)
      gradeLetterMask.classList.remove('holding-scale');
      gradeLetterMask.classList.add('settling');

      // 2. Odometer rolls from previous score to target score (8 frames, --snap-out)
      runOdometer(prevScore, targetScore);
    });

    // F13–F22 (433–733ms):
    // Kinetic type on verdict: inner rises from translateY(105%) to 0 over 5 frames (--snap-out),
    // staggered 3 frames per word, outer moves down 20% and back (contra-motion).
    scheduleFrame(13, () => {
      if (kineticNodes && kineticNodes.wordInners.length) {
        kineticNodes.wordInners.forEach((inner, idx) => {
          scheduleFrame(idx * 3, () => {
            if (kineticNodes.wordMasks[idx]) {
              kineticNodes.wordMasks[idx].classList.add('typesetting');
            }
            inner.classList.add('revealing');
          });
        });
      }
    });

    // F16 (533ms): Settle duration completes (4 frames from F12)
    scheduleFrame(16, () => {
      gradeLetterMask.classList.remove('settling');
    });

    // F16–F26 (533–866ms):
    // Stars: 5 stars stagger in, 2 frames apart, 6 frames each, --snap-out
    scheduleFrame(16, () => {
      const starSlots = starRow.querySelectorAll('.star-slot');
      starSlots.forEach((slot) => {
        slot.classList.add('stagger-in');
      });
    });

    // F18–F36 (600–1200ms):
    // Band marker glides smoothly to target score position (18 frames on easeOutCubic).
    // The score badge counts in real time, and the active segment updates cleanly without blinking.
    scheduleFrame(18, () => {
      animateBandMarker(state.score.previous, targetScore, () => {
        updateBandActiveSegment(grade);
      });
    });

    // F36 (1200ms):
    // Total sequence completes!
    scheduleFrame(36, () => {
      gradeLetterMask.classList.remove('settling');
      state.score.previous = targetScore;
      currentGrade = grade;
      ariaLive.textContent = `Score ${targetScore}. Grade ${grade}. ${message}. ${stars} out of 5 stars.`;
    });
  }

  /**
   * Input Form & Validation
   */
  function handleEvaluation() {
    const rawVal = scoreInput.value.trim();
    const isNumeric = rawVal !== '' && !isNaN(rawVal) && !isNaN(parseFloat(rawVal));
    const numVal = parseFloat(rawVal);

    if (!isNumeric || numVal < 0 || numVal > 100 || !Number.isInteger(numVal)) {
      inputWrapper.classList.remove('shake');
      void inputWrapper.offsetWidth;
      inputWrapper.classList.add('shake');
      errorMsg.textContent = 'Enter a number between 0 and 100';

      scheduleFrame(10, () => {
        inputWrapper.classList.remove('shake');
      });
      return;
    }

    errorMsg.textContent = '';
    runEvaluation(numVal);
  }

  // Drag-to-Score
  viewportWrapper.addEventListener('pointerdown', (e) => {
    // On touch devices, do not hijack background dragging so vertical touch scroll works naturally
    if (e.pointerType === 'touch' && !e.target.closest('#bandStrip, .band-marker-assembly')) return;
    if (e.target.closest('input, button, .star-slot, .band-segment')) return;

    isDragging = true;
    dragStartX = e.clientX;
    dragStartScore = state.score.target;
    viewportWrapper.setPointerCapture(e.pointerId);
    document.body.classList.add('is-dragging');
  });

  viewportWrapper.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const pointDelta = Math.round(dx / 4);
    const newScore = Math.max(0, Math.min(100, dragStartScore + pointDelta));

    if (newScore !== state.score.target) {
      const prevEval = evaluateScore(state.score.target);
      state.score.target = newScore;
      const nextEval = evaluateScore(newScore);

      cancelMarkerAnimation();
      setStaticReadout(newScore);
      setBandMarkerPosition(newScore, newScore);

      if (nextEval.grade !== prevEval.grade) {
        document.documentElement.style.setProperty('--grade-color', nextEval.color);
        verdictLine.textContent = nextEval.message;
        renderStarRow(nextEval.stars);
        const starSlots = starRow.querySelectorAll('.star-slot');
        starSlots.forEach(s => { s.style.transform = 'scale(1)'; s.style.opacity = '1'; });
        gradeStrip.innerHTML = `<span class="roll-letter">${nextEval.grade}</span>`;
        updateBandActiveSegment(nextEval.grade, false);
      }
    }
  });

  function stopDrag(e) {
    if (isDragging) {
      isDragging = false;
      document.body.classList.remove('is-dragging');
      try {
        viewportWrapper.releasePointerCapture(e.pointerId);
      } catch (err) {}
      scoreInput.value = state.score.target;
      updateInputWidth(state.score.target);
      runEvaluation(state.score.target);
    }
  }

  viewportWrapper.addEventListener('pointerup', stopDrag);
  viewportWrapper.addEventListener('pointercancel', stopDrag);

  // Charge-to-Evaluate
  evalBtn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    isCharging = true;
    chargeStartTime = performance.now();
    evalBtn.classList.add('is-charging');

    function chargeTick() {
      if (!isCharging) return;
      const elapsed = performance.now() - chargeStartTime;
      const ratio = Math.min(1, elapsed / f(21));

      const scaleY = 1 - ratio * 0.12;
      const shadow = (4 * (1 - ratio)).toFixed(1);

      evalBtn.style.transform = `scaleY(${scaleY.toFixed(3)})`;
      evalBtn.style.boxShadow = `${shadow}px ${shadow}px 0 var(--ink)`;
      chargeFill.style.transform = `scaleY(${ratio.toFixed(3)})`;

      if (ratio < 1) {
        requestAnimationFrame(chargeTick);
      }
    }
    requestAnimationFrame(chargeTick);
  });

  evalBtn.addEventListener('pointerup', () => {
    if (!isCharging) return;
    isCharging = false;
    evalBtn.classList.remove('is-charging');
    evalBtn.style.transform = '';
    evalBtn.style.boxShadow = '';
    chargeFill.style.transform = 'scaleY(0)';

    handleEvaluation();
  });

  evalBtn.addEventListener('pointercancel', () => {
    isCharging = false;
    evalBtn.classList.remove('is-charging');
    evalBtn.style.transform = '';
    evalBtn.style.boxShadow = '';
    chargeFill.style.transform = 'scaleY(0)';
  });

  evalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleEvaluation();
  });

  // Accelerating Keyboard Scrub
  function nudgeScore(delta) {
    const raw = scoreInput.value.trim();
    let current = parseInt(raw, 10);
    if (isNaN(current)) current = state.score.target;

    const nextScore = Math.max(0, Math.min(100, current + delta));
    scoreInput.value = nextScore;
    updateInputWidth(nextScore);

    const prevEval = evaluateScore(state.score.target);
    state.score.target = nextScore;
    const nextEval = evaluateScore(nextScore);

    cancelMarkerAnimation();
    setStaticReadout(nextScore);
    setBandMarkerPosition(nextScore, nextScore);

    if (nextEval.grade !== prevEval.grade) {
      document.documentElement.style.setProperty('--grade-color', nextEval.color);
      verdictLine.textContent = nextEval.message;
      renderStarRow(nextEval.stars);
      const starSlots = starRow.querySelectorAll('.star-slot');
      starSlots.forEach(s => { s.style.transform = 'scale(1)'; s.style.opacity = '1'; });
      gradeStrip.innerHTML = `<span class="roll-letter">${nextEval.grade}</span>`;
      updateBandActiveSegment(nextEval.grade, false);
    }
  }

  scoreInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dir = e.key === 'ArrowUp' ? 1 : -1;

      nudgeScore(dir * step);

      if (!keyRepeatTimeout) {
        keyRepeatTimeout = setTimeout(() => {
          keyRepeatInterval = setInterval(() => {
            nudgeScore(dir * step);
          }, f(2));
        }, f(15));
      }
    }
  });

  function stopKeyRepeat() {
    if (keyRepeatTimeout) {
      clearTimeout(keyRepeatTimeout);
      keyRepeatTimeout = null;
    }
    if (keyRepeatInterval) {
      clearInterval(keyRepeatInterval);
      keyRepeatInterval = null;
    }
  }

  scoreInput.addEventListener('keyup', stopKeyRepeat);
  scoreInput.addEventListener('blur', stopKeyRepeat);

  function updateInputWidth(val) {
    if (val !== '' && !isNaN(val) && val >= 0 && val <= 100) {
      const interpolatedWdth = Math.round(80 + (val / 100) * 50);
      scoreInput.style.fontVariationSettings = `'wght' 700, 'wdth' ${interpolatedWdth}`;
    } else {
      scoreInput.style.fontVariationSettings = `'wght' 700, 'wdth' 105`;
    }
  }

  scoreInput.addEventListener('input', () => {
    resetInvitationTimer();
    const raw = scoreInput.value.trim();
    const num = parseFloat(raw);
    updateInputWidth(num);
  });

  function resetInvitationTimer() {
    if (invitationTimer) clearTimeout(invitationTimer);
    bottomRule.classList.remove('pulse-invitation');

    if (scoreInput.value.trim() === '') {
      invitationTimer = setTimeout(() => {
        bottomRule.classList.add('pulse-invitation');
      }, f(90));
    }
  }

  // Click anywhere on Band Strip to evaluate that score
  bandStrip.addEventListener('click', (e) => {
    if (isDragging) return;
    const rect = bandStrip.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    const clickedScore = getScoreFromPercentage(pct);
    scoreInput.value = clickedScore;
    updateInputWidth(clickedScore);
    runEvaluation(clickedScore);
  });

  // Initialize
  resetInvitationTimer();
  setupOdometer(0);
  renderStarRow(0);
  setBandMarkerPosition(0);
  updateBandActiveSegment('F');
  startShineCycle();
});
