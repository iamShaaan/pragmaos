# TaskMaster Premium Design System (Glitch AI Brand Match)

This document defines the visual design system and branding guidelines for the TaskMaster application, aligning it with the parent brand **Glitch AI Studio**. It guides the redesign for both desktop (PC) and mobile experiences.

## 1. Visual Theme: Glitch Cyber-Emerald (Premium)

TaskMaster uses the signature dark theme of Glitch AI Studio: a deep cyber-obsidian base (`#060d11`) with glowing emerald-green and cyan accents, plus glassmorphic layers to create a premium, state-of-the-art developer/productivity tool.

### 1.1 Color Palette
*   **Neutral Dark (Backgrounds & Foundations)**:
    *   Primary Background: `#060d11` (Glitch Charcoal Obsidian)
    *   Secondary Card Background: `rgba(255, 255, 255, 0.03)` (Frosted translucent layers)
    *   Border Accent: `rgba(255, 255, 255, 0.08)` (Subtle glass lines)
*   **Vibrant Accents (Primary & Brand Highlight)**:
    *   Brand Primary: `#26f7b2` (Neon Accent Emerald)
    *   Brand Secondary/Glow: `#009d9a` (Glitch Cyan)
    *   Gradient Accent: `linear-gradient(135deg, #26f7b2 0%, #009d9a 100%)`
*   **Semantic Accents**:
    *   Success: `#26f7b2` (Neon Emerald) - for completed tasks, positive values
    *   Warning: `#f59e0b` (Amber) - for pending, medium priority
    *   Danger/Alert: `#f43f5e` (Rose) - for high priority, deletions, logout

### 1.2 Glassmorphism & Depth
*   **Cards & Modals**:
    *   Apply `bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]`
    *   Add soft shadow: `shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]`
*   **Interactive Hover State**:
    *   Transition: `transition-all duration-300 ease-out`
    *   Hover effect: `hover:translate-y-[-2px] hover:border-[#26f7b2]/30 hover:shadow-[0_0_20px_rgba(38,247,178,0.12)]`

### 1.3 Shapes & Corners
*   **App Containers/Shells**: `rounded-3xl` (24px)
*   **Standard Cards/Sections**: `rounded-2xl` (16px)
*   **Buttons, Inputs, Badges**: `rounded-xl` (12px)

---

## 2. Typography

*   **Font Family**: `Inter, system-ui, -apple-system, sans-serif` (clean, tech-focused, high readability)
*   **Font Weights**:
    *   Titles/Headings: `font-bold` (700) or `font-extrabold` (800)
    *   Subtitles: `font-semibold` (600)
    *   Body/Labels: `font-medium` (500) or `font-normal` (400)

---

## 3. Responsive Layout Strategy (PC & Mobile)

### 3.1 Desktop (PC) layout
*   Permanent/collapsible left sidebar navigation (`Sidebar`) using the cyber-emerald theme.
*   Dashboard layout with clean grids, glowing card states, and prominent statistics.

### 3.2 Mobile layout
*   Responsive App Shell: Automatically collapses the sidebar into a drawer.
*   Mobile bottom navigation bar or topbar menu button for quick access.
*   Touch-friendly targets (minimum `44px` height).
*   Horizontal swipe cards for Kanban/lists to avoid vertical clutter.
