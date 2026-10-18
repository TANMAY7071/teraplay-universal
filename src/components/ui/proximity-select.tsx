"use client";

import React, {
  forwardRef,
  useRef,
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
  type HTMLAttributes,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false | Record<string, boolean>)[]) {
  return twMerge(clsx(inputs));
}

const springs = {
  fast: { type: "spring" as const, duration: 0.08, bounce: 0 },
  moderate: { type: "spring" as const, duration: 0.16, bounce: 0.15 },
};

const shape = {
  bg: "rounded-xl",
  item: "rounded-xl",
  input: "rounded-full",
  focusRing: "rounded-xl",
  container: "rounded-2xl",
};

// ─── useProximityHover ────────────────────────────────────────────────────────

interface ItemRect { top: number; height: number; left: number; width: number; }

function useProximityHover<T extends HTMLElement>(containerRef: RefObject<T | null>) {
  const itemsRef = useRef(new Map<number, HTMLElement>());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [itemRects, setItemRects] = useState<ItemRect[]>([]);
  const itemRectsRef = useRef<ItemRect[]>([]);
  const sessionRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  const registerItem = useCallback((index: number, element: HTMLElement | null) => {
    if (element) itemsRef.current.set(index, element);
    else itemsRef.current.delete(index);
  }, []);

  const measureItems = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const rects: ItemRect[] = [];
    itemsRef.current.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      rects[index] = {
        top: rect.top - containerRect.top + container.scrollTop - container.clientTop,
        height: rect.height,
        left: rect.left - containerRect.left + container.scrollLeft - container.clientLeft,
        width: rect.width,
      };
    });
    itemRectsRef.current = rects;
    setItemRects(rects);
  }, [containerRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const mouseY = e.clientY;
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      let closestIndex: number | null = null; let closestDistance = Infinity; let containingIndex: number | null = null;
      const rects = itemRectsRef.current;
      for (let index = 0; index < rects.length; index++) {
        const r = rects[index]; if (!r) continue;
        const itemStart = containerRect.top + container.clientTop + r.top - container.scrollTop;
        const itemEnd = itemStart + r.height;
        if (mouseY >= itemStart && mouseY <= itemEnd) containingIndex = index;
        const distance = Math.abs(mouseY - (itemStart + r.height / 2));
        if (distance < closestDistance) { closestDistance = distance; closestIndex = index; }
      }
      setActiveIndex(containingIndex ?? closestIndex);
    });
  }, [containerRef]);

  const handleMouseEnter = useCallback(() => { sessionRef.current += 1; }, []);
  const handleMouseLeave = useCallback(() => {
    if (rafIdRef.current !== null) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
    setActiveIndex(null);
  }, []);

  useEffect(() => { return () => { if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current); }; }, []);

  return {
    activeIndex, setActiveIndex, itemRects, sessionRef,
    handlers: { onMouseMove: handleMouseMove, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave },
    registerItem, measureItems,
  };
}

// ─── Select Context ──────────────────────────────────────────────────────────

interface SelectContextValue {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  labelMap: React.MutableRefObject<Map<string, string>>;
}

const SelectContext = createContext<SelectContextValue | null>(null);
function useSelectContext() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select compound components must be inside <Select>");
  return ctx;
}

interface SelectContentContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number | null;
  checkedIndex?: number;
}

const SelectContentContext = createContext<SelectContentContextValue | null>(null);

// ─── Select (root) ───────────────────────────────────────────────────────────

interface SelectProps {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  required?: boolean;
}

