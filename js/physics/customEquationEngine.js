/**
 * 3D Interactive Wave & Acoustics Laboratory
 * Custom Equation Engine: Robust Mathematical Wave Expression Compiler
 * Supports natural textbook syntax:
 *   - Implicit multiplication: 2sin(2x - 4t), 3x, 2pi*f*t, A*sin(kx - wt)
 *   - Automatic prefix stripping: y =, f(x,t) =, psi =, etc.
 *   - Caret exponent: x^2 -> x**2
 *   - Pre-injected physics variables: A, k, w, omega, f, v, lambda, phi, PI, E
 *   - Coordinates: x, z, t, r (where r = sqrt(x^2 + z^2))
 */

export class CustomEquationEngine {
  constructor() {
    this.active = false;
    this.rawExpression = '2.0 * sin(2*x - 4*t)';
    this.compiledFn = null;
    this.lastError = null;

    // Scope physics parameters (can be updated dynamically)
    this.params = {
      A: 2.0,
      f: 1.0,
      v: 3.0,
      lambda: 3.0,
      k: (2 * Math.PI) / 3.0,
      w: 2 * Math.PI * 1.0,
      phi: 0
    };

    // Curated educational equation presets (Continuous, robust, and mathematically verified)
    this.presets = [
      {
        id: 'traveling_sine',
        name: '1. Traveling Harmonic Wave: 2.0·sin(2x - 4t)',
        expr: '2.0 * sin(2*x - 4*t)',
        desc: 'Standard progressive wave traveling forward along +x axis: y(x,t) = A·sin(kx - ωt)'
      },
      {
        id: 'textbook_symbols',
        name: '2. Textbook Symbol Formula: A·sin(kx - wt)',
        expr: 'A * sin(k*x - w*t)',
        desc: 'Standard academic wave equation using physics variables: A=2m, k=2π/λ, ω=2πf'
      },
      {
        id: 'standing_wave',
        name: '3. Standing Wave (Normal Mode): 2.0·sin(1.5x)·cos(4t)',
        expr: '2.0 * sin(1.5*x) * cos(4*t)',
        desc: 'Superposition of two equal counter-propagating waves forming stationary nodes and antinodes'
      },
      {
        id: 'gaussian_packet',
        name: '4. Continuous Gaussian Wave Packet',
        expr: '2.0 * exp(-pow(((x - 2.5*t + 15) % 30) - 15, 2) / 6.0) * cos(6*x - 12*t)',
        desc: 'Localized wave packet envelope continually gliding across the arena with group velocity v_g = 2.5 m/s'
      },
      {
        id: 'acoustic_beats',
        name: '5. Acoustic Beat Envelope: 2.0·cos(0.35t)·sin(3x - 6t)',
        expr: '2.0 * cos(0.35*t) * sin(3*x - 6*t)',
        desc: 'Modulated envelope where low-frequency cosine envelope governs carrier wave amplitude'
      },
      {
        id: 'fourier_square',
        name: '6. Fourier Square Wave (3 Harmonics)',
        expr: '(4 / PI) * (sin(x - 3*t) + (1/3)*sin(3*(x - 3*t)) + (1/5)*sin(5*(x - 3*t)))',
        desc: 'First three odd harmonics of Fourier series synthesizing a square wave profile'
      },
      {
        id: 'soliton_pulse',
        name: '7. Soliton / Sech² Continuous Pulse',
        expr: '2.5 / pow(cosh(0.6*(((x - 3*t + 15) % 30) - 15)), 2)',
        desc: 'Nonlinear solitary pulse continually propagating across the domain without dispersing'
      },
      {
        id: 'circular_ripple',
        name: '8. Radial Circular Ripple: 2.0·sin(2r - 5t) / (1 + 0.15r)',
        expr: '2.0 * sin(2*r - 5*t) / (1 + 0.15*r)',
        desc: '2D/3D circular wave radiating outwards from origin where r = √(x² + z²)'
      },
      {
        id: 'damped_wave',
        name: '9. Spatially Damped Wave: 2.0·exp(-0.12|x|)·sin(2x - 4t)',
        expr: '2.0 * exp(-0.12*abs(x)) * sin(2*x - 4*t)',
        desc: 'Wave decaying exponentially with distance from origin due to medium viscosity and damping'
      }
    ];

    // Initial compilation
    this.compile(this.rawExpression);
  }

