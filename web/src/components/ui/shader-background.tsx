import { useEffect, useRef } from "react";

const VS = `
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = aVertexPosition;
  }
`;

// Tuned for PhaseZero: transparent dark bg + very subtle green (#A8C979) plasma waves
const FS = `
  precision highp float;
  uniform vec2 iResolution;
  uniform float iTime;

  const float overallSpeed     = 0.15;
  const float gridSmoothWidth  = 0.015;
  const float axisWidth        = 0.05;
  const float majorLineWidth   = 0.025;
  const float minorLineWidth   = 0.0125;
  const float majorLineFreq    = 5.0;
  const float minorLineFreq    = 1.0;
  const float scale            = 5.0;
  const float minLineWidth     = 0.01;
  const float maxLineWidth     = 0.18;
  const float lineSpeed        = 1.0  * overallSpeed;
  const float lineAmplitude    = 1.0;
  const float lineFrequency    = 0.2;
  const float warpSpeed        = 0.2  * overallSpeed;
  const float warpFrequency    = 0.5;
  const float warpAmplitude    = 1.0;
  const float offsetFrequency  = 0.5;
  const float offsetSpeed      = 1.33 * overallSpeed;
  const float minOffsetSpread  = 0.6;
  const float maxOffsetSpread  = 2.0;
  const int   linesPerGroup    = 16;

  // pz-accent green (#A8C979) at low intensity — will be multiplied by rand < 1
  const vec4 lineColor = vec4(0.66, 0.79, 0.47, 1.0);

  #define drawCircle(pos, radius, coord)   smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))
  #define drawSmoothLine(pos, hw, t)       smoothstep(hw, 0.0, abs(pos - (t)))
  #define drawCrispLine(pos, hw, t)        smoothstep(hw + gridSmoothWidth, hw, abs(pos - (t)))
  #define drawPeriodicLine(freq, w, t)     drawCrispLine(freq / 2.0, w, abs(mod(t, freq) - (freq) / 2.0))

  float random(float t) {
    return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
  }

  float getPlasmaY(float x, float hFade, float offset) {
    return random(x * lineFrequency + iTime * lineSpeed) * hFade * lineAmplitude + offset;
  }

  void main() {
    vec2 uv    = gl_FragCoord.xy / iResolution.xy;
    vec2 space = (gl_FragCoord.xy - iResolution.xy / 2.0) / iResolution.x * 2.0 * scale;

    float hFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
    float vFade = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);

    space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + hFade);
    space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * hFade;

    vec4 lines = vec4(0.0);

    for (int l = 0; l < linesPerGroup; l++) {
      float nli    = float(l) / float(linesPerGroup);
      float offPos = float(l) + space.x * offsetFrequency;
      float offT   = iTime * offsetSpeed;
      float rand   = random(offPos + offT) * 0.5 + 0.5;
      float hw     = mix(minLineWidth, maxLineWidth, rand * hFade) / 2.0;
      float offset = random(offPos + offT * (1.0 + nli)) * mix(minOffsetSpread, maxOffsetSpread, hFade);
      float lineY  = getPlasmaY(space.x, hFade, offset);
      float line   = drawSmoothLine(lineY, hw, space.y) / 2.0
                   + drawCrispLine(lineY, hw * 0.15, space.y);

      float cx = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
      vec2  cp = vec2(cx, getPlasmaY(cx, hFade, offset));
      float circle = drawCircle(cp, 0.01, space) * 4.0;

      lines += (line + circle) * lineColor * rand;
    }

    // Very dark green tint so waves have something to sit against
    vec4 color = vec4(0.03, 0.07, 0.03, 0.12);
    color *= vFade;
    // Waves at 55% — clearly visible without blowing out the dark UI
    color += lines * 0.55;
    color.a = clamp(color.a + lines.a * 0.55, 0.0, 1.0);

    gl_FragColor = color;
  }
`;

function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initShaderProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vs = loadShader(gl, gl.VERTEX_SHADER, VS);
  const fs = loadShader(gl, gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Shader link error:", gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

interface ShaderBackgroundProps {
  className?: string;
}

export default function ShaderBackground({ className }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const program = initShaderProgram(gl);
    if (!program) return;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const vertexLoc   = gl.getAttribLocation(program, "aVertexPosition");
    const resolutionU = gl.getUniformLocation(program, "iResolution");
    const timeU       = gl.getUniformLocation(program, "iTime");

    const resizeCanvas = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);
    resizeCanvas();

    let rafId: number;
    const startTime = Date.now();

    const render = () => {
      const t = (Date.now() - startTime) / 1000;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(program);
      gl.uniform2f(resolutionU, canvas.width, canvas.height);
      gl.uniform1f(timeU, t);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(vertexLoc);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