function Select({ children, value, defaultValue, onValueChange, disabled = false, name, required }: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const currentValue = value !== undefined ? value : internalValue;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const labelMap = useRef(new Map<string, string>());
  const [, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const onChange = useCallback((v: string) => {
    if (value === undefined) setInternalValue(v);
    onValueChange?.(v);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [value, onValueChange]);

  return (
    <SelectContext.Provider value={{ value: currentValue, onChange, open, setOpen, disabled, triggerRef, labelMap }}>
      {children}
      {name && <input type="hidden" name={name} value={currentValue} required={required} />}
    </SelectContext.Provider>
  );
}

Select.displayName = "Select";

// ─── SelectTrigger ───────────────────────────────────────────────────────────

const triggerVariants = cva(
  ["group inline-flex items-center justify-between gap-2 outline-none cursor-pointer",
   "text-[12px] font-black h-10 px-4 min-w-[110px]", "transition-all duration-200",
   "disabled:opacity-50 disabled:pointer-events-none", "focus-visible:ring-1 focus-visible:ring-primary/40"],
  {
    variants: {
      variant: {
        bordered: "border border-white/10 bg-transparent hover:bg-white/[0.08] text-slate-300 hover:text-white",
        pill: "border border-white/15 bg-transparent hover:bg-white/[0.08] text-slate-300 hover:text-white backdrop-blur-md shadow-sm",
        borderless: "border border-transparent bg-transparent text-foreground hover:bg-muted",
      },
    },
    defaultVariants: { variant: "bordered" },
  }
);

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof triggerVariants> {
  icon?: LucideIcon;
  placeholder?: string;
  error?: string;
  active?: boolean;
}

const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, variant, icon: Icon, placeholder = "Select…", error, active = false, children, ...props }, ref) => {
    const { value, open, setOpen, disabled, triggerRef, labelMap } = useSelectContext();
    const label = value ? labelMap.current.get(value) ?? value : undefined;

    return (
      <div className="flex flex-col gap-1">
        <button
          ref={(node) => {
            (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          }}
          type="button" role="combobox" aria-expanded={open} aria-haspopup="listbox" disabled={disabled}
          onClick={() => setOpen(!open)}
          onKeyDown={(e) => { if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); setOpen(true); } }}
          aria-invalid={!!error || undefined}
          className={cn(
            triggerVariants({ variant }),
            shape.input,
            active && "border-primary/40 bg-primary/10 text-primary shadow-lg shadow-primary/5 ring-1 ring-primary/20",
            error && "border-destructive/50",
            className
          )}
          {...props}
        >
          <span className="flex items-center gap-1.5 min-w-0 flex-1">
            {Icon && <Icon size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground transition-[color] duration-150 group-hover:text-foreground" />}
            <span className="min-w-0 flex-1 text-left truncate">
              {children ?? label ?? <span className="text-muted-foreground">{placeholder}</span>}
            </span>
          </span>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0 text-zinc-400 transition-transform duration-200 group-hover:text-white", open && "rotate-180")}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {error && <span className="text-[12px] text-destructive pl-3">{error}</span>}
      </div>
    );
  }
);

SelectTrigger.displayName = "SelectTrigger";

// ─── SelectContent ───────────────────────────────────────────────────────────

interface SelectContentProps { className?: string; children: ReactNode; }

