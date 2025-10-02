
var Module = (() => {
  var _scriptName = import.meta.url;
  
  return (
function(moduleArg = {}) {
  var moduleRtn;

// Support for growable heap + pthreads, where the buffer may change, so JS views
// must be updated.
function GROWABLE_HEAP_I8() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAP8;
}
function GROWABLE_HEAP_U8() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPU8;
}
function GROWABLE_HEAP_I16() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAP16;
}
function GROWABLE_HEAP_U16() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPU16;
}
function GROWABLE_HEAP_I32() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAP32;
}
function GROWABLE_HEAP_U32() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPU32;
}
function GROWABLE_HEAP_F32() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPF32;
}
function GROWABLE_HEAP_F64() {
  if (wasmMemory.buffer != HEAP8.buffer) {
    updateMemoryViews();
  }
  return HEAPF64;
}

var Module = moduleArg;

var readyPromiseResolve, readyPromiseReject;

var readyPromise = new Promise((resolve, reject) => {
  readyPromiseResolve = resolve;
  readyPromiseReject = reject;
});

var ENVIRONMENT_IS_WEB = typeof window == "object";

var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";

var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";

var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

var ENVIRONMENT_IS_PTHREAD = ENVIRONMENT_IS_WORKER && self.name == "em-pthread";

var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];

var thisProgram = "./this.program";

var quit_ = (status, toThrow) => {
  throw toThrow;
};

var scriptDirectory = "";

function locateFile(path) {
  if (Module["locateFile"]) {
    return Module["locateFile"](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

var read_, readAsync, readBinary;

if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    scriptDirectory = self.location.href;
  } else if (typeof document != "undefined" && document.currentScript) {
    scriptDirectory = document.currentScript.src;
  }
  if (_scriptName) {
    scriptDirectory = _scriptName;
  }
  if (scriptDirectory.startsWith("blob:")) {
    scriptDirectory = "";
  } else {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
  }
  {
    read_ = url => {
      var xhr = new XMLHttpRequest;
      xhr.open("GET", url, false);
      xhr.send(null);
      return xhr.responseText;
    };
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = url => {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, false);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
        return new Uint8Array(/** @type{!ArrayBuffer} */ (xhr.response));
      };
    }
    readAsync = (url, onload, onerror) => {
      fetch(url, {
        credentials: "same-origin"
      }).then(response => {
        if (response.ok) {
          return response.arrayBuffer();
        }
        return Promise.reject(new Error(response.status + " : " + response.url));
      }).then(onload, onerror);
    };
  }
} else {}

var out = Module["print"] || console.log.bind(console);

var err = Module["printErr"] || console.error.bind(console);

Object.assign(Module, moduleOverrides);

moduleOverrides = null;

if (Module["arguments"]) arguments_ = Module["arguments"];

if (Module["thisProgram"]) thisProgram = Module["thisProgram"];

if (Module["quit"]) quit_ = Module["quit"];

if (ENVIRONMENT_IS_PTHREAD) {
  var wasmPromiseResolve;
  var wasmPromiseReject;
  var receivedWasmModule;
  var initializedJS = false;
  function threadPrintErr(...args) {
    var text = args.join(" ");
    console.error(text);
  }
  if (!Module["printErr"]) err = threadPrintErr;
  function threadAlert(...args) {
    var text = args.join(" ");
    postMessage({
      cmd: "alert",
      text: text,
      threadId: _pthread_self()
    });
  }
  self.alert = threadAlert;
  Module["instantiateWasm"] = (info, receiveInstance) => new Promise((resolve, reject) => {
    wasmPromiseResolve = module => {
      var instance = new WebAssembly.Instance(module, getWasmImports());
      receiveInstance(instance);
      resolve();
    };
    wasmPromiseReject = reject;
  });
  self.onunhandledrejection = e => {
    throw e.reason || e;
  };
  function handleMessage(e) {
    try {
      var msgData = e["data"];
      var cmd = msgData["cmd"];
      if (cmd === "load") {
        let messageQueue = [];
        self.onmessage = e => messageQueue.push(e);
        self.startWorker = instance => {
          postMessage({
            "cmd": "loaded"
          });
          for (let msg of messageQueue) {
            handleMessage(msg);
          }
          self.onmessage = handleMessage;
        };
        for (const handler of msgData["handlers"]) {
          if (!Module[handler] || Module[handler].proxy) {
            Module[handler] = (...args) => {
              postMessage({
                cmd: "callHandler",
                handler: handler,
                args: args
              });
            };
            if (handler == "print") out = Module[handler];
            if (handler == "printErr") err = Module[handler];
          }
        }
        wasmMemory = msgData["wasmMemory"];
        updateMemoryViews();
        wasmPromiseResolve(msgData["wasmModule"]);
      } else if (cmd === "run") {
        __emscripten_thread_init(msgData["pthread_ptr"], /*is_main=*/ 0, /*is_runtime=*/ 0, /*can_block=*/ 1, 0, 0);
        __emscripten_thread_mailbox_await(msgData["pthread_ptr"]);
        establishStackSpace();
        PThread.receiveObjectTransfer(msgData);
        PThread.threadInitTLS();
        if (!initializedJS) {
          __embind_initialize_bindings();
          initializedJS = true;
        }
        try {
          invokeEntryPoint(msgData["start_routine"], msgData["arg"]);
        } catch (ex) {
          if (ex != "unwind") {
            throw ex;
          }
        }
      } else if (cmd === "cancel") {
        if (_pthread_self()) {
          __emscripten_thread_exit(-1);
        }
      } else if (msgData.target === "setimmediate") {} else if (cmd === "checkMailbox") {
        if (initializedJS) {
          checkMailbox();
        }
      } else if (cmd) {
        err(`worker: received unknown command ${cmd}`);
        err(msgData);
      }
    } catch (ex) {
      __emscripten_thread_crashed();
      throw ex;
    }
  }
  self.onmessage = handleMessage;
}

var wasmBinary;

if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];

var wasmMemory;

var wasmModule;

var ABORT = false;

var EXITSTATUS;

/** @type {function(*, string=)} */ function assert(condition, text) {
  if (!condition) {
    abort(text);
  }
}

var HEAP, /** @type {!Int8Array} */ HEAP8, /** @type {!Uint8Array} */ HEAPU8, /** @type {!Int16Array} */ HEAP16, /** @type {!Uint16Array} */ HEAPU16, /** @type {!Int32Array} */ HEAP32, /** @type {!Uint32Array} */ HEAPU32, /** @type {!Float32Array} */ HEAPF32, /** @type {!Float64Array} */ HEAPF64;

function updateMemoryViews() {
  var b = wasmMemory.buffer;
  Module["HEAP8"] = HEAP8 = new Int8Array(b);
  Module["HEAP16"] = HEAP16 = new Int16Array(b);
  Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
  Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
  Module["HEAP32"] = HEAP32 = new Int32Array(b);
  Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
  Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
  Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
}

if (!ENVIRONMENT_IS_PTHREAD) {
  if (Module["wasmMemory"]) {
    wasmMemory = Module["wasmMemory"];
  } else {
    var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 3221225472;
    wasmMemory = new WebAssembly.Memory({
      "initial": INITIAL_MEMORY / 65536,
      "maximum": 4294967296 / 65536,
      "shared": true
    });
    if (!(wasmMemory.buffer instanceof SharedArrayBuffer)) {
      err("requested a shared WebAssembly.Memory but the returned buffer is not a SharedArrayBuffer, indicating that while the browser has SharedArrayBuffer it does not have WebAssembly threads support - you may need to set a flag");
      if (ENVIRONMENT_IS_NODE) {
        err("(on node you may need: --experimental-wasm-threads --experimental-wasm-bulk-memory and/or recent version)");
      }
      throw Error("bad memory");
    }
  }
  updateMemoryViews();
}

var __ATPRERUN__ = [];

var __ATINIT__ = [];

var __ATEXIT__ = [];

var __ATPOSTRUN__ = [];

var runtimeInitialized = false;

