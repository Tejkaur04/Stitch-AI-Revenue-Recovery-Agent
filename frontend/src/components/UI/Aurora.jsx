import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import './Aurora.css';

const vertexShader = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentShader = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform float uBlend;
uniform vec2 uResolution;
uniform vec3 uColorStops[3];
out vec4 fragColor;

float wave(vec2 uv, float offset, float speed) {
  return sin(uv.x * 5.0 + uTime * speed + offset) * 0.08
    + sin(uv.x * 11.0 - uTime * speed * 0.7 + offset) * 0.035;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float ribbon = uv.y + wave(uv, 0.0, 0.8) * uAmplitude;
  float band = 1.0 - smoothstep(0.16 - uBlend * 0.18, 0.62 + uBlend * 0.12, ribbon);
  band *= smoothstep(0.02, 0.32, uv.y);

  float colorPosition = clamp(uv.x + sin(uTime * 0.12) * 0.08, 0.0, 1.0);
  vec3 color = colorPosition < 0.5
    ? mix(uColorStops[0], uColorStops[1], colorPosition * 2.0)
    : mix(uColorStops[1], uColorStops[2], (colorPosition - 0.5) * 2.0);

  float glow = band * (0.45 + 0.55 * smoothstep(0.0, 0.8, uv.y));
  fragColor = vec4(color * glow, glow * 0.72);
}`;

const hexToRgb = hex => {
  const value = String(hex).replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map(char => char + char).join('')
    : value;
  const parsed = parseInt(normalized, 16);
  if (Number.isNaN(parsed)) return [1, 1, 1];
  return [(parsed >> 16 & 255) / 255, (parsed >> 8 & 255) / 255, (parsed & 255) / 255];
};

const Aurora = ({
  colorStops = ['#5227FF', '#7cff67', '#5227FF'],
  amplitude = 1,
  blend = 0.5,
  speed = 0.5,
}) => {
  const containerRef = useRef(null);
  const propsRef = useRef({ colorStops, amplitude, blend, speed });

  useEffect(() => {
    propsRef.current = { colorStops, amplitude, blend, speed };
  }, [amplitude, blend, colorStops, speed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true });
    const { gl } = renderer;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    Object.assign(gl.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uBlend: { value: blend },
        uResolution: { value: [1, 1] },
        uColorStops: { value: colorStops.slice(0, 3).map(hexToRgb) },
      },
    });
    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) delete geometry.attributes.uv;
    const mesh = new Mesh(gl, { geometry, program });
    container.appendChild(gl.canvas);

    const resize = () => {
      renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
      program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let frame = 0;
    const render = time => {
      const current = propsRef.current;
      program.uniforms.uTime.value = time * 0.001 * current.speed;
      program.uniforms.uAmplitude.value = current.amplitude;
      program.uniforms.uBlend.value = current.blend;
      program.uniforms.uColorStops.value = current.colorStops.slice(0, 3).map(hexToRgb);
      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
      mesh.remove?.();
      geometry.remove?.();
      program.remove?.();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [amplitude, blend, colorStops]);

  return <div ref={containerRef} className="aurora-container" aria-hidden="true" />;
};

export default Aurora;
