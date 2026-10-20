// ===================================================
// headless_env.mjs — Virtualized WebGL & DOM Environment for Node.js
// Enables Three.js WebGLRenderer and DOM-dependent game classes to run headless
// ===================================================

export function createMockGL() {
  const gl = {
    VERSION: 0x1F02,
    SHADING_LANGUAGE_VERSION: 0x8B8C,
    VENDOR: 0x1F00,
    RENDERER: 0x1F01,
    MAX_TEXTURE_IMAGE_UNITS: 0x84E8,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8872,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8871,
    MAX_TEXTURE_SIZE: 0x0D33,
    MAX_CUBE_MAP_TEXTURE_SIZE: 0x851C,
    MAX_VERTEX_UNIFORM_VECTORS: 0x8DFB,
    MAX_FRAGMENT_UNIFORM_VECTORS: 0x8DFD,
    getParameter: (pname) => {
      if (pname === 0x1F02) return 'WebGL 2.0 (Mock Headless)';
      if (pname === 0x8B8C) return 'WebGL GLSL ES 3.00';
      if (pname === 0x1F00) return 'MockVendor';
      if (pname === 0x1F01) return 'MockRenderer';
      if (pname === 0x0D33 || pname === 0x851C) return 4096;
      return 16;
    },
    getExtension: () => null,
    getSupportedExtensions: () => [],
    getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 }),
    getProgramParameter: () => true,
    getShaderParameter: () => true,
    drawingBufferWidth: 1024,
    drawingBufferHeight: 768,
  };

  return new Proxy(gl, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return () => ({});
    },
  });
}

export function createMockCanvas() {
  const gl = createMockGL();
  const canvas = {
    tagName: 'CANVAS',
    style: {},
    width: 1024,
    height: 768,
    getContext: () => gl,
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1024, height: 768 }),
    setAttribute: () => {},
    getAttribute: () => null,
  };

  return new Proxy(canvas, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return () => ({});
    },
  });
}

export function createMockElement(tag = 'div') {
  const el = {
    tagName: tag.toUpperCase(),
    style: {},
    textContent: '',
    innerHTML: '',
    children: [],
    appendChild: function (child) {
      this.children.push(child);
      return child;
    },
    removeChild: function (child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
      return child;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1024, height: 768 }),
  };

  return new Proxy(el, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return () => ({});
    },
  });
}

export function setupHeadlessEnv() {
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
      devicePixelRatio: 1,
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      requestAnimationFrame: (cb) => setTimeout(cb, 16),
      cancelAnimationFrame: (id) => clearTimeout(id),
    };
  }

  if (typeof globalThis.document === 'undefined') {
    const elementRegistry = new Map();

    globalThis.document = {
      createElement: (tag) => {
        if (tag.toLowerCase() === 'canvas') return createMockCanvas();
        return createMockElement(tag);
      },
      createElementNS: (ns, tag) => {
        if (tag.toLowerCase() === 'canvas') return createMockCanvas();
        return createMockElement(tag);
      },
      getElementById: (id) => {
        if (!elementRegistry.has(id)) {
          elementRegistry.set(id, createMockElement('div'));
        }
        return elementRegistry.get(id);
      },
      querySelector: (selector) => createMockElement('div'),
      querySelectorAll: (selector) => [],
      body: createMockElement('body'),
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }

  if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = {
      userAgent: 'NodeHeadlessTest/1.0',
    };
  }
}

// Auto-run on import to ensure all test suites have clean globals
setupHeadlessEnv();