function preRun() {
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
    while (Module["preRun"].length) {
      addOnPreRun(Module["preRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  runtimeInitialized = true;
  if (ENVIRONMENT_IS_PTHREAD) return;
  callRuntimeCallbacks(__ATINIT__);
}

function postRun() {
  if (ENVIRONMENT_IS_PTHREAD) return;
  if (Module["postRun"]) {
    if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
    while (Module["postRun"].length) {
      addOnPostRun(Module["postRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnExit(cb) {}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

var runDependencies = 0;

var runDependencyWatcher = null;

var dependenciesFulfilled = null;

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  Module["monitorRunDependencies"]?.(runDependencies);
}

function removeRunDependency(id) {
  runDependencies--;
  Module["monitorRunDependencies"]?.(runDependencies);
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback();
    }
  }
}

/** @param {string|number=} what */ function abort(what) {
  Module["onAbort"]?.(what);
  what = "Aborted(" + what + ")";
  err(what);
  ABORT = true;
  EXITSTATUS = 1;
  what += ". Build with -sASSERTIONS for more info.";
  /** @suppress {checkTypes} */ var e = new WebAssembly.RuntimeError(what);
  readyPromiseReject(e);
  throw e;
}

var emscriptenMemoryProfiler = {
  detailedHeapUsage: true,
  trackedCallstackMinSizeBytes: (typeof (new Error).stack == "undefined") ? Infinity : 16 * 1024 * 1024,
  trackedCallstackMinAllocCount: (typeof (new Error).stack == "undefined") ? Infinity : 1e4,
  hookStackAlloc: true,
  uiUpdateIntervalMsecs: 2e3,
  allocationsAtLoc: {},
  allocationSitePtrs: {},
  sizeOfAllocatedPtr: {},
  sizeOfPreRunAllocatedPtr: {},
  resizeMemorySources: [],
  sbrkSources: [],
  pagePreRunIsFinished: false,
  totalMemoryAllocated: 0,
  totalTimesMallocCalled: 0,
  totalTimesFreeCalled: 0,
  stackTopWatermark: Infinity,
  canvas: null,
  drawContext: null,
  truncDec(f = 0) {
    var str = f.toFixed(2);
    if (str.includes(".00", str.length - 3)) return str.substr(0, str.length - 3); else if (str.includes("0", str.length - 1)) return str.substr(0, str.length - 1); else return str;
  },
  formatBytes(bytes) {
    if (bytes >= 1e3 * 1024 * 1024) return emscriptenMemoryProfiler.truncDec(bytes / (1024 * 1024 * 1024)) + " GB"; else if (bytes >= 1e3 * 1024) return emscriptenMemoryProfiler.truncDec(bytes / (1024 * 1024)) + " MB"; else if (bytes >= 1e3) return emscriptenMemoryProfiler.truncDec(bytes / 1024) + " KB"; else return emscriptenMemoryProfiler.truncDec(bytes) + " B";
  },
  hsvToRgb(h, s, v) {
    var h_i = (h * 6) | 0;
    var f = h * 6 - h_i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);
    var r, g, b;
    switch (h_i) {
     case 0:
      r = v;
      g = t;
      b = p;
      break;

     case 1:
      r = q;
      g = v;
      b = p;
      break;

     case 2:
      r = p;
      g = v;
      b = t;
      break;

     case 3:
      r = p;
      g = q;
      b = v;
      break;

     case 4:
      r = t;
      g = p;
      b = v;
      break;

     case 5:
      r = v;
      g = p;
      b = q;
      break;
    }
    function toHex(v) {
      v = (v * 255 | 0).toString(16);
      return (v.length == 1) ? "0" + v : v;
    }
    return "#" + toHex(r) + toHex(g) + toHex(b);
  },
  onSbrkGrow(oldLimit, newLimit) {
    var self = emscriptenMemoryProfiler;
    if (self.sbrkSources.length == 0) {
      self.sbrkSources.push({
        stack: "initial heap sbrk limit<br>",
        begin: 0,
        end: oldLimit,
        color: self.hsvToRgb(self.sbrkSources.length * .618033988749895 % 1, .5, .95)
      });
    }
    if (newLimit <= oldLimit) return;
    self.sbrkSources.push({
      stack: self.filterCallstackForHeapResize((new Error).stack.toString()),
      begin: oldLimit,
      end: newLimit,
      color: self.hsvToRgb(self.sbrkSources.length * .618033988749895 % 1, .5, .95)
    });
  },
  onMemoryResize(oldSize, newSize) {
    var self = emscriptenMemoryProfiler;
    if (self.resizeMemorySources.length == 0) {
      self.resizeMemorySources.push({
        stack: "initial heap size<br>",
        begin: 0,
        end: oldSize,
        color: self.resizeMemorySources.length % 2 ? "#ff00ff" : "#ff80ff"
      });
    }
    if (newSize <= oldSize) return;
    self.resizeMemorySources.push({
      stack: self.filterCallstackForHeapResize((new Error).stack.toString()),
      begin: oldSize,
      end: newSize,
      color: self.resizeMemorySources.length % 2 ? "#ff00ff" : "#ff80ff"
    });
    console.log("memory resize: " + oldSize + " " + newSize);
  },
  recordStackWatermark() {
    if (typeof runtimeInitialized == "undefined" || runtimeInitialized) {
      var self = emscriptenMemoryProfiler;
      self.stackTopWatermark = Math.min(self.stackTopWatermark, _emscripten_stack_get_current());
    }
  },
  onMalloc(ptr, size) {
    if (!ptr) return;
    if (emscriptenMemoryProfiler.sizeOfAllocatedPtr[ptr]) {
      return;
    }
    var self = emscriptenMemoryProfiler;
    self.totalMemoryAllocated += size;
    ++self.totalTimesMallocCalled;
    self.recordStackWatermark();
    self.sizeOfAllocatedPtr[ptr] = size;
    if (!self.pagePreRunIsFinished) self.sizeOfPreRunAllocatedPtr[ptr] = size;
    var loc = (new Error).stack.toString();
    self.allocationsAtLoc[loc] ||= [ 0, 0, self.filterCallstackForMalloc(loc) ];
    self.allocationsAtLoc[loc][0] += 1;
    self.allocationsAtLoc[loc][1] += size;
    self.allocationSitePtrs[ptr] = loc;
  },
  onFree(ptr) {
    if (!ptr) return;
    var self = emscriptenMemoryProfiler;
    var sz = self.sizeOfAllocatedPtr[ptr];
    if (!isNaN(sz)) self.totalMemoryAllocated -= sz; else {
      return;
    }
    self.recordStackWatermark();
    var loc = self.allocationSitePtrs[ptr];
    if (loc) {
      var allocsAtThisLoc = self.allocationsAtLoc[loc];
      if (allocsAtThisLoc) {
        allocsAtThisLoc[0] -= 1;
        allocsAtThisLoc[1] -= sz;
        if (allocsAtThisLoc[0] <= 0) delete self.allocationsAtLoc[loc];
      }
    }
    delete self.allocationSitePtrs[ptr];
    delete self.sizeOfAllocatedPtr[ptr];
    delete self.sizeOfPreRunAllocatedPtr[ptr];
    ++self.totalTimesFreeCalled;
  },
  onRealloc(oldAddress, newAddress, size) {
    emscriptenMemoryProfiler.onFree(oldAddress);
    emscriptenMemoryProfiler.onMalloc(newAddress, size);
  },
  onPreloadComplete() {
    emscriptenMemoryProfiler.pagePreRunIsFinished = true;
  },
  initialize() {
    Module["onMalloc"] = (ptr, size) => emscriptenMemoryProfiler.onMalloc(ptr, size);
    Module["onRealloc"] = (oldAddress, newAddress, size) => emscriptenMemoryProfiler.onRealloc(oldAddress, newAddress, size);
    Module["onFree"] = ptr => emscriptenMemoryProfiler.onFree(ptr);
    emscriptenMemoryProfiler.recordStackWatermark();
    Module["preRun"] ||= [];
    Module["preRun"].push(emscriptenMemoryProfiler.onPreloadComplete);
    if (emscriptenMemoryProfiler.hookStackAlloc && typeof stackAlloc == "function") {
      var prevStackAlloc = stackAlloc;
      var hookedStackAlloc = size => {
        var ptr = prevStackAlloc(size);
        emscriptenMemoryProfiler.recordStackWatermark();
        return ptr;
      };
      stackAlloc = hookedStackAlloc;
    }
    if (location.search.toLowerCase().includes("trackbytes=")) {
      emscriptenMemoryProfiler.trackedCallstackMinSizeBytes = parseInt(location.search.substr(location.search.toLowerCase().indexOf("trackbytes=") + "trackbytes=".length), undefined);
    }
    /* https://github.com/google/closure-compiler/issues/3230 / https://github.com/google/closure-compiler/issues/3548 */ if (location.search.toLowerCase().includes("trackcount=")) {
      emscriptenMemoryProfiler.trackedCallstackMinAllocCount = parseInt(location.search.substr(location.search.toLowerCase().indexOf("trackcount=") + "trackcount=".length), undefined);
    }
    emscriptenMemoryProfiler.memoryprofiler_summary = document.getElementById("memoryprofiler_summary");
    var div;
    if (!emscriptenMemoryProfiler.memoryprofiler_summary) {
      div = document.createElement("div");
      div.innerHTML = "<div style='border: 2px solid black; padding: 2px;'><canvas style='border: 1px solid black; margin-left: auto; margin-right: auto; display: block;' id='memoryprofiler_canvas' width='100%' height='50'></canvas><input type='checkbox' id='showHeapResizes' onclick='emscriptenMemoryProfiler.updateUi()'>Display heap and sbrk() resizes. Filter sbrk() and heap resize callstacks by keywords: <input type='text' id='sbrkFilter'>(reopen page with ?sbrkFilter=foo,bar query params to prepopulate this list)<br/>Track all allocation sites larger than <input id='memoryprofiler_min_tracked_alloc_size' type=number value=" + emscriptenMemoryProfiler.trackedCallstackMinSizeBytes + "></input> bytes, and all allocation sites with more than <input id='memoryprofiler_min_tracked_alloc_count' type=number value=" + emscriptenMemoryProfiler.trackedCallstackMinAllocCount + "></input> outstanding allocations. (visit this page via URL query params foo.html?trackbytes=1000&trackcount=100 to apply custom thresholds starting from page load)<br/><div id='memoryprofiler_summary'></div><input id='memoryprofiler_clear_alloc_stats' type='button' value='Clear alloc stats' ></input><br />Sort allocations by:<select id='memoryProfilerSort'><option value='bytes'>Bytes</option><option value='count'>Count</option><option value='fixed'>Fixed</option></select><div id='memoryprofiler_ptrs'></div>";
    }
    var populateHtmlBody = function() {
      if (div) {
        document.body.appendChild(div);
        function getValueOfParam(key) {
          var results = (new RegExp("[\\?&]" + key + "=([^&#]*)")).exec(location.href);
          return results ? results[1] : "";
        }
        if (document.getElementById("sbrkFilter").value = getValueOfParam("sbrkFilter")) {
          document.getElementById("showHeapResizes").checked = true;
        }
      }
      var self = emscriptenMemoryProfiler;
      self.memoryprofiler_summary = document.getElementById("memoryprofiler_summary");
      self.memoryprofiler_ptrs = document.getElementById("memoryprofiler_ptrs");
      document.getElementById("memoryprofiler_min_tracked_alloc_size").addEventListener("change", function(e) {
        self.trackedCallstackMinSizeBytes = parseInt(this.value, undefined);
      });
      /* https://github.com/google/closure-compiler/issues/3230 / https://github.com/google/closure-compiler/issues/3548 */ document.getElementById("memoryprofiler_min_tracked_alloc_count").addEventListener("change", function(e) {
        self.trackedCallstackMinAllocCount = parseInt(this.value, undefined);
      });
      document.getElementById("memoryprofiler_clear_alloc_stats").addEventListener("click", e => {
        self.allocationsAtLoc = {};
        self.allocationSitePtrs = {};
      });
      self.canvas = document.getElementById("memoryprofiler_canvas");
      self.canvas.width = document.documentElement.clientWidth - 32;
      self.drawContext = self.canvas.getContext("2d");
      self.updateUi();
      setInterval(() => emscriptenMemoryProfiler.updateUi(), self.uiUpdateIntervalMsecs);
    };
    if (document.body) populateHtmlBody(); else setTimeout(populateHtmlBody, 1e3);
  },
  bytesToPixelsRoundedDown(bytes) {
    return (bytes * emscriptenMemoryProfiler.canvas.width * emscriptenMemoryProfiler.canvas.height / GROWABLE_HEAP_I8().length) | 0;
  },
  bytesToPixelsRoundedUp(bytes) {
    return ((bytes * emscriptenMemoryProfiler.canvas.width * emscriptenMemoryProfiler.canvas.height + GROWABLE_HEAP_I8().length - 1) / GROWABLE_HEAP_I8().length) | 0;
  },
  fillLine(startBytes, endBytes) {
    var self = emscriptenMemoryProfiler;
    var startPixels = self.bytesToPixelsRoundedDown(startBytes);
    var endPixels = self.bytesToPixelsRoundedUp(endBytes);
    var x0 = (startPixels / self.canvas.height) | 0;
    var y0 = startPixels - x0 * self.canvas.height;
    var x1 = (endPixels / self.canvas.height) | 0;
    var y1 = endPixels - x1 * self.canvas.height;
    if (y0 > 0 && x0 < x1) {
      self.drawContext.fillRect(x0, y0, 1, self.canvas.height - y0);
      y0 = 0;
      ++x0;
    }
    if (y1 < self.canvas.height && x0 < x1) {
      self.drawContext.fillRect(x1, 0, 1, y1);
      y1 = self.canvas.height - 1;
      --x1;
    }
    self.drawContext.fillRect(x0, 0, x1 - x0 + 1, self.canvas.height);
  },
  fillRect(startBytes, endBytes, heightPercentage) {
    var self = emscriptenMemoryProfiler;
    var startPixels = self.bytesToPixelsRoundedDown(startBytes);
    var endPixels = self.bytesToPixelsRoundedUp(endBytes);
    var x0 = (startPixels / self.canvas.height) | 0;
    var x1 = (endPixels / self.canvas.height) | 0;
    self.drawContext.fillRect(x0, self.canvas.height * (1 - heightPercentage), x1 - x0 + 1, self.canvas.height);
  },
  countOpenALAudioDataSize() {
    if (typeof AL == "undefined" || !AL.currentContext) return 0;
    var totalMemory = 0;
    for (var i in AL.currentContext.buf) {
      var buffer = AL.currentContext.buf[i];
      for (var channel = 0; channel < buffer.numberOfChannels; ++channel) totalMemory += buffer.getChannelData(channel).length * 4;
    }
    return totalMemory;
  },
  printAllocsWithCyclingColors(colors, allocs) {
    var colorIndex = 0;
    for (var i in allocs) {
      emscriptenMemoryProfiler.drawContext.fillStyle = colors[colorIndex];
      colorIndex = (colorIndex + 1) % colors.length;
      var start = i | 0;
      var sz = allocs[start] | 0;
      emscriptenMemoryProfiler.fillLine(start, start + sz);
    }
  },
  filterURLsFromCallstack(callstack) {
    callstack = callstack.replace(/@((file)|(http))[\w:\/\.]*\/([\w\.]*)/g, "@$4");
    callstack = callstack.replace(/\n/g, "<br />");
    return callstack;
  },
  filterCallstackAfterFunctionName(callstack, func) {
    var i = callstack.indexOf(func);
    if (i != -1) {
      var end = callstack.indexOf("<br />", i);
      if (end != -1) {
        return callstack.substr(0, end);
      }
    }
    return callstack;
  },
  filterCallstackForMalloc(callstack) {
    var i = callstack.indexOf("emscripten_trace_record_");
    if (i != -1) {
      callstack = callstack.substr(callstack.indexOf("\n", i) + 1);
    }
    return emscriptenMemoryProfiler.filterURLsFromCallstack(callstack);
  },
  filterCallstackForHeapResize(callstack) {
    var i = callstack.indexOf("emscripten_asm_const_iii");
    var j = callstack.indexOf("growMemory");
    i = (i == -1) ? j : (j == -1 ? i : Math.min(i, j));
    if (i != -1) {
      callstack = callstack.substr(callstack.indexOf("\n", i) + 1);
    }
    callstack = callstack.replace(/(wasm-function\[\d+\]):0x[0-9a-f]+/g, "$1");
    return emscriptenMemoryProfiler.filterURLsFromCallstack(callstack);
  },
  printHeapResizeLog(heapResizes) {
    var html = "";
    for (var i = 0; i < heapResizes.length; ++i) {
      var j = i + 1;
      while (j < heapResizes.length) {
        if ((heapResizes[j].filteredStack || heapResizes[j].stack) == (heapResizes[i].filteredStack || heapResizes[i].stack)) {
          ++j;
        } else {
          break;
        }
      }
      var resizeFirst = heapResizes[i];
      var resizeLast = heapResizes[j - 1];
      var count = j - i;
      html += '<div style="background-color: ' + resizeFirst.color + '"><b>' + resizeFirst.begin + "-" + resizeLast.end + " (" + count + " times, " + emscriptenMemoryProfiler.formatBytes(resizeLast.end - resizeFirst.begin) + ")</b>:" + (resizeFirst.filteredStack || resizeFirst.stack) + "</div><br>";
      i = j - 1;
    }
    return html;
  },
  updateUi() {
    if (document.body.style.overflow != "") document.body.style.overflow = "";
    function colorBar(color) {
      return '<span style="padding:0px; border:solid 1px black; width:28px;height:14px; vertical-align:middle; display:inline-block; background-color:' + color + ';"></span>';
    }
    function nBits(n) {
      var i = 0;
      while (n >= 1) {
        ++i;
        n /= 2;
      }
      return i;
    }
    function toHex(i, width) {
      var str = i.toString(16);
      while (str.length < width) str = "0" + str;
      return "0x" + str;
    }
    var self = emscriptenMemoryProfiler;
    if (self.canvas.width != document.documentElement.clientWidth - 32) {
      self.canvas.width = document.documentElement.clientWidth - 32;
    }
    if (typeof runtimeInitialized != "undefined" && !runtimeInitialized) {
      return;
    }
    var stackBase = _emscripten_stack_get_base();
    var stackMax = _emscripten_stack_get_end();
    var stackCurrent = _emscripten_stack_get_current();
    var width = (nBits(GROWABLE_HEAP_I8().length) + 3) / 4;
    var html = "Total HEAP size: " + self.formatBytes(GROWABLE_HEAP_I8().length) + ".";
    html += "<br />" + colorBar("#202020") + "STATIC memory area size: " + self.formatBytes(stackMax - 1024);
    html += ". 1024: " + toHex(1024, width);
    html += "<br />" + colorBar("#FF8080") + "STACK memory area size: " + self.formatBytes(stackBase - stackMax);
    html += ". STACK_BASE: " + toHex(stackBase, width);
    html += ". STACKTOP: " + toHex(stackCurrent, width);
    html += ". STACK_MAX: " + toHex(stackMax, width) + ".";
    html += "<br />STACK memory area used now (should be zero): " + self.formatBytes(stackBase - stackCurrent) + "." + colorBar("#FFFF00") + " STACK watermark highest seen usage (approximate lower-bound!): " + self.formatBytes(stackBase - self.stackTopWatermark);
    var heap_base = Module["___heap_base"];
    var heap_end = _sbrk();
    html += "<br />DYNAMIC memory area size: " + self.formatBytes(heap_end - heap_base);
    html += ". start: " + toHex(heap_base, width);
    html += ". end: " + toHex(heap_end, width) + ".";
    html += "<br />" + colorBar("#6699CC") + colorBar("#003366") + colorBar("#0000FF") + "DYNAMIC memory area used: " + self.formatBytes(self.totalMemoryAllocated) + " (" + (self.totalMemoryAllocated * 100 / (GROWABLE_HEAP_I8().length - heap_base)).toFixed(2) + "% of all dynamic memory and unallocated heap)";
    html += "<br />Free memory: " + colorBar("#70FF70") + "DYNAMIC: " + self.formatBytes(heap_end - heap_base - self.totalMemoryAllocated) + ", " + colorBar("#FFFFFF") + "Unallocated HEAP: " + self.formatBytes(GROWABLE_HEAP_I8().length - heap_end) + " (" + ((GROWABLE_HEAP_I8().length - heap_base - self.totalMemoryAllocated) * 100 / (GROWABLE_HEAP_I8().length - heap_base)).toFixed(2) + "% of all dynamic memory and unallocated heap)";
    var preloadedMemoryUsed = 0;
    for (var i in self.sizeOfPreRunAllocatedPtr) preloadedMemoryUsed += self.sizeOfPreRunAllocatedPtr[i] | 0;
    html += "<br />" + colorBar("#FF9900") + colorBar("#FFDD33") + "Preloaded memory used, most likely memory reserved by files in the virtual filesystem : " + self.formatBytes(preloadedMemoryUsed);
    html += "<br />OpenAL audio data: " + self.formatBytes(self.countOpenALAudioDataSize()) + " (outside HEAP)";
    html += "<br /># of total malloc()s/free()s performed in app lifetime: " + self.totalTimesMallocCalled + "/" + self.totalTimesFreeCalled + " (currently alive pointers: " + (self.totalTimesMallocCalled - self.totalTimesFreeCalled) + ")";
    self.drawContext.fillStyle = "#FFFFFF";
    self.drawContext.fillRect(0, 0, self.canvas.width, self.canvas.height);
    self.drawContext.fillStyle = "#FF8080";
    self.fillLine(stackMax, stackBase);
    self.drawContext.fillStyle = "#FFFF00";
    self.fillLine(self.stackTopWatermark, stackBase);
    self.drawContext.fillStyle = "#FF0000";
    self.fillLine(stackCurrent, stackBase);
    self.drawContext.fillStyle = "#70FF70";
    self.fillLine(heap_base, heap_end);
    if (self.detailedHeapUsage) {
      self.printAllocsWithCyclingColors([ "#6699CC", "#003366", "#0000FF" ], self.sizeOfAllocatedPtr);
      self.printAllocsWithCyclingColors([ "#FF9900", "#FFDD33" ], self.sizeOfPreRunAllocatedPtr);
    } else {
      self.drawContext.fillStyle = "#0000FF";
      self.fillLine(heap_base, heap_base + self.totalMemoryAllocated);
    }
    if (document.getElementById("showHeapResizes").checked) {
      for (var i in self.resizeMemorySources) {
        var resize = self.resizeMemorySources[i];
        self.drawContext.fillStyle = resize.color;
        self.fillRect(resize.begin, resize.end, .5);
      }
      var uniqueSources = {};
      var filterWords = document.getElementById("sbrkFilter").value.split(",");
      for (var i in self.sbrkSources) {
        var sbrk = self.sbrkSources[i];
        var stack = sbrk.stack;
        for (var j in filterWords) {
          var s = filterWords[j].trim();
          if (s.length > 0) stack = self.filterCallstackAfterFunctionName(stack, s);
        }
        sbrk.filteredStack = stack;
        uniqueSources[stack] ||= self.hsvToRgb(Object.keys(uniqueSources).length * .618033988749895 % 1, .5, .95);
        self.drawContext.fillStyle = sbrk.color = uniqueSources[stack];
        self.fillRect(sbrk.begin, sbrk.end, .25);
      }
      function line(x0, y0, x1, y1) {
        self.drawContext.beginPath();
        self.drawContext.moveTo(x0, y0);
        self.drawContext.lineTo(x1, y1);
        self.drawContext.lineWidth = 2;
        self.drawContext.stroke();
      }
      if (self.sbrkSources.length > 0) line(0, .75 * self.canvas.height, self.canvas.width, .75 * self.canvas.height);
      if (self.resizeMemorySources.length > 0) line(0, .5 * self.canvas.height, self.canvas.width, .5 * self.canvas.height);
    }
    self.memoryprofiler_summary.innerHTML = html;
    var sort = document.getElementById("memoryProfilerSort");
    var sortOrder = sort.options[sort.selectedIndex].value;
    html = "";
    if (document.getElementById("showHeapResizes").checked) {
      html += '<div style="background-color: #c0c0c0"><h4>Heap resize locations:</h4>';
      html += self.printHeapResizeLog(self.resizeMemorySources);
      html += "</div>";
      html += '<div style="background-color: #c0c0ff"><h4>Memory sbrk() locations:</h4>';
      html += self.printHeapResizeLog(self.sbrkSources);
      html += "</div>";
    } else {
      if (Object.keys(self.allocationsAtLoc).length > 0) {
        var calls = [];
        for (var i in self.allocationsAtLoc) {
          if (self.allocationsAtLoc[i][0] >= self.trackedCallstackMinAllocCount || self.allocationsAtLoc[i][1] >= self.trackedCallstackMinSizeBytes) {
            calls.push(self.allocationsAtLoc[i]);
          }
        }
        if (calls.length > 0) {
          if (sortOrder != "fixed") {
            var sortIdx = (sortOrder == "count") ? 0 : 1;
            calls.sort((a, b) => b[sortIdx] - a[sortIdx]);
          }
          html += "<h4>Allocation sites with more than " + self.formatBytes(self.trackedCallstackMinSizeBytes) + " of accumulated allocations, or more than " + self.trackedCallstackMinAllocCount + " simultaneously outstanding allocations:</h4>";
          for (var i in calls) {
            html += "<b>" + self.formatBytes(calls[i][1]) + "/" + calls[i][0] + " allocs</b>: " + calls[i][2] + "<br />";
          }
        }
      }
    }
    self.memoryprofiler_ptrs.innerHTML = html;
  }
};

function memoryprofiler_add_hooks() {
  emscriptenMemoryProfiler.initialize();
}

if (typeof document != "undefined" && typeof window != "undefined" && typeof process == "undefined") {
  emscriptenMemoryProfiler.initialize();
}

globalThis.emscriptenMemoryProfiler = emscriptenMemoryProfiler;

var dataURIPrefix = "data:application/octet-stream;base64,";

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */ var isDataURI = filename => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */ var isFileURI = filename => filename.startsWith("file://");

function findWasmBinary() {
  if (Module["locateFile"]) {
    var f = "lib.wasm";
    if (!isDataURI(f)) {
      return locateFile(f);
    }
    return f;
  }
  return new URL("lib.wasm", import.meta.url).href;
}

var wasmBinaryFile;

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
    return readBinary(file);
  }
  throw "both async and sync fetching of the wasm failed";
}

function getBinaryPromise(binaryFile) {
  if (!wasmBinary) {
    return new Promise((resolve, reject) => {
      readAsync(binaryFile, response => resolve(new Uint8Array(/** @type{!ArrayBuffer} */ (response))), error => {
        try {
          resolve(getBinarySync(binaryFile));
        } catch (e) {
          reject(e);
        }
      });
    });
  }
  return Promise.resolve().then(() => getBinarySync(binaryFile));
}

function instantiateArrayBuffer(binaryFile, imports, receiver) {
  return getBinaryPromise(binaryFile).then(binary => WebAssembly.instantiate(binary, imports)).then(receiver, reason => {
    err(`failed to asynchronously prepare wasm: ${reason}`);
    abort(reason);
  });
}

function instantiateAsync(binary, binaryFile, imports, callback) {
  if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && typeof fetch == "function") {
    return fetch(binaryFile, {
      credentials: "same-origin"
    }).then(response => {
      /** @suppress {checkTypes} */ var result = WebAssembly.instantiateStreaming(response, imports);
      return result.then(callback, function(reason) {
        err(`wasm streaming compile failed: ${reason}`);
        err("falling back to ArrayBuffer instantiation");
        return instantiateArrayBuffer(binaryFile, imports, callback);
      });
    });
  }
  return instantiateArrayBuffer(binaryFile, imports, callback);
}

function getWasmImports() {
  assignWasmImports();
  return {
    "env": wasmImports,
    "wasi_snapshot_preview1": wasmImports
  };
}

function createWasm() {
  var info = getWasmImports();
  /** @param {WebAssembly.Module=} module*/ function receiveInstance(instance, module) {
    wasmExports = instance.exports;
    wasmExports = applySignatureConversions(wasmExports);
    registerTLSInit(wasmExports["_emscripten_tls_init"]);
    wasmTable = wasmExports["__indirect_function_table"];
    addOnInit(wasmExports["__wasm_call_ctors"]);
    wasmModule = module;
    removeRunDependency("wasm-instantiate");
    return wasmExports;
  }
  addRunDependency("wasm-instantiate");
  function receiveInstantiationResult(result) {
    receiveInstance(result["instance"], result["module"]);
  }
  if (Module["instantiateWasm"]) {
    try {
      return Module["instantiateWasm"](info, receiveInstance);
    } catch (e) {
      err(`Module.instantiateWasm callback failed with error: ${e}`);
      readyPromiseReject(e);
    }
  }
  if (!wasmBinaryFile) wasmBinaryFile = findWasmBinary();
  instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
  return {};
}

var tempDouble;

var tempI64;

/** @constructor */ function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = `Program terminated with exit(${status})`;
  this.status = status;
}

