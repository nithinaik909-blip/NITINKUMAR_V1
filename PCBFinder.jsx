import { useState, useRef, useEffect, useCallback } from "react";

/* ─── Image loading: FileReader (works in sandboxed iframes) ─── */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadAndResizeImage(file, maxPx = 2400) {
  const dataUrl = await readFileAsDataUrl(file);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const out = canvas.toDataURL("image/jpeg", 0.95);
      resolve({ src: out, b64: out.split(",")[1], natW: w, natH: h });
    };
    img.onerror = () => resolve({ src: dataUrl, b64: dataUrl.split(",")[1], natW: 100, natH: 100 });
    img.src = dataUrl;
  });
}

/* Load an Image element from a b64 string */
function loadImgEl(b64) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = "data:image/jpeg;base64," + b64;
  });
}

/* Extract one tile of a loaded Image as high-quality JPEG b64 */
function extractTileB64(imgEl, tx, ty, tw, th) {
  const c = document.createElement("canvas");
  c.width = tw; c.height = th;
  c.getContext("2d").drawImage(imgEl, tx, ty, tw, th, 0, 0, tw, th);
  return c.toDataURL("image/jpeg", 0.95).split(",")[1];
}

/* ─── Claude API ─── */
async function claudeAPI(messages, maxTokens = 4096) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  return (data.content || []).map(b => b.text || " ").join(" ").replace(/`json\n?|`/g, " ").trim();
}

function safeJSON(s) { try { return JSON.parse(s); } catch { return []; } }

/* ─────────────────────────────────────────────────────────────────
   COMPREHENSIVE COMPONENT REFERENCE DATABASE
   Data compiled from: Component ID poster, PCB Quick Reference,
   Electronics Components Chart, Fundamentals Cheat Sheet
   ───────────────────────────────────────────────────────────────── */
const COMP_DB = {
  /* ── Resistor Color Code ── */
  resistorColors: [
    { name: "Black",  digit: 0, multiplier: 1,      tolerance: null,    tempCoeff: 250  },
    { name: "Brown",  digit: 1, multiplier: 10,     tolerance: "±1%",   tempCoeff: 100  },
    { name: "Red",    digit: 2, multiplier: 100,    tolerance: "±2%",   tempCoeff: 50   },
    { name: "Orange", digit: 3, multiplier: 1000,   tolerance: "±0.05%",tempCoeff: 15   },
    { name: "Yellow", digit: 4, multiplier: 10000,  tolerance: "±0.02%",tempCoeff: 25   },
    { name: "Green",  digit: 5, multiplier: 100000, tolerance: "±0.5%", tempCoeff: 20   },
    { name: "Blue",   digit: 6, multiplier: 1e6,    tolerance: "±0.25%",tempCoeff: 10   },
    { name: "Violet", digit: 7, multiplier: 1e7,    tolerance: "±0.1%", tempCoeff: 5    },
    { name: "Grey",   digit: 8, multiplier: 1e8,    tolerance: "±0.05%",tempCoeff: 1    },
    { name: "White",  digit: 9, multiplier: 1e9,    tolerance: null,    tempCoeff: null },
    { name: "Gold",   digit: null, multiplier: 0.1, tolerance: "±5%",   tempCoeff: null },
    { name: "Silver", digit: null, multiplier: 0.01,tolerance: "±10%",  tempCoeff: null },
    { name: "None",   digit: null, multiplier: null, tolerance: "±20%",  tempCoeff: null },
  ],
  colorHex: {
    Black:"#1a1a1a", Brown:"#8B4513", Red:"#dc2626", Orange:"#f97316",
    Yellow:"#eab308", Green:"#16a34a", Blue:"#2563eb", Violet:"#7c3aed",
    Grey:"#6b7280", White:"#f8fafc", Gold:"#d4a017", Silver:"#9ca3af", None:"#e5e7eb"
  },

  /* ── SMT Chip Size Conversion ── */
  smtChipSizes: [
    { metric:"0402", imperial:"01005", mmW:0.4, mmH:0.2 },
    { metric:"0603", imperial:"0201",  mmW:0.6, mmH:0.3 },
    { metric:"1005", imperial:"0402",  mmW:1.0, mmH:0.5 },
    { metric:"1608", imperial:"0603",  mmW:1.6, mmH:0.8 },
    { metric:"2012", imperial:"0805",  mmW:2.0, mmH:1.2 },
    { metric:"2520", imperial:"1008",  mmW:2.5, mmH:2.0 },
    { metric:"3216", imperial:"1206",  mmW:3.2, mmH:1.6 },
    { metric:"3225", imperial:"1210",  mmW:3.2, mmH:2.5 },
    { metric:"4516", imperial:"1806",  mmW:4.5, mmH:1.6 },
    { metric:"4532", imperial:"1812",  mmW:4.5, mmH:3.2 },
    { metric:"5025", imperial:"2010",  mmW:5.0, mmH:2.5 },
    { metric:"6332", imperial:"2512",  mmW:6.3, mmH:3.2 },
  ],

  /* ── Package Types ── */
  packages: {
    leadless: [
      { name:"SMD Capacitor",        desc:"Rectangular ceramic/tantalum body, no leads, pads on bottom" },
      { name:"Tantalum SMD Cap",     desc:"Rectangular body with polarity stripe, yellow/orange color common" },
      { name:"MELF Resistor",        desc:"Cylindrical body, Metal Electrode Leadless Face, color bands visible" },
      { name:"LED Diode (SMD)",      desc:"Small rectangular body, clear/coloured lens, 2 pads" },
      { name:"SMD Crystal",          desc:"Metal or ceramic can, rectangular, 2 or 4 pads" },
      { name:"SMD Resistor",         desc:"Tiny rectangular ceramic body, numeric value printed on top" },
      { name:"QFN Single Row",       desc:"Flat no-lead IC, pads on perimeter bottom, exposed thermal pad" },
      { name:"QFN Dual Row",         desc:"Two rows of perimeter pads, exposed thermal pad beneath" },
      { name:"LGA",                  desc:"Land Grid Array, pads on bottom only, no balls or leads" },
      { name:"BGA (Plastic)",        desc:"Ball Grid Array, solder balls on bottom, high pin count" },
      { name:"BGA (Metal)",          desc:"Metal lid BGA, typically high-performance processor/FPGA" },
    ],
    leaded: [
      { name:"QFP",    desc:"Quad Flat Package, leads on all 4 sides, 32–256+ pins" },
      { name:"TQFP",   desc:"Thin QFP, reduced height version" },
      { name:"LQFP",   desc:"Low-profile QFP" },
      { name:"DPAK",   desc:"Discrete Power Package (TO-252), tab for heat dissipation" },
      { name:"SOIC-8", desc:"Small Outline IC, 8 pins, 2 rows of gull-wing leads" },
      { name:"SOIC-16",desc:"16-pin SOIC" },
      { name:"PLCC",   desc:"Plastic Leaded Chip Carrier, J-leads on all 4 sides, 20–84 pins" },
      { name:"SOT-23", desc:"Small Outline Transistor, 3 leads (or 5/6 for SOT-23-5/6)" },
      { name:"SOD-123",desc:"Small Outline Diode, 2 leads, smaller than SOD-323" },
      { name:"SOD-323",desc:"Smaller diode package" },
      { name:"TO-220", desc:"Through-hole power device, metal tab, 3 leads" },
      { name:"TO-92",  desc:"Through-hole small transistor, plastic half-cylinder, 3 leads" },
      { name:"TO-247", desc:"Large through-hole power MOSFET/transistor" },
      { name:"DIP-8",  desc:"Dual In-line Package, 8 pins, 2.54mm pitch, through-hole" },
      { name:"DIP-14", desc:"14-pin DIP" },
      { name:"DIP-16", desc:"16-pin DIP" },
      { name:"DIP-28", desc:"28-pin DIP, typical for microcontrollers like ATmega328" },
      { name:"SOT-223",desc:"3-terminal voltage regulator SMD package, tab is one terminal" },
      { name:"D2PAK",  desc:"TO-263, surface-mount power package" },
    ],
    mountingStyles: [
      { name:"Castellated",               desc:"Half-holes on PCB edge, used for module boards" },
      { name:"Flat No-Lead (QFN/DFN)",    desc:"Pads on bottom/perimeter, no protruding leads" },
      { name:"Ball Grid Array (BGA)",     desc:"Solder balls on bottom, reflow soldered" },
      { name:"Gull Wing (SOIC/QFP)",      desc:"Leads bend outward and down, visible for inspection" },
      { name:"Butt/I Lead",               desc:"Leads bent straight down, soldered to surface" },
      { name:"Inward L-shaped Ribbon",    desc:"Leads bent inward under body" },
      { name:"J-Lead (PLCC/SOJ)",         desc:"Leads bent under body in J shape" },
    ]
  },

  /* ── Component Quick Reference (from PCB Reference Table) ── */
  quickRef: [
    { des:"R",  name:"Resistor",         fn:"Limiting current",           vals:"1kΩ, 10kΩ",               symbol:"⊏⊐", color:"#8b5cf6" },
    { des:"C",  name:"Capacitor",        fn:"Storing electrical charge",  vals:"10µF, 100µF",              symbol:"⊣⊢", color:"#3b82f6" },
    { des:"D",  name:"Diode",            fn:"Allows current one direction",vals:"1N4148, 1N4001",           symbol:"▷|", color:"#f97316" },
    { des:"Q",  name:"Transistor",       fn:"Amplifies or switches signals",vals:"2N3904, BC547",           symbol:"⊳",  color:"#84cc16" },
    { des:"U",  name:"IC / Connector",   fn:"Performs various functions",  vals:"555, 7404",               symbol:"▭",  color:"#f59e0b" },
    { des:"J",  name:"Connector",        fn:"Provides connection to PCB",  vals:"2.54mm, 10-pin",          symbol:"⊟",  color:"#ec4899" },
    { des:"T",  name:"Transformer",      fn:"Transfers electrical energy", vals:"5:1, 10:1",               symbol:"⊗⊗", color:"#14b8a6" },
    { des:"L",  name:"Inductor/Coil",    fn:"Stores energy in magnetic field",vals:"10µH, 100µH",          symbol:"∿",  color:"#06b6d4" },
    { des:"Y",  name:"Crystal/Oscillator",fn:"Frequency reference",       vals:"8MHz, 16MHz, 32.768kHz",  symbol:"⊡",  color:"#6366f1" },
    { des:"F",  name:"Fuse",             fn:"Overcurrent protection",      vals:"500mA, 1A, 3A",           symbol:"—",  color:"#ef4444" },
    { des:"K",  name:"Relay",            fn:"Electrically controlled switch",vals:"5V, 12V coil",          symbol:"⊠",  color:"#64748b" },
    { des:"FB", name:"Ferrite Bead",     fn:"EMI suppression/filtering",   vals:"600Ω @ 100MHz",           symbol:"⊞",  color:"#475569" },
    { des:"SW", name:"Switch",           fn:"Manual circuit control",      vals:"SPDT, DPDT",              symbol:"⌁",  color:"#059669" },
    { des:"TP", name:"Test Point",       fn:"Debug / probe access",        vals:"—",                       symbol:"⊕",  color:"#94a3b8" },
    { des:"BT", name:"Battery",          fn:"Power source",                vals:"3V CR2032, 9V",           symbol:"⊞⊟", color:"#f59e0b" },
    { des:"VR", name:"Voltage Regulator",fn:"Regulated DC output",         vals:"7805(+5V), 7812(+12V), AMS1117", symbol:"▭", color:"#14b8a6" },
    { des:"Z",  name:"Zener Diode",      fn:"Voltage regulation/clamping", vals:"3.3V, 5.1V, 12V",        symbol:"▷‖", color:"#f97316" },
  ],

  /* ── Component Testing Guide (from Electronics Components Chart) ── */
  testingGuide: [
    {
      name:"Resistor",  designators:["R","PR"], measUnit:"Ohms (Ω)", meter:"Resistance",
      test:"Set multimeter to Ohms. Touch red and black probes across both legs.",
      ok:"Meter shows rated value", open:"No value / OL (open circuit)", short:"Shows 0Ω or near-zero"
    },
    {
      name:"Capacitor", designators:["C","PC"], measUnit:"Farads (F)", meter:"Capacitance or Ohms",
      test:"Discharge cap first! Set to capacitance mode, touch probes to both legs.",
      ok:"Shows rated capacitance", open:"No value, no charge", short:"Beep / 0Ω (shorted)"
    },
    {
      name:"Diode (normal/Zener)", designators:["D","PD"], measUnit:"Ohms (Ω)", meter:"Diode / Resistance",
      test:"Red probe → Anode (+), Black → Cathode (stripe). Then reverse.",
      ok:"Forward bias: low resistance (~0.6V drop). Reverse: high resistance",
      open:"Both directions: high resistance", short:"Both directions: 0Ω"
    },
    {
      name:"LED", designators:["LED"], measUnit:"Ohms (Ω)", meter:"Diode",
      test:"Red probe → Anode (+/longer leg), Black → Cathode (shorter/stripe). LED should light faintly.",
      ok:"Forward bias: low resistance, LED glows", open:"No glow, high resistance",
      short:"0Ω in both directions"
    },
    {
      name:"Transistor (BJT)", designators:["Q","PQ","U"], measUnit:"Ohms (Ω)", meter:"Diode/Resistance",
      test:"NPN/PNP: insert legs into multimeter hFE slot, or test base-emitter & base-collector junctions.",
      ok:"Shows hFE gain value (20–500 typical)", open:"No value", short:"Beep on any two legs"
    },
    {
      name:"MOSFET", designators:["Q","PQ"], measUnit:"Ohms (Ω)", meter:"Resistance",
      test:"Check for shorts between all 3 legs (D, G, S). Apply voltage to Gate to switch on.",
      ok:"No shorting between any two legs", open:"Not applicable", short:"Shorts between any 2 legs = faulty"
    },
    {
      name:"Fuse", designators:["F","PF"], measUnit:"Ohms (Ω)", meter:"Continuity",
      test:"Place probes on both ends of fuse.",
      ok:"Continuity (near 0Ω) = fuse intact", open:"Not applicable", short:"No continuity (OL) = fuse blown"
    },
    {
      name:"Coil/Inductor", designators:["L","PL"], measUnit:"Ohms (Ω)", meter:"Resistance",
      test:"Place red and black probes on both terminals.",
      ok:"Near 0Ω (short = coil intact)", open:"No continuity = coil open (broken wire)", short:"Not applicable"
    },
    {
      name:"Transformer/Inductor", designators:["T"], measUnit:"Ohms (Ω)", meter:"Resistance",
      test:"Check primary winding, then secondary winding separately.",
      ok:"No connection between primary and secondary coils", open:"Not applicable",
      short:"Continuity between primary and secondary = shorted"
    },
    {
      name:"Crystal / Oscillator", designators:["Y","X"], measUnit:"Frequency (Hz)", meter:"CRO/Oscilloscope",
      test:"Connect two CRO probes across crystal terminals while in circuit.",
      ok:"Shows waveform at rated frequency", open:"No waveform = dead crystal", short:"Not applicable"
    },
    {
      name:"RTC (Real-Time Clock)", designators:["U","PU"], measUnit:"Frequency (Hz)", meter:"CRO/Oscilloscope",
      test:"Connect CRO probe to output pin while powered.",
      ok:"Shows waveform at crystal frequency", open:"No waveform = faulty", short:"Not applicable"
    },
  ],

  /* ── LED Colour Characteristics ── */
  ledColors: [
    { color:"Infrared", wavelength:"850–940nm", fwdVoltage:1.2, hex:"#3d0066" },
    { color:"Red",       wavelength:"620–750nm", fwdVoltage:1.8, hex:"#dc2626" },
    { color:"Orange",    wavelength:"590–620nm", fwdVoltage:2.0, hex:"#f97316" },
    { color:"Yellow",    wavelength:"565–590nm", fwdVoltage:2.2, hex:"#eab308" },
    { color:"Green",     wavelength:"500–570nm", fwdVoltage:3.5, hex:"#16a34a" },
    { color:"Blue",      wavelength:"450–500nm", fwdVoltage:3.6, hex:"#2563eb" },
    { color:"White",     wavelength:"450–940nm", fwdVoltage:4.0, hex:"#e2e8f0" },
    { color:"UV",        wavelength:"380–400nm", fwdVoltage:3.5, hex:"#6d28d9" },
  ],

  /* ── SMD Code Decoder Rules ── */
  smdCodes: {
    resistor3digit: "3 digits: first 2 = significant digits, 3rd = multiplier (power of 10). e.g. 473 = 47×10³ = 47,000Ω = 47kΩ",
    resistor4digit: "4 digits: first 3 = significant digits, 4th = multiplier. e.g. 4702 = 470×10² = 47,000Ω",
    resistorRadix:  "Radix point replaces R: 4R7 = 4.7Ω, 0R47 = 0.47Ω, 4K7 = 4.7kΩ, 4M7 = 4.7MΩ",
    capacitor3digit:"3 digits: first 2 = significant, 3rd = multiplier of pF. e.g. 104 = 10×10⁴pF = 100nF = 0.1µF",
    capacitorTant:  "Tantalum: 473 = 47×10³pF = 47nF. Electrolytic: printed directly, e.g. 47µF 16V",
  },

  /* ── Common Capacitor Values ── */
  capacitorConversion: [
    { uf:"0.000001", nf:"0.001", pf:"1" },
    { uf:"0.00001",  nf:"0.01",  pf:"10" },
    { uf:"0.0001",   nf:"0.1",   pf:"100" },
    { uf:"0.001",    nf:"1",     pf:"1,000" },
    { uf:"0.01",     nf:"10",    pf:"10,000" },
    { uf:"0.1",      nf:"100",   pf:"100,000" },
    { uf:"1",        nf:"1,000", pf:"1,000,000" },
  ],

  /* ── Ohm's Law ── */
  ohmsLaw: {
    formula: "V = I × R",
    variants: ["V = I × R", "I = V / R", "R = V / I", "P = V × I", "P = I² × R", "P = V² / R"],
    units: { V:"Volts", I:"Amperes", R:"Ohms (Ω)", P:"Watts" }
  },

  /* ── Metric Prefixes ── */
  metricPrefixes: [
    { name:"Tera",  sym:"T", exp:12,  val:"1,000,000,000,000" },
    { name:"Giga",  sym:"G", exp:9,   val:"1,000,000,000" },
    { name:"Mega",  sym:"M", exp:6,   val:"1,000,000" },
    { name:"Kilo",  sym:"k", exp:3,   val:"1,000" },
    { name:"Hecto", sym:"h", exp:2,   val:"100" },
    { name:"Deka",  sym:"da",exp:1,   val:"10" },
    { name:"(base)",sym:"",  exp:0,   val:"1" },
    { name:"Deci",  sym:"d", exp:-1,  val:"0.1" },
    { name:"Centi", sym:"c", exp:-2,  val:"0.01" },
    { name:"Milli", sym:"m", exp:-3,  val:"0.001" },
    { name:"Micro", sym:"µ", exp:-6,  val:"0.000 001" },
    { name:"Nano",  sym:"n", exp:-9,  val:"0.000 000 001" },
    { name:"Pico",  sym:"p", exp:-12, val:"0.000 000 000 001" },
  ],

  /* ── LM78XX Voltage Regulator Common Outputs ── */
  regulators: [
    { part:"7805", output:"+5V",  desc:"5V positive regulator, 1A, TO-220" },
    { part:"7812", output:"+12V", desc:"12V positive regulator, 1A, TO-220" },
    { part:"7905", output:"−5V",  desc:"5V negative regulator" },
    { part:"7912", output:"−12V", desc:"12V negative regulator" },
    { part:"AMS1117-3.3", output:"+3.3V", desc:"3.3V LDO, SOT-223 or TO-252" },
    { part:"AMS1117-5.0", output:"+5V",   desc:"5V LDO, SOT-223 or TO-252" },
    { part:"LM317",  output:"Adj 1.25–37V", desc:"Adjustable positive regulator" },
    { part:"LM7805", output:"+5V", desc:"Classic 5V regulator, TO-220" },
  ],

  /* ── Electrical Units ── */
  electricalUnits: [
    { qty:"Capacitance", sym:"F",  unit:"Farad",    abbrev:"F" },
    { qty:"Charge",      sym:"Q",  unit:"Coulomb",  abbrev:"C" },
    { qty:"Current",     sym:"I",  unit:"Ampere",   abbrev:"A" },
    { qty:"Energy",      sym:"E/J",unit:"Joule",    abbrev:"J" },
    { qty:"Frequency",   sym:"f",  unit:"Hertz",    abbrev:"Hz"},
    { qty:"Inductance",  sym:"H",  unit:"Henry",    abbrev:"H" },
    { qty:"Magnetic Flux",sym:"Wb",unit:"Weber",    abbrev:"Wb"},
    { qty:"Voltage",     sym:"V",  unit:"Volt",     abbrev:"V" },
    { qty:"Power",       sym:"P",  unit:"Watt",     abbrev:"W" },
    { qty:"Resistance",  sym:"R",  unit:"Ohm",      abbrev:"Ω" },
    { qty:"Force",       sym:"N",  unit:"Newton",   abbrev:"N" },
  ],

  /* ── 555 Timer IC Pinout ── */
  ic555: {
    package:"8-Pin DIP",
    pins:[
      { n:1, name:"GND",       fn:"Ground" },
      { n:2, name:"TRIGGER",   fn:"Starts timing cycle when < 1/3 Vcc" },
      { n:3, name:"OUTPUT",    fn:"High/Low output" },
      { n:4, name:"RESET",     fn:"Active low reset" },
      { n:5, name:"CONTROL",   fn:"Access to internal voltage divider" },
      { n:6, name:"THRESHOLD", fn:"Ends timing when > 2/3 Vcc" },
      { n:7, name:"DISCHARGE", fn:"Discharges timing capacitor" },
      { n:8, name:"Vcc",       fn:"Supply voltage (5–15V)" },
    ]
  },
};

