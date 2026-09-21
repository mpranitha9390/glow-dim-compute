import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Calc — A Clean Calculator" },
      {
        name: "description",
        content:
          "A fast, tactile calculator with light and dark themes. Every button works: digits, operators, percent, sign, decimals, clear and backspace.",
      },
      { property: "og:title", content: "Calc — A Clean Calculator" },
      {
        property: "og:description",
        content:
          "A fast, tactile calculator with light and dark themes. Every button works.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Op = "+" | "−" | "×" | "÷";

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

function format(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "Error";
  const s = Number(n.toPrecision(12)).toString();
  if (Math.abs(Number(s)) >= 1e12 || (Math.abs(Number(s)) < 1e-9 && Number(s) !== 0)) {
    return Number(s).toExponential(6).replace("e", "e");
  }
  return s;
}

function Index() {
  const [dark, setDark] = useState(false);
  const [display, setDisplay] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true); // next digit starts a new number
  const [flash, setFlash] = useState(false);

  // Apply saved theme once mounted (avoids SSR mismatch)
  useEffect(() => {
    const saved = localStorage.getItem("calc-theme");
    if (saved === "dark") setDark(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("calc-theme", dark ? "dark" : "light");
  }, [dark]);

  const current = () => parseFloat(display.replace(/,/g, "")) || 0;

  function inputDigit(d: string) {
    if (fresh) {
      setDisplay(d === "." ? "0." : d);
      setFresh(false);
      return;
    }
    if (d === ".") {
      if (display.includes(".")) return;
      setDisplay(display + ".");
      return;
    }
    setDisplay(display === "0" ? d : display.length < 14 ? display + d : display);
  }

  function clearAll() {
    setDisplay("0");
    setAcc(null);
    setOp(null);
    setFresh(true);
  }

  function backspace() {
    if (fresh) return; // nothing being typed
    setDisplay(display.length <= 1 || (display.length === 2 && display.startsWith("-")) ? "0" : display.slice(0, -1));
  }

  function toggleSign() {
    if (display === "0" || display === "Error") return;
    setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
  }

  function percent() {
    const v = current() / 100;
    setDisplay(format(v));
    setFresh(true);
  }

  function chooseOp(next: Op) {
    const v = current();
    if (acc !== null && op !== null) {
      // A number was just typed: fold it into the running total.
      // Operator pressed twice in a row (fresh): just swap the operator.
      if (!fresh) {
        const r = compute(acc, v, op);
        setAcc(r);
        setDisplay(format(r));
      }
    } else {
      setAcc(v);
    }
    setOp(next);
    setFresh(true);
  }

  function equals() {
    if (acc === null || op === null) return;
    const r = compute(acc, current(), op);
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    setDisplay(format(r));
    setAcc(null);
    setOp(null);
    setFresh(true);
  }

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[0-9]$/.test(k)) inputDigit(k);
      else if (k === ".") inputDigit(".");
      else if (k === "+") chooseOp("+");
      else if (k === "-") chooseOp("−");
      else if (k === "*") chooseOp("×");
      else if (k === "/") chooseOp("÷");
      else if (k === "Enter" || k === "=") equals();
      else if (k === "Backspace") backspace();
      else if (k === "Escape") clearAll();
      else if (k === "%") percent();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const expression =
    acc !== null && op !== null
      ? `${format(acc)} ${op}${fresh ? "" : ` ${display}`}`
      : "";

  const keys: { label: string; kind: "fn" | "op" | "num" | "eq"; action: () => void; span?: boolean }[] = [
    { label: "AC", kind: "fn", action: clearAll },
    { label: "⌫", kind: "fn", action: backspace },
    { label: "%", kind: "fn", action: percent },
    { label: "÷", kind: "op", action: () => chooseOp("÷") },
    { label: "7", kind: "num", action: () => inputDigit("7") },
    { label: "8", kind: "num", action: () => inputDigit("8") },
    { label: "9", kind: "num", action: () => inputDigit("9") },
    { label: "×", kind: "op", action: () => chooseOp("×") },
    { label: "4", kind: "num", action: () => inputDigit("4") },
    { label: "5", kind: "num", action: () => inputDigit("5") },
    { label: "6", kind: "num", action: () => inputDigit("6") },
    { label: "−", kind: "op", action: () => chooseOp("−") },
    { label: "1", kind: "num", action: () => inputDigit("1") },
    { label: "2", kind: "num", action: () => inputDigit("2") },
    { label: "3", kind: "num", action: () => inputDigit("3") },
    { label: "+", kind: "op", action: () => chooseOp("+") },
    { label: "±", kind: "fn", action: toggleSign },
    { label: "0", kind: "num", action: () => inputDigit("0") },
    { label: ".", kind: "num", action: () => inputDigit(".") },
    { label: "=", kind: "eq", action: equals },
  ];

  const kindClasses: Record<string, string> = {
    num: "bg-key text-key-foreground hover:bg-key-hover active:scale-[0.96]",
    fn: "bg-muted text-muted-foreground hover:bg-accent active:scale-[0.96]",
    op: "bg-op text-op-foreground hover:bg-op-hover active:scale-[0.96]",
    eq: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.96]",
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 transition-colors">
      <div className="flex w-full max-w-sm items-center justify-between px-1 pb-4">
        <span className="text-sm font-medium tracking-wide text-muted-foreground">
          Calc
        </span>
        <button
          onClick={() => setDark((d) => !d)}
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-lg">
        {/* Display */}
        <div className="flex min-h-28 flex-col items-end justify-end gap-1 px-2 pb-4">
          <div className="h-5 text-sm tabular-nums text-muted-foreground">
            {expression}
          </div>
          <div
            className={`w-full truncate text-right text-5xl font-light tabular-nums transition-colors ${
              flash ? "text-primary" : "text-foreground"
            }`}
          >
            {display}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-2.5">
          {keys.map((k) => (
            <button
              key={k.label}
              onClick={k.action}
              aria-label={k.label === "±" ? "toggle sign" : k.label}
              className={`flex h-16 items-center justify-center rounded-2xl text-xl font-medium shadow-sm transition-all ${kindClasses[k.kind]}`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Tip: your keyboard works too — numbers, + − * /, Enter, Backspace, Esc
      </p>
    </div>
  );
}