var terminateWorker = worker => {
  worker.terminate();
  worker.onmessage = e => {};
};

var killThread = pthread_ptr => {
  var worker = PThread.pthreads[pthread_ptr];
  delete PThread.pthreads[pthread_ptr];
  terminateWorker(worker);
  __emscripten_thread_free_data(pthread_ptr);
  PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1);
  worker.pthread_ptr = 0;
};

var cancelThread = pthread_ptr => {
  var worker = PThread.pthreads[pthread_ptr];
  worker.postMessage({
    "cmd": "cancel"
  });
};

var cleanupThread = pthread_ptr => {
  var worker = PThread.pthreads[pthread_ptr];
  PThread.returnWorkerToPool(worker);
};

var zeroMemory = (address, size) => {
  GROWABLE_HEAP_U8().fill(0, address, address + size);
  return address;
};

var spawnThread = threadParams => {
  var worker = PThread.getNewWorker();
  if (!worker) {
    return 6;
  }
  PThread.runningWorkers.push(worker);
  PThread.pthreads[threadParams.pthread_ptr] = worker;
  worker.pthread_ptr = threadParams.pthread_ptr;
  var msg = {
    "cmd": "run",
    "start_routine": threadParams.startRoutine,
    "arg": threadParams.arg,
    "pthread_ptr": threadParams.pthread_ptr
  };
  worker.postMessage(msg, threadParams.transferList);
  return 0;
};

var runtimeKeepaliveCounter = 0;

var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;

var stackSave = () => _emscripten_stack_get_current();

var stackRestore = val => __emscripten_stack_restore(val);

var stackAlloc = sz => __emscripten_stack_alloc(sz);

var convertI32PairToI53Checked = (lo, hi) => ((hi + 2097152) >>> 0 < 4194305 - !!lo) ? (lo >>> 0) + hi * 4294967296 : NaN;

/** @type{function(number, (number|boolean), ...number)} */ var proxyToMainThread = (funcIndex, emAsmAddr, sync, ...callArgs) => {
  var serializedNumCallArgs = callArgs.length;
  var sp = stackSave();
  var args = stackAlloc(serializedNumCallArgs * 8);
  var b = ((args) >>> 3);
  for (var i = 0; i < callArgs.length; i++) {
    var arg = callArgs[i];
    GROWABLE_HEAP_F64()[b + i >>> 0] = arg;
  }
  var rtn = __emscripten_run_on_main_thread_js(funcIndex, emAsmAddr, serializedNumCallArgs, args, sync);
  stackRestore(sp);
  return rtn;
};

function _proc_exit(code) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(0, 0, 1, code);
  EXITSTATUS = code;
  if (!keepRuntimeAlive()) {
    PThread.terminateAllThreads();
    Module["onExit"]?.(code);
    ABORT = true;
  }
  quit_(code, new ExitStatus(code));
}

var handleException = e => {
  if (e instanceof ExitStatus || e == "unwind") {
    return EXITSTATUS;
  }
  quit_(1, e);
};

function exitOnMainThread(returnCode) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(1, 0, 0, returnCode);
  _exit(returnCode);
}

/** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {
  EXITSTATUS = status;
  if (ENVIRONMENT_IS_PTHREAD) {
    exitOnMainThread(status);
    throw "unwind";
  }
  _proc_exit(status);
};

var _exit = exitJS;

var PThread = {
  unusedWorkers: [],
  runningWorkers: [],
  tlsInitFunctions: [],
  pthreads: {},
  init() {
    if (ENVIRONMENT_IS_PTHREAD) {
      PThread.initWorker();
    } else {
      PThread.initMainThread();
    }
  },
  initMainThread() {
    var pthreadPoolSize = navigator.hardwareConcurrency;
    while (pthreadPoolSize--) {
      PThread.allocateUnusedWorker();
    }
    addOnPreRun(() => {
      addRunDependency("loading-workers");
      PThread.loadWasmModuleToAllWorkers(() => removeRunDependency("loading-workers"));
    });
  },
  initWorker() {
    noExitRuntime = false;
  },
  setExitStatus: status => EXITSTATUS = status,
  terminateAllThreads__deps: [ "$terminateWorker" ],
  terminateAllThreads: () => {
    for (var worker of PThread.runningWorkers) {
      terminateWorker(worker);
    }
    for (var worker of PThread.unusedWorkers) {
      terminateWorker(worker);
    }
    PThread.unusedWorkers = [];
    PThread.runningWorkers = [];
    PThread.pthreads = [];
  },
  returnWorkerToPool: worker => {
    var pthread_ptr = worker.pthread_ptr;
    delete PThread.pthreads[pthread_ptr];
    PThread.unusedWorkers.push(worker);
    PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker), 1);
    worker.pthread_ptr = 0;
    __emscripten_thread_free_data(pthread_ptr);
  },
  receiveObjectTransfer(data) {},
  threadInitTLS() {
    PThread.tlsInitFunctions.forEach(f => f());
  },
  loadWasmModuleToWorker: worker => new Promise(onFinishedLoading => {
    worker.onmessage = e => {
      var d = e["data"];
      var cmd = d["cmd"];
      if (d["targetThread"] && d["targetThread"] != _pthread_self()) {
        var targetWorker = PThread.pthreads[d["targetThread"]];
        if (targetWorker) {
          targetWorker.postMessage(d, d["transferList"]);
        } else {
          err(`Internal error! Worker sent a message "${cmd}" to target pthread ${d["targetThread"]}, but that thread no longer exists!`);
        }
        return;
      }
      if (cmd === "checkMailbox") {
        checkMailbox();
      } else if (cmd === "spawnThread") {
        spawnThread(d);
      } else if (cmd === "cleanupThread") {
        cleanupThread(d["thread"]);
      } else if (cmd === "killThread") {
        killThread(d["thread"]);
      } else if (cmd === "cancelThread") {
        cancelThread(d["thread"]);
      } else if (cmd === "loaded") {
        worker.loaded = true;
        onFinishedLoading(worker);
      } else if (cmd === "alert") {
        alert(`Thread ${d["threadId"]}: ${d["text"]}`);
      } else if (d.target === "setimmediate") {
        worker.postMessage(d);
      } else if (cmd === "callHandler") {
        Module[d["handler"]](...d["args"]);
      } else if (cmd) {
        err(`worker sent an unknown command ${cmd}`);
      }
    };
    worker.onerror = e => {
      var message = "worker sent an error!";
      err(`${message} ${e.filename}:${e.lineno}: ${e.message}`);
      throw e;
    };
    var handlers = [];
    var knownHandlers = [ "onExit", "onAbort", "print", "printErr" ];
    for (var handler of knownHandlers) {
      if (Module.propertyIsEnumerable(handler)) {
        handlers.push(handler);
      }
    }
    worker.postMessage({
      "cmd": "load",
      "handlers": handlers,
      "wasmMemory": wasmMemory,
      "wasmModule": wasmModule
    });
  }),
  loadWasmModuleToAllWorkers(onMaybeReady) {
    if (ENVIRONMENT_IS_PTHREAD) {
      return onMaybeReady();
    }
    let pthreadPoolReady = Promise.all(PThread.unusedWorkers.map(PThread.loadWasmModuleToWorker));
    pthreadPoolReady.then(onMaybeReady);
  },
  allocateUnusedWorker() {
    var worker;
    var workerOptions = {
      "type": "module",
      "name": "em-pthread"
    };
    worker = new Worker(new URL(import.meta.url), workerOptions);
    PThread.unusedWorkers.push(worker);
  },
  getNewWorker() {
    if (PThread.unusedWorkers.length == 0) {
      PThread.allocateUnusedWorker();
      PThread.loadWasmModuleToWorker(PThread.unusedWorkers[0]);
    }
    return PThread.unusedWorkers.pop();
  }
};

var callRuntimeCallbacks = callbacks => {
  while (callbacks.length > 0) {
    callbacks.shift()(Module);
  }
};

var establishStackSpace = () => {
  var pthread_ptr = _pthread_self();
  var stackHigh = GROWABLE_HEAP_U32()[(((pthread_ptr) + (52)) >>> 2) >>> 0];
  var stackSize = GROWABLE_HEAP_U32()[(((pthread_ptr) + (56)) >>> 2) >>> 0];
  var stackLow = stackHigh - stackSize;
  _emscripten_stack_set_limits(stackHigh, stackLow);
  stackRestore(stackHigh);
};

/**
     * @param {number} ptr
     * @param {string} type
     */ function getValue(ptr, type = "i8") {
  if (type.endsWith("*")) type = "*";
  switch (type) {
   case "i1":
    return GROWABLE_HEAP_I8()[ptr >>> 0];

   case "i8":
    return GROWABLE_HEAP_I8()[ptr >>> 0];

   case "i16":
    return GROWABLE_HEAP_I16()[((ptr) >>> 1) >>> 0];

   case "i32":
    return GROWABLE_HEAP_I32()[((ptr) >>> 2) >>> 0];

   case "i64":
    abort("to do getValue(i64) use WASM_BIGINT");

   case "float":
    return GROWABLE_HEAP_F32()[((ptr) >>> 2) >>> 0];

   case "double":
    return GROWABLE_HEAP_F64()[((ptr) >>> 3) >>> 0];

   case "*":
    return GROWABLE_HEAP_U32()[((ptr) >>> 2) >>> 0];

   default:
    abort(`invalid type for getValue: ${type}`);
  }
}

var wasmTableMirror = [];

/** @type {WebAssembly.Table} */ var wasmTable;

var getWasmTableEntry = funcPtr => {
  var func = wasmTableMirror[funcPtr];
  if (!func) {
    if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
    wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
  }
  return func;
};

var invokeEntryPoint = (ptr, arg) => {
  runtimeKeepaliveCounter = 0;
  var result = getWasmTableEntry(ptr)(arg);
  function finish(result) {
    if (keepRuntimeAlive()) {
      PThread.setExitStatus(result);
    } else {
      __emscripten_thread_exit(result);
    }
  }
  finish(result);
};

var noExitRuntime = Module["noExitRuntime"] || true;

var registerTLSInit = tlsInitFunc => PThread.tlsInitFunctions.push(tlsInitFunc);

/**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */ function setValue(ptr, value, type = "i8") {
  if (type.endsWith("*")) type = "*";
  switch (type) {
   case "i1":
    GROWABLE_HEAP_I8()[ptr >>> 0] = value;
    break;

   case "i8":
    GROWABLE_HEAP_I8()[ptr >>> 0] = value;
    break;

   case "i16":
    GROWABLE_HEAP_I16()[((ptr) >>> 1) >>> 0] = value;
    break;

   case "i32":
    GROWABLE_HEAP_I32()[((ptr) >>> 2) >>> 0] = value;
    break;

   case "i64":
    abort("to do setValue(i64) use WASM_BIGINT");

   case "float":
    GROWABLE_HEAP_F32()[((ptr) >>> 2) >>> 0] = value;
    break;

   case "double":
    GROWABLE_HEAP_F64()[((ptr) >>> 3) >>> 0] = value;
    break;

   case "*":
    GROWABLE_HEAP_U32()[((ptr) >>> 2) >>> 0] = value;
    break;

   default:
    abort(`invalid type for setValue: ${type}`);
  }
}

var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined;

/**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */ var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
  idx >>>= 0;
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
    return UTF8Decoder.decode(heapOrArray.buffer instanceof SharedArrayBuffer ? heapOrArray.slice(idx, endPtr) : heapOrArray.subarray(idx, endPtr));
  }
  var str = "";
  while (idx < endPtr) {
    var u0 = heapOrArray[idx++];
    if (!(u0 & 128)) {
      str += String.fromCharCode(u0);
      continue;
    }
    var u1 = heapOrArray[idx++] & 63;
    if ((u0 & 224) == 192) {
      str += String.fromCharCode(((u0 & 31) << 6) | u1);
      continue;
    }
    var u2 = heapOrArray[idx++] & 63;
    if ((u0 & 240) == 224) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
    }
    if (u0 < 65536) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 65536;
      str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
    }
  }
  return str;
};

/**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */ var UTF8ToString = (ptr, maxBytesToRead) => {
  ptr >>>= 0;
  return ptr ? UTF8ArrayToString(GROWABLE_HEAP_U8(), ptr, maxBytesToRead) : "";
};

function ___assert_fail(condition, filename, line, func) {
  condition >>>= 0;
  filename >>>= 0;
  func >>>= 0;
  abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [ filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function" ]);
}

class ExceptionInfo {
  constructor(excPtr) {
    this.excPtr = excPtr;
    this.ptr = excPtr - 24;
  }
  set_type(type) {
    GROWABLE_HEAP_U32()[(((this.ptr) + (4)) >>> 2) >>> 0] = type;
  }
  get_type() {
    return GROWABLE_HEAP_U32()[(((this.ptr) + (4)) >>> 2) >>> 0];
  }
  set_destructor(destructor) {
    GROWABLE_HEAP_U32()[(((this.ptr) + (8)) >>> 2) >>> 0] = destructor;
  }
  get_destructor() {
    return GROWABLE_HEAP_U32()[(((this.ptr) + (8)) >>> 2) >>> 0];
  }
  set_caught(caught) {
    caught = caught ? 1 : 0;
    GROWABLE_HEAP_I8()[(this.ptr) + (12) >>> 0] = caught;
  }
  get_caught() {
    return GROWABLE_HEAP_I8()[(this.ptr) + (12) >>> 0] != 0;
  }
  set_rethrown(rethrown) {
    rethrown = rethrown ? 1 : 0;
    GROWABLE_HEAP_I8()[(this.ptr) + (13) >>> 0] = rethrown;
  }
  get_rethrown() {
    return GROWABLE_HEAP_I8()[(this.ptr) + (13) >>> 0] != 0;
  }
  init(type, destructor) {
    this.set_adjusted_ptr(0);
    this.set_type(type);
    this.set_destructor(destructor);
  }
  set_adjusted_ptr(adjustedPtr) {
    GROWABLE_HEAP_U32()[(((this.ptr) + (16)) >>> 2) >>> 0] = adjustedPtr;
  }
  get_adjusted_ptr() {
    return GROWABLE_HEAP_U32()[(((this.ptr) + (16)) >>> 2) >>> 0];
  }
  get_exception_ptr() {
    var isPointer = ___cxa_is_pointer_type(this.get_type());
    if (isPointer) {
      return GROWABLE_HEAP_U32()[((this.excPtr) >>> 2) >>> 0];
    }
    var adjusted = this.get_adjusted_ptr();
    if (adjusted !== 0) return adjusted;
    return this.excPtr;
  }
}

var exceptionLast = 0;

var uncaughtExceptionCount = 0;

function ___cxa_throw(ptr, type, destructor) {
  ptr >>>= 0;
  type >>>= 0;
  destructor >>>= 0;
  var info = new ExceptionInfo(ptr);
  info.init(type, destructor);
  exceptionLast = ptr;
  uncaughtExceptionCount++;
  throw exceptionLast;
}

function pthreadCreateProxied(pthread_ptr, attr, startRoutine, arg) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(2, 0, 1, pthread_ptr, attr, startRoutine, arg);
  return ___pthread_create_js(pthread_ptr, attr, startRoutine, arg);
}

function ___pthread_create_js(pthread_ptr, attr, startRoutine, arg) {
  pthread_ptr >>>= 0;
  attr >>>= 0;
  startRoutine >>>= 0;
  arg >>>= 0;
  if (typeof SharedArrayBuffer == "undefined") {
    err("Current environment does not support SharedArrayBuffer, pthreads are not available!");
    return 6;
  }
  var transferList = [];
  var error = 0;
  if (ENVIRONMENT_IS_PTHREAD && (transferList.length === 0 || error)) {
    return pthreadCreateProxied(pthread_ptr, attr, startRoutine, arg);
  }
  if (error) return error;
  var threadParams = {
    startRoutine: startRoutine,
    pthread_ptr: pthread_ptr,
    arg: arg,
    transferList: transferList
  };
  if (ENVIRONMENT_IS_PTHREAD) {
    threadParams.cmd = "spawnThread";
    postMessage(threadParams, transferList);
    return 0;
  }
  return spawnThread(threadParams);
}

var __abort_js = () => {
  abort("");
};

var structRegistrations = {};

var runDestructors = destructors => {
  while (destructors.length) {
    var ptr = destructors.pop();
    var del = destructors.pop();
    del(ptr);
  }
};

/** @suppress {globalThis} */ function readPointer(pointer) {
  return this["fromWireType"](GROWABLE_HEAP_U32()[((pointer) >>> 2) >>> 0]);
}

var awaitingDependencies = {};

var registeredTypes = {};

var typeDependencies = {};

var InternalError;

var throwInternalError = message => {
  throw new InternalError(message);
};

var whenDependentTypesAreResolved = (myTypes, dependentTypes, getTypeConverters) => {
  myTypes.forEach(function(type) {
    typeDependencies[type] = dependentTypes;
  });
  function onComplete(typeConverters) {
    var myTypeConverters = getTypeConverters(typeConverters);
    if (myTypeConverters.length !== myTypes.length) {
      throwInternalError("Mismatched type converter count");
    }
    for (var i = 0; i < myTypes.length; ++i) {
      registerType(myTypes[i], myTypeConverters[i]);
    }
  }
  var typeConverters = new Array(dependentTypes.length);
  var unregisteredTypes = [];
  var registered = 0;
  dependentTypes.forEach((dt, i) => {
    if (registeredTypes.hasOwnProperty(dt)) {
      typeConverters[i] = registeredTypes[dt];
    } else {
      unregisteredTypes.push(dt);
      if (!awaitingDependencies.hasOwnProperty(dt)) {
        awaitingDependencies[dt] = [];
      }
      awaitingDependencies[dt].push(() => {
        typeConverters[i] = registeredTypes[dt];
        ++registered;
        if (registered === unregisteredTypes.length) {
          onComplete(typeConverters);
        }
      });
    }
  });
  if (0 === unregisteredTypes.length) {
    onComplete(typeConverters);
  }
};

var __embind_finalize_value_object = function(structType) {
  structType >>>= 0;
  var reg = structRegistrations[structType];
  delete structRegistrations[structType];
  var rawConstructor = reg.rawConstructor;
  var rawDestructor = reg.rawDestructor;
  var fieldRecords = reg.fields;
  var fieldTypes = fieldRecords.map(field => field.getterReturnType).concat(fieldRecords.map(field => field.setterArgumentType));
  whenDependentTypesAreResolved([ structType ], fieldTypes, fieldTypes => {
    var fields = {};
    fieldRecords.forEach((field, i) => {
      var fieldName = field.fieldName;
      var getterReturnType = fieldTypes[i];
      var getter = field.getter;
      var getterContext = field.getterContext;
      var setterArgumentType = fieldTypes[i + fieldRecords.length];
      var setter = field.setter;
      var setterContext = field.setterContext;
      fields[fieldName] = {
        read: ptr => getterReturnType["fromWireType"](getter(getterContext, ptr)),
        write: (ptr, o) => {
          var destructors = [];
          setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, o));
          runDestructors(destructors);
        }
      };
    });
    return [ {
      name: reg.name,
      "fromWireType": ptr => {
        var rv = {};
        for (var i in fields) {
          rv[i] = fields[i].read(ptr);
        }
        rawDestructor(ptr);
        return rv;
      },
      "toWireType": (destructors, o) => {
        for (var fieldName in fields) {
          if (!(fieldName in o)) {
            throw new TypeError(`Missing field: "${fieldName}"`);
          }
        }
        var ptr = rawConstructor();
        for (fieldName in fields) {
          fields[fieldName].write(ptr, o[fieldName]);
        }
        if (destructors !== null) {
          destructors.push(rawDestructor, ptr);
        }
        return ptr;
      },
      "argPackAdvance": GenericWireTypeSize,
      "readValueFromPointer": readPointer,
      destructorFunction: rawDestructor
    } ];
  });
};