/* ── Resistor value calculator ── */
function calcResistor4Band(b1, b2, mult, tol) {
  const c = COMP_DB.resistorColors;
  const d1 = c.find(x => x.name === b1)?.digit;
  const d2 = c.find(x => x.name === b2)?.digit;
  const m  = c.find(x => x.name === mult)?.multiplier;
  const t  = c.find(x => x.name === tol)?.tolerance || "";
  if (d1 == null || d2 == null || !m) return null;
  const val = (d1 * 10 + d2) * m;
  let display = val >= 1e6 ? `${val/1e6}MΩ` : val >= 1e3 ? `${val/1e3}kΩ` : `${val}Ω`;
  return { value: val, display, tolerance: t };
}

/* ── SMD code decoder ── */
function decodeSMD(code) {
  if (!code) return null;
  const s = code.trim().toUpperCase();
  // Radix R/K/M
  if (/^\d+R\d+$/.test(s)) { const [a,b] = s.split("R"); return { value:`${a}.${b} Ω`, type:"Resistor (Radix)" }; }
  if (/^\d+K\d+$/.test(s)) { const [a,b] = s.split("K"); return { value:`${a}.${b} kΩ`, type:"Resistor (Radix)" }; }
  if (/^\d+M\d+$/.test(s)) { const [a,b] = s.split("M"); return { value:`${a}.${b} MΩ`, type:"Resistor (Radix)" }; }
  if (/^0R\d+$/.test(s))   { const v = parseInt(s.slice(2)); return { value:`0.${v} Ω`, type:"Resistor (Radix)" }; }
  // 3-digit
  if (/^\d{3}$/.test(s)) {
    const sig = parseInt(s.slice(0,2)), exp = parseInt(s[2]);
    const val = sig * Math.pow(10, exp);
    return { value: val >= 1e6 ? `${val/1e6}MΩ` : val >= 1e3 ? `${val/1e3}kΩ` : `${val}Ω`, type:"Resistor (3-digit)" };
  }
  // 4-digit
  if (/^\d{4}$/.test(s)) {
    const sig = parseInt(s.slice(0,3)), exp = parseInt(s[3]);
    const val = sig * Math.pow(10, exp);
    return { value: val >= 1e6 ? `${val/1e6}MΩ` : val >= 1e3 ? `${val/1e3}kΩ` : `${val}Ω`, type:"Resistor (4-digit)" };
  }
  return null;
}

