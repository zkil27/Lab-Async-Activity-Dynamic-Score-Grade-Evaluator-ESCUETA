# Lab Async Activity: Dynamic Score & Grade Evaluator ESCUETA

**Author:** John Kiel Escueta  
**GitHub Repository:** [https://github.com/zkil27/Lab-Async-Activity-Dynamic-Score-Grade-Evaluator-ESCUETA](https://github.com/zkil27/Lab-Async-Activity-Dynamic-Score-Grade-Evaluator-ESCUETA)  
**Live Demo:** [https://zkil27.github.io/Lab-Async-Activity-Dynamic-Score-Grade-Evaluator-ESCUETA/](https://zkil27.github.io/Lab-Async-Activity-Dynamic-Score-Grade-Evaluator-ESCUETA/) *(if GitHub Pages enabled)*

---

## 📌 Project Overview

An interactive web application demonstrating modern web engineering, responsive layout design, and a 30fps motion graphics animation engine built using pure HTML, Vanilla CSS, and Vanilla JavaScript.

The application allows users to enter or scrub a score between 0 and 100, evaluates the grade in real time, and stages an animated sequence:
1. **Mechanical Shutter Mechanism** ("Hide the Cut"): Black bars sweep in to meet at the center, quietly swapping background color, grade letter, verdict typography, and stars behind a 3-frame hold on black.
2. **Hero Letter Settle**: The oversized grade letter emerges and snaps cleanly into place using a calibrated `--snap-out` deceleration curve with subpixel vector antialiasing.
3. **Mechanical Odometer Roll**: Score readout transitions smoothly using vertical digit strips, complete with dynamic tape roll-in and roll-out for extra digits (e.g. moving between 2-digit scores and 100).
4. **Interactive Band Scale**: A proportional distribution strip (F: 60%, D: 10%, C: 10%, B: 10%, A: 11%) with a continuous sliding marker assembly and real-time score badge.

---

## 🎯 Grading System

| Score Range | Grade | Verdict Text | Accent Hue | Star Rating |
| :--- | :---: | :--- | :--- | :---: |
| **90 – 100** | **A** | *Excellent performance!* | `#00E19B` (Mint-Electric) | ★★★★★ (5) |
| **80 – 89**  | **B** | *Good performance!* | `#2BB3FF` (Signal Cyan) | ★★★★☆ (4) |
| **70 – 79**  | **C** | *Average performance!* | `#FFD400` (Warning Yellow) | ★★★☆☆ (3) |
| **60 – 69**  | **D** | *Below average performance!* | `#FF7A1A` (Safety Orange) | ★★☆☆☆ (2) |
| **0 – 59**   | **F** | *Failing!* | `#FF2D2D` (Alarm Red) | ★☆☆☆☆ (1) |

---

## 🚀 Key Features

* **30fps Frame Grid**: Every duration and delay across all transitions is derived mathematically from `--f: 33.333ms`.
* **Neo-Brutalist Aesthetic**: High-contrast typography, 3px solid ink borders, flat colors, and geometric precision.
* **Fully Responsive**: Zero-scroll layout engineered to fit within 100vh on desktop, laptops, and mobile screens without pushing UI components out of view.
* **Accessibility**: ARIA live regions for screen readers, keyboard navigation, and `prefers-reduced-motion` compliance.

---

## 💻 Tech Stack

* **HTML5**: Semantic document structure and SVG assets.
* **CSS3 (Vanilla)**: CSS Grid, Flexbox, Variable Fonts (`Anybody`), CSS Custom Properties, Bezier curves.
* **JavaScript (Vanilla, ES6+)**: RAF-based physics interpolation, staggered frame scheduling, and DOM synchronization.

---

## 🛠️ How to Run Locally

1. Clone or download this repository:
   ```bash
   git clone https://github.com/zkil27/Lab-Async-Activity-Dynamic-Score-Grade-Evaluator-ESCUETA.git
   cd Lab-Async-Activity-Dynamic-Score-Grade-Evaluator-ESCUETA
   ```
2. Open `index.html` in any modern web browser or launch with a local static server:
   ```bash
   python -m http.server 8080
   # Open http://localhost:8080 in your browser
   ```