function __embind_register_bigint(primitiveType, name, size, minRange, maxRange) {
  primitiveType >>>= 0;
  name >>>= 0;
  size >>>= 0;
}

var embind_init_charCodes = () => {
  var codes = new Array(256);
  for (var i = 0; i < 256; ++i) {
    codes[i] = String.fromCharCode(i);
  }
  embind_charCodes = codes;
};

var embind_charCodes;

var readLatin1String = ptr => {
  var ret = "";
  var c = ptr;
  while (GROWABLE_HEAP_U8()[c >>> 0]) {
    ret += embind_charCodes[GROWABLE_HEAP_U8()[c++ >>> 0]];
  }
  return ret;
};

var BindingError;

var throwBindingError = message => {
  throw new BindingError(message);
};

/** @param {Object=} options */ function sharedRegisterType(rawType, registeredInstance, options = {}) {
  var name = registeredInstance.name;
  if (!rawType) {
    throwBindingError(`type "${name}" must have a positive integer typeid pointer`);
  }
  if (registeredTypes.hasOwnProperty(rawType)) {
    if (options.ignoreDuplicateRegistrations) {
      return;
    } else {
      throwBindingError(`Cannot register type '${name}' twice`);
    }
  }
  registeredTypes[rawType] = registeredInstance;
  delete typeDependencies[rawType];
  if (awaitingDependencies.hasOwnProperty(rawType)) {
    var callbacks = awaitingDependencies[rawType];
    delete awaitingDependencies[rawType];
    callbacks.forEach(cb => cb());
  }
}

/** @param {Object=} options */ function registerType(rawType, registeredInstance, options = {}) {
  if (!("argPackAdvance" in registeredInstance)) {
    throw new TypeError("registerType registeredInstance requires argPackAdvance");
  }
  return sharedRegisterType(rawType, registeredInstance, options);
}

var GenericWireTypeSize = 8;

/** @suppress {globalThis} */ function __embind_register_bool(rawType, name, trueValue, falseValue) {
  rawType >>>= 0;
  name >>>= 0;
  name = readLatin1String(name);
  registerType(rawType, {
    name: name,
    "fromWireType": function(wt) {
      return !!wt;
    },
    "toWireType": function(destructors, o) {
      return o ? trueValue : falseValue;
    },
    "argPackAdvance": GenericWireTypeSize,
    "readValueFromPointer": function(pointer) {
      return this["fromWireType"](GROWABLE_HEAP_U8()[pointer >>> 0]);
    },
    destructorFunction: null
  });
}

var emval_freelist = [];

var emval_handles = [];

function __emval_decref(handle) {
  handle >>>= 0;
  if (handle > 9 && 0 === --emval_handles[handle + 1]) {
    emval_handles[handle] = undefined;
    emval_freelist.push(handle);
  }
}

var count_emval_handles = () => emval_handles.length / 2 - 5 - emval_freelist.length;

var init_emval = () => {
  emval_handles.push(0, 1, undefined, 1, null, 1, true, 1, false, 1);
  Module["count_emval_handles"] = count_emval_handles;
};

var Emval = {
  toValue: handle => {
    if (!handle) {
      throwBindingError("Cannot use deleted val. handle = " + handle);
    }
    return emval_handles[handle];
  },
  toHandle: value => {
    switch (value) {
     case undefined:
      return 2;

     case null:
      return 4;

     case true:
      return 6;

     case false:
      return 8;

     default:
      {
        const handle = emval_freelist.pop() || emval_handles.length;
        emval_handles[handle] = value;
        emval_handles[handle + 1] = 1;
        return handle;
      }
    }
  }
};

var EmValType = {
  name: "emscripten::val",
  "fromWireType": handle => {
    var rv = Emval.toValue(handle);
    __emval_decref(handle);
    return rv;
  },
  "toWireType": (destructors, value) => Emval.toHandle(value),
  "argPackAdvance": GenericWireTypeSize,
  "readValueFromPointer": readPointer,
  destructorFunction: null
};

function __embind_register_emval(rawType) {
  rawType >>>= 0;
  return registerType(rawType, EmValType);
}

var embindRepr = v => {
  if (v === null) {
    return "null";
  }
  var t = typeof v;
  if (t === "object" || t === "array" || t === "function") {
    return v.toString();
  } else {
    return "" + v;
  }
};

var floatReadValueFromPointer = (name, width) => {
  switch (width) {
   case 4:
    return function(pointer) {
      return this["fromWireType"](GROWABLE_HEAP_F32()[((pointer) >>> 2) >>> 0]);
    };

   case 8:
    return function(pointer) {
      return this["fromWireType"](GROWABLE_HEAP_F64()[((pointer) >>> 3) >>> 0]);
    };

   default:
    throw new TypeError(`invalid float width (${width}): ${name}`);
  }
};

var __embind_register_float = function(rawType, name, size) {
  rawType >>>= 0;
  name >>>= 0;
  size >>>= 0;
  name = readLatin1String(name);
  registerType(rawType, {
    name: name,
    "fromWireType": value => value,
    "toWireType": (destructors, value) => value,
    "argPackAdvance": GenericWireTypeSize,
    "readValueFromPointer": floatReadValueFromPointer(name, size),
    destructorFunction: null
  });
};

var createNamedFunction = (name, body) => Object.defineProperty(body, "name", {
  value: name
});

function usesDestructorStack(argTypes) {
  for (var i = 1; i < argTypes.length; ++i) {
    if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) {
      return true;
    }
  }
  return false;
}

function newFunc(constructor, argumentList) {
  if (!(constructor instanceof Function)) {
    throw new TypeError(`new_ called with constructor type ${typeof (constructor)} which is not a function`);
  }
  /*
       * Previously, the following line was just:
       *   function dummy() {};
       * Unfortunately, Chrome was preserving 'dummy' as the object's name, even
       * though at creation, the 'dummy' has the correct constructor name.  Thus,
       * objects created with IMVU.new would show up in the debugger as 'dummy',
       * which isn't very helpful.  Using IMVU.createNamedFunction addresses the
       * issue.  Doubly-unfortunately, there's no way to write a test for this
       * behavior.  -NRD 2013.02.22
       */ var dummy = createNamedFunction(constructor.name || "unknownFunctionName", function() {});
  dummy.prototype = constructor.prototype;
  var obj = new dummy;
  var r = constructor.apply(obj, argumentList);
  return (r instanceof Object) ? r : obj;
}

function createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync) {
  var needsDestructorStack = usesDestructorStack(argTypes);
  var argCount = argTypes.length;
  var argsList = "";
  var argsListWired = "";
  for (var i = 0; i < argCount - 2; ++i) {
    argsList += (i !== 0 ? ", " : "") + "arg" + i;
    argsListWired += (i !== 0 ? ", " : "") + "arg" + i + "Wired";
  }
  var invokerFnBody = `\n        return function (${argsList}) {\n        if (arguments.length !== ${argCount - 2}) {\n          throwBindingError('function ' + humanName + ' called with ' + arguments.length + ' arguments, expected ${argCount - 2}');\n        }`;
  invokerFnBody += `Module.emscripten_trace_enter_context('embind::' + humanName );\n`;
  if (needsDestructorStack) {
    invokerFnBody += "var destructors = [];\n";
  }
  var dtorStack = needsDestructorStack ? "destructors" : "null";
  var args1 = [ "humanName", "throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam" ];
  args1.push("Module");
  if (isClassMethodFunc) {
    invokerFnBody += "var thisWired = classParam['toWireType'](" + dtorStack + ", this);\n";
  }
  for (var i = 0; i < argCount - 2; ++i) {
    invokerFnBody += "var arg" + i + "Wired = argType" + i + "['toWireType'](" + dtorStack + ", arg" + i + ");\n";
    args1.push("argType" + i);
  }
  if (isClassMethodFunc) {
    argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
  }
  invokerFnBody += (returns || isAsync ? "var rv = " : "") + "invoker(fn" + (argsListWired.length > 0 ? ", " : "") + argsListWired + ");\n";
  var returnVal = returns ? "rv" : "";
  if (needsDestructorStack) {
    invokerFnBody += "runDestructors(destructors);\n";
  } else {
    for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
      var paramName = (i === 1 ? "thisWired" : ("arg" + (i - 2) + "Wired"));
      if (argTypes[i].destructorFunction !== null) {
        invokerFnBody += `${paramName}_dtor(${paramName});\n`;
        args1.push(`${paramName}_dtor`);
      }
    }
  }
  if (returns) {
    invokerFnBody += "var ret = retType['fromWireType'](rv);\n" + "Module.emscripten_trace_exit_context();\n" + "return ret;\n";
  } else {
    invokerFnBody += "Module.emscripten_trace_exit_context();\n";
  }
  invokerFnBody += "}\n";
  return [ args1, invokerFnBody ];
}

function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc, /** boolean= */ isAsync) {
  var argCount = argTypes.length;
  if (argCount < 2) {
    throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
  }
  var isClassMethodFunc = (argTypes[1] !== null && classType !== null);
  var needsDestructorStack = usesDestructorStack(argTypes);
  var returns = (argTypes[0].name !== "void");
  var closureArgs = [ humanName, throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1] ];
  closureArgs.push(Module);
  for (var i = 0; i < argCount - 2; ++i) {
    closureArgs.push(argTypes[i + 2]);
  }
  if (!needsDestructorStack) {
    for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
      if (argTypes[i].destructorFunction !== null) {
        closureArgs.push(argTypes[i].destructorFunction);
      }
    }
  }
  let [args, invokerFnBody] = createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync);
  args.push(invokerFnBody);
  var invokerFn = newFunc(Function, args)(...closureArgs);
  return createNamedFunction(humanName, invokerFn);
}

var ensureOverloadTable = (proto, methodName, humanName) => {
  if (undefined === proto[methodName].overloadTable) {
    var prevFunc = proto[methodName];
    proto[methodName] = function(...args) {
      if (!proto[methodName].overloadTable.hasOwnProperty(args.length)) {
        throwBindingError(`Function '${humanName}' called with an invalid number of arguments (${args.length}) - expects one of (${proto[methodName].overloadTable})!`);
      }
      return proto[methodName].overloadTable[args.length].apply(this, args);
    };
    proto[methodName].overloadTable = [];
    proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
  }
};

/** @param {number=} numArguments */ var exposePublicSymbol = (name, value, numArguments) => {
  if (Module.hasOwnProperty(name)) {
    if (undefined === numArguments || (undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments])) {
      throwBindingError(`Cannot register public name '${name}' twice`);
    }
    ensureOverloadTable(Module, name, name);
    if (Module.hasOwnProperty(numArguments)) {
      throwBindingError(`Cannot register multiple overloads of a function with the same number of arguments (${numArguments})!`);
    }
    Module[name].overloadTable[numArguments] = value;
  } else {
    Module[name] = value;
    if (undefined !== numArguments) {
      Module[name].numArguments = numArguments;
    }
  }
};

var heap32VectorToArray = (count, firstElement) => {
  var array = [];
  for (var i = 0; i < count; i++) {
    array.push(GROWABLE_HEAP_U32()[(((firstElement) + (i * 4)) >>> 2) >>> 0]);
  }
  return array;
};

/** @param {number=} numArguments */ var replacePublicSymbol = (name, value, numArguments) => {
  if (!Module.hasOwnProperty(name)) {
    throwInternalError("Replacing nonexistent public symbol");
  }
  if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
    Module[name].overloadTable[numArguments] = value;
  } else {
    Module[name] = value;
    Module[name].argCount = numArguments;
  }
};

var dynCallLegacy = (sig, ptr, args) => {
  sig = sig.replace(/p/g, "i");
  var f = Module["dynCall_" + sig];
  return f(ptr, ...args);
};

var dynCall = (sig, ptr, args = []) => {
  if (sig.includes("j")) {
    return dynCallLegacy(sig, ptr, args);
  }
  var rtn = getWasmTableEntry(ptr)(...args);
  return sig[0] == "p" ? rtn >>> 0 : rtn;
};

var getDynCaller = (sig, ptr) => (...args) => dynCall(sig, ptr, args);

var embind__requireFunction = (signature, rawFunction) => {
  signature = readLatin1String(signature);
  function makeDynCaller() {
    if (signature.includes("j")) {
      return getDynCaller(signature, rawFunction);
    }
    if (signature.includes("p")) {
      return getDynCaller(signature, rawFunction);
    }
    return getWasmTableEntry(rawFunction);
  }
  var fp = makeDynCaller();
  if (typeof fp != "function") {
    throwBindingError(`unknown function pointer with signature ${signature}: ${rawFunction}`);
  }
  return fp;
};

var extendError = (baseErrorType, errorName) => {
  var errorClass = createNamedFunction(errorName, function(message) {
    this.name = errorName;
    this.message = message;
    var stack = (new Error(message)).stack;
    if (stack !== undefined) {
      this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "");
    }
  });
  errorClass.prototype = Object.create(baseErrorType.prototype);
  errorClass.prototype.constructor = errorClass;
  errorClass.prototype.toString = function() {
    if (this.message === undefined) {
      return this.name;
    } else {
      return `${this.name}: ${this.message}`;
    }
  };
  return errorClass;
};

var UnboundTypeError;

var getTypeName = type => {
  var ptr = ___getTypeName(type);
  var rv = readLatin1String(ptr);
  _free(ptr);
  return rv;
};

var throwUnboundTypeError = (message, types) => {
  var unboundTypes = [];
  var seen = {};
  function visit(type) {
    if (seen[type]) {
      return;
    }
    if (registeredTypes[type]) {
      return;
    }
    if (typeDependencies[type]) {
      typeDependencies[type].forEach(visit);
      return;
    }
    unboundTypes.push(type);
    seen[type] = true;
  }
  types.forEach(visit);
  throw new UnboundTypeError(`${message}: ` + unboundTypes.map(getTypeName).join([ ", " ]));
};