/* ─── Pan/Zoom: CSS transform + window drag listeners ─── */
function PanZoom({ children, bg = "#0f172a", onLogicalClick, fill }) {
  const ref = useRef();
  const sv = useRef({ zoom: 1, px: 0, py: 0 });
  const drag = useRef(null);
  const pinch = useRef(null);
  const [zoom, setZoom] = useState(1);
  const apply = (z, px, py) => {
    sv.current = { zoom: z, px, py };
    setZoom(z);
    if (ref.current) {
      const inner = ref.current.querySelector(".pz-inner");
      if (inner) inner.style.transform = `translate(${px}px,${py}px) scale(${z})`;
    }
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wheel = e => {
      e.preventDefault();
      const { zoom: z, px, py } = sv.current;
      const nz = Math.min(Math.max(z * (e.deltaY < 0 ? 1.12 : 0.89), 0.2), 8);
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      apply(nz, mx - (mx - px) * (nz / z), my - (my - py) * (nz / z));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  const startDrag = e => {
    e.preventDefault();
    const { px, py } = sv.current;
    drag.current = { sx: e.clientX - px, sy: e.clientY - py, moved: false, ox: e.clientX, oy: e.clientY };
    const move = ev => {
      if (!drag.current) return;
      const dx = ev.clientX - drag.current.ox, dy = ev.clientY - drag.current.oy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.current.moved = true;
      apply(sv.current.zoom, ev.clientX - drag.current.sx, ev.clientY - drag.current.sy);
    };
    const up = ev => {
      if (drag.current && !drag.current.moved && onLogicalClick) {
        const rect = ref.current.getBoundingClientRect();
        const { zoom: z, px: px2, py: py2 } = sv.current;
        onLogicalClick((ev.clientX - rect.left - px2) / z, (ev.clientY - rect.top - py2) / z);
      }
      drag.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const startTouch = e => {
    if (e.touches.length === 1) {
      const { px, py } = sv.current;
      drag.current = { sx: e.touches[0].clientX - px, sy: e.touches[0].clientY - py, moved: false, ox: e.touches[0].clientX, oy: e.touches[0].clientY };
      pinch.current = null;
    } else if (e.touches.length === 2) {
      drag.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
      pinch.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const moveTouch = e => {
    e.preventDefault();
    if (e.touches.length === 1 && drag.current) {
      const dx = e.touches[0].clientX - drag.current.ox, dy = e.touches[0].clientY - drag.current.oy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.current.moved = true;
      apply(sv.current.zoom, e.touches[0].clientX - drag.current.sx, e.touches[0].clientY - drag.current.sy);
    } else if (e.touches.length === 2 && pinch.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.sqrt(dx * dx + dy * dy);
      const nz = Math.min(Math.max(sv.current.zoom * (d / pinch.current), 0.2), 8);
      pinch.current = d; apply(nz, sv.current.px, sv.current.py);
    }
  };

  const endTouch = e => {
    if (e.changedTouches.length === 1 && drag.current && !drag.current.moved && onLogicalClick) {
      const rect = ref.current.getBoundingClientRect();
      const { zoom: z, px, py } = sv.current;
      onLogicalClick((e.changedTouches[0].clientX - rect.left - px) / z, (e.changedTouches[0].clientY - rect.top - py) / z);
    }
    drag.current = null; pinch.current = null;
  };

  const z = zoom;
  return (
    <div ref={ref} style={{ position: "relative", overflow: "hidden", background: bg, touchAction: "none", cursor: z > 1.05 ? "grab" : "crosshair", userSelect: "none", width: "100%", height: fill ? "100%" : "auto" }}
      onMouseDown={startDrag} onTouchStart={startTouch} onTouchMove={moveTouch} onTouchEnd={endTouch}>
      <div className="pz-inner" style={{ transformOrigin: "0 0", willChange: "transform" }}>
        {children}
        <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", flexDirection: "column", gap: 3, zIndex: 20 }}>
          {[{ l: "+", fn: () => { const { zoom: z2, px, py } = sv.current; apply(Math.min(z2 * 1.25, 8), px, py); } },
          { l: "−", fn: () => { const { zoom: z2, px, py } = sv.current; apply(Math.max(z2 * 0.8, 0.2), px, py); } },
          { l: "⊡", fn: () => apply(1, 0, 0) }].map(({ l, fn }) => (
            <button key={l} onClick={e => { e.stopPropagation(); fn(); }}
              style={{ width: 26, height: 26, background: "rgba(0,0,0,.72)", color: "#fff", border: "1px solid rgba(255,255,255,.22)", borderRadius: 5, fontSize: l === "⊡" ? 11 : 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {l}
            </button>
          ))}
          <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,.65)", color: "#a7f3d0", fontSize: 10, fontFamily: "monospace", padding: "2px 6px", borderRadius: 4, pointerEvents: "none" }}>
            {Math.round(z * 100)}%
          </div>
        </div>
        {z < 1.1 && <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 10, padding: "3px 11px", borderRadius: 20, pointerEvents: "none", whiteSpace: "nowrap" }}>
          🖱 Scroll to zoom · Drag to pan · Click to select
        </div>}
      </div>
    </div>
  );
}

/* ─── PCB canvas drawing ─── */
const CW = 1400, CH = 900;
const DIFF_CLR = { ok: "#00e676", missing: "#ff1744", extra: "#2979ff", mismatch: "#ff9100", none: "#00e676" };

/* Compute letterbox layout so bbox coords map onto the actual image area */
function imgLayout(imgEl) {
  if (!imgEl || !imgEl.complete || !imgEl.naturalWidth) return { dx: 0, dy: 0, dw: CW, dh: CH };
  const scale = Math.min(CW / imgEl.naturalWidth, CH / imgEl.naturalHeight);
  const dw = imgEl.naturalWidth * scale, dh = imgEl.naturalHeight * scale;
  return { dx: (CW - dw) / 2, dy: (CH - dh) / 2, dw, dh };
}

/* Convert bbox % → canvas px using letterbox layout */
function bboxToPx(bbox, layout) {
  const { dx, dy, dw, dh } = layout;
  return {
    bx: dx + bbox.x / 100 * dw,
    by: dy + bbox.y / 100 * dh,
    bw: bbox.w / 100 * dw,
    bh: bbox.h / 100 * dh,
  };
}

/* Convert canvas px → bbox % (for click hit-testing) */
function pxToBboxPct(cx, cy, layout) {
  const { dx, dy, dw, dh } = layout;
  return { px: (cx - dx) / dw * 100, py: (cy - dy) / dh * 100 };
}

function drawPCB(canvas, comps, selLoc, imgEl, diffMap = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, CW, CH);
  const layout = imgLayout(imgEl);
  if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
    const { dx, dy, dw, dh } = layout;
    ctx.fillStyle = "#111"; ctx.fillRect(0, 0, CW, CH);
    ctx.drawImage(imgEl, dx, dy, dw, dh);
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(dx, dy, dw, dh);
  } else {
    ctx.fillStyle = "#1a4015"; ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 0.5;
    for (let x = 0; x < CW; x += 22) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
    for (let y = 0; y < CH; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }
  }
  if (!comps.length) {
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "13px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(imgEl ? "Awaiting comparison…" : "Upload PCB image", CW / 2, CH / 2);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; return;
  }
  const slotW = CW / comps.length;
  const sortedByX = [...comps].sort((a, b) => (a.bbox ? (a.bbox.x + a.bbox.w / 2) : 50) - (b.bbox ? (b.bbox.x + b.bbox.w / 2) : 50));
  const lxMap = {}; sortedByX.forEach((c, i) => { lxMap[c.loc] = slotW * i + slotW / 2; });
  comps.forEach(comp => {
    if (!comp.bbox) return;
    const { bx, by, bw, bh } = bboxToPx(comp.bbox, layout);
    const cx = bx + bw / 2, cy = by + bh / 2;
    const isSel = selLoc === comp.loc;
    const diffStatus = diffMap[comp.loc] || "none";
    const clr = isSel ? "#facc15" : (DIFF_CLR[diffStatus] || DIFF_CLR.none);
    const fillAlpha = diffStatus === "missing" ? "0.25" : diffStatus === "mismatch" ? "0.20" : diffStatus === "extra" ? "0.20" : "0.10";
    ctx.fillStyle = `rgba(${diffStatus === "missing" ? "255,23,68" : diffStatus === "mismatch" ? "255,145,0" : diffStatus === "extra" ? "41,121,255" : "0,230,118"},${fillAlpha})`;
    ctx.fillRect(bx, by, bw, bh);
    if (isSel) { ctx.shadowColor = clr; ctx.shadowBlur = 16; }
    ctx.strokeStyle = clr; ctx.lineWidth = isSel ? 3.5 : (diffStatus !== "none" ? 2.5 : 1.5); ctx.strokeRect(bx, by, bw, bh); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(cx, cy, isSel ? 7 : 4, 0, Math.PI * 2); ctx.fillStyle = "#000"; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, isSel ? 6 : 3.5, 0, Math.PI * 2); ctx.fillStyle = clr; ctx.fill();

    const LH = 26, LFS = 11, NFS = 10;
    ctx.font = `bold ${LFS}px monospace`; const lw = ctx.measureText(comp.loc).width;
    const nm = (comp.name || comp.type || "?").slice(0, 17); ctx.font = `${NFS}px system-ui`; const nw = ctx.measureText(nm).width;
    const boxW = lw + nw + 22;
    const lx = Math.min(Math.max(lxMap[comp.loc] || cx, boxW / 2 + 5), CW - boxW / 2 - 5);
    const below = cy < CH * 0.56; const ly = below ? CH - LH * 1.5 : LH * 1.5; const leY = below ? ly - LH / 2 : ly + LH / 2;
    const mx = cx + (lx - cx) * 0.4;
    const drawLine = () => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(mx, cy); ctx.lineTo(mx, leY + (below ? 4 : -4)); ctx.lineTo(lx, leY); ctx.stroke(); };
    ctx.setLineDash([4, 2]);
    ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = isSel ? 3 : 2; drawLine();
    ctx.strokeStyle = clr; ctx.lineWidth = isSel ? 1.8 : 1.2; drawLine();
    ctx.setLineDash([]);
    const lbX = lx - boxW / 2, lbY = ly - LH / 2;
    const bgDark = diffStatus === "missing" ? "#2d0000" : diffStatus === "mismatch" ? "#1a1000" : diffStatus === "extra" ? "#00082d" : "#001a0a";
    ctx.fillStyle = isSel ? "#2d2100" : bgDark; ctx.strokeStyle = clr + (isSel ? "" : "55"); ctx.lineWidth = isSel ? 1.5 : 0.7;
    if (isSel) { ctx.shadowColor = clr; ctx.shadowBlur = 7; }
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lbX, lbY, boxW, LH, 3) : ctx.rect(lbX, lbY, boxW, LH); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    const ltW = lw + 7; ctx.fillStyle = clr; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lbX + 2, lbY + 2, ltW, LH - 4, 2) : ctx.rect(lbX + 2, lbY + 2, ltW, LH - 4); ctx.fill();
    ctx.font = `bold ${LFS}px monospace`; ctx.fillStyle = "#111"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(comp.loc, lbX + 2 + ltW / 2, ly);
    ctx.font = `${NFS}px system-ui`; ctx.fillStyle = "#e2e8f0"; ctx.textAlign = "left"; ctx.fillText(nm, lbX + ltW + 6, ly);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  });
}

