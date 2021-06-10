precision mediump float;

attribute vec3 positions;
attribute vec2 source;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform float u_size;
uniform float u_blend;
uniform sampler2D u_sourceTex;
uniform vec2 u_dimensions;
uniform float u_time;

varying vec3 vColor;
float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
  vec3 p = vec3(source, 0.);
  vec2 uvSource = source/ u_dimensions.x;
  vColor = vec3(1.0, 0., 0.);
  vColor = texture2D(u_sourceTex,uvSource).rgb;
  p.xy = p.xy - 0.5 * u_dimensions;
  p*= 1. / u_dimensions.x;
  p.y*= -1.0;
  // p.z= rand(p.xy)*0.1;

  vec4 mvPosition = modelViewMatrix * vec4( p, 1.0 );
  gl_PointSize = u_size * ( 1. / -mvPosition.z ) * 1.5;
  gl_Position = projectionMatrix * mvPosition;
}