var getFunctionName = signature => {
  signature = signature.trim();
  const argsIndex = signature.indexOf("(");
  if (argsIndex !== -1) {
    return signature.substr(0, argsIndex);
  } else {
    return signature;
  }
};

function __embind_register_function(name, argCount, rawArgTypesAddr, signature, rawInvoker, fn, isAsync) {
  name >>>= 0;
  rawArgTypesAddr >>>= 0;
  signature >>>= 0;
  rawInvoker >>>= 0;
  fn >>>= 0;
  var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
  name = readLatin1String(name);
  name = getFunctionName(name);
  rawInvoker = embind__requireFunction(signature, rawInvoker);
  exposePublicSymbol(name, function() {
    throwUnboundTypeError(`Cannot call ${name} due to unbound types`, argTypes);
  }, argCount - 1);
  whenDependentTypesAreResolved([], argTypes, argTypes => {
    var invokerArgsArray = [ argTypes[0], /* return value */ null ].concat(/* no class 'this'*/ argTypes.slice(1));
    /* actual params */ replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null, /* no class 'this'*/ rawInvoker, fn, isAsync), argCount - 1);
    return [];
  });
}

var integerReadValueFromPointer = (name, width, signed) => {
  switch (width) {
   case 1:
    return signed ? pointer => GROWABLE_HEAP_I8()[pointer >>> 0] : pointer => GROWABLE_HEAP_U8()[pointer >>> 0];

   case 2:
    return signed ? pointer => GROWABLE_HEAP_I16()[((pointer) >>> 1) >>> 0] : pointer => GROWABLE_HEAP_U16()[((pointer) >>> 1) >>> 0];

   case 4:
    return signed ? pointer => GROWABLE_HEAP_I32()[((pointer) >>> 2) >>> 0] : pointer => GROWABLE_HEAP_U32()[((pointer) >>> 2) >>> 0];

   default:
    throw new TypeError(`invalid integer width (${width}): ${name}`);
  }
};

/** @suppress {globalThis} */ function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
  primitiveType >>>= 0;
  name >>>= 0;
  size >>>= 0;
  name = readLatin1String(name);
  if (maxRange === -1) {
    maxRange = 4294967295;
  }
  var fromWireType = value => value;
  if (minRange === 0) {
    var bitshift = 32 - 8 * size;
    fromWireType = value => (value << bitshift) >>> bitshift;
  }
  var isUnsignedType = (name.includes("unsigned"));
  var checkAssertions = (value, toTypeName) => {};
  var toWireType;
  if (isUnsignedType) {
    toWireType = function(destructors, value) {
      checkAssertions(value, this.name);
      return value >>> 0;
    };
  } else {
    toWireType = function(destructors, value) {
      checkAssertions(value, this.name);
      return value;
    };
  }
  registerType(primitiveType, {
    name: name,
    "fromWireType": fromWireType,
    "toWireType": toWireType,
    "argPackAdvance": GenericWireTypeSize,
    "readValueFromPointer": integerReadValueFromPointer(name, size, minRange !== 0),
    destructorFunction: null
  });
}

function __embind_register_memory_view(rawType, dataTypeIndex, name) {
  rawType >>>= 0;
  name >>>= 0;
  var typeMapping = [ Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array ];
  var TA = typeMapping[dataTypeIndex];
  function decodeMemoryView(handle) {
    var size = GROWABLE_HEAP_U32()[((handle) >>> 2) >>> 0];
    var data = GROWABLE_HEAP_U32()[(((handle) + (4)) >>> 2) >>> 0];
    return new TA(GROWABLE_HEAP_I8().buffer, data, size);
  }
  name = readLatin1String(name);
  registerType(rawType, {
    name: name,
    "fromWireType": decodeMemoryView,
    "argPackAdvance": GenericWireTypeSize,
    "readValueFromPointer": decodeMemoryView
  }, {
    ignoreDuplicateRegistrations: true
  });
}

var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
  outIdx >>>= 0;
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  for (var i = 0; i < str.length; ++i) {
    var u = str.charCodeAt(i);
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i);
      u = 65536 + ((u & 1023) << 10) | (u1 & 1023);
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      heap[outIdx++ >>> 0] = u;
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++ >>> 0] = 192 | (u >> 6);
      heap[outIdx++ >>> 0] = 128 | (u & 63);
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++ >>> 0] = 224 | (u >> 12);
      heap[outIdx++ >>> 0] = 128 | ((u >> 6) & 63);
      heap[outIdx++ >>> 0] = 128 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      heap[outIdx++ >>> 0] = 240 | (u >> 18);
      heap[outIdx++ >>> 0] = 128 | ((u >> 12) & 63);
      heap[outIdx++ >>> 0] = 128 | ((u >> 6) & 63);
      heap[outIdx++ >>> 0] = 128 | (u & 63);
    }
  }
  heap[outIdx >>> 0] = 0;
  return outIdx - startIdx;
};

var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, GROWABLE_HEAP_U8(), outPtr, maxBytesToWrite);

var lengthBytesUTF8 = str => {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    var c = str.charCodeAt(i);
    if (c <= 127) {
      len++;
    } else if (c <= 2047) {
      len += 2;
    } else if (c >= 55296 && c <= 57343) {
      len += 4;
      ++i;
    } else {
      len += 3;
    }
  }
  return len;
};

function __embind_register_std_string(rawType, name) {
  rawType >>>= 0;
  name >>>= 0;
  name = readLatin1String(name);
  var stdStringIsUTF8 = (name === "std::string");
  registerType(rawType, {
    name: name,
    "fromWireType"(value) {
      var length = GROWABLE_HEAP_U32()[((value) >>> 2) >>> 0];
      var payload = value + 4;
      var str;
      if (stdStringIsUTF8) {
        var decodeStartPtr = payload;
        for (var i = 0; i <= length; ++i) {
          var currentBytePtr = payload + i;
          if (i == length || GROWABLE_HEAP_U8()[currentBytePtr >>> 0] == 0) {
            var maxRead = currentBytePtr - decodeStartPtr;
            var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
            if (str === undefined) {
              str = stringSegment;
            } else {
              str += String.fromCharCode(0);
              str += stringSegment;
            }
            decodeStartPtr = currentBytePtr + 1;
          }
        }
      } else {
        var a = new Array(length);
        for (var i = 0; i < length; ++i) {
          a[i] = String.fromCharCode(GROWABLE_HEAP_U8()[payload + i >>> 0]);
        }
        str = a.join("");
      }
      _free(value);
      return str;
    },
    "toWireType"(destructors, value) {
      if (value instanceof ArrayBuffer) {
        value = new Uint8Array(value);
      }
      var length;
      var valueIsOfTypeString = (typeof value == "string");
      if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
        throwBindingError("Cannot pass non-string to std::string");
      }
      if (stdStringIsUTF8 && valueIsOfTypeString) {
        length = lengthBytesUTF8(value);
      } else {
        length = value.length;
      }
      var base = _malloc(4 + length + 1);
      var ptr = base + 4;
      GROWABLE_HEAP_U32()[((base) >>> 2) >>> 0] = length;
      if (stdStringIsUTF8 && valueIsOfTypeString) {
        stringToUTF8(value, ptr, length + 1);
      } else {
        if (valueIsOfTypeString) {
          for (var i = 0; i < length; ++i) {
            var charCode = value.charCodeAt(i);
            if (charCode > 255) {
              _free(ptr);
              throwBindingError("String has UTF-16 code units that do not fit in 8 bits");
            }
            GROWABLE_HEAP_U8()[ptr + i >>> 0] = charCode;
          }
        } else {
          for (var i = 0; i < length; ++i) {
            GROWABLE_HEAP_U8()[ptr + i >>> 0] = value[i];
          }
        }
      }
      if (destructors !== null) {
        destructors.push(_free, base);
      }
      return base;
    },
    "argPackAdvance": GenericWireTypeSize,
    "readValueFromPointer": readPointer,
    destructorFunction(ptr) {
      _free(ptr);
    }
  });
}

var UTF16Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf-16le") : undefined;

var UTF16ToString = (ptr, maxBytesToRead) => {
  var endPtr = ptr;
  var idx = endPtr >> 1;
  var maxIdx = idx + maxBytesToRead / 2;
  while (!(idx >= maxIdx) && GROWABLE_HEAP_U16()[idx >>> 0]) ++idx;
  endPtr = idx << 1;
  if (endPtr - ptr > 32 && UTF16Decoder) return UTF16Decoder.decode(GROWABLE_HEAP_U8().slice(ptr, endPtr));
  var str = "";
  for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
    var codeUnit = GROWABLE_HEAP_I16()[(((ptr) + (i * 2)) >>> 1) >>> 0];
    if (codeUnit == 0) break;
    str += String.fromCharCode(codeUnit);
  }
  return str;
};

var stringToUTF16 = (str, outPtr, maxBytesToWrite) => {
  maxBytesToWrite ??= 2147483647;
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2;
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length * 2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    var codeUnit = str.charCodeAt(i);
    GROWABLE_HEAP_I16()[((outPtr) >>> 1) >>> 0] = codeUnit;
    outPtr += 2;
  }
  GROWABLE_HEAP_I16()[((outPtr) >>> 1) >>> 0] = 0;
  return outPtr - startPtr;
};

var lengthBytesUTF16 = str => str.length * 2;

var UTF32ToString = (ptr, maxBytesToRead) => {
  var i = 0;
  var str = "";
  while (!(i >= maxBytesToRead / 4)) {
    var utf32 = GROWABLE_HEAP_I32()[(((ptr) + (i * 4)) >>> 2) >>> 0];
    if (utf32 == 0) break;
    ++i;
    if (utf32 >= 65536) {
      var ch = utf32 - 65536;
      str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
  return str;
};

var stringToUTF32 = (str, outPtr, maxBytesToWrite) => {
  outPtr >>>= 0;
  maxBytesToWrite ??= 2147483647;
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 55296 && codeUnit <= 57343) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 65536 + ((codeUnit & 1023) << 10) | (trailSurrogate & 1023);
    }
    GROWABLE_HEAP_I32()[((outPtr) >>> 2) >>> 0] = codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  GROWABLE_HEAP_I32()[((outPtr) >>> 2) >>> 0] = 0;
  return outPtr - startPtr;
};

var lengthBytesUTF32 = str => {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
    len += 4;
  }
  return len;
};

var __embind_register_std_wstring = function(rawType, charSize, name) {
  rawType >>>= 0;
  charSize >>>= 0;
  name >>>= 0;
  name = readLatin1String(name);
  var decodeString, encodeString, readCharAt, lengthBytesUTF;
  if (charSize === 2) {
    decodeString = UTF16ToString;
    encodeString = stringToUTF16;
    lengthBytesUTF = lengthBytesUTF16;
    readCharAt = pointer => GROWABLE_HEAP_U16()[((pointer) >>> 1) >>> 0];
  } else if (charSize === 4) {
    decodeString = UTF32ToString;
    encodeString = stringToUTF32;
    lengthBytesUTF = lengthBytesUTF32;
    readCharAt = pointer => GROWABLE_HEAP_U32()[((pointer) >>> 2) >>> 0];
  }
  registerType(rawType, {
    name: name,
    "fromWireType": value => {
      var length = GROWABLE_HEAP_U32()[((value) >>> 2) >>> 0];
      var str;
      var decodeStartPtr = value + 4;
      for (var i = 0; i <= length; ++i) {
        var currentBytePtr = value + 4 + i * charSize;
        if (i == length || readCharAt(currentBytePtr) == 0) {
          var maxReadBytes = currentBytePtr - decodeStartPtr;
          var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
          if (str === undefined) {
            str = stringSegment;
          } else {
            str += String.fromCharCode(0);
            str += stringSegment;
          }
          decodeStartPtr = currentBytePtr + charSize;
        }
      }
      _free(value);
      return str;
    },
    "toWireType": (destructors, value) => {
      if (!(typeof value == "string")) {
        throwBindingError(`Cannot pass non-string to C++ string type ${name}`);
      }
      var length = lengthBytesUTF(value);
      var ptr = _malloc(4 + length + charSize);
      GROWABLE_HEAP_U32()[((ptr) >>> 2) >>> 0] = length / charSize;
      encodeString(value, ptr + 4, length + charSize);
      if (destructors !== null) {
        destructors.push(_free, ptr);
      }
      return ptr;
    },
    "argPackAdvance": GenericWireTypeSize,
    "readValueFromPointer": readPointer,
    destructorFunction(ptr) {
      _free(ptr);
    }
  });
};

function __embind_register_value_object(rawType, name, constructorSignature, rawConstructor, destructorSignature, rawDestructor) {
  rawType >>>= 0;
  name >>>= 0;
  constructorSignature >>>= 0;
  rawConstructor >>>= 0;
  destructorSignature >>>= 0;
  rawDestructor >>>= 0;
  structRegistrations[rawType] = {
    name: readLatin1String(name),
    rawConstructor: embind__requireFunction(constructorSignature, rawConstructor),
    rawDestructor: embind__requireFunction(destructorSignature, rawDestructor),
    fields: []
  };
}

function __embind_register_value_object_field(structType, fieldName, getterReturnType, getterSignature, getter, getterContext, setterArgumentType, setterSignature, setter, setterContext) {
  structType >>>= 0;
  fieldName >>>= 0;
  getterReturnType >>>= 0;
  getterSignature >>>= 0;
  getter >>>= 0;
  getterContext >>>= 0;
  setterArgumentType >>>= 0;
  setterSignature >>>= 0;
  setter >>>= 0;
  setterContext >>>= 0;
  structRegistrations[structType].fields.push({
    fieldName: readLatin1String(fieldName),
    getterReturnType: getterReturnType,
    getter: embind__requireFunction(getterSignature, getter),
    getterContext: getterContext,
    setterArgumentType: setterArgumentType,
    setter: embind__requireFunction(setterSignature, setter),
    setterContext: setterContext
  });
}

var __embind_register_void = function(rawType, name) {
  rawType >>>= 0;
  name >>>= 0;
  name = readLatin1String(name);
  registerType(rawType, {
    isVoid: true,
    name: name,
    "argPackAdvance": 0,
    "fromWireType": () => undefined,
    "toWireType": (destructors, o) => undefined
  });
};