/* ─── UI atoms ─── */
function Spinner({ color = "#3b82f6", size = 22 }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2.5px solid ${color}22`, borderTopColor: color, animation: "spin .75s linear infinite", flexShrink: 0 }} />;
}
function Btn({ children, onClick, color = "#3b82f6", disabled, outline, sm }) {
  const bg = outline ? "transparent" : disabled ? "#d1d5db" : color;
  const clr = outline ? color : "#fff";
  return <button onClick={onClick} disabled={disabled}
    style={{ padding: sm ? "6px 13px" : "11px 0", width: sm ? "auto" : "100%", border: outline ? `1.5px solid ${color}` : "none", borderRadius: 9, fontSize: sm ? 12 : 13, fontWeight: 600, color: clr, background: bg, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, justifyContent: "center", transition: "filter .1s" }}
    onMouseEnter={e => !disabled && (e.currentTarget.style.filter = "brightness(1.08)")} onMouseLeave={e => (e.currentTarget.style.filter = "")}>
    {children}
  </button>;
}
function Ghost({ children, onClick, disabled, style }) {
  return <button onClick={onClick} disabled={disabled}
    style={{ padding: "5px 10px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, whiteSpace: "nowrap", ...style }}>
    {children}
  </button>;
}
function Card({ children, style }) {
  return <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden", ...style }}>{children}</div>;
}
function CH2({ title, sub, right }) {
  return <div style={{ padding: "9px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div style={{ fontWeight: 600, fontSize: 13 }}>{title}
      {sub && <div style={{ fontSize: 10, color: "#94a3b8" }}>{sub}</div>}
    </div>
    {right && right}
  </div>;
}
function Conf({ v }) {
  if (v == null) return null;
  const p = Math.round(v * 100), c = p > 70 ? "#10b981" : p > 40 ? "#f59e0b" : "#ef4444";
  return <span style={{ fontSize: 10, fontWeight: 600, color: c }}>{p}%</span>;
}
function typeClr(t) {
  const s = (t || "").toLowerCase();
  if (s.includes("capacitor")) return "#3b82f6"; if (s.includes("resistor")) return "#8b5cf6";
  if (s.includes("ic") || s.includes("chip") || s.includes("micro")) return "#f59e0b";
  if (s.includes("connector") || s.includes("header")) return "#ec4899";
  if (s.includes("crystal") || s.includes("oscillator")) return "#06b6d4";
  if (s.includes("transistor") || s.includes("mosfet")) return "#84cc16";
  if (s.includes("regulator")) return "#14b8a6"; if (s.includes("led") || s.includes("diode")) return "#f97316";
  return "#64748b";
}

/* ─── Media Zone: inline Photo + Live Camera tabs ─── */
function MediaZone({ src, natW, natH, h = 200, onLoad, onClear }) {
  const [tab, setTab] = useState("photo");
  const [streaming, setStreaming] = useState(false);
  const [camErr, setCamErr] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const streamRef = useRef(null);
  const vidRef = useRef(null);
  const capRef = useRef(null);
  const fileRef = useRef(null);

  const handleFile = async file => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file (JPG or PNG)"); return; }
    try { onLoad(await loadAndResizeImage(file)); } catch (e) { alert("Failed to load image: " + e.message); }
  };

  const startCam = async (fm) => {
    setCamErr(false);
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: fm || facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } } });
      streamRef.current = st;
      if (vidRef.current) { vidRef.current.srcObject = st; vidRef.current.play(); }
      setStreaming(true);
    } catch { setCamErr(true); setStreaming(false); }
  };

  const stopCam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStreaming(false);
  };

  const flipCam = () => {
    const nf = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nf); startCam(nf);
  };

  const snap = () => {
    const v = vidRef.current, c = capRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const s = c.toDataURL("image/jpeg", 0.92);
    onLoad({ src: s, b64: s.split(",")[1], natW: v.videoWidth, natH: v.videoHeight });
    stopCam(); setTab("photo");
  };

  useEffect(() => {
    if (tab === "camera") startCam();
    else stopCam();
    return stopCam;
  }, [tab]);

  const tabBtn = (id, icon, label) => (
    <button onClick={() => setTab(id)} style={{
      flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer",
      border: "none", borderBottom: tab === id ? "2.5px solid #10b981" : "2.5px solid transparent",
      background: tab === id ? "#f0fdf4" : "#f8fafc", color: tab === id ? "#065f46" : "#6b7280",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    }}>{icon} {label}</button>
  );

  return (
    <div style={{ borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden", background: "#fff" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
        {tabBtn("photo", "📁", "Photo / File")}
        {tabBtn("camera", "🎥", "Live Camera")}
      </div>

      {/* Photo tab */}
      {tab === "photo" && (
        <div>
          <div onClick={() => fileRef.current.click()} onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            style={{ height: h, cursor: "pointer", position: "relative", background: src ? "#f0fdf4" : "#fafafa",
              border: `2px dashed ${src ? "#86efac" : "#d1d5db"}`, borderRadius: "0 0 8px 8px" }}>
            {src
              ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              : <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#9ca3af" }}>
                  <span style={{ fontSize: 36 }}>📁</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Click or drag image here</span>
                  <span style={{ fontSize: 10 }}>JPG · PNG · WebP</span>
                </div>
            }
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </div>
          {src && (
            <div style={{ padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", borderTop: "1px solid #bbf7d0" }}>
              <span style={{ fontSize: 10, color: "#15803d" }}>✓ {natW}×{natH}px loaded</span>
              <button onClick={onClear} style={{ fontSize: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}>✕ Clear</button>
            </div>
          )}
        </div>
      )}

      {/* Camera tab */}
      {tab === "camera" && (
        <div style={{ position: "relative", height: h + 44, background: "#0f172a", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
          {camErr
            ? <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#94a3b8" }}>
                <span style={{ fontSize: 32 }}>📷</span>
                <span style={{ fontSize: 12 }}>Camera access denied</span>
                <button onClick={() => startCam()} style={{ fontSize: 11, padding: "5px 14px", background: "#10b981", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer" }}>Retry</button>
              </div>
            : <>
                {/* Live viewfinder */}
                <video ref={vidRef} autoPlay playsInline muted
                  style={{ width: "100%", height: h, objectFit: "cover", display: "block" }} />

                {/* Crosshair overlay */}
                <div style={{ position: "absolute", inset: 0, top: 0, height: h, pointerEvents: "none" }}>
                  <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
                    <rect x="15%" y="10%" width="70%" height="80%" fill="none" stroke="rgba(16,185,129,0.6)" strokeWidth="1.5" strokeDasharray="10 5" rx="4" />
                    {/* Corner markers */}
                    {[["15%","10%","right","bottom"],["85%","10%","left","bottom"],["15%","90%","right","top"],["85%","90%","left","top"]].map(([x,y,bx,by],i)=>(
                      <g key={i}>
                        <line x1={x} y1={y} x2={bx==="right"?`calc(${x} + 18px)`:x} y2={y} stroke="#10b981" strokeWidth="2.5"/>
                        <line x1={x} y1={y} x2={x} y2={by==="bottom"?`calc(${y} + 18px)`:y} stroke="#10b981" strokeWidth="2.5"/>
                      </g>
                    ))}
                  </svg>
                  <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.55)", color: "#6ee7b7", fontSize: 10, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                    🔴 LIVE · Position PCB in frame
                  </div>
                </div>

                {/* Controls bar */}
                <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", background: "rgba(0,0,0,0.75)", gap: 8 }}>
                  <button onClick={flipCam} style={{ padding: "5px 12px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, fontSize: 11, cursor: "pointer" }}>
                    🔄 {facingMode === "environment" ? "Front" : "Back"}
                  </button>
                  <button onClick={snap} style={{ padding: "8px 28px", background: "#10b981", color: "#fff", border: "none", borderRadius: 22, fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: 0.3 }}>
                    📸 Capture
                  </button>
                  <button onClick={() => setTab("photo")} style={{ padding: "5px 12px", background: "rgba(255,255,255,0.1)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, fontSize: 11, cursor: "pointer" }}>
                    ✕ Close
                  </button>
                </div>
              </>
          }
          <canvas ref={capRef} style={{ display: "none" }} />
        </div>
      )}
    </div>
  );
}

/* ─── MODES ─── */
const MODES = {
  object: { label: "Object Finder", icon: "🔍", color: "#3b82f6" },
  pcb:    { label: "PCB Inspector", icon: "🔌", color: "#10b981" },
};

export default function App() {
  const [mode, setMode] = useState("object");
  const mc = MODES[mode];
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [err, setErr] = useState(null);
  /* object */
  const [tgt, setTgt] = useState(null);
  const [ref_, setRef] = useState(null);
  const [query, setQuery] = useState("");
  const [boxes, setBoxes] = useState([]);
  const [selBox, setSelBox] = useState(null);
  /* pcb wizard */
  const [pcbStep, setPcbStep] = useState(1);
  const [refPcb, setRefPcb] = useState(null);
  const [tgtPcb, setTgtPcb] = useState(null);
  const [refComps, setRefComps] = useState([]);
  const [tgtComps, setTgtComps] = useState([]);
  const [pcbLoading, setPcbLoading] = useState(false);
  const [pcbMsg, setPcbMsg] = useState("");
  const [diffs, setDiffs] = useState(null);
  const [diffFilter, setDiffFilter] = useState("all");
  const [selDiff, setSelDiff] = useState(null);
  const [selComp, setSelComp] = useState(null);
  const [editComp, setEditComp] = useState(null);
  const [editVal, setEditVal] = useState("");
  const refCanvas = useRef(null);
  const tgtCanvas = useRef(null);
  const refImgEl = useRef(null);
  const tgtImgEl = useRef(null);
  /* manual add */
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", type: "IC", location: "" });
  const COMP_TYPES = [
    "IC (SOIC-8)","IC (SOIC-16)","IC (TSSOP)","IC (QFP/TQFP/LQFP)","IC (QFN/DFN)","IC (BGA)","IC (LGA)","IC (DIP-8)","IC (DIP-14)","IC (DIP-16)","IC (DIP-28)","IC (PLCC)",
    "Chip Resistor (0402)","Chip Resistor (0603)","Chip Resistor (0805)","Chip Resistor (1206)","MELF Resistor","Resistor Network",
    "Chip Capacitor (0402)","Chip Capacitor (0603)","Chip Capacitor (0805)","Chip Capacitor (1206)","Electrolytic Cap (SMD)","Electrolytic Cap (THT)","Tantalum Cap",
    "Ferrite Bead","Inductor (SMD)","Inductor (THT)","Transformer",
    "Transistor (SOT-23)","Transistor (TO-92)","MOSFET (SOT-23)","MOSFET (TO-220)","MOSFET (D2PAK)",
    "Diode (SOD-123)","Diode (SOD-323)","Diode (DO-35/41)","Zener Diode","TVS Diode","LED (SMD)","LED (THT)",
    "Voltage Regulator (SOT-223)","Voltage Regulator (TO-220)","Voltage Regulator (D2PAK)",
    "Crystal/Oscillator (SMD)","Crystal (THT)",
    "Connector (JST)","Connector (Pin Header)","Connector (USB)","Connector (FPC/FFC)","Connector (Terminal Block)",
    "Button/Switch (SMD)","Button/Switch (THT)","Test Point","Fuse (SMD)","Fuse (THT)","Relay","Battery Holder","Shield/Module","Other"
  ];

  /* load images into Image elements for canvas drawing */
  useEffect(() => {
    if (!refPcb?.src) { refImgEl.current = null; return; }
    const img = new Image(); img.onload = () => { refImgEl.current = img; }; img.src = refPcb.src;
  }, [refPcb?.src]);
  useEffect(() => {
    if (!tgtPcb?.src) { tgtImgEl.current = null; return; }
    const img = new Image(); img.onload = () => { tgtImgEl.current = img; }; img.src = tgtPcb.src;
  }, [tgtPcb?.src]);

  /* camera — handled inline by MediaZone */

  const buildDiffMaps = (d) => {
    const refMap = {}, tgtMap = {};
    if (!d) return { refMap, tgtMap };
    (d.ok || []).forEach(c => { if (c.loc_ref) refMap[c.loc_ref] = "ok"; if (c.loc_tgt) tgtMap[c.loc_tgt] = "ok"; });
    (d.missing || []).forEach(c => { if (c.loc_ref) refMap[c.loc_ref] = "missing"; });
    (d.extra || []).forEach(c => { if (c.loc_tgt) tgtMap[c.loc_tgt] = "extra"; });
    (d.mismatch || []).forEach(c => { if (c.loc_ref) refMap[c.loc_ref] = "mismatch"; if (c.loc_tgt) tgtMap[c.loc_tgt] = "mismatch"; });
    return { refMap, tgtMap };
  };

  const redrawRef = useCallback(() => {
    if (refCanvas.current) drawPCB(refCanvas.current, refComps, selComp || null, refImgEl.current, buildDiffMaps(diffs).refMap);
  }, [refComps, selComp, diffs]);
  const redrawTgt = useCallback(() => {
    if (tgtCanvas.current) drawPCB(tgtCanvas.current, tgtComps, selDiff?.loc_tgt || null, tgtImgEl.current, buildDiffMaps(diffs).tgtMap);
  }, [tgtComps, selDiff, diffs]);

  useEffect(() => { redrawRef(); }, [redrawRef]);
  useEffect(() => { redrawTgt(); }, [redrawTgt]);



  /* ── Object scan ── */
  const scanObjects = async () => {
    if (!tgt) { setErr("Please upload a target image first."); return; }
    setLoading(true); setErr(null); setBoxes([]); setSelBox(null);
    setLoadMsg("Detecting objects…");
    try {
      const refB64 = ref_?.b64;
      const content = refB64
        ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: refB64 } },
           { type: "text", text: "[REFERENCE OBJECT]" },
           { type: "image", source: { type: "base64", media_type: "image/jpeg", data: tgt.b64 } },
           { type: "text", text: `Find ALL instances of the reference object. Return ONLY JSON array: [{ "item": "name", "location": "where", "description": "details", "confidence": 0.9, "bbox": { "x": 10, "y": 5, "w": 20, "h": 30 } }]` }]
        : [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: tgt.b64 } },
           { type: "text", text: `Find every instance of: "${query || "all objects"}". Return ONLY JSON array: [{ "item": "name", "location": "position", "description": "details", "confidence": 0.9, "bbox": { "x": 10, "y": 5, "w": 20, "h": 30 } }]` }];
      const raw = await claudeAPI([{ role: "user", content }], 3000);
      const parsed = safeJSON(raw);
      if (!parsed.length) setErr("No results found.");
      else setBoxes(parsed);
    } catch (e) { setErr("Error: " + e.message); }
    setLoading(false); setLoadMsg("");
  };

  /* ── Designator prefix → component type ── */
  const resolveTypeFromDesignator = (name, claudeType) => {
    const des = (name || "").trim().toUpperCase();
    // Extract leading letters (the designator prefix)
    const prefix = des.match(/^([A-Z]+)/)?.[1] || "";
    const map = {
      R: "Chip Resistor",
      RN: "Resistor Network",
      C: "Chip Capacitor",
      CE: "Electrolytic Cap",
      E: "Electrolytic Cap",
      L: "Inductor",
      FB: "Ferrite Bead",
      T: "Transformer",
      U: "IC",
      IC: "IC",
      Q: "Transistor",
      M: "MOSFET",
      D: "Diode",
      Z: "Zener Diode",
      TV: "TVS Diode",
      LED: "LED (SMD)",
      J: "Connector",
      P: "Connector",
      CN: "Connector",
      X: "Connector",
      H: "Connector",
      SW: "Button/Switch",
      S: "Button/Switch",
      BTN: "Button/Switch",
      Y: "Crystal/Oscillator",
      XTAL: "Crystal/Oscillator",
      OSC: "Crystal/Oscillator",
      TP: "Test Point",
      F: "Fuse",
      K: "Relay",
      RLY: "Relay",
      VR: "Voltage Regulator",
      REG: "Voltage Regulator",
      BT: "Battery",
      BAT: "Battery",
      ANT: "Antenna",
      MOD: "Shield/Module",
      U1: "IC",
      PS: "Power Supply",
      DS: "LED (SMD)",
      RT: "Thermistor",
      NTC: "Thermistor",
      PTC: "Thermistor",
      RTC: "IC (RTC)",
    };
    // Longest-prefix match
    for (let len = prefix.length; len >= 1; len--) {
      const candidate = prefix.slice(0, len);
      if (map[candidate]) return map[candidate];
    }
    // Fallback to Claude's classification
    return claudeType || "Component";
  };

  /* ── PCB Wizard functions ── */
  const scanBoard = async (imgObj, prefix, onProgress) => {
    const { b64, natW, natH } = imgObj;
    const imgEl = await loadImgEl(b64);
    const fullImg = { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } };

    // ── PASS 1: Full image ─────────────────
    onProgress?.("Pass 1/5 — scanning full board for ICs, connectors, large parts…");
    // Build package knowledge string from COMP_DB for prompt enrichment
    const leadlessDesc = COMP_DB.packages.leadless.map(p => `${p.name}: ${p.desc}`).join("; ");
    const leadedDesc = COMP_DB.packages.leaded.map(p => `${p.name}: ${p.desc}`).join("; ");
    const mountingDesc = COMP_DB.packages.mountingStyles.map(p => `${p.name}: ${p.desc}`).join("; ");
    const quickRefDesc = COMP_DB.quickRef.map(r => `${r.des}=>${r.name}(${r.fn})`).join(", ");

    const pass1Prompt = `You are a senior PCB engineer with deep knowledge of component packages. Inspect this real PCB photo.

COMPONENT PACKAGE REFERENCE — use this to identify what you see:
LEADLESS SMT: ${leadlessDesc}
LEADED SMT & THT: ${leadedDesc}
MOUNTING STYLES: ${mountingDesc}
DESIGNATOR→COMPONENT MAP: ${quickRefDesc}

Find every LARGE or CLEARLY IDENTIFIABLE component with a visible physical body:
Connectors: USB (Type-A/B/C/micro/mini), barrel jack, JST (XH/PH/SH/ZH/GH), pin headers (1×N, 2×N), IDC, RJ45, FFC/FPC, terminal blocks, audio jacks, XT30/XT60, SMA/MMCX, D-Sub, castellated edge connectors
Through-hole: electrolytic caps, crystals, DIP ICs (DIP-8/14/16/28), relays, switches, fuses, transformers, MOSFETs (TO-220/TO-92/TO-247), diodes (DO-35/DO-41), LED (THT)
SMT ICs: SOIC-8/16, TSSOP, QFP, TQFP, LQFP, QFN, DFN, BGA, LGA, PLCC, SOT-223, D2PAK (TO-263) — any IC with visible leads on multiple sides
SMT packages: Gull-wing (SOIC/QFP) = leads bend outward and down; J-lead (PLCC) = leads bent under body; flat no-lead (QFN/DFN) = pads on bottom only; BGA = solder balls on bottom
Modules: shielded RF/WiFi/BT cans, display connectors, SD card slots, voltage regulators (SOT-223, D2PAK, TO-263, LM78xx/AMS1117 series)
Power devices: MOSFETs with metal tab, bridge rectifiers, power transistors, D2PAK/TO-263 packages
STRICT RULES — DO NOT report:
❌ Bare pads with nothing placed on them
❌ PCB traces, silkscreen text, or board markings
❌ Anything you are not confident is a real placed component
DESIGNATOR READING — CRITICAL:
Read the silkscreen reference designator printed near or on the component body. These follow standard conventions:
R# = Resistor, RN# = Resistor Network, C# = Capacitor, L# = Inductor, FB# = Ferrite Bead,
U# or IC# = Integrated Circuit, Q# = Transistor/MOSFET, D# = Diode, LED# = LED,
J# or P# or CN# or X# = Connector, SW# or S# = Switch, Y# or XTAL# or OSC# = Crystal/Oscillator,
F# = Fuse, K# or RLY# = Relay, TP# = Test Point, BT# or BAT# = Battery,
VR# or REG# = Voltage Regulator, T# = Transformer, E# = Electrolytic Cap, Z# = Zener Diode
Always use the designator as the "name" field if visible. This is the most important field.
JSON fields:
bbox: x,y,w,h as % of FULL IMAGE (0–100), tight around body only
name: reference designator from silkscreen (e.g. "R3", "C12", "U4", "J2", "L1") — READ THE BOARD MARKINGS
type: component type inferred from designator prefix AND visual appearance
pkg: package (e.g. "SOIC-8", "QFN-32", "TO-220", "DIP-16", "JST-XH-2", "USB-C", "SOT-223", "D2PAK", "PLCC-44")
polarity: for connectors/caps/diodes — "+" side location e.g. "pin1-top-left", "stripe-left", "pin1-marked", "not-polarised", ""
pin1: location of pin 1 or positive terminal if visible, e.g. "top-left", "square-pad", "triangle-marker", ""
pinCount: number of pins/contacts as integer if countable, else 0
orientation: connector mating direction — "vertical", "horizontal", "right-angle", "top-entry", ""
confidence: 0.0–1.0, only include if ≥ 0.65
Return ONLY a JSON array, no markdown:
[{ "type": "Connector", "name": "J1", "pkg": "JST-XH-4", "location": "top-right", "polarity": "pin1-top-left", "pin1": "square-pad", "pinCount": 4, "orientation": "vertical", "confidence": 0.91, "bbox": { "x": 35, "y": 12, "w": 8, "h": 6 } }]`;
    const p1raw = await claudeAPI([{ role: "user", content: [fullImg, { type: "text", text: pass1Prompt }] }], 8192);
    const pass1 = safeJSON(p1raw).filter(c => (c.confidence ?? 1) >= 0.65 && c.bbox);

    // ── PASS 2–5: Tile scan (2×2 grid) ─────────────────────
    const COLS = 2, ROWS = 2;
    const tileW = Math.floor(natW / COLS), tileH = Math.floor(natH / ROWS);
    const tileNames = ["top-left", "top-right", "bottom-left", "bottom-right"];
    let allTileComps = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tIdx = row * COLS + col;
        const tx = col * tileW, ty = row * tileH;
        const tw = col === COLS - 1 ? natW - tx : tileW;
        const th = row === ROWS - 1 ? natH - ty : tileH;
        onProgress?.(`Pass ${tIdx + 2}/5 — scanning ${tileNames[tIdx]} quadrant for SMT components…`);

        const tileB64 = extractTileB64(imgEl, tx, ty, tw, th);
        const tileImg = { type: "image", source: { type: "base64", media_type: "image/jpeg", data: tileB64 } };

        const smtSizeRef = COMP_DB.smtChipSizes.map(s => `${s.metric}(imperial:${s.imperial},${s.mmW}×${s.mmH}mm)`).join(", ");
        const tilePrompt = `You are a senior PCB engineer with deep SMT knowledge. This is the ${tileNames[tIdx]} QUADRANT (${tw}×${th}px) of a PCB.

SMT CHIP SIZE REFERENCE (metric code → imperial → dimensions):
${smtSizeRef}

Find every SMALL SMT component with a visible physical body in this tile:
✅ Chip resistors — metric sizes: 0402(01005), 0603(0201), 1005(0402), 1608(0603), 2012(0805), 3216(1206), 3225(1210), 4532(1812), 6332(2512): tiny rectangular ceramic body with printed number code
✅ Chip capacitors: same rectangular body, often grey/white/tan/unmarked or color-coded
✅ Tantalum capacitors: rectangular body with polarity stripe, yellow/orange/brown color typical
✅ Ferrite beads: same size as resistors, typically black/grey, often unmarked
✅ SOT-23/SOT-23-5/SC-70: tiny 3–6 lead black transistor/LDO/zener body
✅ SOD-123/SOD-323: small 2-terminal diode body with polarity stripe
✅ MELF resistors: cylindrical body with color bands, like tiny surface-mount axial resistor
✅ SMD LEDs: coloured or clear small rectangle, 2 pads, may have polarity dot/stripe
✅ SMD electrolytic caps: rectangular body with polarity marking (stripe or "+")
✅ Small crystals/oscillators: metal can or ceramic body, 2 or 4 pads
✅ SOT-223/D2PAK: larger SMD 3-terminal regulators
DO NOT report:
❌ Empty pad footprints with no component body on them
❌ PCB traces, vias, or solder mask edges
❌ Anything with confidence < 0.65
DESIGNATOR READING — CRITICAL: Read the silkscreen reference designator printed near the component.
R# = Resistor, C# = Capacitor, L# = Inductor, FB# = Ferrite Bead, U#/IC# = IC,
Q# = Transistor/MOSFET, D# = Diode, Z# = Zener, LED# = LED, J#/P#/CN# = Connector,
SW#/S# = Switch, Y#/XTAL#/OSC# = Crystal, VR#/REG# = Voltage Regulator, TP# = Test Point
Always populate "name" with the designator if visible — it is the most important field.
JSON fields (bbox coords are % of THIS TILE, not full board):
bbox: x,y,w,h as % of THIS TILE (0–100), body only, not pads
name: reference designator from silkscreen if readable (e.g. "R3", "C7", "L1", "J2"), else ""
type: inferred from designator prefix AND visual appearance
pkg: metric code preferred: "0402","0603","1005","1608","2012","3216","SOT-23","SOD-123","MELF", etc.
polarity: "stripe-left", "stripe-right", "stripe-top", "stripe-bottom", "plus-left", "plus-right", "not-polarised", ""
pin1: "left","right","top","bottom","marked-end",""
pinCount: integer (2 for passive, 3 for SOT-23)
confidence: ≥ 0.65 only
Each component = its own entry
Return ONLY a JSON array, no markdown:
[{ "type": "Chip Capacitor", "name": "C7", "pkg": "0603", "location": "near IC", "polarity": "plus-left", "pin1": "left", "pinCount": 2, "confidence": 0.78, "bbox": { "x": 22, "y": 45, "w": 3.5, "h": 2.0 } }]`;
        const tileRaw = await claudeAPI([{ role: "user", content: [tileImg, { type: "text", text: tilePrompt }] }], 4096);
        const tileComps = safeJSON(tileRaw).filter(c => (c.confidence ?? 1) >= 0.65 && c.bbox);

        // Re-map bbox from tile-% → full-image-%
        const remapped = tileComps.map(c => ({
          ...c,
          bbox: {
            x: (tx / natW * 100) + c.bbox.x * (tw / natW),
            y: (ty / natH * 100) + c.bbox.y * (th / natH),
            w: c.bbox.w * (tw / natW),
            h: c.bbox.h * (th / natH),
          }
        }));
        allTileComps = [...allTileComps, ...remapped];
      }
    }

    // ── Merge pass1 + tile results, deduplicate by IoU ────────────────────────
    const iou = (a, b) => {
      if (!a?.bbox || !b?.bbox) return 0;
      const ix = Math.max(0, Math.min(a.bbox.x + a.bbox.w, b.bbox.x + b.bbox.w) - Math.max(a.bbox.x, b.bbox.x));
      const iy = Math.max(0, Math.min(a.bbox.y + a.bbox.h, b.bbox.y + b.bbox.h) - Math.max(a.bbox.y, b.bbox.y));
      const inter = ix * iy;
      const ua = a.bbox.w * a.bbox.h, ub = b.bbox.w * b.bbox.h;
      return inter / (ua + ub - inter);
    };
    const all = [...pass1, ...allTileComps];
    const kept = [];
    for (const c of all) {
      const dupIdx = kept.findIndex(k => iou(k, c) > 0.30);
      if (dupIdx === -1) {
        kept.push(c);
      } else {
        // Keep whichever has a designator name; if both or neither, keep higher confidence
        const existing = kept[dupIdx];
        const cHasDes = /^[A-Z]{1,5}\d+$/i.test((c.name || "").trim());
        const eHasDes = /^[A-Z]{1,5}\d+$/i.test((existing.name || "").trim());
        if (cHasDes && !eHasDes) kept[dupIdx] = c;
        else if (!eHasDes && !cHasDes && (c.confidence ?? 0) > (existing.confidence ?? 0)) kept[dupIdx] = c;
      }
    }

    onProgress?.("Finalising component list…");
    // Assign designator-based loc: use silkscreen name if it looks like a real designator
    // (e.g. "R3", "C12", "U4", "J2"), otherwise fall back to prefix+index
    const desRegex = /^[A-Z]{1,5}\d+$/;
    const usedLocs = new Set();
    return kept.map((c, i) => {
      const rawName = (c.name || "").trim().toUpperCase().replace(/\s+/g, "");
      const isDesignator = desRegex.test(rawName);
      let loc = isDesignator && !usedLocs.has(rawName) ? rawName : `${prefix}${i + 1}`;
      usedLocs.add(loc);
      const resolvedType = resolveTypeFromDesignator(rawName, c.type);
      return {
        loc, type: resolvedType, name: c.name || "",
        pkg: c.pkg || "", location: c.location || "",
        polarity: c.polarity || "", pin1: c.pin1 || "", pinCount: c.pinCount || 0,
        orientation: c.orientation || "",
        confidence: c.confidence ?? null, bbox: c.bbox || null, manual: false
      };
    });
  };

  const scanReference = async () => {
    if (!refPcb) return;
    setPcbLoading(true); setErr(null); setPcbMsg("Scanning reference board…");
    try {
      const comps = await scanBoard(refPcb, "R", msg => setPcbMsg(msg));
      setRefComps(comps); setPcbStep(2);
    } catch (e) { setErr("Scan failed: " + e.message); }
    setPcbLoading(false); setPcbMsg("");
  };

  const scanTarget = async () => {
    if (!tgtPcb) return;
    setPcbLoading(true); setErr(null); setPcbMsg("Scanning target board…");
    try {
      const tComps = await scanBoard(tgtPcb, "T", msg => setPcbMsg(msg));
      setTgtComps(tComps);
      setPcbMsg("Running spatial comparison…");

      const bboxCentre = c => c.bbox ? { x: c.bbox.x + c.bbox.w / 2, y: c.bbox.y + c.bbox.h / 2 } : null;
      const bboxDist = (a, b) => {
        const ca = bboxCentre(a), cb = bboxCentre(b);
        if (!ca || !cb) return 999;
        return Math.sqrt((ca.x - cb.x) ** 2 + (ca.y - cb.y) ** 2);
      };
      const bboxIoU = (a, b) => {
        if (!a?.bbox || !b?.bbox) return 0;
        const ix = Math.max(0, Math.min(a.bbox.x + a.bbox.w, b.bbox.x + b.bbox.w) - Math.max(a.bbox.x, b.bbox.x));
        const iy = Math.max(0, Math.min(a.bbox.y + a.bbox.h, b.bbox.y + b.bbox.h) - Math.max(a.bbox.y, b.bbox.y));
        const inter = ix * iy;
        const ua = a.bbox.w * a.bbox.h, ub = b.bbox.w * b.bbox.h;
        return inter / (ua + ub - inter);
      };

      const DIST_THRESH = 18.0;
      const matchScore = (a, b) => {
        const d = bboxDist(a, b);
        const sizeA = a.bbox ? Math.max(a.bbox.w, a.bbox.h) : 0;
        const sizeB = b.bbox ? Math.max(b.bbox.w, b.bbox.h) : 0;
        const adaptive = Math.max(DIST_THRESH, (sizeA + sizeB) * 0.8);
        if (d > adaptive) return -1;
        const iou = bboxIoU(a, b);
        if (iou > 0) return 0.5 + iou * 0.5;
        return Math.max(0, 1 - d / adaptive);
      };

      const refList = [...refComps];
      const tgtList = [...tComps];
      const usedTgt = new Set();
      const candidates = [];
      for (const r of refList) {
        for (const t of tgtList) {
          const s = matchScore(r, t);
          if (s >= 0) candidates.push({ ref: r, tgt: t, score: s });
        }
      }
      candidates.sort((a, b) => b.score - a.score);

      const usedRef = new Set();
      const pairs = [];
      for (const { ref: r, tgt: t, score: s } of candidates) {
        if (usedRef.has(r.loc) || usedTgt.has(t.loc)) continue;
        pairs.push({ ref: r, tgt: t, score: s });
        usedRef.add(r.loc); usedTgt.add(t.loc);
      }
      for (const r of refList) {
        if (!usedRef.has(r.loc)) pairs.push({ ref: r, tgt: null, score: 0 });
      }
      const extraTgt = tgtList.filter(t => !usedTgt.has(t.loc));

      const SMT_SIZES = ["0201", "0402", "0603", "0805", "1206", "1210", "1812", "2010", "2512"];
      const pkgSize = c => {
        const p = (c.pkg || "").replace(/[^0-9]/g, "");
        return SMT_SIZES.find(s => s === p) || "";
      };
      const LARGE_PKGS = ["soic", "qfp", "tqfp", "lqfp", "qfn", "dfn", "bga", "dip", "sop", "ssop", "tssop"];
      const pkgFamily = c => {
        const p = (c.pkg || "").toLowerCase().replace(/[^a-z]/g, "");
        return LARGE_PKGS.find(f => p.startsWith(f)) || pkgSize(c);
      };

      const ok = [], missing = [], mismatch = [], extra = [];
      for (const { ref: r, tgt: t } of pairs) {
        if (!t) {
          missing.push({ name: r.name || r.type, type: r.type, pkg: r.pkg || "",
            location: r.location, severity: "high", loc_ref: r.loc,
            note: "No component found at this board position" });
        } else {
          const famR = pkgFamily(r), famT = pkgFamily(t);
          const clearPkgMismatch = famR && famT && famR !== famT && famR.length >= 3 && famT.length >= 3;
          if (clearPkgMismatch) {
            mismatch.push({ refName: r.name || r.type, tgtName: t.name || t.type,
              type: r.type, refPkg: r.pkg || "", tgtPkg: t.pkg || "",
              location: r.location, severity: "medium",
              loc_ref: r.loc, loc_tgt: t.loc,
              note: `Package: ${r.pkg || "?"} → ${t.pkg || "?"}` });
          } else {
            ok.push({ name: r.name || r.type, type: r.type, pkg: r.pkg || t.pkg || "",
              location: r.location, loc_ref: r.loc, loc_tgt: t.loc,
              polarity: r.polarity || t.polarity || "",
              pin1: r.pin1 || t.pin1 || "",
              pinCount: r.pinCount || t.pinCount || 0,
              orientation: r.orientation || t.orientation || "" });
          }
        }
      }
      for (const t of extraTgt) {
        extra.push({ name: t.name || t.type, type: t.type, pkg: t.pkg || "", location: t.location,
          severity: "low", loc_tgt: t.loc, note: "Component present in target but not in reference" });
      }

      const total = refList.length;
      const passRate = total > 0 ? Math.round(ok.length / total * 100) : 100;
      const verdict = missing.length === 0 && mismatch.filter(m => m.severity === "high").length === 0
        ? (mismatch.length === 0 && extra.length === 0 ? "PASS" : "WARNING")
        : "FAIL";

      setDiffs({
        ok, missing, mismatch, extra,
        summary: `${ok.length}/${total} ref components matched (${passRate}%). ${missing.length} missing, ${mismatch.length} mismatched, ${extra.length} extra in target.`,
        verdict,
        _spatialMatch: true
      });
      setPcbStep(4);
    } catch (e) { setErr("Failed: " + e.message); }
    setPcbLoading(false); setPcbMsg("");
  };

  /* inline edit ref component name/location */
  const startEdit = (idx, field, val) => { setEditComp({ idx, field }); setEditVal(val || ""); };
  const saveEdit = () => {
    if (!editComp) return;
    setRefComps(p => p.map((c, i) => i === editComp.idx ? { ...c, [editComp.field]: editVal } : c));
    setEditComp(null);
  };
  const openAdd = () => { setAddForm({ name: "", type: "IC", location: "" }); setAddOpen(true); };
  const saveManual = () => {
    if (!addForm.name.trim()) return;
    setRefComps(prev => [...prev, {
      loc: `R${prev.length + 1}`, type: addForm.type, name: addForm.name.trim(),
      location: addForm.location.trim(), confidence: 1.0, bbox: null, manual: true
    }]);
    setAddOpen(false);
  };

  const canvasClickRef = useCallback((lx, ly) => {
    if (!refCanvas.current || !refComps.length) return;
    const scaleX = CW / refCanvas.current.offsetWidth, scaleY = CH / refCanvas.current.offsetHeight;
    const cx = lx * scaleX, cy = ly * scaleY;
    const layout = imgLayout(refImgEl.current);
    const { px, py } = pxToBboxPct(cx, cy, layout);
    const hit = refComps.find(c => { if (!c.bbox) return false; return px >= c.bbox.x && px <= c.bbox.x + c.bbox.w && py >= c.bbox.y && py <= c.bbox.y + c.bbox.h; });
    setSelComp(hit ? (selComp === hit.loc ? null : hit.loc) : null);
  }, [refComps, selComp]);

  const canvasClickTgt = useCallback((lx, ly) => {
    if (!tgtCanvas.current || !tgtComps.length || !diffs) return;
    const scaleX = CW / tgtCanvas.current.offsetWidth, scaleY = CH / tgtCanvas.current.offsetHeight;
    const cx = lx * scaleX, cy = ly * scaleY;
    const layout = imgLayout(tgtImgEl.current);
    const { px, py } = pxToBboxPct(cx, cy, layout);
    const hit = tgtComps.find(c => { if (!c.bbox) return false; return px >= c.bbox.x && px <= c.bbox.x + c.bbox.w && py >= c.bbox.y && py <= c.bbox.y + c.bbox.h; });
    if (hit) { const all = [...(diffs.missing || []), ...(diffs.extra || []), ...(diffs.mismatch || []), ...(diffs.ok || [])]; setSelDiff(all.find(d => d.loc_tgt === hit.loc) || null); }
  }, [tgtComps, diffs]);

  const boxClick = useCallback((lx, ly) => {
    if (!tgt) return;
    const fx = lx / tgt.natW, fy = ly / tgt.natH;
    const hit = boxes.findIndex(b => b.bbox && fx >= b.bbox.x / 100 && fx <= (b.bbox.x + b.bbox.w) / 100 && fy >= b.bbox.y / 100 && fy <= (b.bbox.y + b.bbox.h) / 100);
    setSelBox(hit >= 0 ? (selBox === hit ? null : hit) : null);
  }, [boxes, tgt, selBox]);

  const allDiffs = diffs ? [...(diffs.missing || []).map(d => ({ ...d, _kind: "missing" })), ...(diffs.extra || []).map(d => ({ ...d, _kind: "extra" })), ...(diffs.mismatch || []).map(d => ({ ...d, _kind: "mismatch" })), ...(diffs.ok || []).map(d => ({ ...d, _kind: "ok" }))] : [];
  const filteredDiffs = diffFilter === "all" ? allDiffs : allDiffs.filter(d => d._kind === diffFilter);
  const verdictColor = diffs?.verdict === "PASS" ? "#10b981" : diffs?.verdict === "FAIL" ? "#ef4444" : "#f59e0b";

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", background: "#f0f4f8", minHeight: "100vh", color: "#1e293b" }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } @keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } } ::-webkit-scrollbar { width: 4px } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px } .fr { animation: fadeUp .13s ease both } .fr:hover { background: #fafafa !important }`}</style>


      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "10px 18px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${mc.color},${mc.color}bb)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{mc.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Vision AI Studio</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>powered by Claude</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 3, background: "#f1f5f9", borderRadius: 10, padding: 3, marginLeft: "auto" }}>
          {Object.entries(MODES).map(([id, m]) => (
            <button key={id} onClick={() => { setMode(id); setErr(null); setSelBox(null); }}
              style={{ padding: "6px 12px", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", background: mode === id ? "#fff" : "transparent", color: mode === id ? "#1e293b" : "#64748b", boxShadow: mode === id ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 14, maxWidth: 1600, margin: "0 auto" }}>

        {/* ══ OBJECT FINDER ══ */}
        {mode === "object" && (
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 260px", gap: 12, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Card>
                <CH2 title="Target Image" sub="Image to search in" />
                <div style={{ padding: 10 }}>
                  <MediaZone src={tgt?.src} natW={tgt?.natW} natH={tgt?.natH} h={155}
                    onLoad={r => { setTgt(r); setBoxes([]); setSelBox(null); setErr(null); }}
                    onClear={() => { setTgt(null); setBoxes([]); setSelBox(null); }} />
                </div>
              </Card>
              <Card>
                <CH2 title={<span>Reference <span style={{ fontWeight: 400, fontSize: 10, color: "#94a3b8" }}>(optional)</span></span>}
                  sub="Object to locate" />
                <div style={{ padding: 10 }}>
                  <MediaZone src={ref_?.src} natW={ref_?.natW} natH={ref_?.natH} h={120}
                    onLoad={r => { setRef(r); setErr(null); }}
                    onClear={() => { setRef(null); }} />
                </div>
              </Card>
              {mode === "object" && (
                <Card style={{ padding: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, color: "#374151" }}>Search Query</div>
                  <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && scanObjects()}
                    placeholder={ref_ ? "Using reference image…" : "e.g. red car, person with hat"}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, outline: "none" }} />
                </Card>
              )}
              {err && <div style={{ padding: 10, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, color: "#dc2626", fontSize: 11, lineHeight: 1.5, wordBreak: "break-word" }}>⚠ {err}</div>}
              <Btn onClick={scanObjects} disabled={!tgt || loading} color={mc.color}>
                {loading ? <><Spinner color="#fff" size={16} />{loadMsg}</> : <>{mc.icon} Find Objects</>}
              </Btn>
            </div>

            {/* Canvas */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Card>
                <CH2 title="Detection Canvas" sub="Scroll to zoom · Drag to pan · Click box to select"
                  right={boxes.length > 0 && <span style={{ background: mc.color + "18", color: mc.color, padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{boxes.length} found</span>} />
                <div style={{ padding: 10, background: "#0f172a" }}>
                  <PanZoom bg="#0f172a" onLogicalClick={tgt ? boxClick : undefined}>
                    <div style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
                      {tgt
                        ? <>
                          <img src={tgt.src} alt=" " style={{ display: "block", maxWidth: "100%", maxHeight: 480, objectFit: "contain" }} />
                          {boxes.length > 0 && (
                            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
                              viewBox={`0 0 ${tgt.natW} ${tgt.natH}`} preserveAspectRatio="none">
                              {boxes.map((b, i) => {
                                if (!b.bbox) return null;
                                const isSel = selBox === i, dim = selBox !== null && !isSel;
                                const W = tgt.natW, H = tgt.natH;
                                const bx = b.bbox.x / 100 * W, by = b.bbox.y / 100 * H;
                                const bw = b.bbox.w / 100 * W, bh = b.bbox.h / 100 * H;
                                return (
                                  <g key={i} opacity={dim ? 0.25 : 1}>
                                    <rect x={bx} y={by} width={bw} height={bh} fill={mc.color + "22"} stroke={mc.color} strokeWidth={isSel ? W * 0.006 : W * 0.003} strokeDasharray={isSel ? "none" : "none"} />
                                    {[
                                      [bx, by + bh * .25, bx, by, bx + bw * .25, by],
                                      [bx + bw - bw * .25, by, bx + bw, by, bx + bw, by + bh * .25],
                                      [bx, by + bh - bh * .25, bx, by + bh, bx + bw * .25, by + bh],
                                      [bx + bw - bw * .25, by + bh, bx + bw, by + bh, bx + bw, by + bh - bh * .25]
                                    ].map((pts, pi) => <polyline key={pi} points={pts.join(", ")} fill="none" stroke={mc.color} strokeWidth={W * 0.006} />)}
                                  </g>
                                );
                              })}
                            </svg>
                          )}
                        </>
                        : <div style={{ width: "100%", height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Upload an image to begin</div>
                      }
                    </div>
                  </PanZoom>
                </div>
              </Card>
            </div>

            {/* Results panel */}
            <Card style={{ display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
              <CH2 title="Results" right={boxes.length > 0 && <span style={{ background: mc.color + "18", color: mc.color, padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{boxes.length}</span>} />
              <div style={{ flex: 1, overflowY: "auto" }}>
                {loading && <div style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <Spinner color={mc.color} size={28} />
                  <div style={{ fontSize: 11, color: "#64748b", textAlign: "center" }}>{loadMsg}</div>
                </div>}
                {!loading && boxes.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: 42, marginBottom: 10 }}>{mc.icon}</div>
                  <div style={{ fontSize: 12 }}>{tgt ? "Click the button to analyse" : "Upload an image to start"}</div>
                </div>}
                {boxes.map((b, i) => (
                  <div key={i} className="fr" onClick={() => setSelBox(selBox === i ? null : i)}
                    style={{ padding: "9px 12px", borderBottom: "1px solid #f8fafc", cursor: "pointer", background: selBox === i ? "#f8faff" : "#fff", borderLeft: `3px solid ${selBox === i ? mc.color : "transparent"}`, animationDelay: `${i * 0.025}s` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: selBox === i ? mc.color : "#1e293b", flex: 1, marginRight: 5 }}>{b.item || `Item #${i + 1}`}</span>
                      <Conf v={b.confidence} />
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>📍 {b.location}</div>
                    {selBox === i && b.description && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, lineHeight: 1.5 }}>{b.description}</div>}
                    {selBox === i && b.matchReason && <div style={{ fontSize: 11, color: "#6366f1", marginTop: 2 }}>🔍 {b.matchReason}</div>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ══ PCB WIZARD ══ */}
        {mode === "pcb" && (
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px 40px" }}>
            {/* Step progress bar */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: 20, gap: 0 }}>
              {[["1", "Upload Reference", "📋"], ["2", "Review & Confirm", "✏️"], ["3", "Scan Target", "🔍"], ["4", "Diff Results", "📊"]].map(([n, label, icon], idx) => {
                const sn = parseInt(n);
                const done = pcbStep > sn, active = pcbStep === sn;
                return (
                  <React.Fragment key={n}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14,
                        background: done ? "#10b981" : active ? "#065f46" : "#e2e8f0",
                        color: done || active ? "#fff" : "#94a3b8", border: active ? "3px solid #6ee7b7" : "3px solid transparent", transition: "all .2s" }}>
                        {done ? "✓" : icon}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? "#065f46" : done ? "#10b981" : "#94a3b8", whiteSpace: "nowrap" }}>{label}</div>
                    </div>
                    {idx < 3 && <div style={{ flex: 1, height: 2, background: pcbStep > sn ? "#10b981" : "#e2e8f0", margin: "0 4px", marginBottom: 18, transition: "background .3s" }} />}
                  </React.Fragment>
                );
              })}
            </div>

            {err && <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, color: "#dc2626", fontSize: 12, marginBottom: 12 }}>⚠ {err}</div>}

            {/* ── STEP 1: Upload & Scan Reference ── */}
            {pcbStep === 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Card style={{ padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>📋 Upload Reference Board</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>This is your known-good PCB. Upload a clear top-down photo.</div>
                  <MediaZone src={refPcb?.src} natW={refPcb?.natW} natH={refPcb?.natH} h={200}
                    onLoad={r => { setRefPcb(r); setRefComps([]); setErr(null); }}
                    onClear={() => { setRefPcb(null); setRefComps([]); }} />
                  <div style={{ marginTop: 16 }}>
                    {pcbLoading
                      ? <Card style={{ padding: 14, textAlign: "center", background: "#f0fdf4" }}>
                        <Spinner color="#10b981" /> <div style={{ fontSize: 12, color: "#10b981", marginTop: 8 }}>{pcbMsg}</div>
                      </Card>
                      : <Btn onClick={scanReference} disabled={!refPcb} color="#10b981">🔬 Scan Reference Board</Btn>
                    }
                  </div>
                </Card>
                <Card style={{ padding: 20, background: "#fffbeb", borderColor: "#fde68a" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#d97706", marginBottom: 10 }}>📷 Photo tips for best results</div>
                  {[["💡", "Even, diffuse lighting — avoid direct glare on solder joints"], ["📐", "Shoot straight top-down, not at an angle"], ["🔍", "Sharp focus, high resolution — especially for 0402/0603 SMT parts"], ["🤚", "Same orientation for both reference & target"], ["🔬", "For dense SMT boards, crop tightly to fill the frame"]].map(([ic, t]) => (
                    <div key={ic} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>{ic}</span>
                      <span style={{ fontSize: 12, color: "#78350f", lineHeight: 1.5 }}>{t}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 14, padding: "10px 12px", background: "#fef3c7", borderRadius: 8, fontSize: 11, color: "#92400e", lineHeight: 1.6 }}>
                    Scanning runs 5 AI passes: one full-board scan for large parts, then 4 quadrant close-ups for SMT passives. This takes ~30–60 seconds but gives much better accuracy on dense boards.
                  </div>
                </Card>
              </div>
            )}

            {/* ── STEP 2: Review Reference Components ── */}
            {pcbStep === 2 && (
              <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, alignItems: "start" }}>
                <Card style={{ display: "flex", flexDirection: "column", height: 480 }}>
                  <CH2 title="✅ Reference Board" sub="Click a component to select it" right={<span style={{ background: "#10b98118", color: "#10b981", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{refComps.length}</span>} />
                  <div style={{ flex: 1, background: "#0a1f0e", overflow: "hidden" }}>
                    <PanZoom bg="#0a1f0e" onLogicalClick={canvasClickRef} fill>
                      <canvas ref={refCanvas} width={CW} height={CH} style={{ display: "block", width: "100%", height: "100%" }} />
                    </PanZoom>
                  </div>
                  <div style={{ padding: "6px 10px", background: "#f0fdf4", borderTop: "1px solid #bbf7d0", fontSize: 11, color: "#065f46" }}>
                    🟢 = identified &nbsp;| &nbsp; 🟡 = needs name &nbsp;| &nbsp; Click to highlight
                  </div>
                </Card>

                <Card style={{ display: "flex", flexDirection: "column", maxHeight: 480 }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Component Registry</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{refComps.filter(c => !c.name).length > 0 ? `⚠ ${refComps.filter(c => !c.name).length} components need a name` : "✅ All components identified"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={openAdd} style={{ padding: "6px 12px", background: "#f0fdf4", color: "#10b981", border: "1.5px dashed #6ee7b7", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Add Manually</button>
                    </div>
                  </div>

                  <div style={{ padding: "4px 14px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
                    Tap a name or location to edit inline. Components marked <span style={{ color: "#f59e0b", fontWeight: 600 }}>Name Unknown</span> could not be identified.
                  </div>

                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {refComps.map((c, i) => {
                      const needsName = !c.name;
                      const isSel = selComp === c.loc;
                      const isEditName = editComp?.idx === i && editComp.field === "name";
                      const isEditLoc = editComp?.idx === i && editComp.field === "location";
                      return (
                        <div key={c.loc} onClick={() => setSelComp(isSel ? null : c.loc)}
                          style={{ padding: "8px 14px", borderBottom: "1px solid #f1f5f9", background: isSel ? "#f0fdf4" : "#fff",
                            borderLeft: `3px solid ${isSel ? "#10b981" : needsName ? "#f59e0b" : "transparent"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: needsName ? "#fef3c7" : "#f0fdf4", border: `1px solid ${needsName ? "#fde68a" : "#bbf7d0"}`,
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: needsName ? "#d97706" : "#10b981", flexShrink: 0 }}>{c.loc}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                              {isEditName
                                ? <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                                    onBlur={saveEdit} onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditComp(null); }}
                                    onClick={e => e.stopPropagation()}
                                    style={{ flex: 1, padding: "2px 6px", border: "1.5px solid #10b981", borderRadius: 5, fontSize: 12, fontWeight: 600, outline: "none" }} />
                                : <span onClick={e => { e.stopPropagation(); startEdit(i, "name", c.name); }}
                                    style={{ fontSize: 12, fontWeight: 600, color: needsName ? "#d97706" : "#1e293b",
                                      border: `1px dashed ${needsName ? "#f59e0b" : "transparent"}`, borderRadius: 4, padding: "1px 4px",
                                      background: needsName ? "#fffbeb" : "transparent", cursor: "text", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
                                    {needsName ? "✏ tap to name" : c.name}
                                  </span>
                              }
                              <span style={{ fontSize: 10, color: "#94a3b8", background: "#f8fafc", padding: "1px 5px", borderRadius: 10, flexShrink: 0 }}>{c.type}</span>
                              {c.pkg && <span style={{ fontSize: 9, color: "#0891b2", background: "#ecfeff", border: "1px solid #a5f3fc", padding: "1px 5px", borderRadius: 10, flexShrink: 0 }}>📦 {c.pkg}</span>}
                              {c.manual && <span style={{ fontSize: 9, color: "#8b5cf6", background: "#f5f3ff", padding: "1px 5px", borderRadius: 10 }}>manual</span>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 10, color: "#94a3b8" }}>📍</span>
                              {isEditLoc
                                ? <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                                    onBlur={saveEdit} onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditComp(null); }}
                                    onClick={e => e.stopPropagation()}
                                    style={{ flex: 1, padding: "2px 6px", border: "1.5px solid #10b981", borderRadius: 5, fontSize: 11, outline: "none" }} />
                                : <span onClick={e => { e.stopPropagation(); startEdit(i, "location", c.location); }}
                                    style={{ fontSize: 11, color: c.location ? "#475569" : "#cbd5e1", border: "1px dashed transparent", borderRadius: 4, padding: "1px 4px", cursor: "text" }}>
                                    {c.location || "tap to add location…"}
                                  </span>
                              }
                            </div>
                            {(c.polarity || c.pinCount > 0 || c.orientation) && (
                              <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                                {c.pinCount > 0 && <span style={{ fontSize: 9, background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd", padding: "1px 5px", borderRadius: 8 }}>🔌 {c.pinCount}p</span>}
                                {c.polarity && c.polarity !== "not-polarised" && <span style={{ fontSize: 9, background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a", padding: "1px 5px", borderRadius: 8 }}>⚡ {c.polarity}</span>}
                                {c.orientation && <span style={{ fontSize: 9, background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe", padding: "1px 5px", borderRadius: 8 }}>↕ {c.orientation}</span>}
                                {c.pin1 && <span style={{ fontSize: 9, background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", padding: "1px 5px", borderRadius: 8 }}>① {c.pin1}</span>}
                              </div>
                            )}
                          </div>
                          {c.confidence != null && <Conf v={c.confidence} />}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ padding: "10px 14px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8, flexShrink: 0 }}>
                    <Ghost onClick={() => { setPcbStep(1); setRefComps([]); setRefPcb(null); }} style={{ fontSize: 12 }}>← Rescan</Ghost>
                    <Btn onClick={() => { setErr(null); setPcbStep(3); }} color="#10b981" style={{ flex: 1 }}>✅ Confirm & Continue to Target →</Btn>
                  </div>
                </Card>
              </div>
            )}

            {/* ── STEP 3: Upload & Scan Target ── */}
            {pcbStep === 3 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Card style={{ padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>🔍 Upload Target Board</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>This is the board to inspect. It will be compared against your {refComps.length}-component reference.</div>
                  <div style={{ fontSize: 11, color: "#10b981", marginBottom: 14 }}>✅ Reference confirmed: {refComps.length} components ({refComps.filter(c => c.manual).length} manual)</div>
                  <MediaZone src={tgtPcb?.src} natW={tgtPcb?.natW} natH={tgtPcb?.natH} h={200}
                    onLoad={r => { setTgtPcb(r); setTgtComps([]); setDiffs(null); setErr(null); }}
                    onClear={() => { setTgtPcb(null); setTgtComps([]); setDiffs(null); }} />
                  <div style={{ marginTop: 16 }}>
                    {pcbLoading
                      ? <Card style={{ padding: 14, textAlign: "center", background: "#eff6ff" }}>
                        <Spinner color="#3b82f6" /> <div style={{ fontSize: 12, color: "#3b82f6", marginTop: 8 }}>{pcbMsg}</div>
                      </Card>
                      : <Btn onClick={scanTarget} disabled={!tgtPcb} color="#3b82f6">🔬 Scan & Compare</Btn>
                    }
                  </div>
                </Card>
                <Card style={{ padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>✅ Reference Summary</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[["Total", refComps.length, "#1e293b"], ["Identified", refComps.filter(c => c.name).length, "#10b981"], ["Manual", refComps.filter(c => c.manual).length, "#8b5cf6"], ["Unnamed", refComps.filter(c => !c.name).length, "#f59e0b"]].map(([l, v, col]) => (
                      <div key={l} style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8, textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: col }}>{v}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ maxHeight: 240, overflowY: "auto" }}>
                    {refComps.slice(0, 12).map(c => (
                      <div key={c.loc} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#10b981", background: "#f0fdf4", padding: "1px 5px", borderRadius: 4, flexShrink: 0 }}>{c.loc}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name || <span style={{ color: "#f59e0b" }}>unnamed</span>}</span>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>{c.type}</span>
                      </div>
                    ))}
                    {refComps.length > 12 && <div style={{ fontSize: 11, color: "#94a3b8", padding: "6px 0" }}>…and {refComps.length - 12} more</div>}
                  </div>
                  <Ghost onClick={() => setPcbStep(2)} style={{ marginTop: 10, fontSize: 12, width: "100%", textAlign: "center" }}>← Back to Review Reference</Ghost>
                </Card>
              </div>
            )}

            {/* ── STEP 4: Diff Results ── */}
            {pcbStep === 4 && diffs && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Card style={{ display: "flex", flexDirection: "column", height: 420 }}>
                  <CH2 title="✅ Reference Board" right={<span style={{ background: "#10b98118", color: "#10b981", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{refComps.length}</span>} />
                  <div style={{ flex: 1, background: "#0a1f0e", overflow: "hidden" }}>
                    <PanZoom bg="#0a1f0e" onLogicalClick={canvasClickRef} fill>
                      <canvas ref={refCanvas} width={CW} height={CH} style={{ display: "block", width: "100%", height: "100%" }} />
                    </PanZoom>
                  </div>
                  <div style={{ padding: "5px 10px", background: "#f0fdf4", borderTop: "1px solid #bbf7d0", fontSize: 11, color: "#065f46" }}>
                    🔴 {(diffs.missing || []).length} missing · 🟠 {(diffs.mismatch || []).length} mismatch
                  </div>
                </Card>

                <Card style={{ display: "flex", flexDirection: "column", height: 420 }}>
                  <CH2 title="🔍 Target Board" right={<span style={{ background: "#3b82f618", color: "#3b82f6", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{tgtComps.length}</span>} />
                  <div style={{ flex: 1, background: "#0a0f1f", overflow: "hidden" }}>
                    <PanZoom bg="#0a0f1f" onLogicalClick={canvasClickTgt} fill>
                      <canvas ref={tgtCanvas} width={CW} height={CH} style={{ display: "block", width: "100%", height: "100%" }} />
                    </PanZoom>
                  </div>
                  <div style={{ padding: "5px 10px", background: "#eff6ff", borderTop: "1px solid #bfdbfe", fontSize: 11, color: "#1e40af" }}>
                    🔵 {(diffs.extra || []).length} extra · ✅ {(diffs.ok || []).length} matched
                  </div>
                </Card>

                <Card style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Diff Report</div>
                        <span style={{ fontSize: 10, fontWeight: 600, background: "#eff6ff", color: "#3b82f6", border: "1px solid #bfdbfe", padding: "2px 7px", borderRadius: 10 }}>📐 Spatial matching</span>
                      </div>
                      {diffs.summary && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{diffs.summary}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {diffs.verdict && <div style={{ padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, background: verdictColor + "18", color: verdictColor, border: `1px solid ${verdictColor}44` }}>
                        {diffs.verdict === "PASS" ? "✅ " : diffs.verdict === "FAIL" ? "❌ " : "⚠️ "}{diffs.verdict}
                      </div>}
                      <Ghost onClick={() => { setPcbStep(1); setRefPcb(null); setTgtPcb(null); setRefComps([]); setTgtComps([]); setDiffs(null); }} style={{ fontSize: 12 }}>🔄 Start Over</Ghost>
                    </div>
                  </div>

                  <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 8 }}>
                    {[["All", "all", "#475569", allDiffs.length], ["Missing", "missing", "#ff1744", (diffs.missing || []).length], ["Extra", "extra", "#2979ff", (diffs.extra || []).length], ["Mismatch", "mismatch", "#ff9100", (diffs.mismatch || []).length], ["OK", "ok", "#00e676", (diffs.ok || []).length]].map(([lbl, key, clr, cnt]) => (
                      <button key={key} onClick={() => setDiffFilter(key)}
                        style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${diffFilter === key ? clr : "#e2e8f0"}`, background: diffFilter === key ? clr + "18" : "#fff", color: diffFilter === key ? clr : "#64748b" }}>
                        {lbl} ({cnt})
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 1, maxHeight: 320, overflowY: "auto" }}>
                    {filteredDiffs.map((d, i) => {
                      const kc = d._kind === "missing" ? "#ff1744" : d._kind === "extra" ? "#2979ff" : d._kind === "mismatch" ? "#ff9100" : "#00e676";
                      const isSel = selDiff === d;
                      return (
                        <div key={i} className="fr" onClick={() => setSelDiff(isSel ? null : d)}
                          style={{ padding: "10px 14px", borderBottom: "1px solid #f8fafc", background: isSel ? kc + "10" : "#fff", borderLeft: `3px solid ${isSel ? kc : "transparent"}`, cursor: "pointer" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ background: kc + "20", color: kc, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginRight: 5 }}>{d._kind.toUpperCase()}</span>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{d.name || d.refName || d.tgtName || "Component"}</span>
                            </div>
                            {d.severity && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                              background: d.severity === "high" ? "#fef2f2" : d.severity === "medium" ? "#fffbeb" : "#f0fdf4",
                              color: d.severity === "high" ? "#dc2626" : d.severity === "medium" ? "#d97706" : "#16a34a", flexShrink: 0 }}>{d.severity.toUpperCase()}</span>}
                          </div>
                          {d.location && <div style={{ fontSize: 11, color: "#64748b" }}>📍 {d.location}</div>}
                          {(d.pkg || d.refPkg) && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>📦 {d.pkg || `${d.refPkg || "?"} → ${d.tgtPkg || "?"}`}</div>}
                          {d.polarity && d.polarity !== "not-polarised" && <div style={{ fontSize: 10, color: "#854d0e", marginTop: 1 }}>⚡ Polarity: {d.polarity}{d.pin1 ? ` · Pin1: ${d.pin1}` : ""}</div>}
                          {d.pinCount > 0 && <div style={{ fontSize: 10, color: "#0369a1", marginTop: 1 }}>🔌 {d.pinCount} pins{d.orientation ? ` · ${d.orientation}` : ""}</div>}
                          {d._kind === "mismatch" && <div style={{ fontSize: 11, marginTop: 2 }}> <span style={{ color: "#10b981" }}>REF: {d.refName}{d.refPkg ? `[${d.refPkg}]` : ""}</span> → <span style={{ color: "#3b82f6" }}>TGT: {d.tgtName}{d.tgtPkg ? `[${d.tgtPkg}]` : ""}</span></div>}
                          {isSel && d.note && <div style={{ fontSize: 11, color: "#6366f1", marginTop: 4, background: "#f5f3ff", padding: "4px 8px", borderRadius: 6, lineHeight: 1.5 }}>💬 {d.note}</div>}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ ADD COMPONENT MANUALLY MODAL (Step 2 only) ══ */}
      {addOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setAddOpen(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", background: "linear-gradient(135deg,#064e3b,#065f46)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>➕ Add Component Manually</div>
                <div style={{ fontSize: 11, color: "#6ee7b7", marginTop: 2 }}>Adding to Reference Board · #{refComps.length + 1}</div>
              </div>
              <button onClick={() => setAddOpen(false)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 6, fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 13 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5 }}>Component Name / Value <span style={{ color: "#ef4444" }}>*</span></label>
                <input autoFocus value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") saveManual(); if (e.key === "Escape") setAddOpen(false); }}
                  placeholder="e.g. ATmega328P, 100nF, 10kΩ, USB-C connector"
                  style={{ width: "100%", padding: "9px 11px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12, outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "#10b981"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5 }}>Component Type</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {COMP_TYPES.map(t => (
                    <button key={t} onClick={() => setAddForm(f => ({ ...f, type: t }))}
                      style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer", border: "1.5px solid",
                        borderColor: addForm.type === t ? "#10b981" : "#e2e8f0", background: addForm.type === t ? "#f0fdf4" : "#fff", color: addForm.type === t ? "#10b981" : "#64748b", fontWeight: addForm.type === t ? 700 : 400 }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5 }}>Board Location <span style={{ fontSize: 10, fontWeight: 400, color: "#94a3b8" }}>(optional)</span></label>
                <input value={addForm.location} onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. top-left, near U4, center of board"
                  style={{ width: "100%", padding: "9px 11px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12, outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "#10b981"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Ghost onClick={() => setAddOpen(false)} style={{ flex: 1 }}>Cancel</Ghost>
                <button onClick={saveManual} disabled={!addForm.name.trim()}
                  style={{ flex: 2, padding: "10px 0", background: addForm.name.trim() ? "#10b981" : "#d1d5db", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: addForm.name.trim() ? "pointer" : "not-allowed" }}>
                  ✓ Add to Registry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}