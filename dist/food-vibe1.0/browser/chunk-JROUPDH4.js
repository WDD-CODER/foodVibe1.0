import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  Injectable,
  InjectionToken,
  Input,
  NgModule,
  Optional,
  Renderer2,
  __spreadProps,
  __spreadValues,
  setClassMetadata,
  ɵɵNgOnChangesFeature,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵdirectiveInject,
  ɵɵprojection,
  ɵɵprojectionDef
} from "./chunk-GCYOWW7U.js";

// node_modules/lucide-angular/fesm2020/lucide-angular.mjs
var _c0 = ["*"];
var Archive = [["rect", {
  width: "20",
  height: "5",
  x: "2",
  y: "3",
  rx: "1",
  key: "1wp1u1"
}], ["path", {
  d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",
  key: "1s80jp"
}], ["path", {
  d: "M10 12h4",
  key: "a56b0p"
}]];
var ArrowDown = [["path", {
  d: "M12 5v14",
  key: "s699le"
}], ["path", {
  d: "m19 12-7 7-7-7",
  key: "1idqje"
}]];
var ArrowLeft = [["path", {
  d: "m12 19-7-7 7-7",
  key: "1l729n"
}], ["path", {
  d: "M19 12H5",
  key: "x3x0zl"
}]];
var ArrowRight = [["path", {
  d: "M5 12h14",
  key: "1ays0h"
}], ["path", {
  d: "m12 5 7 7-7 7",
  key: "xquz4c"
}]];
var ArrowUpDown = [["path", {
  d: "m21 16-4 4-4-4",
  key: "f6ql7i"
}], ["path", {
  d: "M17 20V4",
  key: "1ejh1v"
}], ["path", {
  d: "m3 8 4-4 4 4",
  key: "11wl7u"
}], ["path", {
  d: "M7 4v16",
  key: "1glfcx"
}]];
var ArrowUp = [["path", {
  d: "m5 12 7-7 7 7",
  key: "hav0vg"
}], ["path", {
  d: "M12 19V5",
  key: "x0mq9r"
}]];
var BookOpen = [["path", {
  d: "M12 7v14",
  key: "1akyts"
}], ["path", {
  d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
  key: "ruj8y"
}]];
var CalendarClock = [["path", {
  d: "M16 14v2.2l1.6 1",
  key: "fo4ql5"
}], ["path", {
  d: "M16 2v4",
  key: "4m81vk"
}], ["path", {
  d: "M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5",
  key: "1osxxc"
}], ["path", {
  d: "M3 10h5",
  key: "r794hk"
}], ["path", {
  d: "M8 2v4",
  key: "1cmpym"
}], ["circle", {
  cx: "16",
  cy: "16",
  r: "6",
  key: "qoo3c4"
}]];
var Camera = [["path", {
  d: "M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z",
  key: "18u6gg"
}], ["circle", {
  cx: "12",
  cy: "13",
  r: "3",
  key: "1vg3eu"
}]];
var ChevronDown = [["path", {
  d: "m6 9 6 6 6-6",
  key: "qrunsl"
}]];
var ChevronLeft = [["path", {
  d: "m15 18-6-6 6-6",
  key: "1wnfg3"
}]];
var ChevronRight = [["path", {
  d: "m9 18 6-6-6-6",
  key: "mthhwq"
}]];
var ChevronUp = [["path", {
  d: "m18 15-6-6-6 6",
  key: "153udz"
}]];
var CircleAlert = [["circle", {
  cx: "12",
  cy: "12",
  r: "10",
  key: "1mglay"
}], ["line", {
  x1: "12",
  x2: "12",
  y1: "8",
  y2: "12",
  key: "1pkeuh"
}], ["line", {
  x1: "12",
  x2: "12.01",
  y1: "16",
  y2: "16",
  key: "4dfq90"
}]];
var CircleCheck = [["circle", {
  cx: "12",
  cy: "12",
  r: "10",
  key: "1mglay"
}], ["path", {
  d: "m9 12 2 2 4-4",
  key: "dzmm74"
}]];
var CirclePlus = [["circle", {
  cx: "12",
  cy: "12",
  r: "10",
  key: "1mglay"
}], ["path", {
  d: "M8 12h8",
  key: "1wcyev"
}], ["path", {
  d: "M12 8v8",
  key: "napkw2"
}]];
var CircleUserRound = [["path", {
  d: "M18 20a6 6 0 0 0-12 0",
  key: "1qehca"
}], ["circle", {
  cx: "12",
  cy: "10",
  r: "4",
  key: "1h16sb"
}], ["circle", {
  cx: "12",
  cy: "12",
  r: "10",
  key: "1mglay"
}]];
var CircleX = [["circle", {
  cx: "12",
  cy: "12",
  r: "10",
  key: "1mglay"
}], ["path", {
  d: "m15 9-6 6",
  key: "1uzhvr"
}], ["path", {
  d: "m9 9 6 6",
  key: "z0biqf"
}]];
var Circle = [["circle", {
  cx: "12",
  cy: "12",
  r: "10",
  key: "1mglay"
}]];
var ClipboardList = [["rect", {
  width: "8",
  height: "4",
  x: "8",
  y: "2",
  rx: "1",
  ry: "1",
  key: "tgr4d6"
}], ["path", {
  d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
  key: "116196"
}], ["path", {
  d: "M12 11h4",
  key: "1jrz19"
}], ["path", {
  d: "M12 16h4",
  key: "n85exb"
}], ["path", {
  d: "M8 11h.01",
  key: "1dfujw"
}], ["path", {
  d: "M8 16h.01",
  key: "18s6g9"
}]];
var CookingPot = [["path", {
  d: "M2 12h20",
  key: "9i4pu4"
}], ["path", {
  d: "M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8",
  key: "u0tga0"
}], ["path", {
  d: "m4 8 16-4",
  key: "16g0ng"
}], ["path", {
  d: "m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8",
  key: "12cejc"
}]];
var Copy = [["rect", {
  width: "14",
  height: "14",
  x: "8",
  y: "8",
  rx: "2",
  ry: "2",
  key: "17jyea"
}], ["path", {
  d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
  key: "zix9uf"
}]];
var Download = [["path", {
  d: "M12 15V3",
  key: "m9g1x1"
}], ["path", {
  d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
  key: "ih7n3h"
}], ["path", {
  d: "m7 10 5 5 5-5",
  key: "brsn70"
}]];
var EyeOff = [["path", {
  d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
  key: "ct8e1f"
}], ["path", {
  d: "M14.084 14.158a3 3 0 0 1-4.242-4.242",
  key: "151rxh"
}], ["path", {
  d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
  key: "13bj9a"
}], ["path", {
  d: "m2 2 20 20",
  key: "1ooewy"
}]];
var Eye = [["path", {
  d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
  key: "1nclc0"
}], ["circle", {
  cx: "12",
  cy: "12",
  r: "3",
  key: "1v7zrd"
}]];
var FileDown = [["path", {
  d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
  key: "1oefj6"
}], ["path", {
  d: "M14 2v5a1 1 0 0 0 1 1h5",
  key: "wfsgrz"
}], ["path", {
  d: "M12 18v-6",
  key: "17g6i2"
}], ["path", {
  d: "m9 15 3 3 3-3",
  key: "1npd3o"
}]];
var FilePlus = [["path", {
  d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
  key: "1oefj6"
}], ["path", {
  d: "M14 2v5a1 1 0 0 0 1 1h5",
  key: "wfsgrz"
}], ["path", {
  d: "M9 15h6",
  key: "cctwl0"
}], ["path", {
  d: "M12 18v-6",
  key: "17g6i2"
}]];
var Flame = [["path", {
  d: "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4",
  key: "1slcih"
}]];
var FlaskConical = [["path", {
  d: "M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",
  key: "18mbvz"
}], ["path", {
  d: "M6.453 15h11.094",
  key: "3shlmq"
}], ["path", {
  d: "M8.5 2h7",
  key: "csnxdl"
}]];
var Funnel = [["path", {
  d: "M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",
  key: "sc7q7i"
}]];
var GripVertical = [["circle", {
  cx: "9",
  cy: "12",
  r: "1",
  key: "1vctgf"
}], ["circle", {
  cx: "9",
  cy: "5",
  r: "1",
  key: "hp0tcf"
}], ["circle", {
  cx: "9",
  cy: "19",
  r: "1",
  key: "fkjjf6"
}], ["circle", {
  cx: "15",
  cy: "12",
  r: "1",
  key: "1tmaij"
}], ["circle", {
  cx: "15",
  cy: "5",
  r: "1",
  key: "19l28e"
}], ["circle", {
  cx: "15",
  cy: "19",
  r: "1",
  key: "f4zoj3"
}]];
var History = [["path", {
  d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
  key: "1357e3"
}], ["path", {
  d: "M3 3v5h5",
  key: "1xhq8a"
}], ["path", {
  d: "M12 7v5l4 2",
  key: "1fdv2h"
}]];
var Image = [["rect", {
  width: "18",
  height: "18",
  x: "3",
  y: "3",
  rx: "2",
  ry: "2",
  key: "1m3agn"
}], ["circle", {
  cx: "9",
  cy: "9",
  r: "2",
  key: "af1f0g"
}], ["path", {
  d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
  key: "1xmnt7"
}]];
var Info = [["circle", {
  cx: "12",
  cy: "12",
  r: "10",
  key: "1mglay"
}], ["path", {
  d: "M12 16v-4",
  key: "1dtifu"
}], ["path", {
  d: "M12 8h.01",
  key: "e9boi3"
}]];
var LayoutDashboard = [["rect", {
  width: "7",
  height: "9",
  x: "3",
  y: "3",
  rx: "1",
  key: "10lvy0"
}], ["rect", {
  width: "7",
  height: "5",
  x: "14",
  y: "3",
  rx: "1",
  key: "16une8"
}], ["rect", {
  width: "7",
  height: "9",
  x: "14",
  y: "12",
  rx: "1",
  key: "1hutg5"
}], ["rect", {
  width: "7",
  height: "5",
  x: "3",
  y: "16",
  rx: "1",
  key: "ldoo1y"
}]];
var Library = [["path", {
  d: "m16 6 4 14",
  key: "ji33uf"
}], ["path", {
  d: "M12 6v14",
  key: "1n7gus"
}], ["path", {
  d: "M8 8v12",
  key: "1gg7y9"
}], ["path", {
  d: "M4 4v16",
  key: "6qkkli"
}]];
var Lock = [["rect", {
  width: "18",
  height: "11",
  x: "3",
  y: "11",
  rx: "2",
  ry: "2",
  key: "1w4ew1"
}], ["path", {
  d: "M7 11V7a5 5 0 0 1 10 0v4",
  key: "fwvmzm"
}]];
var LogOut = [["path", {
  d: "m16 17 5-5-5-5",
  key: "1bji2h"
}], ["path", {
  d: "M21 12H9",
  key: "dn1m92"
}], ["path", {
  d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
  key: "1uf3rs"
}]];
var MapPin = [["path", {
  d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
  key: "1r0f0z"
}], ["circle", {
  cx: "12",
  cy: "10",
  r: "3",
  key: "ilqhr7"
}]];
var Menu = [["path", {
  d: "M4 5h16",
  key: "1tepv9"
}], ["path", {
  d: "M4 12h16",
  key: "1lakjw"
}], ["path", {
  d: "M4 19h16",
  key: "1djgab"
}]];
var Minus = [["path", {
  d: "M5 12h14",
  key: "1ays0h"
}]];
var Package = [["path", {
  d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",
  key: "1a0edw"
}], ["path", {
  d: "M12 22V12",
  key: "d0xqtd"
}], ["polyline", {
  points: "3.29 7 12 12 20.71 7",
  key: "ousv84"
}], ["path", {
  d: "m7.5 4.27 9 5.15",
  key: "1c824w"
}]];
var PanelLeftClose = [["rect", {
  width: "18",
  height: "18",
  x: "3",
  y: "3",
  rx: "2",
  key: "afitv7"
}], ["path", {
  d: "M9 3v18",
  key: "fh3hqa"
}], ["path", {
  d: "m16 15-3-3 3-3",
  key: "14y99z"
}]];
var PanelRightClose = [["rect", {
  width: "18",
  height: "18",
  x: "3",
  y: "3",
  rx: "2",
  key: "afitv7"
}], ["path", {
  d: "M15 3v18",
  key: "14nvp0"
}], ["path", {
  d: "m8 9 3 3-3 3",
  key: "12hl5m"
}]];
var Pencil = [["path", {
  d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
  key: "1a8usu"
}], ["path", {
  d: "m15 5 4 4",
  key: "1mk7zo"
}]];
var Plus = [["path", {
  d: "M5 12h14",
  key: "1ays0h"
}], ["path", {
  d: "M12 5v14",
  key: "s699le"
}]];
var Printer = [["path", {
  d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",
  key: "143wyd"
}], ["path", {
  d: "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",
  key: "1itne7"
}], ["rect", {
  x: "6",
  y: "14",
  width: "12",
  height: "8",
  rx: "1",
  key: "1ue0tg"
}]];
var RotateCcw = [["path", {
  d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
  key: "1357e3"
}], ["path", {
  d: "M3 3v5h5",
  key: "1xhq8a"
}]];
var Save = [["path", {
  d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
  key: "1c8476"
}], ["path", {
  d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",
  key: "1ydtos"
}], ["path", {
  d: "M7 3v4a1 1 0 0 0 1 1h7",
  key: "t51u73"
}]];
var Scale = [["path", {
  d: "M12 3v18",
  key: "108xh3"
}], ["path", {
  d: "m19 8 3 8a5 5 0 0 1-6 0zV7",
  key: "zcdpyk"
}], ["path", {
  d: "M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1",
  key: "1yorad"
}], ["path", {
  d: "m5 8 3 8a5 5 0 0 1-6 0zV7",
  key: "eua70x"
}], ["path", {
  d: "M7 21h10",
  key: "1b0cd5"
}]];
var ScanText = [["path", {
  d: "M3 7V5a2 2 0 0 1 2-2h2",
  key: "aa7l1z"
}], ["path", {
  d: "M17 3h2a2 2 0 0 1 2 2v2",
  key: "4qcy5o"
}], ["path", {
  d: "M21 17v2a2 2 0 0 1-2 2h-2",
  key: "6vwrx8"
}], ["path", {
  d: "M7 21H5a2 2 0 0 1-2-2v-2",
  key: "ioqczr"
}], ["path", {
  d: "M7 8h8",
  key: "1jbsf9"
}], ["path", {
  d: "M7 12h10",
  key: "b7w52i"
}], ["path", {
  d: "M7 16h6",
  key: "1vyc9m"
}]];
var Search = [["path", {
  d: "m21 21-4.34-4.34",
  key: "14j7rj"
}], ["circle", {
  cx: "11",
  cy: "11",
  r: "8",
  key: "4ej97u"
}]];
var Settings = [["path", {
  d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
  key: "1i5ecw"
}], ["circle", {
  cx: "12",
  cy: "12",
  r: "3",
  key: "1v7zrd"
}]];
var ShieldAlert = [["path", {
  d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
  key: "oel41y"
}], ["path", {
  d: "M12 8v4",
  key: "1got3b"
}], ["path", {
  d: "M12 16h.01",
  key: "1drbdi"
}]];
var ShoppingCart = [["circle", {
  cx: "8",
  cy: "21",
  r: "1",
  key: "jimo8o"
}], ["circle", {
  cx: "19",
  cy: "21",
  r: "1",
  key: "13723u"
}], ["path", {
  d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",
  key: "9zh506"
}]];
var Sparkles = [["path", {
  d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
  key: "1s2grr"
}], ["path", {
  d: "M20 2v4",
  key: "1rf3ol"
}], ["path", {
  d: "M22 4h-4",
  key: "gwowj6"
}], ["circle", {
  cx: "4",
  cy: "20",
  r: "2",
  key: "6kqj1y"
}]];
var SquarePen = [["path", {
  d: "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
  key: "1m0v6g"
}], ["path", {
  d: "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",
  key: "ohrbg2"
}]];
var Star = [["path", {
  d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
  key: "r04s7s"
}]];
var Table2 = [["path", {
  d: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
  key: "gugj83"
}]];
var Tag = [["path", {
  d: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",
  key: "vktsd0"
}], ["circle", {
  cx: "7.5",
  cy: "7.5",
  r: ".5",
  fill: "currentColor",
  key: "kqv944"
}]];
var Tags = [["path", {
  d: "M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z",
  key: "16rjxf"
}], ["path", {
  d: "M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193",
  key: "178nd4"
}], ["circle", {
  cx: "10.5",
  cy: "6.5",
  r: ".5",
  fill: "currentColor",
  key: "12ikhr"
}]];
var Timer = [["line", {
  x1: "10",
  x2: "14",
  y1: "2",
  y2: "2",
  key: "14vaq8"
}], ["line", {
  x1: "12",
  x2: "15",
  y1: "14",
  y2: "11",
  key: "17fdiu"
}], ["circle", {
  cx: "12",
  cy: "14",
  r: "8",
  key: "1e1u0o"
}]];
var Trash2 = [["path", {
  d: "M10 11v6",
  key: "nco0om"
}], ["path", {
  d: "M14 11v6",
  key: "outv1u"
}], ["path", {
  d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
  key: "miytrc"
}], ["path", {
  d: "M3 6h18",
  key: "d0wm0j"
}], ["path", {
  d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  key: "e791ji"
}]];
var TrendingUp = [["path", {
  d: "M16 7h6v6",
  key: "box55l"
}], ["path", {
  d: "m22 7-8.5 8.5-5-5L2 17",
  key: "1t1m79"
}]];
var TriangleAlert = [["path", {
  d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
  key: "wmoenq"
}], ["path", {
  d: "M12 9v4",
  key: "juzpu7"
}], ["path", {
  d: "M12 17h.01",
  key: "p32p05"
}]];
var Truck = [["path", {
  d: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",
  key: "wrbu53"
}], ["path", {
  d: "M15 18H9",
  key: "1lyqi6"
}], ["path", {
  d: "M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",
  key: "lysw3i"
}], ["circle", {
  cx: "17",
  cy: "18",
  r: "2",
  key: "332jqn"
}], ["circle", {
  cx: "7",
  cy: "18",
  r: "2",
  key: "19iecd"
}]];
var Upload = [["path", {
  d: "M12 3v12",
  key: "1x0j5s"
}], ["path", {
  d: "m17 8-5-5-5 5",
  key: "7q97r8"
}], ["path", {
  d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
  key: "ih7n3h"
}]];
var UtensilsCrossed = [["path", {
  d: "m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8",
  key: "n7qcjb"
}], ["path", {
  d: "M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7",
  key: "d0u48b"
}], ["path", {
  d: "m2.1 21.8 6.4-6.3",
  key: "yn04lh"
}], ["path", {
  d: "m19 5-7 7",
  key: "194lzd"
}]];
var Utensils = [["path", {
  d: "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2",
  key: "cjf0a3"
}], ["path", {
  d: "M7 2v20",
  key: "1473qp"
}], ["path", {
  d: "M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7",
  key: "j28e5"
}]];
var X = [["path", {
  d: "M18 6 6 18",
  key: "1bl5f8"
}], ["path", {
  d: "m6 6 12 12",
  key: "d8bk6v"
}]];
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};
var LUCIDE_ICONS = new InjectionToken("LucideIcons", {
  factory: () => new LucideIconProvider({})
});
var LucideIconProvider = class {
  constructor(icons) {
    this.icons = icons;
  }
  getIcon(name) {
    return this.hasIcon(name) ? this.icons[name] : null;
  }
  hasIcon(name) {
    return typeof this.icons === "object" && name in this.icons;
  }
};
var LucideIconConfig = class {
  constructor() {
    this.color = defaultAttributes.stroke;
    this.size = defaultAttributes.width;
    this.strokeWidth = defaultAttributes["stroke-width"];
    this.absoluteStrokeWidth = false;
  }
};
LucideIconConfig.\u0275fac = function LucideIconConfig_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || LucideIconConfig)();
};
LucideIconConfig.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({
  token: LucideIconConfig,
  factory: LucideIconConfig.\u0275fac,
  providedIn: "root"
});
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LucideIconConfig, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();
var hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
  return false;
};
function formatFixed(number, decimals = 3) {
  return parseFloat(number.toFixed(decimals)).toString(10);
}
var LucideAngularComponent = class {
  constructor(elem, renderer, changeDetector, iconProviders, iconConfig) {
    this.elem = elem;
    this.renderer = renderer;
    this.changeDetector = changeDetector;
    this.iconProviders = iconProviders;
    this.iconConfig = iconConfig;
    this.absoluteStrokeWidth = false;
    this.defaultSize = defaultAttributes.height;
  }
  get size() {
    return this._size ?? this.iconConfig.size;
  }
  set size(value) {
    if (value) {
      this._size = this.parseNumber(value);
    } else {
      delete this._size;
    }
  }
  get strokeWidth() {
    return this._strokeWidth ?? this.iconConfig.strokeWidth;
  }
  set strokeWidth(value) {
    if (value) {
      this._strokeWidth = this.parseNumber(value);
    } else {
      delete this._strokeWidth;
    }
  }
  ngOnChanges(changes) {
    if (changes.name || changes.img || changes.color || changes.size || changes.absoluteStrokeWidth || changes.strokeWidth || changes.class) {
      this.color = this.color ?? this.iconConfig.color;
      this.size = this.parseNumber(this.size ?? this.iconConfig.size);
      this.strokeWidth = this.parseNumber(this.strokeWidth ?? this.iconConfig.strokeWidth);
      this.absoluteStrokeWidth = this.absoluteStrokeWidth ?? this.iconConfig.absoluteStrokeWidth;
      const nameOrIcon = this.img ?? this.name;
      const restAttributes = this.getRestAttributes();
      if (!hasA11yProp(restAttributes)) {
        this.renderer.setAttribute(this.elem.nativeElement, "aria-hidden", "true");
      }
      if (typeof nameOrIcon === "string") {
        const icoOfName = this.getIcon(this.toPascalCase(nameOrIcon));
        if (icoOfName) {
          this.replaceElement(icoOfName);
        } else {
          throw new Error(`The "${nameOrIcon}" icon has not been provided by any available icon providers.`);
        }
      } else if (Array.isArray(nameOrIcon)) {
        this.replaceElement(nameOrIcon);
      } else {
        throw new Error(`No icon name or image has been provided.`);
      }
    }
    this.changeDetector.markForCheck();
  }
  replaceElement(img) {
    const childElements = this.elem.nativeElement.childNodes;
    const attributes = __spreadProps(__spreadValues({}, defaultAttributes), {
      width: this.size,
      height: this.size,
      stroke: this.color ?? this.iconConfig.color,
      "stroke-width": this.absoluteStrokeWidth ? formatFixed(this.strokeWidth / (this.size / this.defaultSize)) : this.strokeWidth.toString(10)
    });
    const icoElement = this.createElement(["svg", attributes, img]);
    icoElement.classList.add("lucide");
    if (typeof this.name === "string") {
      icoElement.classList.add(`lucide-${this.name.replace("_", "-")}`);
    }
    if (this.class) {
      icoElement.classList.add(...this.class.split(/ /).map((a) => a.trim()).filter((a) => a.length > 0));
    }
    for (const child of childElements) {
      this.renderer.removeChild(this.elem.nativeElement, child);
    }
    this.renderer.appendChild(this.elem.nativeElement, icoElement);
  }
  getRestAttributes() {
    const restAttributeMap = this.elem.nativeElement.attributes;
    const restAttributes = Object.fromEntries(Array.from(restAttributeMap).map((item) => [item.name, item.value]));
    return restAttributes;
  }
  toPascalCase(str) {
    return str.replace(/(\w)([a-z0-9]*)(_|-|\s*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase());
  }
  parseNumber(value) {
    if (typeof value === "string") {
      const parsedValue = parseInt(value, 10);
      if (isNaN(parsedValue)) {
        throw new Error(`${value} is not numeric.`);
      }
      return parsedValue;
    }
    return value;
  }
  getIcon(name) {
    for (const iconProvider of Array.isArray(this.iconProviders) ? this.iconProviders : [this.iconProviders]) {
      if (iconProvider.hasIcon(name)) {
        return iconProvider.getIcon(name);
      }
    }
    return null;
  }
  createElement([tag, attrs, children = []]) {
    const element = this.renderer.createElement(tag, "http://www.w3.org/2000/svg");
    Object.keys(attrs).forEach((name) => {
      const attrValue = typeof attrs[name] === "string" ? attrs[name] : attrs[name].toString(10);
      this.renderer.setAttribute(element, name, attrValue);
    });
    if (children.length) {
      children.forEach((child) => {
        const childElement = this.createElement(child);
        this.renderer.appendChild(element, childElement);
      });
    }
    return element;
  }
};
LucideAngularComponent.\u0275fac = function LucideAngularComponent_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || LucideAngularComponent)(\u0275\u0275directiveInject(ElementRef), \u0275\u0275directiveInject(Renderer2), \u0275\u0275directiveInject(ChangeDetectorRef), \u0275\u0275directiveInject(LUCIDE_ICONS), \u0275\u0275directiveInject(LucideIconConfig));
};
LucideAngularComponent.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({
  type: LucideAngularComponent,
  selectors: [["lucide-angular"], ["lucide-icon"], ["i-lucide"], ["span-lucide"]],
  inputs: {
    class: "class",
    name: "name",
    img: "img",
    color: "color",
    absoluteStrokeWidth: "absoluteStrokeWidth",
    size: "size",
    strokeWidth: "strokeWidth"
  },
  standalone: false,
  features: [\u0275\u0275NgOnChangesFeature],
  ngContentSelectors: _c0,
  decls: 1,
  vars: 0,
  template: function LucideAngularComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275projectionDef();
      \u0275\u0275projection(0);
    }
  },
  encapsulation: 2
});
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LucideAngularComponent, [{
    type: Component,
    args: [{
      selector: "lucide-angular, lucide-icon, i-lucide, span-lucide",
      template: "<ng-content></ng-content>"
    }]
  }], function() {
    return [{
      type: ElementRef,
      decorators: [{
        type: Inject,
        args: [ElementRef]
      }]
    }, {
      type: Renderer2,
      decorators: [{
        type: Inject,
        args: [Renderer2]
      }]
    }, {
      type: ChangeDetectorRef,
      decorators: [{
        type: Inject,
        args: [ChangeDetectorRef]
      }]
    }, {
      type: void 0,
      decorators: [{
        type: Inject,
        args: [LUCIDE_ICONS]
      }]
    }, {
      type: LucideIconConfig,
      decorators: [{
        type: Inject,
        args: [LucideIconConfig]
      }]
    }];
  }, {
    class: [{
      type: Input
    }],
    name: [{
      type: Input
    }],
    img: [{
      type: Input
    }],
    color: [{
      type: Input
    }],
    absoluteStrokeWidth: [{
      type: Input
    }],
    size: [{
      type: Input
    }],
    strokeWidth: [{
      type: Input
    }]
  });
})();
var Icons = class {
  constructor(icons) {
    this.icons = icons;
  }
};
var legacyIconProviderFactory = (icons) => {
  return new LucideIconProvider(icons ?? {});
};
var LucideAngularModule = class _LucideAngularModule {
  static pick(icons) {
    return {
      ngModule: _LucideAngularModule,
      providers: [{
        provide: LUCIDE_ICONS,
        multi: true,
        useValue: new LucideIconProvider(icons)
      }, {
        provide: LUCIDE_ICONS,
        multi: true,
        useFactory: legacyIconProviderFactory,
        deps: [[new Optional(), Icons]]
      }]
    };
  }
};
LucideAngularModule.\u0275fac = function LucideAngularModule_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || LucideAngularModule)();
};
LucideAngularModule.\u0275mod = /* @__PURE__ */ \u0275\u0275defineNgModule({
  type: LucideAngularModule,
  declarations: [LucideAngularComponent],
  exports: [LucideAngularComponent]
});
LucideAngularModule.\u0275inj = /* @__PURE__ */ \u0275\u0275defineInjector({
  imports: [[]]
});
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LucideAngularModule, [{
    type: NgModule,
    args: [{
      declarations: [LucideAngularComponent],
      imports: [],
      exports: [LucideAngularComponent]
    }]
  }], null, null);
})();

export {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  BookOpen,
  CalendarClock,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CirclePlus,
  CircleUserRound,
  CircleX,
  Circle,
  ClipboardList,
  CookingPot,
  Copy,
  Download,
  EyeOff,
  Eye,
  FileDown,
  FilePlus,
  Flame,
  FlaskConical,
  Funnel,
  GripVertical,
  History,
  Image,
  Info,
  LayoutDashboard,
  Library,
  Lock,
  LogOut,
  MapPin,
  Menu,
  Minus,
  Package,
  PanelLeftClose,
  PanelRightClose,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Scale,
  ScanText,
  Search,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  SquarePen,
  Star,
  Table2,
  Tag,
  Tags,
  Timer,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Truck,
  Upload,
  UtensilsCrossed,
  Utensils,
  X,
  LucideAngularComponent,
  LucideAngularModule
};
//# sourceMappingURL=chunk-JROUPDH4.js.map