const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children }, ref) => {
    const { open, setOpen, value, triggerRef } = useSelectContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
    const [openUpward, setOpenUpward] = useState(false);
    const [maxHeightStyle, setMaxHeightStyle] = useState<number>(280);

    const { activeIndex, setActiveIndex, itemRects, sessionRef, handlers, registerItem, measureItems } = useProximityHover(containerRef);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [checkedIndex, setCheckedIndex] = useState<number | undefined>(undefined);

    const updateRect = useCallback(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setTriggerRect(rect);
        // Auto-close if trigger button scrolled completely off screen
        if (rect.bottom < -20 || rect.top > window.innerHeight + 20) {
          setOpen(false);
        }
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const shouldOpenUp = spaceBelow < 240 && spaceAbove > spaceBelow;
        setOpenUpward(shouldOpenUp);
        const available = shouldOpenUp ? spaceAbove - 24 : spaceBelow - 24;
        setMaxHeightStyle(Math.max(120, Math.min(available, 280)));
      }
    }, [triggerRef, setOpen]);

    useEffect(() => {
      if (!open) return;
      updateRect();
      window.addEventListener("scroll", updateRect, true);
      window.addEventListener("resize", updateRect);
      return () => {
        window.removeEventListener("scroll", updateRect, true);
        window.removeEventListener("resize", updateRect);
      };
    }, [open, updateRect]);

    useEffect(() => {
      if (!open || !triggerRect) return;
      let outer: number; let inner: number;
      outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => {
          measureItems();
          const container = containerRef.current;
          if (container) {
            const items = Array.from(container.querySelectorAll("[data-proximity-index]")) as HTMLElement[];
            const idx = items.findIndex((el) => el.getAttribute("data-value") === value);
            setCheckedIndex(idx !== -1 ? idx : undefined);
            containerRef.current?.focus({ preventScroll: true });
          }
        });
      });
      return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
    }, [open, triggerRect, measureItems, value]);

    useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [open, setOpen, triggerRef]);

    useEffect(() => {
      if (!open) return;
      const onPointer = (e: MouseEvent) => {
        if (!containerRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", onPointer);
      return () => document.removeEventListener("mousedown", onPointer);
    }, [open, setOpen, triggerRef]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      const items = Array.from(containerRef.current?.querySelectorAll('[role="option"]:not([data-disabled])') ?? []) as HTMLElement[];
      const currentIdx = items.indexOf(e.target as HTMLElement);
      if (["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        if (currentIdx === -1) { const checked = checkedIndex != null ? items[checkedIndex] : null; (checked ?? items[0])?.focus(); }
        else { const next = ["ArrowDown", "ArrowRight"].includes(e.key) ? (currentIdx + 1) % items.length : (currentIdx - 1 + items.length) % items.length; items[next]?.focus(); }
      } else if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); }
      else if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); }
    }, [checkedIndex]);

    if (!open) return <div hidden aria-hidden="true">{children}</div>;
    if (!triggerRect) return null;

    const activeRect = activeIndex !== null ? itemRects[activeIndex] : null;
    const checkedRect = checkedIndex != null ? itemRects[checkedIndex] : null;
    const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null;
    const isHoveringOther = activeIndex !== null && activeIndex !== checkedIndex;

    const portalStyle: React.CSSProperties = {
      position: "fixed",
      left: triggerRect.left,
      minWidth: Math.max(triggerRect.width, 160),
      zIndex: 1000,
      ...(openUpward
        ? { bottom: window.innerHeight - triggerRect.top + 6 }
        : { top: triggerRect.bottom + 6 })
    };

    return createPortal(
      <SelectContentContext.Provider value={{ registerItem, activeIndex, checkedIndex }}>
        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
          style={portalStyle}
        >
          <motion.div
            ref={(node) => {
              (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }}
            role="listbox" tabIndex={-1}
            data-lenis-prevent
            data-lenis-prevent-wheel
            data-lenis-prevent-touch
            onWheel={(e) => e.stopPropagation()}
            onMouseEnter={() => { handlers.onMouseEnter(); setFocusedIndex(null); }}
            onMouseMove={handlers.onMouseMove}
            onMouseLeave={handlers.onMouseLeave}
            onFocus={(e) => {
              const indexAttr = (e.target as HTMLElement).closest("[data-proximity-index]")?.getAttribute("data-proximity-index");
              if (indexAttr != null) { const idx = Number(indexAttr); setActiveIndex(idx); setFocusedIndex((e.target as HTMLElement).matches(":focus-visible") ? idx : null); }
            }}
            onBlur={(e) => { if (containerRef.current?.contains(e.relatedTarget as Node)) return; setFocusedIndex(null); setActiveIndex(null); }}
            onKeyDown={handleKeyDown}
            className={cn(`relative flex flex-col gap-0.5 overflow-y-auto overscroll-contain ${shape.container} bg-[#0e0f15] shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-white/10 p-1 select-none outline-none z-[1000]`, className)}
            initial={{ opacity: 0, y: openUpward ? 4 : -4, scaleY: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            transition={springs.fast}
            style={{ transformOrigin: openUpward ? "bottom center" : "top center", maxHeight: maxHeightStyle }}
          >
            <AnimatePresence>
              {checkedRect && (
                <motion.div className={`absolute ${shape.bg} bg-primary/20 border border-primary/30 pointer-events-none`} initial={false}
                  animate={{ top: checkedRect.top, left: checkedRect.left, width: checkedRect.width, height: checkedRect.height, opacity: isHoveringOther ? 0.6 : 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ ...springs.moderate, opacity: { duration: 0.08 } }} />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {activeRect && (
                <motion.div key={sessionRef.current} className={`absolute ${shape.bg} bg-white/10 pointer-events-none`}
                  initial={{ opacity: 0, top: checkedRect?.top ?? activeRect.top, left: checkedRect?.left ?? activeRect.left, width: checkedRect?.width ?? activeRect.width, height: checkedRect?.height ?? activeRect.height }}
                  animate={{ opacity: 1, top: activeRect.top, left: activeRect.left, width: activeRect.width, height: activeRect.height }}
                  exit={{ opacity: 0, transition: { duration: 0.06 } }} transition={{ ...springs.fast, opacity: { duration: 0.08 } }} />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {focusRect && (
                <motion.div className={`absolute ${shape.focusRing} pointer-events-none z-20 border border-primary`} initial={false}
                  animate={{ left: focusRect.left - 2, top: focusRect.top - 2, width: focusRect.width + 4, height: focusRect.height + 4 }}
                  exit={{ opacity: 0, transition: { duration: 0.06 } }} transition={{ ...springs.fast, opacity: { duration: 0.08 } }} />
              )}
            </AnimatePresence>
            {children}
          </motion.div>
        </div>
      </SelectContentContext.Provider>,
      document.body
    );
  }
);

SelectContent.displayName = "SelectContent";

// ─── SelectItem ──────────────────────────────────────────────────────────────

interface SelectItemProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  index: number;
  value: string;
  disabled?: boolean;
}

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, icon: Icon, value, index, disabled = false, ...props }, ref) => {
    const selectCtx = useSelectContext();
    const contentCtx = useContext(SelectContentContext);
    const internalRef = useRef<HTMLDivElement>(null);
    const hasMounted = useRef(false);

    useEffect(() => { hasMounted.current = true; }, []);
    useEffect(() => { if (typeof children === "string") selectCtx.labelMap.current.set(value, children); }, [value, children, selectCtx.labelMap]);
    useEffect(() => { contentCtx?.registerItem(index, internalRef.current); return () => contentCtx?.registerItem(index, null); }, [index, contentCtx]);

    const isActive = contentCtx?.activeIndex === index;
    const isChecked = selectCtx.value === value;
    const skipAnimation = !hasMounted.current;

    return (
      <div
        ref={(node) => {
          (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        data-proximity-index={index} data-value={value} data-disabled={disabled || undefined}
        role="option" aria-selected={isChecked} aria-label={typeof children === "string" ? children : undefined}
        tabIndex={isChecked ? 0 : index === (contentCtx?.checkedIndex ?? 0) ? 0 : -1}
        onClick={() => { if (!disabled) selectCtx.onChange(value); }}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !disabled) { e.preventDefault(); selectCtx.onChange(value); } }}
        className={cn(`relative z-10 flex items-center gap-2 ${shape.item} px-3 py-2 text-[12px] font-bold cursor-pointer outline-none select-none`, "transition-[color] duration-80", isChecked ? "text-primary font-black" : isActive ? "text-white" : "text-zinc-400", disabled && "opacity-50 pointer-events-none", className)}
        {...props}
      >
        {Icon && <Icon size={14} strokeWidth={isActive || isChecked ? 2 : 1.5} className="shrink-0 transition-[color,stroke-width] duration-80" />}
        <span className="flex-1 min-w-0 truncate">{children}</span>
        <AnimatePresence>
          {isChecked && (
            <motion.svg key="check" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 1 }}>
              <motion.path d="M4 12L9 17L20 6" initial={{ pathLength: skipAnimation ? 1 : 0 }} animate={{ pathLength: 1, transition: { duration: 0.08, ease: "easeOut" } }} exit={{ pathLength: 0, transition: { duration: 0.04, ease: "easeIn" } }} />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

SelectItem.displayName = "SelectItem";

// ─── SelectGroup / SelectLabel / SelectSeparator ─────────────────────────────

function SelectGroup({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="group" className={className} {...props}>{children}</div>;
}
SelectGroup.displayName = "SelectGroup";

const SelectLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("px-2 py-1.5 text-[11px] font-black uppercase text-zinc-500", className)} {...props} />
);
SelectLabel.displayName = "SelectLabel";

const SelectSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} role="separator" className={cn("my-1 -mx-1 h-px bg-white/10", className)} {...props} />
);
SelectSeparator.displayName = "SelectSeparator";

export { Select as ProximitySelect, SelectTrigger as ProximitySelectTrigger, SelectContent as ProximitySelectContent, SelectItem as ProximitySelectItem, SelectGroup as ProximitySelectGroup, SelectLabel as ProximitySelectLabel, SelectSeparator as ProximitySelectSeparator };