var nowIsMonotonic = 1;

var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;

function __emscripten_init_main_thread_js(tb) {
  tb >>>= 0;
  __emscripten_thread_init(tb, /*is_main=*/ !ENVIRONMENT_IS_WORKER, /*is_runtime=*/ 1, /*can_block=*/ !ENVIRONMENT_IS_WEB, /*default_stacksize=*/ 65536, /*start_profiling=*/ false);
  PThread.threadInitTLS();
}

var maybeExit = () => {
  if (!keepRuntimeAlive()) {
    try {
      if (ENVIRONMENT_IS_PTHREAD) __emscripten_thread_exit(EXITSTATUS); else _exit(EXITSTATUS);
    } catch (e) {
      handleException(e);
    }
  }
};

var callUserCallback = func => {
  if (ABORT) {
    return;
  }
  try {
    func();
    maybeExit();
  } catch (e) {
    handleException(e);
  }
};

function __emscripten_thread_mailbox_await(pthread_ptr) {
  pthread_ptr >>>= 0;
  if (typeof Atomics.waitAsync === "function") {
    var wait = Atomics.waitAsync(GROWABLE_HEAP_I32(), ((pthread_ptr) >>> 2), pthread_ptr);
    wait.value.then(checkMailbox);
    var waitingAsync = pthread_ptr + 128;
    Atomics.store(GROWABLE_HEAP_I32(), ((waitingAsync) >>> 2), 1);
  }
}

var checkMailbox = () => {
  var pthread_ptr = _pthread_self();
  if (pthread_ptr) {
    __emscripten_thread_mailbox_await(pthread_ptr);
    callUserCallback(__emscripten_check_mailbox);
  }
};

function __emscripten_notify_mailbox_postmessage(targetThreadId, currThreadId, mainThreadId) {
  targetThreadId >>>= 0;
  currThreadId >>>= 0;
  mainThreadId >>>= 0;
  if (targetThreadId == currThreadId) {
    setTimeout(checkMailbox);
  } else if (ENVIRONMENT_IS_PTHREAD) {
    postMessage({
      "targetThread": targetThreadId,
      "cmd": "checkMailbox"
    });
  } else {
    var worker = PThread.pthreads[targetThreadId];
    if (!worker) {
      return;
    }
    worker.postMessage({
      "cmd": "checkMailbox"
    });
  }
}

var proxiedJSCallArgs = [];

function __emscripten_receive_on_main_thread_js(funcIndex, emAsmAddr, callingThread, numCallArgs, args) {
  emAsmAddr >>>= 0;
  callingThread >>>= 0;
  args >>>= 0;
  proxiedJSCallArgs.length = numCallArgs;
  var b = ((args) >>> 3);
  for (var i = 0; i < numCallArgs; i++) {
    proxiedJSCallArgs[i] = GROWABLE_HEAP_F64()[b + i >>> 0];
  }
  var func = proxiedFunctionTable[funcIndex];
  PThread.currentProxiedOperationCallerThread = callingThread;
  var rtn = func(...proxiedJSCallArgs);
  PThread.currentProxiedOperationCallerThread = 0;
  return rtn;
}

function __emscripten_thread_cleanup(thread) {
  thread >>>= 0;
  if (!ENVIRONMENT_IS_PTHREAD) cleanupThread(thread); else postMessage({
    "cmd": "cleanupThread",
    "thread": thread
  });
}

function __emscripten_thread_set_strongref(thread) {
  thread >>>= 0;
}

var requireRegisteredType = (rawType, humanName) => {
  var impl = registeredTypes[rawType];
  if (undefined === impl) {
    throwBindingError(`${humanName} has unknown type ${getTypeName(rawType)}`);
  }
  return impl;
};

var emval_returnValue = (returnType, destructorsRef, handle) => {
  var destructors = [];
  var result = returnType["toWireType"](destructors, handle);
  if (destructors.length) {
    GROWABLE_HEAP_U32()[((destructorsRef) >>> 2) >>> 0] = Emval.toHandle(destructors);
  }
  return result;
};

function __emval_as(handle, returnType, destructorsRef) {
  handle >>>= 0;
  returnType >>>= 0;
  destructorsRef >>>= 0;
  handle = Emval.toValue(handle);
  returnType = requireRegisteredType(returnType, "emval::as");
  return emval_returnValue(returnType, destructorsRef, handle);
}

var emval_symbols = {};

var getStringOrSymbol = address => {
  var symbol = emval_symbols[address];
  if (symbol === undefined) {
    return readLatin1String(address);
  }
  return symbol;
};

var emval_methodCallers = [];

function __emval_call_method(caller, objHandle, methodName, destructorsRef, args) {
  caller >>>= 0;
  objHandle >>>= 0;
  methodName >>>= 0;
  destructorsRef >>>= 0;
  args >>>= 0;
  caller = emval_methodCallers[caller];
  objHandle = Emval.toValue(objHandle);
  methodName = getStringOrSymbol(methodName);
  return caller(objHandle, objHandle[methodName], destructorsRef, args);
}

function __emval_equals(first, second) {
  first >>>= 0;
  second >>>= 0;
  first = Emval.toValue(first);
  second = Emval.toValue(second);
  return first == second;
}

var emval_get_global = () => {
  if (typeof globalThis == "object") {
    return globalThis;
  }
  return (function() {
    return Function;
  })()("return this")();
};

function __emval_get_global(name) {
  name >>>= 0;
  if (name === 0) {
    return Emval.toHandle(emval_get_global());
  } else {
    name = getStringOrSymbol(name);
    return Emval.toHandle(emval_get_global()[name]);
  }
}

var emval_addMethodCaller = caller => {
  var id = emval_methodCallers.length;
  emval_methodCallers.push(caller);
  return id;
};

var emval_lookupTypes = (argCount, argTypes) => {
  var a = new Array(argCount);
  for (var i = 0; i < argCount; ++i) {
    a[i] = requireRegisteredType(GROWABLE_HEAP_U32()[(((argTypes) + (i * 4)) >>> 2) >>> 0], "parameter " + i);
  }
  return a;
};

var reflectConstruct = Reflect.construct;

function __emval_get_method_caller(argCount, argTypes, kind) {
  argTypes >>>= 0;
  var types = emval_lookupTypes(argCount, argTypes);
  var retType = types.shift();
  argCount--;
  var functionBody = `return function (obj, func, destructorsRef, args) {\n`;
  var offset = 0;
  var argsList = [];
  if (kind === /* FUNCTION */ 0) {
    argsList.push("obj");
  }
  var params = [ "retType" ];
  var args = [ retType ];
  for (var i = 0; i < argCount; ++i) {
    argsList.push("arg" + i);
    params.push("argType" + i);
    args.push(types[i]);
    functionBody += `  var arg${i} = argType${i}.readValueFromPointer(args${offset ? "+" + offset : ""});\n`;
    offset += types[i]["argPackAdvance"];
  }
  var invoker = kind === /* CONSTRUCTOR */ 1 ? "new func" : "func.call";
  functionBody += `  var rv = ${invoker}(${argsList.join(", ")});\n`;
  if (!retType.isVoid) {
    params.push("emval_returnValue");
    args.push(emval_returnValue);
    functionBody += "  return emval_returnValue(retType, destructorsRef, rv);\n";
  }
  functionBody += "};\n";
  params.push(functionBody);
  var invokerFunction = newFunc(Function, params)(...args);
  var functionName = `methodCaller<(${types.map(t => t.name).join(", ")}) => ${retType.name}>`;
  return emval_addMethodCaller(createNamedFunction(functionName, invokerFunction));
}

function __emval_run_destructors(handle) {
  handle >>>= 0;
  var destructors = Emval.toValue(handle);
  runDestructors(destructors);
  __emval_decref(handle);
}

var warnOnce = text => {
  warnOnce.shown ||= {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    err(text);
  }
};

var _emscripten_check_blocking_allowed = () => {};

var _emscripten_date_now = () => Date.now();

var runtimeKeepalivePush = () => {
  runtimeKeepaliveCounter += 1;
};

var _emscripten_exit_with_live_runtime = () => {
  runtimeKeepalivePush();
  throw "unwind";
};

var _emscripten_get_now;

_emscripten_get_now = () => performance.timeOrigin + performance.now();

var getHeapMax = () => 4294901760;

var growMemory = size => {
  var b = wasmMemory.buffer;
  var pages = (size - b.byteLength + 65535) / 65536;
  var oldHeapSize = b.byteLength;
  try {
    wasmMemory.grow(pages);
    updateMemoryViews();
    if (typeof emscriptenMemoryProfiler != "undefined") {
      emscriptenMemoryProfiler.onMemoryResize(oldHeapSize, b.byteLength);
    }
    return 1;
  } /*success*/ catch (e) {}
};

function _emscripten_resize_heap(requestedSize) {
  requestedSize >>>= 0;
  var oldSize = GROWABLE_HEAP_U8().length;
  if (requestedSize <= oldSize) {
    return false;
  }
  _emscripten_trace_report_memory_layout();
  var maxHeapSize = getHeapMax();
  if (requestedSize > maxHeapSize) {
    return false;
  }
  var alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
  for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
    var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
    overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
    var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
    var replacement = growMemory(newSize);
    if (replacement) {
      traceLogMessage("Emscripten", `Enlarging memory arrays from ${oldSize} to ${newSize}`);
      _emscripten_trace_report_memory_layout();
      return true;
    }
  }
  return false;
}

var traceConfigure = (collector_url, application) => {
  EmscriptenTrace.configure(collector_url, application);
};

var _emscripten_trace_configure_for_google_wtf = () => {
  EmscriptenTrace.configureForGoogleWTF();
};

var traceEnterContext = name => {
  if (EmscriptenTrace.postEnabled) {
    var now = EmscriptenTrace.now();
    EmscriptenTrace.post([ EmscriptenTrace.EVENT_ENTER_CONTEXT, now, name ]);
  }
  if (EmscriptenTrace.googleWTFEnabled) {
    EmscriptenTrace.googleWTFEnterScope(name);
  }
};

var _emscripten_trace_exit_context = () => {
  if (EmscriptenTrace.postEnabled) {
    var now = EmscriptenTrace.now();
    EmscriptenTrace.post([ EmscriptenTrace.EVENT_EXIT_CONTEXT, now ]);
  }
  if (EmscriptenTrace.googleWTFEnabled) {
    EmscriptenTrace.googleWTFExitScope();
  }
};

var traceLogMessage = (channel, message) => {
  if (EmscriptenTrace.postEnabled) {
    var now = EmscriptenTrace.now();
    EmscriptenTrace.post([ EmscriptenTrace.EVENT_LOG_MESSAGE, now, channel, message ]);
  }
};

var traceMark = message => {
  if (EmscriptenTrace.postEnabled) {
    var now = EmscriptenTrace.now();
    EmscriptenTrace.post([ EmscriptenTrace.EVENT_LOG_MESSAGE, now, "MARK", message ]);
  }
  if (EmscriptenTrace.googleWTFEnabled) {
    window["wtf"].trace.mark(message);
  }
};

var EmscriptenTrace = {
  worker: null,
  collectorEnabled: false,
  googleWTFEnabled: false,
  testingEnabled: false,
  googleWTFData: {
    scopeStack: [],
    cachedScopes: {}
  },
  DATA_VERSION: 1,
  EVENT_ALLOCATE: "allocate",
  EVENT_ANNOTATE_TYPE: "annotate-type",
  EVENT_APPLICATION_NAME: "application-name",
  EVENT_ASSOCIATE_STORAGE_SIZE: "associate-storage-size",
  EVENT_ENTER_CONTEXT: "enter-context",
  EVENT_EXIT_CONTEXT: "exit-context",
  EVENT_FRAME_END: "frame-end",
  EVENT_FRAME_RATE: "frame-rate",
  EVENT_FRAME_START: "frame-start",
  EVENT_FREE: "free",
  EVENT_LOG_MESSAGE: "log-message",
  EVENT_MEMORY_LAYOUT: "memory-layout",
  EVENT_OFF_HEAP: "off-heap",
  EVENT_REALLOCATE: "reallocate",
  EVENT_REPORT_ERROR: "report-error",
  EVENT_SESSION_NAME: "session-name",
  EVENT_TASK_ASSOCIATE_DATA: "task-associate-data",
  EVENT_TASK_END: "task-end",
  EVENT_TASK_RESUME: "task-resume",
  EVENT_TASK_START: "task-start",
  EVENT_TASK_SUSPEND: "task-suspend",
  EVENT_USER_NAME: "user-name",
  init: () => {
    Module["emscripten_trace_configure"] = traceConfigure;
    Module["emscripten_trace_configure_for_google_wtf"] = _emscripten_trace_configure_for_google_wtf;
    Module["emscripten_trace_enter_context"] = traceEnterContext;
    Module["emscripten_trace_exit_context"] = _emscripten_trace_exit_context;
    Module["emscripten_trace_log_message"] = traceLogMessage;
    Module["emscripten_trace_mark"] = traceMark;
  },
  loadWorkerViaXHR: (url, ready, scope) => {
    var req = new XMLHttpRequest;
    req.addEventListener("load", function() {
      var blob = new Blob([ this.responseText ], {
        type: "text/javascript"
      });
      var worker = new Worker(window.URL.createObjectURL(blob));
      ready?.call(scope, worker);
    }, req);
    req.open("get", url, false);
    req.send();
  },
  configure: (collector_url, application) => {
    EmscriptenTrace.now = _emscripten_get_now;
    var now = new Date;
    var session_id = now.getTime().toString() + "_" + Math.floor((Math.random() * 100) + 1).toString();
    EmscriptenTrace.loadWorkerViaXHR(collector_url + "worker.js", function(worker) {
      EmscriptenTrace.worker = worker;
      EmscriptenTrace.worker.addEventListener("error", function(e) {
        out("TRACE WORKER ERROR:");
        out(e);
      }, false);
      EmscriptenTrace.worker.postMessage({
        "cmd": "configure",
        "data_version": EmscriptenTrace.DATA_VERSION,
        "session_id": session_id,
        "url": collector_url
      });
      EmscriptenTrace.configured = true;
      EmscriptenTrace.collectorEnabled = true;
      EmscriptenTrace.postEnabled = true;
    });
    EmscriptenTrace.post([ EmscriptenTrace.EVENT_APPLICATION_NAME, application ]);
    EmscriptenTrace.post([ EmscriptenTrace.EVENT_SESSION_NAME, now.toISOString() ]);
  },
  configureForTest: () => {
    EmscriptenTrace.postEnabled = true;
    EmscriptenTrace.testingEnabled = true;
    EmscriptenTrace.now = function() {
      return 0;
    };
  },
  configureForGoogleWTF: () => {
    if (window && window["wtf"]) {
      EmscriptenTrace.googleWTFEnabled = true;
    } else {
      out("GOOGLE WTF NOT AVAILABLE TO ENABLE");
    }
  },
  post: entry => {
    if (EmscriptenTrace.postEnabled && EmscriptenTrace.collectorEnabled) {
      EmscriptenTrace.worker.postMessage({
        "cmd": "post",
        "entry": entry
      });
    } else if (EmscriptenTrace.postEnabled && EmscriptenTrace.testingEnabled) {
      out("Tracing " + entry);
    }
  },
  googleWTFEnterScope: name => {
    var scopeEvent = EmscriptenTrace.googleWTFData["cachedScopes"][name];
    if (!scopeEvent) {
      scopeEvent = window["wtf"].trace.events.createScope(name);
      EmscriptenTrace.googleWTFData["cachedScopes"][name] = scopeEvent;
    }
    var scope = scopeEvent();
    EmscriptenTrace.googleWTFData["scopeStack"].push(scope);
  },
  googleWTFExitScope: () => {
    var scope = EmscriptenTrace.googleWTFData["scopeStack"].pop();
    window["wtf"].trace.leaveScope(scope);
  }
};

