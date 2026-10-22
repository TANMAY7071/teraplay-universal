# Performance

A transition is cheap when the browser already knows what to do: name the properties that change,
keep the ones that move on the compositor, and leave everything else alone. This file is the short
version of that, and it is what the house CSS already does.

## Contents

1. Transition only what changes
2. Tailwind projects
3. `will-change`, and when it earns its keep
4. What a promotion changes besides speed
5. House rules

## 1. Transition only what changes

`transition: all` asks the browser to watch every property on an element and animate whichever one
happens to change. Two things go wrong with it.

- It animates properties nobody meant to animate. A theme flip, a hover that swaps a colour, a focus
  ring that changes a border width: each becomes a transition, and the page gets a wave of small
  changes that were never designed.
- On layout properties (`width`, `height`, `padding`, `margin`, `top`, `left`) it re-runs layout on
  every frame. That is the expensive path, and `all` includes it.

Tailwind's bare `transition` is a curated list rather than `all`, so it is better, but it still covers
more than most elements change: colour, background, border, fill, stroke, opacity, box-shadow,
transform, filter and backdrop-filter.

Name the properties instead:

```css
/* good: only what changes */
.button {
  transition-property: scale, background-color;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}

/* bad: everything */
.button {
  transition: all 150ms ease-out;
}
```

The house CSS already works this way: `.button` transitions `transform`, `background-color` and
`color`; `.btn` transitions `background-color` and `transform`; `.link` transitions
`text-decoration-color`. Copy that shape.

## 2. Tailwind projects

`transition-transform` covers `transform` only in Tailwind 3 and `transform`, `translate`, `scale` and
`rotate` in Tailwind 4. Use it when the only thing that moves is a transform. Mixing a transform with
anything else takes the bracket syntax.

```html
<!-- good: explicit properties -->
<button className="transition-[scale,background-color] duration-150 ease-out">

<!-- bad: transition all -->
<button className="transition-all duration-150 ease-out">
```

The lint rule `transition-all` flags the bad line; `scripts/lint.mjs` prints `lint: transition-all`
for it.

## 3. `will-change`, and when it earns its keep

`will-change` promotes an element to its own compositing layer ahead of time. Without it the browser
promotes when the animation starts, and that one-time promotion can stutter on the first frame. Each
extra layer costs memory, so never add it preemptively.

```css
/* good: names the property that animates */
.animated-card {
  will-change: scale, opacity;
}

/* bad: never all */
.animated-card {
  will-change: all;
}

/* bad: these never composite */
.animated-card {
  will-change: background-color, padding;
}
```

| Property | Worth `will-change` |
| --- | --- |
| `transform`, `translate`, `scale`, `rotate` | Yes |
| `opacity` | Yes |
| `filter` | Yes |
| `clip-path` | Rarely: compositing it is not reliable across browsers |
| `top`, `left`, `width`, `height` | No |
| `background`, `border`, `color` | No |

Set it on the element just before the move and remove it afterwards; a `will-change` left on at rest
keeps the layer and the memory. `references/motion.md` §8 carries the same rule for the motion pass.

## 4. What a promotion changes besides speed

`will-change` on a transform property or on `filter` makes the element the containing block for its
`position: fixed` descendants, so a fixed modal or tooltip inside it stops tracking the viewport.
Any of these values also creates a stacking context, which can reorder `z-index` against siblings.

So promote the moving element, never the wrapper that holds the dialog. A menu that slides out of a
promoted panel will sit at the wrong `z-index` unless the panel is the promoted one and the menu is
its child.

## 5. House rules

1. Name the properties that change. No `transition: all` (lint: `transition-all`).
2. Name the property that composites. No `will-change: all`, and no `will-change` on a layout or paint
   property.
3. Promote just before the move and unpromote after it.
4. Never promote an element that holds a fixed descendant.
5. Measure on the target phone before shipping. A promotion that costs memory on a low-end device is
   slower than the animation it was meant to help.