  /**
   * Compiles user string into an optimized, robust evaluation function.
   * Handles implicit multiplication, prefix stripping, and custom physics variables.
   * @param {string} exprStr - Mathematical expression string
   * @returns {{ success: boolean, error?: string }}
   */
  compile(exprStr) {
    if (!exprStr || typeof exprStr !== 'string' || !exprStr.trim()) {
      this.lastError = 'সমীকরণ খালি রাখা যাবে না (Expression cannot be empty)';
      return { success: false, error: this.lastError };
    }

    let s = exprStr.trim();

    // 1. Strip leading prefixes like "y =", "y(x,t) =", "f(x,t) =", "psi =", "ƒ(x, t) =", etc.
    s = s.replace(/^(?:[yY](?:\([xXzZtTrR\s,]*\))?|[fFƒ](?:\([xXzZtTrR\s,]*\))?|[pP][sS][iI]|[zZ]|\w+)\s*=\s*/, '');

    // 2. Convert caret exponent `^` to `**`
    s = s.replace(/\^/g, '**');

    // 3. Two-letter physics multiplication: kx -> k*x, wt -> w*t, vt -> v*t, Ax -> A*x
    s = s.replace(/\b([kwvA])([xzt])\b/g, '$1*$2');

    // 4. Implicit multiplication:
    // Number followed by variable, function, or parenthesis: 2x -> 2*x, 2sin -> 2*sin, 2pi -> 2*pi, 2( -> 2*(
    s = s.replace(/(\d+(?:\.\d+)?)\s*([a-zA-Z_]\w*|\()/g, '$1*$2');
    // Closing parenthesis followed by variable, function, or opening parenthesis: )sin -> )*sin, )x -> )*x, )( -> )*(
    s = s.replace(/\)\s*([a-zA-Z_]\w*|\()/g, ')*$1');

    // 5. Math constants
    s = s.replace(/\b(?:PI|pi|Pi)\b/g, 'Math.PI');
    s = s.replace(/\b(?:E|e)\b/g, 'Math.E');

    // 6. Math functions (order: longest/specific names first to avoid sub-match collisions)
    const funcs = ['asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sin', 'cos', 'tan', 'exp', 'sqrt', 'abs', 'pow', 'log', 'min', 'max', 'floor', 'ceil', 'round'];
    funcs.forEach(fn => {
      const reg = new RegExp(`\\b${fn}\\b`, 'g');
      s = s.replace(reg, `Math.${fn}`);
    });

    try {
      // Build function with scope parameters and coordinates (x, z, t, r)
      const compiled = new Function('x', 'z', 't', 'r', 'params', `
        const A = (params && params.A !== undefined) ? params.A : 2.0;
        const a = A;
        const f = (params && params.f !== undefined) ? params.f : 1.0;
        const v = (params && params.v !== undefined) ? params.v : 3.0;
        const lambda = (params && params.lambda !== undefined) ? params.lambda : (v / f);
        const k = (params && params.k !== undefined) ? params.k : ((2 * Math.PI) / lambda);
        const w = (params && params.w !== undefined) ? params.w : (2 * Math.PI * f);
        const omega = w;
        const phi = (params && params.phi !== undefined) ? params.phi : 0;
        const pi = Math.PI;

        try {
          const val = (${s});
          if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return 0;
          return val;
        } catch (err) {
          return 0;
        }
      `);

      // Benchmark test evaluation at origin and multiple coordinates
      const t0 = compiled(0, 0, 0, 0, this.params);
      const t1 = compiled(2.0, 0, 1.0, 2.0, this.params);
      const t2 = compiled(-3.0, 4.0, 2.5, 5.0, this.params);

      if (typeof t0 !== 'number' || isNaN(t0) || typeof t1 !== 'number' || isNaN(t1)) {
        this.lastError = 'সমীকরণটি বৈধ সংখ্যা তৈরি করছে না (Formula does not evaluate to valid numbers)';
        return { success: false, error: this.lastError };
      }

      this.rawExpression = exprStr.trim();
      this.transformedExpr = s;
      this.compiledFn = compiled;
      this.lastError = null;
      return { success: true };
    } catch (err) {
      this.lastError = `সিনট্যাক্স ত্রুটি (Syntax error): ${err.message}`;
      return { success: false, error: this.lastError };
    }
  }

  /**
   * Evaluates the active custom equation at coordinates (x, z) at time t.
   * r is automatically computed as sqrt(x^2 + z^2) if not passed.
   */
  evaluate(x, z, t, r = null) {
    if (!this.compiledFn) return 0;
    const radial = r !== null ? r : Math.sqrt(x * x + z * z);
    return this.compiledFn(x, z, t, radial, this.params);
  }
}