function _emscripten_trace_record_allocation(address, size) {
  address >>>= 0;
  if (typeof Module["onMalloc"] == "function") Module["onMalloc"](address, size);
  if (EmscriptenTrace.postEnabled) {
    var now = EmscriptenTrace.now();
    EmscriptenTrace.post([ EmscriptenTrace.EVENT_ALLOCATE, now, address, size ]);
  }
}

function _emscripten_trace_record_free(address) {
  address >>>= 0;
  if (typeof Module["onFree"] == "function") Module["onFree"](address);
  if (EmscriptenTrace.postEnabled) {
    var now = EmscriptenTrace.now();
    EmscriptenTrace.post([ EmscriptenTrace.EVENT_FREE, now, address ]);
  }
}

function _emscripten_trace_record_reallocation(old_address, new_address, size) {
  old_address >>>= 0;
  new_address >>>= 0;
  if (typeof Module["onRealloc"] == "function") Module["onRealloc"](old_address, new_address, size);
  if (EmscriptenTrace.postEnabled) {
    var now = EmscriptenTrace.now();
    EmscriptenTrace.post([ EmscriptenTrace.EVENT_REALLOCATE, now, old_address, new_address, size ]);
  }
}

var _emscripten_trace_report_memory_layout = () => {
  if (EmscriptenTrace.postEnabled) {
    var memory_layout = {
      "static_base": 1024,
      "stack_base": _emscripten_stack_get_base(),
      "stack_top": _emscripten_stack_get_current(),
      "stack_max": _emscripten_stack_get_end(),
      "dynamic_top": _sbrk(0),
      "total_memory": GROWABLE_HEAP_I8().length
    };
    var now = EmscriptenTrace.now();
    EmscriptenTrace.post([ EmscriptenTrace.EVENT_MEMORY_LAYOUT, now, memory_layout ]);
  }
};

var printCharBuffers = [ null, [], [] ];

var printChar = (stream, curr) => {
  var buffer = printCharBuffers[stream];
  if (curr === 0 || curr === 10) {
    (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
    buffer.length = 0;
  } else {
    buffer.push(curr);
  }
};

var flush_NO_FILESYSTEM = () => {
  if (printCharBuffers[1].length) printChar(1, 10);
  if (printCharBuffers[2].length) printChar(2, 10);
};

var SYSCALLS = {
  varargs: undefined,
  getStr(ptr) {
    var ret = UTF8ToString(ptr);
    return ret;
  }
};

function _fd_write(fd, iov, iovcnt, pnum) {
  if (ENVIRONMENT_IS_PTHREAD) return proxyToMainThread(3, 0, 1, fd, iov, iovcnt, pnum);
  iov >>>= 0;
  iovcnt >>>= 0;
  pnum >>>= 0;
  var num = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = GROWABLE_HEAP_U32()[((iov) >>> 2) >>> 0];
    var len = GROWABLE_HEAP_U32()[(((iov) + (4)) >>> 2) >>> 0];
    iov += 8;
    for (var j = 0; j < len; j++) {
      printChar(fd, GROWABLE_HEAP_U8()[ptr + j >>> 0]);
    }
    num += len;
  }
  GROWABLE_HEAP_U32()[((pnum) >>> 2) >>> 0] = num;
  return 0;
}

PThread.init();

InternalError = Module["InternalError"] = class InternalError extends Error {
  constructor(message) {
    super(message);
    this.name = "InternalError";
  }
};

embind_init_charCodes();

BindingError = Module["BindingError"] = class BindingError extends Error {
  constructor(message) {
    super(message);
    this.name = "BindingError";
  }
};

init_emval();

UnboundTypeError = Module["UnboundTypeError"] = extendError(Error, "UnboundTypeError");

EmscriptenTrace.init();

var proxiedFunctionTable = [ _proc_exit, exitOnMainThread, pthreadCreateProxied, _fd_write ];

var wasmImports;

function assignWasmImports() {
  wasmImports = {
    /** @export */ __assert_fail: ___assert_fail,
    /** @export */ __cxa_throw: ___cxa_throw,
    /** @export */ __pthread_create_js: ___pthread_create_js,
    /** @export */ _abort_js: __abort_js,
    /** @export */ _embind_finalize_value_object: __embind_finalize_value_object,
    /** @export */ _embind_register_bigint: __embind_register_bigint,
    /** @export */ _embind_register_bool: __embind_register_bool,
    /** @export */ _embind_register_emval: __embind_register_emval,
    /** @export */ _embind_register_float: __embind_register_float,
    /** @export */ _embind_register_function: __embind_register_function,
    /** @export */ _embind_register_integer: __embind_register_integer,
    /** @export */ _embind_register_memory_view: __embind_register_memory_view,
    /** @export */ _embind_register_std_string: __embind_register_std_string,
    /** @export */ _embind_register_std_wstring: __embind_register_std_wstring,
    /** @export */ _embind_register_value_object: __embind_register_value_object,
    /** @export */ _embind_register_value_object_field: __embind_register_value_object_field,
    /** @export */ _embind_register_void: __embind_register_void,
    /** @export */ _emscripten_get_now_is_monotonic: __emscripten_get_now_is_monotonic,
    /** @export */ _emscripten_init_main_thread_js: __emscripten_init_main_thread_js,
    /** @export */ _emscripten_notify_mailbox_postmessage: __emscripten_notify_mailbox_postmessage,
    /** @export */ _emscripten_receive_on_main_thread_js: __emscripten_receive_on_main_thread_js,
    /** @export */ _emscripten_thread_cleanup: __emscripten_thread_cleanup,
    /** @export */ _emscripten_thread_mailbox_await: __emscripten_thread_mailbox_await,
    /** @export */ _emscripten_thread_set_strongref: __emscripten_thread_set_strongref,
    /** @export */ _emval_as: __emval_as,
    /** @export */ _emval_call_method: __emval_call_method,
    /** @export */ _emval_decref: __emval_decref,
    /** @export */ _emval_equals: __emval_equals,
    /** @export */ _emval_get_global: __emval_get_global,
    /** @export */ _emval_get_method_caller: __emval_get_method_caller,
    /** @export */ _emval_run_destructors: __emval_run_destructors,
    /** @export */ emscripten_check_blocking_allowed: _emscripten_check_blocking_allowed,
    /** @export */ emscripten_date_now: _emscripten_date_now,
    /** @export */ emscripten_exit_with_live_runtime: _emscripten_exit_with_live_runtime,
    /** @export */ emscripten_get_now: _emscripten_get_now,
    /** @export */ emscripten_resize_heap: _emscripten_resize_heap,
    /** @export */ emscripten_trace_record_allocation: _emscripten_trace_record_allocation,
    /** @export */ emscripten_trace_record_free: _emscripten_trace_record_free,
    /** @export */ emscripten_trace_record_reallocation: _emscripten_trace_record_reallocation,
    /** @export */ exit: _exit,
    /** @export */ fd_write: _fd_write,
    /** @export */ memory: wasmMemory
  };
}

var wasmExports = createWasm();

var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports["__wasm_call_ctors"])();

var ___getTypeName = a0 => (___getTypeName = wasmExports["__getTypeName"])(a0);

var __embind_initialize_bindings = () => (__embind_initialize_bindings = wasmExports["_embind_initialize_bindings"])();

var _pthread_self = () => (_pthread_self = wasmExports["pthread_self"])();

var _malloc = Module["_malloc"] = a0 => (_malloc = Module["_malloc"] = wasmExports["malloc"])(a0);

var __emscripten_tls_init = () => (__emscripten_tls_init = wasmExports["_emscripten_tls_init"])();

var __emscripten_thread_init = (a0, a1, a2, a3, a4, a5) => (__emscripten_thread_init = wasmExports["_emscripten_thread_init"])(a0, a1, a2, a3, a4, a5);

var __emscripten_thread_crashed = () => (__emscripten_thread_crashed = wasmExports["_emscripten_thread_crashed"])();

var _emscripten_main_runtime_thread_id = () => (_emscripten_main_runtime_thread_id = wasmExports["emscripten_main_runtime_thread_id"])();

var _emscripten_main_thread_process_queued_calls = () => (_emscripten_main_thread_process_queued_calls = wasmExports["emscripten_main_thread_process_queued_calls"])();

var __emscripten_run_on_main_thread_js = (a0, a1, a2, a3, a4) => (__emscripten_run_on_main_thread_js = wasmExports["_emscripten_run_on_main_thread_js"])(a0, a1, a2, a3, a4);

var _free = Module["_free"] = a0 => (_free = Module["_free"] = wasmExports["free"])(a0);

var _emscripten_stack_get_base = () => (_emscripten_stack_get_base = wasmExports["emscripten_stack_get_base"])();

var _emscripten_stack_get_end = () => (_emscripten_stack_get_end = wasmExports["emscripten_stack_get_end"])();

var __emscripten_thread_free_data = a0 => (__emscripten_thread_free_data = wasmExports["_emscripten_thread_free_data"])(a0);

var __emscripten_thread_exit = a0 => (__emscripten_thread_exit = wasmExports["_emscripten_thread_exit"])(a0);

var _sbrk = a0 => (_sbrk = wasmExports["sbrk"])(a0);

var __emscripten_check_mailbox = () => (__emscripten_check_mailbox = wasmExports["_emscripten_check_mailbox"])();

var _emscripten_stack_set_limits = (a0, a1) => (_emscripten_stack_set_limits = wasmExports["emscripten_stack_set_limits"])(a0, a1);

var __emscripten_stack_restore = a0 => (__emscripten_stack_restore = wasmExports["_emscripten_stack_restore"])(a0);

var __emscripten_stack_alloc = a0 => (__emscripten_stack_alloc = wasmExports["_emscripten_stack_alloc"])(a0);

var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"])();

var ___cxa_is_pointer_type = a0 => (___cxa_is_pointer_type = wasmExports["__cxa_is_pointer_type"])(a0);

var dynCall_jiji = Module["dynCall_jiji"] = (a0, a1, a2, a3, a4) => (dynCall_jiji = Module["dynCall_jiji"] = wasmExports["dynCall_jiji"])(a0, a1, a2, a3, a4);

var ___heap_base = Module["___heap_base"] = 74672;

function applySignatureConversions(wasmExports) {
  wasmExports = Object.assign({}, wasmExports);
  var makeWrapper_pp = f => a0 => f(a0) >>> 0;
  var makeWrapper_p = f => () => f() >>> 0;
  var makeWrapper_pP = f => a0 => f(a0) >>> 0;
  wasmExports["__getTypeName"] = makeWrapper_pp(wasmExports["__getTypeName"]);
  wasmExports["pthread_self"] = makeWrapper_p(wasmExports["pthread_self"]);
  wasmExports["malloc"] = makeWrapper_pp(wasmExports["malloc"]);
  wasmExports["emscripten_main_runtime_thread_id"] = makeWrapper_p(wasmExports["emscripten_main_runtime_thread_id"]);
  wasmExports["emscripten_stack_get_base"] = makeWrapper_p(wasmExports["emscripten_stack_get_base"]);
  wasmExports["emscripten_stack_get_end"] = makeWrapper_p(wasmExports["emscripten_stack_get_end"]);
  wasmExports["sbrk"] = makeWrapper_pP(wasmExports["sbrk"]);
  wasmExports["_emscripten_stack_alloc"] = makeWrapper_pp(wasmExports["_emscripten_stack_alloc"]);
  wasmExports["emscripten_stack_get_current"] = makeWrapper_p(wasmExports["emscripten_stack_get_current"]);
  return wasmExports;
}

var calledRun;

dependenciesFulfilled = function runCaller() {
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller;
};

function run() {
  if (runDependencies > 0) {
    return;
  }
  if (ENVIRONMENT_IS_PTHREAD) {
    readyPromiseResolve(Module);
    initRuntime();
    startWorker(Module);
    return;
  }
  preRun();
  if (runDependencies > 0) {
    return;
  }
  function doRun() {
    if (calledRun) return;
    calledRun = true;
    Module["calledRun"] = true;
    if (ABORT) return;
    initRuntime();
    readyPromiseResolve(Module);
    if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
    postRun();
  }
  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout(function() {
      setTimeout(function() {
        Module["setStatus"]("");
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}

if (Module["preInit"]) {
  if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
  while (Module["preInit"].length > 0) {
    Module["preInit"].pop()();
  }
}

run();

moduleRtn = readyPromise;


  return moduleRtn;
}
);
})();
export default Module;
var isPthread = globalThis.self?.name === 'em-pthread';
// When running as a pthread, construct a new instance on startup
isPthread && Module();
